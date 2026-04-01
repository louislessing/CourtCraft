'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import { useChat } from '@/lib/hooks/useChat';
import { DashboardToolsContext } from '@/lib/hooks/useDashboardToolsContext';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';

interface CourtReportBuilderProps {
  caseContext: {
    caseId?: string;
    caseTitle?: string;
    caseNumber?: string;
    caseType?: string;
    courtName?: string;
    applicantName?: string;
    respondentName?: string;
    caseStatus?: string;
  } | null;
  fetchAllToolsContext: () => Promise<DashboardToolsContext>;
  userEmail?: string;
  userName?: string;
  supabaseUrl?: string;
}

type ReportSection =
  | 'case_summary' |'chronology' |'child_welfare' |'financial_summary' |'communications' |'evidence_index' |'position_statement';

interface ReportConfig {
  sections: ReportSection[];
  reportType: 'full' | 'chronology' | 'position_statement' | 'financial';
  hearingType: string;
}

const REPORT_TYPES = [
  { value: 'full', label: 'Full Court Bundle Report', desc: 'All sections — case summary, chronology, child welfare, finance, communications, evidence index' },
  { value: 'chronology', label: 'Case Chronology', desc: 'Structured timeline of all events with evidence references' },
  { value: 'position_statement', label: 'Position Statement', desc: 'Applicant/respondent position with supporting evidence and next steps' },
  { value: 'financial', label: 'Financial Summary', desc: 'Income, expenses, and financial position for financial remedy proceedings' },
];

const HEARING_TYPES = [
  'First Hearing Dispute Resolution Appointment (FHDRA)',
  'Dispute Resolution Appointment (DRA)',
  'Final Hearing',
  'Directions Hearing',
  'Case Management Hearing',
  'Financial Dispute Resolution (FDR)',
  'First Appointment (Form E)',
  'Interim Hearing',
  'Emergency / Without Notice Hearing',
  'CAFCASS Section 7 Report Hearing',
  'Other',
];

