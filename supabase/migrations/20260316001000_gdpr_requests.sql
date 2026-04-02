-- GDPR Requests & Consent Management
-- Migration: 20260316001000_gdpr_requests.sql

-- ── ENUMS ──────────────────────────────────────────────────────────────────
DROP TYPE IF EXISTS public.gdpr_request_type CASCADE;
CREATE TYPE public.gdpr_request_type AS ENUM (
  'access',
  'erasure',
  'rectification',
  'consent_update',
  'portability',
  'restriction',
  'objection'
);

DROP TYPE IF EXISTS public.gdpr_request_status CASCADE;
CREATE TYPE public.gdpr_request_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'rejected'
);

-- ── GDPR REQUESTS TABLE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.gdpr_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type      public.gdpr_request_type NOT NULL,
  status            public.gdpr_request_status NOT NULL DEFAULT 'pending'::public.gdpr_request_status,
  details           TEXT,
  rectification_data JSONB,
  admin_notes       TEXT,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── USER CONSENT PREFERENCES TABLE ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_consent_preferences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analytics_consent     BOOLEAN NOT NULL DEFAULT false,
  marketing_consent     BOOLEAN NOT NULL DEFAULT false,
  functional_consent    BOOLEAN NOT NULL DEFAULT true,
  essential_consent     BOOLEAN NOT NULL DEFAULT true,
  cookie_consent        BOOLEAN NOT NULL DEFAULT false,
  data_processing_consent BOOLEAN NOT NULL DEFAULT true,
  last_updated          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- ── INDEXES ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_id ON public.gdpr_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON public.gdpr_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_type ON public.gdpr_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_created_at ON public.gdpr_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_consent_user_id ON public.user_consent_preferences(user_id);

-- ── AUTO-UPDATE TRIGGER ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_gdpr_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gdpr_requests_updated_at ON public.gdpr_requests;
CREATE TRIGGER gdpr_requests_updated_at
  BEFORE UPDATE ON public.gdpr_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gdpr_updated_at();

CREATE OR REPLACE FUNCTION public.update_consent_last_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.last_updated = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS consent_preferences_updated_at ON public.user_consent_preferences;
CREATE TRIGGER consent_preferences_updated_at
  BEFORE UPDATE ON public.user_consent_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_consent_last_updated();

-- ── ENABLE RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_consent_preferences ENABLE ROW LEVEL SECURITY;

-- ── RLS POLICIES ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_manage_own_gdpr_requests" ON public.gdpr_requests;
CREATE POLICY "users_manage_own_gdpr_requests"
  ON public.gdpr_requests
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_manage_own_consent_preferences" ON public.user_consent_preferences;
CREATE POLICY "users_manage_own_consent_preferences"
  ON public.user_consent_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
