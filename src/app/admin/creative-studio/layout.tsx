import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Creative Studio | CourtCraft Admin',
  robots: { index: false, follow: false },
};

export default function CreativeStudioLayout({ children }: { children: React.ReactNode }) {
  return children;
}
