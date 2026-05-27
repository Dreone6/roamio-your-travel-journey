
ALTER TABLE public.badges
  ADD COLUMN IF NOT EXISTS badge_slug text,
  ADD COLUMN IF NOT EXISTS description text;

CREATE UNIQUE INDEX IF NOT EXISTS badges_user_slug_unique
  ON public.badges(user_id, badge_slug) WHERE badge_slug IS NOT NULL;

ALTER TABLE public.offer_interactions
  ADD COLUMN IF NOT EXISTS claim_code text,
  ADD COLUMN IF NOT EXISTS claim_expires_at timestamptz;
