-- Fix trial_end to be exactly 7 days from auth.users.created_at
-- This corrects cases where trial_end was set from the subscription upsert time
-- instead of the user's actual account creation date.

UPDATE public.subscriptions s
SET
  trial_end = (
    SELECT au.created_at + INTERVAL '7 days'
    FROM auth.users au
    WHERE au.id = s.user_id
  ),
  current_period_end = (
    SELECT au.created_at + INTERVAL '7 days'
    FROM auth.users au
    WHERE au.id = s.user_id
  ),
  updated_at = NOW()
WHERE s.status = 'trialing'
  AND EXISTS (
    SELECT 1 FROM auth.users au WHERE au.id = s.user_id
  );
