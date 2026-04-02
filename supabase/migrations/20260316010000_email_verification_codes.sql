-- Email verification codes table for custom OTP flow
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email ON public.email_verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_codes_expires ON public.email_verification_codes(expires_at);

ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by edge functions)
DROP POLICY IF EXISTS "service_role_manage_verification_codes" ON public.email_verification_codes;
CREATE POLICY "service_role_manage_verification_codes"
ON public.email_verification_codes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read their own codes
DROP POLICY IF EXISTS "users_read_own_verification_codes" ON public.email_verification_codes;
CREATE POLICY "users_read_own_verification_codes"
ON public.email_verification_codes
FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Add email_verified column to user_profiles if not exists
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Function to clean up expired codes
CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.email_verification_codes
    WHERE expires_at < NOW() OR used_at IS NOT NULL;
END;
$$;
