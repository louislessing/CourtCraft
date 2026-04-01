-- ============================================================
-- Performance Indexes Migration
-- Adds indexes on frequently queried columns and composite
-- indexes to eliminate N+1 query patterns
-- ============================================================

-- ── created_at indexes (range scans, ORDER BY) ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_cases_created_at
  ON public.cases(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_events_created_at
  ON public.timeline_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contact_logs_created_at
  ON public.contact_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_finance_entries_created_at
  ON public.finance_entries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_communications_created_at
  ON public.communications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_created_at
  ON public.documents(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
  ON public.chat_messages(created_at DESC);

-- ── user_id indexes (already exist on some tables, add missing ones) ─────
CREATE INDEX IF NOT EXISTS idx_timeline_events_user_id
  ON public.timeline_events(user_id);

CREATE INDEX IF NOT EXISTS idx_contact_logs_user_id
  ON public.contact_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_finance_entries_user_id
  ON public.finance_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_communications_user_id
  ON public.communications(user_id);

-- ── Composite indexes: (case_id, created_at) for tab queries ─────────────
-- These cover the common pattern: .eq('case_id', id).order('*_date', ...)
-- Postgres can use the case_id equality + date ordering in a single index scan

CREATE INDEX IF NOT EXISTS idx_timeline_events_case_created
  ON public.timeline_events(case_id, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_contact_logs_case_created
  ON public.contact_logs(case_id, contact_date DESC);

CREATE INDEX IF NOT EXISTS idx_finance_entries_case_created
  ON public.finance_entries(case_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_communications_case_created
  ON public.communications(case_id, comm_date DESC);

CREATE INDEX IF NOT EXISTS idx_court_dates_case_created
  ON public.court_dates(case_id, event_date ASC);

-- ── Composite indexes: (user_id, created_at) for dashboard aggregations ──
CREATE INDEX IF NOT EXISTS idx_cases_user_created
  ON public.cases(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_user_created
  ON public.documents(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created
  ON public.chat_messages(user_id, created_at DESC);

-- ── file_uploads: composite index for batched context lookups ────────────
-- Covers: .eq('user_id', uid).eq('context', ctx).in('context_id', ids)
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_context
  ON public.file_uploads(user_id, context, context_id);

-- ── Partial index: active cases per user (most common query) ─────────────
CREATE INDEX IF NOT EXISTS idx_cases_user_active
  ON public.cases(user_id, created_at DESC)
  WHERE status = 'active';
