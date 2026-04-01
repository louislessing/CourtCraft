import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Court Filing Tracker | CourtCraft Advocate',
  description: 'Track your court filings and deadlines. Stay organized with automated reminders and filing status updates.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/court-filing-tracker`,
  },
};

export default function CourtFilingTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}