'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';

interface CaseType {
  id: string;
  label: string;
  description: string;
  icon: string;
  tools: string[];
}

const CASE_TYPES: CaseType[] = [
  {
    id: 'Child Arrangements',
    label: 'Child Arrangements',
    description: 'Disputes about where children live, contact schedules, and parental responsibility',
    icon: 'UserGroupIcon',
    tools: ['AI Legal Assistant', 'Case Management', 'Document Builder', 'Court Filing Tracker'],
  },
  {
    id: 'Financial Remedy',
    label: 'Financial Remedy',
    description: 'Division of assets, maintenance, pension sharing, and financial settlements',
    icon: 'BanknotesIcon',
    tools: ['AI Legal Assistant', 'Document Builder', 'Case Management', 'Templates'],
  },
  {
    id: 'Domestic Abuse',
    label: 'Domestic Abuse & Protection',
    description: 'Non-molestation orders, occupation orders, and protective injunctions',
    icon: 'ShieldCheckIcon',
    tools: ['AI Legal Assistant', 'Document Builder', 'Court Filing Tracker', 'McKenzie Friend'],
  },
  {
    id: 'Divorce',
    label: 'Divorce Proceedings',
    description: 'Divorce applications, decree nisi/absolute, and ancillary relief',
    icon: 'DocumentTextIcon',
    tools: ['AI Legal Assistant', 'Document Builder', 'Templates', 'Case Management'],
  },
  {
    id: 'Other',
    label: 'Other Family Matter',
    description: 'Adoption, special guardianship, care proceedings, or other family law issues',
    icon: 'ScaleIcon',
    tools: ['AI Legal Assistant', 'Document Builder', 'Templates', 'Case Management'],
  },
];

interface Tool {
  name: string;
  description: string;
  icon: string;
  href: string;
  highlight?: boolean;
}

const ALL_TOOLS: Tool[] = [
  {
    name: 'AI Legal Assistant',
    description: 'Get expert UK family law guidance, draft documents, and analyse your case 24/7',
    icon: 'SparklesIcon',
    href: '/dashboard',
    highlight: true,
  },
  {
    name: 'Case Management',
    description: 'Organise your case timeline, evidence, communications, and key dates',
    icon: 'FolderOpenIcon',
    href: '/case-management',
  },
  {
    name: 'Document Builder',
    description: 'Create court-ready witness statements, position statements, and applications',
    icon: 'DocumentTextIcon',
    href: '/document-builder',
  },
  {
    name: 'Court Filing Tracker',
    description: 'Track all your court submissions, hearing dates, and response deadlines',
    icon: 'ClipboardDocumentListIcon',
    href: '/court-filing-tracker',
  },
  {
    name: 'Templates Library',
    description: 'Access professionally drafted legal templates tailored for litigants in person',
    icon: 'RectangleStackIcon',
    href: '/templates',
  },
  {
    name: 'McKenzie Friend Sessions',
    description: 'Book one-to-one support sessions with an experienced McKenzie Friend',
    icon: 'UserCircleIcon',
    href: '/dashboard',
  },
];

