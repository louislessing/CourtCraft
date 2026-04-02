-- Add onboarding_completed flag to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Add onboarding_case_type to store the selected case type during onboarding
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_case_type text;
