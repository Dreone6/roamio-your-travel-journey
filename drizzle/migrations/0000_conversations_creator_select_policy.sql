CREATE POLICY "Creators can view their own conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);