'use client';

import React, { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { useChat } from '@/lib/hooks/useChat';
import toast from 'react-hot-toast';

const ReactMarkdown = lazy(() => import('react-markdown'));

const NAVIGATION_SYSTEM_PROMPT = `You are the CourtCraft Advocate Navigation Expert — a friendly, knowledgeable guide who knows everything about the CourtCraft Advocate platform. Your sole purpose is to help members navigate the site, understand every tool, and know exactly what to do at every step.

## ABOUT COURTCRAFT ADVOCATE
CourtCraft Advocate is a UK-based platform providing professional McKenzie Friend support tools for people representing themselves in family court. Members pay £35/month for full access.

## SITE PAGES & HOW TO NAVIGATE

### 🏠 Homepage (/)
The public-facing landing page. Shows features, how it works, pricing, and FAQs. Non-members can browse here. To sign up, click "Get Started" or "Register Now" buttons.

### 🔐 Sign In (/sign-in) & Register (/register)
Existing users sign in at /sign-in. New users register at /register — enter your email, receive a verification code, confirm it, and complete payment to access your account. After login you are taken to the Dashboard.

### 📊 Dashboard (/dashboard)
Your main control centre after logging in. From here you can access ALL tools:
- **AI Legal Assistant** — Chat with an AI trained on UK family law
- **Document Builder** — Create legal documents (C100, position statements, etc.)
- **Case Management** — Track your case timeline, contacts, and key events
- **Court Filing Tracker** — Monitor your court filings and deadlines
- **McKenzie Friend Sessions** — Book 1-to-1 sessions with a McKenzie Friend
- **Insight Scheduler** — Schedule automated case insights and reminders
- **Court Report Builder** — Build structured court reports
- **Resources** — Access guides, templates, and educational materials

### 📁 Case Management (/case-management)
Track everything about your case:
- Add and view timeline events
- Log child contact visits
- Record key dates and milestones
- Monitor case status
Navigate here from the Dashboard sidebar or the "Case Management" tab.

### 📄 Document Builder (/document-builder)
Create professional legal documents:
- C100 application forms
- Position statements
- Witness statements
- Letters to the court
Select a document type, fill in the guided form, and download or save your document.

### 📋 Court Filing Tracker (/court-filing-tracker)
Keep track of all your court filings:
- Log submitted documents
- Track deadlines and hearing dates
- Monitor filing status (pending, submitted, acknowledged)
Access from the Dashboard or direct URL.

### 📅 Case Intake (/case-intake)
Start a new case by completing the intake form. Provide details about your case type, parties involved, and current situation. This creates your case profile used across all tools.

### 💳 Subscription (/subscription)
Manage your membership:
- View current plan (£35/month)
- Update payment details
- Cancel or upgrade subscription
Access from your Profile or Settings.

### ⚙️ Settings (/settings)
Update your account preferences:
- Notification settings
- Email preferences
- Privacy settings

### 👤 Profile (/profile)
View and edit your personal profile:
- Name and contact details
- Account information
- Subscription status

### 📚 Resources (/resources)
Access educational materials:
- UK family law guides
- Court procedure explanations
- Template letters and forms
- McKenzie Friend information

## HOW TO USE KEY TOOLS

### AI Legal Assistant
1. Go to Dashboard → click "AI Legal Assistant" tab
2. Type your question in the chat box
3. Press Enter or click Send
4. The AI responds with UK family law guidance
5. Ask follow-up questions — it remembers the conversation

### Document Builder
1. Go to Dashboard → click "Document Builder" tab (or /document-builder)
2. Select the document type you need
3. Fill in each section of the guided form
4. Review the preview
5. Download as PDF or save to your account

### Case Management
1. Go to /case-management
2. Click "Add Event" to log a timeline entry 3. Use"Contact Log" to record child contact visits
4. View your full case timeline in chronological order

### Court Filing Tracker
1. Go to /court-filing-tracker
2. Click "Add Filing" to record a new submission
3. Set the deadline date and status
4. Update status as filings progress

### McKenzie Friend Sessions
1. From the Dashboard, find "McKenzie Friend Sessions"
2. Select an available time slot
3. Complete the booking form
4. You'll receive a confirmation email

## MEMBERSHIP & BILLING
- Monthly subscription: £35/month
- Register now to get instant access as a member
- Payment processed securely via Stripe
- Cancel anytime from /subscription
- Trial countdown shown in the banner at the top of the page

## COMMON QUESTIONS

**"How do I get started?"**
Register at /register, verify your email, then complete the case intake form at /case-intake to set up your case profile.

**"Where do I find my documents?"**
Go to /document-builder or the Document Builder tab in your Dashboard.

**"How do I book a McKenzie Friend?"**
From your Dashboard, look for the McKenzie Friend Sessions section and follow the booking steps.

**"I can't log in"**
Go to /sign-in to log in. If you've forgotten your password, use the "Forgot password?" link on the sign-in page. Check your spam folder if you don't see the reset email.

**"How do I cancel my subscription?"** Go to /subscription and click"Cancel Subscription". Your access continues until the end of the billing period. **"What is a McKenzie Friend?"**
A McKenzie Friend is a person who assists a litigant in person (someone representing themselves) in court. They can take notes, quietly give advice, and help with documents, but cannot speak in court unless given permission by the judge.

Always be warm, encouraging, and specific. Guide users step-by-step. If you're unsure about something specific to their account, direct them to the relevant page and explain what they'll find there.`;

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const SUGGESTED_QUESTIONS = [
  'How do I get started?',
  'Where is the Document Builder?',
  'How do I track my court filings?',
  'What tools are available?',
];

// Default anchor: bottom-right corner (right: 16px, bottom: 16px)
const DEFAULT_RIGHT = 16;
const DEFAULT_BOTTOM = 180;

const NavigationExpertWidget: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "👋 Hi! I'm your **CourtCraft Navigation Expert**. I know every tool, page, and feature on this platform.\n\nAsk me anything — how to use a tool, where to find something, or what to do next. I'm here to make sure you always know exactly where to go!",
    },
  ]);
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
  const [hasUnread, setHasUnread] = useState(false);

  // Widget position stored as { right, bottom } from viewport edges (px)
  const [widgetPos, setWidgetPos] = useState<{ right: number; bottom: number }>({
    right: DEFAULT_RIGHT,
    bottom: DEFAULT_BOTTOM,
  });

  const dragRef = useRef<{
    startX: number;
    startY: number;
    startRight: number;
    startBottom: number;
  } | null>(null);
  const isDragging = useRef(false);
  const bubbleRef = useRef<HTMLButtonElement>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevResponseRef = useRef('');
  const isCapturingRef = useRef(false);

  const { response: aiResponse, isLoading: loading, error: aiError, sendMessage } = useChat(
    'ANTHROPIC',
    'claude-sonnet-4-5-20250929',
    true
  );

  useEffect(() => {
    if (aiError) toast.error(aiError.message);
  }, [aiError]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, aiResponse]);

  useEffect(() => {
    if (open) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

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
        if (last && last.role === 'assistant' && last.text === '') {
          return [...prev.slice(0, -1), { role: 'assistant', text: aiResponse }];
        }
        return prev;
      });

      if (!open) setHasUnread(true);
    }
  }, [aiResponse, loading, open]);

  // Shared drag start logic
  const startDrag = useCallback((clientX: number, clientY: number) => {
    isDragging.current = false;
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      startRight: widgetPos.right,
      startBottom: widgetPos.bottom,
    };
  }, [widgetPos]);

  // Shared drag move logic — clamp within viewport
  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (!dragRef.current) return;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true;

    const BUBBLE_SIZE = 48; // w-12 = 48px
    const newRight = Math.max(0, Math.min(window.innerWidth - BUBBLE_SIZE, dragRef.current.startRight - dx));
    const newBottom = Math.max(0, Math.min(window.innerHeight - BUBBLE_SIZE, dragRef.current.startBottom - dy));
    setWidgetPos({ right: newRight, bottom: newBottom });
  }, []);

  // Mouse drag on bubble
  const onBubbleMouseDown = useCallback((e: React.MouseEvent) => {
    startDrag(e.clientX, e.clientY);

    const onMouseMove = (ev: MouseEvent) => moveDrag(ev.clientX, ev.clientY);
    const onMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  }, [startDrag, moveDrag]);

  // Touch drag on bubble
  const onBubbleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);

    const onTouchMove = (ev: TouchEvent) => {
      const t = ev.touches[0];
      moveDrag(t.clientX, t.clientY);
      ev.preventDefault();
    };
    const onTouchEnd = () => {
      dragRef.current = null;
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }, [startDrag, moveDrag]);

  // Mouse drag on panel header
  const onPanelMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    startDrag(e.clientX, e.clientY);

    const onMouseMove = (ev: MouseEvent) => moveDrag(ev.clientX, ev.clientY);
    const onMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    e.preventDefault();
  }, [startDrag, moveDrag]);

  // Touch drag on panel header
  const onPanelTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);

    const onTouchMove = (ev: TouchEvent) => {
      const t = ev.touches[0];
      moveDrag(t.clientX, t.clientY);
      ev.preventDefault();
    };
    const onTouchEnd = () => {
      dragRef.current = null;
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  }, [startDrag, moveDrag]);

  const handleBubbleClick = () => {
    // Only toggle if it wasn't a drag
    if (!isDragging.current) {
      setOpen(prev => !prev);
    }
    isDragging.current = false;
  };

  const handleSend = (text?: string) => {
    const userMsg = (text || input).trim();
    if (!userMsg || loading) return;
    setInput('');
    prevResponseRef.current = '';
    isCapturingRef.current = false;

    const newHistory = [...conversationHistory, { role: 'user', content: userMsg }];
    setConversationHistory(newHistory);
    setMessages(prev => [...prev, { role: 'user', text: userMsg }, { role: 'assistant', text: '' }]);

    const apiMessages = [
      { role: 'system', content: NAVIGATION_SYSTEM_PROMPT },
      ...newHistory,
    ];

    sendMessage(apiMessages, { max_tokens: 1024, temperature: 0.5 });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Panel opens above the bubble, aligned to the same right edge
  const PANEL_WIDTH = 320; // sm:w-80
  const BUBBLE_SIZE = 48;
  const PANEL_GAP = 8;

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    right: widgetPos.right,
    bottom: widgetPos.bottom + BUBBLE_SIZE + PANEL_GAP,
    zIndex: 9999,
    width: PANEL_WIDTH,
  };

  const bubbleStyle: React.CSSProperties = {
    position: 'fixed',
    right: widgetPos.right,
    bottom: widgetPos.bottom,
    zIndex: 9999,
  };

  return (
    <>
      {/* Chat Panel */}
      {open && (
        <div
          style={{ ...panelStyle, background: '#fff' }}
          className="max-h-[65vh] flex flex-col rounded-xl shadow-2xl overflow-hidden border border-slate-200 select-none"
        >
          {/* Header — drag handle */}
          <div
            className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-700 to-blue-600 text-white flex-shrink-0 cursor-grab active:cursor-grabbing"
            onMouseDown={onPanelMouseDown}
            onTouchStart={onPanelTouchStart}
          >
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs leading-tight">Navigation Expert</p>
              <p className="text-xs text-blue-100 leading-tight opacity-80">CourtCraft Guide</p>
            </div>
            {/* Drag indicator */}
            <svg className="w-3.5 h-3.5 text-white/50 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
              <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
              <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
            </svg>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Close chat"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5 bg-slate-50" style={{ minHeight: 0 }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mr-1.5 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    msg.role === 'user' ?'bg-blue-600 text-white rounded-br-sm' :'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' && msg.text === '' && loading ? (
                    <span className="flex gap-1 items-center py-0.5">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  ) : msg.role === 'assistant' ? (
                    <Suspense fallback={<span>{msg.text}</span>}>
                      <div className="prose prose-xs max-w-none prose-p:my-0.5 prose-ul:my-0.5 prose-li:my-0 prose-headings:my-1 prose-strong:text-slate-900">
                        <ReactMarkdown>{msg.text || (loading && i === messages.length - 1 ? aiResponse : '')}</ReactMarkdown>
                      </div>
                    </Suspense>
                  ) : (
                    <span>{msg.text}</span>
                  )}
                </div>
              </div>
            ))}

            {/* Suggested questions — show only at start */}
            {messages.length === 1 && (
              <div className="space-y-1 pt-1">
                <p className="text-xs text-slate-400 text-center">Quick questions:</p>
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    disabled={loading}
                    className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg bg-white border border-blue-100 text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-colors shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="px-2.5 py-2 bg-white border-t border-slate-100 flex-shrink-0">
            <div className="flex items-end gap-1.5 bg-slate-50 rounded-lg border border-slate-200 px-2.5 py-1.5 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-100 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything…"
                disabled={loading}
                rows={1}
                className="flex-1 bg-transparent text-xs text-slate-800 placeholder-slate-400 resize-none outline-none leading-relaxed max-h-20 disabled:opacity-50"
                style={{ minHeight: '1.25rem' }}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="w-7 h-7 rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
                aria-label="Send message"
              >
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="text-center text-xs text-slate-400 mt-1" style={{ fontSize: '10px' }}>Powered by CourtCraft AI</p>
          </div>
        </div>
      )}

      {/* Floating Bubble Button — draggable */}
      <button
        ref={bubbleRef}
        style={bubbleStyle}
        onMouseDown={onBubbleMouseDown}
        onTouchStart={onBubbleTouchStart}
        onClick={handleBubbleClick}
        className="group cursor-grab active:cursor-grabbing"
        aria-label="Open Navigation Expert"
      >
        <div className="relative">
          {/* Pulse ring */}
          {!open && (
            <span className="absolute inset-0 rounded-full bg-blue-500 opacity-30 animate-ping" />
          )}

          {/* Main button */}
          <div className={`relative w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
            open
              ? 'bg-slate-700 scale-95' :'bg-gradient-to-br from-blue-600 to-blue-800 hover:scale-110 hover:shadow-xl'
          }`}>
            {open ? (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            )}
          </div>

          {/* Unread badge */}
          {hasUnread && !open && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
          )}

          {/* Tooltip label */}
          {!open && (
            <div className="absolute bottom-full right-0 mb-2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <div className="bg-slate-800 text-white text-xs font-medium px-2.5 py-1 rounded-lg shadow-lg">
                Navigation Expert
                <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
              </div>
            </div>
          )}
        </div>
      </button>
    </>
  );
};

export default NavigationExpertWidget;
