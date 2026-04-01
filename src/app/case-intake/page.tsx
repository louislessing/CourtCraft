'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import BackButton from '@/components/ui/BackButton';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CaseTypeOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

interface ComplexityOption {
  id: string;
  label: string;
  description: string;
  icon: string;
  indicators: string[];
}

interface KeyIssueOption {
  id: string;
  label: string;
  icon: string;
  tools: string[];
}

interface IntakeFormData {
  caseType: string;
  complexityLevel: string;
  keyIssues: string[];
  additionalContext: string;
}

// ─── Static Data ─────────────────────────────────────────────────────────────

const CASE_TYPES: CaseTypeOption[] = [
  {
    id: 'child_arrangements',
    label: 'Child Arrangements',
    description: 'Residence, contact, and parental responsibility disputes',
    icon: 'UserGroupIcon',
    color: 'blue',
  },
  {
    id: 'financial_remedy',
    label: 'Financial Remedy',
    description: 'Divorce finances, asset division, and maintenance',
    icon: 'BanknotesIcon',
    color: 'gold',
  },
  {
    id: 'domestic_abuse',
    label: 'Domestic Abuse',
    description: 'Non-molestation orders, occupation orders, and safety',
    icon: 'ShieldExclamationIcon',
    color: 'red',
  },
  {
    id: 'care_proceedings',
    label: 'Care Proceedings',
    description: 'Local authority involvement, care orders, and supervision',
    icon: 'BuildingOfficeIcon',
    color: 'purple',
  },
  {
    id: 'divorce',
    label: 'Divorce / Separation',
    description: 'Divorce petition, decree, and separation agreements',
    icon: 'DocumentTextIcon',
    color: 'orange',
  },
  {
    id: 'enforcement',
    label: 'Enforcement',
    description: 'Enforcing existing court orders and compliance',
    icon: 'ScaleIcon',
    color: 'teal',
  },
];

const COMPLEXITY_LEVELS: ComplexityOption[] = [
  {
    id: 'straightforward',
    label: 'Straightforward',
    description: 'Single issue, cooperative parties, no safeguarding concerns',
    icon: 'CheckCircleIcon',
    indicators: ['Both parties agree on most issues', 'No history of domestic abuse', 'No CAFCASS involvement yet', 'First application to court'],
  },
  {
    id: 'moderate',
    label: 'Moderate',
    description: 'Multiple issues, some conflict, standard court process',
    icon: 'AdjustmentsHorizontalIcon',
    indicators: ['Disputed facts or allegations', 'CAFCASS section 7 report likely', 'Financial disclosure needed', 'Multiple hearings expected'],
  },
  {
    id: 'complex',
    label: 'Complex',
    description: 'High conflict, safeguarding concerns, or multi-issue proceedings',
    icon: 'ExclamationTriangleIcon',
    indicators: ['Domestic abuse or safeguarding concerns', 'Fact-finding hearing required', 'Expert evidence needed', 'International elements or relocation'],
  },
];

const KEY_ISSUES: KeyIssueOption[] = [
  { id: 'contact_schedule', label: 'Contact Schedule', icon: 'CalendarDaysIcon', tools: ['ai-assistant', 'contacts', 'scheduler'] },
  { id: 'financial_disclosure', label: 'Financial Disclosure', icon: 'DocumentMagnifyingGlassIcon', tools: ['finance', 'vault', 'ai-assistant'] },
  { id: 'court_bundle', label: 'Court Bundle Prep', icon: 'FolderOpenIcon', tools: ['vault', 'court-reports', 'ai-assistant'] },
  { id: 'evidence_gathering', label: 'Evidence Gathering', icon: 'MagnifyingGlassIcon', tools: ['vault', 'comms', 'ai-assistant'] },
  { id: 'position_statement', label: 'Position Statement', icon: 'PencilSquareIcon', tools: ['ai-assistant', 'court-reports'] },
  { id: 'cafcass_preparation', label: 'CAFCASS Preparation', icon: 'UserIcon', tools: ['ai-assistant', 'insights', 'contacts'] },
  { id: 'hearing_preparation', label: 'Hearing Preparation', icon: 'BuildingLibraryIcon', tools: ['ai-assistant', 'court-reports', 'scheduler'] },
  { id: 'communication_log', label: 'Communication Log', icon: 'ChatBubbleLeftRightIcon', tools: ['comms', 'ai-assistant'] },
  { id: 'financial_orders', label: 'Financial Orders', icon: 'BanknotesIcon', tools: ['finance', 'ai-assistant', 'court-reports'] },
  { id: 'child_welfare', label: 'Child Welfare', icon: 'HeartIcon', tools: ['ai-assistant', 'insights', 'contacts'] },
  { id: 'enforcement', label: 'Order Enforcement', icon: 'ShieldCheckIcon', tools: ['ai-assistant', 'comms', 'court-reports'] },
  { id: 'urgent_application', label: 'Urgent Application', icon: 'BoltIcon', tools: ['ai-assistant', 'court-reports', 'scheduler'] },
];

