-- File Uploads: Storage bucket + metadata table
-- Supports: Document Builder, Case Management (Finance, Contacts, Comms, Timeline, Court Dates), Dashboard

-- ── 1. file_uploads metadata table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.file_uploads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id      UUID,  -- soft reference to public.cases(id); FK added conditionally below
  bucket_name  TEXT NOT NULL DEFAULT 'case-files',
  storage_path TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_size    BIGINT,
  mime_type    TEXT,
  context      TEXT NOT NULL,
  context_id   UUID,
  created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add FK to cases only if the cases table already exists (safe for any migration order)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'cases'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'file_uploads_case_id_fkey'
        AND table_name = 'file_uploads'
        AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.file_uploads
        ADD CONSTRAINT file_uploads_case_id_fkey
        FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id    ON public.file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_context    ON public.file_uploads(context);
CREATE INDEX IF NOT EXISTS idx_file_uploads_context_id ON public.file_uploads(context_id);

-- ── 2. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_file_uploads" ON public.file_uploads;
CREATE POLICY "users_manage_own_file_uploads"
  ON public.file_uploads
  FOR ALL
  TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 3. Storage bucket (idempotent via DO block) ──────────────────────────────
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'case-files',
    'case-files',
    false,
    52428800,  -- 50 MB
    ARRAY[
      'image/jpeg','image/png','image/gif','image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'video/mp4','video/quicktime',
      'audio/mpeg','audio/wav'
    ]
  )
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Storage bucket creation skipped: %', SQLERRM;
END $$;

-- ── 4. Storage RLS policies ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "authenticated_upload_case_files" ON storage.objects;
CREATE POLICY "authenticated_upload_case_files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'case-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "authenticated_read_own_case_files" ON storage.objects;
CREATE POLICY "authenticated_read_own_case_files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'case-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "authenticated_delete_own_case_files" ON storage.objects;
CREATE POLICY "authenticated_delete_own_case_files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'case-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
