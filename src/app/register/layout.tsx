import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register | CourtCraft Advocate',
  description: 'Create your CourtCraft Advocate account. Get instant access to AI legal guidance and 50+ court-ready document tools.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/register`,
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}