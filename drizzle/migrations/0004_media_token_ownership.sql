-- A row may only reference user-media tokens inside its owner's own folder.
-- Legacy http(s) URLs are left untouched (they are public links, not private media).
CREATE OR REPLACE FUNCTION public.media_token_owned_by(_token text, _owner uuid)
RETURNS boolean
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT _token IS NULL
      OR _token NOT LIKE 'user-media:%'
      OR (
        _owner IS NOT NULL
        AND split_part(substr(_token, length('user-media:') + 1), '/', 1) = _owner::text
        AND position('..' IN _token) = 0
        AND substr(_token, length('user-media:') + 1) LIKE _owner::text || '/_%'
      )
$$;

CREATE OR REPLACE FUNCTION public.enforce_media_token_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE _t text;
BEGIN
  IF TG_TABLE_NAME = 'check_ins' THEN
    IF NOT public.media_token_owned_by(NEW.photo, NEW.user_id) THEN
      RAISE EXCEPTION 'media reference must belong to the row owner' USING ERRCODE = '42501';
    END IF;
    IF NEW.photos IS NOT NULL THEN
      FOREACH _t IN ARRAY NEW.photos LOOP
        IF NOT public.media_token_owned_by(_t, NEW.user_id) THEN
          RAISE EXCEPTION 'media reference must belong to the row owner' USING ERRCODE = '42501';
        END IF;
      END LOOP;
    END IF;
  ELSE
    IF NOT public.media_token_owned_by(NEW.media_url, NEW.user_id) THEN
      RAISE EXCEPTION 'media reference must belong to the row owner' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_media_token_owner() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS memories_media_token_owner ON public.memories;
CREATE TRIGGER memories_media_token_owner BEFORE INSERT OR UPDATE OF media_url, user_id ON public.memories
  FOR EACH ROW EXECUTE FUNCTION public.enforce_media_token_owner();
DROP TRIGGER IF EXISTS stories_media_token_owner ON public.stories;
CREATE TRIGGER stories_media_token_owner BEFORE INSERT OR UPDATE OF media_url, user_id ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.enforce_media_token_owner();
DROP TRIGGER IF EXISTS check_ins_media_token_owner ON public.check_ins;
CREATE TRIGGER check_ins_media_token_owner BEFORE INSERT OR UPDATE OF photo, photos, user_id ON public.check_ins
  FOR EACH ROW EXECUTE FUNCTION public.enforce_media_token_owner();

-- Private-media grant: the referencing row's owner must match BOTH the object's
-- first folder AND the storage uploader (owner uuid or owner_id text). Viewer is
-- bound to auth.uid().
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
    JOIN storage.objects o
      ON o.bucket_id = 'user-media' AND o.name = _object_name
    WHERE (storage.foldername(_object_name))[1] = m.user_id::text
      AND (o.owner = m.user_id OR o.owner_id = m.user_id::text)
      AND public.can_view_owned_content(_viewer, m.user_id, m.visibility)
  )
$$;
REVOKE ALL ON FUNCTION public.can_view_user_media(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_user_media(uuid, text) TO authenticated, service_role;