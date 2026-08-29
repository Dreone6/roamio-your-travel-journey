CREATE TYPE public.trip_visibility AS ENUM ('private', 'friends_only', 'public');

ALTER TABLE public.trips
  ADD COLUMN visibility public.trip_visibility NOT NULL DEFAULT 'private';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_idx
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- Read policy for friends_only / public trips (writes stay owner/member-governed by existing policies)
CREATE POLICY "Followers and public can view visible trips"
ON public.trips
FOR SELECT
TO authenticated
USING (
  visibility = 'public'
  OR (
    visibility = 'friends_only'
    AND public.follows_accepted(auth.uid(), user_id)
    AND NOT public.is_blocked_between(auth.uid(), user_id)
  )
);