import React from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import HeroSection from './components/HeroSection';
import HomepageSections from './components/HomepageSections';
import ContactBubble from '@/components/ContactBubble';

export const metadata: Metadata = {
  title: 'CourtCraft Advocate — Take Control of Your Legal Journey',
  description: 'Professional McKenzie Friend support tools for UK family court self-representation. AI legal assistant, document builder & case management for £35/month.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/homepage`,
  },
  openGraph: {
    title: 'CourtCraft Advocate — Legal Self-Advocacy Platform',
    description: 'Prepare. Represent. Prevail.™ Professional family court tools for £35/month.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/homepage`,
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
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <Header />
      <HeroSection />
      <HomepageSections />
      <ContactBubble />
    </main>
  );
}