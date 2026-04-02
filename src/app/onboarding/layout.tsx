import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Getting Started | CourtCraft Advocate',
  description: 'Set up your CourtCraft account and personalise your experience',
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
