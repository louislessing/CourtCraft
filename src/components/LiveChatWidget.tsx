'use client';

import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import Icon from '@/components/ui/AppIcon';
import { createClient } from '@/lib/supabase/client';
import { useChat } from '@/lib/hooks/useChat';

// Lazy-load ReactMarkdown — it's heavy (~50KB) and only needed when chat is open
const ReactMarkdown = lazy(() => import('react-markdown'));

const BASE_SYSTEM_PROMPT = `You are CourtCraft Advocate's AI Legal Assistant, a specialist in UK family law. You provide helpful, accurate guidance on:
- Child arrangements and custody matters
- Financial remedy proceedings
- Domestic abuse protections and non-molestation orders
- McKenzie Friend rights and court procedures
- CAFCASS reports and court hearings
- Litigant in person support

Keep responses concise and practical. Always acknowledge this is general guidance, not a substitute for professional legal advice. Encourage users to sign up for full access to get personalised case support.`;

interface CaseContextData {
  caseTitle: string;
  caseType?: string;
  caseNumber?: string;
  courtName?: string;
  status?: string;
  recentTimeline: { event_date: string; title: string; description?: string; importance?: string }[];
  recentContacts: { contact_date: string; child_name: string; contact_type: string; mood?: string; notes?: string }[];
  recentDocuments: { name: string; document_type?: string; created_at: string }[];
  upcomingDates: { event_date: string; event_title: string; event_type?: string }[];
}

function buildSystemPromptWithCaseContext(caseCtx: CaseContextData | null): string {
  if (!caseCtx) return BASE_SYSTEM_PROMPT;

  const parts: string[] = [BASE_SYSTEM_PROMPT];

  parts.push('\n\n--- USER CASE CONTEXT ---');
  parts.push(`Case: ${caseCtx.caseTitle}`);
  if (caseCtx.caseType) parts.push(`Type: ${caseCtx.caseType}`);
  if (caseCtx.caseNumber) parts.push(`Case Number: ${caseCtx.caseNumber}`);
  if (caseCtx.courtName) parts.push(`Court: ${caseCtx.courtName}`);
  if (caseCtx.status) parts.push(`Status: ${caseCtx.status}`);

  if (caseCtx.upcomingDates.length > 0) {
    parts.push('\nUpcoming Court Dates:');
    caseCtx.upcomingDates.slice(0, 3).forEach(d => {
      parts.push(`- ${d.event_date}: ${d.event_title}${d.event_type ? ` (${d.event_type})` : ''}`);
    });
  }

  if (caseCtx.recentTimeline.length > 0) {
    parts.push('\nRecent Timeline Events:');
    caseCtx.recentTimeline.slice(0, 5).forEach(e => {
      const imp = e.importance ? ` [${e.importance}]` : '';
      const desc = e.description ? ` — ${e.description}` : '';
      parts.push(`- ${e.event_date}: ${e.title}${imp}${desc}`);
    });
  }

  if (caseCtx.recentContacts.length > 0) {
    parts.push('\nRecent Child Contact Logs:');
    caseCtx.recentContacts.slice(0, 4).forEach(c => {
      const mood = c.mood ? `, mood: ${c.mood}` : '';
      const notes = c.notes ? ` — ${c.notes}` : '';
      parts.push(`- ${c.contact_date}: ${c.contact_type} with ${c.child_name}${mood}${notes}`);
    });
  }

  if (caseCtx.recentDocuments.length > 0) {
    parts.push('\nCase Documents on File:');
    caseCtx.recentDocuments.slice(0, 5).forEach(d => {
      const type = d.document_type ? ` (${d.document_type})` : '';
      parts.push(`- ${d.name}${type}`);
    });
  }

  parts.push('\nUse this case context to provide personalised, case-specific advice. Reference these details when relevant to the user\'s questions.');
  parts.push('--- END CASE CONTEXT ---');

  return parts.join('\n');
}

const LiveChatWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<{ role: string; text: string; id?: string }[]>([
    {
      role: 'ai',
      text: "Hello! I'm CourtCraft Advocate's AI Legal Assistant. I can help with UK family law questions, McKenzie Friend rights, and court procedures. How can I help you today?",
    },
  ]);
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
  const [caseContext, setCaseContext] = useState<CaseContextData | null>(null);
  const caseContextLoadedRef = useRef(false);

  // Create Supabase client lazily — only instantiated once widget is mounted
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const getSupabase = () => {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  };
  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevResponseRef = useRef('');
  const isCapturingRef = useRef(false);

  const { response: aiResponse, isLoading: loading, error: aiError, sendMessage } = useChat('OPEN_AI', 'gpt-4o', true);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiResponse]);

  // Capture completed streaming response
  useEffect(() => {
    if (loading && aiResponse) {
      isCapturingRef.current = true;
    }
    if (!loading && isCapturingRef.current && aiResponse && aiResponse !== prevResponseRef.current) {
      isCapturingRef.current = false;
      prevResponseRef.current = aiResponse;

      setConversationHistory(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'ai' && last.text === '') {
          return [...prev.slice(0, -1), { role: 'ai', text: aiResponse }];
        }
        return [...prev, { role: 'ai', text: aiResponse }];
      });

      const supabase = getSupabase();
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          supabase.from('chat_messages').insert({
            user_id: session.user.id,
            role: 'ai',
            content: aiResponse,
            session_id: 'widget',
          });
        }
      });
    }
  }, [aiResponse, loading]);

  // Load recent messages and case context when widget is opened
  useEffect(() => {
    if (!open) return;

    const loadWidgetData = async () => {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // Load recent chat messages
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('session_id', 'widget')
        .order('created_at', { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        const msgs = data.reverse().map((m) => ({ role: m.role === 'user' ? 'user' : 'ai', text: m.content, id: m.id }));
        setMessages(msgs);
        setConversationHistory(data.reverse().map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })));
      }

      // Load case context only once per widget session
      if (caseContextLoadedRef.current) return;
      caseContextLoadedRef.current = true;

      try {
        // Fetch active case
        const { data: activeCase } = await supabase
          .from('cases')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle();

        if (!activeCase) return;

        // Fetch timeline, contacts, documents, and upcoming court dates in parallel
        const [timelineRes, contactsRes, documentsRes, datesRes] = await Promise.all([
          supabase
            .from('timeline_events')
            .select('event_date, title, description, importance')
            .eq('case_id', activeCase.id)
            .order('event_date', { ascending: false })
            .limit(5),
          supabase
            .from('contact_logs')
            .select('contact_date, child_name, contact_type, mood, notes')
            .eq('case_id', activeCase.id)
            .order('contact_date', { ascending: false })
            .limit(4),
          supabase
            .from('documents')
            .select('name, document_type, created_at')
            .eq('user_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('court_dates')
            .select('event_date, event_title, event_type')
            .eq('case_id', activeCase.id)
            .gte('event_date', new Date().toISOString().split('T')[0])
            .order('event_date', { ascending: true })
            .limit(3),
        ]);

        setCaseContext({
          caseTitle: activeCase.title,
          caseType: activeCase.case_type,
          caseNumber: activeCase.case_number,
          courtName: activeCase.court_name,
          status: activeCase.status,
          recentTimeline: timelineRes.data || [],
          recentContacts: contactsRes.data || [],
          recentDocuments: documentsRes.data || [],
          upcomingDates: datesRes.data || [],
        });
      } catch {
        // Case context is optional — widget still works without it
      }
    };

    loadWidgetData();
  }, [open]);

  const handleSend = async () => {
    if (!message.trim() || loading) return;
    const userMsg = message.trim();
    setMessage('');
    prevResponseRef.current = '';
    isCapturingRef.current = false;

    setMessages((prev) => [...prev, { role: 'user', text: userMsg }, { role: 'ai', text: '' }]);

    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('chat_messages').insert({
        user_id: session.user.id,
        role: 'user',
        content: userMsg,
        session_id: 'widget',
      });
    }

    const updatedHistory = [...conversationHistory, { role: 'user', content: userMsg }];
    setConversationHistory(updatedHistory);

    const systemPrompt = buildSystemPromptWithCaseContext(caseContext);

    sendMessage([
      { role: 'system', content: systemPrompt },
      ...updatedHistory,
    ], { max_completion_tokens: 512 });
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm sm:w-96 glass-dark border border-white border-opacity-10 rounded-3xl overflow-hidden shadow-navy-lg animate-scale-in">
          <div className="p-4 border-b border-white border-opacity-10 flex items-center justify-between bg-navy-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gold-gradient flex items-center justify-center">
                <Icon name="SparklesIcon" size={16} className="text-navy-900" />
              </div>
              <div>
                <p className="text-sm font-display font-700 text-white">AI Legal Assistant</p>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-xs text-white text-opacity-40">
                    {caseContext ? `Case: ${caseContext.caseTitle.length > 20 ? caseContext.caseTitle.slice(0, 20) + '…' : caseContext.caseTitle}` : 'Online 24/7 • Live'}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-navy-700 flex items-center justify-center text-white text-opacity-50 hover:text-white transition-colors">
              <Icon name="XMarkIcon" size={14} />
            </button>
          </div>

          {caseContext && (
            <div className="px-4 py-2 bg-navy-900 border-b border-white border-opacity-5 flex items-center gap-2">
              <Icon name="FolderOpenIcon" size={12} className="text-gold-400 flex-shrink-0" />
              <span className="text-xs text-white text-opacity-50">
                Context loaded: {caseContext.recentTimeline.length} timeline events, {caseContext.recentContacts.length} contacts, {caseContext.recentDocuments.length} documents
              </span>
            </div>
          )}

          <div className="p-4 h-56 sm:h-64 overflow-y-auto flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={msg.role === 'user' ? 'chat-bubble-user self-end' : 'chat-bubble-ai'}>
                {msg.role === 'ai' ? (
                  msg.text === '' && loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gold-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-gold-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-gold-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : (
                    <div className="prose prose-invert prose-xs max-w-none text-xs leading-relaxed">
                      <Suspense fallback={<span className="text-xs">{msg.text === '' && aiResponse ? aiResponse : msg.text}</span>}>
                        <ReactMarkdown>{msg.text === '' && aiResponse ? aiResponse : msg.text}</ReactMarkdown>
                      </Suspense>
                    </div>
                  )
                ) : (
                  <span className="text-xs">{msg.text}</span>
                )}
              </div>
            ))}
            {aiError && (
              <div className="chat-bubble-ai text-xs text-red-400">
                Sorry, I'm temporarily unavailable. Please try again in a moment.
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 sm:p-4 border-t border-white border-opacity-10 flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={caseContext ? 'Ask about your case...' : 'Ask about family law...'}
              className="input-navy text-sm py-2 px-4 flex-1"
              style={{ fontSize: '16px' }}
              disabled={loading}
            />
            <button onClick={handleSend} disabled={loading || !message.trim()} className="w-10 h-10 rounded-full bg-gold-gradient flex items-center justify-center flex-shrink-0 disabled:opacity-50">
              <Icon name="PaperAirplaneIcon" size={16} className="text-navy-900" />
            </button>
          </div>
        </div>
      )}

      <button
        className="fixed bottom-5 right-5 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gold-gradient flex items-center justify-center shadow-lg hover:scale-110 transition-transform duration-300"
        onClick={() => setOpen(!open)}
        aria-label="Open live chat"
      >
        <Icon name={open ? 'XMarkIcon' : 'ChatBubbleLeftRightIcon'} size={22} className="text-navy-900" />
      </button>
    </>
  );
};

export default LiveChatWidget;