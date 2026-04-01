import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | CourtCraft Advocate',
  description: 'Manage your CourtCraft Advocate account settings. Update preferences, notifications, and security options.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/settings`,
  },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}