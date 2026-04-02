import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Document Builder | CourtCraft Advocate',
  description: 'Build court-ready legal documents with AI assistance. Create witness statements, position statements, and more.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/document-builder`,
  },
};

export default function DocumentBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}