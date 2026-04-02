'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/AppIcon';
import toast from 'react-hot-toast';

interface ConsentPreferences {
  id?: string;
  analytics_consent: boolean;
  marketing_consent: boolean;
  functional_consent: boolean;
  essential_consent: boolean;
  cookie_consent: boolean;
  data_processing_consent: boolean;
  last_updated?: string;
}

interface GdprRequest {
  id: string;
  request_type: string;
  status: string;
  details?: string;
  created_at: string;
  completed_at?: string;
}

type GdprTab = 'overview' | 'consent' | 'access' | 'erasure' | 'rectification' | 'cookies' | 'requests';

const DATA_CATEGORIES = [
  { name: 'Account Information', items: ['Full name', 'Email address', 'Country'], purpose: 'Account management and authentication', legal_basis: 'Contract performance' },
  { name: 'Case Data', items: ['Case details', 'Court dates', 'Timeline events', 'Documents'], purpose: 'Providing legal case management services', legal_basis: 'Contract performance' },
  { name: 'Communication Logs', items: ['Contact logs', 'Communication records'], purpose: 'Case evidence tracking', legal_basis: 'Legitimate interest' },
  { name: 'Financial Records', items: ['Finance entries', 'Subscription data'], purpose: 'Billing and case cost tracking', legal_basis: 'Contract performance' },
  { name: 'AI Chat History', items: ['Chat messages', 'Legal queries'], purpose: 'AI assistant functionality and improvement', legal_basis: 'Consent' },
  { name: 'Usage Analytics', items: ['Login timestamps', 'Feature usage'], purpose: 'Service improvement', legal_basis: 'Legitimate interest' },
];

