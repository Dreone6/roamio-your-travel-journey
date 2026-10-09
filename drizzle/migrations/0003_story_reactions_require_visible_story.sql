-- Reacting must not bypass story visibility (blocks, private profiles, per-row visibility).
CREATE POLICY "Reactions only on visible stories" ON public.story_reactions
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stories s
    WHERE s.id = story_reactions.story_id
      AND public.can_view_owned_content(auth.uid(), s.user_id, s.visibility)
  ));