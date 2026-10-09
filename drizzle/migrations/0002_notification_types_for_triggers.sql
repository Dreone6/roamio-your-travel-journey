ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'message','story_reply','story_reaction','story_view_milestone','friend_nearby','memory_pinned',
  'map_viewed','new_follower','follow_request','trip_invite','trip_collaboration']));

-- A notification must never block the underlying user action (follow, join, react).
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
  BEGIN
    INSERT INTO public.notifications (user_id, actor_id, type, title, data)
    VALUES (_recipient, _actor, _type, left(_title, 120),
            coalesce(_data, '{}'::jsonb) || jsonb_build_object('dedupe_key', _dedupe_key));
  EXCEPTION WHEN check_violation OR not_null_violation THEN
    RAISE WARNING '_notify_internal skipped: %', SQLERRM;
  END;
END;
$$;
REVOKE ALL ON FUNCTION public._notify_internal(uuid, uuid, text, text, jsonb, text) FROM PUBLIC, anon, authenticated;