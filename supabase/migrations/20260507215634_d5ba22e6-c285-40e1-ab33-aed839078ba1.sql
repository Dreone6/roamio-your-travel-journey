-- Add encryption mode to conversations
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS encryption_mode text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS vanish_after_seconds integer DEFAULT NULL;

-- Add encryption fields to messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS encrypted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS encryption_metadata jsonb DEFAULT NULL;

-- Add index for expired vanish messages cleanup
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON public.messages (expires_at) WHERE expires_at IS NOT NULL;