import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Service Dashboard | CourtCraft Advocate',
  robots: { index: false, follow: false },
};

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
