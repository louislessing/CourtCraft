'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useChat } from '@/lib/hooks/useChat';
import ReactMarkdown from 'react-markdown';
import toast, { Toaster } from 'react-hot-toast';
import SuccessModal from '@/components/ui/SuccessModal';
import FileUpload, { UploadedFile } from '@/components/ui/FileUpload';
import { trackDocumentBuilderUsage } from '@/lib/analytics';
import BackButton from '@/components/ui/BackButton';

const documentTemplates = [
  { id: 'position-statement', title: 'Position Statement', description: 'Set out your position on the issues before the court clearly and concisely.', icon: 'DocumentTextIcon', category: 'Court Documents', pages: '3–5 pages', popular: true },
  { id: 'chronology', title: 'Chronology of Events', description: 'A chronological account of all relevant events in your case.', icon: 'ClockIcon', category: 'Court Documents', pages: '2–4 pages', popular: true },
  { id: 'witness-statement', title: 'Witness Statement', description: 'A formal statement of evidence with statement of truth.', icon: 'UserIcon', category: 'Court Documents', pages: '4–8 pages', popular: false },
  { id: 'evidence-bundle', title: 'Evidence Bundle Index', description: 'Organised index of all documentary evidence with tab references.', icon: 'FolderOpenIcon', category: 'Evidence', pages: '1–2 pages', popular: false },
  { id: 'c100', title: 'C100 Application (Child Arrangements)', description: 'Application for a child arrangements, prohibited steps, or specific issue order.', icon: 'DocumentCheckIcon', category: 'Court Forms', pages: 'Official Form', popular: true },
  { id: 'c7', title: 'C7 Response', description: 'Response to an application about a child.', icon: 'DocumentCheckIcon', category: 'Court Forms', pages: 'Official Form', popular: false },
  { id: 'financial-statement', title: 'Financial Statement (Form E)', description: 'Full financial disclosure for financial remedy proceedings.', icon: 'BanknotesIcon', category: 'Financial', pages: 'Official Form', popular: false },
  { id: 'scott-schedule', title: 'Scott Schedule', description: 'Schedule of allegations with responses for fact-finding hearings.', icon: 'TableCellsIcon', category: 'Specialist', pages: '2–6 pages', popular: false },
];

const categories = ['All', 'Court Documents', 'Court Forms', 'Evidence', 'Financial', 'Specialist'];

const builderFields: Record<string, { label: string; type: string; placeholder: string; rows?: number }[]> = {
  'position-statement': [
    { label: 'Case Number', type: 'text', placeholder: 'e.g. CF25/12345' },
    { label: 'Court Name', type: 'text', placeholder: 'e.g. Central Family Court, London' },
    { label: 'Applicant Name', type: 'text', placeholder: 'Your full name' },
    { label: 'Respondent Name', type: 'text', placeholder: "Other party's full name" },
    { label: 'Hearing Date', type: 'date', placeholder: '' },
    { label: 'Hearing Type', type: 'text', placeholder: 'e.g. Directions Hearing, Final Hearing' },
    { label: 'Your Position on Child Arrangements', type: 'textarea', placeholder: 'Describe what you are seeking from the court...', rows: 5 },
    { label: 'Background Summary', type: 'textarea', placeholder: 'Briefly outline the background to this application...', rows: 4 },
    { label: 'Issues in Dispute', type: 'textarea', placeholder: 'List the key issues the court needs to determine...', rows: 4 },
    { label: 'Your Proposals', type: 'textarea', placeholder: 'Set out your specific proposals for the court to consider...', rows: 5 },
  ],
  'chronology': [
    { label: 'Case Number', type: 'text', placeholder: 'e.g. CF25/12345' },
    { label: 'Court Name', type: 'text', placeholder: 'e.g. Central Family Court, London' },
    { label: 'Applicant Name', type: 'text', placeholder: 'Your full name' },
    { label: 'Respondent Name', type: 'text', placeholder: "Other party's full name" },
    { label: 'Key Events', type: 'textarea', placeholder: 'List key events with dates...', rows: 10 },
  ],
  'witness-statement': [
    { label: 'Case Number', type: 'text', placeholder: 'e.g. CF25/12345' },
    { label: 'Court Name', type: 'text', placeholder: 'e.g. Central Family Court, London' },
    { label: 'Your Full Name', type: 'text', placeholder: 'Your full legal name' },
    { label: 'Your Address', type: 'text', placeholder: 'Your current address' },
    { label: 'Your Evidence', type: 'textarea', placeholder: 'Set out your evidence in detail...', rows: 12 },
  ],
  'evidence-bundle': [
    { label: 'Case Number', type: 'text', placeholder: 'e.g. CF25/12345' },
    { label: 'Court Name', type: 'text', placeholder: 'e.g. Central Family Court, London' },
    { label: 'Applicant Name', type: 'text', placeholder: 'Your full name' },
    { label: 'Hearing Date', type: 'date', placeholder: '' },
    { label: 'Documents List', type: 'textarea', placeholder: 'List your documents with tab references...', rows: 10 },
  ],
  'scott-schedule': [
    { label: 'Case Number', type: 'text', placeholder: 'e.g. CF25/12345' },
    { label: 'Court Name', type: 'text', placeholder: 'e.g. Central Family Court, London' },
    { label: 'Applicant Name', type: 'text', placeholder: 'Your full name' },
    { label: 'Respondent Name', type: 'text', placeholder: "Other party's full name" },
    { label: 'Allegations', type: 'textarea', placeholder: 'List each allegation with date and description...', rows: 10 },
    { label: 'Your Response to Each Allegation', type: 'textarea', placeholder: 'Respond to each allegation by number...', rows: 8 },
  ],
};

