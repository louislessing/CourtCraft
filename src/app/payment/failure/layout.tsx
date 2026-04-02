import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payment Failed | CourtCraft Advocate',
  description: 'Your payment could not be processed. Please try again or contact support.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/payment/failure`,
  },
};

export default function PaymentFailureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}