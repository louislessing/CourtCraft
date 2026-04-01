'use client';

import { useCallback, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface DashboardToolsContext {
  // Case Management
  cases: Array<{
    id: string;
    title: string;
    case_number?: string;
    case_type?: string;
    court_name?: string;
    applicant_name?: string;
    respondent_name?: string;
    status?: string;
    notes?: string;
  }>;
  // Timeline Events
  timelineEvents: Array<{
    id: string;
    event_date: string;
    event_title: string;
    event_type?: string;
    description?: string;
    has_evidence?: boolean;
  }>;
  // Finance Entries
  financeEntries: Array<{
    id: string;
    entry_date: string;
    description: string;
    amount: number;
    entry_type: 'income' | 'expense';
    category?: string;
  }>;
  // Court Dates
  courtDates: Array<{
    id: string;
    event_date: string;
    event_title: string;
    event_type?: string;
    is_urgent?: boolean;
    notes?: string;
  }>;
  // Child Contacts
  childContacts: Array<{
    id: string;
    child_name: string;
    contact_date: string;
    contact_type: string;
    status: string;
    notes?: string;
    location?: string;
  }>;
  // Communications
  communications: Array<{
    id: string;
    comm_date: string;
    comm_type: string;
    subject?: string;
    summary?: string;
    direction?: string;
  }>;
  // Secure Vault Files
  vaultFiles: Array<{
    id: string;
    file_name: string;
    context?: string;
    created_at: string;
    storage_path?: string;
    mime_type?: string;
    file_size?: number;
  }>;
  // Documents
  documents: Array<{
    id: string;
    title?: string;
    document_type?: string;
    created_at: string;
  }>;
}

export function useDashboardToolsContext(userId: string | undefined, activeCaseId: string | null) {
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);

  const fetchAllToolsContext = useCallback(async (): Promise<DashboardToolsContext> => {
    if (!userId) {
      return {
        cases: [], timelineEvents: [], financeEntries: [], courtDates: [],
        childContacts: [], communications: [], vaultFiles: [], documents: [],
      };
    }

    setIsLoading(true);
    try {
      const [
        casesResult,
        timelineResult,
        financeResult,
        courtDatesResult,
        childContactsResult,
        communicationsResult,
        vaultFilesResult,
        documentsResult,
      ] = await Promise.all([
        // All cases
        supabase
          .from('cases')
          .select('id, title, case_number, case_type, court_name, applicant_name, respondent_name, status, notes')
          .eq('user_id', userId),

        // Timeline events for active case
        activeCaseId
          ? supabase
              .from('timeline_events')
              .select('id, event_date, event_title, event_type, description, has_evidence')
              .eq('case_id', activeCaseId)
              .order('event_date', { ascending: false })
          : Promise.resolve({ data: [] }),

        // Finance entries for active case
        activeCaseId
          ? supabase
              .from('finance_entries')
              .select('id, entry_date, description, amount, entry_type, category')
              .eq('case_id', activeCaseId)
              .order('entry_date', { ascending: false })
          : Promise.resolve({ data: [] }),

        // Court dates for active case
        activeCaseId
          ? supabase
              .from('court_dates')
              .select('id, event_date, event_title, event_type, is_urgent, notes')
              .eq('case_id', activeCaseId)
              .order('event_date', { ascending: true })
          : Promise.resolve({ data: [] }),

        // Child contacts
        supabase
          .from('child_contacts')
          .select('id, child_name, contact_date, contact_type, status, notes, location')
          .eq('user_id', userId)
          .order('contact_date', { ascending: false }),

        // Communications for active case
        activeCaseId
          ? supabase
              .from('communications')
              .select('id, comm_date, comm_type, subject, summary, direction')
              .eq('case_id', activeCaseId)
              .order('comm_date', { ascending: false })
          : Promise.resolve({ data: [] }),

        // Secure vault files
        supabase
          .from('file_uploads')
          .select('id, file_name, context, created_at, storage_path, mime_type, file_size')
          .eq('user_id', userId)
          .like('context', 'dashboard-secure%')
          .order('created_at', { ascending: false }),

        // Documents from file_uploads with document-builder context
        supabase
          .from('file_uploads')
          .select('id, file_name, context, created_at')
          .eq('user_id', userId)
          .like('context', 'document-builder%')
          .order('created_at', { ascending: false }),
      ]);

      return {
        cases: casesResult.data || [],
        timelineEvents: timelineResult.data || [],
        financeEntries: financeResult.data || [],
        courtDates: courtDatesResult.data || [],
        childContacts: childContactsResult.data || [],
        communications: communicationsResult.data || [],
        vaultFiles: vaultFilesResult.data || [],
        documents: documentsResult.data?.map((f: any) => ({
          id: f.id,
          title: f.file_name,
          document_type: f.context,
          created_at: f.created_at,
        })) || [],
      };
    } catch (err) {
      console.error('Failed to fetch tools context:', err);
      return {
        cases: [], timelineEvents: [], financeEntries: [], courtDates: [],
        childContacts: [], communications: [], vaultFiles: [], documents: [],
      };
    } finally {
      setIsLoading(false);
    }
  }, [userId, activeCaseId, supabase]);

  return { fetchAllToolsContext, isLoading };
}

