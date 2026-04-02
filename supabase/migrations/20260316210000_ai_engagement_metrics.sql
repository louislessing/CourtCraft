-- ============================================================
-- AI Engagement Metrics Migration
-- Tracks questions asked, response times, case types discussed,
-- and feature adoption rates for the AI legal assistant
-- ============================================================

-- 1. Create ai_engagement_metrics table
CREATE TABLE IF NOT EXISTS public.ai_engagement_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL DEFAULT 'dashboard',
    case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
    case_type TEXT,
    question_count INTEGER NOT NULL DEFAULT 0,
    response_time_ms INTEGER,
    message_length INTEGER,
    feature_used TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_ai_metrics_user_id ON public.ai_engagement_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_created_at ON public.ai_engagement_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_case_type ON public.ai_engagement_metrics(case_type);
CREATE INDEX IF NOT EXISTS idx_ai_metrics_feature_used ON public.ai_engagement_metrics(feature_used);

-- 3. Enable RLS
ALTER TABLE public.ai_engagement_metrics ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "users_manage_own_ai_metrics" ON public.ai_engagement_metrics;
CREATE POLICY "users_manage_own_ai_metrics"
ON public.ai_engagement_metrics
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
