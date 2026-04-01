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
import NotificationBell from '@/components/NotificationBell';
import SuccessModal from '@/components/ui/SuccessModal';
import FileUpload, { UploadedFile } from '@/components/ui/FileUpload';
import BackButton from '@/components/ui/BackButton';

const tabs = [
  { id: 'timeline', label: 'Case Timeline', icon: 'ClockIcon' },
  { id: 'contacts', label: 'Contact Tracker', icon: 'UserGroupIcon' },
  { id: 'finance', label: 'Finance Tracker', icon: 'BanknotesIcon' },
  { id: 'communications', label: 'Comm. Logger', icon: 'ChatBubbleLeftRightIcon' },
  { id: 'calendar', label: 'Court Dates', icon: 'CalendarDaysIcon' },
  { id: 'documents', label: 'Documents', icon: 'FolderOpenIcon' },
  { id: 'ai-assistant', label: 'AI Assistant', icon: 'SparklesIcon' },
];

const UK_CASE_SYSTEM_PROMPT = `You are an expert AI Legal Assistant specialising in UK family law. You help users with their active family court cases. You provide:
- Case-specific legal advice and strategy
- Guidance on court procedures and hearings
- Help interpreting CAFCASS reports and court orders
- Advice on child arrangements, financial remedies, and domestic abuse proceedings
- Document drafting assistance
- Explanation of legal rights and obligations

Always cite relevant legislation (Children Act 1989, Family Law Act 1996, etc.) and be practical and actionable. You are available 24/7 to support litigants in person through the family court system.`;

// ── Inline field error ──────────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 mt-1 text-xs text-red-400">
      <Icon name="ExclamationCircleIcon" size={11} className="flex-shrink-0" />
      {msg}
    </p>
  );
}

// ── Validation helpers ──────────────────────────────────────────────────────
function isValidDate(v: string) { return !!v && !isNaN(Date.parse(v)); }
function isPositiveNumber(v: string) { return !!v && !isNaN(Number(v)) && Number(v) > 0; }

