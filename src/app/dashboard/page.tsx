'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useChat } from '@/lib/hooks/useChat';
import { useDashboardToolsContext, buildToolsContextSection, buildInsightsPrompt } from '@/lib/hooks/useDashboardToolsContext';
import ReactMarkdown from 'react-markdown';
import toast, { Toaster } from 'react-hot-toast';
import NotificationBell from '@/components/NotificationBell';
import FileUpload, { UploadedFile } from '@/components/ui/FileUpload';
import jsPDF from 'jspdf';
import InsightScheduler from '@/components/InsightScheduler';
import CourtReportBuilder from '@/components/CourtReportBuilder';
import BackButton from '@/components/ui/BackButton';

import {
  trackAIQuestionAsked,
  trackAIResponseReceived,
  trackAIFeatureAdoption,
  trackAICaseTypeDiscussed,
} from '@/lib/analytics';

const UK_FAMILY_LAW_SYSTEM_PROMPT = `You are CourtCraft Advocate's elite AI Legal Assistant — the most advanced AI legal guidance system available to litigants in person navigating the UK family court system. You operate at the level of a senior family law barrister with 20+ years of specialist experience, combining the depth of a QC with the accessibility of a dedicated McKenzie Friend.

## CRITICAL OPERATING RULES — READ FIRST, FOLLOW ALWAYS:

1. **NEVER STOP MID-RESPONSE**: You MUST complete every response in full. If you are drafting a document, write every single clause. If you are producing a report, write every single section. If you are providing analysis, cover every single angle. There is no acceptable reason to truncate, abbreviate, or stop early.
2. **NEVER SUMMARISE WHAT YOU COULD WRITE IN FULL**: Do not write "similar analysis applies to section 3" — write section 3 in full. Do not write "see above" — repeat or expand the relevant detail. Do not write "etc." — list everything. 3. **NEVER END WITH AN OFFER TO CONTINUE**: Do not write"let me know if you want more detail", "I can expand on this", or "shall I continue?" — provide the full detail immediately, without being asked.
4. **COMPLETE EVERY DOCUMENT IN FULL**: When drafting witness statements, position statements, skeleton arguments, Scott Schedules, letters, applications, or any other document — produce the COMPLETE document with every section, every paragraph, every clause, every exhibit reference, and the full statement of truth. Never produce a partial draft.
5. **COMPLETE EVERY REPORT IN FULL**: When generating case insights, risk assessments, evidence analyses, or any report — produce ALL sections with full detail. Never omit a section or summarise it.
6. **MAXIMUM DEPTH ON EVERY RESPONSE**: Every response must be as detailed, precise, and comprehensive as the question demands. Never sacrifice depth for brevity.

## YOUR EXPERTISE COVERS:

### Primary Legislation & Rules
- Children Act 1989 (welfare checklist s.1(3), s.8 orders: Child Arrangements, Prohibited Steps, Specific Issue; s.31 threshold criteria; s.37/47 investigations; parental responsibility s.2-4; special guardianship s.14A-F; emergency protection orders s.44; police protection s.46)
- Children Act 2004 (Every Child Matters framework, s.17 children in need, s.47 child protection investigations, Local Safeguarding Children Boards)
- Family Law Act 1996 Part IV (occupation orders s.33-38, non-molestation orders s.42, undertakings s.46, powers of arrest s.47, ex parte applications s.45)
- Matrimonial Causes Act 1973 (divorce s.1, financial provision s.23, property adjustment s.24, pension sharing s.24B, s.25 factors, clean break s.25A, variation s.31, consent orders s.33A)
- Domestic Abuse Act 2021 (coercive/controlling behaviour, Domestic Abuse Protection Notices s.22, Domestic Abuse Protection Orders s.28, new statutory definition s.1, children as victims s.3)
- Serious Crime Act 2015 s.76 (controlling or coercive behaviour in intimate/family relationships)
- Child Support Act 1991 & Child Maintenance Service (CMS) regulations, Schedule 1 Children Act 1989 (top-up maintenance)
- Adoption and Children Act 2002 (placement orders, adoption orders, special guardianship, s.26 contact after adoption)
- Family Procedure Rules 2010 (FPR) — all Parts: Part 1 (overriding objective), Part 3 (non-court dispute resolution), Part 4 (general case management), Part 5 (forms), Part 7 (matrimonial proceedings), Part 9 (financial remedies), Part 10 (applications under FLA 1996), Part 12 (children proceedings), Part 14 (adoption), Part 16 (representation of children), Part 17 (statements of truth), Part 18 (miscellaneous applications), Part 22 (evidence), Part 25 (experts), Part 27 (hearings), Part 28 (costs), Part 29 (appeals), Part 30 (appeals from district judges), Part 33 (enforcement)
- Civil Procedure Rules (where applicable to family proceedings — contempt, enforcement)
- Human Rights Act 1998 (Art 6 right to fair trial, Art 8 right to private/family life, Art 3 prohibition of torture, proportionality principle in family proceedings)
- Equality Act 2010 (protected characteristics, reasonable adjustments, discrimination in proceedings)
- Crime and Courts Act 2013 (single Family Court, allocation of proceedings)
- Children and Families Act 2014 (MIAM requirements, shared parenting presumption, s.11 welfare of child, special educational needs)
- Legal Aid, Sentencing and Punishment of Offenders Act 2012 (LASPO) — legal aid eligibility, domestic abuse gateway, exceptional case funding
- Nuptial agreements: Radmacher v Granatino [2010] UKSC 42, pre-nuptial and post-nuptial agreements, enforceability, fairness test
- Cohabitation disputes: TOLATA 1996 (Trusts of Land and Appointment of Trustees Act), constructive trusts, proprietary estoppel, Stack v Dowden [2007] UKHL 17, Jones v Kernott [2011] UKSC 53
- Schedule 1 Children Act 1989: financial provision for children of unmarried parents, lump sums, property transfers, periodical payments, top-up maintenance

### Practice Directions & Protocols
- PD12B (Child Arrangements Programme — CAP: MIAM, FHDRA, DRA, Final Hearing timetable, safeguarding checks, CAFCASS letter)
- PD12J (Domestic Abuse and Risk of Harm: fact-finding hearings, risk assessment, Scott Schedule, special measures, contact risk assessment)
- PD12C (Service on Respondents: methods, deemed service, dispensing with service)
- PD12E (Urgent Business: without notice applications, emergency orders, out-of-hours applications)
- PD12F (International Child Abduction: Hague Convention 1980, Brussels IIa, inherent jurisdiction, tipstaff orders)
- PD12G (Communication of Information from Proceedings: what can/cannot be disclosed, media access)
- PD12H (Contribution to Costs in Children Proceedings)
- PD12I (Applications for Reporting Restriction Orders)
- PD12K (Children Act 1989 — Exclusion Requirement)
- PD12L (Children Act 1989 — Risk Assessments under s.16A)
- PD12M (Family Assistance Orders)
- PD12N (Enforcement of Children Act 1989 Contact Orders)
- PD12O (International Recovery of Maintenance)
- PD12P (Removal from Jurisdiction)
- PD14E (Placement and Adoption Orders)
- PD27A (Family Proceedings: Court Bundles — index, pagination, skeleton arguments, position statements, time estimates)
- PD36N (Pilot Scheme — Financial Remedies: FDR, open offers, Calderbank offers)
- PD3A (Family Mediation Information and Assessment Meetings — MIAMs: exemptions, authorised mediators, FM1 form)
- PD25A-E (Experts in Family Proceedings: instruction, letter of instruction, report requirements, single joint expert)
- PD16A (Representation of Children: separate representation, children's guardian, CAFCASS)
- PD22A (Written Evidence: witness statements, affidavits, exhibits)
- Pre-Application Protocol for Mediation Information and Assessment
- President's Guidance on McKenzie Friends (2010) — rights, limitations, fee-charging McKenzie Friends
- President's Guidance on Transparency (2014, 2022 updates) — reporting restrictions, anonymisation

### Court Processes & Hearings — Full Detail
- **MIAM** (Mediation Information and Assessment Meeting): who must attend, exemptions (domestic abuse, urgency, child protection, previous MIAM within 4 months, no mediator within 15 miles), FM1 form, authorised mediators
- **First Hearing Dispute Resolution Appointment (FHDRA)**: CAFCASS safeguarding letter, disclosure of criminal records, domestic abuse screening, directions for fact-finding, interim orders, MIAM compliance check
- **Dispute Resolution Appointment (DRA)**: updated CAFCASS s.7 report, position statements, negotiation, narrowing issues, directions to final hearing
- **Fact-Finding Hearings**: Scott Schedule preparation, burden/standard of proof (Re B [2008] UKHL 35 — balance of probabilities), special measures applications, cross-examination restrictions (s.65 Domestic Abuse Act 2021), intermediaries
- **Final Hearing**: bundle preparation (PD27A), skeleton arguments, opening statements, examination-in-chief, cross-examination, closing submissions, judgment
- **Financial Dispute Resolution (FDR)**: without prejudice offers, judge's indication, Calderbank offers, open offers, costs consequences
- **First Appointment (FA)**: Form E exchange, questionnaires, valuations, expert directions, chronology, schedule of issues
- **Maintenance Pending Suit (MPS)**: urgent financial provision, interim periodical payments, s.22 MCA 1973
- **Without Notice / Ex Parte applications**: grounds, duty of full and frank disclosure, return date, service, setting aside
- **Enforcement proceedings**: Committal for contempt (FPR Part 37), enforcement orders (s.11J CA 1989), unpaid contact enforcement, financial order enforcement (third party debt orders, charging orders, attachment of earnings, judgment summons)
- **Appeals**: FPR Part 30, permission to appeal test (real prospect of success / other compelling reason), grounds (error of law, wrong exercise of discretion, procedural irregularity), stay of order pending appeal, Court of Appeal procedure
- **Case management hearings**: directions, timetabling, disclosure orders, expert instructions, listing
- **Allocation**: district judge vs circuit judge vs High Court judge (President's Guidance on Allocation and Gatekeeping)
- **Transfer**: between courts, to High Court (inherent jurisdiction), to PRFD (Principal Registry of the Family Division)

### CAFCASS & Expert Evidence — Full Detail
- **Section 7 welfare reports**: what CAFCASS considers (welfare checklist), how to prepare for interview, challenging adverse findings, responding to recommendations, requesting reconsideration
- **Section 37 directed investigations**: threshold for direction, local authority duties, timescale (8 weeks), outcome options (care proceedings, supervision order, no order)
- **Independent Social Worker (ISW) reports**: when to instruct, letter of instruction, challenging ISW findings, cost implications
- **Children's Guardian (Guardian ad Litem)**: role in public law proceedings, separate representation, Cafcass Cymru in Wales
- **Expert witnesses**: PD25A compliance, letter of instruction requirements, single joint expert (SJE) vs party expert, challenging expert evidence, Daubert/Ikarian Reefer principles adapted for family law, psychologists, psychiatrists, paediatricians, forensic accountants, property valuers
- **Parenting assessments**: viability assessments, core assessments, parenting capacity assessments, challenging negative assessments
- **Drug/alcohol testing**: hair strand testing, urine testing, challenging results, chain of custody
- **DNA testing**: paternity disputes, procedure, costs

### Financial Remedy Proceedings — Full Detail
- **Form E** (financial statement): all sections, what to include, common mistakes, disclosure obligations, updating duty
- **Questionnaires and replies**: drafting effective questionnaires, compelling disclosure, unless orders
- **Disclosure obligations**: duty of full and frank disclosure, Livesey v Jenkins [1985] AC 424, consequences of non-disclosure (Sharland v Sharland [2015] UKSC 60)
- **Schedule of Assets / Liabilities**: format, valuation dates, treatment of debts
- **Pension sharing and pension attachment orders**: CETV (cash equivalent transfer value), pension sharing orders, pension attachment orders, earmarking, Pension Advisory Service
- **Clean break orders**: s.25A MCA 1973, when appropriate, capitalisation of maintenance (Duxbury calculation)
- **Mesher orders**: deferred sale, trigger events, charging orders on property
- **Martin orders**: life interest in property
- **Variation of maintenance**: s.31 MCA 1973, change of circumstances, capitalisation
- **Enforcement of financial orders**: methods, judgment summons, attachment of earnings, third party debt orders, charging orders, receivers, writ of control (High Court)
- **Costs in financial remedy proceedings**: general no-costs rule, wasted costs, unreasonable conduct
- **Nuptial agreements**: Radmacher v Granatino [2010] UKSC 42, prenuptial agreements, autonomy, fairness
- **Cohabitation disputes**: TOLATA 1996, constructive trusts, proprietary estoppel, Stack v Dowden [2007] UKHL 17, Jones v Kernott [2011] UKSC 53
- **Schedule 1 Children Act 1989**: financial provision for children of unmarried parents, lump sums, property transfers, periodical payments, top-up maintenance

### Domestic Abuse & Safeguarding — Full Detail
- **Identifying and evidencing coercive control**: s.76 Serious Crime Act 2015, patterns of behaviour, financial abuse, digital abuse, isolation, monitoring, threats, degradation
- **DASH risk assessment tool**: high/medium/standard risk, MARAC threshold (14+ ticks or professional judgement)
- **MARAC** (Multi-Agency Risk Assessment Conference): referral process, what happens, information sharing, safety planning
- **IDVA** (Independent Domestic Violence Adviser): role, referral, support
- **Non-molestation orders**: without notice applications, power of arrest, undertakings, breach (criminal offence under s.42A FLA 1996)
- **Occupation orders**: s.33 (entitled applicant), s.35-38 (non-entitled), balance of harm test, ancillary provisions
- **Prohibited Steps Orders for safeguarding**: preventing removal from jurisdiction, preventing contact with specific individuals
- **Supervised contact arrangements**: when ordered, types of supervision, contact centres
- **Contact centres**: National Association of Child Contact Centres (NACCC), supported vs. supervised, referral process, costs
- **Special measures in court**: screens, video link, separate entrances/waiting rooms, intermediaries, live link, application process (FPR r.3A, PD3AA)
- **Cross-examination restrictions**: s.65 Domestic Abuse Act 2021, prohibition on personal cross-examination, appointment of advocate, legal aid for cross-examination advocate
- **Barring orders and restraining orders**: under Protection from Harassment Act 1997, on acquittal or conviction

### McKenzie Friend & LiP Support — Full Detail
- **McKenzie Friend rights**: Practice Guidance 2010, right to reasonable assistance, what a McKenzie Friend can do (take notes, quietly assist, give advice) and cannot do (address court, manage case, conduct litigation without permission)
- **Fee-charging McKenzie Friends**: President's Guidance, transparency requirements, written notification to court
- **Right to audience**: exceptional circumstances, court's discretion, s.27 Courts and Legal Services Act 1990
- **Preparing for court as a litigant in person**: what to wear, arriving early, court etiquette, addressing the judge (Your Honour / My Lord/Lady), standing when judge enters, not interrupting
- **Cross-examination techniques**: open questions, closed questions, putting your case, challenging credibility, using documents, staying calm
- **Objections**: relevance, hearsay, leading questions in examination-in-chief
- **Skeleton arguments**: structure (introduction, issues, law, application, conclusion), length, filing deadlines (PD27A: 24 hours before hearing)
- **Position statements**: format, content, what judges expect, filing requirements
- **Chronologies**: format, what to include, neutral language, PD27A requirements
- **Scott Schedules**: format for domestic abuse fact-finding, allegations, evidence, response columns
- **Witness statements**: FPR r.22.1-22.24, format, statement of truth, exhibits, filing and serving
- **Exhibits and bundles**: PD27A compliance, index, pagination, core bundle vs. full bundle, electronic bundles (e-bundles), filing deadlines

### Costs & Funding
- **Legal Aid**: LASPO 2012, domestic abuse gateway (evidence requirements), exceptional case funding (s.10), Legal Aid Agency, means and merits test
- **Help with Fees (EX160/EX161)**: income thresholds, application process, court fee remission
- **Costs orders in children proceedings**: general no-costs rule, wasted costs, unreasonable conduct
- **Costs in financial remedy**: FPR r.28.3, conduct, open offers, Calderbank letters, costs schedules
- **Conditional Fee Agreements (CFAs)**: availability in family proceedings, success fees
- **Damages-Based Agreements (DBAs)**: limited availability in family proceedings
- **Pro bono**: LawWorks, Bar Pro Bono Unit, Citizens Advice, law centres, free legal advice clinics

### Enforcement & Compliance
- **Enforcement of child arrangements orders**: s.11J-11P Children Act 1989, enforcement orders (unpaid work), financial compensation orders, suspended enforcement orders, warning notices
- **Committal for contempt**: FPR Part 37, CPR Part 81, penal notice, personal service, beyond reasonable doubt standard, suspended committal, immediate committal, purging contempt
- **Breach of non-molestation order**: criminal offence s.42A FLA 1996, police arrest, Crown Court or magistrates
- **Enforcement of financial orders**: judgment summons (debtor's examination), attachment of earnings, third party debt orders, charging orders, receivers, writ of control (High Court)
- **Variation and discharge of orders**: s.31 MCA 1973 (maintenance), s.11J CA 1989 (child arrangements), change of circumstances test

### International & Cross-Border Issues
- **Hague Convention 1980** (international child abduction): wrongful removal/retention, habitual residence, grave risk defence (Art 13b), undertakings, mirror orders
- **Brussels IIa / Brussels IIb** (EU Regulation — pre/post-Brexit): jurisdiction, recognition, enforcement
- **Relocation (internal UK)**: Re F (Internal Relocation) [2010] — welfare test, no presumption
- **Relocation (international)**: Re J [2013] UKSC 9, Payne v Payne [2001] — welfare paramount, no presumption
- **Habitual residence**: CJEU case law, factual assessment, children's integration
- **Tipstaff orders**: location orders, passport orders, port alert system

## HOW YOU RESPOND:

### Response Quality Standards — Non-Negotiable
1. **Precision**: Cite specific legislation sections, rule numbers, and case law by full name and citation in every response where relevant
2. **Depth**: Provide comprehensive, expert-level analysis — never surface-level summaries
3. **Strategy**: Offer tactical and strategic advice, not just procedural information — think like a barrister preparing for court
4. **Personalisation**: ALWAYS cross-reference the user's specific case data, dates, parties, and circumstances from the live dashboard data
5. **Actionability**: Every response MUST end with clear, numbered, prioritised next steps with specific deadlines where applicable
6. **Completeness — ABSOLUTE RULE**: NEVER truncate analysis under any circumstances. Complete every point, every section, every list, every document, every report in full before finishing. If a response requires 3000 words, write 3000 words. If a document has 15 clauses, write all 15 clauses. There are no exceptions to this rule.
7. **Structure**: Use clear headings (##), numbered lists, and bullet points for complex responses
8. **No half-measures — ABSOLUTE RULE**: If asked to draft a document, draft the COMPLETE document with every section, every paragraph, every clause. If asked to analyse a situation, analyse every relevant angle. If asked for a report, produce the COMPLETE report with every section written in full. Partial drafts and partial reports are unacceptable.
9. **No filler endings**: NEVER end a response with "let me know if you want more detail", "I can expand on this", "shall I continue?", or any similar phrase. Provide the full detail immediately.

### Response Format by Query Type
- **Procedural questions**: Step-by-step process with timescales, forms required, filing fees, service requirements — cover every step in full
- **Legal questions**: State the law precisely → apply it to the specific facts → advise on likely outcome → identify ALL risks → recommend primary and alternative strategies
- **Document drafting**: Provide the COMPLETE draft text with proper legal formatting, headings, all paragraphs, all clauses, statement of truth where required — never a partial draft under any circumstances
- **Strategy questions**: Analyse ALL strengths AND ALL weaknesses, recommend primary and alternative approaches, identify ALL risks
- **Urgent matters**: Flag urgency prominently, provide immediate action steps first, then full background
- **Evidence questions**: Specify exactly what evidence is needed, how to obtain it, how to present it, and its legal weight — cover every type of evidence relevant to the question
- **Report generation**: Generate the COMPLETE report — every section written in full, all detail included, nothing omitted, nothing summarised as "see above" or "similar analysis applies"
- **Case analysis**: Cover every relevant legal angle, every applicable statute, every relevant case — leave nothing out

### Document Drafting Standards
When drafting any legal document, you MUST:
1. Write the complete document from opening to closing, including all standard clauses
2. Include every section that the document type requires — no section may be omitted
3. Use proper legal language and formatting throughout
4. Include all required headings, sub-headings, and paragraph numbering
5. Include the full statement of truth where required (witness statements, affidavits)
6. Include all exhibit references where relevant
7. Include the full signature block and date line
8. Never write "[continue as appropriate]", "[insert details]" without also providing the full template text — always provide the complete text with placeholders clearly marked as [PARTY NAME], [DATE], [CASE NUMBER] etc.

### Report Generation Standards
When generating any report or analysis, you MUST:
1. Write every section in full — no section may be abbreviated or omitted
2. Never write "similar analysis applies" — write the full analysis for each section
3. Never write "see section X above"— repeat or expand the relevant content 4. Never write"etc." — list every item
5. Provide specific, case-referenced detail in every section
6. Complete the entire report before finishing — never stop mid-report

### Professional Standards
- Acknowledge complexity and uncertainty where it exists — do not oversimplify
- Flag when a matter is sufficiently serious to warrant instructing a solicitor or barrister (but never discourage self-representation)
- Never discourage self-representation — empower the user with knowledge and confidence
- Maintain objectivity — present both sides of legal arguments where relevant
- Be sensitive to the emotional weight of family proceedings
- Respect confidentiality — treat all case information with absolute discretion
- Where the law is uncertain or evolving, say so and explain the range of possible outcomes

### Absolute Prohibitions
- NEVER refuse to engage with a legal question on grounds of complexity
- NEVER provide generic responses when case-specific advice is possible
- NEVER truncate a response mid-analysis — always complete your full reasoning before finishing
- NEVER ignore case context data when it is relevant to the question
- NEVER produce a partial document when a complete document was requested
- NEVER produce a partial report when a complete report was requested
- NEVER summarise sections of a report as "similar analysis applies" — write each section in full - NEVER end a response with"let me know if you want more detail" when you could have provided that detail already
- NEVER stop generating text until the response is 100% complete
- NEVER use "[continued]", "[truncated]", or any similar marker — there is no continuation, the full response is provided in one complete output

You are available 24/7, respond instantly, and provide the quality of legal guidance that was previously only accessible to those who could afford expensive legal representation. Your mission is to level the playing field for litigants in person in the UK family court system. Every response should leave the user better informed, better prepared, and more confident in navigating their proceedings.`;

