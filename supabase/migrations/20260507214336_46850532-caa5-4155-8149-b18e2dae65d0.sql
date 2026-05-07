
-- Follows
CREATE TABLE public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id)
);
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own follows" ON public.follows FOR ALL USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Conversations
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  title text,
  last_message_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversation Participants
CREATE TABLE public.conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  muted boolean NOT NULL DEFAULT false,
  last_read_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own participation" ON public.conversation_participants FOR ALL USING (auth.uid() = user_id);

-- Conversations policy (participants only)
CREATE POLICY "Participants can view conversations" ON public.conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = id AND user_id = auth.uid())
);
CREATE POLICY "Users can create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Participants can update conversations" ON public.conversations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = id AND user_id = auth.uid())
);

-- Messages
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'trip_share', 'map_pin', 'memory', 'offer', 'map_share')),
  media_url text,
  metadata jsonb DEFAULT '{}',
  read_by uuid[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can view messages" ON public.messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Participants can send messages" ON public.messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.conversation_participants WHERE conversation_id = messages.conversation_id AND user_id = auth.uid())
);
CREATE POLICY "Senders can update own messages" ON public.messages FOR UPDATE USING (auth.uid() = sender_id);

-- Message Reactions
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own reactions" ON public.message_reactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Participants can view reactions" ON public.message_reactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.messages m JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid())
);

-- Stories
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo', 'video')),
  caption text,
  location_name text,
  latitude double precision,
  longitude double precision,
  trip_id uuid,
  filter_name text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'close_friends', 'private')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  view_count integer NOT NULL DEFAULT 0,
  auto_save_to_globe boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own stories" ON public.stories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view visible stories" ON public.stories FOR SELECT USING (
  visibility = 'public' OR user_id = auth.uid() OR (visibility = 'followers' AND EXISTS (SELECT 1 FROM public.follows WHERE follower_id = auth.uid() AND following_id = stories.user_id AND status = 'accepted'))
);

-- Story Views
CREATE TABLE public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Viewers can log views" ON public.story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);
CREATE POLICY "Story owners can see viewers" ON public.story_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stories WHERE id = story_views.story_id AND user_id = auth.uid()) OR auth.uid() = viewer_id
);

-- Story Reactions
CREATE TABLE public.story_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own story reactions" ON public.story_reactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Story owners can view reactions" ON public.story_reactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.stories WHERE id = story_reactions.story_id AND user_id = auth.uid())
);

-- Memories
CREATE TABLE public.memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo', 'video')),
  caption text,
  location_name text,
  latitude double precision,
  longitude double precision,
  trip_id uuid,
  source text NOT NULL DEFAULT 'camera' CHECK (source IN ('story', 'camera', 'check_in')),
  source_id uuid,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'followers', 'private')),
  pinned_to_globe boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own memories" ON public.memories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view public memories" ON public.memories FOR SELECT USING (
  visibility = 'public' OR user_id = auth.uid() OR (visibility = 'followers' AND EXISTS (SELECT 1 FROM public.follows WHERE follower_id = auth.uid() AND following_id = memories.user_id AND status = 'accepted'))
);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('message', 'story_reply', 'story_reaction', 'story_view_milestone', 'friend_nearby', 'memory_pinned', 'map_viewed', 'new_follower', 'trip_invite')),
  title text NOT NULL,
  body text,
  data jsonb DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- User Privacy Settings
CREATE TABLE public.user_privacy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  message_permission text NOT NULL DEFAULT 'everyone' CHECK (message_permission IN ('everyone', 'followers', 'mutual', 'none')),
  default_story_visibility text NOT NULL DEFAULT 'public' CHECK (default_story_visibility IN ('public', 'followers', 'close_friends', 'private')),
  auto_save_stories text NOT NULL DEFAULT 'auto' CHECK (auto_save_stories IN ('auto', 'ask', 'never')),
  public_map_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own privacy settings" ON public.user_privacy_settings FOR ALL USING (auth.uid() = user_id);

-- Blocked Users
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own blocks" ON public.blocked_users FOR ALL USING (auth.uid() = blocker_id);

-- Reports
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  reported_type text NOT NULL CHECK (reported_type IN ('message', 'story', 'user')),
  reported_id uuid NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can view reports" ON public.reports FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);

-- Enable realtime for messages and stories
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.stories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Indexes
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_stories_user ON public.stories(user_id, created_at DESC);
CREATE INDEX idx_stories_expires ON public.stories(expires_at);
CREATE INDEX idx_memories_user ON public.memories(user_id, created_at DESC);
CREATE INDEX idx_memories_location ON public.memories(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_follows_follower ON public.follows(follower_id, status);
CREATE INDEX idx_follows_following ON public.follows(following_id, status);
