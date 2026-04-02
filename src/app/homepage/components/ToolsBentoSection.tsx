'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

const tools = [
  {
    id: 'ai-assistant',
    title: 'AI Legal Assistant',
    description: 'Instant guidance on UK family law, court procedures, and your rights — available 24/7.',
    icon: 'SparklesIcon',
    accent: 'text-gold-400',
    bg: 'rgba(201,168,76,0.08)',
    border: 'rgba(201,168,76,0.35)',
    featured: true,
  },
  {
    id: 'document-builder',
    title: 'AI Court Report Builder',
    description: 'Generate court-ready position statements, chronologies, and evidence bundles as PDFs.',
    icon: 'DocumentTextIcon',
    accent: 'text-blue-400',
    bg: 'rgba(59,130,246,0.06)',
    border: 'rgba(59,130,246,0.25)',
  },
  {
    id: 'contact-tracker',
    title: 'Child Contact Tracker',
    description: 'Log every pickup, dropoff, and interaction. Export as court evidence.',
    icon: 'UserGroupIcon',
    accent: 'text-green-400',
    bg: 'rgba(34,197,94,0.06)',
    border: 'rgba(34,197,94,0.25)',
  },
  {
    id: 'court-filing',
    title: 'Court Filing Tracker',
    description: 'Track deadlines, hearing dates, and filing requirements so nothing slips through.',
    icon: 'CalendarDaysIcon',
    accent: 'text-orange-400',
    bg: 'rgba(251,146,60,0.06)',
    border: 'rgba(251,146,60,0.25)',
  },
  {
    id: 'resources',
    title: 'Legal Resources Library',
    description: '50+ professional document templates, guides, and FAQs for family court proceedings.',
    icon: 'BookOpenIcon',
    accent: 'text-teal-400',
    bg: 'rgba(45,212,191,0.06)',
    border: 'rgba(45,212,191,0.25)',
  },
  {
    id: 'mckenzie',
    title: 'McKenzie Friend Support',
    description: 'Book a real McKenzie Friend for in-person or remote hearing support.',
    icon: 'ShieldCheckIcon',
    accent: 'text-gold-400',
    bg: 'rgba(201,168,76,0.06)',
    border: 'rgba(201,168,76,0.25)',
  },
  {
    id: 'finance-tracker',
    title: 'Finance Tracker',
    description: 'Track child maintenance payments and expenses. Generate financial summaries.',
    icon: 'BanknotesIcon',
    accent: 'text-emerald-400',
    bg: 'rgba(52,211,153,0.06)',
    border: 'rgba(52,211,153,0.25)',
  },
  {
    id: 'comm-logger',
    title: 'Communication Logger',
    description: 'Record all communications with your ex-partner and flag concerning messages for court.',
    icon: 'ChatBubbleLeftRightIcon',
    accent: 'text-purple-400',
    bg: 'rgba(167,139,250,0.06)',
    border: 'rgba(167,139,250,0.25)',
  },
  {
    id: 'doc-storage',
    title: 'Secure Document Storage',
    description: 'Upload and organise court orders, correspondence, and evidence. AES-256 encrypted.',
    icon: 'FolderOpenIcon',
    accent: 'text-cyan-400',
    bg: 'rgba(34,211,238,0.06)',
    border: 'rgba(34,211,238,0.25)',
  },
];

const ToolsBentoSection: React.FC = () => {
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
      { threshold: 0.05 }
    );

    const elements = sectionRef.current?.querySelectorAll('.reveal-hidden');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const [featured, ...rest] = tools;

  return (
    <section ref={sectionRef} id="features" className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="reveal-hidden grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-16 items-end mb-10 sm:mb-14">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-px bg-gold-500" />
              <span className="label-tag text-gold-600">Everything Included</span>
            </div>
            <h2 className="section-title text-navy-900 leading-tight">
              Every Tool You Need.<br />
              <span className="text-gold-gradient">Nothing You Don't.</span>
            </h2>
          </div>
          <div className="flex flex-col gap-4 lg:items-end lg:text-right">
            <p className="text-navy-600 text-sm sm:text-base leading-relaxed max-w-sm">
              Professional-grade tools designed specifically for parents navigating family court proceedings.
            </p>
            <Link href="/register" className="btn-gold text-sm py-3 px-7 w-fit">
              <Icon name="LockOpenIcon" size={16} className="text-navy-900" />
              Unlock Full Access
            </Link>
          </div>
        </div>

        {/* Featured tool — full width */}
        <div
          className="reveal-hidden mb-6 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8"
          style={{ background: `linear-gradient(135deg, rgba(201,168,76,0.10), #f5f6f8)`, border: '1px solid rgba(201,168,76,0.55)', boxShadow: '0 4px 24px rgba(201,168,76,0.12)' }}
        >
          <div className="w-14 h-14 rounded-2xl bg-gold-100 flex items-center justify-center text-gold-400 flex-shrink-0">
            <Icon name={featured.icon as any} size={28} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-800 text-navy-900 text-lg sm:text-xl">{featured.title}</h3>
              <span className="badge badge-gold text-xs">Featured</span>
            </div>
            <p className="text-sm text-navy-600 leading-relaxed">{featured.description}</p>
          </div>
          <Link href="/register" className="btn-gold text-sm py-3 px-7 flex-shrink-0 w-full sm:w-auto justify-center">
            <Icon name="SparklesIcon" size={16} className="text-navy-900" />
            Get Started
          </Link>
        </div>

        {/* Tool grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {rest.map((tool, i) => (
            <div
              key={tool.id}
              className={`reveal-hidden stagger-${(i % 4) + 1} rounded-2xl p-5 flex flex-col gap-3`}
              style={{ background: '#fafbfc', border: '1px solid rgba(26,53,96,0.12)', boxShadow: '0 2px 12px rgba(26,53,96,0.06)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: tool.bg, border: `1px solid ${tool.border}` }}
              >
                <Icon name={tool.icon as any} size={18} className={tool.accent} />
              </div>
              <div>
                <h3 className="font-display font-700 text-navy-900 text-sm leading-tight mb-1">{tool.title}</h3>
                <p className="text-xs text-navy-600 leading-relaxed">{tool.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Free Templates callout */}
        <div className="reveal-hidden mt-6 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-4 justify-between" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(201,168,76,0.08))', border: '1px solid rgba(34,197,94,0.3)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <Icon name="DocumentArrowDownIcon" size={20} className="text-green-600" />
            </div>
            <div>
              <p className="font-display font-700 text-navy-900 text-sm">50+ Document Templates — Completely Free</p>
              <p className="text-xs text-navy-600">Download position statements, chronologies, witness statements and more — no account required.</p>
            </div>
          </div>
          <Link href="/templates" className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-xs font-700 hover:bg-green-700 transition-colors w-full sm:w-auto justify-center">
            <Icon name="ArrowDownTrayIcon" size={14} />
            Download Free Templates
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ToolsBentoSection;