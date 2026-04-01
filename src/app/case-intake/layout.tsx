import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Case Intake | CourtCraft Advocate',
  description: 'Start a new case in CourtCraft Advocate. Provide case details and get AI-powered guidance for your family court proceedings.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/case-intake`,
  },
};

export default function CaseIntakeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}