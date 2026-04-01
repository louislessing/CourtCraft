-- ============================================================
-- CourtCraft Full Schema Migration
-- ============================================================

-- 1. ENUMS
DROP TYPE IF EXISTS public.subscription_status CASCADE;
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

DROP TYPE IF EXISTS public.subscription_currency CASCADE;
CREATE TYPE public.subscription_currency AS ENUM ('GBP', 'USD', 'CAD', 'AUD', 'NZD', 'EUR');

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

-- 2. CORE TABLES

-- user_profiles
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

-- subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id TEXT,
    stripe_price_id TEXT,
    payment_intent_id TEXT,
    stripe_charge_id TEXT,
    status public.subscription_status DEFAULT 'trialing'::public.subscription_status,
    currency public.subscription_currency DEFAULT 'GBP'::public.subscription_currency,
    amount DECIMAL(10,2) DEFAULT 25.00,
    payment_status TEXT DEFAULT 'pending',
    trial_end TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    current_period_start TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    current_period_end TIMESTAMPTZ DEFAULT (CURRENT_TIMESTAMP + INTERVAL '1 month'),
    cancel_at_period_end BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- cases
CREATE TABLE IF NOT EXISTS public.cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
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

-- timeline_events
CREATE TABLE IF NOT EXISTS public.timeline_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    importance public.event_importance DEFAULT 'medium'::public.event_importance,
    has_evidence BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- contact_logs
CREATE TABLE IF NOT EXISTS public.contact_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    contact_date DATE NOT NULL,
    contact_type TEXT NOT NULL,
    child_name TEXT,
    location TEXT,
    mood TEXT,
    notes TEXT,
    sentiment public.contact_sentiment DEFAULT 'neutral'::public.contact_sentiment,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- finance_entries
CREATE TABLE IF NOT EXISTS public.finance_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    entry_type public.finance_type NOT NULL,
    category TEXT,
    has_receipt BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- communications
CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    comm_date DATE NOT NULL,
    channel public.comm_channel NOT NULL,
    message TEXT NOT NULL,
    sentiment public.contact_sentiment DEFAULT 'neutral'::public.contact_sentiment,
    is_flagged BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- documents
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    template_id TEXT,
    template_name TEXT,
    content JSONB DEFAULT '{}'::jsonb,
    status public.doc_status DEFAULT 'draft'::public.doc_status,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- court_dates
