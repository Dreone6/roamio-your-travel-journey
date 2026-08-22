
-- Helper: is a user a participant of a conversation (security definer avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conversation uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = _conversation AND cp.user_id = _user
  );
$$;

-- Helper: does the acting user have a block relationship with anyone else in the conversation
CREATE OR REPLACE FUNCTION public.conversation_has_block(_conversation uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    JOIN public.blocked_users b
      ON (b.blocker_id = _user AND b.blocked_id = cp.user_id)
      OR (b.blocker_id = cp.user_id AND b.blocked_id = _user)
    WHERE cp.conversation_id = _conversation AND cp.user_id <> _user
  );
$$;

CREATE OR REPLACE FUNCTION public.conversation_created_by(_conversation uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.created_by FROM public.conversations c WHERE c.id = _conversation;
$$;

-- ── conversations ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.conversations;

CREATE POLICY "Participants can view conversations"
ON public.conversations FOR SELECT TO authenticated
USING (public.is_conversation_participant(id, auth.uid()));

CREATE POLICY "Participants can update conversations"
ON public.conversations FOR UPDATE TO authenticated
USING (public.is_conversation_participant(id, auth.uid()) AND NOT public.conversation_has_block(id, auth.uid()))
WITH CHECK (public.is_conversation_participant(id, auth.uid()));

-- ── conversation_participants ───────────────────────────────────
DROP POLICY IF EXISTS "Users can view own participation" ON public.conversation_participants;

CREATE POLICY "Participants can view the roster"
ON public.conversation_participants FOR SELECT TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Creator adds participants, no blocked pairs"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (
  public.conversation_created_by(conversation_id) = auth.uid()
  AND NOT public.is_blocked_between(auth.uid(), user_id)
);

CREATE POLICY "Users update their own participation"
ON public.conversation_participants FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users leave conversations"
ON public.conversation_participants FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- ── messages ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;

CREATE POLICY "Participants can view messages"
ON public.messages FOR SELECT TO authenticated
USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.is_conversation_participant(conversation_id, auth.uid())
  AND NOT public.conversation_has_block(conversation_id, auth.uid())
);

-- ── profiles: hide emails, hide blocked people ──────────────────
DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;

CREATE POLICY "Profiles are viewable except across blocks"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR NOT public.is_blocked_between(auth.uid(), id));

REVOKE SELECT (email) ON public.profiles FROM authenticated, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
