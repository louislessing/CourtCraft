import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Asset Gallery | CourtCraft Admin',
  robots: { index: false, follow: false },
};

export default function AssetGalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
