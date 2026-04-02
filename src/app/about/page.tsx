import React from 'react';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import BackButton from '@/components/ui/BackButton';
import HowItWorksSection from '@/app/homepage/components/HowItWorksSection';
import ToolsBentoSection from '@/app/homepage/components/ToolsBentoSection';
import McKenzieFriendSection from '@/app/homepage/components/McKenzieFriendSection';
import FAQSection from '@/app/homepage/components/FAQSection';
import DisclaimerSection from '@/app/homepage/components/DisclaimerSection';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'About CourtCraft Advocate — Tools, Process & Support',
  description: 'Discover how CourtCraft Advocate works, every tool included in your membership, McKenzie Friend support, FAQs, and our legal service scope.',
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/about`,
  },
  openGraph: {
    title: 'About CourtCraft Advocate — Tools, Process & Support',
    description: 'Everything you need to know about CourtCraft Advocate — how it works, what tools are included, and how we support you in court.',
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/about`,
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

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <Header />

      {/* Page intro */}
      <section className="pt-24 sm:pt-28 lg:pt-32 pb-6 sm:pb-10 lg:pb-12 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 sm:mb-6">
            <BackButton />
          </div>
          <div className="flex items-center gap-3 mb-3 sm:mb-4">
            <div className="w-8 h-px bg-gold-500" />
            <span className="label-tag text-gold-600 tracking-widest uppercase" style={{ fontSize: '9px' }}>
              Everything You Need to Know
            </span>
          </div>
          <h1
            className="text-navy-900 font-display font-800 mb-3"
            style={{ fontSize: 'clamp(1.8rem, 6vw, 3.5rem)', lineHeight: '1.08', letterSpacing: '-0.03em' }}
          >
            How CourtCraft Advocate<br className="hidden sm:block" />
            <span className="shimmer-gold"> Works for You.</span>
          </h1>
          <p className="text-navy-700/70 text-sm sm:text-base leading-relaxed max-w-xl">
            From signing up to walking into court prepared — explore every tool, understand the process, and get answers to the most common questions.
          </p>
        </div>
      </section>

      <HowItWorksSection />
      <ToolsBentoSection />
      <McKenzieFriendSection />
      <FAQSection />
      <DisclaimerSection />
      <Footer />
    </main>
  );
}
