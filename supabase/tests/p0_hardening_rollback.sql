-- Rollback-only role-claim verification for migration 0001_p0_hardening_atlas_alignment.
-- Creates synthetic users/rows, runs checks as `authenticated` with JWT claims,
-- then RAISES at the end so the whole transaction (fixtures included) rolls back.
-- Results are returned in the exception message. No rows persist; no push is sent
-- (triggers only write in-app rows, which are rolled back too).
DO $test$
DECLARE
  su text := session_user;
  o uuid := gen_random_uuid();  -- owner, public profile
  p uuid := gen_random_uuid();  -- owner, private profile
  s uuid := gen_random_uuid();  -- stranger
  f uuid := gen_random_uuid();  -- accepted follower of o and p
  q uuid := gen_random_uuid();  -- pending follower of p
  b1 uuid := gen_random_uuid(); -- blocked BY o, still "follows" o
  b2 uuid := gen_random_uuid(); -- has blocked o, still "follows" o
  r text[] := '{}';
  n int; t text; j jsonb; v1 uuid; v2 uuid; pvisit uuid; nid uuid; sid uuid; trip uuid;
  u uuid;
BEGIN
  -- ---------- fixtures (privileged) ----------
  FOREACH u IN ARRAY ARRAY[o,p,s,f,q,b1,b2] LOOP
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES (u, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'p0test+' || u || '@example.invalid', '', '{}', '{}', now(), now());
  END LOOP;
  UPDATE public.profiles SET is_private = true WHERE id = p;
  INSERT INTO public.blocked_users (blocker_id, blocked_id) VALUES (o, b1), (b2, o);
  INSERT INTO public.follows (follower_id, following_id) VALUES (f, o), (f, p), (q, p), (b1, o), (b2, o);
  UPDATE public.follows SET status = 'accepted' WHERE follower_id = f AND following_id = p;
  SELECT string_agg(follower_id::text || ':' || status, ',') INTO t FROM public.follows WHERE following_id IN (o,p);
  r := r || ('fixture_follow_status q_pending=' || EXISTS(SELECT 1 FROM follows WHERE follower_id=q AND status='pending'));

  FOREACH u IN ARRAY ARRAY[o,p] LOOP
    INSERT INTO public.stories (user_id, media_url, media_type, visibility, expires_at)
    SELECT u, 'user-media:' || u || '/story-' || v || '.jpg', 'photo', v, now() + interval '1 day'
    FROM unnest(ARRAY['public','followers','private']) v;
    INSERT INTO public.memories (user_id, media_url, media_type, visibility)
    SELECT u, 'user-media:' || u || '/mem-' || v || '.jpg', 'photo', v
    FROM unnest(ARRAY['public','followers','private']) v;
  END LOOP;

  -- ---------- story / memory SELECT matrix ----------
  FOREACH u IN ARRAY ARRAY[o,s,f,q,b1,b2] LOOP
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
    SELECT string_agg(visibility, '+' ORDER BY visibility) INTO t FROM public.stories WHERE user_id = o;
    r := r || format('stories_of_public_owner viewer=%s -> %s',
      CASE u WHEN o THEN 'owner' WHEN s THEN 'stranger' WHEN f THEN 'follower' WHEN q THEN 'pending' WHEN b1 THEN 'blocked_by_owner' ELSE 'blocked_owner' END, coalesce(t,'none'));
    SELECT string_agg(visibility, '+' ORDER BY visibility) INTO t FROM public.memories WHERE user_id = o;
    r := r || format('memories_of_public_owner viewer=%s -> %s',
      CASE u WHEN o THEN 'owner' WHEN s THEN 'stranger' WHEN f THEN 'follower' WHEN q THEN 'pending' WHEN b1 THEN 'blocked_by_owner' ELSE 'blocked_owner' END, coalesce(t,'none'));
    PERFORM set_config('role', su, true);
  END LOOP;
  FOREACH u IN ARRAY ARRAY[p,s,f,q] LOOP
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
    SELECT string_agg(visibility, '+' ORDER BY visibility) INTO t FROM public.stories WHERE user_id = p;
    r := r || format('stories_of_private_owner viewer=%s -> %s',
      CASE u WHEN p THEN 'owner' WHEN s THEN 'stranger' WHEN f THEN 'accepted' ELSE 'pending' END, coalesce(t,'none'));
    SELECT string_agg(visibility, '+' ORDER BY visibility) INTO t FROM public.memories WHERE user_id = p;
    r := r || format('memories_of_private_owner viewer=%s -> %s',
      CASE u WHEN p THEN 'owner' WHEN s THEN 'stranger' WHEN f THEN 'accepted' ELSE 'pending' END, coalesce(t,'none'));
    -- media helper
    SELECT string_agg(v, '+' ORDER BY v) INTO t FROM unnest(ARRAY['public','followers','private']) v
      WHERE public.can_view_user_media(u, p || '/mem-' || v || '.jpg');
    r := r || format('media_helper_private_owner viewer=%s -> %s',
      CASE u WHEN p THEN 'owner' WHEN s THEN 'stranger' WHEN f THEN 'accepted' ELSE 'pending' END, coalesce(t,'none'));
    PERFORM set_config('role', su, true);
  END LOOP;
  FOREACH u IN ARRAY ARRAY[s,f,b1,b2] LOOP
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
    SELECT string_agg(v, '+' ORDER BY v) INTO t FROM unnest(ARRAY['public','followers','private']) v
      WHERE public.can_view_user_media(u, o || '/story-' || v || '.jpg');
    r := r || format('media_helper_public_owner viewer=%s -> %s',
      CASE u WHEN s THEN 'stranger' WHEN f THEN 'follower' WHEN b1 THEN 'blocked_by_owner' ELSE 'blocked_owner' END, coalesce(t,'none'));
    PERFORM set_config('role', su, true);
  END LOOP;
  -- impersonation: stranger passes the owner's id
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
  r := r || ('impersonate_owner_media=' || public.can_view_user_media(o, o || '/mem-private.jpg'));
  r := r || ('impersonate_owner_content=' || public.can_view_owned_content(o, o, 'private'));
  PERFORM set_config('role', su, true);
  BEGIN
    PERFORM set_config('role', 'anon', true);
    PERFORM public.can_view_user_media(o, o || '/mem-public.jpg');
    r := r || 'anon_media_helper=ALLOWED'::text;
  EXCEPTION WHEN others THEN r := r || ('anon_media_helper=DENIED ' || SQLSTATE); END;
  PERFORM set_config('role', su, true);

  -- ---------- notifications ----------
  SELECT count(*) INTO n FROM public.notifications WHERE user_id = o;
  r := r || ('trigger_notifs_for_owner(f accepted only; blocked b1,b2 skipped)=' || n);
  SELECT count(*) INTO n FROM public.notifications WHERE user_id = p AND type = 'follow_request';
  r := r || ('trigger_follow_requests_for_private=' || n);
  SELECT id INTO nid FROM public.notifications WHERE user_id = o LIMIT 1;
  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
    INSERT INTO public.notifications (user_id, type, title) VALUES (o, 'message', 'spoof');
    r := r || 'client_insert=ALLOWED'::text;
  EXCEPTION WHEN others THEN r := r || ('client_insert=DENIED ' || SQLSTATE); END;
  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', o, 'role', 'authenticated')::text, true);
    UPDATE public.notifications SET title = 'edited' WHERE id = nid;
    r := r || 'own_content_edit=ALLOWED'::text;
  EXCEPTION WHEN others THEN r := r || ('own_content_edit=DENIED ' || SQLSTATE); END;
  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', o, 'role', 'authenticated')::text, true);
    UPDATE public.notifications SET user_id = s WHERE id = nid;
    r := r || 'own_user_id_edit=ALLOWED'::text;
  EXCEPTION WHEN others THEN r := r || ('own_user_id_edit=DENIED ' || SQLSTATE); END;
  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
    UPDATE public.notifications SET read = true WHERE id = nid; GET DIAGNOSTICS n = ROW_COUNT;
    r := r || ('foreign_read_update_rows=' || n);
  EXCEPTION WHEN others THEN r := r || ('foreign_read_update=ERR ' || SQLSTATE); END;
  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', o, 'role', 'authenticated')::text, true);
    UPDATE public.notifications SET read = true WHERE id = nid; GET DIAGNOSTICS n = ROW_COUNT;
    r := r || ('own_read_update_rows=' || n);
    SELECT count(*) INTO n FROM public.notifications WHERE user_id = s;
    r := r || ('owner_sees_strangers_notifs=' || n);
  EXCEPTION WHEN others THEN r := r || ('own_read_update=ERR ' || SQLSTATE); END;
  PERFORM set_config('role', su, true);
  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
    PERFORM public._notify_internal(o, s, 'message', 'x', '{}', 'k');
    r := r || 'client_call_notify_internal=ALLOWED'::text;
  EXCEPTION WHEN others THEN r := r || ('client_call_notify_internal=DENIED ' || SQLSTATE); END;
  PERFORM set_config('role', su, true);
  -- trip invite + story reactions
  INSERT INTO public.trips (user_id, title, destination) VALUES (o, 'T', 'D') RETURNING id INTO trip;
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', o, 'role', 'authenticated')::text, true);
  INSERT INTO public.trip_members (trip_id, user_id, role) VALUES (trip, f, 'collaborator');
  PERFORM set_config('role', su, true);
  SELECT count(*) INTO n FROM public.notifications WHERE user_id = f AND type = 'trip_invite';
  r := r || ('trip_invite_notif=' || n);
  SELECT id INTO sid FROM public.stories WHERE user_id = o AND visibility = 'private';
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.story_reactions (story_id, user_id, emoji) VALUES (sid, s, 'x');
  EXCEPTION WHEN others THEN NULL; END;
  PERFORM set_config('role', su, true);
  SELECT id INTO sid FROM public.stories WHERE user_id = o AND visibility = 'followers';
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.story_reactions (story_id, user_id, emoji) VALUES (sid, f, 'x');
    INSERT INTO public.story_reactions (story_id, user_id, emoji) VALUES (sid, f, 'x') ON CONFLICT DO NOTHING;
  EXCEPTION WHEN others THEN r := r || ('follower_reaction_insert=ERR ' || SQLSTATE); END;
  PERFORM set_config('role', su, true);
  SELECT count(*) INTO n FROM public.notifications WHERE user_id = o AND type = 'story_reaction';
  r := r || ('story_reaction_notifs(stranger on private=0, follower x2 deduped=1)=' || n);

  -- ---------- checkin-photos storage ----------
  INSERT INTO storage.objects (bucket_id, name, owner, owner_id)
  VALUES ('checkin-photos', o || '/legit.jpg', o, o::text),
         ('checkin-photos', o || '/planted.jpg', s, s::text);  -- legacy: s wrote into o's folder
  FOR t IN SELECT unnest(ARRAY[
    format('o_update_legit|%s|UPDATE storage.objects SET metadata = ''{"x":1}'' WHERE bucket_id=''checkin-photos'' AND name=%L', o, o || '/legit.jpg'),
    format('o_update_planted|%s|UPDATE storage.objects SET metadata = ''{"x":1}'' WHERE bucket_id=''checkin-photos'' AND name=%L', o, o || '/planted.jpg'),
    format('s_update_planted|%s|UPDATE storage.objects SET metadata = ''{"x":1}'' WHERE bucket_id=''checkin-photos'' AND name=%L', s, o || '/planted.jpg'),
    format('s_update_legit|%s|UPDATE storage.objects SET metadata = ''{"x":1}'' WHERE bucket_id=''checkin-photos'' AND name=%L', s, o || '/legit.jpg'),
    format('s_delete_legit|%s|DELETE FROM storage.objects WHERE bucket_id=''checkin-photos'' AND name=%L', s, o || '/legit.jpg'),
    format('s_delete_planted|%s|DELETE FROM storage.objects WHERE bucket_id=''checkin-photos'' AND name=%L', s, o || '/planted.jpg'),
    format('o_delete_planted|%s|DELETE FROM storage.objects WHERE bucket_id=''checkin-photos'' AND name=%L', o, o || '/planted.jpg'),
    format('o_rename_into_s_folder|%s|UPDATE storage.objects SET name=%L WHERE bucket_id=''checkin-photos'' AND name=%L', o, s || '/legit.jpg', o || '/legit.jpg'),
    format('o_reassign_owner_to_s|%s|UPDATE storage.objects SET owner=%L, owner_id=%L WHERE bucket_id=''checkin-photos'' AND name=%L', o, s, s, o || '/legit.jpg'),
    format('o_move_bucket|%s|UPDATE storage.objects SET bucket_id=''avatars'' WHERE bucket_id=''checkin-photos'' AND name=%L', o, o || '/legit.jpg'),
    format('s_insert_into_o_folder|%s|INSERT INTO storage.objects (bucket_id,name,owner,owner_id) VALUES (''checkin-photos'',%L,%L,%L)', s, o || '/x.jpg', s, s),
    format('s_insert_own_folder|%s|INSERT INTO storage.objects (bucket_id,name,owner,owner_id) VALUES (''checkin-photos'',%L,%L,%L)', s, s || '/x.jpg', s, s),
    format('o_delete_legit|%s|DELETE FROM storage.objects WHERE bucket_id=''checkin-photos'' AND name=%L', o, o || '/legit.jpg')
  ]) LOOP
    BEGIN
      PERFORM set_config('role', 'authenticated', true);
      PERFORM set_config('request.jwt.claims', json_build_object('sub', split_part(t,'|',2), 'role', 'authenticated')::text, true);
      PERFORM set_config('storage.allow_delete_query', 'true', true);
      EXECUTE split_part(t,'|',3); GET DIAGNOSTICS n = ROW_COUNT;
      r := r || format('storage %s rows=%s', split_part(t,'|',1), n);
    EXCEPTION WHEN others THEN r := r || format('storage %s DENIED %s %s', split_part(t,'|',1), SQLSTATE, left(SQLERRM,60)); END;
    PERFORM set_config('role', su, true);
  END LOOP;

  -- ---------- visit / memory FK ----------
  INSERT INTO public.places_visited (user_id, city, country, date_visited) VALUES (p, 'Rome', 'Italy', current_date) RETURNING id INTO pvisit;
  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', o, 'role', 'authenticated')::text, true);
    INSERT INTO public.memories (user_id, media_type, caption, visit_id) VALUES (o, 'note', 'hi', pvisit);
    r := r || 'cross_owner_visit_memory=ALLOWED'::text;
  EXCEPTION WHEN others THEN r := r || ('cross_owner_visit_memory=DENIED ' || SQLSTATE); END;
  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', o, 'role', 'authenticated')::text, true);
    INSERT INTO public.memories (user_id, media_type, caption) VALUES (o, 'note', 'note only') RETURNING visibility INTO t;
    r := r || ('note_only_memory=OK default_visibility=' || t);
  EXCEPTION WHEN others THEN r := r || ('note_only_memory=ERR ' || SQLSTATE || ' ' || SQLERRM); END;
  BEGIN
    PERFORM set_config('role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', o, 'role', 'authenticated')::text, true);
    INSERT INTO public.memories (user_id, media_type) VALUES (o, 'photo');
    r := r || 'photo_without_media=ALLOWED'::text;
  EXCEPTION WHEN others THEN r := r || ('photo_without_media=DENIED ' || SQLSTATE); END;
  PERFORM set_config('role', su, true);
  -- deleting a visit keeps the memory and its owner
  INSERT INTO public.places_visited (user_id, city, country, date_visited) VALUES (o, 'Oslo', 'Norway', current_date) RETURNING id INTO v1;
  INSERT INTO public.memories (user_id, media_type, caption, visit_id) VALUES (o, 'note', 'keep', v1);
  DELETE FROM public.places_visited WHERE id = v1;
  SELECT count(*) INTO n FROM public.memories WHERE user_id = o AND caption = 'keep' AND visit_id IS NULL;
  r := r || ('visit_delete_sets_only_visit_null=' || n);

  -- ---------- check-in RPC ----------
  INSERT INTO public.places_visited (user_id, city, country, date_visited, end_date, source)
  VALUES (o, 'Lisbon', 'Portugal', current_date - 10, NULL, 'checkin') RETURNING id INTO v1;           -- old, open-ended
  INSERT INTO public.places_visited (user_id, city, country, date_visited, end_date, source)
  VALUES (o, 'Porto', 'Portugal', current_date - 1, NULL, 'checkin') RETURNING id INTO v2;             -- yesterday, open-ended
  INSERT INTO public.places_visited (user_id, city, country, date_visited, source)
  VALUES (o, 'Faro', 'Portugal', NULL, 'checkin');                                                      -- unknown dates
  INSERT INTO public.places_visited (user_id, city, country, date_visited, end_date, source)
  VALUES (o, 'Braga', 'Portugal', current_date, current_date, 'photo_import');                         -- import, not check-in
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', o, 'role', 'authenticated')::text, true);
  j := public.record_check_in('11111111-1111-1111-1111-111111111111', 'Lisbon', 'Portugal', 'Alfama', 38.7, -9.1, 'old row', NULL, false);
  r := r || format('checkin_old_open_ended reused=%s new_visit=%s', j->>'reused_visit', (j->>'visit_id')::uuid <> v1);
  j := public.record_check_in('22222222-2222-2222-2222-222222222222', 'lisbon ', 'portugal', 'Alfama', 38.7, -9.1, NULL, 'user-media:' || o || '/a.jpg', true);
  r := r || format('checkin_same_day_again reused=%s memory=%s', j->>'reused_visit', j->>'memory_id' IS NOT NULL);
  SELECT visibility INTO t FROM public.memories WHERE id = (j->>'memory_id')::uuid;
  r := r || ('shared_checkin_memory_visibility=' || t);
  j := public.record_check_in('33333333-3333-3333-3333-333333333333', 'Porto', 'Portugal', 'Ribeira', 41.1, -8.6, 'continue', NULL, false);
  r := r || format('checkin_yesterday_visit reused=%s same=%s', j->>'reused_visit', (j->>'visit_id')::uuid = v2);
  SELECT end_date::text INTO t FROM public.places_visited WHERE id = v2;
  r := r || ('continued_end_date_is_today=' || (t = current_date::text));
  SELECT visibility INTO t FROM public.memories WHERE id = (j->>'memory_id')::uuid;
  r := r || ('default_checkin_memory_visibility=' || t);
  j := public.record_check_in('44444444-4444-4444-4444-444444444444', 'Faro', 'Portugal', 'Old town', 37.0, -7.9, NULL, NULL, false);
  r := r || format('checkin_unknown_dates reused=%s memory_null=%s', j->>'reused_visit', j->>'memory_id' IS NULL);
  j := public.record_check_in('55555555-5555-5555-5555-555555555555', 'Braga', 'Portugal', 'Centre', 41.5, -8.4, NULL, NULL, false);
  r := r || format('checkin_vs_import_row reused=%s', j->>'reused_visit');
  SELECT visibility || '/' || source INTO t FROM public.places_visited WHERE id = (j->>'visit_id')::uuid;
  r := r || ('new_checkin_visit=' || t);
  j := public.record_check_in('33333333-3333-3333-3333-333333333333', 'Porto', 'Portugal', 'Ribeira', 41.1, -8.6, 'continue', NULL, false);
  r := r || format('retry_same_request replayed=%s', j->>'replayed');
  SELECT count(*) INTO n FROM public.check_ins WHERE user_id = o;
  r := r || ('checkins_after_retry=' || n);
  SELECT count(*) INTO n FROM public.memories m JOIN public.places_visited pv ON pv.id = m.visit_id WHERE pv.id = v2;
  r := r || ('porto_linked_memories=' || n);
  BEGIN
    j := public.record_check_in(gen_random_uuid(), 'Porto', 'Portugal', 'x', 41.1, -8.6, NULL, 'user-media:' || s || '/stolen.jpg', false);
    r := r || 'foreign_photo_ref=ALLOWED'::text;
  EXCEPTION WHEN others THEN r := r || ('foreign_photo_ref=DENIED ' || SQLSTATE); END;
  PERFORM set_config('role', su, true);
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
  SELECT count(*) INTO n FROM public.places_visited WHERE user_id = o;
  r := r || ('stranger_sees_owner_private_visits=' || n);
  SELECT count(*) INTO n FROM public.memories WHERE user_id = o AND source = 'check_in';
  r := r || ('stranger_sees_owner_checkin_memories=' || n);
  PERFORM set_config('role', su, true);

  -- ---------- import upsert inferability ----------
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', o, 'role', 'authenticated')::text, true);
  BEGIN
    INSERT INTO public.places_visited (user_id, city, country, source, import_key, scanned_photo_count)
    VALUES (o, 'Nice', 'France', 'photo_import', 'k1', 10)
    ON CONFLICT (user_id, import_key) DO UPDATE SET scanned_photo_count = EXCLUDED.scanned_photo_count;
    INSERT INTO public.places_visited (user_id, city, country, source, import_key, scanned_photo_count)
    VALUES (o, 'Nice', 'France', 'photo_import', 'k1', 12)
    ON CONFLICT (user_id, import_key) DO UPDATE SET scanned_photo_count = EXCLUDED.scanned_photo_count;
    SELECT count(*)::text || ' rows scanned=' || max(scanned_photo_count) INTO t FROM public.places_visited WHERE user_id = o AND import_key = 'k1';
    r := r || ('import_upsert=' || t);
  EXCEPTION WHEN others THEN r := r || ('import_upsert=ERR ' || SQLSTATE || ' ' || SQLERRM); END;
  PERFORM set_config('role', su, true);

  RAISE EXCEPTION 'P0TEST_RESULTS%', E'\n' || array_to_string(r, E'\n');
END
$test$;
