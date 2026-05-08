ALTER TABLE public.stories ALTER COLUMN visibility SET DEFAULT 'followers';
ALTER TABLE public.memories ALTER COLUMN visibility SET DEFAULT 'followers';
ALTER TABLE public.user_privacy_settings ALTER COLUMN default_story_visibility SET DEFAULT 'followers';