CREATE TABLE IF NOT EXISTS public.court_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    event_title TEXT NOT NULL,
    event_type public.date_type DEFAULT 'court'::public.date_type,
    is_urgent BOOLEAN DEFAULT false,
    reminder_sent BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role public.chat_role NOT NULL,
    content TEXT NOT NULL,
    session_id TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON public.cases(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_case_id ON public.timeline_events(case_id);
CREATE INDEX IF NOT EXISTS idx_contact_logs_case_id ON public.contact_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_finance_entries_case_id ON public.finance_entries(case_id);
CREATE INDEX IF NOT EXISTS idx_communications_case_id ON public.communications(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_court_dates_case_id ON public.court_dates(case_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);

-- 4. FUNCTIONS

-- handle_new_user trigger function
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

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 5. ENABLE RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- user_profiles
DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles" ON public.user_profiles
FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- subscriptions
DROP POLICY IF EXISTS "users_manage_own_subscriptions" ON public.subscriptions;
CREATE POLICY "users_manage_own_subscriptions" ON public.subscriptions
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

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

-- court_dates
DROP POLICY IF EXISTS "users_manage_own_court_dates" ON public.court_dates;
CREATE POLICY "users_manage_own_court_dates" ON public.court_dates
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- chat_messages
DROP POLICY IF EXISTS "users_manage_own_chat_messages" ON public.chat_messages;
CREATE POLICY "users_manage_own_chat_messages" ON public.chat_messages
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 7. TRIGGERS

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_user_profiles_updated ON public.user_profiles;
CREATE TRIGGER on_user_profiles_updated
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_cases_updated ON public.cases;
CREATE TRIGGER on_cases_updated
    BEFORE UPDATE ON public.cases
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_documents_updated ON public.documents;
CREATE TRIGGER on_documents_updated
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_subscriptions_updated ON public.subscriptions;
CREATE TRIGGER on_subscriptions_updated
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. MOCK DATA
DO $$
DECLARE
    demo_user_uuid UUID := gen_random_uuid();
    demo_case_uuid UUID := gen_random_uuid();
BEGIN
    -- Create demo auth user
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES (
        demo_user_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'demo@courtcraft.io', crypt('Demo1234!', gen_salt('bf', 10)), now(), now(), now(),
        jsonb_build_object('full_name', 'Jamie Thompson', 'country', 'GB'),
        jsonb_build_object('provider', 'email', 'providers', ARRAY['email']::TEXT[]),
        false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null
    ) ON CONFLICT (id) DO NOTHING;

    -- Create demo case
    INSERT INTO public.cases (id, user_id, case_number, title, court_name, case_type, status, applicant_name, respondent_name)
    VALUES (
        demo_case_uuid, demo_user_uuid, 'CF25/12345',
        'Thompson v Thompson — Child Arrangements',
        'Central Family Court, London', 'Child Arrangements',
        'active'::public.case_status, 'Jamie Thompson', 'Alex Thompson'
    ) ON CONFLICT (id) DO NOTHING;

    -- Create demo subscription (trialing)
    INSERT INTO public.subscriptions (user_id, status, currency, amount, trial_end)
    VALUES (
        demo_user_uuid, 'trialing'::public.subscription_status,
        'GBP'::public.subscription_currency, 25.00,
        CURRENT_TIMESTAMP + INTERVAL '7 days'
    ) ON CONFLICT (id) DO NOTHING;

    -- Timeline events
    INSERT INTO public.timeline_events (case_id, user_id, event_date, title, description, importance, has_evidence)
    VALUES
        (demo_case_uuid, demo_user_uuid, '2025-01-14', 'Separation', 'Parties separated. Children remained with Respondent.', 'high'::public.event_importance, true),
        (demo_case_uuid, demo_user_uuid, '2025-03-02', 'C100 Application Filed', 'Applicant filed C100 for child arrangements order.', 'high'::public.event_importance, true),
        (demo_case_uuid, demo_user_uuid, '2025-03-18', 'First Hearing — FHDRA', 'First Hearing Dispute Resolution Appointment. No agreement reached.', 'high'::public.event_importance, false),
        (demo_case_uuid, demo_user_uuid, '2025-05-05', 'CAFCASS Report Ordered', 'Court ordered a Section 7 welfare report.', 'medium'::public.event_importance, true),
        (demo_case_uuid, demo_user_uuid, '2025-07-22', 'Section 7 Report Received', 'CAFCASS report recommended shared care arrangement.', 'high'::public.event_importance, true),
        (demo_case_uuid, demo_user_uuid, '2026-03-28', 'Directions Hearing (Upcoming)', 'Court to set timetable for final hearing.', 'high'::public.event_importance, false)
    ON CONFLICT (id) DO NOTHING;

    -- Contact logs
    INSERT INTO public.contact_logs (case_id, user_id, contact_date, contact_type, child_name, location, mood, notes, sentiment)
    VALUES
        (demo_case_uuid, demo_user_uuid, '2026-03-13', 'Pickup', 'Oliver (8)', 'School gate', 'Happy', 'On time. No issues.', 'positive'::public.contact_sentiment),
        (demo_case_uuid, demo_user_uuid, '2026-03-10', 'Drop-off', 'Oliver (8)', 'Respondent''s home', 'Unsettled', 'Child appeared anxious. Asked to stay.', 'concerning'::public.contact_sentiment),
        (demo_case_uuid, demo_user_uuid, '2026-03-08', 'Phone Call', 'Oliver (8)', 'N/A', 'Neutral', 'Brief call. Child said he was fine.', 'neutral'::public.contact_sentiment),
        (demo_case_uuid, demo_user_uuid, '2026-03-06', 'Pickup', 'Oliver (8)', 'School gate', 'Happy', 'Normal pickup. Child excited.', 'positive'::public.contact_sentiment)
    ON CONFLICT (id) DO NOTHING;

    -- Finance entries
    INSERT INTO public.finance_entries (case_id, user_id, entry_date, description, amount, entry_type, category, has_receipt)
    VALUES
        (demo_case_uuid, demo_user_uuid, '2026-03-01', 'Maintenance Received', 350.00, 'income'::public.finance_type, 'Child Maintenance', true),
        (demo_case_uuid, demo_user_uuid, '2026-02-15', 'School Trip', 45.00, 'expense'::public.finance_type, 'Education', true),
        (demo_case_uuid, demo_user_uuid, '2026-02-14', 'School Uniform', 78.00, 'expense'::public.finance_type, 'Clothing', true),
        (demo_case_uuid, demo_user_uuid, '2026-02-01', 'Maintenance Received', 350.00, 'income'::public.finance_type, 'Child Maintenance', true)
    ON CONFLICT (id) DO NOTHING;

    -- Communications
    INSERT INTO public.communications (case_id, user_id, comm_date, channel, message, sentiment, is_flagged)
    VALUES
        (demo_case_uuid, demo_user_uuid, '2026-03-14', 'WhatsApp'::public.comm_channel, 'Can we discuss the Easter holidays arrangements?', 'neutral'::public.contact_sentiment, false),
        (demo_case_uuid, demo_user_uuid, '2026-03-12', 'Email'::public.comm_channel, 'I am not happy with the current schedule and intend to apply back to court.', 'concerning'::public.contact_sentiment, true),
        (demo_case_uuid, demo_user_uuid, '2026-03-10', 'WhatsApp'::public.comm_channel, 'Oliver had a great time at the weekend. Thank you for dropping him off on time.', 'positive'::public.contact_sentiment, false)
    ON CONFLICT (id) DO NOTHING;

    -- Court dates
    INSERT INTO public.court_dates (case_id, user_id, event_date, event_title, event_type, is_urgent)
    VALUES
        (demo_case_uuid, demo_user_uuid, '2026-03-28', 'Directions Hearing — Central Family Court', 'court'::public.date_type, true),
        (demo_case_uuid, demo_user_uuid, '2026-04-02', 'Mediation Session — MIAM', 'mediation'::public.date_type, false),
        (demo_case_uuid, demo_user_uuid, '2026-04-15', 'Position Statement Deadline', 'deadline'::public.date_type, false),
        (demo_case_uuid, demo_user_uuid, '2026-04-22', 'Child Contact — Weekend handover', 'contact'::public.date_type, false)
    ON CONFLICT (id) DO NOTHING;

    -- Documents
    INSERT INTO public.documents (user_id, case_id, title, template_id, template_name, status)
    VALUES
        (demo_user_uuid, demo_case_uuid, 'Position Statement — Directions Hearing', 'position-statement', 'Position Statement', 'draft'::public.doc_status),
        (demo_user_uuid, demo_case_uuid, 'Chronology of Events', 'chronology', 'Chronology of Events', 'complete'::public.doc_status),
        (demo_user_uuid, demo_case_uuid, 'C100 Application', 'c100', 'C100 Application (Child Arrangements)', 'submitted'::public.doc_status)
    ON CONFLICT (id) DO NOTHING;

    -- Chat messages
    INSERT INTO public.chat_messages (user_id, role, content, session_id)
    VALUES
        (demo_user_uuid, 'ai'::public.chat_role, 'Good morning. How can I help with your case today? I can assist with child arrangements, financial remedies, court procedures, or document preparation.', 'demo-session')
    ON CONFLICT (id) DO NOTHING;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