function buildCourtReportPrompt(ctx: DashboardToolsContext, config: ReportConfig, caseCtx: CourtReportBuilderProps['caseContext']): string {
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const lines: string[] = [];

  lines.push(`Today is ${todayStr}. You are an expert UK family law AI assistant generating a formal court-ready report.`);
  lines.push('');
  lines.push(`REPORT TYPE: ${config.reportType.toUpperCase().replace('_', ' ')}`);
  lines.push(`HEARING TYPE: ${config.hearingType}`);
  lines.push('');
  lines.push('Generate a structured, formal court-ready report using the case data below. The report must:');
  lines.push('- Use formal legal language appropriate for UK family court proceedings');
  lines.push('- Reference specific dates, amounts, names, and events from the data');
  lines.push('- Be structured with clearly numbered sections and sub-sections');
  lines.push('- Include a header with case details, date, and hearing type');
  lines.push('- Be suitable for submission to a UK family court');
  lines.push('- Reference relevant legislation (Children Act 1989, Family Law Act 1996, etc.) where appropriate');
  lines.push('');

  if (config.reportType === 'full') {
    lines.push('REQUIRED SECTIONS (include all that have data):');
    lines.push('**1. CASE SUMMARY** — Parties, case reference, court, case type, current status');
    lines.push('**2. CHRONOLOGY OF EVENTS** — All timeline events in date order with evidence status');
    lines.push('**3. CHILD WELFARE CONSIDERATIONS** — Contact visits (completed/missed/upcoming), welfare concerns, paramountcy principle');
    lines.push('**4. FINANCIAL POSITION** — Income, expenses, net balance, key financial entries');
    lines.push('**5. COMMUNICATIONS LOG** — Summary of logged communications with the other party');
    lines.push('**6. EVIDENCE INDEX** — List of documents and vault files available as evidence');
    lines.push('**7. POSITION AND SUBMISSIONS** — Current position, key arguments, relief sought, next steps');
  } else if (config.reportType === 'chronology') {
    lines.push('REQUIRED SECTIONS:');
    lines.push('**1. CASE HEADER** — Parties, reference, court');
    lines.push('**2. CHRONOLOGY OF EVENTS** — All events in strict date order, each with: date, description, evidence status (yes/no), significance');
    lines.push('**3. UPCOMING COURT DATES** — All scheduled hearings');
    lines.push('**4. EVIDENCE SUMMARY** — Count of events with/without evidence, vault files, documents');
  } else if (config.reportType === 'position_statement') {
    lines.push('REQUIRED SECTIONS:');
    lines.push('**1. CASE HEADER** — Parties, reference, court, hearing type');
    lines.push('**2. BACKGROUND** — Brief case history and current status');
    lines.push('**3. POSITION** — Clear statement of the applicant\'s/respondent\'s position');
    lines.push('**4. SUPPORTING EVIDENCE** — Key evidence supporting the position');
    lines.push('**5. CHILD WELFARE** — How the position serves the child\'s best interests (paramountcy principle)');
    lines.push('**6. RELIEF SOUGHT** — Specific orders requested from the court');
    lines.push('**7. NEXT STEPS** — Proposed directions and timeline');
  } else if (config.reportType === 'financial') {
    lines.push('REQUIRED SECTIONS:');
    lines.push('**1. CASE HEADER** — Parties, reference, court');
    lines.push('**2. FINANCIAL POSITION STATEMENT** — Overview of financial situation');
    lines.push('**3. INCOME** — All income sources and amounts');
    lines.push('**4. EXPENDITURE** — All expenses by category');
    lines.push('**5. NET POSITION** — Balance, surplus or deficit');
    lines.push('**6. FINANCIAL SUBMISSIONS** — Position on financial remedy, proposed settlement');
  }

  lines.push('');
  lines.push('--- LIVE CASE DATA ---');

  // Case details
  if (caseCtx) {
    lines.push('\nCASE DETAILS:');
    if (caseCtx.caseTitle) lines.push(`Title: ${caseCtx.caseTitle}`);
    if (caseCtx.caseNumber) lines.push(`Reference: ${caseCtx.caseNumber}`);
    if (caseCtx.caseType) lines.push(`Type: ${caseCtx.caseType}`);
    if (caseCtx.courtName) lines.push(`Court: ${caseCtx.courtName}`);
    if (caseCtx.applicantName) lines.push(`Applicant: ${caseCtx.applicantName}`);
    if (caseCtx.respondentName) lines.push(`Respondent: ${caseCtx.respondentName}`);
    if (caseCtx.caseStatus) lines.push(`Status: ${caseCtx.caseStatus}`);
  }

  // Cases from DB
  if (ctx.cases.length > 0) {
    lines.push('\nCASES ON RECORD:');
    ctx.cases.forEach((c) => {
      lines.push(`- [${c.status?.toUpperCase() || 'UNKNOWN'}] "${c.title}"${c.case_number ? ` (Ref: ${c.case_number})` : ''}${c.case_type ? ` | Type: ${c.case_type}` : ''}${c.court_name ? ` | Court: ${c.court_name}` : ''}`);
      if (c.notes) lines.push(`  Notes: ${c.notes.slice(0, 300)}`);
    });
  }

  // Court Dates
  if (ctx.courtDates.length > 0) {
    lines.push('\nCOURT DATES:');
    ctx.courtDates.forEach((d) => {
      const dateStr = new Date(d.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const daysUntil = Math.ceil((new Date(d.event_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      lines.push(`- ${dateStr} (${daysUntil > 0 ? `in ${daysUntil} days` : 'past'}): "${d.event_title}"${d.event_type ? ` [${d.event_type}]` : ''}${d.is_urgent ? ' ⚠️ URGENT' : ''}${d.notes ? ` — ${d.notes}` : ''}`);
    });
  }

  // Timeline Events
  if (ctx.timelineEvents.length > 0) {
    const withEvidence = ctx.timelineEvents.filter(e => e.has_evidence).length;
    lines.push(`\nTIMELINE EVENTS (${ctx.timelineEvents.length} total, ${withEvidence} with evidence):`);
    ctx.timelineEvents.forEach((e) => {
      const dateStr = new Date(e.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      lines.push(`- ${dateStr}: "${e.event_title}"${e.event_type ? ` [${e.event_type}]` : ''} | Evidence: ${e.has_evidence ? 'YES' : 'NO'}${e.description ? ` | ${e.description.slice(0, 200)}` : ''}`);
    });
  }

  // Finance
  if (ctx.financeEntries.length > 0) {
    const income = ctx.financeEntries.filter(f => f.entry_type === 'income').reduce((s, f) => s + (f.amount || 0), 0);
    const expenses = ctx.financeEntries.filter(f => f.entry_type === 'expense').reduce((s, f) => s + (f.amount || 0), 0);
    lines.push(`\nFINANCE (Total Income: £${income.toFixed(2)}, Total Expenses: £${expenses.toFixed(2)}, Net: £${(income - expenses).toFixed(2)}):`);
    ctx.financeEntries.forEach((f) => {
      const dateStr = new Date(f.entry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      lines.push(`- ${dateStr}: ${f.entry_type === 'income' ? 'INCOME' : 'EXPENSE'} £${f.amount?.toFixed(2)} — ${f.description}${f.category ? ` [${f.category}]` : ''}`);
    });
  }

  // Child Contacts
  if (ctx.childContacts.length > 0) {
    const upcoming = ctx.childContacts.filter(c => c.status === 'scheduled' && new Date(c.contact_date) >= today).length;
    const missed = ctx.childContacts.filter(c => c.status === 'missed').length;
    const completed = ctx.childContacts.filter(c => c.status === 'completed').length;
    lines.push(`\nCHILD CONTACT (${upcoming} upcoming, ${completed} completed, ${missed} missed):`);
    ctx.childContacts.forEach((c) => {
      const dateStr = new Date(c.contact_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      lines.push(`- ${dateStr}: ${c.child_name} | Type: ${c.contact_type.replace('_', ' ')} | Status: ${c.status.toUpperCase()}${c.location ? ` | Location: ${c.location}` : ''}${c.notes ? ` | Notes: ${c.notes.slice(0, 150)}` : ''}`);
    });
  }

  // Communications
  if (ctx.communications.length > 0) {
    lines.push(`\nCOMMUNICATIONS LOG (${ctx.communications.length} entries):`);
    ctx.communications.forEach((c) => {
      const dateStr = new Date(c.comm_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      lines.push(`- ${dateStr}: [${c.comm_type?.toUpperCase() || 'COMM'}]${c.direction ? ` (${c.direction})` : ''}${c.subject ? ` Subject: "${c.subject}"` : ''}${c.summary ? ` — ${c.summary.slice(0, 200)}` : ''}`);
    });
  }

  // Vault & Documents
  if (ctx.vaultFiles.length > 0) {
    lines.push(`\nSECURE VAULT FILES (${ctx.vaultFiles.length} files):`);
    ctx.vaultFiles.forEach((f) => {
      const folder = f.context?.replace('dashboard-secure/', '') || 'General';
      lines.push(`- "${f.file_name}" [Folder: ${folder}] — Uploaded: ${new Date(f.created_at).toLocaleDateString('en-GB')}`);
    });
  }

  if (ctx.documents.length > 0) {
    lines.push(`\nDOCUMENTS BUILT (${ctx.documents.length} documents):`);
    ctx.documents.forEach((d) => {
      lines.push(`- "${d.title || 'Untitled'}"${d.document_type ? ` [${d.document_type}]` : ''} — Created: ${new Date(d.created_at).toLocaleDateString('en-GB')}`);
    });
  }

  lines.push('\n--- END CASE DATA ---');
  lines.push('');
  lines.push('Now generate the complete, formal court-ready report. Use proper legal formatting with numbered sections. Be thorough and reference specific data points.');

  return lines.join('\n');
}

export default function CourtReportBuilder({
  caseContext,
  fetchAllToolsContext,
  userEmail,
  userName,
  supabaseUrl,
}: CourtReportBuilderProps) {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    sections: ['case_summary', 'chronology', 'child_welfare', 'financial_summary', 'communications', 'evidence_index', 'position_statement'],
    reportType: 'full',
    hearingType: 'Final Hearing',
  });
  const [reportText, setReportText] = useState('');
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportGeneratedAt, setReportGeneratedAt] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [currentChunk, setCurrentChunk] = useState<number>(0);
  const [totalChunks, setTotalChunks] = useState<number>(1);
  const [savedContext, setSavedContext] = useState<DashboardToolsContext | null>(null);

  const { response, isLoading: aiLoading, retryInfo, sendMessage } = useChat('ANTHROPIC', 'claude-sonnet-4-5-20250929', true);

  // Capture streaming response
  React.useEffect(() => {
    if (response) setReportText(response);
  }, [response]);

  React.useEffect(() => {
    if (!aiLoading && reportText) {
      setIsGenerating(false);
      setGenerationError(null);
    }
  }, [aiLoading, reportText]);

  // Build section-specific prompts for chunked generation
  const buildSectionPrompts = useCallback((ctx: DashboardToolsContext, config: ReportConfig, caseCtx: CourtReportBuilderProps['caseContext']): { label: string; prompt: string }[] => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const caseHeader = [
      `Today is ${todayStr}. You are an expert UK family law AI assistant generating a formal court-ready report.`,
      `REPORT TYPE: ${config.reportType.toUpperCase().replace('_', ' ')}`,
      `HEARING TYPE: ${config.hearingType}`,
      '',
      'Use formal legal language appropriate for UK family court proceedings. Reference specific dates, amounts, names, and events from the data. Use numbered sections and sub-sections.',
      '',
      '--- DATA ---',
      caseCtx?.caseTitle ? `Title: ${caseCtx.caseTitle}` : '',
      caseCtx?.caseNumber ? `Reference: ${caseCtx.caseNumber}` : '',
      caseCtx?.caseType ? `Type: ${caseCtx.caseType}` : '',
      caseCtx?.courtName ? `Court: ${caseCtx.courtName}` : '',
      caseCtx?.applicantName ? `Applicant: ${caseCtx.applicantName}` : '',
      caseCtx?.respondentName ? `Respondent: ${caseCtx.respondentName}` : '',
    ].filter(Boolean).join('\n');

    if (config.reportType === 'full') {
      const sections: { label: string; prompt: string }[] = [];

      // Section 1: Case Summary + Court Dates
      sections.push({
        label: 'Case Summary & Court Dates',
        prompt: [
          caseHeader,
          '',
          'Generate ONLY the following sections (do not generate any other sections):',
          '**1. CASE SUMMARY** — Parties, case reference, court, case type, current status, brief background',
          '**2. UPCOMING COURT DATES** — All scheduled hearings in date order with urgency flags',
          '',
          '--- DATA ---',
          ctx.cases.length > 0 ? `CASES:\n${ctx.cases.map(c => `- [${c.status?.toUpperCase()}] "${c.title}"${c.case_number ? ` (Ref: ${c.case_number})` : ''}${c.case_type ? ` | Type: ${c.case_type}` : ''}${c.court_name ? ` | Court: ${c.court_name}` : ''}${c.notes ? `\n  Notes: ${c.notes.slice(0, 300)}` : ''}`).join('\n')}` : '',
          ctx.courtDates.length > 0 ? `COURT DATES:\n${ctx.courtDates.map(d => {
            const dateStr = new Date(d.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            const daysUntil = Math.ceil((new Date(d.event_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return `- ${dateStr} (${daysUntil > 0 ? `in ${daysUntil} days` : 'past'}): "${d.event_title}"${d.event_type ? ` [${d.event_type}]` : ''}${d.is_urgent ? ' ⚠️ URGENT' : ''}${d.notes ? ` — ${d.notes}` : ''}`;
          }).join('\n')}` : '',
        ].filter(Boolean).join('\n'),
      });

      // Section 2: Chronology
      sections.push({
        label: 'Chronology of Events',
        prompt: [
          caseHeader,
          '',
          'Generate ONLY the following section (do not repeat any previously generated sections):',
          '**3. CHRONOLOGY OF EVENTS** — All timeline events in strict date order. For each event include: date, description, event type, whether evidence exists, and significance to the case.',
          '',
          '--- DATA ---',
          ctx.timelineEvents.length > 0 ? `TIMELINE EVENTS (${ctx.timelineEvents.length} total, ${ctx.timelineEvents.filter(e => e.has_evidence).length} with evidence):\n${ctx.timelineEvents.map(e => {
            const dateStr = new Date(e.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            return `- ${dateStr}: "${e.event_title}"${e.event_type ? ` [${e.event_type}]` : ''} | Evidence: ${e.has_evidence ? 'YES' : 'NO'}${e.description ? ` | ${e.description.slice(0, 200)}` : ''}`;
          }).join('\n')}` : 'No timeline events recorded.',
        ].filter(Boolean).join('\n'),
      });

      // Section 3: Child Welfare
      sections.push({
        label: 'Child Welfare & Financial Position',
        prompt: [
          caseHeader,
          '',
          'Generate ONLY the following sections (do not repeat any previously generated sections):',
          '**4. CHILD WELFARE CONSIDERATIONS** — Contact visits (completed/missed/upcoming), welfare concerns, paramountcy principle under Children Act 1989',
          '**5. FINANCIAL POSITION** — Income, expenses, net balance, key financial entries, financial submissions',
          '',
          '--- DATA ---',
          ctx.childContacts.length > 0 ? `CHILD CONTACT (${ctx.childContacts.filter(c => c.status === 'scheduled' && new Date(c.contact_date) >= today).length} upcoming, ${ctx.childContacts.filter(c => c.status === 'completed').length} completed, ${ctx.childContacts.filter(c => c.status === 'missed').length} missed):\n${ctx.childContacts.map(c => {
            const dateStr = new Date(c.contact_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            return `- ${dateStr}: ${c.child_name} | Type: ${c.contact_type.replace('_', ' ')} | Status: ${c.status.toUpperCase()}${c.location ? ` | Location: ${c.location}` : ''}${c.notes ? ` | Notes: ${c.notes.slice(0, 150)}` : ''}`;
          }).join('\n')}` : 'No child contact records.',
          ctx.financeEntries.length > 0 ? (() => {
            const income = ctx.financeEntries.filter(f => f.entry_type === 'income').reduce((s, f) => s + (f.amount || 0), 0);
            const expenses = ctx.financeEntries.filter(f => f.entry_type === 'expense').reduce((s, f) => s + (f.amount || 0), 0);
            return `FINANCE (Total Income: £${income.toFixed(2)}, Total Expenses: £${expenses.toFixed(2)}, Net: £${(income - expenses).toFixed(2)}):\n${ctx.financeEntries.map(f => {
              const dateStr = new Date(f.entry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
              return `- ${dateStr}: ${f.entry_type === 'income' ? 'INCOME' : 'EXPENSE'} £${f.amount?.toFixed(2)} — ${f.description}${f.category ? ` [${f.category}]` : ''}`;
            }).join('\n')}`;
          })() : 'No finance entries recorded.',
        ].filter(Boolean).join('\n'),
      });

      // Section 4: Communications, Evidence & Position
      sections.push({
        label: 'Communications, Evidence & Position',
        prompt: [
          caseHeader,
          '',
          'Generate ONLY the following sections (do not repeat any previously generated sections):',
          '**6. COMMUNICATIONS LOG** — Summary of all logged communications with the other party',
          '**7. EVIDENCE INDEX** — List of all documents, vault files, and evidence available',
          '**8. POSITION AND SUBMISSIONS** — Current position, key arguments, relief sought, proposed next steps and directions',
          '',
          '--- DATA ---',
          ctx.communications.length > 0 ? `COMMUNICATIONS LOG (${ctx.communications.length} entries):\n${ctx.communications.map(c => {
            const dateStr = new Date(c.comm_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
            return `- ${dateStr}: [${c.comm_type?.toUpperCase() || 'COMM'}]${c.direction ? ` (${c.direction})` : ''}${c.subject ? ` Subject: "${c.subject}"` : ''}${c.summary ? ` — ${c.summary.slice(0, 200)}` : ''}`;
          }).join('\n')}` : 'No communications logged.',
          ctx.vaultFiles.length > 0 ? `SECURE VAULT FILES (${ctx.vaultFiles.length} files):\n${ctx.vaultFiles.map(f => `- "${f.file_name}" [Folder: ${f.context?.replace('dashboard-secure/', '') || 'General'}] — Uploaded: ${new Date(f.created_at).toLocaleDateString('en-GB')}`).join('\n')}` : '',
          ctx.documents.length > 0 ? `DOCUMENTS BUILT (${ctx.documents.length} documents):\n${ctx.documents.map(d => `- "${d.title || 'Untitled'}"${d.document_type ? ` [${d.document_type}]` : ''} — Created: ${new Date(d.created_at).toLocaleDateString('en-GB')}`).join('\n')}` : '',
        ].filter(Boolean).join('\n'),
      });

      return sections;
    }

    // For non-full reports, use a single prompt (the original full prompt)
    return [{ label: 'Full Report', prompt: buildCourtReportPrompt(ctx, config, caseCtx) }];
  }, []);

  const handleGenerateReport = useCallback(async () => {
    if (isGenerating || aiLoading) return;
    setIsGenerating(true);
    setIsFetchingData(true);
    setReportText('');
    setReportGenerated(true);
    setReportGeneratedAt(new Date());
    setGenerationError(null);
    setCurrentChunk(0);

    try {
      const toolsContext = await fetchAllToolsContext();
      setSavedContext(toolsContext);
      setIsFetchingData(false);

      if (reportConfig.reportType === 'full') {
        // Chunked generation for full reports
        const sectionPrompts = buildSectionPrompts(toolsContext, reportConfig, caseContext);
        setTotalChunks(sectionPrompts.length);
        let fullReport = '';

        for (let i = 0; i < sectionPrompts.length; i++) {
          setCurrentChunk(i + 1);
          const { prompt } = sectionPrompts[i];

          await new Promise<void>((resolve, reject) => {
            let sectionText = '';
            let resolved = false;

            const { getStreamingChatCompletionWithProgress } = require('@/lib/ai/chatCompletion');
            getStreamingChatCompletionWithProgress(
              'ANTHROPIC',
              'claude-sonnet-4-5-20250929',
              [{ role: 'user', content: prompt }],
              (chunk: any) => {
                const content = chunk?.choices?.[0]?.delta?.content;
                if (content) {
                  sectionText += content;
                  setReportText(fullReport + sectionText);
                }
              },
              () => {
                if (!resolved) {
                  resolved = true;
                  fullReport += (fullReport ? '\n\n' : '') + sectionText;
                  setReportText(fullReport);
                  resolve();
                }
              },
              (err: Error) => {
                if (!resolved) {
                  resolved = true;
                  reject(err);
                }
              },
              (attempt: number, maxRetries: number) => {
                // Keep existing partial content visible during retry
                console.log(`Section ${i + 1} retry ${attempt}/${maxRetries}`);
              },
              { max_tokens: 8000 },
              3
            );
          });
        }

        setIsGenerating(false);
        setGenerationError(null);
        toast.success('Court report generated successfully');
      } else {
        // Single-shot for non-full reports with retry via useChat
        const prompt = buildCourtReportPrompt(toolsContext, reportConfig, caseContext);
        sendMessage([{ role: 'user' as const, content: prompt }], { max_tokens: 16000 });
      }
    } catch (err) {
      setIsFetchingData(false);
      setIsGenerating(false);
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setGenerationError(errMsg);
      toast.error('Report generation failed. You can retry or resume below.');
    }
  }, [isGenerating, aiLoading, fetchAllToolsContext, reportConfig, caseContext, sendMessage, buildSectionPrompts]);

  const handleResumeGeneration = useCallback(async () => {
    if (!savedContext || isGenerating) return;
    setIsGenerating(true);
    setGenerationError(null);

    try {
      if (reportConfig.reportType === 'full') {
        const sectionPrompts = buildSectionPrompts(savedContext, reportConfig, caseContext);
        setTotalChunks(sectionPrompts.length);
        let fullReport = reportText; // Keep what we already have

        // Find which chunk we were on and resume from there
        const resumeFrom = Math.max(0, currentChunk - 1);

        for (let i = resumeFrom; i < sectionPrompts.length; i++) {
          setCurrentChunk(i + 1);
          const { prompt } = sectionPrompts[i];

          await new Promise<void>((resolve, reject) => {
            let sectionText = '';
            let resolved = false;

            const { getStreamingChatCompletionWithProgress } = require('@/lib/ai/chatCompletion');
            getStreamingChatCompletionWithProgress(
              'ANTHROPIC',
              'claude-sonnet-4-5-20250929',
              [{ role: 'user', content: prompt }],
              (chunk: any) => {
                const content = chunk?.choices?.[0]?.delta?.content;
                if (content) {
                  sectionText += content;
                  setReportText(fullReport + (fullReport ? '\n\n' : '') + sectionText);
                }
              },
              () => {
                if (!resolved) {
                  resolved = true;
                  fullReport += (fullReport ? '\n\n' : '') + sectionText;
                  setReportText(fullReport);
                  resolve();
                }
              },
              (err: Error) => {
                if (!resolved) {
                  resolved = true;
                  reject(err);
                }
              },
              (attempt: number, maxRetries: number) => {
                console.log(`Resume section ${i + 1} retry ${attempt}/${maxRetries}`);
              },
              { max_tokens: 8000 },
              3
            );
          });
        }

        setIsGenerating(false);
        setGenerationError(null);
        toast.success('Report completed successfully');
      } else {
        const prompt = buildCourtReportPrompt(savedContext, reportConfig, caseContext);
        sendMessage([{ role: 'user' as const, content: prompt }], { max_tokens: 16000 });
      }
    } catch (err) {
      setIsGenerating(false);
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setGenerationError(errMsg);
      toast.error('Resume failed. Please try again.');
    }
  }, [savedContext, isGenerating, reportConfig, caseContext, buildSectionPrompts, reportText, currentChunk, sendMessage]);

  const handleExportPDF = useCallback(() => {
    if (!reportText) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 0;

    const addPage = () => {
      doc.addPage();
      y = 20;
      // Page footer
      doc.setFontSize(7);
      doc.setTextColor(160, 160, 160);
      doc.text('CourtCraft Advocate — Court Report', margin, pageHeight - 8);
      doc.text(`Page ${(doc as any).internal.getCurrentPageInfo().pageNumber}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    };

    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > pageHeight - 18) addPage();
    };

    // ── Cover page ──
    doc.setFillColor(10, 15, 30);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Gold accent bar
    doc.setFillColor(201, 168, 76);
    doc.rect(0, 0, 6, pageHeight, 'F');

    // Logo area
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(201, 168, 76);
    doc.text('CourtCraft Advocate', margin + 8, 50);

    doc.setFontSize(11);
    doc.setTextColor(180, 180, 200);
    doc.text('McKenzie Friend Legal Support Platform', margin + 8, 60);

    // Report title
    doc.setFillColor(201, 168, 76, 0.15);
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin + 4, 78, contentWidth - 4, 28, 3, 3);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    const reportTypeLabel = REPORT_TYPES.find(r => r.value === reportConfig.reportType)?.label || 'Court Report';
    doc.text(reportTypeLabel, margin + 12, 91);
    doc.setFontSize(9);
    doc.setTextColor(201, 168, 76);
    doc.text(`Prepared for: ${reportConfig.hearingType}`, margin + 12, 100);

    // Case details box
    y = 120;
    doc.setFillColor(20, 28, 50);
    doc.roundedRect(margin + 4, y, contentWidth - 4, 70, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(201, 168, 76);
    doc.text('CASE DETAILS', margin + 12, y + 10);

    const caseDetails = [
      ['Case Title', caseContext?.caseTitle || 'Not specified'],
      ['Case Reference', caseContext?.caseNumber || 'Not specified'],
      ['Case Type', caseContext?.caseType || 'Not specified'],
      ['Court', caseContext?.courtName || 'Not specified'],
      ['Applicant', caseContext?.applicantName || 'Not specified'],
      ['Respondent', caseContext?.respondentName || 'Not specified'],
    ];

    let detailY = y + 18;
    caseDetails.forEach(([label, value]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(140, 150, 180);
      doc.text(label + ':', margin + 12, detailY);
      doc.setTextColor(220, 220, 240);
      doc.text(value, margin + 50, detailY);
      detailY += 8;
    });

    // Generated info
    y = 205;
    const generatedStr = reportGeneratedAt
      ? reportGeneratedAt.toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : new Date().toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 160);
    doc.text(`Generated: ${generatedStr}`, margin + 8, y);
    doc.text(`Prepared by: ${userName || 'CourtCraft User'}`, margin + 8, y + 8);

    // Data sources
    y = 228;
    doc.setFontSize(7);
    doc.setTextColor(100, 110, 140);
    doc.text('Data sources: Case Management · Court Dates · Timeline Events · Finance Tracker · Child Contact Tracker', margin + 8, y);
    doc.text('Communication Logger · Secure Vault · Document Builder', margin + 8, y + 6);

    // Disclaimer
    y = 248;
    doc.setFillColor(30, 20, 10);
    doc.roundedRect(margin + 4, y, contentWidth - 4, 22, 2, 2, 'F');
    doc.setFontSize(6.5);
    doc.setTextColor(160, 130, 80);
    const disclaimer = 'IMPORTANT: This report is generated by AI based on data entered by the user. It is not legal advice and should not be relied upon as a substitute for professional legal counsel. CourtCraft Advocate provides McKenzie Friend lay support services only. Always verify all information before submitting to court.';
    const disclaimerLines = doc.splitTextToSize(disclaimer, contentWidth - 16);
    doc.text(disclaimerLines, margin + 8, y + 7);

    // ── Report content pages ──
    doc.addPage();
    y = 20;

    // Page header
    doc.setFillColor(10, 15, 30);
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setFillColor(201, 168, 76);
    doc.rect(0, 0, 4, 14, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(201, 168, 76);
    doc.text('CourtCraft Advocate', 8, 9);
    doc.setTextColor(160, 160, 180);
    doc.text(reportTypeLabel, pageWidth / 2, 9, { align: 'center' });
    doc.text(generatedStr, pageWidth - margin, 9, { align: 'right' });
    y = 22;

    // Parse and render report text
    const rawLines = reportText.split('\n');

    rawLines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        y += 3;
        return;
      }

      // Section headers (bold **N. TITLE**)
      const sectionMatch = trimmed.match(/^\*\*(\d+\.\s*.+?)\*\*$/);
      if (sectionMatch) {
        checkPageBreak(16);
        // Section header bar
        doc.setFillColor(10, 15, 30);
        doc.rect(margin, y, contentWidth, 10, 'F');
        doc.setFillColor(201, 168, 76);
        doc.rect(margin, y, 3, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(201, 168, 76);
        doc.text(sectionMatch[1].toUpperCase(), margin + 6, y + 7);
        y += 14;
        return;
      }

      // Sub-headers (### or **)
      const subHeaderMatch = trimmed.match(/^#{2,3}\s+(.+)$/) || trimmed.match(/^\*\*(.+)\*\*$/);
      if (subHeaderMatch) {
        checkPageBreak(10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 40, 80);
        doc.text(subHeaderMatch[1], margin, y);
        y += 7;
        return;
      }

      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const bulletText = trimmed.replace(/^[-•]\s*/, '');
        const cleanText = bulletText.replace(/\*\*(.*?)\*\*/g, '$1');
        const wrappedLines = doc.splitTextToSize(`• ${cleanText}`, contentWidth - 6);
        checkPageBreak(wrappedLines.length * 5 + 2);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 40, 60);
        doc.text(wrappedLines, margin + 4, y);
        y += wrappedLines.length * 5 + 2;
        return;
      }

      // Numbered list items
      const numberedMatch = trimmed.match(/^(\d+\.\s+)(.+)$/);
      if (numberedMatch) {
        const cleanText = numberedMatch[2].replace(/\*\*(.*?)\*\*/g, '$1');
        const wrappedLines = doc.splitTextToSize(`${numberedMatch[1]}${cleanText}`, contentWidth - 4);
        checkPageBreak(wrappedLines.length * 5 + 2);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 40, 60);
        doc.text(wrappedLines, margin + 2, y);
        y += wrappedLines.length * 5 + 2;
        return;
      }

      // Regular paragraph text
      const cleanText = trimmed.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
      const wrappedLines = doc.splitTextToSize(cleanText, contentWidth);
      checkPageBreak(wrappedLines.length * 5 + 2);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(40, 50, 70);
      doc.text(wrappedLines, margin, y);
      y += wrappedLines.length * 5 + 3;
    });

    // Footer on last page
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 2; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(201, 168, 76);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      doc.setFontSize(6.5);
      doc.setTextColor(140, 140, 160);
      doc.text('CourtCraft Advocate — AI-generated court report. Not legal advice. For McKenzie Friend support only.', margin, pageHeight - 7);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
    }

    const dateStr = (reportGeneratedAt || new Date()).toISOString().slice(0, 10);
    const reportTypeSlug = reportConfig.reportType.replace('_', '-');
    doc.save(`CourtCraft-Court-Report-${reportTypeSlug}-${dateStr}.pdf`);
    toast.success('Court report exported as PDF');
  }, [reportText, reportGeneratedAt, caseContext, reportConfig, userName]);

  const handleSendEmail = useCallback(async () => {
    if (!reportText || !emailAddress.trim()) return;
    setEmailSending(true);
    try {
      const generatedStr = reportGeneratedAt
        ? reportGeneratedAt.toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

      const reportTypeLabel = REPORT_TYPES.find(r => r.value === reportConfig.reportType)?.label || 'Court Report';

      // Parse report into sections for email
      const emailSections: { label: string; bullets: string[] }[] = [];
      let currentSection: { label: string; bullets: string[] } | null = null;

      reportText.split('\n').forEach((line) => {
        const trimmed = line.trim();
        const sectionMatch = trimmed.match(/^\*\*(\d+\.\s*.+?)\*\*$/);
        if (sectionMatch) {
          if (currentSection) emailSections.push(currentSection);
          currentSection = { label: sectionMatch[1], bullets: [] };
        } else if (currentSection && trimmed && !trimmed.startsWith('#')) {
          const clean = trimmed.replace(/^[-•]\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
          if (clean.length > 0) currentSection.bullets.push(clean);
        }
      });
      if (currentSection) emailSections.push(currentSection);

      const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'court_report',
          to: emailAddress.trim(),
          fullName: userName || 'CourtCraft User',
          caseTitle: caseContext?.caseTitle || 'Your Case',
          caseNumber: caseContext?.caseNumber || '',
          reportType: reportTypeLabel,
          hearingType: reportConfig.hearingType,
          generatedAt: generatedStr,
          sections: emailSections.slice(0, 8),
        }),
      });

      if (!res.ok) throw new Error('Email send failed');
      toast.success('Court report emailed successfully');
      setEmailModalOpen(false);
      setEmailAddress('');
    } catch {
      toast.error('Failed to send email. Please try again.');
    } finally {
      setEmailSending(false);
    }
  }, [reportText, emailAddress, reportGeneratedAt, caseContext, reportConfig, userName, supabaseUrl]);

  return (
    <div id="court-report" className="surface-card rounded-2xl hover:shadow-lg transition-shadow duration-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)' }}>
            <Icon name="DocumentCheckIcon" size={16} className="text-white" />
          </div>
          <div>
            <h3 className="font-display font-700 text-navy-900 text-sm leading-tight">Court Report Builder</h3>
            <p className="text-navy-500 mt-0.5" style={{ fontSize: '10px' }}>
              Pulls data from all tools · Generates court-ready, formatted reports
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {reportGenerated && !isGenerating && !aiLoading && reportText && (
            <>
              <button
                onClick={handleExportPDF}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy-700 font-display font-600 text-xs hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 active:scale-95 transition-all duration-150 cursor-pointer"
                title="Export as PDF"
              >
                <Icon name="ArrowDownTrayIcon" size={13} />
                <span className="hidden sm:inline">Export PDF</span>
              </button>
              <button
                onClick={() => { setEmailAddress(userEmail || ''); setEmailModalOpen(true); }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy-700 font-display font-600 text-xs hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 active:scale-95 transition-all duration-150 cursor-pointer"
                title="Share via Email"
              >
                <Icon name="EnvelopeIcon" size={13} />
                <span className="hidden sm:inline">Email Report</span>
              </button>
            </>
          )}
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating || aiLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-display font-700 text-xs hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex-shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)' }}
          >
            {isGenerating || aiLoading ? (
              <>
                <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                {reportConfig.reportType === 'full' && totalChunks > 1 ? `Section ${currentChunk}/${totalChunks}…` : 'Generating…'}
              </>
            ) : (
              <>
                <Icon name="DocumentCheckIcon" size={13} className="text-white" />
                {reportGenerated ? 'Regenerate Report' : 'Generate Court Report'}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {/* Configuration */}
        {!reportGenerated || (!isGenerating && !aiLoading) ? (
          <div className={`${reportGenerated ? 'mb-6' : ''}`}>
            {!reportGenerated && (
              <div className="mb-5">
                <p className="font-display font-700 text-navy-900 text-xs mb-3 uppercase tracking-wider">Configure Your Report</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Report Type */}
                  <div>
                    <label className="block text-xs font-600 text-navy-700 mb-2">Report Type</label>
                    <div className="space-y-2">
                      {REPORT_TYPES.map((rt) => (
                        <button
                          key={rt.value}
                          onClick={() => setReportConfig(prev => ({ ...prev, reportType: rt.value as ReportConfig['reportType'] }))}
                          className={`w-full text-left p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                            reportConfig.reportType === rt.value
                              ? 'border-blue-400 bg-blue-50 text-blue-800' :'border-gray-200 bg-gray-50 text-navy-700 hover:border-gray-300 hover:bg-white'
                          }`}
                        >
                          <p className="text-xs font-display font-700 leading-tight">{rt.label}</p>
                          <p className="text-navy-500 mt-0.5 leading-snug" style={{ fontSize: '10px' }}>{rt.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Hearing Type + Data Sources */}
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block text-xs font-600 text-navy-700 mb-2">Hearing Type</label>
                      <select
                        value={reportConfig.hearingType}
                        onChange={(e) => setReportConfig(prev => ({ ...prev, hearingType: e.target.value }))}
                        className="input-navy text-xs py-2.5 w-full"
                      >
                        {HEARING_TYPES.map((ht) => (
                          <option key={ht} value={ht}>{ht}</option>
                        ))}
                      </select>
                    </div>

                    {/* Data Sources */}
                    <div>
                      <label className="block text-xs font-600 text-navy-700 mb-2">Data Sources Included</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { icon: 'FolderOpenIcon', label: 'Case Management', color: 'text-blue-500' },
                          { icon: 'CalendarDaysIcon', label: 'Court Dates', color: 'text-orange-500' },
                          { icon: 'ClockIcon', label: 'Timeline Events', color: 'text-purple-500' },
                          { icon: 'BanknotesIcon', label: 'Finance Tracker', color: 'text-green-500' },
                          { icon: 'UserGroupIcon', label: 'Child Contacts', color: 'text-teal-500' },
                          { icon: 'ChatBubbleLeftRightIcon', label: 'Comm. Logger', color: 'text-blue-500' },
                          { icon: 'LockClosedIcon', label: 'Secure Vault', color: 'text-gold-600' },
                          { icon: 'DocumentTextIcon', label: 'Documents', color: 'text-navy-500' },
                        ].map((src) => (
                          <div key={src.label} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                            <Icon name={src.icon as any} size={11} className={src.color} />
                            <span className="text-navy-600 truncate" style={{ fontSize: '10px' }}>{src.label}</span>
                            <Icon name="CheckCircleIcon" size={10} className="text-green-500 flex-shrink-0 ml-auto" />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Court-ready badge */}
                    <div className="rounded-xl p-3 border border-blue-200 bg-blue-50">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Icon name="ShieldCheckIcon" size={14} className="text-blue-600" />
                        <p className="text-xs font-display font-700 text-blue-800">Court-Ready Format</p>
                      </div>
                      <ul className="space-y-1">
                        {[
                          'Formal UK family court language',
                          'Numbered sections & sub-sections',
                          'Legislation references included',
                          'Timestamped & case-referenced',
                          'PDF export for court submission',
                        ].map((item) => (
                          <li key={item} className="flex items-center gap-1.5 text-blue-700" style={{ fontSize: '10px' }}>
                            <Icon name="CheckIcon" size={9} className="text-blue-500 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Report Output */}
        {reportGenerated && (
          <div>
            {isFetchingData ? (
              /* ── Phase 1: Cross-tool data fetch skeleton ── */
              <div className="flex flex-col gap-4 py-6">
                <div className="flex items-center gap-3 mb-1">
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-display font-700 text-navy-800">Fetching case data from all tools…</p>
                    <p className="text-navy-400 mt-0.5" style={{ fontSize: '10px' }}>Pulling live data across 8 tools before generating your report</p>
                  </div>
                </div>
                {/* Data source chips loading */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { icon: 'FolderOpenIcon', label: 'Case Management', color: 'text-blue-500', delay: '0ms' },
                    { icon: 'CalendarDaysIcon', label: 'Court Dates', color: 'text-orange-500', delay: '100ms' },
                    { icon: 'ClockIcon', label: 'Timeline Events', color: 'text-purple-500', delay: '200ms' },
                    { icon: 'BanknotesIcon', label: 'Finance Tracker', color: 'text-green-500', delay: '300ms' },
                    { icon: 'UserGroupIcon', label: 'Child Contacts', color: 'text-teal-500', delay: '400ms' },
                    { icon: 'ChatBubbleLeftRightIcon', label: 'Comms Logger', color: 'text-blue-500', delay: '500ms' },
                    { icon: 'LockClosedIcon', label: 'Secure Vault', color: 'text-gold-600', delay: '600ms' },
                    { icon: 'DocumentTextIcon', label: 'Documents', color: 'text-navy-500', delay: '700ms' },
                  ].map((src) => (
                    <div
                      key={src.label}
                      className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-gray-50 border border-gray-200 animate-pulse"
                      style={{ animationDelay: src.delay }}
                    >
                      <Icon name={src.icon as any} size={11} className={src.color} />
                      <span className="text-navy-500 truncate" style={{ fontSize: '10px' }}>{src.label}</span>
                    </div>
                  ))}
                </div>
                {/* Skeleton lines */}
                <div className="flex flex-col gap-2 mt-2">
                  {[92, 78, 85, 60].map((w, i) => (
                    <div
                      key={i}
                      className="h-3 rounded-lg bg-gray-100 animate-pulse"
                      style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
                    />
                  ))}
                </div>
              </div>
            ) : (isGenerating || aiLoading) && !reportText ? (
              /* ── Phase 2: AI generation starting (no text yet) ── */
              <div className="flex flex-col gap-3 py-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-navy-500 text-xs ml-1">
                    {reportConfig.reportType === 'full' && totalChunks > 1
                      ? `Generating section ${currentChunk} of ${totalChunks}…`
                      : 'Composing court report…'}
                  </span>
                </div>
                {reportConfig.reportType === 'full' && totalChunks > 1 && (
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${((currentChunk - 1) / totalChunks) * 100}%` }}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  <div className="h-7 rounded-lg bg-gray-200 animate-pulse w-2/5" />
                  {[88, 72, 80, 65, 75].map((w, i) => (
                    <div key={i} className="h-3 rounded-lg bg-gray-100 animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 60}ms` }} />
                  ))}
                  <div className="h-7 rounded-lg bg-gray-200 animate-pulse w-1/3 mt-2" />
                  {[70, 85, 60].map((w, i) => (
                    <div key={i} className="h-3 rounded-lg bg-gray-100 animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 60}ms` }} />
                  ))}
                </div>
              </div>
            ) : reportText ? (
              <div>
                {/* Report meta bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Icon name="DocumentCheckIcon" size={14} className="text-blue-600" />
                    <span className="text-xs font-display font-700 text-blue-800">
                      {REPORT_TYPES.find(r => r.value === reportConfig.reportType)?.label}
                    </span>
                    <span className="text-blue-400">·</span>
                    <span className="text-xs text-blue-700">{reportConfig.hearingType}</span>
                  </div>
                  <span className="text-blue-600" style={{ fontSize: '10px' }}>
                    Generated: {reportGeneratedAt?.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Retry indicator */}
                {retryInfo && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="w-3 h-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin flex-shrink-0" />
                    <span className="text-amber-700 text-xs font-600">Network issue detected — retrying automatically ({retryInfo.attempt}/{retryInfo.maxRetries})…</span>
                  </div>
                )}

                {/* Section progress bar (during chunked generation) */}
                {(isGenerating || aiLoading) && reportConfig.reportType === 'full' && totalChunks > 1 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-navy-500 text-xs">Generating section {currentChunk} of {totalChunks}</span>
                      <span className="text-navy-400 text-xs">{Math.round(((currentChunk - 1) / totalChunks) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${((currentChunk - 1) / totalChunks) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Streaming indicator */}
                {(isGenerating || aiLoading) && (
                  <div className="flex items-center gap-1.5 mb-3">
                    <div className="w-1.5 h-3.5 bg-blue-500 animate-pulse rounded-sm" />
                    <span className="text-navy-400 text-xs">Generating…</span>
                  </div>
                )}

                {/* Error recovery banner */}
                {generationError && !isGenerating && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200">
                    <div className="flex items-start gap-2 mb-2">
                      <Icon name="ExclamationTriangleIcon" size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-display font-700 text-red-800">Generation interrupted</p>
                        <p className="text-red-600 mt-0.5" style={{ fontSize: '10px' }}>
                          {reportText ? 'Partial report saved below. You can resume from where it stopped, or regenerate the full report.' : 'Report could not be generated. Please try again.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {reportText && savedContext && (
                        <button
                          onClick={handleResumeGeneration}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-600 text-xs hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                          <Icon name="ArrowPathIcon" size={11} className="text-white" />
                          Resume Generation
                        </button>
                      )}
                      <button
                        onClick={handleGenerateReport}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-300 text-red-700 font-600 text-xs hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Icon name="ArrowPathIcon" size={11} />
                        Regenerate Full Report
                      </button>
                    </div>
                  </div>
                )}

                {/* Report content */}
                <div
                  className="rounded-xl border border-gray-200 bg-white p-5 overflow-y-auto"
                  style={{ maxHeight: '600px' }}
                >
                  <div className="prose prose-sm max-w-none text-navy-800 leading-relaxed">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => <h1 className="font-display font-800 text-navy-900 text-base border-b border-gray-200 pb-2 mb-3">{children}</h1>,
                        h2: ({ children }) => <h2 className="font-display font-700 text-navy-900 text-sm mt-5 mb-2 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-blue-500 flex-shrink-0" />{children}</h2>,
                        h3: ({ children }) => <h3 className="font-display font-600 text-navy-800 text-xs mt-3 mb-1.5">{children}</h3>,
                        p: ({ children }) => <p className="text-xs text-navy-700 leading-relaxed mb-2">{children}</p>,
                        li: ({ children }) => <li className="text-xs text-navy-700 leading-relaxed">{children}</li>,
                        strong: ({ children }) => <strong className="font-700 text-navy-900">{children}</strong>,
                      }}
                    >
                      {reportText}
                    </ReactMarkdown>
                    {(isGenerating || aiLoading) && (
                      <span className="inline-block w-1.5 h-3.5 bg-blue-500 ml-0.5 animate-pulse rounded-sm align-middle" />
                    )}
                  </div>
                </div>

                {/* Footer note */}
                {!isGenerating && !aiLoading && !generationError && (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-navy-400" style={{ fontSize: '10px' }}>
                      AI-generated from live case data · Not legal advice · Verify before court submission
                    </p>
                    <button
                      onClick={() => { setReportGenerated(false); setReportText(''); setGenerationError(null); setSavedContext(null); }}
                      className="text-navy-400 hover:text-navy-600 transition-colors font-600"
                      style={{ fontSize: '10px' }}
                    >
                      ← Reconfigure
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Empty state */}
        {!reportGenerated && (
          <div className="flex flex-col items-center justify-center py-6 text-center border-t border-gray-100 mt-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, #1e3a5f22, #2563eb22)' }}>
              <Icon name="DocumentCheckIcon" size={22} className="text-blue-600" />
            </div>
            <p className="font-display font-700 text-navy-900 text-sm mb-1">Ready to Generate</p>
            <p className="text-navy-500 text-xs max-w-sm leading-relaxed">
              Select your report type and hearing above, then click <strong>Generate Court Report</strong> to pull data from all your tools and create a court-ready document.
            </p>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)' }}>
                <Icon name="EnvelopeIcon" size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-display font-700 text-navy-900 text-sm">Email Court Report</h3>
                <p className="text-navy-500 text-xs mt-0.5">Send a formatted report via email</p>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-3 mb-4 border border-blue-200">
              <p className="text-xs font-600 text-blue-800 mb-1">Report includes:</p>
              <ul className="space-y-1">
                {[
                  `${REPORT_TYPES.find(r => r.value === reportConfig.reportType)?.label}`,
                  `Prepared for: ${reportConfig.hearingType}`,
                  'All sections with case data',
                  'Timestamp & case reference',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-xs text-blue-700">
                    <Icon name="CheckCircleIcon" size={11} className="text-blue-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <label className="block text-xs font-600 text-navy-700 mb-1.5">Recipient Email Address</label>
            <input
              type="email"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              placeholder="email@example.com"
              className="input-navy w-full text-sm mb-4"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendEmail(); }}
            />

            <div className="flex gap-3">
              <button
                onClick={() => { setEmailModalOpen(false); setEmailAddress(''); }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-navy-700 font-600 text-sm hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={emailSending || !emailAddress.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-display font-700 text-sm text-white hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #1e3a5f, #2563eb)' }}
              >
                {emailSending ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Icon name="PaperAirplaneIcon" size={14} className="text-white" />
                    Send Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
