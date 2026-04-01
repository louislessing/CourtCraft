-- ============================================================
-- AI Conversation History & Case Context Migration
-- Adds case_id to chat_messages and creates case_context table
-- for persistent AI-readable case summaries across sessions
-- ============================================================

-- 1. Add case_id to chat_messages (link messages to a specific case)
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL;

-- 2. Create case_context table for AI-readable case summaries
CREATE TABLE IF NOT EXISTS public.case_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    context_summary TEXT NOT NULL DEFAULT '',
    key_facts JSONB DEFAULT '[]'::jsonb,
    last_updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, case_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_case_id ON public.chat_messages(case_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_session ON public.chat_messages(user_id, session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_case_context_user_case ON public.case_context(user_id, case_id);

-- 4. Enable RLS
ALTER TABLE public.case_context ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "users_manage_own_case_context" ON public.case_context;
CREATE POLICY "users_manage_own_case_context" ON public.case_context
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