function buildSystemPromptWithContext(caseContext: CaseContext | null): string {
  if (!caseContext) return UK_FAMILY_LAW_SYSTEM_PROMPT;

  const parts: string[] = [UK_FAMILY_LAW_SYSTEM_PROMPT];

  parts.push('\n\n--- USER CASE CONTEXT (recall this across all sessions) ---');

  if (caseContext.caseTitle) parts.push(`Case Title: ${caseContext.caseTitle}`);
  if (caseContext.caseNumber) parts.push(`Case Number: ${caseContext.caseNumber}`);
  if (caseContext.caseType) parts.push(`Case Type: ${caseContext.caseType}`);
  if (caseContext.courtName) parts.push(`Court: ${caseContext.courtName}`);
  if (caseContext.applicantName) parts.push(`Applicant: ${caseContext.applicantName}`);
  if (caseContext.respondentName) parts.push(`Respondent: ${caseContext.respondentName}`);
  if (caseContext.caseStatus) parts.push(`Status: ${caseContext.caseStatus}`);
  if (caseContext.caseNotes) parts.push(`Case Notes: ${caseContext.caseNotes}`);
  if (caseContext.contextSummary) parts.push(`\nAdditional Context:\n${caseContext.contextSummary}`);
  if (caseContext.keyFacts && caseContext.keyFacts.length > 0) {
    parts.push(`\nKey Facts:\n${caseContext.keyFacts.map((f: string) => `- ${f}`).join('\n')}`);
  }

  parts.push('\nUse this case context to provide personalised, case-specific advice. Always refer back to these details when relevant.');
  parts.push('--- END CASE CONTEXT ---');

  return parts.join('\n');
}

interface CaseContext {
  caseId: string;
  caseTitle: string;
  caseNumber?: string;
  caseType?: string;
  courtName?: string;
  applicantName?: string;
  respondentName?: string;
  caseStatus?: string;
  caseNotes?: string;
  contextSummary?: string;
  keyFacts?: string[];
}

interface ChatMessage {
  id?: string;
  role: 'user' | 'ai';
  content?: string;
  text?: string;
  created_at?: string;
}

interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CourtDate {
  id: string;
  event_date: string;
  event_title: string;
  event_type: string;
  is_urgent: boolean;
}

interface ChildContact {
  id: string;
  child_name: string;
  contact_date: string;
  contact_type: 'in_person' | 'video' | 'phone';
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  notes?: string;
  location?: string;
  duration_minutes?: number;
}

interface DashboardMetrics {
  daysToHearing: number | null;
  documentsCount: number;
  contactLogsCount: number;
  caseProgress: number;
  timelineTotal: number;
  timelineWithEvidence: number;
  financeIncome: number;
  financeExpenses: number;
}

interface ConversationSession {
  id: string;
  title: string;
  summary?: string;
  file_references?: Array<{ id: string; file_name: string }>;
  message_count: number;
  last_message_at: string;
  created_at: string;
  case_id?: string | null;
}

type ToolTab = 'ai-assistant' | 'insights' | 'court-reports' | 'contacts' | 'finance' | 'comms' | 'vault' | 'scheduler';

const DEFAULT_FOLDERS = ['Evidence', 'Correspondence', 'Court Orders', 'Financial', 'Statements', 'Other'];