// ─── Tool Routing Logic ───────────────────────────────────────────────────────

function computeRecommendedTools(caseType: string, complexity: string, issues: string[]): string[] {
  const toolScores: Record<string, number> = {};

  // Base tools from key issues
  issues.forEach((issueId) => {
    const issue = KEY_ISSUES.find((i) => i.id === issueId);
    if (issue) {
      issue.tools.forEach((tool, idx) => {
        toolScores[tool] = (toolScores[tool] || 0) + (3 - idx);
      });
    }
  });

  // Case type boosts
  if (caseType === 'child_arrangements') {
    toolScores['contacts'] = (toolScores['contacts'] || 0) + 3;
    toolScores['ai-assistant'] = (toolScores['ai-assistant'] || 0) + 2;
  }
  if (caseType === 'financial_remedy') {
    toolScores['finance'] = (toolScores['finance'] || 0) + 3;
    toolScores['vault'] = (toolScores['vault'] || 0) + 2;
  }
  if (caseType === 'domestic_abuse') {
    toolScores['ai-assistant'] = (toolScores['ai-assistant'] || 0) + 3;
    toolScores['comms'] = (toolScores['comms'] || 0) + 2;
  }

  // Complexity boosts
  if (complexity === 'complex') {
    toolScores['insights'] = (toolScores['insights'] || 0) + 3;
    toolScores['court-reports'] = (toolScores['court-reports'] || 0) + 2;
  }

  // Always include AI assistant
  toolScores['ai-assistant'] = (toolScores['ai-assistant'] || 0) + 1;

  return Object.entries(toolScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tool]) => tool);
}

const TOOL_LABELS: Record<string, { label: string; icon: string; description: string }> = {
  'ai-assistant': { label: 'AI Legal Assistant', icon: 'SparklesIcon', description: 'Expert UK family law guidance 24/7' },
  'insights': { label: 'Case Insights', icon: 'LightBulbIcon', description: 'AI-powered case analysis and predictions' },
  'court-reports': { label: 'Court Reports', icon: 'DocumentCheckIcon', description: 'Professional court document builder' },
  'contacts': { label: 'Child Contacts', icon: 'UserGroupIcon', description: 'Track and log contact arrangements' },
  'finance': { label: 'Finance Tracker', icon: 'BanknotesIcon', description: 'Monitor income, expenses, and assets' },
  'comms': { label: 'Comms Logger', icon: 'ChatBubbleLeftRightIcon', description: 'Log all communications as evidence' },
  'vault': { label: 'Secure Vault', icon: 'LockClosedIcon', description: 'Store and organise case documents' },
  'scheduler': { label: 'Scheduler', icon: 'CalendarDaysIcon', description: 'Manage court dates and deadlines' },
};

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  gold: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700', badge: 'bg-teal-100 text-teal-700' },
};

