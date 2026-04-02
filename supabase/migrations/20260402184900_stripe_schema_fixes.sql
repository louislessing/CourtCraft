-- ============================================================
-- Stripe Schema Fixes
-- 1. Add 'canceling' value to subscription_status enum
-- 2. Add 'plan' column to subscriptions table
-- ============================================================

-- Ensure subscription_status enum exists (create if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type
    WHERE typname = 'subscription_status'
      AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'incomplete');
  END IF;
END;
$$;

-- Add 'canceling' to subscription_status enum if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'canceling'
      AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'subscription_status' AND typnamespace = (
          SELECT oid FROM pg_namespace WHERE nspname = 'public'
        )
      )
  ) THEN
    ALTER TYPE public.subscription_status ADD VALUE 'canceling';
  END IF;
END;
$$;

-- Add 'plan' column to subscriptions if it doesn't exist
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'monthly';
