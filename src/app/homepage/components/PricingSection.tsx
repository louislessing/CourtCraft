'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

const currencyMap: Record<string, { symbol: string; monthly: number; annual: number; name: string }> = {
  GB: { symbol: '£', monthly: 35, annual: 249, name: 'GBP' },
  US: { symbol: '$', monthly: 32, annual: 319, name: 'USD' },
  CA: { symbol: 'C$', monthly: 44, annual: 439, name: 'CAD' },
  AU: { symbol: 'A$', monthly: 49, annual: 489, name: 'AUD' },
  NZ: { symbol: 'NZ$', monthly: 54, annual: 539, name: 'NZD' },
  IE: { symbol: '€', monthly: 30, annual: 299, name: 'EUR' },
};

const features = [
  'AI Legal Assistant (24/7)',
  'AI-Assisted Court Report Builder',
  'Child Contact Tracker',
  'Finance Tracker',
  'Communication Logger',
  'Custody Calendar',
  'Secure Document Storage (5GB)',
  'McKenzie Friend Support Guidance',
  '50+ Professional Document Templates',
  'Case Timeline Builder',
  'Analytics Dashboard',
  'Legal Resources Library',
  'GDPR Compliant — AES-256 Encryption',
  'Cancel Anytime',
];

const PricingSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [currency, setCurrency] = useState<string>('GB');

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes('America')) setCurrency('US');
    else if (tz.includes('Toronto') || tz.includes('Vancouver')) setCurrency('CA');
    else if (tz.includes('Sydney') || tz.includes('Melbourne')) setCurrency('AU');
    else if (tz.includes('Auckland')) setCurrency('NZ');
    else if (tz.includes('Dublin')) setCurrency('IE');
    else setCurrency('GB');
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('revealed');
        });
      },
      { threshold: 0.1 }
    );

    const elements = sectionRef.current?.querySelectorAll('.reveal-hidden');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const curr = currencyMap[currency];

  return (
    <section ref={sectionRef} id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="reveal-hidden text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-8 h-px bg-gold-500" />
            <span className="label-tag text-gold-600">Transparent Pricing</span>
            <div className="w-8 h-px bg-gold-500" />
          </div>
          <h2 className="section-title text-navy-900 mb-3">
            Less Than One Hour<br />
            <span className="text-gold-gradient">With a Solicitor.</span>
          </h2>
          <p className="text-navy-600 text-sm sm:text-base max-w-xl mx-auto mb-4">
            Everything a solicitor would give you — at a fraction of the cost.
          </p>
          <div className="inline-flex flex-col xs:flex-row items-center gap-3 xs:gap-0 px-4 sm:px-5 py-3 sm:py-3 rounded-2xl bg-navy-900 border border-gold-500/30 w-full xs:w-auto max-w-xs xs:max-w-none mx-auto">
            <div className="flex flex-col items-center px-3 sm:px-4">
              <span className="text-xs text-white/40 font-display font-600 uppercase tracking-widest" style={{ fontSize: '9px' }}>Solicitor</span>
              <span className="font-display font-900 text-red-400 text-xl leading-tight">£300–£400<span className="text-sm font-600">/hr</span></span>
            </div>
            <div className="hidden xs:block w-px h-8 bg-white/20" />
            <div className="xs:hidden w-full h-px bg-white/20" />
            <div className="flex flex-col items-center px-3 sm:px-4">
              <span className="text-xs text-white/40 font-display font-600 uppercase tracking-widest" style={{ fontSize: '9px' }}>CourtCraft</span>
              <span className="font-display font-900 text-gold-400 text-xl leading-tight">£35<span className="text-sm font-600">/month</span></span>
            </div>
            <div className="hidden xs:block w-px h-8 bg-white/20" />
            <div className="xs:hidden w-full h-px bg-white/20" />
            <div className="flex flex-col items-center px-3 sm:px-4">
              <span className="text-xs text-white/40 font-display font-600 uppercase tracking-widest" style={{ fontSize: '9px' }}>You Save</span>
              <span className="font-display font-900 text-green-400 text-xl leading-tight">~90%</span>
            </div>
          </div>
        </div>

        {/* Currency selector */}
        <div className="reveal-hidden flex items-center justify-center gap-2 flex-wrap mb-8">
          <Icon name="GlobeAltIcon" size={14} className="text-gold-500" />
          <span className="label-tag text-navy-500 text-xs">Currency:</span>
          {Object.entries(currencyMap).map(([code, c]) => (
            <button
              key={code}
              onClick={() => setCurrency(code)}
              className={`px-2.5 py-1.5 rounded-full text-xs font-display font-700 transition-all min-h-[36px] ${
                currency === code ? 'bg-gold-500 text-navy-900' : 'text-navy-500 hover:text-navy-900'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Main pricing card */}
        <div className="reveal-hidden pricing-card featured mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 lg:gap-10">
            {/* Left: price + CTA */}
            <div className="flex flex-col gap-4 sm:gap-5">
              <div>
                <span className="badge badge-gold mb-3 sm:mb-4">Everything Included</span>
                <div className="flex items-end gap-2 mb-2">
                  <span className="font-display font-900 text-5xl sm:text-6xl md:text-7xl text-gold-400 leading-none">
                    {curr.symbol}{curr.monthly}
                  </span>
                  <span className="text-white/40 text-lg mb-2 font-display font-600">/month</span>
                </div>
              </div>

              <div className="divider-gold" />

              <p className="text-white/60 text-sm leading-relaxed">
                Full access to every CourtCraft Advocate™ tool. No hidden fees, no per-document charges. One flat price for everything.
              </p>

              <div className="flex flex-col gap-3">
                <Link href="/register" className="btn-gold text-sm py-4 justify-center w-full">
                  <Icon name="ShieldCheckIcon" size={18} className="text-navy-900" />
                  Register Now
                </Link>
              </div>
            </div>

            {/* Right: features */}
            <div>
              <p className="label-tag text-gold-500 mb-3 sm:mb-4">What's included:</p>
              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-1 gap-1.5 sm:gap-2">
                {features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-gold-500/15 flex items-center justify-center flex-shrink-0">
                      <Icon name="CheckIcon" size={11} className="text-gold-400" />
                    </div>
                    <span className="text-sm text-white/70">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;