// ─── Step Components ──────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <React.Fragment key={i}>
          <div
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i < current ? 'bg-gold-500 w-8' : i === current ? 'bg-navy-900 w-8' : 'bg-gray-200 w-4'
            }`}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CaseIntakePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const supabase = createClient();

  const [step, setStep] = useState(0); // 0=caseType, 1=complexity, 2=keyIssues, 3=context, 4=results
  const [saving, setSaving] = useState(false);
  const [existingIntake, setExistingIntake] = useState<any>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  const [form, setForm] = useState<IntakeFormData>({
    caseType: '',
    complexityLevel: '',
    keyIssues: [],
    additionalContext: '',
  });

  const recommendedTools = form.caseType && form.complexityLevel
    ? computeRecommendedTools(form.caseType, form.complexityLevel, form.keyIssues)
    : [];

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [user, loading, router]);

  // Check for existing intake
  useEffect(() => {
    if (!user) return;
    (async () => {
      setCheckingExisting(true);
      const { data } = await supabase
        .from('case_intake')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setExistingIntake(data);
      setCheckingExisting(false);
    })();
  }, [user, supabase]);

  const handleSaveAndRoute = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const tools = computeRecommendedTools(form.caseType, form.complexityLevel, form.keyIssues);
      await supabase.from('case_intake').insert({
        user_id: user.id,
        case_type: form.caseType,
        complexity_level: form.complexityLevel,
        key_issues: form.keyIssues,
        additional_context: form.additionalContext || null,
        recommended_tools: tools,
      });
      setStep(4);
    } catch (err) {
      console.error('Failed to save intake:', err);
    } finally {
      setSaving(false);
    }
  };

  const toggleIssue = (id: string) => {
    setForm((prev) => ({
      ...prev,
      keyIssues: prev.keyIssues.includes(id)
        ? prev.keyIssues.filter((i) => i !== id)
        : [...prev.keyIssues, id],
    }));
  };

  const canProceed = () => {
    if (step === 0) return !!form.caseType;
    if (step === 1) return !!form.complexityLevel;
    if (step === 2) return form.keyIssues.length > 0;
    return true;
  };

  if (loading || checkingExisting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const selectedCaseType = CASE_TYPES.find((c) => c.id === form.caseType);
  const selectedComplexity = COMPLEXITY_LEVELS.find((c) => c.id === form.complexityLevel);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-navy-900 border-b border-navy-700 px-4 sm:px-6 h-14 flex items-center justify-between flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <AppLogo size={26} iconName="ScaleIcon" className="text-gold-500" />
          <span className="font-display font-900 text-sm text-white tracking-tight">
            Court<span className="text-gold-500">Craft</span>
          </span>
        </Link>
        <BackButton className="text-white/60 hover:text-gold-400" label="Back" />
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-start py-8 px-4">
        <div className="w-full max-w-2xl">

          {/* Existing intake banner */}
          {existingIntake && step < 4 && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <Icon name="InformationCircleIcon" size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-600 text-amber-800">You have a previous intake on record</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Completed {new Date(existingIntake.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
                  Completing this form will save a new intake alongside it.
                </p>
              </div>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-xs font-700 text-amber-700 hover:text-amber-900 underline whitespace-nowrap"
              >
                Skip to Dashboard
              </button>
            </div>
          )}

          {/* Step 0 – Case Type */}
          {step === 0 && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <StepIndicator current={0} total={4} />
                <h1 className="mt-4 font-display font-900 text-2xl text-navy-900">What type of case are you dealing with?</h1>
                <p className="mt-1.5 text-sm text-gray-500">Select the category that best describes your situation. This helps us tailor your dashboard tools.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CASE_TYPES.map((ct) => {
                  const colors = COLOR_MAP[ct.color];
                  const selected = form.caseType === ct.id;
                  return (
                    <button
                      key={ct.id}
                      onClick={() => setForm((p) => ({ ...p, caseType: ct.id }))}
                      className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        selected
                          ? `${colors.bg} ${colors.border} shadow-sm`
                          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? colors.badge : 'bg-gray-100'}`}>
                          <Icon name={ct.icon as any} size={18} className={selected ? colors.text : 'text-gray-500'} />
                        </div>
                        <div className="min-w-0">
                          <p className={`font-display font-700 text-sm ${selected ? colors.text : 'text-navy-900'}`}>{ct.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{ct.description}</p>
                        </div>
                        {selected && (
                          <Icon name="CheckCircleIcon" size={18} className={`${colors.text} flex-shrink-0 ml-auto`} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 1 – Complexity */}
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <StepIndicator current={1} total={4} />
                <h1 className="mt-4 font-display font-900 text-2xl text-navy-900">How complex is your case?</h1>
                <p className="mt-1.5 text-sm text-gray-500">Be honest — this helps us recommend the right level of support and tools for your situation.</p>
              </div>
              <div className="flex flex-col gap-3">
                {COMPLEXITY_LEVELS.map((cl) => {
                  const selected = form.complexityLevel === cl.id;
                  return (
                    <button
                      key={cl.id}
                      onClick={() => setForm((p) => ({ ...p, complexityLevel: cl.id }))}
                      className={`text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        selected
                          ? 'bg-navy-50 border-navy-900 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? 'bg-navy-900' : 'bg-gray-100'}`}>
                          <Icon name={cl.icon as any} size={18} className={selected ? 'text-gold-400' : 'text-gray-500'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`font-display font-700 text-sm ${selected ? 'text-navy-900' : 'text-navy-900'}`}>{cl.label}</p>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{cl.description}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {cl.indicators.map((ind) => (
                              <span key={ind} className={`px-2 py-0.5 rounded-full text-xs ${selected ? 'bg-navy-100 text-navy-700' : 'bg-gray-100 text-gray-600'}`}>
                                {ind}
                              </span>
                            ))}
                          </div>
                        </div>
                        {selected && (
                          <Icon name="CheckCircleIcon" size={18} className="text-navy-900 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2 – Key Issues */}
          {step === 2 && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <StepIndicator current={2} total={4} />
                <h1 className="mt-4 font-display font-900 text-2xl text-navy-900">What are your key issues?</h1>
                <p className="mt-1.5 text-sm text-gray-500">Select all that apply. We'll use these to highlight the most relevant tools in your dashboard.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {KEY_ISSUES.map((issue) => {
                  const selected = form.keyIssues.includes(issue.id);
                  return (
                    <button
                      key={issue.id}
                      onClick={() => toggleIssue(issue.id)}
                      className={`text-left p-3 rounded-xl border-2 transition-all duration-200 ${
                        selected
                          ? 'bg-gold-50 border-gold-400 shadow-sm'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${selected ? 'bg-gold-100' : 'bg-gray-100'}`}>
                          <Icon name={issue.icon as any} size={14} className={selected ? 'text-gold-700' : 'text-gray-500'} />
                        </div>
                        {selected && <Icon name="CheckCircleIcon" size={14} className="text-gold-600 ml-auto" />}
                      </div>
                      <p className={`font-600 text-xs leading-tight ${selected ? 'text-gold-800' : 'text-navy-800'}`}>{issue.label}</p>
                    </button>
                  );
                })}
              </div>
              {form.keyIssues.length > 0 && (
                <p className="mt-3 text-xs text-gray-500 text-center">
                  {form.keyIssues.length} issue{form.keyIssues.length !== 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}

          {/* Step 3 – Additional Context */}
          {step === 3 && (
            <div className="animate-fade-in">
              <div className="mb-6">
                <StepIndicator current={3} total={4} />
                <h1 className="mt-4 font-display font-900 text-2xl text-navy-900">Anything else we should know?</h1>
                <p className="mt-1.5 text-sm text-gray-500">Optional — add any brief context about your case that will help personalise your AI assistant's responses.</p>
              </div>

              {/* Summary of selections */}
              <div className="mb-5 p-4 rounded-xl bg-navy-50 border border-navy-100">
                <p className="text-xs font-700 text-navy-500 uppercase tracking-widest mb-3">Your Selections</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCaseType && (
                    <span className="px-2.5 py-1 rounded-full bg-navy-900 text-white text-xs font-600">
                      {selectedCaseType.label}
                    </span>
                  )}
                  {selectedComplexity && (
                    <span className="px-2.5 py-1 rounded-full bg-navy-700 text-white text-xs font-600">
                      {selectedComplexity.label} Complexity
                    </span>
                  )}
                  {form.keyIssues.map((id) => {
                    const issue = KEY_ISSUES.find((i) => i.id === id);
                    return issue ? (
                      <span key={id} className="px-2.5 py-1 rounded-full bg-gold-100 text-gold-800 text-xs font-600">
                        {issue.label}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              <textarea
                value={form.additionalContext}
                onChange={(e) => setForm((p) => ({ ...p, additionalContext: e.target.value }))}
                placeholder="e.g. I have a FHDRA hearing in 6 weeks, my ex has made allegations of coercive control, and I have two children aged 5 and 8..."
                rows={5}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-navy-900 focus:outline-none text-sm text-navy-900 placeholder-gray-400 resize-none transition-colors"
              />
              <p className="mt-2 text-xs text-gray-400">This is stored securely and used only to personalise your AI assistant.</p>
            </div>
          )}

          {/* Step 4 – Results / Routing */}
          {step === 4 && (
            <div className="animate-fade-in">
              <div className="mb-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gold-gradient flex items-center justify-center mx-auto mb-4">
                  <Icon name="SparklesIcon" size={28} className="text-navy-900" />
                </div>
                <h1 className="font-display font-900 text-2xl text-navy-900">Your Dashboard is Ready</h1>
                <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                  Based on your {selectedCaseType?.label} case with {selectedComplexity?.label?.toLowerCase()} complexity, we've identified the most relevant tools for you.
                </p>
              </div>

              {/* Recommended tools */}
              <div className="mb-6">
                <p className="text-xs font-700 text-navy-500 uppercase tracking-widest mb-3">Recommended Tools for Your Case</p>
                <div className="flex flex-col gap-2.5">
                  {recommendedTools.map((toolId, idx) => {
                    const tool = TOOL_LABELS[toolId];
                    if (!tool) return null;
                    return (
                      <div
                        key={toolId}
                        className="flex items-center gap-3 p-3.5 rounded-xl bg-white border border-gray-200 shadow-sm"
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${idx === 0 ? 'bg-gold-gradient' : 'bg-navy-50'}`}>
                          <Icon name={tool.icon as any} size={18} className={idx === 0 ? 'text-navy-900' : 'text-navy-600'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-display font-700 text-sm text-navy-900">{tool.label}</p>
                            {idx === 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-gold-100 text-gold-700 text-xs font-700">Top Pick</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{tool.description}</p>
                        </div>
                        <Icon name="ChevronRightIcon" size={16} className="text-gray-300 flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Key issues summary */}
              {form.keyIssues.length > 0 && (
                <div className="mb-6 p-4 rounded-xl bg-navy-50 border border-navy-100">
                  <p className="text-xs font-700 text-navy-500 uppercase tracking-widest mb-2.5">Your Key Issues</p>
                  <div className="flex flex-wrap gap-2">
                    {form.keyIssues.map((id) => {
                      const issue = KEY_ISSUES.find((i) => i.id === id);
                      return issue ? (
                        <span key={id} className="px-2.5 py-1 rounded-full bg-white border border-navy-200 text-navy-700 text-xs font-600">
                          {issue.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              {/* CTA */}
              <Link
                href="/dashboard"
                className="block w-full text-center py-3.5 rounded-xl bg-gold-gradient font-display font-800 text-navy-900 text-sm hover:opacity-90 transition-opacity shadow-md"
              >
                Go to My Dashboard
              </Link>
              <button
                onClick={() => {
                  setStep(0);
                  setForm({ caseType: '', complexityLevel: '', keyIssues: [], additionalContext: '' });
                }}
                className="block w-full text-center mt-2.5 py-2.5 rounded-xl text-sm text-gray-500 hover:text-navy-900 transition-colors"
              >
                Start Over
              </button>
            </div>
          )}

          {/* Navigation buttons */}
          {step < 4 && (
            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-600 text-gray-500 hover:text-navy-900 disabled:opacity-0 disabled:pointer-events-none transition-colors"
              >
                <Icon name="ArrowLeftIcon" size={15} />
                Back
              </button>

              {step < 3 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canProceed()}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-navy-900 text-white text-sm font-700 hover:bg-navy-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Continue
                  <Icon name="ArrowRightIcon" size={15} />
                </button>
              ) : (
                <button
                  onClick={handleSaveAndRoute}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-gold-gradient text-navy-900 text-sm font-800 hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icon name="SparklesIcon" size={15} />
                      See My Recommendations
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
