-- Child Contact Tracker
-- Tracks scheduled contact visits, missed contacts, and upcoming contact dates

DROP TYPE IF EXISTS public.contact_visit_type CASCADE;
CREATE TYPE public.contact_visit_type AS ENUM ('in_person', 'video', 'phone');

DROP TYPE IF EXISTS public.contact_visit_status CASCADE;
CREATE TYPE public.contact_visit_status AS ENUM ('scheduled', 'completed', 'missed', 'cancelled');

CREATE TABLE IF NOT EXISTS public.child_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    case_id UUID REFERENCES public.cases(id) ON DELETE SET NULL,
    child_name TEXT NOT NULL,
    contact_date TIMESTAMPTZ NOT NULL,
    contact_type public.contact_visit_type NOT NULL DEFAULT 'in_person',
    status public.contact_visit_status NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    location TEXT,
    duration_minutes INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_child_contacts_user_id ON public.child_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_child_contacts_case_id ON public.child_contacts(case_id);
CREATE INDEX IF NOT EXISTS idx_child_contacts_contact_date ON public.child_contacts(contact_date);
CREATE INDEX IF NOT EXISTS idx_child_contacts_status ON public.child_contacts(status);

ALTER TABLE public.child_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_child_contacts" ON public.child_contacts;
CREATE POLICY "users_manage_own_child_contacts"
ON public.child_contacts
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_child_contacts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS child_contacts_updated_at ON public.child_contacts;
CREATE TRIGGER child_contacts_updated_at
BEFORE UPDATE ON public.child_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_child_contacts_updated_at();
