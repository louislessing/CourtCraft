import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free Document Templates | CourtCraft Advocate',
  description: 'Download 50+ free UK family court document templates — position statements, chronologies, witness statements, and more. No sign-up required.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/templates`,
  },
};

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
