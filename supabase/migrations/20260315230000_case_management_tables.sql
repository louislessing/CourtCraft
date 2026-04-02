-- ============================================================
-- Case Management Tables Migration
-- Creates missing tables needed for Case Management page
-- ============================================================

-- 1. ENUMS (idempotent)
DROP TYPE IF EXISTS public.case_status CASCADE;
CREATE TYPE public.case_status AS ENUM ('active', 'closed', 'pending', 'on_hold');

DROP TYPE IF EXISTS public.event_importance CASCADE;
CREATE TYPE public.event_importance AS ENUM ('high', 'medium', 'low');

DROP TYPE IF EXISTS public.contact_sentiment CASCADE;
CREATE TYPE public.contact_sentiment AS ENUM ('positive', 'neutral', 'concerning');

DROP TYPE IF EXISTS public.finance_type CASCADE;
CREATE TYPE public.finance_type AS ENUM ('income', 'expense');

DROP TYPE IF EXISTS public.comm_channel CASCADE;
CREATE TYPE public.comm_channel AS ENUM ('WhatsApp', 'Email', 'Text', 'Phone', 'In Person', 'Letter');

DROP TYPE IF EXISTS public.doc_status CASCADE;
CREATE TYPE public.doc_status AS ENUM ('draft', 'complete', 'submitted');

DROP TYPE IF EXISTS public.chat_role CASCADE;
CREATE TYPE public.chat_role AS ENUM ('user', 'ai', 'support');

DROP TYPE IF EXISTS public.date_type CASCADE;
CREATE TYPE public.date_type AS ENUM ('court', 'mediation', 'deadline', 'contact', 'other');

-- 2. USER PROFILES (intermediary table for auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT DEFAULT '',
    country TEXT DEFAULT 'GB',
    stripe_customer_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. CASES TABLE
CREATE TABLE IF NOT EXISTS public.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    case_number TEXT,
    title TEXT NOT NULL,
    court_name TEXT,
    case_type TEXT DEFAULT 'Child Arrangements',
    status public.case_status DEFAULT 'active'::public.case_status,
    applicant_name TEXT,
    respondent_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. TIMELINE EVENTS
CREATE TABLE IF NOT EXISTS public.timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    importance public.event_importance DEFAULT 'medium'::public.event_importance,
    has_evidence BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. CONTACT LOGS
CREATE TABLE IF NOT EXISTS public.contact_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_date DATE NOT NULL,
    contact_type TEXT NOT NULL,
    child_name TEXT,
    location TEXT,
    mood TEXT,
    notes TEXT,
    sentiment public.contact_sentiment DEFAULT 'neutral'::public.contact_sentiment,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. FINANCE ENTRIES
CREATE TABLE IF NOT EXISTS public.finance_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    entry_type public.finance_type NOT NULL,
    category TEXT,
    has_receipt BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. COMMUNICATIONS
CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comm_date DATE NOT NULL,
    channel public.comm_channel NOT NULL,
    message TEXT NOT NULL,
    sentiment public.contact_sentiment DEFAULT 'neutral'::public.contact_sentiment,
    is_flagged BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. DOCUMENTS
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    template_id TEXT,
    template_name TEXT,
    content JSONB DEFAULT '{}'::jsonb,
    status public.doc_status DEFAULT 'draft'::public.doc_status,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.chat_role NOT NULL,
    content TEXT NOT NULL,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. ADD case_id to court_dates if missing
ALTER TABLE public.court_dates
ADD COLUMN IF NOT EXISTS case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE;

-- 11. INDEXES
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON public.cases(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_case_id ON public.timeline_events(case_id);
CREATE INDEX IF NOT EXISTS idx_contact_logs_case_id ON public.contact_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_finance_entries_case_id ON public.finance_entries(case_id);
CREATE INDEX IF NOT EXISTS idx_communications_case_id ON public.communications(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);

-- 12. ENABLE RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 13. RLS POLICIES

-- user_profiles
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles" ON public.user_profiles
FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- cases
DROP POLICY IF EXISTS "users_manage_own_cases" ON public.cases;
CREATE POLICY "users_manage_own_cases" ON public.cases
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- timeline_events
DROP POLICY IF EXISTS "users_manage_own_timeline_events" ON public.timeline_events;
CREATE POLICY "users_manage_own_timeline_events" ON public.timeline_events
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- contact_logs
DROP POLICY IF EXISTS "users_manage_own_contact_logs" ON public.contact_logs;
CREATE POLICY "users_manage_own_contact_logs" ON public.contact_logs
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- finance_entries
DROP POLICY IF EXISTS "users_manage_own_finance_entries" ON public.finance_entries;
CREATE POLICY "users_manage_own_finance_entries" ON public.finance_entries
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- communications
DROP POLICY IF EXISTS "users_manage_own_communications" ON public.communications;
CREATE POLICY "users_manage_own_communications" ON public.communications
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- documents
DROP POLICY IF EXISTS "users_manage_own_documents" ON public.documents;
CREATE POLICY "users_manage_own_documents" ON public.documents
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- chat_messages
DROP POLICY IF EXISTS "users_manage_own_chat_messages" ON public.chat_messages;
CREATE POLICY "users_manage_own_chat_messages" ON public.chat_messages
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 14. HANDLE NEW USER TRIGGER (auto-create user_profiles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, avatar_url, country)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        COALESCE(NEW.raw_user_meta_data->>'country', 'GB')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 15. BACKFILL user_profiles for existing auth users
DO $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    SELECT 
        au.id,
        au.email,
        COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1))
    FROM auth.users au
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
    )
    ON CONFLICT (id) DO NOTHING;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Backfill user_profiles failed: %', SQLERRM;
END $$;
