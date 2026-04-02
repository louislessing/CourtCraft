import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import '../styles/tailwind.css';
import { AuthProvider } from '@/contexts/AuthContext';
import GoogleAnalytics from '@/components/GoogleAnalytics';
import TrialCountdownBanner from '@/components/TrialCountdownBanner';
import SuppressAuthErrors from '@/components/SuppressAuthErrors';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'CourtCraft Advocate — Take Control of Your Legal Journey',
  description: 'Professional McKenzie Friend support tools for UK family court self-representation. AI legal assistant, document builder & case management for £35/month.',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' }
    ],
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },
  openGraph: {
    title: 'CourtCraft Advocate — Legal Self-Advocacy Platform',
    description: 'Prepare. Represent. Prevail.™ Professional family court tools for £35/month.',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    type: 'website',
    images: [
      {
        url: '/assets/images/app_logo.png',
        width: 1200,
        height: 630,
        alt: 'CourtCraft Advocate — AI-powered legal guidance platform for UK family court self-representation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CourtCraft Advocate — Legal Self-Advocacy Platform',
    description: 'Prepare. Represent. Prevail.™ Professional family court tools for £35/month.',
    images: ['/assets/images/app_logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
    : null;

  return (
    <html lang="en">
      <head>
        {/* Preconnect to critical third-party origins to reduce DNS + TLS handshake latency */}
        {supabaseHost && <link rel="preconnect" href={`https://${supabaseHost}`} />}
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="dns-prefetch" href="https://img.rocket.new" />
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'CourtCraft Advocate',
              url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
              logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/assets/images/app_logo.png`,
              description: 'Professional McKenzie Friend support tools for UK family court self-representation',
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'Customer Support',
                email: 'support@courtcraftadvocate.com',
              },
              sameAs: [
                'https://twitter.com',
                'https://linkedin.com',
              ],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'CourtCraft Advocate',
              url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
              applicationCategory: 'LegalApplication',
              description: 'AI-powered legal guidance platform for UK family court self-representation',
              offers: {
                '@type': 'Offer',
                price: '35',
                priceCurrency: 'GBP',
                description: 'Monthly subscription',
              },
            }),
          }}
        />

        <script type="module" async src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fcourtcraft5759back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.17" />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" /></head>
      <body>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <AuthProvider>
          <SuppressAuthErrors />
          <TrialCountdownBanner />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}