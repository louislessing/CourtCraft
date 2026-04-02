import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resources | CourtCraft Advocate',
  description: 'Free guides, templates, and FAQs for UK family court self-representation. Learn about McKenzie Friends, child arrangements, and family law.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/resources`,
  },
};

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}