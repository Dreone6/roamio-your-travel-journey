-- P0 backend hardening + minimal additive atlas alignment

-- 1. Shared visibility helper (viewer bound to auth.uid()).
CREATE OR REPLACE FUNCTION public.can_view_owned_content(_viewer uuid, _owner uuid, _visibility text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _viewer IS NOT NULL
     AND _viewer = auth.uid()
     AND _owner IS NOT NULL
     AND (
       _viewer = _owner
       OR (
         NOT public.is_blocked_between(_viewer, _owner)
         AND (NOT public.profile_is_private(_owner) OR public.follows_accepted(_viewer, _owner))
         AND (
           _visibility = 'public'
           OR (_visibility = 'followers' AND public.follows_accepted(_viewer, _owner))
         )
       )
     )
$$;
REVOKE ALL ON FUNCTION public.can_view_owned_content(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_owned_content(uuid, uuid, text) TO authenticated, service_role;

-- 2. Stories / memories SELECT: replace broad policies.
DROP POLICY IF EXISTS "Users can view visible stories" ON public.stories;
CREATE POLICY "Viewers see authorised stories" ON public.stories
  FOR SELECT TO authenticated
  USING (public.can_view_owned_content(auth.uid(), user_id, visibility));

DROP POLICY IF EXISTS "Users can view public memories" ON public.memories;
CREATE POLICY "Viewers see authorised memories" ON public.memories
  FOR SELECT TO authenticated
  USING (public.can_view_owned_content(auth.uid(), user_id, visibility));

-- 3. Private-media helper: same privacy rules, viewer bound to auth.uid().
CREATE OR REPLACE FUNCTION public.can_view_user_media(_viewer uuid, _object_name text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _viewer IS NOT NULL AND _viewer = auth.uid() AND EXISTS (
    SELECT 1
    FROM (
      SELECT user_id, visibility FROM public.memories WHERE media_url = 'user-media:' || _object_name
      UNION ALL
      SELECT user_id, visibility FROM public.stories
        WHERE media_url = 'user-media:' || _object_name AND expires_at > now()
      UNION ALL
      SELECT user_id, visibility FROM public.check_ins WHERE photo = 'user-media:' || _object_name
    ) m
    WHERE public.can_view_owned_content(_viewer, m.user_id, m.visibility)
  )
$$;
REVOKE ALL ON FUNCTION public.can_view_user_media(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_user_media(uuid, text) TO authenticated, service_role;

-- 4. checkin-photos bucket: replace broad write policies (public read kept).
DROP POLICY IF EXISTS "Authenticated users can upload checkin photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own checkin photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own checkin photos" ON storage.objects;

CREATE POLICY "Checkin photos insert into own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'checkin-photos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Checkin photos update by uploader in own folder" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'checkin-photos'
    AND (owner_id = (auth.uid())::text OR owner = auth.uid())
    AND (storage.foldername(name))[1] = (auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'checkin-photos'
    AND (owner_id = (auth.uid())::text OR owner = auth.uid())
    AND (owner_id IS NULL OR owner_id = (auth.uid())::text)
    AND (owner IS NULL OR owner = auth.uid())
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Checkin photos delete by uploader in own folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'checkin-photos'
    AND (owner_id = (auth.uid())::text OR owner = auth.uid())
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- 5. Notifications: server-only writes, read-state-only client updates.
DROP POLICY IF EXISTS "Authenticated can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;

REVOKE ALL ON public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE (read) ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users mark own notifications read" ON public.notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public._notify_internal(
  _recipient uuid, _actor uuid, _type text, _title text, _data jsonb, _dedupe_key text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _recipient IS NULL OR _actor IS NULL OR _recipient = _actor THEN RETURN; END IF;
  IF public.is_blocked_between(_recipient, _actor) THEN RETURN; END IF;
  IF EXISTS (
    SELECT 1 FROM public.notifications n
    WHERE n.user_id = _recipient AND n.actor_id = _actor AND n.type = _type
      AND n.data->>'dedupe_key' = _dedupe_key
      AND n.created_at > now() - interval '1 day'
  ) THEN RETURN; END IF;
  INSERT INTO public.notifications (user_id, actor_id, type, title, data)
  VALUES (_recipient, _actor, _type, left(_title, 120),
          coalesce(_data, '{}'::jsonb) || jsonb_build_object('dedupe_key', _dedupe_key));
END;
$$;
REVOKE ALL ON FUNCTION public._notify_internal(uuid, uuid, text, text, jsonb, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._actor_name(_uid uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT coalesce(nullif(btrim(p.name), ''), p.username, 'Someone') FROM public.profiles p WHERE p.id = _uid
$$;
REVOKE ALL ON FUNCTION public._actor_name(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_on_follow() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _name text := coalesce(public._actor_name(NEW.follower_id), 'Someone');
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM public._notify_internal(NEW.following_id, NEW.follower_id, 'follow_request',
      _name || ' requested to follow you', jsonb_build_object('actor_id', NEW.follower_id), 'follow:' || NEW.follower_id);
  ELSIF NEW.status = 'accepted' THEN
    PERFORM public._notify_internal(NEW.following_id, NEW.follower_id, 'new_follower',
      _name || ' started following you', jsonb_build_object('actor_id', NEW.follower_id), 'follow:' || NEW.follower_id);
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.notify_on_follow() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS follows_notify ON public.follows;
CREATE TRIGGER follows_notify AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();

CREATE OR REPLACE FUNCTION public.notify_on_trip_member() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _owner uuid; _title text; _actor uuid := auth.uid();
BEGIN
  SELECT t.user_id, t.title INTO _owner, _title FROM public.trips t WHERE t.id = NEW.trip_id;
  IF _owner IS NULL OR _actor IS NULL OR NEW.user_id = _owner THEN RETURN NEW; END IF;
  IF _actor = NEW.user_id THEN
    PERFORM public._notify_internal(_owner, _actor, 'trip_collaboration',
      coalesce(public._actor_name(_actor), 'Someone') || ' joined ' || coalesce(_title, 'your trip'),
      jsonb_build_object('trip_id', NEW.trip_id), 'trip:' || NEW.trip_id);
  ELSIF public.can_edit_trip(NEW.trip_id, _actor) THEN
    PERFORM public._notify_internal(NEW.user_id, _actor, 'trip_invite',
      coalesce(public._actor_name(_actor), 'Someone') || ' added you to ' || coalesce(_title, 'a trip'),
      jsonb_build_object('trip_id', NEW.trip_id), 'trip:' || NEW.trip_id);
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.notify_on_trip_member() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trip_members_notify ON public.trip_members;
CREATE TRIGGER trip_members_notify AFTER INSERT ON public.trip_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_trip_member();

CREATE OR REPLACE FUNCTION public.notify_on_story_reaction() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _owner uuid; _vis text;
BEGIN
  SELECT s.user_id, s.visibility INTO _owner, _vis FROM public.stories s WHERE s.id = NEW.story_id;
  IF _owner IS NULL OR NEW.user_id IS DISTINCT FROM auth.uid() THEN RETURN NEW; END IF;
  IF NOT public.can_view_owned_content(NEW.user_id, _owner, _vis) THEN RETURN NEW; END IF;
  PERFORM public._notify_internal(_owner, NEW.user_id, 'story_reaction',
    coalesce(public._actor_name(NEW.user_id), 'Someone') || ' reacted to your story',
    jsonb_build_object('story_id', NEW.story_id), 'story:' || NEW.story_id);
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.notify_on_story_reaction() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS story_reactions_notify ON public.story_reactions;
CREATE TRIGGER story_reactions_notify AFTER INSERT ON public.story_reactions
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_story_reaction();

-- 6. Canonical places.
CREATE TABLE public.places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider ~ '^[a-z][a-z0-9_]{1,31}$'),
  provider_place_id text NOT NULL CHECK (length(provider_place_id) BETWEEN 1 AND 256),
  place_type text NOT NULL DEFAULT 'city' CHECK (place_type IN ('city', 'region', 'country')),
  name text NOT NULL,
  city text,
  country text,
  country_code text CHECK (country_code IS NULL OR country_code ~ '^[A-Z]{2}$'),
  latitude double precision CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  longitude double precision CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT places_provider_identity_key UNIQUE (provider, provider_place_id)
);
GRANT SELECT ON public.places TO anon, authenticated;
GRANT ALL ON public.places TO service_role;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Canonical places are readable" ON public.places
  FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER places_updated_at BEFORE UPDATE ON public.places
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.places_visited
  ADD COLUMN canonical_place_id uuid REFERENCES public.places(id) ON DELETE SET NULL;
CREATE INDEX places_visited_canonical_place_idx ON public.places_visited (canonical_place_id)
  WHERE canonical_place_id IS NOT NULL;

-- 7. Visits: scanned count separate; inferable unique import_key index.
ALTER TABLE public.places_visited ADD COLUMN scanned_photo_count integer NOT NULL DEFAULT 0
  CHECK (scanned_photo_count >= 0);
UPDATE public.places_visited SET scanned_photo_count = photos_count
  WHERE source IN ('photo_import', 'demo') AND photos_count > 0;
COMMENT ON COLUMN public.places_visited.photos_count IS
  'DEPRECATED: mixed scanned and saved counts; use scanned_photo_count and linked memories';

CREATE UNIQUE INDEX places_visited_user_import_key_uniq ON public.places_visited (user_id, import_key);
COMMENT ON INDEX public.places_visited_user_import_key_idx IS
  'DEPRECATED: partial index not inferable by upsert; superseded by places_visited_user_import_key_uniq';

ALTER TABLE public.places_visited ADD CONSTRAINT places_visited_id_user_key UNIQUE (id, user_id);

-- 8. Memories: same-user visit link, optional media, private default.
ALTER TABLE public.memories ADD COLUMN visit_id uuid;
ALTER TABLE public.memories ADD CONSTRAINT memories_visit_same_user_fkey
  FOREIGN KEY (visit_id, user_id) REFERENCES public.places_visited (id, user_id)
  ON DELETE SET NULL (visit_id);
CREATE INDEX memories_visit_idx ON public.memories (visit_id) WHERE visit_id IS NOT NULL;

ALTER TABLE public.memories ALTER COLUMN media_url DROP NOT NULL;
ALTER TABLE public.memories ALTER COLUMN visibility SET DEFAULT 'private';
ALTER TABLE public.memories DROP CONSTRAINT memories_media_type_check;
ALTER TABLE public.memories ADD CONSTRAINT memories_media_type_check
  CHECK (media_type IN ('photo', 'video', 'note'));
ALTER TABLE public.memories ADD CONSTRAINT memories_media_present_check
  CHECK (media_type = 'note' OR media_url IS NOT NULL);

-- 9. Atomic, idempotent check-in (SECURITY INVOKER: caller RLS applies).
CREATE OR REPLACE FUNCTION public.record_check_in(
  p_client_request_id uuid,
  p_city text,
  p_country text,
  p_location_name text,
  p_latitude double precision,
  p_longitude double precision,
  p_note text DEFAULT NULL,
  p_photo text DEFAULT NULL,
  p_share boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  v_city text := nullif(btrim(p_city), '');
  v_country text := nullif(btrim(p_country), '');
  v_note text := nullif(btrim(p_note), '');
  v_vis text := CASE WHEN p_share THEN 'followers' ELSE 'private' END;
  v_today date := (now() AT TIME ZONE 'utc')::date;
  v_visit uuid;
  v_ci uuid;
  v_mem uuid;
  v_reused boolean := false;
  v_meta jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated' USING ERRCODE = '28000'; END IF;
  IF p_client_request_id IS NULL THEN RAISE EXCEPTION 'request id required' USING ERRCODE = '22023'; END IF;
  IF v_city IS NULL OR v_country IS NULL THEN
    RAISE EXCEPTION 'city and country are required' USING ERRCODE = '22023';
  END IF;
  IF length(v_city) > 200 OR length(v_country) > 200 OR length(coalesce(p_location_name, '')) > 300
     OR length(coalesce(v_note, '')) > 2000 THEN
    RAISE EXCEPTION 'input too long' USING ERRCODE = '22023';
  END IF;
  IF p_latitude IS NULL OR p_longitude IS NULL OR p_latitude NOT BETWEEN -90 AND 90
     OR p_longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'invalid coordinates' USING ERRCODE = '22023';
  END IF;
  IF p_photo IS NOT NULL AND p_photo NOT LIKE 'user-media:' || uid::text || '/%' THEN
    RAISE EXCEPTION 'invalid photo reference' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('checkin:' || uid::text, 0));

  SELECT c.id, c.verification_metadata INTO v_ci, v_meta FROM public.check_ins c
   WHERE c.user_id = uid AND c.verification_metadata->>'client_request_id' = p_client_request_id::text
   LIMIT 1;
  IF v_ci IS NOT NULL THEN
    SELECT m.id INTO v_mem FROM public.memories m
     WHERE m.user_id = uid AND m.source = 'check_in' AND m.source_id = v_ci LIMIT 1;
    RETURN jsonb_build_object('check_in_id', v_ci, 'visit_id', v_meta->>'visit_id',
      'memory_id', v_mem, 'reused_visit', (v_meta->>'reused_visit')::boolean, 'replayed', true);
  END IF;

  SELECT pv.id INTO v_visit FROM public.places_visited pv
   WHERE pv.user_id = uid
     AND pv.source = 'checkin'
     AND lower(btrim(pv.city)) = lower(v_city)
     AND lower(btrim(pv.country)) = lower(v_country)
     AND pv.date_visited IS NOT NULL
     AND pv.date_visited <= v_today
     AND coalesce(pv.end_date, pv.date_visited) >= v_today - 1
   ORDER BY coalesce(pv.end_date, pv.date_visited) DESC
   LIMIT 1
   FOR UPDATE;

  IF v_visit IS NOT NULL THEN
    UPDATE public.places_visited
       SET end_date = greatest(coalesce(end_date, date_visited), v_today)
     WHERE id = v_visit AND user_id = uid;
    v_reused := true;
  ELSE
    INSERT INTO public.places_visited (user_id, city, country, latitude, longitude,
      date_visited, end_date, visibility, source, photos_count)
    VALUES (uid, v_city, v_country, p_latitude, p_longitude, v_today, v_today, 'private', 'checkin', 0)
    RETURNING id INTO v_visit;
  END IF;

  INSERT INTO public.check_ins (user_id, location_name, latitude, longitude, notes, photo,
    visibility, city, country, verification_metadata)
  VALUES (uid, coalesce(nullif(btrim(p_location_name), ''), v_city), p_latitude, p_longitude,
    v_note, p_photo, v_vis, v_city, v_country,
    jsonb_build_object('client_request_id', p_client_request_id, 'visit_id', v_visit, 'reused_visit', v_reused))
  RETURNING id INTO v_ci;

  IF p_photo IS NOT NULL OR v_note IS NOT NULL THEN
    INSERT INTO public.memories (user_id, media_url, media_type, caption, location_name,
      latitude, longitude, source, source_id, visibility, visit_id, pinned_to_globe)
    VALUES (uid, p_photo, CASE WHEN p_photo IS NULL THEN 'note' ELSE 'photo' END, v_note,
      coalesce(nullif(btrim(p_location_name), ''), v_city), p_latitude, p_longitude,
      'check_in', v_ci, v_vis, v_visit, true)
    RETURNING id INTO v_mem;
  END IF;

  RETURN jsonb_build_object('check_in_id', v_ci, 'visit_id', v_visit, 'memory_id', v_mem,
    'reused_visit', v_reused, 'replayed', false);
END;
$$;
REVOKE ALL ON FUNCTION public.record_check_in(uuid, text, text, text, double precision, double precision, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_check_in(uuid, text, text, text, double precision, double precision, text, text, boolean) TO authenticated;
