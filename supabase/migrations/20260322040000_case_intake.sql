-- Case Intake Table
-- Stores guided intake responses to personalise dashboard experience

CREATE TABLE IF NOT EXISTS public.case_intake (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  case_type TEXT NOT NULL,
  complexity_level TEXT NOT NULL,
  key_issues TEXT[] NOT NULL DEFAULT '{}',
  additional_context TEXT,
  recommended_tools TEXT[] NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_case_intake_user_id ON public.case_intake(user_id);
CREATE INDEX IF NOT EXISTS idx_case_intake_created_at ON public.case_intake(created_at DESC);

ALTER TABLE public.case_intake ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_case_intake" ON public.case_intake;
CREATE POLICY "users_manage_own_case_intake"
ON public.case_intake
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_case_intake_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS case_intake_updated_at ON public.case_intake;
CREATE TRIGGER case_intake_updated_at
  BEFORE UPDATE ON public.case_intake
  FOR EACH ROW
  EXECUTE FUNCTION public.update_case_intake_updated_at();