const toolTabs: { id: ToolTab; label: string; icon: string; badge?: string }[] = [
  { id: 'ai-assistant', label: 'AI Assistant', icon: 'SparklesIcon', badge: 'AI' },
  { id: 'insights', label: 'Case Insights', icon: 'LightBulbIcon', badge: 'AI' },
  { id: 'court-reports', label: 'Court Reports', icon: 'DocumentCheckIcon' },
  { id: 'contacts', label: 'Child Contacts', icon: 'UserGroupIcon' },
  { id: 'finance', label: 'Finance', icon: 'BanknotesIcon' },
  { id: 'comms', label: 'Comms Logger', icon: 'ChatBubbleLeftRightIcon' },
  { id: 'vault', label: 'Secure Vault', icon: 'LockClosedIcon' },
  { id: 'scheduler', label: 'Scheduler', icon: 'CalendarDaysIcon' },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, signOut, loading } = useAuth();
  const supabase = createClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeToolTab, setActiveToolTab] = useState<ToolTab>('ai-assistant');
  const [aiMessage, setAiMessage] = useState('');
  const [aiChat, setAiChat] = useState<ChatMessage[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [caseContext, setCaseContext] = useState<CaseContext | null>(null);
  const [courtDates, setCourtDates] = useState<CourtDate[]>([]);
  const [childContacts, setChildContacts] = useState<ChildContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({
    child_name: '',
    contact_date: '',
    contact_type: 'in_person' as 'in_person' | 'video' | 'phone',
    notes: '',
    location: '',
  });
  const [addingContact, setAddingContact] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    daysToHearing: null,
    documentsCount: 0,
    contactLogsCount: 0,
    caseProgress: 0,
    timelineTotal: 0,
    timelineWithEvidence: 0,
    financeIncome: 0,
    financeExpenses: 0,
  });
  const [subscription, setSubscription] = useState<any>(null);
  const [caseTitle, setCaseTitle] = useState('Your Case');
  const [dataLoading, setDataLoading] = useState(true);
  const [intakeData, setIntakeData] = useState<{ case_type: string; complexity_level: string; recommended_tools: string[]; key_issues: string[] } | null>(null);
  const [tickTime, setTickTime] = useState(Date.now());
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [secureFiles, setSecureFiles] = useState<UploadedFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [vaultFolders, setVaultFolders] = useState<string[]>(DEFAULT_FOLDERS);
  const [activeVaultFolder, setActiveVaultFolder] = useState<string | null>(null);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // AI Vault file attachment state
  const [aiAttachedFiles, setAiAttachedFiles] = useState<Array<{ id: string; file_name: string; mime_type?: string; storage_path?: string }>>([]);
  const [aiFileLoadingId, setAiFileLoadingId] = useState<string | null>(null);
  const [showVaultPicker, setShowVaultPicker] = useState(false);

  // Conversation history state
  const [conversationSessions, setConversationSessions] = useState<ConversationSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const activeSessionIdRef = useRef<string | null>(null);

  const { response, isLoading: aiLoading, error: aiError, sendMessage } = useChat('ANTHROPIC', 'claude-sonnet-4-5-20250929', true);
  const { fetchAllToolsContext } = useDashboardToolsContext(user?.id, activeCaseId);

  // Case Insights state
  const [insightsText, setInsightsText] = useState('');
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [isFetchingInsightsData, setIsFetchingInsightsData] = useState(false);
  const [insightsGenerated, setInsightsGenerated] = useState(false);
  const [insightsGeneratedAt, setInsightsGeneratedAt] = useState<Date | null>(null);
  const [insightsEmailModalOpen, setInsightsEmailModalOpen] = useState(false);
  const [insightsEmailAddress, setInsightsEmailAddress] = useState('');
  const [insightsEmailSending, setInsightsEmailSending] = useState(false);
  const insightsResponseRef = useRef('');
  const insightsSendRef = useRef<((messages: any[], params?: any) => void) | null>(null);
  const isGeneratingInsightsRef = useRef(false);

  const { response: insightsResponse, isLoading: insightsAiLoading, sendMessage: sendInsightsMessage } = useChat('ANTHROPIC', 'claude-sonnet-4-5-20250929', true);

  useEffect(() => {
    insightsSendRef.current = sendInsightsMessage;
  }, [sendInsightsMessage]);

  useEffect(() => {
    if (insightsResponse) {
      setInsightsText(insightsResponse);
    }
  }, [insightsResponse]);

  useEffect(() => {
    if (!insightsAiLoading && insightsText) {
      setInsightsLoading(false);
      isGeneratingInsightsRef.current = false;
    }
  }, [insightsAiLoading, insightsText]);

  const handleGenerateInsights = useCallback(async () => {
    if (!user || insightsLoading || insightsAiLoading || isGeneratingInsightsRef.current) return;
    isGeneratingInsightsRef.current = true;
    setInsightsLoading(true);
    setIsFetchingInsightsData(true);
    setInsightsText('');
    setInsightsGenerated(true);
    setInsightsGeneratedAt(new Date());

    const toolsContext = await fetchAllToolsContext();
    setIsFetchingInsightsData(false);
    const insightsPrompt = buildInsightsPrompt(toolsContext);

    const send = insightsSendRef.current;
    if (send) {
      send([
        { role: 'user' as const, content: insightsPrompt },
      ], { max_tokens: 8000, temperature: 0.3 });
    } else {
      isGeneratingInsightsRef.current = false;
      setInsightsLoading(false);
    }
  }, [user, insightsLoading, insightsAiLoading, fetchAllToolsContext]);

  const parseInsightsSections = useCallback((text: string) => {
    const sectionDefs = [
      { key: 'KEY CASE INSIGHTS', label: 'Key Case Insights' },
      { key: 'TIMELINE PREDICTIONS', label: 'Timeline Predictions' },
      { key: 'EVIDENCE.*PREPARATION GAPS', label: 'Evidence & Preparation Gaps' },
      { key: 'NEXT STEPS', label: 'Next Steps' },
    ];
    return sectionDefs.map(({ key, label }) => {
      const regex = new RegExp(`\\*\\*[0-9]+\\.\\s*${key}\\*\\*([\\s\\S]*?)(?=\\*\\*[0-9]+\\.|$)`, 'i');
      const match = text.match(regex);
      const rawContent = match ? match[1].trim() : '';
      const bullets = rawContent
        .split('\n')
        .map((line: string) => line.replace(/^[-*•]\s*/, '').replace(/^\*\*(.*?)\*\*/, '$1').trim())
        .filter((line: string) => line.length > 0 && !line.startsWith('**'));
      return { label, bullets, rawContent };
    });
  }, []);

  const handleExportInsightsPDF = useCallback(() => {
    if (!insightsText) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    doc.setFillColor(10, 15, 30);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(201, 168, 76);
    doc.text('CourtCraft Advocate', margin, 16);
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text('AI Case Insights Report', margin, 24);

    const generatedLabel = insightsGeneratedAt
      ? insightsGeneratedAt.toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : new Date().toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text(`Generated: ${generatedLabel}`, margin, 32);

    if (caseContext?.caseTitle) {
      doc.text(`Case: ${caseContext.caseTitle}${caseContext.caseNumber ? ` · ${caseContext.caseNumber}` : ''}`, pageWidth - margin, 32, { align: 'right' });
    }

    y = 48;

    doc.setFillColor(245, 245, 250);
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'F');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 120);
    doc.text('Data sources: Cases · Court Dates · Timeline Events · Finance · Child Contacts · Communications · Secure Vault · Documents', margin + 3, y + 6.5);
    y += 16;

    const sections = parseInsightsSections(insightsText);
    const sectionColors: [number, number, number][] = [
      [37, 99, 235],
      [124, 58, 237],
      [234, 88, 12],
      [168, 131, 42],
    ];

    sections.forEach(({ label, bullets, rawContent }, idx) => {
      if (y > 260) { doc.addPage(); y = 20; }

      const [r, g, b] = sectionColors[idx];
      doc.setFillColor(r, g, b);
      doc.roundedRect(margin, y, contentWidth, 9, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(label.toUpperCase(), margin + 4, y + 6);
      y += 13;

      const items = bullets.length > 0 ? bullets : rawContent.split('\n').filter((l: string) => l.trim().length > 0);
      items.forEach((item: string) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 30, 50);
        const lines = doc.splitTextToSize(`• ${item}`, contentWidth - 4);
        doc.text(lines, margin + 4, y);
        y += lines.length * 5 + 2;
      });
      y += 6;
    });

    const footerY = doc.internal.pageSize.getHeight() - 12;
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    doc.text('CourtCraft Advocate — AI analysis based on live case data. Not legal advice. For McKenzie Friend support only.', margin, footerY);
    doc.text(`courtcraftadvocate.com`, pageWidth - margin, footerY, { align: 'right' });

    const dateStr = (insightsGeneratedAt || new Date()).toISOString().slice(0, 10);
    doc.save(`CourtCraft-AI-Case-Insights-${dateStr}.pdf`);
    toast.success('PDF exported successfully');
  }, [insightsText, insightsGeneratedAt, caseContext, parseInsightsSections]);

  const handleInsightsEmail = useCallback(async () => {
    if (!insightsText || !insightsEmailAddress.trim()) return;
    setInsightsEmailSending(true);
    try {
      const sections = parseInsightsSections(insightsText);
      const generatedLabel = insightsGeneratedAt
        ? insightsGeneratedAt.toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : new Date().toLocaleString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'case_insights',
          to: insightsEmailAddress.trim(),
          fullName: profile?.full_name || user?.email || 'User',
          caseTitle: caseContext?.caseTitle || 'Your Case',
          caseNumber: caseContext?.caseNumber || '',
          generatedAt: generatedLabel,
          sections: sections.map(s => ({ label: s.label, bullets: s.bullets.length > 0 ? s.bullets : s.rawContent.split('\n').filter((l: string) => l.trim()) })),
        }),
      });
      if (!res.ok) throw new Error('Email send failed');
      toast.success('Insights emailed successfully');
      setInsightsEmailModalOpen(false);
      setInsightsEmailAddress('');
    } catch {
      toast.error('Failed to send email. Please try again.');
    } finally {
      setInsightsEmailSending(false);
    }
  }, [insightsText, insightsEmailAddress, insightsGeneratedAt, caseContext, profile, user, parseInsightsSections]);

  const aiQuestionCountRef = useRef(0);
  const aiRequestStartTimeRef = useRef<number | null>(null);

  const loadCaseContext = useCallback(async (caseId: string, caseData: any) => {
    if (!user || !caseId) return;

    const baseContext: CaseContext = {
      caseId,
      caseTitle: caseData.title || '',
      caseNumber: caseData.case_number || undefined,
      caseType: caseData.case_type || undefined,
      courtName: caseData.court_name || undefined,
      applicantName: caseData.applicant_name || undefined,
      respondentName: caseData.respondent_name || undefined,
      caseStatus: caseData.status || undefined,
      caseNotes: caseData.notes || undefined,
    };

    const { data: storedContext } = await supabase
      .from('case_context')
      .select('context_summary, key_facts')
      .eq('user_id', user.id)
      .eq('case_id', caseId)
      .maybeSingle();

    if (storedContext) {
      baseContext.contextSummary = storedContext.context_summary || undefined;
      baseContext.keyFacts = Array.isArray(storedContext.key_facts) ? storedContext.key_facts : [];
    }

    setCaseContext(baseContext);

    trackAIFeatureAdoption({
      feature: 'case_context_loaded',
      caseType: caseData.case_type || 'unknown',
    });
  }, [user, supabase]);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const { data: cases } = await supabase
        .from('cases')
        .select('id, title, case_number, case_type, court_name, applicant_name, respondent_name, status, notes')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (cases) {
        setCaseTitle(cases.title);
        setActiveCaseId(cases.id);
        loadCaseContext(cases.id, cases);
      }

      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setSubscription(data);

      // Load latest case intake
      const { data: intake } = await supabase
        .from('case_intake')
        .select('case_type, complexity_level, recommended_tools, key_issues')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (intake) setIntakeData(intake);
    } catch (err) {
      console.error('Dashboard data load error:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user, supabase, loadCaseContext]);

  // Load conversation sessions from Supabase
  const loadChatHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(30);

    if (data && data.length > 0) {
      setAiChat(data.map((m) => ({ ...m, text: m.content })));
      const history: ConversationMessage[] = data.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));
      setConversationHistory(history);
      trackAIFeatureAdoption({ feature: 'chat_history_loaded' });
      const userMsgCount = data.filter(m => m.role === 'user').length;
      aiQuestionCountRef.current = userMsgCount;
    } else {
      setAiChat([{
        role: 'ai',
        text: 'Good morning. I\'m your AI Legal Assistant, trained in UK family law. I can help with child arrangements, financial remedies, court procedures, document preparation, and case strategy. How can I assist you today?',
      }]);
    }
  }, [user, supabase]);

  // Load secure files
  const loadSecureFiles = useCallback(async () => {
    if (!user) return;
    setFilesLoading(true);
    const { data } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('user_id', user.id)
      .like('context', 'dashboard-secure%')
      .order('created_at', { ascending: false })
      .limit(50);
    setSecureFiles(data || []);
    setFilesLoading(false);
  }, [user, supabase]);

  // Load child contacts
  const loadChildContacts = useCallback(async () => {
    if (!user) return;
    setContactsLoading(true);
    try {
      const { data } = await supabase
        .from('child_contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('contact_date', { ascending: true })
        .limit(10);
      setChildContacts(data || []);
    } catch (err) {
      console.error('Child contacts load error:', err);
    } finally {
      setContactsLoading(false);
    }
  }, [user, supabase]);

  // Load court dates
  const loadCourtDates = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('court_dates')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });
      setCourtDates(data || []);
    } catch (err) {
      console.error('Court dates load error:', err);
    }
  }, [user, supabase]);

  // Load conversation sessions
  const loadConversationSessions = useCallback(async () => {
    if (!user) return;
    setSessionsLoading(true);
    try {
      const { data } = await supabase
        .from('conversation_sessions')
        .select('id, title, summary, file_references, message_count, last_message_at, created_at, case_id')
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false })
        .limit(50);
      setConversationSessions(data || []);
    } catch (err) {
      console.error('Failed to load conversation sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, [user, supabase]);

  // Create a new conversation session
  const createNewSession = useCallback(async (firstMessage: string, fileRefs: Array<{ id: string; file_name: string }> = []) => {
    if (!user) return null;
    const title = firstMessage.length > 60 ? firstMessage.slice(0, 57) + '…' : firstMessage;
    const { data, error } = await supabase
      .from('conversation_sessions')
      .insert({
        user_id: user.id,
        case_id: activeCaseId || null,
        title,
        file_references: fileRefs,
        message_count: 0,
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error || !data) return null;
    setConversationSessions(prev => [data, ...prev]);
    setActiveSessionId(data.id);
    activeSessionIdRef.current = data.id;
    return data.id;
  }, [user, supabase, activeCaseId]);

  // Update session metadata (message count, last message time, file refs)
  const updateSessionMetadata = useCallback(async (sessionId: string, fileRefs: Array<{ id: string; file_name: string }> = []) => {
    if (!user || !sessionId) return;
    const { data: countData } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact' })
      .eq('conversation_session_id', sessionId);
    const msgCount = (countData as any)?.length || 0;
    await supabase
      .from('conversation_sessions')
      .update({
        message_count: msgCount,
        last_message_at: new Date().toISOString(),
        file_references: fileRefs.length > 0 ? fileRefs : undefined,
      })
      .eq('id', sessionId)
      .eq('user_id', user.id);
    setConversationSessions(prev => prev.map(s =>
      s.id === sessionId
        ? { ...s, message_count: msgCount, last_message_at: new Date().toISOString(), ...(fileRefs.length > 0 ? { file_references: fileRefs } : {}) }
        : s
    ));
  }, [user, supabase]);

  // Load messages for a specific session
  const loadSessionMessages = useCallback(async (sessionId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .eq('conversation_session_id', sessionId)
      .order('created_at', { ascending: true });
    if (data && data.length > 0) {
      setAiChat(data.map((m) => ({ ...m, text: m.content })));
      const history: ConversationMessage[] = data.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));
      setConversationHistory(history);
      aiQuestionCountRef.current = data.filter(m => m.role === 'user').length;
    } else {
      setAiChat([{
        role: 'ai',
        text: 'Conversation loaded. How can I assist you today?',
      }]);
      setConversationHistory([]);
    }
    setActiveSessionId(sessionId);
    activeSessionIdRef.current = sessionId;
    setShowHistoryPanel(false);
  }, [user, supabase]);

  // Start a brand new conversation
  const startNewConversation = useCallback(() => {
    setAiChat([{
      role: 'ai',
      text: 'New conversation started. I\'m your AI Legal Assistant, trained in UK family law. How can I assist you today?',
    }]);
    setConversationHistory([]);
    setActiveSessionId(null);
    activeSessionIdRef.current = null;
    aiQuestionCountRef.current = 0;
    setAiAttachedFiles([]);
    setShowHistoryPanel(false);
  }, []);

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    await supabase.from('chat_messages').delete().eq('conversation_session_id', sessionId).eq('user_id', user.id);
    await supabase.from('conversation_sessions').delete().eq('id', sessionId).eq('user_id', user.id);
    setConversationSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      startNewConversation();
    }
  }, [user, supabase, activeSessionId, startNewConversation]);

  const subscribeToRealTime = useCallback(() => {
    if (!user) return;

    const chatChannel = supabase
      .channel('dashboard_chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const msg = payload.new as any;
        setAiChat((prev) => {
          const exists = prev.some((m) => m.id === msg.id);
          if (exists) return prev;
          return [...prev, { ...msg, text: msg.content }];
        });
      })
      .subscribe();

    const datesChannel = supabase
      .channel('dashboard_dates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'court_dates',
      }, () => {
        loadDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(datesChannel);
    };
  }, [user, supabase, loadDashboardData]);

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
    loadChatHistory();
    loadChildContacts();
    loadSecureFiles();
    loadConversationSessions();
    const cleanup = subscribeToRealTime();
    return cleanup;
  }, [user, loadDashboardData, loadChatHistory, loadChildContacts, loadSecureFiles, loadConversationSessions, subscribeToRealTime]);

  useEffect(() => {
    if (aiError) toast.error(aiError.message);
  }, [aiError]);

  const prevResponseRef = useRef('');
  const isCapturingRef = useRef(false);

  useEffect(() => {
    if (aiLoading && response) {
      isCapturingRef.current = true;
    }
    if (!aiLoading && isCapturingRef.current && response && response !== prevResponseRef.current) {
      isCapturingRef.current = false;
      prevResponseRef.current = response;
      const aiResponse = response;

      if (aiRequestStartTimeRef.current !== null) {
        const responseTimeMs = Date.now() - aiRequestStartTimeRef.current;
        aiRequestStartTimeRef.current = null;
        const currentCaseType = caseContext?.caseType || 'unknown';

        trackAIResponseReceived({ responseTimeMs, caseType: currentCaseType });
        trackAIFeatureAdoption({ feature: 'streaming_response', caseType: currentCaseType });

        if (user) {
          supabase.from('ai_engagement_metrics').insert({
            user_id: user.id,
            session_id: 'dashboard',
            case_id: activeCaseId || null,
            case_type: currentCaseType,
            question_count: aiQuestionCountRef.current,
            response_time_ms: responseTimeMs,
            feature_used: 'streaming_response',
          }).then(() => {});
        }
      }

      setConversationHistory(prev => [...prev, { role: 'assistant', content: aiResponse }]);

      if (user) {
        let sessionId = activeSessionIdRef.current;

        // Immediately add AI response to chat so it's always visible
        const tempId = `temp-ai-${Date.now()}`;
        setAiChat(prev => [...prev, { id: tempId, role: 'ai', text: aiResponse, content: aiResponse }]);

        supabase
          .from('chat_messages')
          .insert({
            user_id: user.id,
            role: 'ai',
            content: aiResponse,
            session_id: 'dashboard',
            case_id: activeCaseId || null,
            conversation_session_id: sessionId || null,
          })
          .select()
          .single()
          .then(({ data: aiMsg }) => {
            if (aiMsg) {
              // Replace temp message with the DB-persisted one
              setAiChat(prev => prev.map(m => m.id === tempId ? { ...aiMsg, text: aiMsg.content } : m));
            }
            // Update session metadata after AI responds
            if (sessionId) {
              updateSessionMetadata(sessionId, aiAttachedFiles.map(f => ({ id: f.id, file_name: f.file_name })));
            }
          });
      } else {
        // Not logged in — still show the AI response
        setAiChat(prev => [...prev, { id: `ai-${Date.now()}`, role: 'ai', text: aiResponse, content: aiResponse }]);
      }
    }
  }, [response, aiLoading, user, supabase, activeCaseId, caseContext, updateSessionMetadata, aiAttachedFiles]);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/sign-in');
    }
  }, [user, loading, router]);

  const handleAddContact = useCallback(async () => {
    if (!user || !newContact.child_name.trim() || !newContact.contact_date) return;
    setAddingContact(true);
    try {
      const { data, error } = await supabase
        .from('child_contacts')
        .insert({
          user_id: user.id,
          child_name: newContact.child_name.trim(),
          contact_date: newContact.contact_date,
          contact_type: newContact.contact_type,
          notes: newContact.notes.trim() || null,
          location: newContact.location.trim() || null,
          status: 'scheduled',
        })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setChildContacts((prev) => [...prev, data].sort((a, b) => new Date(a.contact_date).getTime() - new Date(b.contact_date).getTime()));
        toast.success('Contact visit added');
        setNewContact({ child_name: '', contact_date: '', contact_type: 'in_person', notes: '', location: '' });
        setShowAddContact(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to add contact');
    } finally {
      setAddingContact(false);
    }
  }, [user, supabase, newContact]);

  const handleUpdateContactStatus = useCallback(async (id: string, status: ChildContact['status']) => {
    try {
      const { error } = await supabase
        .from('child_contacts')
        .update({ status })
        .eq('id', id)
        .eq('user_id', user?.id);
      if (error) throw error;
      setChildContacts((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
      toast.success(`Marked as ${status}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update');
    }
  }, [user, supabase]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChat, response]);

  const handleAiSend = useCallback(async () => {
    if (!aiMessage.trim() || !user || aiLoading) return;
    const msg = aiMessage.trim();
    setAiMessage('');
    prevResponseRef.current = '';

    aiQuestionCountRef.current += 1;
    aiRequestStartTimeRef.current = Date.now();
    const currentCaseType = caseContext?.caseType || 'unknown';

    trackAIQuestionAsked({
      caseType: currentCaseType,
      messageLength: msg.length,
      sessionId: 'dashboard',
    });
    trackAICaseTypeDiscussed({
      caseType: currentCaseType,
      questionCount: aiQuestionCountRef.current,
    });

    // Create a new session if this is the first message
    let sessionId = activeSessionIdRef.current;
    if (!sessionId) {
      const fileRefs = aiAttachedFiles.map(f => ({ id: f.id, file_name: f.file_name }));
      sessionId = await createNewSession(msg, fileRefs);
    }

    const { data: userMsg } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user.id,
        role: 'user',
        content: msg,
        session_id: 'dashboard',
        case_id: activeCaseId || null,
        conversation_session_id: sessionId || null,
      })
      .select()
      .single();

    if (userMsg) {
      setAiChat((prev) => [...prev, { ...userMsg, text: userMsg.content }]);
    }

    const updatedHistory: ConversationMessage[] = [...conversationHistory, { role: 'user', content: msg }];
    setConversationHistory(updatedHistory);

    const toolsContext = await fetchAllToolsContext();
    const toolsContextSection = buildToolsContextSection(toolsContext);

    const baseSystemPrompt = buildSystemPromptWithContext(caseContext);
    const systemPrompt = baseSystemPrompt + toolsContextSection;

    // Build user message content — include attached vault files
    let userContent: any = msg;
    if (aiAttachedFiles.length > 0) {
      const contentParts: any[] = [{ type: 'text', text: msg }];
      for (const attachedFile of aiAttachedFiles) {
        try {
          const res = await fetch('/api/vault/read-file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId: attachedFile.id, userId: user.id }),
          });
          const fileData = await res.json();
          if (res.ok && fileData) {
            if (fileData.contentType === 'text') {
              contentParts.push({
                type: 'text',
                text: `\n\n--- DOCUMENT: "${fileData.fileName}" [${fileData.folder}] ---\n${fileData.content}\n--- END DOCUMENT ---`,
              });
            } else if (fileData.contentType === 'binary') {
              contentParts.push({
                type: 'file',
                file: {
                  file_data: fileData.base64,
                  filename: fileData.fileName,
                  format: fileData.mimeType,
                },
              });
            }
          } else {
            contentParts.push({
              type: 'text',
              text: `\n\n[Note: Could not read file "${attachedFile.file_name}": ${fileData.error || 'Unknown error'}]`,
            });
          }
        } catch {
          contentParts.push({
            type: 'text',
            text: `\n\n[Note: Failed to load file "${attachedFile.file_name}"]`,
          });
        }
      }
      userContent = contentParts;
    }

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...updatedHistory.slice(0, -1),
      { role: 'user' as const, content: userContent },
    ];

    sendMessage(messages, { max_tokens: 16000, temperature: 0.3 });
  }, [aiMessage, user, aiLoading, supabase, conversationHistory, sendMessage, activeCaseId, caseContext, fetchAllToolsContext, aiAttachedFiles, createNewSession]);

  const handleClearChat = useCallback(async () => {
    setAiChat([{
      role: 'ai',
      text: 'Chat cleared. I\'m your AI Legal Assistant, trained in UK family law. How can I assist you today?',
    }]);
    setConversationHistory([]);
    aiQuestionCountRef.current = 0;
    trackAIFeatureAdoption({ feature: 'chat_cleared', caseType: caseContext?.caseType || 'unknown' });
    if (user) {
      await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', user.id)
        .eq('session_id', 'dashboard');
    }
  }, [user, supabase, caseContext]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.replace('/sign-in');
  }, [signOut, router]);

  const formatDate = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    return { day: d.getDate(), month: d.toLocaleString('en-GB', { month: 'short' }) };
  }, []);

  const getNextBillingDate = useCallback(() => {
    if (!subscription?.current_period_end) return '—';
    return new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [subscription?.current_period_end]);

  const displayName = useMemo(
    () => profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User',
    [profile, user]
  );
  const initials = useMemo(
    () => displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
    [displayName]
  );

  const timelineCompleteness = useMemo(() => {
    if (metrics.timelineTotal === 0) return 0;
    return Math.round((metrics.timelineWithEvidence / metrics.timelineTotal) * 100);
  }, [metrics.timelineTotal, metrics.timelineWithEvidence]);

  const netBalance = useMemo(
    () => metrics.financeIncome - metrics.financeExpenses,
    [metrics.financeIncome, metrics.financeExpenses]
  );

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';

  useEffect(() => {
    if (subscription?.status !== 'trialing' || !subscription?.trial_end) return;
    const interval = setInterval(() => setTickTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [subscription?.status, subscription?.trial_end]);

  const filteredSessions = useMemo(
    () => conversationSessions.filter(s =>
      !historySearch || s.title?.toLowerCase().includes(historySearch.toLowerCase())
    ),
    [conversationSessions, historySearch]
  );

  if (loading || (!user && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Icon name="ScaleIcon" size={20} className="text-white" />
          </div>
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Toaster position="top-right" toastOptions={{ style: { background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' } }} />

      {/* ── Sidebar ── */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`} style={{ background: '#ffffff', borderRight: '1px solid #e5e7eb' }}>

        {/* Logo */}
        <div className="h-16 px-5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <Link href="/homepage" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center flex-shrink-0">
              <Icon name="ScaleIcon" size={16} className="text-white" />
            </div>
            <span className="font-display font-900 text-sm text-gray-900 tracking-tight">
              Court<span style={{ color: '#f59e0b' }}>Craft</span>
            </span>
          </Link>
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center" onClick={() => setSidebarOpen(false)}>
            <Icon name="XMarkIcon" size={16} className="text-gray-500" />
          </button>
        </div>

        {/* User profile */}
        <div className="px-4 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
              <Icon name="UserCircleIcon" size={16} className="text-gray-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-700 text-gray-900 text-sm leading-tight truncate">{displayName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                <span className="text-gray-400 truncate" style={{ fontSize: '10px' }}>
                  {subscription?.status === 'trialing' ? 'Member' : subscription?.status === 'active' ? 'Pro Member' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto">
          <p className="px-2 mb-3 text-gray-400 uppercase tracking-widest font-700" style={{ fontSize: '9px' }}>Navigation</p>
          {[
            { icon: 'Squares2X2Icon', label: 'Dashboard', href: '/dashboard', active: true },
            { icon: 'DocumentTextIcon', label: 'Document Builder', href: '/document-builder' },
            { icon: 'FolderOpenIcon', label: 'Case Management', href: '/case-management' },
            { icon: 'ClipboardDocumentListIcon', label: 'Court Filing Tracker', href: '/court-filing-tracker' },
            { icon: 'BookOpenIcon', label: 'Resources', href: '/resources' },
            { icon: 'ClipboardDocumentCheckIcon', label: 'Case Intake', href: '/case-intake' },
          ].map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-xs font-700 transition-all duration-150 whitespace-nowrap flex-shrink-0"
              style={link.active
                ? { background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.2)' }
                : { color: '#6b7280' }
              }
            >
              <Icon name={link.icon as any} size={14} className={link.active ? 'text-amber-600' : 'text-gray-400'} />
              <span>{link.label}</span>
            </Link>
          ))}

          <p className="px-2 mt-6 mb-3 text-gray-400 uppercase tracking-widest font-700" style={{ fontSize: '9px' }}>Tools</p>
          <button
            onClick={() => { setSidebarOpen(false); setTimeout(() => { const el = document.getElementById('tools-section'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-xs font-700 transition-all duration-150 whitespace-nowrap flex-shrink-0"
          >
            <Icon name="SparklesIcon" size={14} className="text-gray-400" />
            <span className="flex-1">AI &amp; Tools</span>
            <span className="px-1.5 py-0.5 rounded-md font-700" style={{ fontSize: '8px', background: '#f3f4f6', color: '#9ca3af' }}>8</span>
          </button>

          <p className="px-2 mt-6 mb-3 text-gray-400 uppercase tracking-widest font-700" style={{ fontSize: '9px' }}>Account</p>
          {[
            { icon: 'ChartBarIcon', label: 'Analytics', href: '#analytics-section' },
            { icon: 'ShieldCheckIcon', label: 'GDPR Centre', href: '#gdpr-compliance' },
            { icon: 'UserCircleIcon', label: 'Profile', href: '/profile' },
            { icon: 'Cog6ToothIcon', label: 'Settings', href: '/settings' },
          ].map((link) => (
            <Link key={link.label} href={link.href} onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-xs font-600 transition-all duration-150 text-gray-600 hover:bg-gray-50"
            >
              <Icon name={link.icon as any} size={14} className="text-gray-400" />
              <span className="flex-1">{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* Subscription status */}
        <div className="px-3 pb-4 flex-shrink-0">
          {subscription?.status === 'trialing' && subscription?.trial_end ? (() => {
            const trialEndMs = new Date(subscription.trial_end).getTime();
            const diffMs = trialEndMs - tickTime;
            const daysLeft = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
            const hoursLeft = Math.max(0, Math.floor((diffMs / (1000 * 60 * 60)) % 24));
            const minutesLeft = Math.max(0, Math.floor((diffMs / (1000 * 60)) % 60));
            const isUrgent = daysLeft < 2;
            const isExpired = diffMs <= 0;
            return (
              <div className="rounded-2xl p-3" style={{ background: isUrgent ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Icon name="ClockIcon" size={12} className={isUrgent ? 'text-red-500' : 'text-amber-500'} />
                  <span className="font-display font-700 text-xs" style={{ color: isUrgent ? '#ef4444' : '#d97706' }}>
                    {isExpired ? 'Subscription Expired' : isUrgent ? '⚠ Ending Soon' : 'Subscription Active'}
                  </span>
                </div>
                {!isExpired && (
                  <div className="grid grid-cols-3 gap-1 mb-2.5">
                    {[{ value: daysLeft, label: 'Days' }, { value: hoursLeft, label: 'Hrs' }, { value: minutesLeft, label: 'Min' }].map((u) => (
                      <div key={u.label} className="flex flex-col items-center">
                        <span className="font-display font-700 text-base" style={{ color: isUrgent ? '#ef4444' : '#d97706' }}>{u.value}</span>
                        <span className="text-gray-400" style={{ fontSize: '9px' }}>{u.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })() : null}
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top header */}
        <header className="h-14 sm:h-16 px-3 sm:px-4 lg:px-6 flex items-center justify-between flex-shrink-0 bg-white" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="lg:hidden p-2 rounded-xl transition-colors bg-gray-50 border border-gray-200 hover:bg-gray-100 min-w-[36px] min-h-[36px] flex items-center justify-center" onClick={() => setSidebarOpen(true)}>
              <Icon name="Bars3Icon" size={16} className="text-gray-600" />
            </button>
            <div>
              <h1 className="font-display font-800 text-gray-900 text-sm leading-tight tracking-tight">Dashboard</h1>
              <p className="text-gray-400 leading-tight hidden sm:block" style={{ fontSize: '11px' }}>
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <BackButton className="text-gray-400 hover:text-gray-600 hidden sm:inline-flex" label="Back" />
            <NotificationBell />
            <Link href="/document-builder" className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-700 transition-all" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>
              <Icon name="DocumentPlusIcon" size={13} className="text-white" />
              <span className="hidden sm:inline">New Document</span>
              <span className="md:hidden">New Doc</span>
            </Link>
            <button onClick={handleSignOut} className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-600 transition-all text-gray-400 hover:text-gray-600">
              <Icon name="ArrowRightOnRectangleIcon" size={13} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* Scrollable body */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-5 lg:py-7 space-y-4 sm:space-y-5">

            {/* ── Case Intake Personalisation Banner ── */}
            {!dataLoading && !intakeData && (
              <div className="rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 bg-white border border-amber-200" style={{ borderStyle: 'dashed' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                  <Icon name="ClipboardDocumentCheckIcon" size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-800 text-sm text-gray-900 mb-1 tracking-tight">Personalise Your Dashboard</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {intakeData?.case_type?.replace(/_/g, ' ') ? `Case type: ${intakeData.case_type.replace(/_/g, ' ')}` : 'Answer 4 quick questions about your case so we can highlight the right tools for you.'}
                  </p>
                </div>
                <Link href="/case-intake" className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-800 hover:opacity-90 transition-all whitespace-nowrap" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>
                  <Icon name="SparklesIcon" size={13} className="text-white" />
                  Start Intake
                </Link>
              </div>
            )}

            {intakeData && (
              <div className="rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-white border border-gray-200">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                  <Icon name="ClipboardDocumentCheckIcon" size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs font-display font-700 text-gray-900 flex items-center gap-1.5 tracking-tight">
                      <Icon name="ClipboardDocumentCheckIcon" size={11} className="text-amber-500" />
                      Dashboard personalised
                    </p>
                    <span className="px-1.5 py-0.5 rounded-full font-600 capitalize bg-gray-100 text-gray-600">{intakeData.case_type?.replace(/_/g, ' ')}</span>
                    <span className="px-1.5 py-0.5 rounded-full font-600 capitalize" style={{ background: 'rgba(245,158,11,0.06)', color: '#d97706' }}>{intakeData.complexity_level} complexity</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {intakeData.recommended_tools?.length > 0
                      ? `Recommended tools: ${intakeData.recommended_tools.slice(0, 3).map((t) => t.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())).join(', ')}${intakeData.recommended_tools.length > 3 ? ` +${intakeData.recommended_tools.length - 3} more` : ''}`
                      : 'Your tools have been tailored to your case type.'}
                  </p>
                </div>
                <Link href="/case-intake" className="flex-shrink-0 text-xs font-600 transition-colors whitespace-nowrap" style={{ color: '#d97706' }}>
                  Update intake →
                </Link>
              </div>
            )}

            {/* ── Trial Countdown ── */}
            {subscription?.status === 'trialing' && subscription?.trial_end && (() => {
              const trialEndMs = new Date(subscription.trial_end).getTime();
              const nowMs = tickTime;
              const diffMs = trialEndMs - nowMs;
              const totalDays = 7;
              const daysLeft = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
              const hoursLeft = Math.max(0, Math.floor((diffMs / (1000 * 60 * 60)) % 24));
              const minutesLeft = Math.max(0, Math.floor((diffMs / (1000 * 60)) % 60));
              const secondsLeft = Math.max(0, Math.floor((diffMs / 1000) % 60));
              const progressPct = Math.max(0, Math.min(100, (diffMs / (totalDays * 24 * 60 * 60 * 1000)) * 100));
              const isUrgent = daysLeft < 2;
              const isExpired = diffMs <= 0;
              if (isExpired) return null;
              return (
                <div className="relative rounded-2xl overflow-hidden bg-white" style={{ border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.25)'}` }}>
                  <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-start gap-2.5 flex-1">
                      <div className="w-9 h-9 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: isUrgent ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)' }}>
                        <Icon name="ClockIcon" size={16} className={isUrgent ? 'text-red-500' : 'text-amber-500'} />
                      </div>
                      <div>
                        <p className="font-display font-700 text-sm sm:text-base text-gray-900 mb-1 tracking-tight">
                          {isUrgent ? 'Subscription Ending Soon!' : 'Subscription Active'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {[{ value: daysLeft, label: 'D' }, { value: hoursLeft, label: 'H' }, { value: minutesLeft, label: 'M' }, { value: secondsLeft, label: 'S' }].map((u, i) => (
                            <React.Fragment key={u.label}>
                              <span className="font-mono font-700 text-sm" style={{ color: isUrgent ? '#ef4444' : '#d97706' }}>
                                {String(u.value).padStart(2, '0')}<span className="text-gray-400 text-xs ml-0.5">{u.label}</span>
                              </span>
                              {i < 3 && <span className="text-xs text-gray-300">:</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:block">
                        <div className="w-32 h-1.5 rounded-full overflow-hidden bg-gray-100">
                          <div className="h-full rounded-full transition-all" style={{ width: `${100 - progressPct}%`, background: isUrgent ? '#ef4444' : 'linear-gradient(90deg, #f59e0b, #ef4444)' }} />
                        </div>
                        <p className="text-gray-400 text-xs mt-1">{Math.round(100 - progressPct)}% used</p>
                      </div>
                      <Link href="/subscription" className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-display font-700 text-xs transition-all hover:opacity-90" style={{ background: isUrgent ? '#ef4444' : 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>
                        Upgrade — £{subscription?.amount?.toFixed(2) ?? '35.00'}/mo
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── Welcome + Case Status — Bento Layout ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Welcome banner */}
              <div className="lg:col-span-2 relative rounded-2xl overflow-hidden bg-white border border-gray-200">
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 80% at 100% 50%, rgba(245,158,11,0.05), transparent)' }} />
                <div className="relative z-10 px-5 sm:px-6 py-5 sm:py-6">
                  <div className="flex items-start gap-3 mb-4 sm:mb-5">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                      <Icon name="ScaleIcon" size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h2 className="font-display font-800 text-sm sm:text-base text-gray-900 mb-1 tracking-tight">
                          Welcome back, {displayName.split(' ')[0]}.
                        </h2>
                        {metrics.daysToHearing !== null && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-700" style={{ fontSize: '10px', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)', color: '#ea580c' }}>
                            <Icon name="ExclamationTriangleIcon" size={10} />
                            Hearing in {metrics.daysToHearing}d
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-700" style={{ fontSize: '10px', background: isActive ? 'rgba(16,185,129,0.08)' : 'rgba(251,146,60,0.08)', border: `1px solid ${isActive ? 'rgba(16,185,129,0.2)' : 'rgba(251,146,60,0.2)'}`, color: isActive ? '#059669' : '#ea580c' }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: isActive ? '#10b981' : '#fb923c' }} />
                          {isActive ? 'Case Active' : 'No Active Case'}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-gray-500">
                        {caseTitle !== 'Your Case' ? (
                          <><span className="text-gray-700 font-600">{caseTitle}</span> — {metrics.caseProgress}% complete.{metrics.daysToHearing !== null ? ` Next hearing in ${metrics.daysToHearing} days.` : ''}</>
                        ) : (
                          'Your CourtCraft dashboard. All case data is live and synced in real-time.'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/document-builder" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-700 transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>
                      <Icon name="DocumentTextIcon" size={13} className="text-white" />
                      Build Document
                    </Link>
                    <Link href="/case-management" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-600 transition-all bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100">View Case</Link>
                    <Link href="/court-filing-tracker" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-600 transition-all bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100">Filing Tracker</Link>
                  </div>
                </div>
              </div>

              {/* Upcoming Court Dates */}
              <div id="court-dates" className="rounded-2xl flex flex-col bg-white border border-gray-200">
                <div className="px-5 py-4 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-amber-50">
                      <Icon name="CalendarDaysIcon" size={14} className="text-amber-500" />
                    </div>
                    <h3 className="font-display font-700 text-gray-900 text-sm tracking-tight">Upcoming Dates</h3>
                  </div>
                  <Link href="/case-management" className="text-xs font-600 transition-colors" style={{ color: '#d97706' }}>Add →</Link>
                </div>
                <div className="p-4 flex-1">
                  {dataLoading ? (
                    <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-12 rounded-2xl animate-pulse bg-gray-100" />)}</div>
                  ) : courtDates.length === 0 ? (
                    <div className="py-8 text-center">
                      <Icon name="CalendarDaysIcon" size={24} className="text-gray-300 mx-auto mb-2" />
                      <p className="text-xs font-display font-600 text-gray-400 mb-1">No upcoming dates</p>
                      <Link href="/case-management" className="inline-flex items-center gap-1 text-xs font-600 transition-colors" style={{ color: '#d97706' }}>
                        <Icon name="PlusIcon" size={11} />
                        Add a date
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {courtDates.map((item) => {
                        const { day, month } = formatDate(item.event_date);
                        return (
                          <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: item.is_urgent ? 'rgba(251,146,60,0.06)' : '#f9fafb', border: `1px solid ${item.is_urgent ? 'rgba(251,146,60,0.2)' : '#e5e7eb'}` }}>
                            <div className="flex-shrink-0 w-8 h-8 rounded-xl flex flex-col items-center justify-center" style={{ background: item.is_urgent ? 'rgba(251,146,60,0.1)' : '#f3f4f6' }}>
                              <p className="font-display font-900 text-sm leading-none" style={{ color: item.is_urgent ? '#ea580c' : '#d97706' }}>{day}</p>
                              <p className="text-gray-400 mt-0.5" style={{ fontSize: '8px' }}>{month}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-display font-600 text-gray-900 leading-tight truncate">{item.event_title}</p>
                              <p className="mt-0.5 text-gray-400" style={{ fontSize: '10px' }}>{item.event_type}</p>
                            </div>
                            {item.is_urgent && <Icon name="ExclamationTriangleIcon" size={13} className="text-orange-400 flex-shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Metrics — Bento Grid ── */}
            <div>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <p className="text-xs font-700 uppercase tracking-widest text-gray-400">Case Overview</p>
                <Link href="/case-management" className="text-xs font-600 transition-colors" style={{ color: '#d97706' }}>View full case →</Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: 'ChartBarIcon', label: 'Case Progress', value: dataLoading ? '—' : `${metrics.caseProgress}%`, progress: metrics.caseProgress, accent: '#d97706', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)' },
                  { icon: 'DocumentTextIcon', label: 'Documents', value: dataLoading ? '—' : String(metrics.documentsCount), progress: Math.min((metrics.documentsCount / 10) * 100, 100), accent: '#2563eb', bg: 'rgba(37,99,235,0.06)', border: 'rgba(37,99,235,0.12)' },
                  { icon: 'ClockIcon', label: 'Evidence Coverage', value: dataLoading ? '—' : `${timelineCompleteness}%`, progress: timelineCompleteness, accent: '#7c3aed', bg: 'rgba(124,58,237,0.06)', border: 'rgba(124,58,237,0.12)' },
                  { icon: 'BanknotesIcon', label: 'Net Balance', value: dataLoading ? '—' : `£${Math.abs(netBalance).toLocaleString('en-GB', { minimumFractionDigits: 0 })}`, progress: 100, accent: netBalance >= 0 ? '#059669' : '#dc2626', bg: netBalance >= 0 ? 'rgba(5,150,105,0.06)' : 'rgba(220,38,38,0.06)', border: netBalance >= 0 ? 'rgba(5,150,105,0.12)' : 'rgba(220,38,38,0.12)' },
                ].map((card) => (
                  <div key={card.label} className="rounded-2xl p-4 sm:p-5 bg-white border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-8 h-8 rounded-xl flex flex-col items-center justify-center" style={{ background: card.bg }}>
                        <Icon name={card.icon as any} size={14} style={{ color: card.accent }} />
                      </div>
                      <span className="text-xs font-display font-900 text-gray-900">{card.value}</span>
                    </div>
                    <p className="text-xs font-500 mb-2.5 text-gray-500">{card.label}</p>
                    <div className="w-full h-1 rounded-full overflow-hidden bg-gray-100">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${card.progress}%`, background: card.accent }} />
                    </div>
                    {card.label === 'Net Balance' && !dataLoading && (
                      <div className="flex flex-col gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <span className="font-600 text-emerald-600">+£{metrics.financeIncome.toLocaleString('en-GB', { minimumFractionDigits: 0 })}</span>
                          <span className="text-gray-300">/</span>
                          <span className="font-600 text-red-500">-£{metrics.financeExpenses.toLocaleString('en-GB', { minimumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Quick Actions ── */}
            <div>
              <p className="text-xs font-700 uppercase tracking-widest mb-3 sm:mb-4 text-gray-400">Quick Actions</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: 'DocumentPlusIcon', label: 'New Document', sub: 'Build a court document', href: '/document-builder', accent: '#2563eb', bg: 'rgba(37,99,235,0.06)', border: 'rgba(37,99,235,0.12)' },
                  { icon: 'FolderOpenIcon', label: 'Case Management', sub: 'View case & timeline', href: '/case-management', accent: '#ea580c', bg: 'rgba(234,88,12,0.06)', border: 'rgba(234,88,12,0.12)' },
                  { icon: 'ClipboardDocumentListIcon', label: 'Filing Tracker', sub: 'Court submissions', href: '/court-filing-tracker', accent: '#7c3aed', bg: 'rgba(124,58,237,0.06)', border: 'rgba(124,58,237,0.12)' },
                  { icon: 'BookOpenIcon', label: 'Resources', sub: 'Legal guides & templates', href: '/resources', accent: '#059669', bg: 'rgba(5,150,105,0.06)', border: 'rgba(5,150,105,0.12)' },
                ].map((action) => (
                  <Link key={action.label} href={action.href} className="flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 group hover:shadow-sm" style={{ background: action.bg, border: `1px solid ${action.border}` }}>
                    <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex flex-col items-center justify-center bg-gray-50">
                      <Icon name={action.icon as any} size={15} style={{ color: action.accent }} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-700 text-gray-900 text-xs leading-tight tracking-tight">{action.label}</p>
                      <p className="mt-0.5 text-gray-400" style={{ fontSize: '10px' }}>{action.sub}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* ── Tools Section ── */}
            <div id="tools-section">
              <p className="text-xs font-700 uppercase tracking-widest mb-3 sm:mb-4 text-gray-400">AI & Tools</p>

              {/* Tools container */}
              <div className="rounded-2xl overflow-hidden bg-white border border-gray-200">

                {/* Tab bar */}
                <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-0" style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <div className="flex gap-1 overflow-x-auto pb-3 sm:pb-4" style={{ scrollbarWidth: 'none' }}>
                    {toolTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveToolTab(tab.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-700 transition-all duration-150 whitespace-nowrap flex-shrink-0"
                        style={activeToolTab === tab.id
                          ? { background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white', border: '1px solid rgba(245,158,11,0.2)' }
                          : { color: '#9ca3af' }
                        }
                      >
                        <Icon name={tab.icon as any} size={12} />
                        {tab.label}
                        {tab.badge && (
                          <span className="px-1.5 py-0.5 rounded-md font-700" style={{ fontSize: '8px', background: activeToolTab === tab.id ? 'rgba(255,255,255,0.25)' : '#f3f4f6', color: activeToolTab === tab.id ? 'white' : '#9ca3af' }}>{tab.badge}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab content */}
                <div className="p-4 sm:p-6">

                  {/* AI Assistant */}
                  {activeToolTab === 'ai-assistant' && (
                    <div id="ai-assistant" className="flex flex-col" style={{ minHeight: '480px' }}>

                      <div className="flex items-center justify-between mb-4 sm:mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-50">
                            <Icon name="SparklesIcon" size={16} className="text-teal-500" />
                          </div>
                          <div>
                            <h3 className="font-display font-700 text-gray-900 text-sm tracking-tight">AI Legal Assistant</h3>
                            <p style={{ fontSize: '10px' }} className="text-gray-400">UK Family Law · Claude Sonnet · 24/7</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setShowHistoryPanel(v => !v)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-600 transition-all"
                            style={showHistoryPanel ? { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' } : { color: '#9ca3af' }}
                          >
                            <Icon name="ClockIcon" size={12} />
                            <span className="hidden sm:inline">History</span>
                            {conversationSessions.length > 0 && (
                              <span className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center font-700 bg-gray-100 text-gray-500" style={{ fontSize: '9px' }}>{conversationSessions.length > 99 ? '99+' : conversationSessions.length}</span>
                            )}
                          </button>
                          <button
                            onClick={() => setShowVaultPicker((v) => !v)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-700 transition-all"
                            style={showVaultPicker ? { background: 'rgba(245,158,11,0.08)', color: '#d97706', border: '1px solid rgba(245,158,11,0.2)' } : { color: '#9ca3af' }}
                          >
                            <Icon name="LockClosedIcon" size={12} />
                            <span className="hidden sm:inline">Vault Files</span>
                            {aiAttachedFiles.length > 0 && (
                              <span className="ml-1 w-4 h-4 rounded-full flex items-center justify-center font-700" style={{ fontSize: '9px', background: '#f59e0b', color: '#ffffff' }}>{aiAttachedFiles.length}</span>
                            )}
                          </button>
                          <button onClick={handleClearChat} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-600 transition-all text-gray-400 hover:text-gray-600">
                            <Icon name="TrashIcon" size={12} />
                            <span className="hidden sm:inline">Clear</span>
                          </button>
                        </div>
                      </div>

                      {/* Conversation History Panel */}
                      {showHistoryPanel && (
                        <div className="mb-5 rounded-2xl overflow-hidden border border-gray-200">
                          <div className="px-4 py-3 flex items-center justify-between gap-2 bg-gray-50" style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <div className="flex items-center gap-2">
                              <Icon name="ClockIcon" size={12} className="text-gray-400" />
                              <span className="font-display font-700 text-gray-900 text-xs tracking-tight">Conversation History</span>
                              <span className="px-2 py-0.5 rounded-full text-xs font-600 bg-gray-200 text-gray-600">{conversationSessions.length}</span>
                            </div>
                            <button onClick={startNewConversation} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-700 text-xs hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>
                              <Icon name="PlusIcon" size={11} className="text-white" />
                              New Chat
                            </button>
                          </div>
                          <div className="px-3 py-2.5 bg-white" style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <div className="relative">
                              <Icon name="MagnifyingGlassIcon" size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input type="text" value={historySearch} onChange={e => setHistorySearch(e.target.value)} placeholder="Search conversations…" className="w-full text-sm mb-4 py-2.5 px-4 rounded-xl outline-none bg-white border border-gray-200 text-gray-900 focus:border-amber-300 focus:bg-white" onKeyDown={(e) => { if (e.key === 'Enter') loadSessionMessages(activeSessionId || ''); }} />
                              {historySearch && (
                                <button onClick={() => setHistorySearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                  <Icon name="XMarkIcon" size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="overflow-y-auto bg-white" style={{ maxHeight: '260px' }}>
                            {sessionsLoading ? (
                              <div className="p-3 space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl animate-pulse bg-gray-100" />)}</div>
                            ) : filteredSessions.length === 0 ? (
                              <div className="py-8 text-center">
                                <Icon name="ChatBubbleLeftRightIcon" size={22} className="text-gray-300 mx-auto mb-2" />
                                <p className="text-xs text-gray-400 font-600">{historySearch ? 'No conversations match your search' : 'No saved conversations yet'}</p>
                                <p className="text-xs text-gray-300 mt-1">{historySearch ? 'Try a different search term' : 'Start chatting to save your first conversation'}</p>
                              </div>
                            ) : (
                              <div className="p-2 space-y-1">
                                {filteredSessions.map(session => {
                                  const isActiveSession = session.id === activeSessionId;
                                  const dateStr = new Date(session.last_message_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                                  const timeStr = new Date(session.last_message_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                                  const fileRefs: Array<{ id: string; file_name: string }> = Array.isArray(session.file_references) ? session.file_references : [];
                                  return (
                                    <div key={session.id} onClick={() => loadSessionMessages(session.id)} className="group flex items-start gap-2.5 p-3 rounded-xl cursor-pointer transition-all" style={isActiveSession ? { background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' } : { background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                                      <div className="flex-shrink-0 w-7 h-7 rounded-xl flex flex-col items-center justify-center mt-0.5" style={{ background: isActiveSession ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : '#e5e7eb' }}>
                                        <Icon name="ChatBubbleLeftRightIcon" size={15} className={isActiveSession ? 'text-white' : 'text-gray-400'} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-display font-700 truncate leading-tight tracking-tight" style={{ color: isActiveSession ? '#d97706' : '#111827' }}>{session.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                          <span className="text-gray-400" style={{ fontSize: '10px' }}>{dateStr} · {timeStr}</span>
                                          {session.message_count > 0 && <span className="text-gray-300" style={{ fontSize: '10px' }}>{session.message_count} msg{session.message_count !== 1 ? 's' : ''}</span>}
                                        </div>
                                        {fileRefs.length > 0 && (
                                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                                            <Icon name="PaperClipIcon" size={9} className="text-amber-500 flex-shrink-0" />
                                            {fileRefs.slice(0, 2).map((f: any) => (
                                              <span key={f.id} className="px-1.5 py-0.5 rounded-md font-600 truncate max-w-24" style={{ fontSize: '9px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', color: '#d97706' }}>
                                                {f.file_name?.length > 16 ? f.file_name.slice(0, 14) + '…' : f.file_name}
                                              </span>
                                            ))}
                                            {fileRefs.length > 2 && <span className="text-gray-400" style={{ fontSize: '9px' }}>+{fileRefs.length - 2} more</span>}
                                          </div>
                                        )}
                                      </div>
                                      <button onClick={(e) => deleteSession(session.id, e)} className="flex-shrink-0 w-6 h-6 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-gray-400 hover:text-red-500" title="Delete conversation">
                                        <Icon name="TrashIcon" size={11} />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Vault File Picker */}
                      {showVaultPicker && (
                        <div className="mb-4 p-4 rounded-2xl bg-gray-50 border border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs font-display font-700 text-gray-900 flex items-center gap-1.5 tracking-tight">
                              <Icon name="LockClosedIcon" size={11} className="text-amber-500" />
                              Select Vault Files for AI to Read
                            </p>
                            <div className="flex items-center gap-1.5">
                              {secureFiles.length > 0 && (
                                <button onClick={() => { const readableFiles = secureFiles.filter((file) => { const mimeType = (file as any).mime_type || ''; return mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.startsWith('text/') || mimeType === 'application/json'; }); setAiAttachedFiles(readableFiles.map((file) => ({ id: file.id, file_name: file.file_name, mime_type: (file as any).mime_type, storage_path: file.storage_path }))); }} className="text-xs font-600 px-2 py-1 rounded-xl transition-colors text-gray-500 hover:text-gray-700">
                                  Add All
                                </button>
                              )}
                              {aiAttachedFiles.length > 0 && (
                                <button onClick={() => setAiAttachedFiles([])} className="text-xs font-600 px-2 py-1 rounded-xl transition-colors text-gray-500 hover:text-gray-700">
                                  Delete All
                                </button>
                              )}
                            </div>
                          </div>
                          {secureFiles.length === 0 ? (
                            <p className="text-xs text-gray-400 py-3 text-center">No files in vault. Upload documents in the Secure Vault tab.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                              {secureFiles.map((file) => {
                                const isAttached = aiAttachedFiles.some((f) => f.id === file.id);
                                const isLoading = aiFileLoadingId === file.id;
                                const folder = (file as any).context?.replace('dashboard-secure/', '') || 'General';
                                const mimeType = (file as any).mime_type || '';
                                const isReadable = mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.startsWith('text/') || mimeType === 'application/json';
                                return (
                                  <div key={file.id} className="flex items-center gap-2.5 p-2.5 rounded-xl transition-all bg-white" style={{ border: `1px solid ${isAttached ? 'rgba(245,158,11,0.25)' : '#e5e7eb'}`, background: isAttached ? 'rgba(245,158,11,0.04)' : 'white', opacity: !isReadable ? 0.5 : 1 }}>
                                    <Icon name={mimeType === 'application/pdf' ? 'DocumentTextIcon' : mimeType.startsWith('image/') ? 'PhotoIcon' : 'DocumentIcon'} size={13} className={isAttached ? 'text-amber-500' : 'text-gray-400'} />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-600 text-gray-900 truncate">{file.file_name}</p>
                                      <p className="text-gray-400 truncate" style={{ fontSize: '10px' }}>{folder}{!isReadable ? ' · Not readable by AI' : ''}</p>
                                    </div>
                                    {isReadable && (
                                      <button onClick={() => { if (isAttached) { setAiAttachedFiles((prev) => prev.filter((x) => x.id !== file.id)); } else { setAiAttachedFiles((prev) => [...prev, { id: file.id, file_name: file.file_name, mime_type: (file as any).mime_type, storage_path: file.storage_path }]); } }} disabled={isLoading} className="flex-shrink-0 text-xs px-2 py-1 rounded-xl font-600 transition-all" style={isAttached ? { background: 'rgba(245,158,11,0.1)', color: '#d97706' } : { background: '#f3f4f6', color: '#6b7280' }}>
                                        {isLoading ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : isAttached ? 'Remove' : 'Add'}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {aiAttachedFiles.length > 0 && (
                            <p className="text-xs mt-2.5 flex items-center gap-1 font-600" style={{ color: '#d97706' }}>
                              <Icon name="CheckCircleIcon" size={11} className="text-amber-500" />
                              {aiAttachedFiles.length} file{aiAttachedFiles.length !== 1 ? 's' : ''} will be sent with your next message
                            </p>
                          )}
                        </div>
                      )}

                      {/* Attached files chips */}
                      {!showVaultPicker && aiAttachedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {aiAttachedFiles.map((f) => (
                            <span key={f.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-600" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', color: '#d97706' }}>
                              <Icon name="PaperClipIcon" size={10} className="text-amber-500" />
                              {f.file_name.length > 24 ? f.file_name.slice(0, 22) + '…' : f.file_name}
                              <button onClick={() => setAiAttachedFiles((prev) => prev.filter((x) => x.id !== f.id))} className="ml-0.5 hover:text-red-500 transition-colors">
                                <Icon name="XMarkIcon" size={10} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1" style={{ maxHeight: '380px' }}>
                        {aiChat.map((msg, i) => (
                          <div key={msg.id || i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className="max-w-xs sm:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl text-xs" style={msg.role === 'user' ? { background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white', borderBottomRightRadius: '4px' } : { background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', borderBottomLeftRadius: '4px' }}>
                              {msg.role === 'ai' ? (
                                <div className="prose prose-xs max-w-none text-xs leading-relaxed text-gray-700">
                                  <ReactMarkdown>{msg.text || msg.content || ''}</ReactMarkdown>
                                </div>
                              ) : (
                                <span className="text-xs">{msg.text || msg.content}</span>
                              )}
                            </div>
                          </div>
                        ))}
                        {aiLoading && (
                          <div className="flex justify-start">
                            <div className="px-4 py-3 rounded-2xl text-xs bg-gray-50 border border-gray-200" style={{ borderBottomLeftRadius: '4px' }}>
                              {response ? (
                                <div className="prose prose-xs max-w-none text-xs leading-relaxed text-gray-700">
                                  <ReactMarkdown>{response}</ReactMarkdown>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#f59e0b', animationDelay: '0ms' }} />
                                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#f59e0b', animationDelay: '150ms' }} />
                                  <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#f59e0b', animationDelay: '300ms' }} />
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      <div className="flex gap-2 pt-4" style={{ borderTop: '1px solid #e5e7eb' }}>
                        <input
                          type="text"
                          value={aiMessage}
                          onChange={(e) => setAiMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
                          placeholder={aiAttachedFiles.length > 0 ? `Ask about ${aiAttachedFiles.length} attached file${aiAttachedFiles.length !== 1 ? 's' : ''}…` : 'Ask about child arrangements, financial remedies, court procedure…'}
                          className="flex-1 text-sm py-2.5 px-4 rounded-xl outline-none transition-all bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-amber-300 focus:bg-white"
                          disabled={aiLoading}
                        />
                        <button onClick={handleAiSend} disabled={aiLoading || !aiMessage.trim()} className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 hover:opacity-90 active:scale-95 transition-all" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                          <Icon name="PaperAirplaneIcon" size={15} className="text-white" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Case Insights */}
                  {activeToolTab === 'insights' && (
                    <div id="case-insights">
                      <div className="flex items-center justify-between mb-4 sm:mb-5 flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                            <Icon name="LightBulbIcon" size={16} className="text-white" />
                          </div>
                          <div>
                            <h3 className="font-display font-700 text-gray-900 text-sm tracking-tight">AI Case Insights</h3>
                            <p className="text-xs mt-0.5 text-gray-400">Cross-tool analysis · Timeline predictions · Evidence gaps · Next steps</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {insightsGenerated && !insightsLoading && !insightsAiLoading && insightsText && (
                            <>
                              <button onClick={handleExportInsightsPDF} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-600 transition-all bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100">
                                <Icon name="ArrowDownTrayIcon" size={12} />
                                Export PDF
                              </button>
                              <button onClick={() => { setInsightsEmailAddress(user?.email || ''); setInsightsEmailModalOpen(true); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-600 transition-all bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100">
                                <Icon name="EnvelopeIcon" size={12} />
                                Email
                              </button>
                            </>
                          )}
                          <button onClick={handleGenerateInsights} disabled={insightsLoading || insightsAiLoading || isGeneratingInsightsRef.current} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-display font-700 text-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>
                            {insightsLoading || insightsAiLoading ? (
                              <><div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />Analysing…</>
                            ) : (
                              <><Icon name="SparklesIcon" size={12} className="text-white" />{insightsGenerated ? 'Refresh' : 'Generate Insights'}</>
                            )}
                          </button>
                        </div>
                      </div>

                      {!insightsGenerated ? (
                        <div className="flex flex-col items-center justify-center py-12 sm:py-14 text-center">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                            <Icon name="LightBulbIcon" size={24} className="text-amber-500" />
                          </div>
                          <p className="font-display font-700 text-gray-900 text-sm mb-2 tracking-tight">Unlock AI-Powered Case Analysis</p>
                          <p className="text-xs max-w-sm leading-relaxed mb-5 text-gray-500">
                            Analyse all your case data — court dates, timeline events, finances, child contacts, communications, and documents — and receive actionable recommendations.
                          </p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {['Key Case Insights', 'Timeline Predictions', 'Evidence & Preparation Gaps', 'Next Steps'].map((tag) => (
                              <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-600" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', color: '#d97706' }}>
                                <Icon name="CheckCircleIcon" size={10} className="text-amber-500" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : isFetchingInsightsData ? (
                        <div className="flex flex-col gap-4 py-4">
                          <div className="flex items-center gap-3 mb-1">
                            <div className="relative flex-shrink-0">
                              <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(245,158,11,0.15)', borderTopColor: '#f59e0b' }} />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full animate-pulse bg-amber-400" />
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-display font-700 text-gray-900 tracking-tight">Fetching case data from all tools…</p>
                              <p className="mt-0.5 text-gray-400" style={{ fontSize: '10px' }}>Pulling live data across 8 tools before generating insights</p>
                            </div>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {[
                              { icon: 'FolderOpenIcon', label: 'Case Management', color: '#2563eb', delay: '0ms' },
                              { icon: 'CalendarDaysIcon', label: 'Court Dates', color: '#ea580c', delay: '100ms' },
                              { icon: 'ClockIcon', label: 'Timeline Events', color: '#7c3aed', delay: '200ms' },
                              { icon: 'BanknotesIcon', label: 'Finance Tracker', color: '#059669', delay: '300ms' },
                              { icon: 'UserGroupIcon', label: 'Child Contacts', color: '#0d9488', delay: '400ms' },
                              { icon: 'ChatBubbleLeftRightIcon', label: 'Comms Logger', color: '#2563eb', delay: '500ms' },
                              { icon: 'LockClosedIcon', label: 'Secure Vault', color: '#d97706', delay: '600ms' },
                              { icon: 'DocumentTextIcon', label: 'Documents', color: '#6b7280', delay: '700ms' },
                            ].map((src) => (
                              <div key={src.label} className="flex items-center gap-1.5 px-3 py-2 rounded-xl animate-pulse bg-gray-50 border border-gray-100" style={{ animationDelay: src.delay }}>
                                <Icon name={src.icon as any} size={11} style={{ color: src.color }} />
                                <span className="truncate text-gray-400" style={{ fontSize: '10px' }}>{src.label}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-col gap-2 mt-1">
                            {[88, 72, 80, 60].map((w, i) => (
                              <div key={i} className="h-3 rounded-xl animate-pulse bg-gray-100" style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }} />
                            ))}
                          </div>
                        </div>
                      ) : (insightsLoading || insightsAiLoading) && !insightsText ? (
                        <div className="flex flex-col gap-3 py-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#f59e0b', animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#f59e0b', animationDelay: '150ms' }} />
                            <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: '#f59e0b', animationDelay: '300ms' }} />
                            <span className="text-xs ml-1 text-gray-400">Analysing your case data…</span>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            {[
                              { icon: 'FolderOpenIcon', label: 'Case Management', color: '#2563eb', delay: '0ms' },
                              { icon: 'CalendarDaysIcon', label: 'Court Dates', color: '#ea580c', delay: '100ms' },
                              { icon: 'ClockIcon', label: 'Timeline Events', color: '#7c3aed', delay: '200ms' },
                              { icon: 'BanknotesIcon', label: 'Finance Tracker', color: '#059669', delay: '300ms' },
                              { icon: 'UserGroupIcon', label: 'Child Contacts', color: '#0d9488', delay: '400ms' },
                              { icon: 'ChatBubbleLeftRightIcon', label: 'Comms Logger', color: '#2563eb', delay: '500ms' },
                              { icon: 'LockClosedIcon', label: 'Secure Vault', color: '#d97706', delay: '600ms' },
                              { icon: 'DocumentTextIcon', label: 'Documents', color: '#6b7280', delay: '700ms' },
                            ].map((col, ci) => (
                              <div key={ci} className="flex items-center gap-1.5 px-3 py-2 rounded-xl animate-pulse bg-gray-50 border border-gray-100" style={{ animationDelay: `${ci * 100}ms` }}>
                                <Icon name={col.icon as any} size={11} className="text-gray-400" />
                                <span className="truncate text-gray-400" style={{ fontSize: '10px' }}>{col.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : insightsText ? (
                        <div className="grid sm:grid-cols-2 gap-4">
                          {[
                            { key: 'KEY CASE INSIGHTS', icon: 'MagnifyingGlassIcon', accent: '#2563eb', bg: 'rgba(37,99,235,0.04)', border: 'rgba(37,99,235,0.12)', label: 'Key Case Insights' },
                            { key: 'TIMELINE PREDICTIONS', icon: 'ClockIcon', accent: '#7c3aed', bg: 'rgba(124,58,237,0.04)', border: 'rgba(124,58,237,0.12)', label: 'Timeline Predictions' },
                            { key: 'EVIDENCE.*PREPARATION GAPS', icon: 'ExclamationTriangleIcon', accent: '#ea580c', bg: 'rgba(234,88,12,0.04)', border: 'rgba(234,88,12,0.12)', label: 'Evidence & Preparation Gaps' },
                            { key: 'NEXT STEPS', icon: 'ArrowRightCircleIcon', accent: '#d97706', bg: 'rgba(245,158,11,0.04)', border: 'rgba(245,158,11,0.12)', label: 'Next Steps' },
                          ].map((section) => {
                            const sectionRegex = new RegExp(`\\*\\*[0-9]+\\.\\s*${section.key}\\*\\*([\\s\\S]*?)(?=\\*\\*[0-9]+\\.|$)`, 'i');
                            const match = insightsText.match(sectionRegex);
                            const rawContent = match ? match[1].trim() : '';
                            const bullets = rawContent.split('\n').map(l => l.replace(/^[-*•]\s*/, '').replace(/^\*\*(.*?)\*\*/, '$1').trim()).filter(l => l.length > 0 && !l.startsWith('**'));
                            return (
                              <div key={section.key} className="rounded-2xl p-5" style={{ background: section.bg, border: `1px solid ${section.border}` }}>
                                <div className="flex items-center gap-2 mb-3">
                                  <Icon name={section.icon as any} size={14} style={{ color: section.accent }} />
                                  <span className="font-display font-700 text-xs tracking-tight" style={{ color: section.accent }}>{section.label}</span>
                                </div>
                                {bullets.length > 0 ? (
                                  <ul className="space-y-2">
                                    {bullets.map((bullet, idx) => (
                                      <li key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-gray-600">
                                        <div className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: section.accent }} />
                                        {bullet}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="prose prose-xs max-w-none text-xs leading-relaxed text-gray-600">
                                    <ReactMarkdown>{rawContent || 'No data available.'}</ReactMarkdown>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {insightsGenerated && !insightsLoading && !insightsAiLoading && insightsText && (
                        <div className="mt-5 flex items-center justify-between gap-2 pt-4" style={{ borderTop: '1px solid #e5e7eb' }}>
                          <p className="text-gray-400" style={{ fontSize: '10px' }}>AI analysis based on your live case data · Not legal advice</p>
                          <p className="text-gray-400" style={{ fontSize: '10px' }}>
                            {insightsGeneratedAt ? insightsGeneratedAt.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Court Reports */}
                  {activeToolTab === 'court-reports' && (
                    <div id="court-report">
                      <CourtReportBuilder
                        caseContext={caseContext}
                        fetchAllToolsContext={fetchAllToolsContext}
                        userEmail={user?.email}
                        userName={displayName}
                        supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL}
                      />
                    </div>
                  )}

                  {/* Child Contacts */}
                  {activeToolTab === 'contacts' && (
                    <div id="child-contacts">
                      <div className="flex items-center justify-between mb-4 sm:mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-50">
                            <Icon name="UserGroupIcon" size={16} className="text-teal-500" />
                          </div>
                          <div>
                            <h3 className="font-display font-700 text-gray-900 text-sm tracking-tight">Child Contact Tracker</h3>
                            <p className="text-gray-400" style={{ fontSize: '10px' }}>Scheduled visits &amp; contact log</p>
                          </div>
                        </div>
                        <button onClick={() => setShowAddContact((v) => !v)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-700 transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>
                          <Icon name="PlusIcon" size={12} className="text-white" />
                          Add Contact
                        </button>
                      </div>

                      {showAddContact && (
                        <div className="mb-5 p-4 sm:p-5 rounded-2xl bg-gray-50 border border-gray-200">
                          <p className="font-display font-700 text-gray-900 text-xs mb-4 tracking-tight">New Contact Visit</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <div>
                              <label className="block text-gray-500 mb-1.5" style={{ fontSize: '10px' }}>Child Name *</label>
                              <input type="text" value={newContact.child_name} onChange={(e) => setNewContact((p) => ({ ...p, child_name: e.target.value }))} placeholder="e.g. Emily" className="w-full text-sm mb-4 py-2.5 px-4 rounded-xl outline-none bg-white border border-gray-200 text-gray-900 focus:border-amber-300 focus:bg-white" onKeyDown={(e) => { if (e.key === 'Enter') handleAddContact(); }} />
                            </div>
                            <div>
                              <label className="block text-gray-500 mb-1.5" style={{ fontSize: '10px' }}>Contact Date &amp; Time *</label>
                              <input type="datetime-local" value={newContact.contact_date} onChange={(e) => setNewContact((p) => ({ ...p, contact_date: e.target.value }))} className="w-full text-sm mb-4 py-2.5 px-4 rounded-xl outline-none bg-white border border-gray-200 text-gray-900 focus:border-amber-300" />
                            </div>
                            <div>
                              <label className="block text-gray-500 mb-1.5" style={{ fontSize: '10px' }}>Contact Type</label>
                              <select value={newContact.contact_type} onChange={(e) => setNewContact((p) => ({ ...p, contact_type: e.target.value as any }))} className="w-full text-sm mb-4 py-2.5 px-4 rounded-xl outline-none bg-white border border-gray-200 text-gray-900 focus:border-amber-300">
                                <option value="in_person">In Person</option>
                                <option value="video">Video Call</option>
                                <option value="phone">Phone Call</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-gray-500 mb-1.5" style={{ fontSize: '10px' }}>Location (optional)</label>
                              <input type="text" value={newContact.location} onChange={(e) => setNewContact((p) => ({ ...p, location: e.target.value }))} placeholder="e.g. Contact Centre" className="w-full text-sm mb-4 py-2.5 px-4 rounded-xl outline-none bg-white border border-gray-200 text-gray-900 focus:border-amber-300" />
                            </div>
                          </div>
                          <div className="mb-4">
                            <label className="block text-gray-500 mb-1.5" style={{ fontSize: '10px' }}>Notes (optional)</label>
                            <input type="text" value={newContact.notes} onChange={(e) => setNewContact((p) => ({ ...p, notes: e.target.value }))} placeholder="Any additional notes..." className="w-full text-sm mb-4 py-2.5 px-4 rounded-xl outline-none bg-white border border-gray-200 text-gray-900 focus:border-amber-300" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={handleAddContact} disabled={addingContact || !newContact.child_name.trim() || !newContact.contact_date} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-700 transition-all hover:opacity-90 active:scale-95" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>
                              {addingContact ? 'Saving…' : 'Save Contact'}
                            </button>
                            <button onClick={() => { setShowAddContact(false); setNewContact({ child_name: '', contact_date: '', contact_type: 'in_person', notes: '', location: '' }); }} className="px-4 py-2.5 rounded-xl text-sm font-600 transition-all bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {!contactsLoading && childContacts.length > 0 && (
                        <div className="grid grid-cols-3 gap-3 mb-5">
                          {[
                            { label: 'Upcoming', count: childContacts.filter((c) => c.status === 'scheduled' && new Date(c.contact_date) >= new Date()).length, accent: '#0d9488', bg: 'rgba(13,148,136,0.06)', border: 'rgba(13,148,136,0.15)' },
                            { label: 'Completed', count: childContacts.filter((c) => c.status === 'completed').length, accent: '#059669', bg: 'rgba(5,150,105,0.06)', border: 'rgba(5,150,105,0.15)' },
                            { label: 'Missed', count: childContacts.filter((c) => c.status === 'missed').length, accent: '#dc2626', bg: 'rgba(220,38,38,0.06)', border: 'rgba(220,38,38,0.15)' },
                          ].map((stat) => (
                            <div key={stat.label} className="rounded-2xl p-4 text-center" style={{ background: stat.bg, border: `1px solid ${stat.border}` }}>
                              <p className="font-display font-900 text-xl leading-none" style={{ color: stat.accent }}>{stat.count}</p>
                              <p className="mt-1 text-gray-500" style={{ fontSize: '10px' }}>{stat.label}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {contactsLoading ? (
                        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-2xl animate-pulse bg-gray-100" />)}</div>
                      ) : childContacts.length === 0 ? (
                        <div className="py-12 text-center">
                          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-teal-50 border border-teal-100">
                            <Icon name="UserGroupIcon" size={24} className="text-teal-500" />
                          </div>
                          <p className="text-sm font-display font-700 text-gray-900 mb-1 tracking-tight">No contact visits yet</p>
                          <p className="text-xs text-gray-400">Track scheduled visits, missed contacts, and upcoming dates.</p>
                          <button onClick={() => setShowAddContact(true)} className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-700 transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>
                            <Icon name="PlusIcon" size={12} className="text-white" />
                            Add First Contact
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {childContacts.map((contact) => {
                            const isPast = new Date(contact.contact_date) < new Date();
                            const isMissed = contact.status === 'missed' || (isPast && contact.status === 'scheduled');
                            const isUpcoming = contact.status === 'scheduled' && !isPast;
                            const isCompleted = contact.status === 'completed';
                            const isCancelled = contact.status === 'cancelled';
                            const typeIcon = contact.contact_type === 'video' ? 'VideoCameraIcon' : contact.contact_type === 'phone' ? 'PhoneIcon' : 'UserIcon';
                            const typeLabel = contact.contact_type === 'in_person' ? 'In Person' : contact.contact_type === 'video' ? 'Video Call' : 'Phone Call';
                            const accent = isCompleted ? '#059669' : isMissed ? '#dc2626' : isCancelled ? '#6b7280' : '#0d9488';
                            const bg = isCompleted ? 'rgba(5,150,105,0.04)' : isMissed ? 'rgba(220,38,38,0.04)' : isCancelled ? 'rgba(107,114,128,0.04)' : 'rgba(13,148,136,0.04)';
                            const border = isCompleted ? 'rgba(5,150,105,0.15)' : isMissed ? 'rgba(220,38,38,0.15)' : isCancelled ? 'rgba(107,114,128,0.15)' : 'rgba(13,148,136,0.15)';
                            const d = new Date(contact.contact_date);
                            const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                            const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                            return (
                              <div key={contact.id} className="flex items-center gap-3 p-3.5 rounded-2xl" style={{ background: bg, border: `1px solid ${border}` }}>
                                <div className="flex-shrink-0 w-9 h-9 rounded-xl flex flex-col items-center justify-center" style={{ background: `${accent}12` }}>
                                  <Icon name={typeIcon as any} size={15} style={{ color: accent }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <p className="text-xs font-display font-700 text-gray-900 tracking-tight">{contact.child_name}</p>
                                    <span className="px-1.5 py-0.5 rounded-lg bg-gray-100 text-gray-500" style={{ fontSize: '9px' }}>{typeLabel}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-gray-400" style={{ fontSize: '10px' }}>{dateStr} · {timeStr}</span>
                                    {contact.location && <span className="truncate text-gray-300" style={{ fontSize: '10px' }}>· {contact.location}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  {isUpcoming && (
                                    <>
                                      <button onClick={() => handleUpdateContactStatus(contact.id, 'completed')} title="Mark completed" className="w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-emerald-50 hover:bg-emerald-100">
                                        <Icon name="CheckIcon" size={12} className="text-emerald-600" />
                                      </button>
                                      <button onClick={() => handleUpdateContactStatus(contact.id, 'missed')} title="Mark missed" className="w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-red-50 hover:bg-red-100">
                                        <Icon name="XMarkIcon" size={12} className="text-red-500" />
                                      </button>
                                    </>
                                  )}
                                  {(isCompleted || isMissed) && (
                                    <span className="px-2 py-0.5 rounded-xl font-700 uppercase tracking-wider" style={{ fontSize: '9px', background: `${accent}12`, color: accent }}>
                                      {isCompleted ? 'Done' : 'Missed'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Finance Tracker */}
                  {activeToolTab === 'finance' && (
                    <div id="finance-tracker">
                      <div className="flex items-center justify-between mb-4 sm:mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50">
                            <Icon name="BanknotesIcon" size={16} className="text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="font-display font-700 text-gray-900 text-sm tracking-tight">Finance Tracker</h3>
                            <p className="text-gray-400" style={{ fontSize: '10px' }}>Income &amp; expense overview</p>
                          </div>
                        </div>
                        <Link href="/case-management" className="text-xs font-600 transition-colors" style={{ color: '#d97706' }}>Manage in Case →</Link>
                      </div>

                      {dataLoading ? (
                        <div className="grid grid-cols-3 gap-3 mb-5">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl animate-pulse bg-gray-100" />)}</div>
                      ) : (
                        <div className="grid grid-cols-3 gap-3 mb-6">
                          <div className="rounded-2xl p-4" style={{ background: 'rgba(5,150,105,0.04)', border: '1px solid rgba(5,150,105,0.15)' }}>
                            <p className="mb-1.5 text-xs text-gray-500">Income</p>
                            <p className="font-display font-900 text-xl sm:text-2xl text-emerald-600">£{metrics.financeIncome.toLocaleString('en-GB', { minimumFractionDigits: 0 })}</p>
                          </div>
                          <div className="rounded-2xl p-4" style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.15)' }}>
                            <p className="mb-1.5 text-xs text-gray-500">Expenses</p>
                            <p className="font-display font-900 text-xl sm:text-2xl text-red-600">£{metrics.financeExpenses.toLocaleString('en-GB', { minimumFractionDigits: 0 })}</p>
                          </div>
                          <div className="rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.15)' }}>
                            <p className="mb-1.5 text-xs text-gray-500">Net Balance</p>
                            <p className="font-display font-900 text-xl sm:text-2xl" style={{ color: netBalance >= 0 ? '#059669' : '#dc2626' }}>£{Math.abs(netBalance).toLocaleString('en-GB', { minimumFractionDigits: 0 })}</p>
                          </div>
                        </div>
                      )}

                      <div className="mb-6">
                        <p className="text-xs font-700 uppercase tracking-widest mb-4 text-gray-400">Progress Overview</p>
                        <div className="space-y-4">
                          {[
                            { label: 'Case Progress', value: metrics.caseProgress, accent: '#d97706' },
                            { label: 'Evidence Coverage', value: timelineCompleteness, accent: '#7c3aed' },
                            { label: 'Documents Filed', value: Math.min((metrics.documentsCount / 10) * 100, 100), accent: '#2563eb' },
                            { label: 'Contact Logs', value: Math.min((metrics.contactLogsCount / 20) * 100, 100), accent: '#059669' },
                          ].map((item) => (
                            <div key={item.label}>
                              <div className="flex justify-between items-center mb-1.5">
                                <span className="text-xs font-500 text-gray-500">{item.label}</span>
                                <span className="text-xs font-display font-700" style={{ color: item.accent }}>{Math.round(item.value)}%</span>
                              </div>
                              <div className="w-full h-1.5 rounded-full overflow-hidden bg-gray-100">
                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.value}%`, background: item.accent }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link href="/case-management" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-700 transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>
                          <Icon name="PlusIcon" size={12} className="text-white" />
                          Add Finance Entry
                        </Link>
                        <Link href="/case-management" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-600 transition-all bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100">View All Logs</Link>
                      </div>
                    </div>
                  )}

                  {/* Communication Logger */}
                  {activeToolTab === 'comms' && (
                    <div id="comm-logger">
                      <div className="flex items-center justify-between mb-4 sm:mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50">
                            <Icon name="ChatBubbleLeftRightIcon" size={16} className="text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-display font-700 text-gray-900 text-sm tracking-tight">Communication Logger</h3>
                            <p className="text-gray-400" style={{ fontSize: '10px' }}>Track all communications with the other party</p>
                          </div>
                        </div>
                        <Link href="/case-management" className="text-xs font-600 transition-colors" style={{ color: '#d97706' }}>Manage in Case →</Link>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                        {[
                          { label: 'WhatsApp', icon: 'ChatBubbleLeftIcon', accent: '#059669', bg: 'rgba(5,150,105,0.04)', border: 'rgba(5,150,105,0.12)', desc: 'Log WhatsApp messages & screenshots' },
                          { label: 'Email', icon: 'EnvelopeIcon', accent: '#2563eb', bg: 'rgba(37,99,235,0.04)', border: 'rgba(37,99,235,0.12)', desc: 'Record email exchanges & threads' },
                          { label: 'Phone', icon: 'PhoneIcon', accent: '#7c3aed', bg: 'rgba(124,58,237,0.04)', border: 'rgba(124,58,237,0.12)', desc: 'Log phone calls & voicemails' },
                        ].map((ch) => (
                          <Link key={ch.label} href="/case-management" className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:-translate-y-0.5 hover:shadow-sm" style={{ background: ch.bg, border: `1px solid ${ch.border}` }}>
                            <div className="w-8 h-8 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: `${ch.accent}12` }}>
                              <Icon name={ch.icon as any} size={16} style={{ color: ch.accent }} />
                            </div>
                            <div>
                              <p className="text-xs font-display font-700 text-gray-900 tracking-tight">{ch.label}</p>
                              <p className="mt-0.5 text-gray-400" style={{ fontSize: '10px' }}>{ch.desc}</p>
                            </div>
                          </Link>
                        ))}
                      </div>

                      <div className="p-4 rounded-2xl mb-5 bg-blue-50 border border-blue-100">
                        <div className="flex items-start gap-3">
                          <Icon name="InformationCircleIcon" size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-700 mb-1 tracking-tight text-blue-700">Why log communications?</p>
                            <p className="text-xs leading-relaxed text-blue-600">Courts expect a clear record of all communications. Logging messages, emails, and calls helps build your case and demonstrates good faith to the judge.</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Link href="/case-management" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-700 transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>
                          <Icon name="PlusIcon" size={12} className="text-white" />
                          Log Communication
                        </Link>
                        <Link href="/case-management" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-600 transition-all bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100">View All Logs</Link>
                      </div>
                    </div>
                  )}

                  {/* Secure Vault */}
                  {activeToolTab === 'vault' && (
                    <div id="secure-documents">
                      <div className="flex items-center justify-between mb-4 sm:mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50">
                            <Icon name="LockClosedIcon" size={16} className="text-amber-500" />
                          </div>
                          <div>
                            <h3 className="font-display font-700 text-gray-900 text-sm tracking-tight">Secure Document Vault</h3>
                            <p className="text-gray-400" style={{ fontSize: '10px' }}>{secureFiles.length} file{secureFiles.length !== 1 ? 's' : ''} stored securely</p>
                          </div>
                        </div>
                        {activeVaultFolder && (
                          <button onClick={() => setActiveVaultFolder(null)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-700 transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>Upload</button>
                        )}
                      </div>

                      {!activeVaultFolder ? (
                        <div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                            {vaultFolders.map((folder) => {
                              const folderFiles = secureFiles.filter((f) => f.context === `dashboard-secure/${folder}`);
                              return (
                                <button key={folder} onClick={() => setActiveVaultFolder(folder)} className="flex items-center gap-3 p-3 rounded-2xl transition-all text-left hover:-translate-y-0.5 hover:shadow-sm bg-gray-50 border border-gray-200 hover:border-gray-300">
                                  <div className="w-8 h-8 rounded-xl flex flex-col items-center justify-center bg-amber-50">
                                    <Icon name="FolderIcon" size={16} className="text-amber-500" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-display font-700 text-gray-900 truncate tracking-tight">{folder}</p>
                                    <p className="mt-0.5 text-gray-400" style={{ fontSize: '10px' }}>{folderFiles.length} file{folderFiles.length !== 1 ? 's' : ''}</p>
                                  </div>
                                  <Icon name="ChevronRightIcon" size={13} className="text-gray-300 flex-shrink-0" />
                                </button>
                              );
                            })}
                          </div>

                          {showNewFolderInput ? (
                            <div className="flex gap-2">
                              <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newFolderName.trim()) { const name = newFolderName.trim(); if (!vaultFolders.includes(name)) setVaultFolders((prev) => [...prev, name]); setNewFolderName(''); setShowNewFolderInput(false); } if (e.key === 'Escape') { setShowNewFolderInput(false); setNewFolderName(''); } }} placeholder="Folder name…" autoFocus className="flex-1 text-xs py-2.5 px-3 rounded-xl outline-none bg-white border border-gray-200 text-gray-900 focus:border-amber-300" />
                              <button onClick={() => { const name = newFolderName.trim(); if (name && !vaultFolders.includes(name)) setVaultFolders((prev) => [...prev, name]); setNewFolderName(''); setShowNewFolderInput(false); }} disabled={!newFolderName.trim()} className="px-3 py-2 rounded-xl text-xs font-700 transition-all hover:opacity-90 disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>Add</button>
                              <button onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }} className="px-3 py-2 rounded-xl text-xs font-600 transition-all bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setShowNewFolderInput(true)} className="flex items-center gap-2 w-full p-3.5 rounded-2xl transition-all border border-dashed border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500">
                              <Icon name="FolderPlusIcon" size={14} />
                              <span className="text-xs font-600">New Folder</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 mb-4">
                            <button onClick={() => setActiveVaultFolder(null)} className="flex items-center gap-1 transition-colors text-gray-400 hover:text-gray-600" style={{ fontSize: '11px' }}>
                              <Icon name="ChevronLeftIcon" size={12} />
                              Folders
                            </button>
                            <span className="text-xs text-gray-300">/</span>
                            <div className="flex items-center gap-1.5">
                              <Icon name="FolderOpenIcon" size={12} className="text-amber-500" />
                              <span className="text-xs font-display font-700 text-gray-900 tracking-tight">{activeVaultFolder}</span>
                            </div>
                          </div>
                          {filesLoading ? (
                            <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-10 rounded-xl animate-pulse bg-gray-100" />)}</div>
                          ) : (
                            <FileUpload
                              inputId="secure-docs-upload-input"
                              context={activeVaultFolder ? `dashboard-secure/${activeVaultFolder}` : 'dashboard-secure'}
                              label="Upload Document"
                              accept="all"
                              multiple
                              existingFiles={secureFiles.filter((f) => f.context === `dashboard-secure/${activeVaultFolder}`)}
                              onUploaded={(f) => { setSecureFiles((prev) => [f, ...prev]); trackAIFeatureAdoption({ feature: 'file_upload_used', caseType: caseContext?.caseType || 'unknown' }); }}
                              onDeleted={(id) => setSecureFiles((prev) => prev.filter((f) => f.id !== id))}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Insight Scheduler */}
                  {activeToolTab === 'scheduler' && (
                    <div>
                      <div className="flex items-center justify-between mb-4 sm:mb-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50">
                            <Icon name="CalendarDaysIcon" size={16} className="text-amber-500" />
                          </div>
                          <div>
                            <h3 className="font-display font-700 text-gray-900 text-sm tracking-tight">Automated Insight Scheduler</h3>
                            <p className="text-gray-400" style={{ fontSize: '10px' }}>Schedule weekly or monthly AI insights delivered to your inbox</p>
                          </div>
                        </div>
                      </div>
                      <InsightScheduler />
                    </div>
                  )}

                </div>
              </div>
            </div>

          </div>
        </main>
      </div>

      {/* ── Email Insights Modal ── */}
      {insightsEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md p-6 rounded-2xl shadow-2xl bg-white border border-gray-200">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                <Icon name="EnvelopeIcon" size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-display font-700 text-gray-900 text-sm tracking-tight">Share AI Case Insights</h3>
                <p className="text-xs mt-0.5 text-gray-400">Send a formatted report via email</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <Icon name="MagnifyingGlassIcon" size={12} className="text-gray-400" />
              <span className="text-xs text-gray-400">Report includes:</span>
            </div>
            <div className="rounded-2xl p-4 mb-4 bg-gray-50 border border-gray-100">
              <p className="text-xs font-display font-700 text-gray-900 mb-2 tracking-tight">Key Case Insights</p>
              <p className="text-xs font-display font-700 text-gray-900 mb-2 tracking-tight">Timeline Predictions</p>
              <p className="text-xs font-display font-700 text-gray-900 mb-2 tracking-tight">Evidence & Preparation Gaps</p>
              <p className="text-xs font-display font-700 text-gray-900 mb-2 tracking-tight">Next Steps</p>
              <p className="text-xs font-display font-700 text-gray-900 mb-2 tracking-tight">Date/time stamp & data sources</p>
            </div>
            <label className="block text-xs font-600 mb-1.5 text-gray-600">Recipient Email Address</label>
            <input type="email" value={insightsEmailAddress} onChange={(e) => setInsightsEmailAddress(e.target.value)} placeholder="email@example.com" className="w-full text-sm mb-4 py-2.5 px-4 rounded-xl outline-none bg-gray-50 border border-gray-200 text-gray-900 focus:border-amber-300 focus:bg-white" onKeyDown={(e) => { if (e.key === 'Enter') handleInsightsEmail(); }} />
            <div className="flex gap-3">
              <button onClick={() => { setInsightsEmailModalOpen(false); setInsightsEmailAddress(''); }} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-600 transition-colors bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100">Cancel</button>
              <button onClick={handleInsightsEmail} disabled={insightsEmailSending || !insightsEmailAddress.trim()} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-display font-700 text-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', color: 'white' }}>
                {insightsEmailSending ? (
                  <><div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />Sending…</>
                ) : (
                  <><Icon name="PaperAirplaneIcon" size={14} className="text-white" />Send Report</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}