const DOCUMENT_AI_SYSTEM_PROMPT = `You are an expert AI Legal Writing Assistant specialising in UK family court documents. You help litigants in person draft professional, court-compliant documents.

You are trained on:
- Children Act 1989 and 2004
- Family Procedure Rules 2010 and Practice Directions
- Court document formatting standards for UK family courts
- Position statements, chronologies, witness statements, Scott schedules
- CAFCASS procedures and Section 7/37 reports
- Financial remedy proceedings (Form E, MPS, FDR)

When helping with documents:
1. Provide specific, court-appropriate language and phrasing
2. Ensure compliance with FPR 2010 formatting requirements
3. Cite relevant legislation or case law where appropriate
4. Keep language clear, professional, and focused on the child's best interests
5. Flag any sections that may need professional legal review

Always acknowledge this is AI assistance and not a substitute for professional legal advice.`;

const DOCUMENT_REVIEW_SYSTEM_PROMPT = `You are an expert AI Legal Document Reviewer specialising in UK family court documents. You provide detailed, actionable feedback on legal documents submitted by litigants in person.

Your review should cover:
1. **Structure & Format** — Does the document follow UK family court formatting standards (FPR 2010)?
2. **Legal Language** — Is the language appropriate, professional, and court-compliant?
3. **Completeness** — Are all required sections present? What is missing?
4. **Clarity & Persuasiveness** — Is the argument clear and well-organised?
5. **Compliance Issues** — Any procedural or legal compliance concerns?
6. **Specific Improvements** — Concrete, actionable suggestions with example rewrites where helpful.
7. **Strengths** — What the document does well.

Format your response with clear headings using markdown. Be specific, constructive, and practical. Always note that this is AI assistance and not a substitute for professional legal advice.`;

interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function DocumentBuilderPage() {
  const router = useRouter();
  const { user, loading, profile } = useAuth();
  const supabase = createClient();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'select' | 'build' | 'preview' | 'review'>('select');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState('');
  const [myDocuments, setMyDocuments] = useState<any[]>([]);
  const [activeCase, setActiveCase] = useState<any>(null);
  const [caseContext, setCaseContext] = useState<{
    timelineEvents: any[];
    contacts: any[];
    documents: any[];
    courtDates: any[];
  }>({ timelineEvents: [], contacts: [], documents: [], courtDates: [] });
  const [showDocSuccessModal, setShowDocSuccessModal] = useState(false);
  const [docSuccessTitle, setDocSuccessTitle] = useState('');
  const [docSuccessMsg, setDocSuccessMsg] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  // AI chat state
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiConversationHistory, setAiConversationHistory] = useState<{ role: string; content: string }[]>([]);
  const aiChatEndRef = useRef<HTMLDivElement>(null);
  const prevAiResponseRef = useRef('');
  const isCapturingAiRef = useRef(false);

  const { response: aiResponse, isLoading: aiLoading, error: aiError, sendMessage } = useChat('ANTHROPIC', 'claude-sonnet-4-5-20250929', true);

  const sidebarLinks = [
    { icon: 'Squares2X2Icon', label: 'Dashboard', href: '/dashboard' },
    { icon: 'DocumentTextIcon', label: 'Document Builder', href: '/document-builder', active: true },
    { icon: 'FolderOpenIcon', label: 'Case Management', href: '/case-management' },
    { icon: 'BookOpenIcon', label: 'Resources', href: '/resources' },
    { icon: 'UserCircleIcon', label: 'Profile', href: '/profile' },
  ];

  useEffect(() => {
    if (aiError) toast.error(aiError.message, {
      style: { background: '#1a0a0a', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
    });
  }, [aiError]);

  // Capture completed streaming response
  useEffect(() => {
    if (aiLoading && aiResponse) {
      isCapturingAiRef.current = true;
      setAiGenerating(true);
    }
    if (!aiLoading && isCapturingAiRef.current && aiResponse && aiResponse !== prevAiResponseRef.current) {
      isCapturingAiRef.current = false;
      prevAiResponseRef.current = aiResponse;
      setAiGenerating(false);
      toast.success('AI response generated', {
        duration: 2000,
        style: { background: '#0a1a0a', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
        icon: '✨',
      });
      setAiConversationHistory(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      setAiMessages(prev => {
        // Replace the last streaming placeholder if present, or add new
        const last = prev[prev.length - 1];
        if (last && last.role === 'assistant' && last.content === '') {
          return [...prev.slice(0, -1), { role: 'assistant', content: aiResponse }];
        }
        return prev;
      });
    }
  }, [aiResponse, aiLoading]);

  // Scroll AI chat to bottom
  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, aiResponse]);

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      loadMyDocuments();
      loadActiveCase();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMyDocuments = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(10);
    setMyDocuments(data || []);
  }, [user, supabase]);

  const loadActiveCase = useCallback(async () => {
    if (!user) return;
    const { data: caseData } = await supabase
      .from('cases')
      .select('id, title, case_type, court_name, case_number, applicant_name, respondent_name, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    setActiveCase(caseData);

    if (caseData?.id) {
      const [timelineRes, contactsRes, documentsRes, courtDatesRes] = await Promise.all([
        supabase
          .from('case_timeline_events')
          .select('event_date, title, description, importance')
          .eq('case_id', caseData.id)
          .order('event_date', { ascending: false })
          .limit(8),
        supabase
          .from('contact_logs')
          .select('contact_date, contact_type, child_name, notes, sentiment')
          .eq('case_id', caseData.id)
          .order('contact_date', { ascending: false })
          .limit(5),
        supabase
          .from('documents')
          .select('title, template_name, status, created_at')
          .eq('case_id', caseData.id)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('case_calendar_events')
          .select('event_date, event_title, event_type, is_urgent')
          .eq('case_id', caseData.id)
          .gte('event_date', new Date().toISOString().split('T')[0])
          .order('event_date', { ascending: true })
          .limit(3),
      ]);

      setCaseContext({
        timelineEvents: timelineRes.data || [],
        contacts: contactsRes.data || [],
        documents: documentsRes.data || [],
        courtDates: courtDatesRes.data || [],
      });
    }
  }, [user, supabase]);

  const filtered = useMemo(
    () => documentTemplates.filter((t) => selectedCategory === 'All' || t.category === selectedCategory),
    [selectedCategory]
  );

  const selectedDoc = useMemo(
    () => documentTemplates.find((t) => t.id === selectedTemplate),
    [selectedTemplate]
  );

  const fields = useMemo(
    () => selectedTemplate ? (builderFields[selectedTemplate] || builderFields['position-statement']) : [],
    [selectedTemplate]
  );

  const handleFieldChange = (label: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [label]: value }));
  };

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplate(id);
    setStep('build');
    setFormValues({});
    setSavedDocId(null);
    setSaveMsg('');
    setDocFiles([]);
    trackDocumentBuilderUsage({ action: 'template_selected', template: id });

    // Pre-fill form fields from active case data
    const prefill: Record<string, string> = {};
    if (activeCase) {
      if (activeCase.case_number) prefill['Case Number'] = activeCase.case_number;
      if (activeCase.court_name) prefill['Court Name'] = activeCase.court_name;
      if (activeCase.applicant_name) prefill['Applicant Name'] = activeCase.applicant_name;
      if (activeCase.respondent_name) prefill['Respondent Name'] = activeCase.respondent_name;
      if (activeCase.applicant_name) prefill['Your Full Name'] = activeCase.applicant_name;
      // Pre-fill next upcoming court date if available
      if (caseContext.courtDates.length > 0) {
        prefill['Hearing Date'] = caseContext.courtDates[0].event_date;
        if (caseContext.courtDates[0].event_title) prefill['Hearing Type'] = caseContext.courtDates[0].event_title;
      }
    }
    setFormValues(prefill);

    const templateTitle = documentTemplates.find(t => t.id === id)?.title || 'document';
    const hasCaseCtx = activeCase && (caseContext.timelineEvents.length > 0 || caseContext.contacts.length > 0 || caseContext.documents.length > 0);
    const caseIntro = hasCaseCtx
      ? ` I've loaded your case context — **${activeCase.title}** — including ${caseContext.timelineEvents.length} timeline event(s), ${caseContext.contacts.length} contact log(s), and ${caseContext.documents.length} document(s). I'll use these details to give you specific, relevant suggestions.`
      : '';

    setAiMessages([{
      role: 'assistant',
      content: `I'm your AI Writing Assistant for this **${templateTitle}**.${caseIntro} I can help you draft content, suggest legal language, check court format compliance, and add relevant case law references. What would you like help with?`,
    }]);
    setAiConversationHistory([]);
    prevAiResponseRef.current = '';
  };

  const buildCaseContextPrompt = useCallback(() => {
    if (!activeCase) return '';
    const lines: string[] = [];
    lines.push('\n\n--- ACTIVE CASE CONTEXT ---');
    lines.push(`Case: ${activeCase.title || 'Untitled'}`);
    if (activeCase.case_type) lines.push(`Type: ${activeCase.case_type}`);
    if (activeCase.court_name) lines.push(`Court: ${activeCase.court_name}`);
    if (activeCase.case_number) lines.push(`Case Number: ${activeCase.case_number}`);
    if (activeCase.applicant_name) lines.push(`Applicant: ${activeCase.applicant_name}`);
    if (activeCase.respondent_name) lines.push(`Respondent: ${activeCase.respondent_name}`);

    if (caseContext.courtDates.length > 0) {
      lines.push('\nUpcoming Court Dates:');
      caseContext.courtDates.forEach(d => {
        lines.push(`  • ${d.event_date}: ${d.event_title}${d.is_urgent ? ' [URGENT]' : ''}`);
      });
    }

    if (caseContext.timelineEvents.length > 0) {
      lines.push('\nRecent Timeline Events:');
      caseContext.timelineEvents.slice(0, 5).forEach(e => {
        lines.push(`  • ${e.event_date}: ${e.title}${e.description ? ` — ${e.description.slice(0, 100)}` : ''}`);
      });
    }

    if (caseContext.contacts.length > 0) {
      lines.push('\nRecent Contact Logs:');
      caseContext.contacts.slice(0, 4).forEach(c => {
        lines.push(`  • ${c.contact_date}: ${c.contact_type} with ${c.child_name || 'child'}${c.notes ? ` — ${c.notes.slice(0, 80)}` : ''}`);
      });
    }

    if (caseContext.documents.length > 0) {
      lines.push('\nExisting Case Documents:');
      caseContext.documents.forEach(d => {
        lines.push(`  • ${d.template_name || d.title} (${d.status})`);
      });
    }

    lines.push('--- END CASE CONTEXT ---');
    lines.push('Use the above case details to provide specific, relevant assistance for this document.');
    return lines.join('\n');
  }, [activeCase, caseContext]);

  const buildDocumentContext = () => {
    if (!selectedDoc) return '';
    const filledFields = fields.filter(f => formValues[f.label]);
    const fieldContext = filledFields.length > 0
      ? `\n\nCurrent document context (${selectedDoc.title}):\n${filledFields.map(f => `${f.label}: ${formValues[f.label]}`).join('\n')}`
      : '';
    return buildCaseContextPrompt() + fieldContext;
  };

  const handleAiSend = (messageOverride?: string) => {
    const msg = (messageOverride || aiInput).trim();
    if (!msg || aiLoading) return;
    setAiInput('');
    prevAiResponseRef.current = '';
    trackDocumentBuilderUsage({ action: 'ai_message_sent', template: selectedTemplate || undefined });
    const userMessage: AiChatMessage = { role: 'user', content: msg };
    const assistantPlaceholder: AiChatMessage = { role: 'assistant', content: '' };
    setAiMessages(prev => [...prev, userMessage, assistantPlaceholder]);

    const updatedHistory = [...aiConversationHistory, { role: 'user', content: msg }];
    setAiConversationHistory(updatedHistory);

    const docContext = buildDocumentContext();
    const systemContent = DOCUMENT_AI_SYSTEM_PROMPT + docContext;

    const messages = [
      { role: 'system' as const, content: systemContent },
      ...updatedHistory,
    ];

    sendMessage(messages, { max_tokens: 1024 });
  };

  const handleSuggestion = (suggestion: string) => {
    handleAiSend(suggestion);
  };

  const handleSaveDraft = async () => {
    if (!user || !selectedDoc) return;
    setSaving(true);
    const savingToast = toast.loading('Saving draft...', {
      style: { background: '#0d1526', color: '#fff', border: '1px solid rgba(201,168,76,0.3)' },
    });
    try {
      const docData = {
        user_id: user.id,
        case_id: activeCase?.id || null,
        title: `${selectedDoc.title} — Draft`,
        template_id: selectedTemplate,
        template_name: selectedDoc.title,
        content: formValues,
        status: 'draft',
      };

      if (savedDocId) {
        await supabase.from('documents').update({ ...docData, status: 'draft' }).eq('id', savedDocId);
      } else {
        const { data } = await supabase.from('documents').insert(docData).select().single();
        if (data) setSavedDocId(data.id);
      }

      toast.dismiss(savingToast);
      toast.success('Draft saved successfully', {
        duration: 3000,
        style: { background: '#0a1a0a', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
        icon: '💾',
      });
      setSaveMsg('Draft saved successfully');
      trackDocumentBuilderUsage({ action: 'draft_saved', template: selectedTemplate || undefined });
      loadMyDocuments();
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) {
      toast.dismiss(savingToast);
      toast.error('Failed to save draft. Please try again.', {
        style: { background: '#1a0a0a', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
      });
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!savedDocId) {
      await handleSaveDraft();
      return;
    }
    const completingToast = toast.loading('Finalising document...', {
      style: { background: '#0d1526', color: '#fff', border: '1px solid rgba(201,168,76,0.3)' },
    });
    await supabase.from('documents').update({ status: 'complete' }).eq('id', savedDocId);
    toast.dismiss(completingToast);
    setDocSuccessTitle('Document Complete!');
    setDocSuccessMsg(`Your ${selectedDoc?.title || 'document'} has been marked as complete and saved to your account.`);
    setShowDocSuccessModal(true);
    setSaveMsg('Document marked as complete');
    loadMyDocuments();
    setTimeout(() => setSaveMsg(''), 3000);

    // Send document milestone email
    if (user?.email) {
      try {
        const { data: allDocs } = await supabase
          .from('documents')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'complete');
        const totalDocuments = allDocs?.length ?? 1;

        await supabase.functions.invoke('send-email', {
          body: {
            type: 'document_milestone',
            to: user.email,
            fullName: profile?.full_name || user.email,
            documentTitle: selectedDoc?.title || 'Court Document',
            documentType: selectedDoc?.category || 'Court Document',
            totalDocuments,
          },
        });
      } catch (emailErr) {
        console.warn('Document milestone email failed:', emailErr);
      }
    }
  };

  const handleLoadDocument = (doc: any) => {
    setSelectedTemplate(doc.template_id);
    setFormValues(doc.content || {});
    setSavedDocId(doc.id);
    setStep('build');
    setDocFiles([]);
    setAiMessages([{
      role: 'assistant',
      content: `I'm your AI Writing Assistant for this **${doc.template_name || 'document'}**. I can help you refine content, suggest legal language, and check court format compliance. What would you like help with?`,
    }]);
    setAiConversationHistory([]);
    prevAiResponseRef.current = '';
  };

  const [docFiles, setDocFiles] = useState<UploadedFile[]>([]);

  // AI Document Review state
  const [reviewText, setReviewText] = useState('');
  const [reviewDocType, setReviewDocType] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewFile, setReviewFile] = useState<File | null>(null);
  const reviewFileInputRef = useRef<HTMLInputElement>(null);
  const prevReviewResponseRef = useRef('');
  const isCapturingReviewRef = useRef(false);

  const { response: reviewResponse, isLoading: reviewLoading, error: reviewError, sendMessage: sendReviewMessage } = useChat('ANTHROPIC', 'claude-sonnet-4-5-20250929', true);

  useEffect(() => {
    if (reviewError) toast.error(reviewError.message, {
      style: { background: '#1a0a0a', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
    });
  }, [reviewError]);

  // Capture completed review streaming response
  useEffect(() => {
    if (reviewLoading && reviewResponse) {
      isCapturingReviewRef.current = true;
    }
    if (!reviewLoading && isCapturingReviewRef.current && reviewResponse && reviewResponse !== prevReviewResponseRef.current) {
      isCapturingReviewRef.current = false;
      prevReviewResponseRef.current = reviewResponse;
      setReviewFeedback(reviewResponse);
      toast.success('Review complete', {
        duration: 2000,
        style: { background: '#0a1a0a', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
        icon: '✅',
      });
    }
  }, [reviewResponse, reviewLoading]);

  const handleReviewFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['text/plain', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only .txt and .pdf files are supported for review.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5 MB.');
      return;
    }
    setReviewFile(file);
    if (file.type === 'text/plain') {
      const text = await file.text();
      setReviewText(text);
      toast.success(`"${file.name}" loaded — text extracted.`, { icon: '📄' });
    } else {
      toast.success(`"${file.name}" attached — will be sent for AI review.`, { icon: '📄' });
    }
  };

  const handleRunReview = async () => {
    if (!reviewText.trim() && !reviewFile) {
      toast.error('Please paste your document text or upload a file first.');
      return;
    }
    setReviewFeedback('');
    prevReviewResponseRef.current = '';

    const docTypeNote = reviewDocType ? `Document type: ${reviewDocType}.\n\n` : '';

    if (reviewFile && reviewFile.type === 'application/pdf') {
      // Send PDF as base64 file block
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const messages = [
          { role: 'system' as const, content: DOCUMENT_REVIEW_SYSTEM_PROMPT },
          {
            role: 'user' as const,
            content: [
              { type: 'text', text: `${docTypeNote}Please review the attached legal document and provide detailed feedback, corrections, and improvement suggestions.` },
              { type: 'file', file: { file_data: base64, filename: reviewFile.name, format: 'application/pdf' } },
            ],
          },
        ];
        sendReviewMessage(messages, { max_tokens: 2048 });
      };
      reader.readAsDataURL(reviewFile);
    } else {
      const documentContent = reviewText.trim();
      const messages = [
        { role: 'system' as const, content: DOCUMENT_REVIEW_SYSTEM_PROMPT },
        { role: 'user' as const, content: `${docTypeNote}Please review the following legal document and provide detailed feedback, corrections, and improvement suggestions:\n\n---\n\n${documentContent}\n\n---` },
      ];
      sendReviewMessage(messages, { max_tokens: 2048 });
    }

    trackDocumentBuilderUsage({ action: 'ai_message_sent', template: 'document-review' });
  };

  if (loading || (!user && !loading)) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Toaster
        position="top-right"
        containerStyle={{ top: 16, right: 16, maxWidth: 320 }}
        toastOptions={{
          style: { maxWidth: 300, wordBreak: 'break-word', whiteSpace: 'pre-wrap' },
        }}
      />

      {/* Document Complete Success Modal */}
      <SuccessModal
        isOpen={showDocSuccessModal}
        title={docSuccessTitle}
        message={docSuccessMsg}
        subMessage="You can find this document in your saved documents list."
        ctaLabel="View Documents"
        onCta={() => { setShowDocSuccessModal(false); setStep('select'); }}
        onClose={() => setShowDocSuccessModal(false)}
        icon="DocumentCheckIcon"
        variant="gold"
      />

      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-navy-900 border-r border-navy-600 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 sm:p-5 border-b border-navy-600 flex items-center justify-between">
          <Link href="/homepage" className="flex items-center gap-3">
            <AppLogo size={32} iconName="ScaleIcon" />
            <span className="font-display font-900 text-lg text-white tracking-tight">Court<span className="text-gold-500">Craft</span></span>
          </Link>
          <button className="lg:hidden p-2 rounded-lg hover:bg-navy-700 transition-colors" onClick={() => setSidebarOpen(false)}>
            <Icon name="XMarkIcon" size={16} className="text-white/60" />
          </button>
        </div>
        <nav className="flex-1 p-3 sm:p-4 space-y-1 overflow-y-auto">
          {sidebarLinks.map((link) => (
            <Link key={link.label} href={link.href} className={`sidebar-link ${(link as any).active ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
              <Icon name={link.icon as any} size={18} />
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        {myDocuments.length > 0 && (
          <div className="p-4 border-t border-navy-600">
            <p className="label-tag text-white text-opacity-40 mb-3" style={{ fontSize: '9px' }}>MY DOCUMENTS</p>
            <div className="space-y-2">
              {myDocuments.slice(0, 5).map((doc) => (
                <button key={doc.id} onClick={() => handleLoadDocument(doc)} className="w-full text-left flex items-center gap-2 p-2 rounded-xl hover:bg-navy-700 transition-colors">
                  <Icon name="DocumentTextIcon" size={14} className="text-gold-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-white truncate">{doc.title}</p>
                    <span className={`badge ${doc.status === 'complete' ? 'badge-green' : 'badge-blue'}`} style={{ fontSize: '7px' }}>{doc.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-navy-900 border-b border-navy-600 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <button className="lg:hidden p-2 -ml-1 min-w-[36px] min-h-[36px] flex items-center justify-center" onClick={() => setSidebarOpen(true)}>
              <Icon name="Bars3Icon" size={22} className="text-white opacity-60" />
            </button>
            <div>
              <h1 className="font-display font-800 text-white text-sm sm:text-base lg:text-lg">Document Builder</h1>
              <p className="text-xs text-white text-opacity-40 hidden sm:block">AI-Assisted Court Document Generation</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
            <BackButton className="text-white/60 hover:text-gold-400 hidden sm:inline-flex" label="Back" />
            {step !== 'select' && (
              <button onClick={() => { setStep('select'); setSavedDocId(null); }} className="btn-outline text-xs py-2 px-2.5 sm:px-4 disabled:opacity-50">
                <Icon name="ArrowLeftIcon" size={14} />
                <span className="hidden sm:inline">Templates</span>
              </button>
            )}
            {step === 'build' && (
              <>
                <button onClick={handleSaveDraft} disabled={saving} className="btn-outline text-xs py-2 px-2.5 sm:px-4 disabled:opacity-50">
                  {saving ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> : <Icon name="CloudArrowUpIcon" size={14} />}
                  <span className="hidden sm:inline">Save Draft</span>
                </button>
                <button onClick={() => { setStep('preview'); trackDocumentBuilderUsage({ action: 'document_previewed', template: selectedTemplate || undefined }); }} className="btn-gold text-xs py-2 px-2.5 sm:px-4">
                  <Icon name="EyeIcon" size={14} className="text-navy-900" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
              </>
            )}
            {step === 'preview' && (
              <button onClick={handleMarkComplete} className="btn-gold text-xs py-2 px-2.5 sm:px-4">
                <Icon name="CheckCircleIcon" size={14} className="text-navy-900" />
                <span className="hidden sm:inline">Mark Complete</span>
              </button>
            )}
          </div>
        </header>

        {saveMsg && (
          <div className="bg-green-500 bg-opacity-10 border-b border-green-500 border-opacity-30 px-6 py-2 flex items-center gap-2">
            <Icon name="CheckCircleIcon" size={14} className="text-green-400" />
            <p className="text-xs text-green-400">{saveMsg}</p>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 bg-white">
          {step === 'select' && (
            <div className="space-y-5 sm:space-y-6">
              {/* Mode toggle — Build vs Review */}
              <div className="flex gap-3">
                <div className="flex bg-navy-50 rounded-2xl p-1 gap-1">
                  <button
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-600 bg-navy-900 text-white shadow-sm transition-all"
                  >
                    <Icon name="DocumentTextIcon" size={15} />
                    <span className="hidden sm:inline">Build Document</span>
                    <span className="sm:hidden">Build</span>
                  </button>
                  <button
                    onClick={() => setStep('review')}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-sm font-600 text-navy-600 hover:text-navy-900 hover:bg-white transition-all"
                  >
                    <Icon name="MagnifyingGlassIcon" size={15} />
                    <span className="hidden sm:inline">AI Review</span>
                    <span className="sm:hidden">Review</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <h2 className="font-display font-800 text-lg sm:text-xl text-navy-900 mb-1">Choose a Document Template</h2>
                  <p className="text-sm text-navy-500">Professional templates built for UK family court proceedings</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {categories.map((cat) => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`tab-btn text-xs ${selectedCategory === cat ? 'active' : ''}`}>{cat}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {filtered.map((template) => (
                  <div key={template.id} className={`doc-template-card cursor-pointer ${selectedTemplate === template.id ? 'selected' : ''}`} onClick={() => handleSelectTemplate(template.id)}>
                    {template.popular && <div className="absolute top-3 right-3"><span className="badge badge-gold" style={{ fontSize: '8px' }}>Popular</span></div>}
                    <div className="w-10 h-10 rounded-xl bg-navy-700 flex items-center justify-center text-gold-400 mb-4">
                      <Icon name={template.icon as any} size={20} />
                    </div>
                    <h3 className="font-display font-700 text-white text-sm mb-2 leading-tight">{template.title}</h3>
                    <p className="text-xs text-white text-opacity-50 leading-relaxed mb-4">{template.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="badge badge-blue" style={{ fontSize: '8px' }}>{template.category}</span>
                      <span className="label-tag text-white text-opacity-30" style={{ fontSize: '9px' }}>{template.pages}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AI Document Review Step ── */}
          {step === 'review' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* Header */}
              <div className="flex items-center gap-4">
                <button onClick={() => setStep('select')} className="btn-outline text-xs py-2 px-3">
                  <Icon name="ArrowLeftIcon" size={13} />
                  Back
                </button>
                <div>
                  <h2 className="font-display font-800 text-xl text-navy-900">AI Document Review</h2>
                  <p className="text-sm text-navy-500">Paste or upload a legal document to receive AI-powered feedback and improvement suggestions</p>
                </div>
                <div className="ml-auto hidden sm:flex items-center gap-2 bg-gold-50 border border-gold-200 rounded-2xl px-4 py-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-gold-700 font-600">Claude AI • Active</span>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                {/* Left — Input panel */}
                <div className="space-y-4">
                  <div className="surface-card rounded-3xl p-6 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-navy-700 flex items-center justify-center">
                        <Icon name="DocumentArrowUpIcon" size={18} className="text-gold-400" />
                      </div>
                      <div>
                        <p className="font-display font-700 text-navy-900 text-sm">Your Document</p>
                        <p className="text-xs text-navy-500">Paste text or upload a .txt or .pdf file</p>
                      </div>
                    </div>

                    {/* Document type selector */}
                    <div>
                      <label className="label-tag text-navy-600 block mb-2" style={{ fontSize: '10px' }}>DOCUMENT TYPE (optional)</label>
                      <select
                        value={reviewDocType}
                        onChange={(e) => setReviewDocType(e.target.value)}
                        className="input-light text-sm"
                      >
                        <option value="">Select document type…</option>
                        <option value="Position Statement">Position Statement</option>
                        <option value="Witness Statement">Witness Statement</option>
                        <option value="Chronology of Events">Chronology of Events</option>
                        <option value="Scott Schedule">Scott Schedule</option>
                        <option value="Evidence Bundle Index">Evidence Bundle Index</option>
                        <option value="C100 Application">C100 Application</option>
                        <option value="C7 Response">C7 Response</option>
                        <option value="Financial Statement (Form E)">Financial Statement (Form E)</option>
                        <option value="Other Court Document">Other Court Document</option>
                      </select>
                    </div>

                    {/* File upload */}
                    <div>
                      <label className="label-tag text-navy-600 block mb-2" style={{ fontSize: '10px' }}>UPLOAD FILE (.txt or .pdf)</label>
                      <input
                        ref={reviewFileInputRef}
                        type="file"
                        accept=".txt,.pdf"
                        onChange={handleReviewFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => reviewFileInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-navy-200 hover:border-gold-400 rounded-2xl py-4 text-sm text-navy-500 hover:text-gold-600 transition-colors"
                      >
                        <Icon name="ArrowUpTrayIcon" size={18} className="text-gold-400" />
                        {reviewFile ? (
                          <span className="font-600 text-navy-700">{reviewFile.name}</span>
                        ) : (
                          <span>Click to upload .txt or .pdf</span>
                        )}
                      </button>
                      {reviewFile && (
                        <button
                          type="button"
                          onClick={() => { setReviewFile(null); if (reviewFileInputRef.current) reviewFileInputRef.current.value = ''; }}
                          className="mt-1 text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
                        >
                          <Icon name="XMarkIcon" size={12} />
                          Remove file
                        </button>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-navy-100" />
                      <span className="text-xs text-navy-400 font-500">or paste text below</span>
                      <div className="flex-1 h-px bg-navy-100" />
                    </div>

                    {/* Text paste area */}
                    <div>
                      <label className="label-tag text-navy-600 block mb-2" style={{ fontSize: '10px' }}>PASTE DOCUMENT TEXT</label>
                      <textarea
                        rows={12}
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="Paste your court document text here for AI review…"
                        className="input-light text-sm font-mono leading-relaxed"
                      />
                      {reviewText && (
                        <p className="text-xs text-navy-400 mt-1">{reviewText.split(/\s+/).filter(Boolean).length} words</p>
                      )}
                    </div>

                    <button
                      onClick={handleRunReview}
                      disabled={reviewLoading || (!reviewText.trim() && !reviewFile)}
                      className="btn-gold w-full py-3 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {reviewLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                          Analysing document…
                        </>
                      ) : (
                        <>
                          <Icon name="SparklesIcon" size={16} className="text-navy-900" />
                          Run AI Review
                        </>
                      )}
                    </button>
                  </div>

                  {/* Tips card */}
                  <div className="surface-card rounded-3xl p-5 bg-navy-50 border border-navy-100">
                    <p className="font-display font-700 text-navy-900 text-sm mb-3 flex items-center gap-2">
                      <Icon name="LightBulbIcon" size={15} className="text-gold-500" />
                      What the AI reviews
                    </p>
                    <ul className="space-y-2">
                      {[
                        'Structure & court format compliance (FPR 2010)',
                        'Legal language and professional tone',
                        'Completeness — missing sections flagged',
                        'Clarity and persuasiveness of arguments',
                        'Specific rewrite suggestions with examples',
                      ].map((tip) => (
                        <li key={tip} className="flex items-start gap-2 text-xs text-navy-600">
                          <Icon name="CheckCircleIcon" size={13} className="text-gold-500 flex-shrink-0 mt-0.5" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Right — Feedback panel */}
                <div className="surface-card rounded-3xl p-6 flex flex-col" style={{ minHeight: '600px' }}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-gold-gradient flex items-center justify-center">
                      <Icon name="SparklesIcon" size={17} className="text-navy-900" />
                    </div>
                    <div>
                      <p className="font-display font-700 text-navy-900 text-sm">AI Feedback & Suggestions</p>
                      <p className="text-xs text-navy-500">Powered by Claude • UK Family Law Specialist</p>
                    </div>
                    {(reviewFeedback || (reviewLoading && reviewResponse)) && (
                      <button
                        onClick={() => {
                          const text = reviewFeedback || reviewResponse;
                          navigator.clipboard.writeText(text);
                          toast.success('Feedback copied to clipboard', { icon: '📋' });
                        }}
                        className="ml-auto btn-outline text-xs py-1.5 px-3"
                      >
                        <Icon name="ClipboardDocumentIcon" size={13} />
                        Copy
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {!reviewFeedback && !reviewLoading && !reviewResponse && (
                      <div className="h-full flex flex-col items-center justify-center text-center py-12 px-6">
                        <div className="w-16 h-16 rounded-2xl bg-navy-50 flex items-center justify-center mb-4">
                          <Icon name="DocumentMagnifyingGlassIcon" size={32} className="text-navy-300" />
                        </div>
                        <p className="font-display font-700 text-navy-400 text-sm mb-2">No review yet</p>
                        <p className="text-xs text-navy-400 leading-relaxed">Paste your document text or upload a file, then click <strong>Run AI Review</strong> to receive detailed feedback.</p>
                      </div>
                    )}

                    {(reviewLoading || reviewResponse) && !reviewFeedback && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2 h-2 rounded-full bg-gold-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-gold-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-gold-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                          <span className="text-xs text-navy-500 ml-1">Analysing your document…</span>
                        </div>
                        {reviewResponse && (
                          <div className="prose prose-sm max-w-none text-navy-700">
                            <ReactMarkdown>{reviewResponse}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    )}

                    {reviewFeedback && (
                      <div className="prose prose-sm max-w-none text-navy-700 leading-relaxed">
                        <ReactMarkdown>{reviewFeedback}</ReactMarkdown>
                      </div>
                    )}
                  </div>

                  {reviewFeedback && (
                    <div className="mt-5 pt-4 border-t border-navy-100">
                      <p className="text-xs text-navy-400 italic flex items-start gap-1.5">
                        <Icon name="InformationCircleIcon" size={13} className="text-navy-300 flex-shrink-0 mt-0.5" />
                        This AI review is provided for guidance only and does not constitute legal advice. CourtCraft Advocate provides McKenzie Friend lay support services only.
                      </p>
                      <button
                        onClick={() => { setReviewFeedback(''); setReviewText(''); setReviewFile(null); prevReviewResponseRef.current = ''; if (reviewFileInputRef.current) reviewFileInputRef.current.value = ''; }}
                        className="mt-3 btn-outline text-xs py-2 px-4 w-full"
                      >
                        <Icon name="ArrowPathIcon" size={13} />
                        Review Another Document
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'build' && selectedDoc && (
            <div className="grid lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 space-y-6">
                <div className="surface-card rounded-3xl p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-navy-700 flex items-center justify-center text-gold-400">
                      <Icon name={selectedDoc.icon as any} size={24} />
                    </div>
                    <div>
                      <h2 className="font-display font-800 text-navy-900 text-lg">{selectedDoc.title}</h2>
                      <p className="text-xs text-navy-500">{selectedDoc.description}</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    {fields.map((field) => (
                      <div key={field.label}>
                        <div className="flex items-center justify-between mb-2">
                          <label className="label-tag text-navy-600" style={{ fontSize: '10px' }}>{field.label}</label>
                          {field.type === 'textarea' && (
                            <button
                              type="button"
                              onClick={() => handleAiSend(`Help me write the "${field.label}" section for my ${selectedDoc?.title}. ${formValues[field.label] ? `Current content: "${formValues[field.label]}"` : 'Provide a professional, court-appropriate draft.'}`)}
                              disabled={aiLoading}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-600 transition-all disabled:opacity-40"
                              style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c' }}
                            >
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                              AI Suggest
                            </button>
                          )}
                        </div>
                        {field.type === 'textarea' ? (
                          <textarea rows={field.rows || 4} placeholder={field.placeholder} className="input-light text-sm" value={formValues[field.label] || ''} onChange={(e) => handleFieldChange(field.label, e.target.value)} />
                        ) : (
                          <input type={field.type} placeholder={field.placeholder} className="input-light text-sm" value={formValues[field.label] || ''} onChange={(e) => handleFieldChange(field.label, e.target.value)} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evidence & Supporting Documents Upload */}
                <div className="surface-card rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-navy-700 flex items-center justify-center">
                      <Icon name="PaperClipIcon" size={18} className="text-gold-400" />
                    </div>
                    <div>
                      <p className="font-display font-700 text-navy-900 text-sm">Evidence &amp; Supporting Documents</p>
                      <p className="text-xs text-navy-500">Attach files to support this court document</p>
                    </div>
                  </div>
                  <FileUpload
                    context="document-builder"
                    contextId={savedDocId || undefined}
                    label="Attach Evidence / Supporting Docs"
                    accept="all"
                    multiple
                    existingFiles={docFiles}
                    onUploaded={(f) => setDocFiles((prev) => [...prev, f])}
                    onDeleted={(id) => setDocFiles((prev) => prev.filter((f) => f.id !== id))}
                  />
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                {/* AI Writing Assistant - fully connected to Anthropic Claude */}
                <div className="surface-card rounded-3xl p-5 flex flex-col" style={{ minHeight: '420px' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-gold-gradient flex items-center justify-center">
                      <Icon name="SparklesIcon" size={16} className="text-navy-900" />
                    </div>
                    <div>
                      <p className="font-display font-700 text-navy-900 text-sm">AI Writing Assistant</p>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                        <p className="text-xs text-navy-500">Claude 3.5 Sonnet • UK Family Law Trained</p>
                      </div>
                    </div>
                    <div className="ml-auto">
                      <span className="badge badge-gold" style={{ fontSize: '8px' }}>AI Powered</span>
                    </div>
                  </div>

                  {/* Quick suggestion buttons */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {['Suggest opening paragraph', 'Add legal references', 'Check court format', 'Improve my wording'].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestion(suggestion)}
                        disabled={aiLoading}
                        className="text-xs px-3 py-1.5 rounded-lg bg-navy-50 border border-navy-100 hover:bg-navy-100 text-navy-700 hover:text-navy-900 transition-colors disabled:opacity-40 flex items-center gap-1"
                      >
                        <Icon name="SparklesIcon" size={10} className="text-gold-500" />
                        {suggestion}
                      </button>
                    ))}
                  </div>

                  {/* Chat messages */}
                  <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1" style={{ maxHeight: '220px' }}>
                    {aiMessages.map((msg, i) => (
                      <div key={i} className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                        {msg.role === 'assistant' ? (
                          msg.content === '' && aiLoading ? (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gold-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-2 h-2 rounded-full bg-gold-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-2 h-2 rounded-full bg-gold-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          ) : (
                            <div className="prose prose-invert prose-xs max-w-none text-xs leading-relaxed">
                              <ReactMarkdown>{msg.content === '' && aiResponse ? aiResponse : msg.content}</ReactMarkdown>
                            </div>
                          )
                        ) : (
                          <span className="text-xs">{msg.content}</span>
                        )}
                      </div>
                    ))}
                    <div ref={aiChatEndRef} />
                  </div>

                  {/* Chat input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
                      placeholder="Ask for help with this document..."
                      className="input-light text-xs py-2.5 flex-1"
                      disabled={aiLoading}
                    />
                    <button
                      onClick={() => handleAiSend()}
                      disabled={aiLoading || !aiInput.trim()}
                      className="w-9 h-9 rounded-xl bg-gold-gradient flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                    >
                      <Icon name="PaperAirplaneIcon" size={16} className="text-navy-900" />
                    </button>
                  </div>
                </div>

                <div className="surface-card rounded-3xl p-5">
                  <p className="font-display font-700 text-navy-900 text-sm mb-3">Document Status</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-navy-500">Fields completed</span>
                      <span className="text-xs text-gold-600 font-700">{Object.keys(formValues).filter((k) => formValues[k]).length}/{fields.length}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${(Object.keys(formValues).filter((k) => formValues[k]).length / Math.max(fields.length, 1)) * 100}%` }} />
                    </div>
                    {savedDocId && <p className="text-xs text-green-600 flex items-center gap-1"><Icon name="CloudArrowUpIcon" size={12} />Saved to your account</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && selectedDoc && (
            <div className="max-w-3xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm">
                <div className="border-b border-gray-200 pb-6 mb-6">
                  <h2 className="font-display font-800 text-2xl text-black mb-1">{selectedDoc.title}</h2>
                  <p className="text-sm text-gray-600">Generated by CourtCraft Advocate — {new Date().toLocaleDateString('en-GB')}</p>
                </div>
                <div className="space-y-6">
                  {fields.map((field) =>
                    formValues[field.label] ? (
                      <div key={field.label}>
                        <h3 className="font-display font-700 text-gold-600 text-sm mb-2 uppercase tracking-wider">{field.label}</h3>
                        <p className="text-sm text-black leading-relaxed whitespace-pre-wrap">{formValues[field.label]}</p>
                      </div>
                    ) : null
                  )}
                </div>
                <div className="border-t border-gray-200 pt-6 mt-6">
                  <p className="text-xs text-gray-500 italic">
                    This document was prepared with the assistance of CourtCraft Advocate. CourtCraft Advocate provides McKenzie Friend lay support services only, not regulated legal advice.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}