import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Case Management | CourtCraft Advocate',
  description: 'Organize and manage your family court cases. Track dates, evidence, contacts, and communications in one secure platform.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/case-management`,
  },
};

export default function CaseManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}