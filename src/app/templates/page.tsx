'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackButton from '@/components/ui/BackButton';
import Icon from '@/components/ui/AppIcon';

const documentTemplates = [
  {
    id: 'position-statement',
    title: 'Position Statement',
    description: 'Set out your position on the issues before the court clearly and concisely. Used at every hearing to inform the judge of your case.',
    icon: 'DocumentTextIcon',
    category: 'Court Documents',
    pages: '3–5 pages',
    popular: true,
    downloadUrl: '/templates/position-statement.docx',
  },
  {
    id: 'chronology',
    title: 'Chronology of Events',
    description: 'A chronological account of all relevant events in your case. Essential for complex proceedings with a long history.',
    icon: 'ClockIcon',
    category: 'Court Documents',
    pages: '2–4 pages',
    popular: true,
    downloadUrl: '/templates/chronology.docx',
  },
  {
    id: 'witness-statement',
    title: 'Witness Statement',
    description: 'A formal statement of evidence with statement of truth. Required for most contested hearings in the family court.',
    icon: 'UserIcon',
    category: 'Court Documents',
    pages: '4–8 pages',
    popular: false,
    downloadUrl: '/templates/witness-statement.docx',
  },
  {
    id: 'evidence-bundle',
    title: 'Evidence Bundle Index',
    description: 'Organised index of all documentary evidence with tab references. Required under PD27A for all hearings.',
    icon: 'FolderOpenIcon',
    category: 'Evidence',
    pages: '1–2 pages',
    popular: false,
    downloadUrl: '/templates/evidence-bundle-index.docx',
  },
  {
    id: 'c100',
    title: 'C100 Application Guide',
    description: 'Step-by-step guidance for completing the C100 application for child arrangements, prohibited steps, or specific issue orders.',
    icon: 'DocumentCheckIcon',
    category: 'Court Forms',
    pages: 'Guidance Notes',
    popular: true,
    downloadUrl: '/templates/c100-guide.docx',
  },
  {
    id: 'c7',
    title: 'C7 Response Guide',
    description: 'Guidance for completing the C7 response to an application about a child. Includes tips on what to include.',
    icon: 'DocumentCheckIcon',
    category: 'Court Forms',
    pages: 'Guidance Notes',
    popular: false,
    downloadUrl: '/templates/c7-guide.docx',
  },
  {
    id: 'financial-statement',
    title: 'Form E Preparation Guide',
    description: 'Comprehensive guidance for completing the Form E financial statement for financial remedy proceedings.',
    icon: 'BanknotesIcon',
    category: 'Financial',
    pages: 'Guidance Notes',
    popular: false,
    downloadUrl: '/templates/form-e-guide.docx',
  },
  {
    id: 'scott-schedule',
    title: 'Scott Schedule',
    description: 'Schedule of allegations with responses for fact-finding hearings. Used in domestic abuse and serious allegation cases.',
    icon: 'TableCellsIcon',
    category: 'Specialist',
    pages: '2–6 pages',
    popular: false,
    downloadUrl: '/templates/scott-schedule.docx',
  },
  {
    id: 'skeleton-argument',
    title: 'Skeleton Argument',
    description: 'A concise summary of your legal arguments for the court. Required under PD27A for most substantive hearings.',
    icon: 'DocumentMagnifyingGlassIcon',
    category: 'Court Documents',
    pages: '2–4 pages',
    popular: false,
    downloadUrl: '/templates/skeleton-argument.docx',
  },
  {
    id: 'letter-before-action',
    title: 'Letter Before Action',
    description: 'A formal letter to the other party before making a court application. Demonstrates you attempted resolution first.',
    icon: 'EnvelopeIcon',
    category: 'Correspondence',
    pages: '1–2 pages',
    popular: false,
    downloadUrl: '/templates/letter-before-action.docx',
  },
];

const categories = ['All', 'Court Documents', 'Court Forms', 'Evidence', 'Financial', 'Specialist', 'Correspondence'];

export default function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = documentTemplates.filter((t) => {
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <Header />

      {/* Hero */}
      <section className="pt-24 sm:pt-28 lg:pt-32 pb-8 sm:pb-12 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 sm:mb-6">
            <BackButton />
          </div>

          {/* Free badge */}
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full mb-4 sm:mb-5"
            style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.4)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
            <span className="label-tag text-green-600 tracking-widest uppercase" style={{ fontSize: '9px' }}>
              100% Free — No Account Required
            </span>
          </div>

          <h1
            className="text-navy-900 font-display font-800 mb-3"
            style={{ fontSize: 'clamp(1.8rem, 6vw, 3.5rem)', lineHeight: '1.08', letterSpacing: '-0.03em' }}
          >
            Free Document<br className="hidden sm:block" />
            <span className="shimmer-gold"> Templates.</span>
          </h1>
          <p className="text-navy-700/70 text-sm sm:text-base leading-relaxed max-w-xl mb-6 sm:mb-8">
            Download professionally formatted court document templates for free. No account required. Register for AI-assisted completion and advanced features.
          </p>

          {/* Search + Filter */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="relative flex-1">
              <Icon name="MagnifyingGlassIcon" size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-400" />
              <input
                type="search"
                placeholder="Search templates..."
                className="input-light pl-11 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-700 transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-gray-900 text-white' :'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Templates grid */}
      <section className="pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filtered.map((template) => (
              <div
                key={template.id}
                className="rounded-2xl p-5 sm:p-6 flex flex-col gap-4 transition-all hover:shadow-lg"
                style={{ background: '#fafbfc', border: '1px solid rgba(26,53,96,0.12)', boxShadow: '0 2px 12px rgba(26,53,96,0.06)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <Icon name={template.icon as any} size={18} className="text-gray-600" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {template.popular && (
                      <span className="badge badge-gold text-xs">Popular</span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-xs font-600 bg-gray-100 text-navy-500">{template.category}</span>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="font-display font-700 text-navy-900 text-base leading-tight mb-2">{template.title}</h3>
                  <p className="text-xs text-navy-600 leading-relaxed">{template.description}</p>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
                  <span className="flex items-center gap-1.5 text-xs text-navy-400">
                    <Icon name="DocumentTextIcon" size={12} />
                    {template.pages}
                  </span>
                  <a
                    href={template.downloadUrl}
                    download
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-navy-900 text-white text-xs font-700 hover:bg-navy-800 transition-colors"
                  >
                    <Icon name="ArrowDownTrayIcon" size={13} />
                    Download Free
                  </a>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Icon name="DocumentTextIcon" size={40} className="text-navy-200 mx-auto mb-4" />
              <p className="text-navy-500 text-sm">No templates found for &quot;{searchQuery}&quot;</p>
              <button onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }} className="mt-3 text-gold-600 text-sm font-700 hover:text-gold-700">
                Clear search
              </button>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-navy-900">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-8 h-px bg-gold-500 mx-auto mb-4" />
          <h2 className="font-display font-800 text-white mb-3" style={{ fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', lineHeight: '1.1' }}>
            Want AI-Assisted Completion?
          </h2>
          <p className="text-white/60 text-sm sm:text-base leading-relaxed mb-6 max-w-xl mx-auto">
            Register for a CourtCraft Advocate account to unlock AI-powered document completion, case-specific suggestions, and 50+ advanced templates.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="btn-gold text-sm py-4 px-8 justify-center">
              <Icon name="ShieldCheckIcon" size={18} className="text-navy-900" />
              Register Now
            </Link>
            <Link href="/about" className="btn-outline text-sm py-4 px-8 justify-center text-white border-white/20 hover:border-gold-500 hover:text-gold-400">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
