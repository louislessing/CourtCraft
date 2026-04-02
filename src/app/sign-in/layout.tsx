import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In | CourtCraft Advocate',
  description: 'Sign in to your CourtCraft Advocate account. Access your AI legal assistant, case management tools, and document builder.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/sign-in`,
  },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}