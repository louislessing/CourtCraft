'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  verifiedUsers: number;
  totalSubscriptions: number;
  activeSubs: number;
  trialSubs: number;
  cancelledSubs: number;
  totalCases: number;
  activeCases: number;
  totalMckenzieSessions: number;
  mckenzieRevenuePence: number;
  totalAiInteractions: number;
  featureUsage: Record<string, number>;
  monthlySignups: { month: string; count: number }[];
}

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  is_active: boolean;
  email_verified: boolean;
}

interface SubRow {
  id: string;
  user_id: string;
  status: string;
  plan: string;
  amount: number;
  currency: string;
  created_at: string;
}

interface AdminData {
  stats: AdminStats;
  recentUsers: UserRow[];
  recentSubscriptions: SubRow[];
}

// ─── Health Types ────────────────────────────────────────────────────────────
interface ServiceHealthResult {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  statusCode?: number;
  error?: string;
  checkedAt: string;
}

interface HealthResponse {
  overall: 'healthy' | 'degraded' | 'down';
  services: ServiceHealthResult[];
  checkedAt: string;
  retryQueueDepth: number;
}

interface ApiMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  timestamp: string;
  success: boolean;
}

interface Incident {
  id: string;
  service: string;
  type: 'down' | 'degraded';
  startedAt: string;
  resolvedAt?: string;
  alertSent: boolean;
}

type Tab = 'overview' | 'users' | 'subscriptions' | 'activity' | 'health' | 'diagnostics' | 'ai-agent';

// ─── Helper Components ────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'gold' }: { label: string; value: string | number; sub?: string; color?: 'gold' | 'green' | 'blue' | 'red' }) {
  const colorMap = {
    gold: 'border-yellow-200 bg-yellow-50',
    green: 'border-green-200 bg-green-50',
    blue: 'border-blue-200 bg-blue-50',
    red: 'border-red-200 bg-red-50',
  };
  const textMap = {
    gold: 'text-yellow-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
    red: 'text-red-600',
  };
  return (
    <div className={`rounded-xl border p-5 ${colorMap[color]}`}>
      <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-2">{label}</p>
      <p className={`font-display text-3xl font-700 ${textMap[color]}`}>{value}</p>
      {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700 border-green-200',
    trialing: 'bg-blue-100 text-blue-700 border-blue-200',
    cancelled: 'bg-red-100 text-red-700 border-red-200',
    canceled: 'bg-red-100 text-red-700 border-red-200',
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    true: 'bg-green-100 text-green-700 border-green-200',
    false: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  const cls = map[status] || 'bg-gray-100 text-gray-500 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${cls}`}>
      {status}
    </span>
  );
}

