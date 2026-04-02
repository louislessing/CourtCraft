-- ============================================================
-- Stripe Customers Sync Table
-- ============================================================

-- stripe_customers: dedicated table to mirror Stripe customer objects
CREATE TABLE IF NOT EXISTS public.stripe_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    stripe_customer_id TEXT NOT NULL UNIQUE,
    email TEXT,
    name TEXT,
    currency TEXT DEFAULT 'gbp',
    deleted BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON public.stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_customer_id ON public.stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_email ON public.stripe_customers(email);

-- Indexes on existing payments table for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_customer_id ON public.payments(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_status ON public.payments(stripe_status);

-- Indexes on subscriptions for customer lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);

-- Enable RLS
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stripe_customers
DROP POLICY IF EXISTS "users_view_own_stripe_customers" ON public.stripe_customers;
CREATE POLICY "users_view_own_stripe_customers"
ON public.stripe_customers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Service role can manage all stripe_customers (for webhook sync)
DROP POLICY IF EXISTS "service_manage_stripe_customers" ON public.stripe_customers;
CREATE POLICY "service_manage_stripe_customers"
ON public.stripe_customers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- RLS Policies for payments table (ensure service role can write)
DROP POLICY IF EXISTS "users_view_own_payments" ON public.payments;
CREATE POLICY "users_view_own_payments"
ON public.payments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "service_manage_payments" ON public.payments;
CREATE POLICY "service_manage_payments"
ON public.payments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
