
CREATE OR REPLACE FUNCTION public.can_view_user_media(_viewer uuid, _object_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM (
      SELECT user_id, visibility FROM public.memories WHERE media_url = 'user-media:' || _object_name
      UNION ALL
      SELECT user_id, visibility FROM public.stories
        WHERE media_url = 'user-media:' || _object_name AND expires_at > now()
      UNION ALL
      SELECT user_id, visibility FROM public.check_ins WHERE photo = 'user-media:' || _object_name
    ) m
    WHERE
      m.user_id = _viewer
      OR (
        _viewer IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.blocked_users b
          WHERE (b.blocker_id = m.user_id AND b.blocked_id = _viewer)
             OR (b.blocker_id = _viewer AND b.blocked_id = m.user_id)
        )
        AND (
          m.visibility = 'public'
          OR (
            m.visibility = 'followers'
            AND EXISTS (
              SELECT 1 FROM public.follows f
              WHERE f.follower_id = _viewer AND f.following_id = m.user_id AND f.status = 'accepted'
            )
          )
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION public.can_view_user_media(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_user_media(uuid, text) TO authenticated, service_role;
