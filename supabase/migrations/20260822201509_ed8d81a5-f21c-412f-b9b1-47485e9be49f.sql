ALTER TABLE public.places_visited
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS import_key text;

ALTER TABLE public.places_visited
  DROP CONSTRAINT IF EXISTS places_visited_visibility_check;
ALTER TABLE public.places_visited
  ADD CONSTRAINT places_visited_visibility_check CHECK (visibility IN ('private','followers','public'));

ALTER TABLE public.places_visited
  DROP CONSTRAINT IF EXISTS places_visited_source_check;
ALTER TABLE public.places_visited
  ADD CONSTRAINT places_visited_source_check CHECK (source IN ('manual','photo_import','checkin','trip','demo'));

UPDATE public.places_visited
  SET source = CASE
    WHEN milestone_type = 'demo_import' THEN 'demo'
    WHEN milestone_type = 'photo_import' THEN 'photo_import'
    ELSE 'manual'
  END
  WHERE source = 'manual';

CREATE UNIQUE INDEX IF NOT EXISTS places_visited_user_import_key_idx
  ON public.places_visited (user_id, import_key)
  WHERE import_key IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.places_visited TO authenticated;
GRANT ALL ON public.places_visited TO service_role;

DROP POLICY IF EXISTS "Others can view shared places" ON public.places_visited;
CREATE POLICY "Others can view shared places"
ON public.places_visited
FOR SELECT
TO authenticated
USING (
  source <> 'demo'
  AND (
    visibility = 'public'
    OR (
      visibility = 'followers'
      AND EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = auth.uid()
          AND f.following_id = places_visited.user_id
          AND f.status = 'accepted'
      )
    )
  )
);