export default function CaseManagementPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState('timeline');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeCase, setActiveCase] = useState<any>(null);

  // Tab data
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [contactLogs, setContactLogs] = useState<any[]>([]);
  const [financeEntries, setFinanceEntries] = useState<any[]>([]);
  const [communications, setCommunications] = useState<any[]>([]);
  const [courtDates, setCourtDates] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  // Add forms
  const [showAddTimeline, setShowAddTimeline] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddFinance, setShowAddFinance] = useState(false);
  const [showAddComm, setShowAddComm] = useState(false);
  const [showAddDate, setShowAddDate] = useState(false);
  const [triggeringReminders, setTriggeringReminders] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderCount, setReminderCount] = useState(0);

  const [newTimeline, setNewTimeline] = useState({ event_date: '', title: '', description: '', importance: 'medium', has_evidence: false });
  const [newContact, setNewContact] = useState({ contact_date: '', contact_type: 'Pickup', child_name: '', location: '', mood: 'Happy', notes: '', sentiment: 'neutral' });
  const [newFinance, setNewFinance] = useState({ entry_date: '', description: '', amount: '', entry_type: 'income', category: '', has_receipt: false });
  const [newComm, setNewComm] = useState({ comm_date: '', channel: 'WhatsApp', message: '', sentiment: 'neutral', is_flagged: false });
  const [newDate, setNewDate] = useState({ event_date: '', event_title: '', event_type: 'court', is_urgent: false });

  // ── Validation errors & touched state ────────────────────────────────────
  const [timelineErrors, setTimelineErrors] = useState<Record<string, string>>({});
  const [timelineTouched, setTimelineTouched] = useState<Record<string, boolean>>({});

  const [contactErrors, setContactErrors] = useState<Record<string, string>>({});
  const [contactTouched, setContactTouched] = useState<Record<string, boolean>>({});

  const [financeErrors, setFinanceErrors] = useState<Record<string, string>>({});
  const [financeTouched, setFinanceTouched] = useState<Record<string, boolean>>({});

  const [commErrors, setCommErrors] = useState<Record<string, string>>({});
  const [commTouched, setCommTouched] = useState<Record<string, boolean>>({});

  const [dateErrors, setDateErrors] = useState<Record<string, string>>({});
  const [dateTouched, setDateTouched] = useState<Record<string, boolean>>({});

  // ── Tab query cache (30-second TTL) ──────────────────────────────────────
  const tabCacheRef = useRef<Record<string, { data: any; ts: number }>>({});
  const CACHE_TTL_MS = 30_000;

  const getCached = (key: string) => {
    const entry = tabCacheRef.current[key];
    if (entry && Date.now() - entry.ts < CACHE_TTL_MS) return entry.data;
    return null;
  };
  const setCache = (key: string, data: any) => {
    tabCacheRef.current[key] = { data, ts: Date.now() };
  };
  const invalidateCache = (tab: string) => {
    delete tabCacheRef.current[tab];
  };

  // ── Validate individual fields ────────────────────────────────────────────
  const validateTimeline = (data = newTimeline) => {
    const e: Record<string, string> = {};
    if (!isValidDate(data.event_date)) e.event_date = 'A valid date is required.';
    if (!data.title.trim()) e.title = 'Event title is required.';
    else if (data.title.trim().length < 3) e.title = 'Title must be at least 3 characters.';
    return e;
  };

  const validateContact = (data = newContact) => {
    const e: Record<string, string> = {};
    if (!isValidDate(data.contact_date)) e.contact_date = 'A valid date is required.';
    if (!data.child_name.trim()) e.child_name = 'Child name is required.';
    return e;
  };

  const validateFinance = (data = newFinance) => {
    const e: Record<string, string> = {};
    if (!isValidDate(data.entry_date)) e.entry_date = 'A valid date is required.';
    if (!data.description.trim()) e.description = 'Description is required.';
    if (!isPositiveNumber(data.amount)) e.amount = 'Enter a valid amount greater than 0.';
    return e;
  };

  const validateComm = (data = newComm) => {
    const e: Record<string, string> = {};
    if (!isValidDate(data.comm_date)) e.comm_date = 'A valid date is required.';
    if (!data.message.trim()) e.message = 'Message content is required.';
    else if (data.message.trim().length < 5) e.message = 'Message must be at least 5 characters.';
    return e;
  };

  const validateDate = (data = newDate) => {
    const e: Record<string, string> = {};
    if (!isValidDate(data.event_date)) e.event_date = 'A valid date is required.';
    if (!data.event_title.trim()) e.event_title = 'Event title is required.';
    else if (data.event_title.trim().length < 3) e.event_title = 'Title must be at least 3 characters.';
    return e;
  };

  // ── Field-level blur handlers ─────────────────────────────────────────────
  const blurTimeline = (field: string) => {
    setTimelineTouched((p) => ({ ...p, [field]: true }));
    setTimelineErrors(validateTimeline());
  };
  const blurContact = (field: string) => {
    setContactTouched((p) => ({ ...p, [field]: true }));
    setContactErrors(validateContact());
  };
  const blurFinance = (field: string) => {
    setFinanceTouched((p) => ({ ...p, [field]: true }));
    setFinanceErrors(validateFinance());
  };
  const blurComm = (field: string) => {
    setCommTouched((p) => ({ ...p, [field]: true }));
    setCommErrors(validateComm());
  };
  const blurDate = (field: string) => {
    setDateTouched((p) => ({ ...p, [field]: true }));
    setDateErrors(validateDate());
  };

  // ── Change handlers with live re-validation ───────────────────────────────
  const changeTimeline = (field: string, value: any) => {
    const updated = { ...newTimeline, [field]: value };
    setNewTimeline(updated);
    if (timelineTouched[field]) setTimelineErrors(validateTimeline(updated));
  };
  const changeContact = (field: string, value: any) => {
    const updated = { ...newContact, [field]: value };
    setNewContact(updated);
    if (contactTouched[field]) setContactErrors(validateContact(updated));
  };
  const changeFinance = (field: string, value: any) => {
    const updated = { ...newFinance, [field]: value };
    setNewFinance(updated);
    if (financeTouched[field]) setFinanceErrors(validateFinance(updated));
  };
  const changeComm = (field: string, value: any) => {
    const updated = { ...newComm, [field]: value };
    setNewComm(updated);
    if (commTouched[field]) setCommErrors(validateComm(updated));
  };
  const changeDate = (field: string, value: any) => {
    const updated = { ...newDate, [field]: value };
    setNewDate(updated);
    if (dateTouched[field]) setDateErrors(validateDate(updated));
  };

  // ── Reset helpers ─────────────────────────────────────────────────────────
  const resetTimeline = () => { setNewTimeline({ event_date: '', title: '', description: '', importance: 'medium', has_evidence: false }); setTimelineErrors({}); setTimelineTouched({}); };
  const resetContact = () => { setNewContact({ contact_date: '', contact_type: 'Pickup', child_name: '', location: '', mood: 'Happy', notes: '', sentiment: 'neutral' }); setContactErrors({}); setContactTouched({}); };
  const resetFinance = () => { setNewFinance({ entry_date: '', description: '', amount: '', entry_type: 'income', category: '', has_receipt: false }); setFinanceErrors({}); setFinanceTouched({}); };
  const resetComm = () => { setNewComm({ comm_date: '', channel: 'WhatsApp', message: '', sentiment: 'neutral', is_flagged: false }); setCommErrors({}); setCommTouched({}); };
  const resetDate = () => { setNewDate({ event_date: '', event_title: '', event_type: 'court', is_urgent: false }); setDateErrors({}); setDateTouched({}); };

  // ── Input class helper ────────────────────────────────────────────────────
  const inputCls = (hasError: boolean) =>
    `input-navy text-sm transition-all ${hasError ? 'border-red-500 border-opacity-60 focus:border-red-400' : ''}`;

  // AI Assistant state
  const [aiMessages, setAiMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Hello! I\'m your AI Legal Assistant, trained in UK family law. I can help you with your case strategy, court procedures, document advice, and legal questions. What would you like to know?' }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiHistory, setAiHistory] = useState<{ role: 'system' | 'user' | 'assistant'; content: string }[]>([]);
  const aiChatEndRef = useRef<HTMLDivElement>(null);
  const prevAiResponseRef = useRef('');
  const isAiCapturingRef = useRef(false);

  const { response: aiResponse, isLoading: aiLoading, error: aiError, sendMessage: sendAiMessage } = useChat('ANTHROPIC', 'claude-sonnet-4-5-20250929', true);

  useEffect(() => {
    if (aiError) toast.error(aiError.message, {
      style: { background: '#1a0a0a', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
    });
  }, [aiError]);

  useEffect(() => {
    if (aiLoading && aiResponse) {
      isAiCapturingRef.current = true;
    }
    if (!aiLoading && isAiCapturingRef.current && aiResponse && aiResponse !== prevAiResponseRef.current) {
      isAiCapturingRef.current = false;
      prevAiResponseRef.current = aiResponse;
      setAiMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      setAiHistory(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    }
  }, [aiResponse, aiLoading]);

  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, aiResponse]);

  const handleAiSend = () => {
    if (!aiInput.trim() || aiLoading) return;
    const msg = aiInput.trim();
    setAiInput('');
    prevAiResponseRef.current = '';
    isAiCapturingRef.current = false;

    setAiMessages(prev => [...prev, { role: 'user', content: msg }]);
    const updatedHistory = [...aiHistory, { role: 'user' as const, content: msg }];
    setAiHistory(updatedHistory);

    const caseContext = activeCase ? `\n\nUser's active case: ${activeCase.title}` : '';

    sendAiMessage([
      { role: 'system', content: UK_CASE_SYSTEM_PROMPT + caseContext },
      ...updatedHistory,
    ], { max_tokens: 1024 });
  };

  const sidebarLinks = [
    { icon: 'Squares2X2Icon', label: 'Dashboard', href: '/dashboard' },
    { icon: 'DocumentTextIcon', label: 'Document Builder', href: '/document-builder' },
    { icon: 'FolderOpenIcon', label: 'Case Management', href: '/case-management', active: true },
    { icon: 'BookOpenIcon', label: 'Resources', href: '/resources' },
    { icon: 'UserCircleIcon', label: 'Profile', href: '/profile' },
  ];

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadData();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time subscriptions
  useEffect(() => {
    if (!activeCase) return;

    const channel = supabase
      .channel('case_management_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'timeline_events', filter: `case_id=eq.${activeCase.id}` }, () => { invalidateCache(`timeline-${activeCase.id}`); loadTabData('timeline'); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contact_logs', filter: `case_id=eq.${activeCase.id}` }, () => { invalidateCache(`contacts-${activeCase.id}`); loadTabData('contacts'); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_entries', filter: `case_id=eq.${activeCase.id}` }, () => { invalidateCache(`finance-${activeCase.id}`); loadTabData('finance'); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'communications', filter: `case_id=eq.${activeCase.id}` }, () => { invalidateCache(`communications-${activeCase.id}`); loadTabData('communications'); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'court_dates', filter: `case_id=eq.${activeCase.id}` }, () => { invalidateCache(`calendar-${activeCase.id}`); loadTabData('calendar'); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeCase]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      let { data: cases, error: casesError } = await supabase
        .from('cases')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      // If no active case exists, auto-create one for the user
      if (!cases && !casesError) {
        const { data: newCase, error: createError } = await supabase
          .from('cases')
          .insert({
            user_id: user.id,
            title: 'My Family Court Case',
            case_type: 'Child Arrangements',
            status: 'active',
          })
          .select()
          .single();

        if (!createError && newCase) {
          cases = newCase;
        } else {
          console.error('Failed to create default case:', createError);
        }
      }

      if (cases) {
        setActiveCase(cases);
        await Promise.all([
          loadTabData('timeline', cases.id),
          loadTabData('contacts', cases.id),
          loadTabData('finance', cases.id),
          loadTabData('communications', cases.id),
          loadTabData('calendar', cases.id),
        ]);

        const { data: docs } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setDocuments(docs || []);
      }
    } catch (err) {
      console.error('Case management load error:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user, supabase]);

  // ── Upload state per tab ──────────────────────────────────────────────────
  const [timelineFiles, setTimelineFiles] = useState<Record<string, UploadedFile[]>>({});
  const [contactFiles, setContactFiles] = useState<Record<string, UploadedFile[]>>({});
  const [financeFiles, setFinanceFiles] = useState<Record<string, UploadedFile[]>>({});
  const [commFiles, setCommFiles] = useState<Record<string, UploadedFile[]>>({});
  const [courtDateFiles, setCourtDateFiles] = useState<Record<string, UploadedFile[]>>({});

  // ── Load uploads for a given context ─────────────────────────────────────
  const loadUploadsForContext = async (context: string, ids: string[], setter: React.Dispatch<React.SetStateAction<Record<string, UploadedFile[]>>>) => {
    if (!user || ids.length === 0) return;
    const { data } = await supabase
      .from('file_uploads')
      .select('*')
      .eq('user_id', user.id)
      .eq('context', context)
      .in('context_id', ids);
    if (data) {
      const grouped: Record<string, UploadedFile[]> = {};
      data.forEach((f: UploadedFile) => {
        if (f.context_id) {
          grouped[f.context_id] = [...(grouped[f.context_id] || []), f];
        }
      });
      setter(grouped);
    }
  };

  const loadTabData = async (tab: string, caseId?: string) => {
    const id = caseId || activeCase?.id;
    if (!id) return;

    if (tab === 'timeline') {
      const cached = getCached(`timeline-${id}`);
      if (cached) { setTimelineEvents(cached); return; }
      const [{ data }, { data: uploads }] = await Promise.all([
        supabase.from('timeline_events').select('*').eq('case_id', id).order('event_date', { ascending: false }),
        supabase.from('file_uploads').select('*').eq('user_id', user!.id).eq('context', 'timeline-event'),
      ]);
      const rows = data || [];
      setTimelineEvents(rows);
      setCache(`timeline-${id}`, rows);
      if (uploads && rows.length > 0) {
        const rowIds = new Set(rows.map((e: any) => e.id));
        const grouped: Record<string, UploadedFile[]> = {};
        uploads.filter((f: UploadedFile) => f.context_id && rowIds.has(f.context_id)).forEach((f: UploadedFile) => {
          grouped[f.context_id!] = [...(grouped[f.context_id!] || []), f];
        });
        setTimelineFiles(grouped);
      }
    } else if (tab === 'contacts') {
      const cached = getCached(`contacts-${id}`);
      if (cached) { setContactLogs(cached); return; }
      const [{ data }, { data: uploads }] = await Promise.all([
        supabase.from('contact_logs').select('*').eq('case_id', id).order('contact_date', { ascending: false }),
        supabase.from('file_uploads').select('*').eq('user_id', user!.id).eq('context', 'contact-log'),
      ]);
      const rows = data || [];
      setContactLogs(rows);
      setCache(`contacts-${id}`, rows);
      if (uploads && rows.length > 0) {
        const rowIds = new Set(rows.map((e: any) => e.id));
        const grouped: Record<string, UploadedFile[]> = {};
        uploads.filter((f: UploadedFile) => f.context_id && rowIds.has(f.context_id)).forEach((f: UploadedFile) => {
          grouped[f.context_id!] = [...(grouped[f.context_id!] || []), f];
        });
        setContactFiles(grouped);
      }
    } else if (tab === 'finance') {
      const cached = getCached(`finance-${id}`);
      if (cached) { setFinanceEntries(cached); return; }
      const [{ data }, { data: uploads }] = await Promise.all([
        supabase.from('finance_entries').select('*').eq('case_id', id).order('entry_date', { ascending: false }),
        supabase.from('file_uploads').select('*').eq('user_id', user!.id).eq('context', 'finance-entry'),
      ]);
      const rows = data || [];
      setFinanceEntries(rows);
      setCache(`finance-${id}`, rows);
      if (uploads && rows.length > 0) {
        const rowIds = new Set(rows.map((e: any) => e.id));
        const grouped: Record<string, UploadedFile[]> = {};
        uploads.filter((f: UploadedFile) => f.context_id && rowIds.has(f.context_id)).forEach((f: UploadedFile) => {
          grouped[f.context_id!] = [...(grouped[f.context_id!] || []), f];
        });
        setFinanceFiles(grouped);
      }
    } else if (tab === 'communications') {
      const cached = getCached(`communications-${id}`);
      if (cached) { setCommunications(cached); return; }
      const [{ data }, { data: uploads }] = await Promise.all([
        supabase.from('communications').select('*').eq('case_id', id).order('comm_date', { ascending: false }),
        supabase.from('file_uploads').select('*').eq('user_id', user!.id).eq('context', 'communication'),
      ]);
      const rows = data || [];
      setCommunications(rows);
      setCache(`communications-${id}`, rows);
      if (uploads && rows.length > 0) {
        const rowIds = new Set(rows.map((e: any) => e.id));
        const grouped: Record<string, UploadedFile[]> = {};
        uploads.filter((f: UploadedFile) => f.context_id && rowIds.has(f.context_id)).forEach((f: UploadedFile) => {
          grouped[f.context_id!] = [...(grouped[f.context_id!] || []), f];
        });
        setCommFiles(grouped);
      }
    } else if (tab === 'calendar') {
      const cached = getCached(`calendar-${id}`);
      if (cached) { setCourtDates(cached); return; }
      const [{ data }, { data: uploads }] = await Promise.all([
        supabase.from('court_dates').select('*').eq('case_id', id).order('event_date', { ascending: true }),
        supabase.from('file_uploads').select('*').eq('user_id', user!.id).eq('context', 'court-date'),
      ]);
      const rows = data || [];
      setCourtDates(rows);
      setCache(`calendar-${id}`, rows);
      if (uploads && rows.length > 0) {
        const rowIds = new Set(rows.map((e: any) => e.id));
        const grouped: Record<string, UploadedFile[]> = {};
        uploads.filter((f: UploadedFile) => f.context_id && rowIds.has(f.context_id)).forEach((f: UploadedFile) => {
          grouped[f.context_id!] = [...(grouped[f.context_id!] || []), f];
        });
        setCourtDateFiles(grouped);
      }
    }
  };

  const addTimelineEvent = async () => {
    // Touch all and validate
    const allTouched = { event_date: true, title: true };
    setTimelineTouched(allTouched);
    const errs = validateTimeline();
    setTimelineErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!activeCase || !user) return;
    await supabase.from('timeline_events').insert({ ...newTimeline, case_id: activeCase.id, user_id: user.id });
    resetTimeline();
    setShowAddTimeline(false);
    invalidateCache(`timeline-${activeCase.id}`);
    loadTabData('timeline');
    toast.success('Timeline event added', {
      duration: 2500,
      style: { background: '#0a1a0a', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
      icon: '📅',
    });
  };

  const addContactLog = async () => {
    const allTouched = { contact_date: true, child_name: true };
    setContactTouched(allTouched);
    const errs = validateContact();
    setContactErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!activeCase || !user) return;
    await supabase.from('contact_logs').insert({ ...newContact, case_id: activeCase.id, user_id: user.id });
    resetContact();
    setShowAddContact(false);
    invalidateCache(`contacts-${activeCase.id}`);
    loadTabData('contacts');
    toast.success('Contact log saved', {
      duration: 2500,
      style: { background: '#0a1a0a', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
      icon: '👤',
    });
  };

  const addFinanceEntry = async () => {
    const allTouched = { entry_date: true, description: true, amount: true };
    setFinanceTouched(allTouched);
    const errs = validateFinance();
    setFinanceErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!activeCase || !user) return;
    await supabase.from('finance_entries').insert({ ...newFinance, amount: parseFloat(newFinance.amount), case_id: activeCase.id, user_id: user.id });
    resetFinance();
    setShowAddFinance(false);
    invalidateCache(`finance-${activeCase.id}`);
    loadTabData('finance');
    toast.success('Finance entry added', {
      duration: 2500,
      style: { background: '#0a1a0a', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
      icon: '💰',
    });
  };

  const addCommunication = async () => {
    const allTouched = { comm_date: true, message: true };
    setCommTouched(allTouched);
    const errs = validateComm();
    setCommErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!activeCase || !user) return;
    await supabase.from('communications').insert({ ...newComm, case_id: activeCase.id, user_id: user.id });
    resetComm();
    setShowAddComm(false);
    invalidateCache(`communications-${activeCase.id}`);
    loadTabData('communications');
    toast.success('Communication logged', {
      duration: 2500,
      style: { background: '#0a1a0a', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
      icon: '💬',
    });
  };

  const addCourtDate = async () => {
    const allTouched = { event_date: true, event_title: true };
    setDateTouched(allTouched);
    const errs = validateDate();
    setDateErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!activeCase || !user) return;
    await supabase.from('court_dates').insert({ ...newDate, case_id: activeCase.id, user_id: user.id });
    resetDate();
    setShowAddDate(false);
    invalidateCache(`calendar-${activeCase.id}`);
    loadTabData('calendar');
    toast.success('Court date added — reminders will be sent automatically', {
      duration: 4000,
      style: { background: '#0a1a0a', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' },
      icon: '⚖️',
    });
  };

  const totalIncome = useMemo(
    () => financeEntries.filter((e) => e.entry_type === 'income').reduce((s, e) => s + Number(e.amount), 0),
    [financeEntries]
  );
  const totalExpenses = useMemo(
    () => financeEntries.filter((e) => e.entry_type === 'expense').reduce((s, e) => s + Number(e.amount), 0),
    [financeEntries]
  );

  if (loading || (!user && !loading)) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const triggerReminderCheck = async () => {
    setTriggeringReminders(true);
    const checkingToast = toast.loading('Checking court date reminders...', {
      style: { background: '#0d1526', color: '#fff', border: '1px solid rgba(201,168,76,0.3)' },
    });
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/court-date-reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      });
      const data = await res.json();
      toast.dismiss(checkingToast);
      if (data.success) {
        setReminderCount(data.reminders_sent || 0);
        setShowReminderModal(true);
      } else {
        toast.error(data.error || 'Reminder check failed', {
          style: { background: '#1a0a0a', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
        });
      }
    } catch (err: any) {
      toast.dismiss(checkingToast);
      toast.error('Failed to trigger reminder check', {
        style: { background: '#1a0a0a', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' },
      });
    } finally {
      setTriggeringReminders(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      <Toaster position="top-right" />

      {/* Reminder Check Success Modal */}
      <SuccessModal
        isOpen={showReminderModal}
        title={reminderCount > 0 ? `${reminderCount} Reminder${reminderCount !== 1 ? 's' : ''} Sent!` : 'Reminders Checked'}
        message={
          reminderCount > 0
            ? `${reminderCount} email reminder${reminderCount !== 1 ? 's have' : ' has'} been sent for upcoming court dates. In-app notifications have also been created.`
            : 'All court date reminders are up to date. No new reminders were due at this time.'
        }
        subMessage={reminderCount > 0 ? 'Reminders are sent at 2 weeks, 1 week, and 48 hours before each court date.' : undefined}
        ctaLabel="View Court Dates"
        onCta={() => { setShowReminderModal(false); setActiveTab('calendar'); }}
        onClose={() => setShowReminderModal(false)}
        icon={reminderCount > 0 ? 'BellIcon' : 'CheckCircleIcon'}
        variant={reminderCount > 0 ? 'gold' : 'green'}
        autoCloseSecs={8}
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
      </aside>

      {sidebarOpen && <div className="fixed inset-0 bg-black bg-opacity-60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-navy-900 border-b border-navy-600 px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <button className="lg:hidden p-2 -ml-1 min-w-[36px] min-h-[36px] flex items-center justify-center" onClick={() => setSidebarOpen(true)}>
              <Icon name="Bars3Icon" size={22} className="text-white opacity-60" />
            </button>
            <div>
              <h1 className="font-display font-800 text-white text-sm sm:text-base lg:text-lg">Case Management</h1>
              <p className="text-xs text-white text-opacity-40 truncate max-w-[160px] sm:max-w-none">{activeCase?.title || 'Loading...'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
            <BackButton className="text-white/60 hover:text-gold-400 hidden sm:inline-flex" label="Back" />
            <div className="hidden md:flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-xs text-white text-opacity-40">Live Sync</span>
            </div>
            <NotificationBell />
          </div>
        </header>

        <div className="bg-navy-900 border-b border-navy-600 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 sm:gap-1.5 lg:gap-2 min-w-max">
            {tabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`tab-btn flex items-center gap-1 sm:gap-1.5 lg:gap-2 py-2 px-2.5 sm:px-3 lg:px-4 text-xs ${activeTab === tab.id ? 'active' : ''}`}>
                <Icon name={tab.icon as any} size={12} />
                <span className="whitespace-nowrap">{tab.label}</span>
                {tab.id === 'ai-assistant' && <span className="badge badge-gold ml-0.5 sm:ml-1" style={{ fontSize: '7px' }}>AI</span>}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 bg-gray-50">
          {dataLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-gray-200 animate-pulse" />)}
            </div>
          ) : !activeCase ? (
            <div className="text-center py-20">
              <Icon name="FolderOpenIcon" size={48} className="text-navy-300 mx-auto mb-4" />
              <p className="text-navy-500">No active case found. Please contact support.</p>
            </div>
          ) : (
            <>
              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="font-display font-800 text-navy-900 text-lg">Case Timeline</h2>
                    <button onClick={() => { setShowAddTimeline(!showAddTimeline); if (showAddTimeline) resetTimeline(); }} className="btn-outline text-xs py-2 px-4">
                      <Icon name="PlusIcon" size={14} />
                      Add Event
                    </button>
                  </div>

                  {showAddTimeline && (
                    <div className="surface-card rounded-2xl p-4 sm:p-5 space-y-4">
                      <h3 className="font-display font-700 text-navy-900 text-sm">New Timeline Event</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Date *</label>
                          <input
                            type="date"
                            className={inputCls(!!timelineErrors.event_date && !!timelineTouched.event_date)}
                            value={newTimeline.event_date}
                            onChange={(e) => changeTimeline('event_date', e.target.value)}
                            onBlur={() => blurTimeline('event_date')}
                          />
                          <FieldError msg={timelineTouched.event_date ? timelineErrors.event_date : undefined} />
                        </div>
                        <div>
                          <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Importance</label>
                          <select className="input-navy text-sm" value={newTimeline.importance} onChange={(e) => changeTimeline('importance', e.target.value)}>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Title *</label>
                        <input
                          type="text"
                          className={inputCls(!!timelineErrors.title && !!timelineTouched.title)}
                          placeholder="Event title"
                          value={newTimeline.title}
                          onChange={(e) => changeTimeline('title', e.target.value)}
                          onBlur={() => blurTimeline('title')}
                        />
                        <FieldError msg={timelineTouched.title ? timelineErrors.title : undefined} />
                      </div>
                      <div>
                        <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Description</label>
                        <div className="relative">
                          <textarea className="input-navy text-sm" rows={3} placeholder="Describe the event..." value={newTimeline.description} onChange={(e) => changeTimeline('description', e.target.value)} />
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('ai-assistant');
                              setAiInput(`Help me write a court-appropriate description for a timeline event titled "${newTimeline.title}" on ${newTimeline.event_date}. Provide a concise, factual description suitable for a UK family court chronology.`);
                            }}
                            className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-600 transition-all"
                            style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c' }}
                          >
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            AI
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:gap-3">
                        <button onClick={addTimelineEvent} className="btn-gold text-xs py-3 sm:py-2 px-4 flex-1 sm:flex-none justify-center"><Icon name="CheckIcon" size={14} className="text-navy-900" />Save Event</button>
                        <button onClick={() => { setShowAddTimeline(false); resetTimeline(); }} className="btn-outline text-xs py-3 sm:py-2 px-4 flex-1 sm:flex-none justify-center">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="max-w-3xl">
                    {timelineEvents.length === 0 ? (
                      <p className="text-navy-400 text-sm text-center py-8">No timeline events yet. Add your first event above.</p>
                    ) : (
                      timelineEvents.map((event, i) => (
                        <div key={event.id || i} className="timeline-item">
                          <div className={`timeline-dot ${event.importance === 'high' ? 'bg-gold-500' : 'bg-navy-400'}`} style={{ background: event.importance === 'high' ? 'var(--gold-500)' : 'var(--navy-500)' }} />
                          <div className="surface-card rounded-2xl p-5 ml-2">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div>
                                <span className="label-tag text-gold-600 block mb-1" style={{ fontSize: '9px' }}>{event.event_date}</span>
                                <h3 className="font-display font-700 text-navy-900 text-sm">{event.title}</h3>
                              </div>
                              <div className="flex items-center gap-2">
                                {event.has_evidence && <span className="badge badge-green" style={{ fontSize: '8px' }}>Evidence</span>}
                                <span className={`badge ${event.importance === 'high' ? 'badge-gold' : 'badge-blue'}`} style={{ fontSize: '8px' }}>{event.importance === 'high' ? 'Key Event' : 'Notable'}</span>
                              </div>
                            </div>
                            <p className="text-xs text-navy-600 leading-relaxed mb-3">{event.description}</p>
                            <FileUpload
                              context="timeline-event"
                              contextId={event.id}
                              label="Attach Evidence"
                              accept="evidence"
                              compact={true}
                              existingFiles={timelineFiles[event.id] || []}
                              onUploaded={(f) => setTimelineFiles((prev) => ({ ...prev, [event.id]: [...(prev[event.id] || []), f] }))}
                              onDeleted={(id) => setTimelineFiles((prev) => ({ ...prev, [event.id]: (prev[event.id] || []).filter((f) => f.id !== id) }))}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Contact Tracker Tab */}
              {activeTab === 'contacts' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="font-display font-800 text-navy-900 text-base sm:text-lg">Child Contact Tracker</h2>
                    <button onClick={() => { setShowAddContact(!showAddContact); if (showAddContact) resetContact(); }} className="btn-gold text-xs py-2.5 sm:py-2 px-4">
                      <Icon name="PlusIcon" size={14} className="text-navy-900" />
                      Log Contact
                    </button>
                  </div>

                  {showAddContact && (
                    <div className="surface-card rounded-2xl p-4 sm:p-5 space-y-4">
                      <h3 className="font-display font-700 text-navy-900 text-sm">Log Contact</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Date *</label>
                          <input
                            type="date"
                            className={inputCls(!!contactErrors.contact_date && !!contactTouched.contact_date)}
                            value={newContact.contact_date}
                            onChange={(e) => changeContact('contact_date', e.target.value)}
                            onBlur={() => blurContact('contact_date')}
                          />
                          <FieldError msg={contactTouched.contact_date ? contactErrors.contact_date : undefined} />
                        </div>
                        <div>
                          <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Type</label>
                          <select className="input-navy text-sm" value={newContact.contact_type} onChange={(e) => changeContact('contact_type', e.target.value)}>
                            <option>Pickup</option><option>Drop-off</option><option>Phone Call</option><option>Video Call</option><option>Overnight</option>
                          </select>
                        </div>
                        <div>
                          <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Child Name *</label>
                          <input
                            type="text"
                            className={inputCls(!!contactErrors.child_name && !!contactTouched.child_name)}
                            placeholder="Child's name and age"
                            value={newContact.child_name}
                            onChange={(e) => changeContact('child_name', e.target.value)}
                            onBlur={() => blurContact('child_name')}
                          />
                          <FieldError msg={contactTouched.child_name ? contactErrors.child_name : undefined} />
                        </div>
                        <div>
                          <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Sentiment</label>
                          <select className="input-navy text-sm" value={newContact.sentiment} onChange={(e) => changeContact('sentiment', e.target.value)}>
                            <option value="positive">Positive</option><option value="neutral">Neutral</option><option value="concerning">Concerning</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Notes</label>
                        <textarea className="input-navy text-sm" rows={2} placeholder="Notes about the contact..." value={newContact.notes} onChange={(e) => changeContact('notes', e.target.value)} />
                      </div>
                      <div className="flex gap-2 sm:gap-3">
                        <button onClick={addContactLog} className="btn-gold text-xs py-3 sm:py-2 px-4 flex-1 sm:flex-none justify-center"><Icon name="CheckIcon" size={14} className="text-navy-900" />Save</button>
                        <button onClick={() => { setShowAddContact(false); resetContact(); }} className="btn-outline text-xs py-3 sm:py-2 px-4 flex-1 sm:flex-none justify-center">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {[
                      { label: 'Total Contacts', value: contactLogs.length, color: 'text-gold-600' },
                      { label: 'Positive', value: contactLogs.filter((l) => l.sentiment === 'positive').length, color: 'text-green-600' },
                      { label: 'Concerning', value: contactLogs.filter((l) => l.sentiment === 'concerning').length, color: 'text-red-600' },
                      { label: 'Neutral', value: contactLogs.filter((l) => l.sentiment === 'neutral').length, color: 'text-blue-600' },
                    ].map((s) => (
                      <div key={s.label} className="surface-card rounded-2xl p-4">
                        <div className={`font-display font-900 text-2xl mb-1 ${s.color}`}>{s.value}</div>
                        <p className="text-xs text-navy-500">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-gray-200 -mx-1 sm:mx-0">
                    <table className="data-table">
                      <thead><tr><th>Date</th><th>Type</th><th>Child</th><th>Location</th><th>Mood</th><th>Notes</th><th>Sentiment</th><th>Photos</th></tr></thead>
                      <tbody>
                        {contactLogs.length === 0 ? (
                          <tr><td colSpan={8} className="text-center text-navy-400 py-8">No contact logs yet</td></tr>
                        ) : contactLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="text-gold-600 font-display font-600">{log.contact_date}</td>
                            <td>{log.contact_type}</td>
                            <td>{log.child_name}</td>
                            <td>{log.location}</td>
                            <td>{log.mood}</td>
                            <td className="max-w-xs"><p className="truncate text-navy-600">{log.notes}</p></td>
                            <td><span className={`badge ${log.sentiment === 'positive' ? 'badge-green' : log.sentiment === 'concerning' ? 'badge-red' : 'badge-blue'}`} style={{ fontSize: '8px' }}>{log.sentiment}</span></td>
                            <td>
                              <FileUpload
                                context="contact-log"
                                contextId={log.id}
                                label="Photos"
                                accept="images"
                                compact={true}
                                existingFiles={contactFiles[log.id] || []}
                                onUploaded={(f) => setContactFiles((prev) => ({ ...prev, [log.id]: [...(prev[log.id] || []), f] }))}
                                onDeleted={(id) => setContactFiles((prev) => ({ ...prev, [log.id]: (prev[log.id] || []).filter((f) => f.id !== id) }))}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Finance Tab */}
              {activeTab === 'finance' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="font-display font-800 text-navy-900 text-lg">Finance Tracker</h2>
                    <button onClick={() => { setShowAddFinance(!showAddFinance); if (showAddFinance) resetFinance(); }} className="btn-gold text-xs py-2.5 sm:py-2 px-4">
                      <Icon name="PlusIcon" size={14} className="text-navy-900" />
                      Add Entry
                    </button>
                  </div>

                  {showAddFinance && (
                    <div className="surface-card rounded-2xl p-4 sm:p-5 space-y-4">
                      <h3 className="font-display font-700 text-navy-900 text-sm">Add Finance Entry</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Date *</label>
                          <input
                            type="date"
                            className={inputCls(!!financeErrors.entry_date && !!financeTouched.entry_date)}
                            value={newFinance.entry_date}
                            onChange={(e) => changeFinance('entry_date', e.target.value)}
                            onBlur={() => blurFinance('entry_date')}
                          />
                          <FieldError msg={financeTouched.entry_date ? financeErrors.entry_date : undefined} />
                        </div>
                        <div>
                          <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Type</label>
                          <select className="input-navy text-sm" value={newFinance.entry_type} onChange={(e) => changeFinance('entry_type', e.target.value)}>
                            <option value="income">Income</option><option value="expense">Expense</option>
                          </select>
                        </div>
                        <div>
                          <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Description *</label>
                          <input
                            type="text"
                            className={inputCls(!!financeErrors.description && !!financeTouched.description)}
                            placeholder="Description"
                            value={newFinance.description}
                            onChange={(e) => changeFinance('description', e.target.value)}
                            onBlur={() => blurFinance('description')}
                          />
                          <FieldError msg={financeTouched.description ? financeErrors.description : undefined} />
                        </div>
                        <div>
                          <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Amount (£) *</label>
                          <input
                            type="number"
                            step="0.01"
                            className={inputCls(!!financeErrors.amount && !!financeTouched.amount)}
                            placeholder="0.00"
                            value={newFinance.amount}
                            onChange={(e) => changeFinance('amount', e.target.value)}
                            onBlur={() => blurFinance('amount')}
                          />
                          <FieldError msg={financeTouched.amount ? financeErrors.amount : undefined} />
                        </div>
                        <div>
                          <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Category</label>
                          <input type="text" className="input-navy text-sm" placeholder="e.g. Child Maintenance" value={newFinance.category} onChange={(e) => changeFinance('category', e.target.value)} />
                        </div>
                      </div>
                      <div className="flex gap-2 sm:gap-3">
                        <button onClick={addFinanceEntry} className="btn-gold text-xs py-3 sm:py-2 px-4 flex-1 sm:flex-none justify-center"><Icon name="CheckIcon" size={14} className="text-navy-900" />Save</button>
                        <button onClick={() => { setShowAddFinance(false); resetFinance(); }} className="btn-outline text-xs py-3 sm:py-2 px-4 flex-1 sm:flex-none justify-center">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {[
                      { label: 'Total Income', value: `£${totalIncome.toFixed(2)}`, color: 'text-green-600' },
                      { label: 'Total Expenses', value: `£${totalExpenses.toFixed(2)}`, color: 'text-orange-600' },
                      { label: 'Net Balance', value: `£${(totalIncome - totalExpenses).toFixed(2)}`, color: 'text-gold-600' },
                      { label: 'Total Entries', value: String(financeEntries.length), color: 'text-blue-600' },
                    ].map((s) => (
                      <div key={s.label} className="surface-card rounded-2xl p-4">
                        <div className={`font-display font-900 text-2xl mb-1 ${s.color}`}>{s.value}</div>
                        <p className="text-xs text-navy-500">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-gray-200 -mx-1 sm:mx-0">
                    <table className="data-table">
                      <thead><tr><th>Date</th><th>Description</th><th>Type</th><th>Category</th><th>Amount</th><th>Receipt</th></tr></thead>
                      <tbody>
                        {financeEntries.length === 0 ? (
                          <tr><td colSpan={6} className="text-center text-navy-400 py-8">No finance entries yet</td></tr>
                        ) : financeEntries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="text-gold-600 font-display font-600">{entry.entry_date}</td>
                            <td>{entry.description}</td>
                            <td><span className={`badge ${entry.entry_type === 'income' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '8px' }}>{entry.entry_type}</span></td>
                            <td>{entry.category}</td>
                            <td className={entry.entry_type === 'income' ? 'text-green-600 font-700' : 'text-red-600 font-700'}>
                              {entry.entry_type === 'income' ? '+' : '-'}£{Math.abs(Number(entry.amount)).toFixed(2)}
                            </td>
                            <td>
                              <FileUpload
                                context="finance-entry"
                                contextId={entry.id}
                                label="Receipt"
                                accept="receipts"
                                compact={true}
                                existingFiles={financeFiles[entry.id] || []}
                                onUploaded={(f) => setFinanceFiles((prev) => ({ ...prev, [entry.id]: [...(prev[entry.id] || []), f] }))}
                                onDeleted={(id) => setFinanceFiles((prev) => ({ ...prev, [entry.id]: (prev[entry.id] || []).filter((f) => f.id !== id) }))}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Communications Tab */}
              {activeTab === 'communications' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="font-display font-800 text-navy-900 text-lg">Communication Logger</h2>
                    <button onClick={() => { setShowAddComm(!showAddComm); if (showAddComm) resetComm(); }} className="btn-gold text-xs py-2.5 sm:py-2 px-4">
                      <Icon name="PlusIcon" size={14} className="text-navy-900" />
                      Log Communication
                    </button>
                  </div>

                  {showAddComm && (
                    <div className="surface-card rounded-2xl p-4 sm:p-5 space-y-4">
                      <h3 className="font-display font-700 text-navy-900 text-sm">Log Communication</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Date *</label>
                          <input
                            type="date"
                            className={inputCls(!!commErrors.comm_date && !!commTouched.comm_date)}
                            value={newComm.comm_date}
                            onChange={(e) => changeComm('comm_date', e.target.value)}
                            onBlur={() => blurComm('comm_date')}
                          />
                          <FieldError msg={commTouched.comm_date ? commErrors.comm_date : undefined} />
                        </div>
                        <div>
                          <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Channel</label>
                          <select className="input-navy text-sm" value={newComm.channel} onChange={(e) => changeComm('channel', e.target.value)}>
                            <option>WhatsApp</option><option>Email</option><option>Text</option><option>Phone</option><option>In Person</option><option>Letter</option>
                          </select>
                        </div>
                        <div>
                          <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Sentiment</label>
                          <select className="input-navy text-sm" value={newComm.sentiment} onChange={(e) => changeComm('sentiment', e.target.value)}>
                            <option value="positive">Positive</option><option value="neutral">Neutral</option><option value="concerning">Concerning</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                          <input type="checkbox" id="flagged" checked={newComm.is_flagged} onChange={(e) => changeComm('is_flagged', e.target.checked)} className="w-4 h-4" />
                          <label htmlFor="flagged" className="text-xs text-navy-600">Flag as important</label>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="label-tag text-navy-500" style={{ fontSize: '10px' }}>Message Content *</label>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('ai-assistant');
                              setAiInput(`Analyse this communication for legal relevance in a UK family court case. Channel: ${newComm.channel}. Message: "${newComm.message}". Identify any concerning patterns, suggest how to document it effectively, and advise whether it should be flagged for court evidence.`);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-600 transition-all"
                            style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: '#c9a84c' }}
                          >
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                            AI Analyse
                          </button>
                        </div>
                        <textarea
                          className={`${inputCls(!!commErrors.message && !!commTouched.message)}`}
                          rows={3}
                          placeholder="Enter the message content..."
                          value={newComm.message}
                          onChange={(e) => changeComm('message', e.target.value)}
                          onBlur={() => blurComm('message')}
                        />
                        <FieldError msg={commTouched.message ? commErrors.message : undefined} />
                      </div>
                      <div className="flex gap-2 sm:gap-3">
                        <button onClick={addCommunication} className="btn-gold text-xs py-3 sm:py-2 px-4 flex-1 sm:flex-none justify-center"><Icon name="CheckIcon" size={14} className="text-navy-900" />Save</button>
                        <button onClick={() => { setShowAddComm(false); resetComm(); }} className="btn-outline text-xs py-3 sm:py-2 px-4 flex-1 sm:flex-none justify-center">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {communications.length === 0 ? (
                      <p className="text-white text-opacity-40 text-sm text-center py-8">No communications logged yet</p>
                    ) : communications.map((comm) => (
                      <div key={comm.id} className={`surface-card rounded-2xl p-5 ${comm.is_flagged ? 'border-red-400 border-opacity-30' : ''}`}>
                        <div className="flex items-center gap-4 mb-2">
                          <div className={`flex-shrink-0 text-center min-w-[56px] p-3 rounded-xl ${comm.is_urgent ? 'bg-orange-400 bg-opacity-20' : 'bg-navy-700'}`}>
                            <p className={`font-display font-900 text-lg ${comm.is_urgent ? 'text-orange-400' : 'text-gold-400'}`}>{new Date(comm.comm_date).getDate()}</p>
                            <p className="label-tag text-white text-opacity-40" style={{ fontSize: '8px' }}>{new Date(comm.comm_date).toLocaleString('en-GB', { month: 'short' })}</p>
                          </div>
                          <div className="flex-1">
                            <p className="font-display font-700 text-white text-sm">{comm.message}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="badge badge-blue" style={{ fontSize: '8px' }}>{comm.channel}</span>
                              {comm.is_urgent && <span className="badge badge-red" style={{ fontSize: '8px' }}>Urgent</span>}
                            </div>
                          </div>
                        </div>
                        <FileUpload
                          context="communication"
                          contextId={comm.id}
                          label="Attach Screenshot / File"
                          accept="screenshots"
                          compact={true}
                          existingFiles={commFiles[comm.id] || []}
                          onUploaded={(f) => setCommFiles((prev) => ({ ...prev, [comm.id]: [...(prev[comm.id] || []), f] }))}
                          onDeleted={(id) => setCommFiles((prev) => ({ ...prev, [comm.id]: (prev[comm.id] || []).filter((f) => f.id !== id) }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Court Dates Tab */}
              {activeTab === 'calendar' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="font-display font-800 text-navy-900 text-lg">Court Dates &amp; Deadlines</h2>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={triggerReminderCheck}
                        disabled={triggeringReminders}
                        className="btn-outline text-xs py-2 px-3 flex items-center gap-1.5 disabled:opacity-50"
                        title="Check and send due reminders (2 weeks, 1 week, 48 hours)"
                      >
                        {triggeringReminders ? (
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin opacity-60" />
                        ) : (
                          <Icon name="BellIcon" size={13} className="text-white opacity-60" />
                        )}
                        {triggeringReminders ? 'Checking...' : 'Check Reminders'}
                      </button>
                      <button onClick={() => { setShowAddDate(!showAddDate); if (showAddDate) resetDate(); }} className="btn-gold text-xs py-2.5 sm:py-2 px-4">
                        <Icon name="PlusIcon" size={14} className="text-navy-900" />
                        Add Date
                      </button>
                    </div>
                  </div>

                  {showAddDate && (
                    <div className="surface-card rounded-2xl p-4 sm:p-5 space-y-4">
                      <h3 className="font-display font-700 text-navy-900 text-sm">Add Court Date</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Date *</label>
                          <input
                            type="date"
                            className={inputCls(!!dateErrors.event_date && !!dateTouched.event_date)}
                            value={newDate.event_date}
                            onChange={(e) => changeDate('event_date', e.target.value)}
                            onBlur={() => blurDate('event_date')}
                          />
                          <FieldError msg={dateTouched.event_date ? dateErrors.event_date : undefined} />
                        </div>
                        <div>
                          <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Type</label>
                          <select className="input-navy text-sm" value={newDate.event_type} onChange={(e) => changeDate('event_type', e.target.value)}>
                            <option value="court">Court Hearing</option><option value="mediation">Mediation</option><option value="deadline">Deadline</option><option value="contact">Contact</option><option value="other">Other</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="label-tag text-navy-500 block mb-1" style={{ fontSize: '10px' }}>Event Title *</label>
                          <input
                            type="text"
                            className={inputCls(!!dateErrors.event_title && !!dateTouched.event_title)}
                            placeholder="e.g. Directions Hearing — Central Family Court"
                            value={newDate.event_title}
                            onChange={(e) => changeDate('event_title', e.target.value)}
                            onBlur={() => blurDate('event_title')}
                          />
                          <FieldError msg={dateTouched.event_title ? dateErrors.event_title : undefined} />
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="checkbox" id="urgent" checked={newDate.is_urgent} onChange={(e) => changeDate('is_urgent', e.target.checked)} className="w-4 h-4" />
                          <label htmlFor="urgent" className="text-xs text-white text-opacity-60">Mark as urgent</label>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:gap-3">
                        <button onClick={addCourtDate} className="btn-gold text-xs py-3 sm:py-2 px-4 flex-1 sm:flex-none justify-center"><Icon name="CheckIcon" size={14} className="text-navy-900" />Save</button>
                        <button onClick={() => { setShowAddDate(false); resetDate(); }} className="btn-outline text-xs py-3 sm:py-2 px-4 flex-1 sm:flex-none justify-center">Cancel</button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 max-w-2xl">
                    {courtDates.length === 0 ? (
                      <p className="text-white text-opacity-40 text-sm text-center py-8">No court dates added yet</p>
                    ) : courtDates.map((date) => (
                      <div key={date.id} className={`p-4 rounded-2xl ${date.is_urgent ? 'bg-orange-400 bg-opacity-10 border border-orange-400 border-opacity-20' : 'surface-card'}`}>
                        <div className="flex items-center gap-4 mb-3">
                          <div className={`flex-shrink-0 text-center min-w-[56px] p-3 rounded-xl ${date.is_urgent ? 'bg-orange-400 bg-opacity-20' : 'bg-navy-700'}`}>
                            <p className={`font-display font-900 text-lg ${date.is_urgent ? 'text-orange-400' : 'text-gold-400'}`}>{new Date(date.event_date).getDate()}</p>
                            <p className="label-tag text-white text-opacity-40" style={{ fontSize: '8px' }}>{new Date(date.event_date).toLocaleString('en-GB', { month: 'short' })}</p>
                          </div>
                          <div className="flex-1">
                            <p className="font-display font-700 text-white text-sm">{date.event_title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="badge badge-blue" style={{ fontSize: '8px' }}>{date.event_type}</span>
                              {date.is_urgent && <span className="badge badge-red" style={{ fontSize: '8px' }}>Urgent</span>}
                            </div>
                          </div>
                        </div>
                        <FileUpload
                          context="court-date"
                          contextId={date.id}
                          label="Upload Court Order / Documents"
                          accept="documents"
                          compact={true}
                          existingFiles={courtDateFiles[date.id] || []}
                          onUploaded={(f) => setCourtDateFiles((prev) => ({ ...prev, [date.id]: [...(prev[date.id] || []), f] }))}
                          onDeleted={(id) => setCourtDateFiles((prev) => ({ ...prev, [date.id]: (prev[date.id] || []).filter((f) => f.id !== id) }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === 'documents' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display font-800 text-white text-lg">Documents</h2>
                    <Link href="/document-builder" className="btn-gold text-xs py-2 px-4">
                      <Icon name="PlusIcon" size={14} className="text-navy-900" />
                      Create Document
                    </Link>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.length === 0 ? (
                      <p className="text-white text-opacity-40 text-sm col-span-3 text-center py-8">No documents yet. Create your first document.</p>
                    ) : documents.map((doc) => (
                      <div key={doc.id} className="surface-card rounded-2xl p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-navy-700 flex items-center justify-center text-gold-400">
                            <Icon name="DocumentTextIcon" size={20} />
                          </div>
                          <span className={`badge ${doc.status === 'complete' ? 'badge-green' : doc.status === 'submitted' ? 'badge-gold' : 'badge-blue'}`} style={{ fontSize: '8px' }}>{doc.status}</span>
                        </div>
                        <h3 className="font-display font-700 text-white text-sm mb-1">{doc.title}</h3>
                        <p className="text-xs text-white text-opacity-40">{doc.template_name}</p>
                        <p className="label-tag text-white text-opacity-30 mt-2" style={{ fontSize: '9px' }}>{new Date(doc.created_at).toLocaleDateString('en-GB')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Assistant Tab */}
              {activeTab === 'ai-assistant' && (
                <div className="max-w-3xl mx-auto space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display font-800 text-white text-lg">AI Legal Assistant</h2>
                      <p className="text-xs text-white text-opacity-40 mt-1">UK Family Law Trained • Claude 3.5 Sonnet • 24/7 Available</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                      <span className="badge badge-gold" style={{ fontSize: '8px' }}>AI Powered</span>
                    </div>
                  </div>

                  {/* Quick prompts */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'Child arrangements advice', prompt: 'What are my options for child arrangements under the Children Act 1989?' },
                      { label: 'Prepare for hearing', prompt: 'How should I prepare for my upcoming court hearing?' },
                      { label: 'CAFCASS report help', prompt: 'How do I respond to a CAFCASS Section 7 report?' },
                      { label: 'Position statement tips', prompt: 'What should I include in my position statement?' },
                      { label: 'Financial remedy', prompt: 'What are my rights in financial remedy proceedings?' },
                      { label: 'Domestic abuse orders', prompt: 'How do I apply for a non-molestation order?' },
                    ].map((q) => (
                      <button
                        key={q.label}
                        onClick={() => { setAiInput(q.prompt); }}
                        className="p-3 rounded-xl bg-navy-800 border border-navy-600 hover:border-gold-500 hover:border-opacity-40 transition-all text-left"
                      >
                        <p className="text-xs font-display font-600 text-white text-opacity-70 leading-tight">{q.label}</p>
                      </button>
                    ))}
                  </div>

                  {/* Chat */}
                  <div className="surface-card rounded-3xl p-6 flex flex-col" style={{ minHeight: '500px' }}>
                    <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1" style={{ maxHeight: '380px' }}>
                      {aiMessages.map((msg, i) => (
                        <div key={i} className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                          {msg.role === 'assistant' ? (
                            <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <span className="text-sm">{msg.content}</span>
                          )}
                        </div>
                      ))}
                      {/* Streaming */}
                      {aiLoading && aiResponse && (
                        <div className="chat-bubble-ai">
                          <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed">
                            <ReactMarkdown>{aiResponse}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                      {aiLoading && !aiResponse && (
                        <div className="chat-bubble-ai flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-gold-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-gold-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-gold-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                      <div ref={aiChatEndRef} />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-navy-600">
                      <input
                        type="text"
                        value={aiInput}
                        onChange={(e) => setAiInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAiSend()}
                        placeholder="Ask about your case, court procedures, legal rights..."
                        className="input-navy flex-1"
                        disabled={aiLoading}
                      />
                      <button
                        onClick={handleAiSend}
                        disabled={aiLoading || !aiInput.trim()}
                        className="w-11 h-11 rounded-xl bg-gold-gradient flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                      >
                        <Icon name="PaperAirplaneIcon" size={18} className="text-navy-900" />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-navy-800 border border-navy-600">
                    <div className="flex items-start gap-3">
                      <Icon name="InformationCircleIcon" size={16} className="text-gold-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-white text-opacity-50 leading-relaxed">
                        This AI assistant provides general legal information about UK family law. It is not a substitute for professional legal advice. For complex matters, consider consulting a solicitor or seeking help from a McKenzie Friend.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

    </div>
  );
}