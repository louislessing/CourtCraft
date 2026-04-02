import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Subscription | CourtCraft Advocate',
  description: 'Manage your CourtCraft Advocate subscription. View billing, upgrade, or cancel your plan.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/subscription`,
  },
};

export default function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}