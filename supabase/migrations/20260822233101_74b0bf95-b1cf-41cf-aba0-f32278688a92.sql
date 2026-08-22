
ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'private';

DROP POLICY IF EXISTS "Shared check-ins are viewable" ON public.check_ins;
CREATE POLICY "Shared check-ins are viewable"
ON public.check_ins FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    NOT public.is_blocked_between(auth.uid(), user_id)
    AND (
      visibility = 'public'
      OR (visibility = 'followers' AND public.follows_accepted(auth.uid(), user_id))
    )
  )
);