const QUICK_START_ACTIONS = [
  {
    label: 'Ask the AI a question about your case',
    description: 'Start with your most pressing legal question',
    icon: 'SparklesIcon',
    href: '/dashboard',
    cta: 'Open AI Assistant',
  },
  {
    label: 'Set up your case details',
    description: 'Add your case number, court, and key parties',
    icon: 'FolderOpenIcon',
    href: '/case-management',
    cta: 'Go to Case Management',
  },
  {
    label: 'Build your first document',
    description: 'Draft a position statement or witness statement',
    icon: 'DocumentTextIcon',
    href: '/document-builder',
    cta: 'Open Document Builder',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [selectedCaseType, setSelectedCaseType] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const firstName = profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  // Redirect if already onboarded
  useEffect(() => {
    if (profile && profile.onboarding_completed) {
      router.replace('/dashboard');
    }
  }, [profile, router]);

  const handleCaseTypeNext = () => {
    if (!selectedCaseType) return;
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToolsNext = () => {
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleComplete = async (href: string) => {
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          onboarding_completed: true,
          onboarding_case_type: selectedCaseType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;
      router.push(href);
    } catch (err: any) {
      setError('Could not save your preferences. Please try again.');
      setSaving(false);
    }
  };

  const selectedCaseData = CASE_TYPES.find((c) => c.id === selectedCaseType);
  const recommendedTools = selectedCaseData
    ? ALL_TOOLS.filter((t) => selectedCaseData.tools.includes(t.name))
    : ALL_TOOLS.slice(0, 4);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <AppLogo size={32} iconName="ScaleIcon" />
          <span className="font-display font-900 text-xl text-gray-900">
            Court<span className="text-gold-400">Craft</span>
          </span>
        </div>
        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-700 transition-all duration-300 ${
                  s < step
                    ? 'bg-green-500 text-white'
                    : s === step
                    ? 'bg-gold-500 text-white' :'bg-gray-200 text-gray-500'
                }`}
              >
                {s < step ? <Icon name="CheckIcon" size={12} /> : s}
              </div>
              {s < 3 && (
                <div className={`w-8 h-px transition-all duration-300 ${s < step ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-10 max-w-3xl mx-auto w-full">
        {/* ── STEP 1: Case Type Selection ── */}
        {step === 1 && (
          <div className="w-full space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 text-xs font-600 mb-2">
                <Icon name="SparklesIcon" size={12} />
                Step 1 of 3 — Personalise Your Experience
              </div>
              <h1 className="font-display font-900 text-3xl sm:text-4xl text-gray-900">
                Welcome, {firstName}! 👋
              </h1>
              <p className="text-gray-500 text-base max-w-lg mx-auto leading-relaxed">
                Tell us about your case so we can tailor CourtCraft to your specific legal situation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CASE_TYPES.map((ct) => (
                <button
                  key={ct.id}
                  type="button"
                  onClick={() => setSelectedCaseType(ct.id)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all duration-200 group ${
                    selectedCaseType === ct.id
                      ? 'border-gold-500 bg-gold-500/10' :'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedCaseType === ct.id ? 'bg-gold-500 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                      }`}
                    >
                      <Icon name={ct.icon} size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`font-700 text-sm ${selectedCaseType === ct.id ? 'text-gold-600' : 'text-gray-900'}`}>
                          {ct.label}
                        </p>
                        {selectedCaseType === ct.id && (
                          <div className="w-5 h-5 rounded-full bg-gold-500 flex items-center justify-center flex-shrink-0">
                            <Icon name="CheckIcon" size={10} className="text-white" />
                          </div>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs mt-1 leading-relaxed">{ct.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleCaseTypeNext}
                disabled={!selectedCaseType}
                className="btn-gold px-8 py-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
                <Icon name="ArrowRightIcon" size={16} className="text-white" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Tool Introduction ── */}
        {step === 2 && (
          <div className="w-full space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-600 text-xs font-600 mb-2">
                <Icon name="RectangleStackIcon" size={12} />
                Step 2 of 3 — Your Toolkit
              </div>
              <h1 className="font-display font-900 text-3xl sm:text-4xl text-gray-900">
                Tools built for your case
              </h1>
              <p className="text-gray-500 text-base max-w-lg mx-auto leading-relaxed">
                Based on your <span className="text-gold-600 font-700">{selectedCaseType}</span> case, here are the tools that will help you most.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recommendedTools.map((tool) => (
                <div
                  key={tool.name}
                  className={`p-5 rounded-2xl border transition-all ${
                    tool.highlight
                      ? 'border-gold-500/50 bg-gold-500/5' :'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        tool.highlight ? 'bg-gold-500 text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <Icon name={tool.icon} size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-700 text-sm text-gray-900">{tool.name}</p>
                        {tool.highlight && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-600 font-600">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs mt-1 leading-relaxed">{tool.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* All tools note */}
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-200">
              <Icon name="InformationCircleIcon" size={18} className="text-gray-400 flex-shrink-0" />
              <p className="text-gray-600 text-sm">
                All tools are available to you at any time from your dashboard. These are just the ones most relevant to your case type.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-gray-500 hover:text-gray-900 text-sm font-600 transition-colors flex items-center gap-1.5"
              >
                <Icon name="ArrowLeftIcon" size={14} />
                Back
              </button>
              <button
                type="button"
                onClick={handleToolsNext}
                className="btn-gold px-8 py-3"
              >
                Continue
                <Icon name="ArrowRightIcon" size={16} className="text-white" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Quick Start ── */}
        {step === 3 && (
          <div className="w-full space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 text-xs font-600 mb-2">
                <Icon name="RocketLaunchIcon" size={12} />
                Step 3 of 3 — You're Ready!
              </div>
              <h1 className="font-display font-900 text-3xl sm:text-4xl text-gray-900">
                Let's get started 🚀
              </h1>
              <p className="text-gray-500 text-base max-w-lg mx-auto leading-relaxed">
                Your CourtCraft account is set up. Choose where you'd like to begin — you can always change direction from your dashboard.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-red-50 border border-red-200">
                <Icon name="ExclamationCircleIcon" size={16} className="text-red-500 flex-shrink-0" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              {QUICK_START_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  disabled={saving}
                  onClick={() => handleComplete(action.href)}
                  className="w-full text-left p-5 rounded-2xl border border-gray-200 bg-white hover:border-gold-500/50 hover:bg-gray-50 transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-gold-500/20 flex items-center justify-center flex-shrink-0 transition-colors">
                      <Icon name={action.icon} size={22} className="text-gray-500 group-hover:text-gold-500 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-700 text-gray-900 text-sm">{action.label}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{action.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gold-600 font-600 hidden sm:block">{action.cta}</span>
                      {saving ? (
                        <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon name="ArrowRightIcon" size={16} className="text-gray-400 group-hover:text-gold-500 transition-colors" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Skip to dashboard */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-gray-500 hover:text-gray-900 text-sm font-600 transition-colors flex items-center gap-1.5"
              >
                <Icon name="ArrowLeftIcon" size={14} />
                Back
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleComplete('/dashboard')}
                className="text-gray-500 hover:text-gray-900 text-sm transition-colors disabled:opacity-40"
              >
                Skip to dashboard →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
