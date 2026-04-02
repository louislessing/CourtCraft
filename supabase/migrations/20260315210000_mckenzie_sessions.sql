-- McKenzie Friend Sessions table
CREATE TABLE IF NOT EXISTS public.mckenzie_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_customer_id TEXT,
  payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  amount INTEGER NOT NULL DEFAULT 50,
  currency TEXT NOT NULL DEFAULT 'GBP',
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'failed')),
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'confirmed', 'completed', 'cancelled')),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mckenzie_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own mckenzie sessions"
  ON public.mckenzie_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert/update (used by edge functions)
CREATE POLICY "Service role can manage mckenzie sessions"
  ON public.mckenzie_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);
