-- ============================================================
-- Court Date Reminders Migration
-- Adds: notifications table, reminder tracking on court_dates
-- ============================================================

-- 1. Create court_dates table if it doesn't exist (standalone, no FK to cases)
CREATE TABLE IF NOT EXISTS public.court_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_date DATE,
    event_title TEXT,
    event_type TEXT,
    location TEXT,
    notes TEXT,
    is_urgent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 1b. Add FK to cases only if cases table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'cases'
    ) THEN
        -- Add FK constraint if not already present
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE table_schema = 'public'
              AND table_name = 'court_dates'
              AND constraint_name = 'court_dates_case_id_fkey'
        ) THEN
            ALTER TABLE public.court_dates
            ADD CONSTRAINT court_dates_case_id_fkey
            FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;
        END IF;
    END IF;
END $$;

-- 2. Add reminder tracking columns to court_dates
ALTER TABLE public.court_dates
    ADD COLUMN IF NOT EXISTS reminder_2w_sent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS reminder_1w_sent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS reminder_48h_sent BOOLEAN DEFAULT false;

-- 3. Notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    court_date_id UUID REFERENCES public.court_dates(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('2_weeks', '1_week', '48_hours')),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_court_dates_event_date ON public.court_dates(event_date);

-- 5. Enable RLS
ALTER TABLE public.court_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for court_dates
DROP POLICY IF EXISTS "users_manage_own_court_dates" ON public.court_dates;
CREATE POLICY "users_manage_own_court_dates" ON public.court_dates
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service_role_manage_court_dates" ON public.court_dates;
CREATE POLICY "service_role_manage_court_dates" ON public.court_dates
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. RLS Policies for notifications
DROP POLICY IF EXISTS "users_manage_own_notifications" ON public.notifications;
CREATE POLICY "users_manage_own_notifications" ON public.notifications
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service_role_manage_notifications" ON public.notifications;
CREATE POLICY "service_role_manage_notifications" ON public.notifications
FOR ALL TO service_role USING (true) WITH CHECK (true);
