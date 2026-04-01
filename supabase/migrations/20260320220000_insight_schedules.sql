-- Insight Schedules: weekly/monthly automated AI insight delivery
CREATE TABLE IF NOT EXISTS public.insight_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('weekly', 'monthly')),
  delivery_email TEXT NOT NULL,
  day_of_week INTEGER DEFAULT 1 CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon
  day_of_month INTEGER DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  hour_utc INTEGER DEFAULT 8 CHECK (hour_utc BETWEEN 0 AND 23),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_insight_schedules_user_id ON public.insight_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_insight_schedules_next_run ON public.insight_schedules(next_run_at) WHERE is_active = true;

ALTER TABLE public.insight_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_insight_schedules" ON public.insight_schedules;
CREATE POLICY "users_manage_own_insight_schedules"
ON public.insight_schedules
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_insight_schedule_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_insight_schedules_updated_at ON public.insight_schedules;
CREATE TRIGGER trg_insight_schedules_updated_at
BEFORE UPDATE ON public.insight_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_insight_schedule_updated_at();