export function buildToolsContextSection(ctx: DashboardToolsContext): string {
  const lines: string[] = [];

  lines.push('\n\n--- LIVE DASHBOARD DATA (cross-reference this when answering) ---');

  // Cases
  if (ctx.cases.length > 0) {
    lines.push('\n## CASES');
    ctx.cases.forEach((c) => {
      lines.push(`- [${c.status?.toUpperCase() || 'UNKNOWN'}] "${c.title}"${c.case_number ? ` (Ref: ${c.case_number})` : ''}${c.case_type ? ` | Type: ${c.case_type}` : ''}${c.court_name ? ` | Court: ${c.court_name}` : ''}${c.applicant_name ? ` | Applicant: ${c.applicant_name}` : ''}${c.respondent_name ? ` | Respondent: ${c.respondent_name}` : ''}`);
      if (c.notes) lines.push(`  Notes: ${c.notes}`);
    });
  }

  // Court Dates
  if (ctx.courtDates.length > 0) {
    lines.push('\n## UPCOMING COURT DATES');
    ctx.courtDates.forEach((d) => {
      const dateStr = new Date(d.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      lines.push(`- ${dateStr}: "${d.event_title}"${d.event_type ? ` (${d.event_type})` : ''}${d.is_urgent ? ' ⚠️ URGENT' : ''}${d.notes ? ` — ${d.notes}` : ''}`);
    });
  }

  // Timeline Events
  if (ctx.timelineEvents.length > 0) {
    lines.push('\n## CASE TIMELINE EVENTS');
    ctx.timelineEvents.forEach((e) => {
      const dateStr = new Date(e.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      lines.push(`- ${dateStr}: "${e.event_title}"${e.event_type ? ` [${e.event_type}]` : ''}${e.has_evidence ? ' (has evidence)' : ''}${e.description ? ` — ${e.description}` : ''}`);
    });
  }

  // Finance
  if (ctx.financeEntries.length > 0) {
    const income = ctx.financeEntries.filter(f => f.entry_type === 'income').reduce((s, f) => s + (f.amount || 0), 0);
    const expenses = ctx.financeEntries.filter(f => f.entry_type === 'expense').reduce((s, f) => s + (f.amount || 0), 0);
    lines.push('\n## FINANCE TRACKER');
    lines.push(`Total Income: £${income.toFixed(2)} | Total Expenses: £${expenses.toFixed(2)} | Net: £${(income - expenses).toFixed(2)}`);
    lines.push('All entries:');
    ctx.financeEntries.forEach((f) => {
      const dateStr = new Date(f.entry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      lines.push(`- ${dateStr}: ${f.entry_type === 'income' ? '+' : '-'}£${f.amount?.toFixed(2)} — ${f.description}${f.category ? ` [${f.category}]` : ''}`);
    });
  }

  // Child Contacts
  if (ctx.childContacts.length > 0) {
    lines.push('\n## CHILD CONTACT TRACKER');
    const upcoming = ctx.childContacts.filter(c => c.status === 'scheduled' && new Date(c.contact_date) >= new Date());
    const completed = ctx.childContacts.filter(c => c.status === 'completed');
    const missed = ctx.childContacts.filter(c => c.status === 'missed');
    lines.push(`Summary: ${upcoming.length} upcoming, ${completed.length} completed, ${missed.length} missed`);
    ctx.childContacts.forEach((c) => {
      const dateStr = new Date(c.contact_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      lines.push(`- ${dateStr}: ${c.child_name} (${c.contact_type.replace('_', ' ')}) — Status: ${c.status}${c.location ? ` @ ${c.location}` : ''}${c.notes ? ` | ${c.notes}` : ''}`);
    });
  }

  // Communications
  if (ctx.communications.length > 0) {
    lines.push('\n## COMMUNICATION LOG');
    ctx.communications.forEach((c) => {
      const dateStr = new Date(c.comm_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      lines.push(`- ${dateStr}: [${c.comm_type?.toUpperCase() || 'COMM'}]${c.direction ? ` (${c.direction})` : ''}${c.subject ? ` "${c.subject}"` : ''}${c.summary ? ` — ${c.summary}` : ''}`);
    });
  }

  // Vault Files
  if (ctx.vaultFiles.length > 0) {
    lines.push('\n## SECURE VAULT');
    lines.push(`${ctx.vaultFiles.length} file(s) stored:`);
    ctx.vaultFiles.forEach((f) => {
      const folder = f.context?.replace('dashboard-secure/', '') || 'General';
      lines.push(`- "${f.file_name}" [${folder}]${f.mime_type ? ` (${f.mime_type})` : ''}${f.file_size ? ` ${Math.round(f.file_size / 1024)}KB` : ''}`);
    });
  }

  // Documents
  if (ctx.documents.length > 0) {
    lines.push('\n## DOCUMENT BUILDER');
    lines.push(`${ctx.documents.length} document(s) created:`);
    ctx.documents.forEach((d) => {
      lines.push(`- "${d.title || 'Untitled'}"${d.document_type ? ` [${d.document_type}]` : ''}`);
    });
  }

  lines.push('\n--- END LIVE DASHBOARD DATA ---');
  lines.push('\nCRITICAL INSTRUCTION: Cross-reference ALL of the above data when formulating your response. Mention specific dates, case numbers, party names, amounts, contact records, and events from the data wherever relevant. Provide case-specific, personalised advice — never give generic responses when case data is available. If the user\'s question relates to any data shown above, explicitly connect your advice to their actual case facts. NEVER truncate your response — complete every section, every analysis, every recommendation in full.');

  return lines.join('\n');
}

/**
 * Builds a focused prompt for generating proactive case insights,
 * timeline predictions, and next-step recommendations from all tool data.
 */
export function buildInsightsPrompt(ctx: DashboardToolsContext): string {
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const lines: string[] = [];
  lines.push(`Today is ${todayStr}. You are CourtCraft Advocate's AI Legal Assistant — a senior UK family law specialist.`);
  lines.push('');
  lines.push('Produce ONE complete case insights report with exactly FOUR sections. Write each section in full. Do not truncate, summarise, or stop early. Do not offer to continue. Output the complete report in a single response.');
  lines.push('');
  lines.push('**1. KEY CASE INSIGHTS** — 5 bullet points. Each bullet: state the observation with specific data reference, cite the relevant legislation/rule/case law, explain the practical impact, and flag any urgent issues.');
  lines.push('');
  lines.push('**2. TIMELINE PREDICTIONS** — 4 bullet points. Each bullet: identify the next procedural step with estimated timescale, explain what the court is likely to direct, predict CAFCASS involvement and hearing types (FHDRA/DRA/Final/FDR), and identify timetable risks.');
  lines.push('');
  lines.push('**3. EVIDENCE & PREPARATION GAPS** — 3 bullet points. Each bullet: identify what is missing, explain the legal significance with statute/case citation, specify exactly what evidence is needed and how to obtain it, and give a priority rating (CRITICAL/HIGH/MEDIUM).');
  lines.push('');
  lines.push('**4. NEXT STEPS** — 6 specific, prioritised, actionable recommendations ordered by urgency. Each step: state precisely what to do, cite the legal basis, specify the exact form/document required, state any filing fee, and give a concrete deadline.');
  lines.push('');
  lines.push('Rules: Reference actual dates, names, amounts, and events from the data. Use plain English with precise legal terminology. Go straight to section 1 — no preamble, no closing remarks.');
  lines.push('');
  lines.push('--- LIVE CASE DATA ---');

  // Cases
  if (ctx.cases.length > 0) {
    lines.push('\nCASES:');
    ctx.cases.forEach((c) => {
      lines.push(`- [${c.status?.toUpperCase() || 'UNKNOWN'}] "${c.title}"${c.case_type ? ` (${c.case_type})` : ''}${c.court_name ? ` at ${c.court_name}` : ''}${c.case_number ? ` ref ${c.case_number}` : ''}${c.applicant_name ? ` | Applicant: ${c.applicant_name}` : ''}${c.respondent_name ? ` | Respondent: ${c.respondent_name}` : ''}`);
      if (c.notes) lines.push(`  Notes: ${c.notes}`);
    });
  } else {
    lines.push('\nCASES: None recorded yet.');
  }

  // Court Dates
  if (ctx.courtDates.length > 0) {
    lines.push('\nCOURT DATES:');
    ctx.courtDates.forEach((d) => {
      const dateStr = new Date(d.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      const daysUntil = Math.ceil((new Date(d.event_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      lines.push(`- ${dateStr} (${daysUntil > 0 ? `in ${daysUntil} days` : daysUntil === 0 ? 'TODAY' : `${Math.abs(daysUntil)} days ago`}): "${d.event_title}"${d.event_type ? ` [${d.event_type}]` : ''}${d.is_urgent ? ' ⚠️ URGENT' : ''}${d.notes ? ` — ${d.notes}` : ''}`);
    });
  } else {
    lines.push('\nCOURT DATES: None recorded.');
  }

  // Timeline Events
  if (ctx.timelineEvents.length > 0) {
    const withEvidence = ctx.timelineEvents.filter(e => e.has_evidence).length;
    const withoutEvidence = ctx.timelineEvents.length - withEvidence;
    lines.push(`\nTIMELINE: ${ctx.timelineEvents.length} events (${withEvidence} with evidence, ${withoutEvidence} without — ${Math.round((withoutEvidence / ctx.timelineEvents.length) * 100)}% evidence gap)`);
    ctx.timelineEvents.forEach((e) => {
      const dateStr = new Date(e.event_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      lines.push(`- ${dateStr}: "${e.event_title}"${e.event_type ? ` [${e.event_type}]` : ''}${e.has_evidence ? ' ✓' : ' ✗ no evidence'}${e.description ? ` — ${e.description}` : ''}`);
    });
  } else {
    lines.push('\nTIMELINE: No events recorded.');
  }

  // Finance
  if (ctx.financeEntries.length > 0) {
    const income = ctx.financeEntries.filter(f => f.entry_type === 'income').reduce((s, f) => s + (f.amount || 0), 0);
    const expenses = ctx.financeEntries.filter(f => f.entry_type === 'expense').reduce((s, f) => s + (f.amount || 0), 0);
    const net = income - expenses;
    lines.push(`\nFINANCE: Income £${income.toFixed(2)}, Expenses £${expenses.toFixed(2)}, Net ${net >= 0 ? '+' : ''}£${net.toFixed(2)}`);
    ctx.financeEntries.forEach((f) => {
      const dateStr = new Date(f.entry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      lines.push(`- ${dateStr}: ${f.entry_type === 'income' ? '+' : '-'}£${f.amount?.toFixed(2)} ${f.description}${f.category ? ` [${f.category}]` : ''}`);
    });
  } else {
    lines.push('\nFINANCE: No entries recorded.');
  }

  // Child Contacts
  if (ctx.childContacts.length > 0) {
    const upcoming = ctx.childContacts.filter(c => c.status === 'scheduled' && new Date(c.contact_date) >= today).length;
    const missed = ctx.childContacts.filter(c => c.status === 'missed').length;
    const completed = ctx.childContacts.filter(c => c.status === 'completed').length;
    const missedRate = ctx.childContacts.length > 0 ? Math.round((missed / ctx.childContacts.length) * 100) : 0;
    lines.push(`\nCHILD CONTACTS: ${upcoming} upcoming, ${completed} completed, ${missed} missed (${missedRate}% missed rate)`);
    ctx.childContacts.forEach((c) => {
      const dateStr = new Date(c.contact_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      lines.push(`- ${dateStr}: ${c.child_name} (${c.contact_type.replace('_', ' ')}) — ${c.status}${c.location ? ` @ ${c.location}` : ''}${c.notes ? ` | ${c.notes}` : ''}`);
    });
  } else {
    lines.push('\nCHILD CONTACTS: None recorded.');
  }

  // Communications
  if (ctx.communications.length > 0) {
    lines.push(`\nCOMMUNICATIONS: ${ctx.communications.length} logged`);
    ctx.communications.forEach((c) => {
      const dateStr = new Date(c.comm_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      lines.push(`- ${dateStr}: [${c.comm_type?.toUpperCase() || 'COMM'}]${c.direction ? ` (${c.direction})` : ''}${c.subject ? ` "${c.subject}"` : ''}${c.summary ? ` — ${c.summary}` : ''}`);
    });
  } else {
    lines.push('\nCOMMUNICATIONS: None logged.');
  }

  // Vault & Documents
  if (ctx.vaultFiles.length > 0) {
    lines.push(`\nSECURE VAULT: ${ctx.vaultFiles.length} file(s):`);
    ctx.vaultFiles.forEach(f => {
      const folder = f.context?.replace('dashboard-secure/', '') || 'General';
      lines.push(`- "${f.file_name}" [${folder}]${f.mime_type ? ` (${f.mime_type})` : ''}`);
    });
  } else {
    lines.push('\nSECURE VAULT: No files stored.');
  }

  if (ctx.documents.length > 0) {
    lines.push(`\nDOCUMENTS BUILT: ${ctx.documents.length}:`);
    ctx.documents.forEach(d => lines.push(`- "${d.title || 'Untitled'}"${d.document_type ? ` [${d.document_type}]` : ''}`));
  } else {
    lines.push('\nDOCUMENTS BUILT: None.');
  }

  lines.push('\n--- END CASE DATA ---');
  lines.push('\nBegin the report now with **1. KEY CASE INSIGHTS**');

  return lines.join('\n');
}
