'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import NavigationExpertWidget from '@/components/NavigationExpertWidget';

const PricingSection = dynamic(() => import('./PricingSection'));
const Footer = dynamic(() => import('@/components/Footer'));

export default function HomepageSections() {
  return (
    <Suspense fallback={null}>
      <PricingSection />
      <Footer />
      <NavigationExpertWidget />
    </Suspense>
  );
}
