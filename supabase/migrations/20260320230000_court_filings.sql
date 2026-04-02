-- Court Filing Tracker: court_filings table
-- Migration: 20260320230000_court_filings.sql

CREATE TABLE IF NOT EXISTS public.court_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_title TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'Other',
  submission_date DATE NOT NULL,
  court_reference_number TEXT NOT NULL DEFAULT '',
  court_name TEXT NOT NULL DEFAULT '',
  hearing_date DATE,
  response_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (response_status IN ('pending', 'acknowledged', 'accepted', 'rejected', 'awaiting_hearing', 'decided')),
  response_date DATE,
  response_notes TEXT NOT NULL DEFAULT '',
  filed_by TEXT NOT NULL DEFAULT '',
  case_number TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_court_filings_user_id ON public.court_filings(user_id);
CREATE INDEX IF NOT EXISTS idx_court_filings_submission_date ON public.court_filings(submission_date DESC);
CREATE INDEX IF NOT EXISTS idx_court_filings_hearing_date ON public.court_filings(hearing_date);
CREATE INDEX IF NOT EXISTS idx_court_filings_response_status ON public.court_filings(response_status);

ALTER TABLE public.court_filings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_court_filings" ON public.court_filings;
CREATE POLICY "users_manage_own_court_filings"
ON public.court_filings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_court_filings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS court_filings_updated_at ON public.court_filings;
CREATE TRIGGER court_filings_updated_at
  BEFORE UPDATE ON public.court_filings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_court_filings_updated_at();
