import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Payment Successful | CourtCraft Advocate',
  description: 'Your payment has been processed successfully. Welcome to CourtCraft Advocate!',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/payment/success`,
  },
};

export default function PaymentSuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}