export default function GdprWidget() {
  const { user, profile } = useAuth();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<GdprTab>('overview');
  const [consent, setConsent] = useState<ConsentPreferences>({
    analytics_consent: false,
    marketing_consent: false,
    functional_consent: true,
    essential_consent: true,
    cookie_consent: false,
    data_processing_consent: true,
  });
  const [consentLoading, setConsentLoading] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);

  const [requests, setRequests] = useState<GdprRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const [erasureConfirm, setErasureConfirm] = useState('');
  const [erasureLoading, setErasureLoading] = useState(false);

  const [accessLoading, setAccessLoading] = useState(false);

  const [rectificationData, setRectificationData] = useState({
    full_name: profile?.full_name || '',
    email: user?.email || '',
    country: profile?.country || 'GB',
  });
  const [rectificationLoading, setRectificationLoading] = useState(false);

  const loadConsent = useCallback(async () => {
    if (!user) return;
    setConsentLoading(true);
    try {
      const { data } = await supabase
        .from('user_consent_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setConsent({
          id: data.id,
          analytics_consent: data.analytics_consent,
          marketing_consent: data.marketing_consent,
          functional_consent: data.functional_consent,
          essential_consent: data.essential_consent,
          cookie_consent: data.cookie_consent,
          data_processing_consent: data.data_processing_consent,
          last_updated: data.last_updated,
        });
      }
    } catch (err) {
      console.error('Consent load error:', err);
    } finally {
      setConsentLoading(false);
    }
  }, [user, supabase]);

  const loadRequests = useCallback(async () => {
    if (!user) return;
    setRequestsLoading(true);
    try {
      const { data } = await supabase
        .from('gdpr_requests')
        .select('id, request_type, status, details, created_at, completed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setRequests(data || []);
    } catch (err) {
      console.error('GDPR requests load error:', err);
    } finally {
      setRequestsLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (user) {
      loadConsent();
      loadRequests();
    }
  }, [user, loadConsent, loadRequests]);

  useEffect(() => {
    if (profile) {
      setRectificationData({
        full_name: profile.full_name || '',
        email: user?.email || '',
        country: profile.country || 'GB',
      });
    }
  }, [profile, user]);

  const handleSaveConsent = useCallback(async () => {
    if (!user) return;
    setSavingConsent(true);
    try {
      const payload = {
        user_id: user.id,
        analytics_consent: consent.analytics_consent,
        marketing_consent: consent.marketing_consent,
        functional_consent: consent.functional_consent,
        essential_consent: true,
        cookie_consent: consent.cookie_consent,
        data_processing_consent: consent.data_processing_consent,
      };

      const { error } = await supabase
        .from('user_consent_preferences')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;

      // Log GDPR request
      await supabase.from('gdpr_requests').insert({
        user_id: user.id,
        request_type: 'consent_update',
        status: 'completed',
        details: 'User updated consent preferences',
        completed_at: new Date().toISOString(),
      });

      // Send email confirmation
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'gdpr_consent_update',
          to: user.email,
          fullName: profile?.full_name || user.email,
          consentSummary: JSON.stringify({
            analytics: consent.analytics_consent,
            marketing: consent.marketing_consent,
            cookies: consent.cookie_consent,
          }),
        },
      });

      toast.success('Consent preferences saved');
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save consent');
    } finally {
      setSavingConsent(false);
    }
  }, [user, supabase, consent, profile, loadRequests]);

  const handleDownloadData = useCallback(async () => {
    if (!user) return;
    setAccessLoading(true);
    try {
      // Gather all user data
      const [profileRes, casesRes, documentsRes, chatRes, financeRes, contactLogsRes, timelineRes, consentRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('cases').select('*').eq('user_id', user.id),
        supabase.from('documents').select('id, title, template_name, status, created_at').eq('user_id', user.id),
        supabase.from('chat_messages').select('role, content, created_at').eq('user_id', user.id).limit(500),
        supabase.from('finance_entries').select('*').eq('user_id', user.id),
        supabase.from('contact_logs').select('*').eq('user_id', user.id),
        supabase.from('timeline_events').select('*').eq('user_id', user.id),
        supabase.from('user_consent_preferences').select('*').eq('user_id', user.id).maybeSingle(),
      ]);

      const exportData = {
        export_date: new Date().toISOString(),
        export_version: '1.0',
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          profile: profileRes.data,
        },
        cases: casesRes.data || [],
        documents: documentsRes.data || [],
        chat_history: chatRes.data || [],
        finance_entries: financeRes.data || [],
        contact_logs: contactLogsRes.data || [],
        timeline_events: timelineRes.data || [],
        consent_preferences: consentRes.data,
      };

      // Log the access request
      await supabase.from('gdpr_requests').insert({
        user_id: user.id,
        request_type: 'access',
        status: 'completed',
        details: 'User downloaded personal data export',
        completed_at: new Date().toISOString(),
      });

      // Send email confirmation
      await supabase.functions.invoke('send-email', {
        body: {
          type: 'gdpr_data_access',
          to: user.email,
          fullName: profile?.full_name || user.email,
        },
      });

      // Trigger download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `courtcraft-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Data export downloaded');
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to export data');
    } finally {
      setAccessLoading(false);
    }
  }, [user, supabase, profile, loadRequests]);

  const handleErasureRequest = useCallback(async () => {
    if (!user || erasureConfirm !== 'DELETE MY ACCOUNT') return;
    setErasureLoading(true);
    try {
      await supabase.from('gdpr_requests').insert({
        user_id: user.id,
        request_type: 'erasure',
        status: 'pending',
        details: 'User submitted account and data deletion request',
      });

      await supabase.functions.invoke('send-email', {
        body: {
          type: 'gdpr_erasure_request',
          to: user.email,
          fullName: profile?.full_name || user.email,
        },
      });

      toast.success('Deletion request submitted. Our team will process it within 30 days.');
      setErasureConfirm('');
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit deletion request');
    } finally {
      setErasureLoading(false);
    }
  }, [user, supabase, erasureConfirm, profile, loadRequests]);

  const handleRectification = useCallback(async () => {
    if (!user) return;
    setRectificationLoading(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: rectificationData.full_name.trim(),
          country: rectificationData.country,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await supabase.from('gdpr_requests').insert({
        user_id: user.id,
        request_type: 'rectification',
        status: 'completed',
        details: 'User updated personal details via right to rectification',
        rectification_data: rectificationData,
        completed_at: new Date().toISOString(),
      });

      await supabase.functions.invoke('send-email', {
        body: {
          type: 'gdpr_rectification',
          to: user.email,
          fullName: rectificationData.full_name || user.email,
        },
      });

      toast.success('Personal details updated');
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update details');
    } finally {
      setRectificationLoading(false);
    }
  }, [user, supabase, rectificationData, loadRequests]);

  const tabs: { id: GdprTab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: 'ShieldCheckIcon' },
    { id: 'consent', label: 'Consent', icon: 'CheckCircleIcon' },
    { id: 'access', label: 'My Data', icon: 'ArrowDownTrayIcon' },
    { id: 'rectification', label: 'Update Info', icon: 'PencilSquareIcon' },
    { id: 'erasure', label: 'Delete', icon: 'TrashIcon' },
    { id: 'cookies', label: 'Cookies', icon: 'CakeIcon' },
    { id: 'requests', label: 'History', icon: 'ClockIcon' },
  ];

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 bg-green-400 bg-opacity-10';
      case 'pending': return 'text-yellow-400 bg-yellow-400 bg-opacity-10';
      case 'in_progress': return 'text-blue-400 bg-blue-400 bg-opacity-10';
      case 'rejected': return 'text-red-400 bg-red-400 bg-opacity-10';
      default: return 'text-white text-opacity-40 bg-white bg-opacity-5';
    }
  };

  const requestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      access: 'Data Access',
      erasure: 'Account Deletion',
      rectification: 'Data Correction',
      consent_update: 'Consent Update',
      portability: 'Data Portability',
      restriction: 'Processing Restriction',
      objection: 'Processing Objection',
    };
    return labels[type] || type;
  };

  const ConsentToggle = ({ label, description, value, onChange, disabled = false }: {
    label: string;
    description: string;
    value: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
  }) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-navy-700 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-display font-600 text-white">{label}</p>
        <p className="text-xs text-white text-opacity-45 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${value ? 'bg-gold-500' : 'bg-navy-600'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );

  return (
    <div id="gdpr-compliance" className="surface-card rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-navy-700 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gold-500 bg-opacity-10 flex items-center justify-center flex-shrink-0">
          <Icon name="ShieldCheckIcon" size={18} className="text-gold-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-700 text-white text-sm leading-tight">GDPR Compliance Centre</h3>
          <p className="text-white text-opacity-40 mt-0.5" style={{ fontSize: '10px' }}>
            Manage your data rights under UK GDPR & Data Protection Act 2018
          </p>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-green-500 bg-opacity-10 text-green-400 font-700 uppercase tracking-wider flex-shrink-0" style={{ fontSize: '9px' }}>
          GDPR Active
        </span>
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b border-navy-700 px-2 gap-0.5 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-600 whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-gold-400 border-gold-400' :'text-white text-opacity-40 border-transparent hover:text-opacity-70'
            }`}
          >
            <Icon name={tab.icon as any} size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="rounded-xl bg-navy-800 border border-gold-500 border-opacity-15 p-4">
              <div className="flex items-start gap-3">
                <Icon name="InformationCircleIcon" size={18} className="text-gold-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-display font-600 text-white mb-1">Your Data Rights</p>
                  <p className="text-xs text-white text-opacity-55 leading-relaxed">
                    Under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018, you have the right to access, correct, delete, and control how your personal data is used. CourtCraft Advocate Advocate is committed to protecting your privacy.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: 'ArrowDownTrayIcon', title: 'Right to Access', desc: 'Download all your personal data as a JSON export', tab: 'access' as GdprTab, color: 'text-blue-400', bg: 'bg-blue-500' },
                { icon: 'PencilSquareIcon', title: 'Right to Rectification', desc: 'Correct inaccurate personal information', tab: 'rectification' as GdprTab, color: 'text-purple-400', bg: 'bg-purple-500' },
                { icon: 'TrashIcon', title: 'Right to Erasure', desc: 'Request deletion of your account and all data', tab: 'erasure' as GdprTab, color: 'text-red-400', bg: 'bg-red-500' },
                { icon: 'CheckCircleIcon', title: 'Consent Management', desc: 'View and update your data processing preferences', tab: 'consent' as GdprTab, color: 'text-green-400', bg: 'bg-green-500' },
              ].map((item) => (
                <button
                  key={item.title}
                  onClick={() => setActiveTab(item.tab)}
                  className="flex items-start gap-3 p-4 rounded-xl bg-navy-800 border border-white border-opacity-5 hover:border-opacity-10 transition-all text-left group"
                >
                  <div className={`w-9 h-9 rounded-lg ${item.bg} bg-opacity-10 flex items-center justify-center flex-shrink-0 group-hover:bg-opacity-15 transition-all`}>
                    <Icon name={item.icon as any} size={16} className={item.color} />
                  </div>
                  <div>
                    <p className="text-sm font-display font-600 text-white leading-tight">{item.title}</p>
                    <p className="text-xs text-white text-opacity-45 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <div>
              <h4 className="text-xs font-display font-700 text-white text-opacity-60 uppercase tracking-wider mb-3">Data We Store & Why</h4>
              <div className="space-y-2">
                {DATA_CATEGORIES.map((cat) => (
                  <div key={cat.name} className="rounded-xl bg-navy-800 p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-display font-600 text-white">{cat.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gold-500 bg-opacity-10 text-gold-400">{cat.legal_basis}</span>
                    </div>
                    <p className="text-xs text-white text-opacity-45 mb-1.5">{cat.purpose}</p>
                    <div className="flex flex-wrap gap-1">
                      {cat.items.map((item) => (
                        <span key={item} className="text-xs px-2 py-0.5 rounded-full bg-navy-700 text-white text-opacity-50">{item}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Consent Management ── */}
        {activeTab === 'consent' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-navy-800 border border-navy-600 p-4">
              <p className="text-xs text-white text-opacity-55 leading-relaxed">
                Manage how CourtCraft Advocate processes your personal data. Essential and functional cookies are required for the service to operate. You can withdraw consent at any time.
              </p>
              {consent.last_updated && (
                <p className="text-xs text-white text-opacity-30 mt-2">
                  Last updated: {new Date(consent.last_updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>

            {consentLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 rounded-xl bg-navy-800 animate-pulse" />)}
              </div>
            ) : (
              <div className="rounded-xl bg-navy-800 border border-navy-600 px-4 divide-y divide-navy-700">
                <ConsentToggle
                  label="Essential Processing"
                  description="Required for account management, authentication, and core service delivery. Cannot be disabled."
                  value={true}
                  onChange={() => {}}
                  disabled
                />
                <ConsentToggle
                  label="Functional Preferences"
                  description="Remembers your settings, preferences, and customisations to improve your experience."
                  value={consent.functional_consent}
                  onChange={(v) => setConsent((p) => ({ ...p, functional_consent: v }))}
                />
                <ConsentToggle
                  label="Analytics & Performance"
                  description="Helps us understand how you use CourtCraft Advocate to improve features and fix issues."
                  value={consent.analytics_consent}
                  onChange={(v) => setConsent((p) => ({ ...p, analytics_consent: v }))}
                />
                <ConsentToggle
                  label="Marketing Communications"
                  description="Receive updates about new features, legal guides, and service announcements."
                  value={consent.marketing_consent}
                  onChange={(v) => setConsent((p) => ({ ...p, marketing_consent: v }))}
                />
                <ConsentToggle
                  label="Data Processing for AI"
                  description="Allow your case data to be processed by our AI assistant to provide personalised legal guidance."
                  value={consent.data_processing_consent}
                  onChange={(v) => setConsent((p) => ({ ...p, data_processing_consent: v }))}
                />
              </div>
            )}

            <button
              onClick={handleSaveConsent}
              disabled={savingConsent || consentLoading}
              className="btn-gold text-xs py-2.5 px-5 w-full justify-center disabled:opacity-50"
            >
              {savingConsent ? (
                <><span className="w-3.5 h-3.5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" /> Saving…</>
              ) : (
                <><Icon name="CheckIcon" size={14} className="text-navy-900" /> Save Consent Preferences</>
              )}
            </button>
          </div>
        )}

        {/* ── Right to Access ── */}
        {activeTab === 'access' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-navy-800 border border-blue-500 border-opacity-20 p-4">
              <div className="flex items-start gap-3">
                <Icon name="ArrowDownTrayIcon" size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-display font-600 text-white mb-1">Right to Data Portability</p>
                  <p className="text-xs text-white text-opacity-55 leading-relaxed">
                    Under Article 20 of the UK GDPR, you have the right to receive all personal data we hold about you in a structured, machine-readable format. Your export will include all case data, documents, chat history, and account information.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-navy-800 border border-navy-600 p-4">
              <h4 className="text-xs font-display font-700 text-white text-opacity-60 uppercase tracking-wider mb-3">Your export will include:</h4>
              <div className="grid grid-cols-2 gap-2">
                {['Account profile', 'Case details', 'Court dates', 'Documents', 'Chat history', 'Finance entries', 'Contact logs', 'Timeline events', 'Consent history', 'File metadata'].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <Icon name="CheckCircleIcon" size={13} className="text-green-400 flex-shrink-0" />
                    <span className="text-xs text-white text-opacity-60">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleDownloadData}
              disabled={accessLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-blue-500 bg-opacity-15 border border-blue-500 border-opacity-30 text-blue-400 font-display font-600 text-sm hover:bg-opacity-20 transition-all disabled:opacity-50"
            >
              {accessLoading ? (
                <><span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> Preparing export…</>
              ) : (
                <><Icon name="ArrowDownTrayIcon" size={16} /> Download My Data (JSON)</>
              )}
            </button>

            <p className="text-xs text-white text-opacity-30 text-center">
              A confirmation email will be sent to {user?.email} when your export is ready.
            </p>
          </div>
        )}

        {/* ── Right to Rectification ── */}
        {activeTab === 'rectification' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-navy-800 border border-purple-500 border-opacity-20 p-4">
              <div className="flex items-start gap-3">
                <Icon name="PencilSquareIcon" size={18} className="text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-display font-600 text-white mb-1">Right to Rectification</p>
                  <p className="text-xs text-white text-opacity-55 leading-relaxed">
                    Under Article 16 of the UK GDPR, you have the right to have inaccurate personal data corrected. Update your personal details below.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-display font-600 text-white text-opacity-60 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={rectificationData.full_name}
                  onChange={(e) => setRectificationData((p) => ({ ...p, full_name: e.target.value }))}
                  className="input-navy text-sm py-2.5 w-full"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-xs font-display font-600 text-white text-opacity-60 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={rectificationData.email}
                  disabled
                  className="input-navy text-sm py-2.5 w-full opacity-50 cursor-not-allowed"
                  placeholder="Email cannot be changed here"
                />
                <p className="text-xs text-white text-opacity-30 mt-1">Email changes require identity verification via account settings.</p>
              </div>
              <div>
                <label className="block text-xs font-display font-600 text-white text-opacity-60 mb-1.5">Country</label>
                <select
                  value={rectificationData.country}
                  onChange={(e) => setRectificationData((p) => ({ ...p, country: e.target.value }))}
                  className="input-navy text-sm py-2.5 w-full"
                >
                  <option value="GB">United Kingdom</option>
                  <option value="IE">Ireland</option>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="AU">Australia</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRectification}
              disabled={rectificationLoading || !rectificationData.full_name.trim()}
              className="btn-gold text-xs py-2.5 px-5 w-full justify-center disabled:opacity-50"
            >
              {rectificationLoading ? (
                <><span className="w-3.5 h-3.5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" /> Updating…</>
              ) : (
                <><Icon name="CheckIcon" size={14} className="text-navy-900" /> Update Personal Details</>
              )}
            </button>
          </div>
        )}

        {/* ── Right to Erasure ── */}
        {activeTab === 'erasure' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-500 bg-opacity-10 border border-red-500 border-opacity-25 p-4">
              <div className="flex items-start gap-3">
                <Icon name="ExclamationTriangleIcon" size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-display font-700 text-red-400 mb-1">Right to Erasure — Irreversible Action</p>
                  <p className="text-xs text-white text-opacity-55 leading-relaxed">
                    Under Article 17 of the UK GDPR, you may request deletion of your account and all associated data. This action is permanent and cannot be undone. All case data, documents, and chat history will be permanently deleted within 30 days.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-navy-800 border border-navy-600 p-4 space-y-2">
              <p className="text-xs font-display font-700 text-white text-opacity-60 uppercase tracking-wider">What will be deleted:</p>
              {['Your account and profile', 'All case files and documents', 'Court dates and timeline events', 'Finance entries and records', 'Communication logs', 'AI chat history', 'Uploaded files and documents', 'Subscription data (cancellation required separately)'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Icon name="XCircleIcon" size={13} className="text-red-400 flex-shrink-0" />
                  <span className="text-xs text-white text-opacity-55">{item}</span>
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs font-display font-600 text-white text-opacity-60 mb-1.5">
                Type <span className="text-red-400 font-700">DELETE MY ACCOUNT</span> to confirm
              </label>
              <input
                type="text"
                value={erasureConfirm}
                onChange={(e) => setErasureConfirm(e.target.value)}
                className="input-navy text-sm py-2.5 w-full border-red-500 border-opacity-30"
                placeholder="DELETE MY ACCOUNT"
              />
            </div>

            <button
              onClick={handleErasureRequest}
              disabled={erasureLoading || erasureConfirm !== 'DELETE MY ACCOUNT'}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-red-500 bg-opacity-15 border border-red-500 border-opacity-30 text-red-400 font-display font-600 text-sm hover:bg-opacity-20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {erasureLoading ? (
                <><span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" /> Submitting request…</>
              ) : (
                <><Icon name="TrashIcon" size={16} /> Submit Deletion Request</>
              )}
            </button>

            <p className="text-xs text-white text-opacity-30 text-center">
              A confirmation email will be sent to {user?.email}. Our team will process your request within 30 days as required by UK GDPR.
            </p>
          </div>
        )}

        {/* ── Cookie Preferences ── */}
        {activeTab === 'cookies' && (
          <div className="space-y-4">
            <div className="rounded-xl bg-navy-800 border border-navy-600 p-4">
              <div className="flex items-start gap-3">
                <Icon name="CakeIcon" size={18} className="text-gold-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-display font-600 text-white mb-1">Cookie Consent Preferences</p>
                  <p className="text-xs text-white text-opacity-55 leading-relaxed">
                    We use cookies and similar technologies to operate our service. You can manage your cookie preferences below. Essential cookies cannot be disabled as they are required for the service to function.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { key: 'essential', label: 'Essential Cookies', desc: 'Authentication, session management, security. Required for the service to function.', value: true, disabled: true },
                { key: 'functional', label: 'Functional Cookies', desc: 'Remember your preferences, settings, and customisations between sessions.', value: consent.functional_consent, disabled: false },
                { key: 'analytics', label: 'Analytics Cookies', desc: 'Help us understand usage patterns to improve the service (e.g. Google Analytics).', value: consent.analytics_consent, disabled: false },
                { key: 'cookie_consent', label: 'Third-Party Cookies', desc: 'Cookies set by third-party services integrated with CourtCraft Advocate.', value: consent.cookie_consent, disabled: false },
              ].map((item) => (
                <div key={item.key} className="rounded-xl bg-navy-800 border border-navy-600 px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-display font-600 text-white">{item.label}</p>
                        {item.disabled && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gold-500 bg-opacity-10 text-gold-400">Required</span>
                        )}
                      </div>
                      <p className="text-xs text-white text-opacity-45 leading-relaxed">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => {
                        if (item.disabled) return;
                        if (item.key === 'functional') setConsent((p) => ({ ...p, functional_consent: !p.functional_consent }));
                        if (item.key === 'analytics') setConsent((p) => ({ ...p, analytics_consent: !p.analytics_consent }));
                        if (item.key === 'cookie_consent') setConsent((p) => ({ ...p, cookie_consent: !p.cookie_consent }));
                      }}
                      disabled={item.disabled}
                      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${item.value ? 'bg-gold-500' : 'bg-navy-600'} ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${item.value ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveConsent}
              disabled={savingConsent}
              className="btn-gold text-xs py-2.5 px-5 w-full justify-center disabled:opacity-50"
            >
              {savingConsent ? (
                <><span className="w-3.5 h-3.5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" /> Saving…</>
              ) : (
                <><Icon name="CheckIcon" size={14} className="text-navy-900" /> Save Cookie Preferences</>
              )}
            </button>
          </div>
        )}

        {/* ── Request History ── */}
        {activeTab === 'requests' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white text-opacity-50">Your GDPR request history</p>
              <button onClick={loadRequests} className="text-xs text-gold-400 hover:text-gold-300 transition-colors">
                Refresh
              </button>
            </div>

            {requestsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-navy-800 animate-pulse" />)}
              </div>
            ) : requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-xl bg-navy-800 flex items-center justify-center mb-3">
                  <Icon name="ClockIcon" size={22} className="text-white opacity-20" />
                </div>
                <p className="text-sm text-white text-opacity-40">No GDPR requests yet</p>
                <p className="text-xs text-white text-opacity-25 mt-1">Your request history will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {requests.map((req) => (
                  <div key={req.id} className="rounded-xl bg-navy-800 border border-navy-600 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-display font-600 text-white leading-tight">{requestTypeLabel(req.request_type)}</p>
                        {req.details && (
                          <p className="text-xs text-white text-opacity-45 mt-0.5 truncate">{req.details}</p>
                        )}
                        <p className="text-xs text-white text-opacity-30 mt-1">
                          {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-600 capitalize ${statusColor(req.status)}`}>
                        {req.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
