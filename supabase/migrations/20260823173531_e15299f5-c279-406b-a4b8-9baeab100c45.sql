
-- Helper: can the viewer see this user-media object, based on the memory/story row that references it?
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

CREATE POLICY "Users manage their own user-media folder"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'user-media' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'user-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Viewers read user-media they are allowed to see"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'user-media' AND public.can_view_user_media(auth.uid(), name));
