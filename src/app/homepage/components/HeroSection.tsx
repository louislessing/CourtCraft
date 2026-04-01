'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

const HeroSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = sectionRef.current?.querySelectorAll('.reveal-hidden, .reveal-left, .reveal-right');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative min-h-screen flex flex-col overflow-hidden bg-white">
      {/* Background image — subtle */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <AppImage
          src="https://img.rocket.new/generatedImages/rocket_gen_img_19520afc1-1772540978607.png"
          alt="UK court building with classical columns and British justice architecture"
          fill
          priority
          className="object-cover object-center opacity-[0.06]"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-white via-white/95 to-white/80" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 60% 50% at 70% 50%, rgba(201,168,76,0.07), transparent)' }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 lg:pt-28 pb-10 sm:pb-14 lg:pb-16">

          {/* Label pill */}
          <div className="reveal-hidden mb-4 sm:mb-5 lg:mb-6 inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full w-fit"
            style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.55)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-gold-500 flex-shrink-0" />
            <span className="label-tag text-gold-600 tracking-widest uppercase" style={{ fontSize: '9px' }}>
              UK Family Court Self-Advocacy Platform
            </span>
          </div>

          {/* Hero headline */}
          <h1 className="reveal-hidden stagger-1 text-navy-900 font-display font-800 mb-3 sm:mb-4"
            style={{ fontSize: 'clamp(2rem, 9vw, 4.8rem)', lineHeight: '1.04', letterSpacing: '-0.03em' }}>
            Your Court.<br />
            Your{' '}
            <span className="shimmer-gold">Voice.</span>{' '}
            Your Rights.
          </h1>

          {/* Tagline */}
          <p className="reveal-hidden stagger-2 font-display font-600 text-gold-600 text-xs sm:text-sm tracking-widest uppercase mb-4 sm:mb-5 lg:mb-6">
            Prepare. Represent. Prevail.™
          </p>

          {/* Subheadline — condensed on mobile */}
          <div className="reveal-hidden stagger-3 text-navy-700/70 text-sm sm:text-base leading-relaxed max-w-2xl mb-6 sm:mb-7 lg:mb-8 space-y-2 sm:space-y-3">
            <p>
              Everything a solicitor would give you — at a fraction of the cost. AI-powered guidance, court-ready documents, and McKenzie Friend support so you walk into every hearing informed, prepared, and confident.
            </p>
            <p className="hidden sm:block">
              CourtCraft Advocate is a comprehensive self-advocacy platform built specifically for parents and individuals navigating UK family court proceedings without legal representation.
            </p>
            <p className="hidden md:block">
              As a member you get instant access to 50+ court-ready document templates, an AI legal assistant trained on UK family law, a court filing tracker to manage deadlines, a case management dashboard, and the ability to book a real McKenzie Friend — all for less than the cost of a single hour with a solicitor.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="reveal-hidden stagger-4 flex flex-col xs:flex-row gap-3 mb-6 sm:mb-7 lg:mb-8">
            <Link href="/register" className="btn-gold text-sm py-4 px-8 w-full xs:w-auto justify-center">
              <Icon name="ShieldCheckIcon" size={18} className="text-navy-900" />
              Register Now
            </Link>
            <Link href="/about" className="btn-outline text-sm py-4 px-8 w-full xs:w-auto justify-center">
              <Icon name="PlayIcon" size={18} />
              Learn More
            </Link>
          </div>

          {/* Trust badges */}
          <div className="reveal-hidden stagger-5 flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4 sm:gap-y-2.5">
            {[
              { icon: 'ShieldCheckIcon', text: 'GDPR Compliant' },
              { icon: 'LockClosedIcon', text: 'AES-256 Encrypted' },
              { icon: 'DocumentTextIcon', text: '50+ Templates' },
              { icon: 'GlobeAltIcon', text: 'UK · USA · AUS · CA · NZ · IE' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-1.5">
                <Icon name={item.icon as any} size={12} className="text-gold-500 flex-shrink-0" />
                <span className="label-tag text-navy-700/50" style={{ fontSize: '9px' }}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Video embed */}
          <div className="reveal-hidden stagger-5 mt-8 sm:mt-10 w-full max-w-3xl">
            <div className="relative w-full rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-gold-200"
              style={{ paddingBottom: '56.25%' }}>
              <iframe
                src="https://www.youtube.com/embed/DEpmpjI92hU?loop=1&playlist=DEpmpjI92hU&rel=0&modestbranding=1&controls=1"
                title="CourtCraft Advocate — See How It Works"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
                style={{ border: 0 }}
              />
            </div>
            <p className="mt-2 sm:mt-3 text-center text-xs text-navy-700/50 tracking-wide uppercase" style={{ fontSize: '10px' }}>
              Watch how CourtCraft Advocate helps you prepare, represent, and prevail
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;