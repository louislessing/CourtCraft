'use client';

import React, { useEffect, useRef } from 'react';
import Icon from '@/components/ui/AppIcon';

const steps = [
  {
    number: '01',
    title: 'Sign Up',
    description: 'Create your account in minutes and get instant access to every tool.',
    icon: 'UserPlusIcon',
    color: 'text-gold-600',
    bg: 'rgba(201,168,76,0.12)',
    border: 'rgba(201,168,76,0.55)',
    numColor: '#A8832A',
    detail: 'Takes less than 2 minutes',
  },
  {
    number: '02',
    title: 'Get Guidance',
    description: 'Ask our AI chatbot anything about UK family law, court procedures, or your rights as a litigant in person.',
    icon: 'SparklesIcon',
    color: 'text-blue-400',
    bg: 'rgba(59,130,246,0.10)',
    border: 'rgba(59,130,246,0.35)',
    numColor: '#3B82F6',
    detail: 'Available 24/7',
  },
  {
    number: '03',
    title: 'Prepare Documents',
    description: 'Use the AI-powered document builder to create court-ready position statements, chronologies, and evidence bundles.',
    icon: 'DocumentTextIcon',
    color: 'text-purple-400',
    bg: 'rgba(167,139,250,0.10)',
    border: 'rgba(167,139,250,0.35)',
    numColor: '#A78BFA',
    detail: '50+ templates included',
  },
  {
    number: '04',
    title: 'Attend Court',
    description: 'Walk into court confident and fully prepared. Track contact, log communications, and manage your case from one dashboard.',
    icon: 'BuildingLibraryIcon',
    color: 'text-green-400',
    bg: 'rgba(34,197,94,0.10)',
    border: 'rgba(34,197,94,0.35)',
    numColor: '#22C55E',
    detail: 'Never face court alone',
  },
];

const HowItWorksSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

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
    <section ref={sectionRef} id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="reveal-hidden mb-10 sm:mb-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px bg-gold-500" />
            <span className="label-tag text-gold-600">Simple Process</span>
          </div>
          <h2 className="section-title text-navy-900 leading-tight">
            Four Steps to{' '}
            <span className="text-gold-gradient">Court Confidence</span>
          </h2>
        </div>

        {/* Step cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`reveal-hidden stagger-${i + 1} relative rounded-2xl p-6 flex flex-col gap-4 overflow-hidden`}
              style={{
                background: '#fafbfc',
                border: '1px solid rgba(26,53,96,0.14)',
                boxShadow: '0 4px 20px rgba(26,53,96,0.08)',
              }}
            >
              {/* Watermark number */}
              <div
                className="absolute -bottom-3 -right-2 font-display font-900 leading-none select-none pointer-events-none"
                style={{ fontSize: '7rem', color: step.numColor, opacity: 0.06 }}
              >
                {step.number}
              </div>

              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: step.bg, border: `1px solid ${step.border}` }}
              >
                <Icon name={step.icon as any} size={20} className={step.color} />
              </div>

              {/* Step label */}
              <div className="flex items-center gap-2">
                <span className="font-display font-900 text-xs" style={{ color: step.numColor }}>STEP {step.number}</span>
                <div className="h-px flex-1" style={{ background: step.numColor, opacity: 0.25 }} />
              </div>

              {/* Content */}
              <div className="flex flex-col gap-2 flex-1">
                <h3 className="font-display font-700 text-navy-900 text-lg leading-tight">{step.title}</h3>
                <p className="text-sm text-navy-600 leading-relaxed">{step.description}</p>
              </div>

              {/* Detail badge */}
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full w-fit mt-auto"
                style={{ background: step.bg, border: `1px solid ${step.border}` }}
              >
                <Icon name="CheckCircleIcon" size={12} className={step.color} />
                <span className="text-xs font-display font-600" style={{ color: step.numColor }}>{step.detail}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;