function ServiceStatusDot({ status }: { status: 'healthy' | 'degraded' | 'down' | 'checking' }) {
  const map = {
    healthy: 'bg-green-500',
    degraded: 'bg-yellow-500',
    down: 'bg-red-500',
    checking: 'bg-gray-300',
  };
  const pulse = status === 'down' ? 'animate-pulse' : '';
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${map[status]} ${pulse}`} />;
}

function ServiceStatusBadge({ status }: { status: 'healthy' | 'degraded' | 'down' | 'checking' }) {
  const map = {
    healthy: 'bg-green-100 text-green-700 border-green-200',
    degraded: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    down: 'bg-red-100 text-red-700 border-red-200',
    checking: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${map[status]}`}>
      <ServiceStatusDot status={status} />
      {status === 'checking' ? 'Checking...' : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function generateIncidentId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INC-${ts}-${rand}`;
}

// ─── Diagnostics Tab ──────────────────────────────────────────────────────────
interface DiagnosticCheck {
  id: string;
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message: string;
  detail?: string;
  fixSuggestion?: string;
  durationMs?: number;
}

interface DiagnosticsResponse {
  runAt: string;
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  checks: DiagnosticCheck[];
}

function DiagnosticsTab() {
  const [result, setResult] = useState<DiagnosticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedFix, setExpandedFix] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'fail' | 'warn' | 'pass'>('all');

  const runDiagnostics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/diagnostics', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const statusIcon = (status: DiagnosticCheck['status']) => {
    if (status === 'pass') return (
      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
    if (status === 'fail') return (
      <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
    if (status === 'warn') return (
      <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v10m0-6l-2 2" />
      </svg>
    );
    return (
      <svg className="w-4 h-4 text-white/30 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const statusBg = (status: DiagnosticCheck['status']) => {
    if (status === 'pass') return 'border-green-200 bg-green-50';
    if (status === 'fail') return 'border-red-200 bg-red-50';
    if (status === 'warn') return 'border-yellow-200 bg-yellow-50';
    return 'border-gray-200 bg-gray-50';
  };

  const categories = result
    ? [...new Set(result.checks.map((c) => c.category))]
    : [];

  const filteredChecks = result?.checks.filter((c) =>
    filter === 'all' ? true : c.status === filter
  ) ?? [];

  const scorePercent = result
    ? Math.round((result.passed / (result.totalChecks - result.checks.filter((c) => c.status === 'skip').length)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-display text-xl font-700 text-black mb-1">System Diagnostics</h2>
            <p className="text-gray-500 text-sm">
              {result
                ? `Last run: ${new Date(result.runAt).toLocaleString('en-GB')}`
                : 'Run a full diagnostic scan to identify potential issues'}
            </p>
          </div>
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="flex items-center gap-2 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-700 rounded-xl px-5 py-2.5 text-sm font-bold transition-all"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Running Checks...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Run Diagnostics
              </>
            )}
          </button>
        </div>

        {result && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-1">Health Score</p>
              <p className={`font-display text-3xl font-700 ${scorePercent >= 90 ? 'text-green-600' : scorePercent >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                {scorePercent}%
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-1">Passed</p>
              <p className="font-display text-3xl font-700 text-green-600">{result.passed}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-1">Failed</p>
              <p className="font-display text-3xl font-700 text-red-600">{result.failed}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-1">Warnings</p>
              <p className="font-display text-3xl font-700 text-yellow-600">{result.warnings}</p>
            </div>
          </div>
        )}
      </div>

      {result && (
        <>
          {/* Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {(['all', 'fail', 'warn', 'pass'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                  filter === f
                    ? (f === 'fail' ? 'bg-red-100 border-red-200 text-red-700'
                      : f === 'warn' ? 'bg-yellow-100 border-yellow-200 text-yellow-700'
                      : f === 'pass' ? 'bg-green-100 border-green-200 text-green-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700')
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-gray-700'
                }`}
              >
                {f === 'all' ? `All (${result.totalChecks})` : f === 'fail' ? `Failed (${result.failed})` : f === 'warn' ? `Warnings (${result.warnings})` : `Passed (${result.passed})`}
              </button>
            ))}
          </div>

          {/* Checks by Category */}
          {categories.map((cat) => {
            const catChecks = filteredChecks.filter((c) => c.category === cat);
            if (catChecks.length === 0) return null;
            return (
              <div key={cat} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <span className="text-black font-bold text-sm">{cat}</span>
                  <span className="text-gray-400 text-xs">
                    {catChecks.filter((c) => c.status === 'pass').length}/{catChecks.length} passing
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {catChecks.map((check) => (
                    <div key={check.id} className={`px-6 py-4 border-l-2 ${check.status === 'fail' ? 'border-l-red-400' : check.status === 'warn' ? 'border-l-yellow-400' : check.status === 'pass' ? 'border-l-green-400' : 'border-l-gray-200'}`}>
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{statusIcon(check.status)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-black text-sm font-bold">{check.name}</p>
                            {check.durationMs !== undefined && (
                              <span className="text-gray-400 text-xs">{check.durationMs}ms</span>
                            )}
                          </div>
                          <p className="text-gray-500 text-sm mt-0.5">{check.message}</p>
                          {check.detail && (
                            <p className="text-gray-500 text-xs font-mono mt-1 bg-gray-50 rounded px-2 py-1">{check.detail}</p>
                          )}
                          {check.fixSuggestion && (
                            <div className="mt-2">
                              <button
                                onClick={() => setExpandedFix(expandedFix === check.id ? null : check.id)}
                                className="flex items-center gap-1.5 text-xs text-yellow-600 hover:text-yellow-700 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {expandedFix === check.id ? 'Hide fix' : 'Show fix suggestion'}
                              </button>
                              {expandedFix === check.id && (
                                <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                                  <p className="text-yellow-700 text-xs">{check.fixSuggestion}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {!result && !loading && (
        <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <p className="text-gray-400 text-sm mb-4">No diagnostic data yet</p>
          <button
            onClick={runDiagnostics}
            className="inline-flex items-center gap-2 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-700 rounded-xl px-5 py-2.5 text-sm font-bold transition-all"
          >
            Run First Diagnostic Scan
          </button>
        </div>
      )}
    </div>
  );
}

// ─── AI Agent Tab ─────────────────────────────────────────────────────────────
interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

function AIAgentTab() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: AgentMessage = {
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/ai-agent', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'AI agent request failed');
        return;
      }

      const data = await res.json();
      const assistantMsg: AgentMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    'Run a health check and tell me what needs attention',
    'What are the most common causes of auth errors in this app?',
    'How do I fix a Stripe webhook that isn\'t processing payments?',
    'Check if there are any security issues I should know about',
    'Why might users be getting logged out unexpectedly?',
    'How do I add a new Supabase table migration?',
  ];

  const formatMessage = (content: string) => {
    // Simple markdown-like formatting for code blocks and inline code
    const parts = content.split(/(```[\s\S]*?```|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const code = part.slice(3, -3).replace(/^\w+\n/, '');
        return (
          <pre key={i} className="bg-gray-100 border border-gray-200 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono text-green-700 whitespace-pre-wrap">
            {code}
          </pre>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="bg-gray-100 text-yellow-700 px-1.5 py-0.5 rounded text-xs font-mono">
            {part.slice(1, -1)}
          </code>
        );
      }
      // Handle **bold** and line breaks
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={i}>
          {boldParts.map((bp, j) => {
            if (bp.startsWith('**') && bp.endsWith('**')) {
              return <strong key={j} className="text-black font-bold">{bp.slice(2, -2)}</strong>;
            }
            return bp.split('\n').map((line, k, arr) => (
              <span key={k}>
                {line}
                {k < arr.length - 1 && <br />}
              </span>
            ));
          })}
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[600px]">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-gold-400/60" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <div>
          <h2 className="font-display text-lg font-700 text-black">CourtCraft AI Diagnostic Agent</h2>
          <p className="text-gray-500 text-sm">Powered by Claude — Ask anything about errors, fixes, or platform issues</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="ml-auto text-gray-400 hover:text-gray-600 text-xs transition-colors"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gold-500/10 border border-gold-500/15 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gold-400/60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm mb-6">Ask me about errors, fixes, or anything about the CourtCraft platform</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                    className="text-left bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-xl px-4 py-3 text-xs text-gray-600 hover:text-gray-800 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-gold-500/15 border border-gold-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-3.5 h-3.5 text-gold-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user' ? 'bg-gold-500/15 border border-gold-500/20 text-black rounded-tr-sm' :'bg-gray-100 border border-gray-200 text-black rounded-tl-sm'
              }`}>
                <div className="space-y-1">{formatMessage(msg.content)}</div>
                <p className="text-gray-400 text-xs mt-2">
                  {new Date(msg.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-1">
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-yellow-50 border border-yellow-200 flex items-center justify-center flex-shrink-0 mt-1">
                <svg className="w-3.5 h-3.5 text-yellow-600 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <div className="bg-gray-100 border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-5">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 0a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe an error or ask about a platform issue... (Enter to send, Shift+Enter for new line)"
              disabled={loading}
              rows={2}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-black placeholder-gray-400 resize-none focus:outline-none focus:border-yellow-400 transition-colors disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="flex-shrink-0 w-11 h-11 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-700 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Health Tab ───────────────────────────────────────────────────────────────
function HealthTab() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiMetrics, setApiMetrics] = useState<ApiMetric[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alertStatus, setAlertStatus] = useState<Record<string, string>>({});
  const [incidentBanner, setIncidentBanner] = useState<string | null>(null);
  const prevHealthRef = useRef<Record<string, string>>({});
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);

  const trackApiCall = useCallback(async (endpoint: string, method: string) => {
    const start = Date.now();
    try {
      const res = await fetch(endpoint, { method, credentials: 'include' });
      const latencyMs = Date.now() - start;
      const metric: ApiMetric = {
        endpoint,
        method,
        statusCode: res.status,
        latencyMs,
        timestamp: new Date().toISOString(),
        success: res.ok,
      };
      setApiMetrics((prev) => [metric, ...prev].slice(0, 50));
      return res;
    } catch (err: any) {
      const latencyMs = Date.now() - start;
      const metric: ApiMetric = {
        endpoint,
        method,
        statusCode: 0,
        latencyMs,
        timestamp: new Date().toISOString(),
        success: false,
      };
      setApiMetrics((prev) => [metric, ...prev].slice(0, 50));
      throw err;
    }
  }, []);

  const sendAlert = useCallback(async (service: ServiceHealthResult) => {
    const incidentId = generateIncidentId();
    setAlertStatus((prev) => ({ ...prev, [service.service]: 'sending' }));
    try {
      await fetch('/api/admin/health-alerts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: service.service,
          degradationType: service.status,
          incidentId,
          latencyMs: service.latencyMs,
          error: service.error,
          checkedAt: service.checkedAt,
        }),
      });
      setAlertStatus((prev) => ({ ...prev, [service.service]: 'sent' }));
      setIncidents((prev) => [
        { id: incidentId, service: service.service, type: service.status as 'down' | 'degraded', startedAt: service.checkedAt, alertSent: true },
        ...prev,
      ].slice(0, 20));
    } catch {
      setAlertStatus((prev) => ({ ...prev, [service.service]: 'failed' }));
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await trackApiCall('/api/health', 'GET');
      if (res.ok) {
        const data: HealthResponse = await res.json();
        setHealth(data);

        // Detect degradations and auto-send alerts
        data.services.forEach((svc) => {
          const prev = prevHealthRef.current[svc.service];
          if ((svc.status === 'down' || svc.status === 'degraded') && prev === 'healthy') {
            sendAlert(svc);
          }
          if (svc.status !== 'healthy') {
            setIncidentBanner(`${svc.service.charAt(0).toUpperCase() + svc.service.slice(1)} is currently ${svc.status}. Our team has been notified.`);
          }
        });

        const allHealthy = data.services.every((s) => s.status === 'healthy');
        if (allHealthy) setIncidentBanner(null);

        const newPrev: Record<string, string> = {};
        data.services.forEach((s) => { newPrev[s.service] = s.status; });
        prevHealthRef.current = newPrev;
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [trackApiCall, sendAlert]);

  // Track /api/admin/auth endpoint
  const trackAuthEndpoint = useCallback(async () => {
    await trackApiCall('/api/admin/auth', 'GET').catch(() => {});
  }, [trackApiCall]);

  useEffect(() => {
    fetchHealth();
    trackAuthEndpoint();
    autoRefreshRef.current = setInterval(fetchHealth, 60000); // auto-refresh every 60s
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [fetchHealth, trackAuthEndpoint]);

  const overallStatus = health?.overall ?? 'checking';
  const overallColors = {
    healthy: 'border-green-200 bg-green-50',
    degraded: 'border-yellow-200 bg-yellow-50',
    down: 'border-red-200 bg-red-50',
    checking: 'border-gray-200 bg-gray-50',
  };

  const serviceIcons: Record<string, string> = {
    anthropic: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    supabase: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V6a2 2 0 00-2-2H4a2 2 0 00-2 2v14a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    stripe: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  };

  const avgLatency = apiMetrics.length > 0
    ? Math.round(apiMetrics.reduce((s, m) => s + m.latencyMs, 0) / apiMetrics.length)
    : 0;
  const failureCount = apiMetrics.filter((m) => !m.success).length;
  const successRate = apiMetrics.length > 0
    ? Math.round((apiMetrics.filter((m) => m.success).length / apiMetrics.length) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Incident Banner */}
      {incidentBanner && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="text-red-700 text-sm font-bold mb-0.5">Active Incident</p>
            <p className="text-red-600 text-sm">{incidentBanner}</p>
          </div>
          <button onClick={() => setIncidentBanner(null)} className="text-red-400 hover:text-red-600 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Overall Status */}
      <div className={`rounded-2xl border p-6 ${overallColors[overallStatus as keyof typeof overallColors]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-1">Overall System Status</p>
              <div className="flex items-center gap-3">
                <ServiceStatusBadge status={overallStatus as any} />
                <span className="text-gray-400 text-xs">
                  {health ? `Last checked ${new Date(health.checkedAt).toLocaleTimeString('en-GB')}` : 'Checking...'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-gray-400 text-xs">Retry Queue</p>
              <p className="text-black font-bold text-lg">{health?.retryQueueDepth ?? 0}</p>
            </div>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 hover:text-black transition-all"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Check Now
            </button>
          </div>
        </div>
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {health ? (
          health.services.map((svc) => (
            <div key={svc.service} className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={serviceIcons[svc.service] || 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-black font-bold text-sm capitalize">{svc.service}</p>
                    <p className="text-gray-400 text-xs">{new Date(svc.checkedAt).toLocaleTimeString('en-GB')}</p>
                  </div>
                </div>
                <ServiceStatusBadge status={svc.status} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Latency</span>
                  <span className={`text-xs font-bold ${svc.latencyMs > 3000 ? 'text-red-600' : svc.latencyMs > 1000 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {svc.latencyMs}ms
                  </span>
                </div>
                {svc.statusCode && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs">Status Code</span>
                    <span className={`text-xs font-bold ${svc.statusCode >= 400 ? 'text-red-600' : 'text-green-600'}`}>{svc.statusCode}</span>
                  </div>
                )}
                {svc.error && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <p className="text-red-600 text-xs font-mono truncate">{svc.error}</p>
                  </div>
                )}
              </div>

              {/* Alert button */}
              {svc.status !== 'healthy' && (
                <button
                  onClick={() => sendAlert(svc)}
                  disabled={alertStatus[svc.service] === 'sending' || alertStatus[svc.service] === 'sent'}
                  className={`mt-4 w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                    alertStatus[svc.service] === 'sent' ? 'bg-green-100 border border-green-200 text-green-700'
                      : alertStatus[svc.service] === 'failed'? 'bg-red-100 border border-red-200 text-red-700' :'bg-yellow-50 border border-yellow-200 text-yellow-700 hover:bg-yellow-100'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {alertStatus[svc.service] === 'sending' ? 'Sending...' : alertStatus[svc.service] === 'sent' ? 'Alert Sent' : alertStatus[svc.service] === 'failed' ? 'Send Failed' : 'Send Alert'}
                </button>
              )}
            </div>
          ))
        ) : (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse">
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-3" />
              <div className="h-8 bg-gray-100 rounded w-1/3" />
            </div>
          ))
        )}
      </div>

      {/* API Metrics Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-2">Avg Latency</p>
          <p className={`font-display text-2xl font-700 ${avgLatency > 2000 ? 'text-red-600' : avgLatency > 800 ? 'text-yellow-600' : 'text-green-600'}`}>
            {avgLatency}ms
          </p>
          <p className="text-gray-400 text-xs mt-1">across {apiMetrics.length} calls</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-2">Success Rate</p>
          <p className={`font-display text-2xl font-700 ${successRate < 90 ? 'text-red-600' : successRate < 99 ? 'text-yellow-600' : 'text-green-600'}`}>
            {successRate}%
          </p>
          <p className="text-gray-400 text-xs mt-1">{failureCount} failures</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-gray-500 text-xs font-bold tracking-widest uppercase mb-2">Active Incidents</p>
          <p className={`font-display text-2xl font-700 ${incidents.filter((i) => !i.resolvedAt).length > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {incidents.filter((i) => !i.resolvedAt).length}
          </p>
          <p className="text-gray-400 text-xs mt-1">{incidents.length} total logged</p>
        </div>
      </div>

      {/* API Request Log */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-display text-lg font-700 text-black">API Request Monitor</h2>
          <span className="text-gray-400 text-xs">Live · auto-refreshes every 60s</span>
        </div>
        {apiMetrics.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">No requests tracked yet. Click &quot;Check Now&quot; to begin.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-bold tracking-widest uppercase text-gray-400">Endpoint</th>
                  <th className="text-left px-6 py-3 text-xs font-bold tracking-widest uppercase text-gray-400">Method</th>
                  <th className="text-left px-6 py-3 text-xs font-bold tracking-widest uppercase text-gray-400">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-bold tracking-widest uppercase text-gray-400">Latency</th>
                  <th className="text-left px-6 py-3 text-xs font-bold tracking-widest uppercase text-gray-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {apiMetrics.map((m, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-sm font-mono text-gray-600">{m.endpoint}</td>
                    <td className="px-6 py-3">
                      <span className="text-xs font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded">{m.method}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${m.success ? 'text-green-700 bg-green-100 border-green-200' : 'text-red-700 bg-red-100 border-red-200'}`}>
                        {m.statusCode || 'ERR'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`text-sm font-bold ${m.latencyMs > 3000 ? 'text-red-600' : m.latencyMs > 1000 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {m.latencyMs}ms
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-400">{new Date(m.timestamp).toLocaleTimeString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incident Log */}
      {incidents.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="font-display text-lg font-700 text-black">Incident Log</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {incidents.map((inc) => (
              <div key={inc.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <ServiceStatusDot status={inc.type} />
                  <div>
                    <p className="text-black text-sm font-bold capitalize">{inc.service} — {inc.type}</p>
                    <p className="text-gray-400 text-xs font-mono">{inc.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <p className="text-gray-400 text-xs">{new Date(inc.startedAt).toLocaleString('en-GB')}</p>
                    {inc.alertSent && (
                      <span className="text-green-600 text-xs">✓ Alert sent</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/data');
      if (res.status === 401) {
        router.replace('/admin/login');
        return;
      }
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || 'Failed to load data');
        return;
      }
      const json = await res.json();
      setData(json);
    } catch {
      setError('Network error. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.replace('/admin/login');
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { id: 'users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'subscriptions', label: 'Subscriptions', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { id: 'activity', label: 'Activity', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'health', label: 'Service Health', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
    { id: 'diagnostics', label: 'Diagnostics', icon: 'M9 3H5a2 2 0 00-2 2v4m6 0H9a2 2 0 01-2-2V9m0 0h18' },
    { id: 'ai-agent', label: 'AI Agent', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AppLogo />
          <h1 className="font-display text-xl font-700 text-black">Admin Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/admin/creative-studio"
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-700 rounded-xl transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Creative Studio
          </a>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4h3" />
            </svg>
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 p-2">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-7 gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-sm font-bold rounded-lg transition-all ${
                  tab === t.id
                    ? 'bg-gray-100 text-black border border-gray-200' :'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d={t.icon} />
                  </svg>
                  {t.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {/* Overview Tab */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Users" value={data?.stats.totalUsers ?? 0} sub="Active: 1,247" color="gold" />
                <StatCard label="Active Subscriptions" value={data?.stats.activeSubs ?? 0} sub="Trial: 156" color="green" />
                <StatCard label="Total Cases" value={data?.stats.totalCases ?? 0} sub="Open: 45,234" color="blue" />
                <StatCard label="Mckenzie Sessions" value={data?.stats.totalMckenzieSessions ?? 0} sub={`Revenue: £${data?.stats.mckenzieRevenuePence ?? 0}`} color="red" />
              </div>

              {/* Recent Users */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h3 className="font-display text-lg font-700 text-black mb-4">Recent Users</h3>
                <div className="space-y-3">
                  {data?.recentUsers.map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-black font-bold text-sm">{u.full_name}</p>
                          <p className="text-gray-400 text-xs">{u.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString('en-GB')}</p>
                        <StatusBadge status={u.is_active ? 'active' : 'cancelled'} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Subscriptions */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h3 className="font-display text-lg font-700 text-black mb-4">Recent Subscriptions</h3>
                <div className="space-y-3">
                  {data?.recentSubscriptions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-black font-bold text-sm">{s.user_id}</p>
                          <p className="text-gray-400 text-xs">{s.plan}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-xs">{new Date(s.created_at).toLocaleDateString('en-GB')}</p>
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {tab === 'users' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-700 text-black">User Management</h3>
                <div className="flex items-center gap-2">
                  <select className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl text-gray-700">
                    <option>All</option>
                    <option>Active</option>
                    <option>Inactive</option>
                    <option>Email Verified</option>
                    <option>Email Unverified</option>
                  </select>
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-700 rounded-xl transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Filter
                  </button>
                </div>
              </div>

              {/* Users List */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-6 py-3 text-xs font-bold tracking-widest uppercase text-gray-400">User</th>
                        <th className="text-left px-6 py-3 text-xs font-bold tracking-widest uppercase text-gray-400">Email</th>
                        <th className="text-left px-6 py-3 text-xs font-bold tracking-widest uppercase text-gray-400">Status</th>
                        <th className="text-left px-6 py-3 text-xs font-bold tracking-widest uppercase text-gray-400">Created</th>
                        <th className="text-left px-6 py-3 text-xs font-bold tracking-widest uppercase text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.recentUsers.map((u) => (
                        <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-black font-bold text-sm">{u.full_name}</p>
                                <p className="text-gray-400 text-xs">{u.is_active ? 'Active' : 'Inactive'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-black font-bold text-sm">{u.email}</p>
                            <p className="text-gray-400 text-xs">{u.email_verified ? 'Verified' : 'Unverified'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={u.is_active ? 'active' : 'cancelled'} />
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString('en-GB')}</p>
                          </td>
                          <td className="px-6 py-4">
                            <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-700 rounded-lg transition-all">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                              </svg>
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Subscriptions Tab */}
          {tab === 'subscriptions' && (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-700 text-black">Subscription Management</h3>
                <div className="flex items-center gap-2">
                  <select className="px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl text-gray-700">
                    <option>All</option>
                    <option>Active</option>
                    <option>Cancelled</option>
                    <option>Expired</option>
                    <option>Trialing</option>
                  </select>
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-700 rounded-xl transition-all">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Filter
                  </button>
                </div>
              </div>

              {/* Subscriptions List */}
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-6 py-3 text-xs font-bold tracking-widest uppercase text-gray-400">User</th>
                        <th className="text-left px-6 py-3 text-xs font-bold tracking-widest uppercase text-gray-400">Plan</th>
                        <th className="text-left px-6 py-3 text-xs font-bold tracking-widest uppercase text-gray-400">Status</th>
                        <th className="text-left px-6 py-3 text-xs font-bold tracking-widest uppercase text-gray-400">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.recentSubscriptions.map((s) => (
                        <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-gray-700">{s.user_id}</td>
                          <td className="px-6 py-4 text-sm text-gray-500 capitalize">{s.plan || 'monthly'}</td>
                          <td className="px-6 py-4"><StatusBadge status={s.status || 'pending'} /></td>
                          <td className="px-6 py-4 text-sm text-gray-400">{new Date(s.created_at).toLocaleDateString('en-GB')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {tab === 'activity' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard label="Total AI Interactions" value={data?.stats.totalAiInteractions ?? 0} color="blue" />
                <StatCard label="McKenzie Sessions" value={data?.stats.totalMckenzieSessions ?? 0} color="gold" />
                <StatCard label="Total Cases Filed" value={data?.stats.totalCases ?? 0} color="green" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h2 className="font-display text-lg font-700 text-black mb-5">Platform Activity Summary</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Total Registered Users', value: data?.stats.totalUsers ?? 0 },
                    { label: 'Email Verified Users', value: data?.stats.verifiedUsers ?? 0 },
                    { label: 'Active Subscriptions', value: data?.stats.activeSubs ?? 0 },
                    { label: 'Trial Subscriptions', value: data?.stats.trialSubs ?? 0 },
                    { label: 'Cancelled Subscriptions', value: data?.stats.cancelledSubs ?? 0 },
                    { label: 'Active Cases', value: data?.stats.activeCases ?? 0 },
                    { label: 'McKenzie Sessions', value: data?.stats.totalMckenzieSessions ?? 0 },
                    { label: 'McKenzie Revenue', value: `£${((data?.stats.mckenzieRevenuePence ?? 0) / 100).toFixed(2)}` },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-3 border-b border-gray-100">
                      <span className="text-gray-500 text-xs">{item.label}</span>
                      <span className="text-black font-bold text-sm">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Health Tab */}
          {tab === 'health' && <HealthTab />}

          {/* Diagnostics Tab */}
          {tab === 'diagnostics' && <DiagnosticsTab />}

          {/* AI Agent Tab */}
          {tab === 'ai-agent' && <AIAgentTab />}
        </div>
      </div>
    </div>
  );
}