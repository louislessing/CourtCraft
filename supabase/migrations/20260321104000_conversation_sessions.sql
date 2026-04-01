-- ============================================================
-- Conversation Sessions Migration
-- Groups chat_messages into named sessions with timestamps
-- and file references for searchable conversation history
-- ============================================================

-- 1. Create conversation_sessions table
CREATE TABLE IF NOT EXISTS public.conversation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    summary TEXT DEFAULT '',
    file_references JSONB DEFAULT '[]'::jsonb,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add session_ref to chat_messages (links to conversation_sessions)
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS conversation_session_id UUID REFERENCES public.conversation_sessions(id) ON DELETE SET NULL;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON public.conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_last_msg ON public.conversation_sessions(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_case_id ON public.conversation_sessions(case_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_session_id ON public.chat_messages(conversation_session_id);

-- 4. Enable RLS
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "users_manage_own_conversation_sessions" ON public.conversation_sessions;
CREATE POLICY "users_manage_own_conversation_sessions" ON public.conversation_sessions
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 6. Function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_conversation_session_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 7. Trigger for updated_at
DROP TRIGGER IF EXISTS on_conversation_session_updated ON public.conversation_sessions;
CREATE TRIGGER on_conversation_session_updated
    BEFORE UPDATE ON public.conversation_sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_conversation_session_updated_at();
