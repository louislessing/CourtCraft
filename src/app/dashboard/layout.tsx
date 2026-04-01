import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | CourtCraft Advocate',
  description: 'Access your AI legal assistant, case management, document builder, and secure vault. Manage your family court proceedings.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/dashboard`,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}