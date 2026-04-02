import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profile | CourtCraft Advocate',
  description: 'Manage your CourtCraft Advocate profile. Update your personal information and account settings.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/profile`,
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}