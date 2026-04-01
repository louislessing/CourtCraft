'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import NotificationBell from '@/components/NotificationBell';
import BackButton from '@/components/ui/BackButton';

const sidebarLinks = [
  { icon: 'Squares2X2Icon', label: 'Dashboard', href: '/dashboard' },
  { icon: 'DocumentTextIcon', label: 'Document Builder', href: '/document-builder' },
  { icon: 'FolderOpenIcon', label: 'Case Management', href: '/case-management' },
  { icon: 'BookOpenIcon', label: 'Resources', href: '/resources' },
  { icon: 'UserCircleIcon', label: 'Profile', href: '/profile' },
  { icon: 'Cog6ToothIcon', label: 'Settings', href: '/settings', active: true },
];

type SettingsTab = 'account' | 'password' | 'notifications' | 'data';

interface AccountForm {
  fullName: string;
  email: string;
  phone: string;
  country: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationPrefs {
  courtDateReminders: boolean;
  documentUpdates: boolean;
  caseActivity: boolean;
  aiInsights: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
}

interface EmailFrequency {
  courtReminders: 'immediate' | 'daily' | 'weekly' | 'never';
  digest: 'daily' | 'weekly' | 'monthly' | 'never';
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, signOut, loading } = useAuth();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  const [accountForm, setAccountForm] = useState<AccountForm>({
    fullName: '',
    email: '',
    phone: '',
    country: 'GB',
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>({
    courtDateReminders: true,
    documentUpdates: true,
    caseActivity: true,
    aiInsights: false,
    marketingEmails: false,
    securityAlerts: true,
  });

  const [emailFreq, setEmailFreq] = useState<EmailFrequency>({
    courtReminders: 'immediate',
    digest: 'weekly',
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/sign-in');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setAccountForm({
        fullName: user.user_metadata?.full_name || profile?.full_name || '',
        email: user.email || '',
        phone: profile?.phone || '',
        country: user.user_metadata?.country || profile?.country || 'GB',
      });
    }
  }, [user, profile]);

  const showFeedback = (msg: string, isError = false) => {
    if (isError) {
      setSaveError(msg);
      setSaveSuccess('');
    } else {
      setSaveSuccess(msg);
      setSaveError('');
    }
    setTimeout(() => {
      setSaveSuccess('');
      setSaveError('');
    }, 4000);
  };

  const handleAccountSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: accountForm.fullName,
          country: accountForm.country,
        },
      });
      if (error) throw error;

      await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          full_name: accountForm.fullName,
          phone: accountForm.phone,
          country: accountForm.country,
        });

      showFeedback('Account details saved successfully.');
    } catch (err: any) {
      showFeedback(err.message || 'Failed to save account details.', true);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showFeedback('New passwords do not match.', true);
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      showFeedback('Password must be at least 8 characters.', true);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });
      if (error) throw error;
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showFeedback('Password updated successfully.');
    } catch (err: any) {
      showFeedback(err.message || 'Failed to update password.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleNotifSave = async () => {
    setSaving(true);
    try {
      await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          notification_preferences: notifPrefs,
          email_frequency: emailFreq,
        });
      showFeedback('Notification preferences saved.');
    } catch (err: any) {
      showFeedback(err.message || 'Failed to save preferences.', true);
    } finally {
      setSaving(false);
    }
  };

  const handleDataExport = async () => {
    setExportLoading(true);
    try {
      const [casesRes, docsRes] = await Promise.all([
        supabase.from('cases').select('*').eq('user_id', user.id),
        supabase.from('documents').select('*').eq('user_id', user.id),
      ]);

      // Fetch case-scoped data only for cases belonging to this user
      const caseIds = (casesRes.data || []).map((c: any) => c.id);

      const [timelineRes, financeRes, commsRes] = caseIds.length > 0
        ? await Promise.all([
            supabase.from('timeline_events').select('*').in('case_id', caseIds),
            supabase.from('finance_entries').select('*').in('case_id', caseIds),
            supabase.from('communications').select('*').in('case_id', caseIds),
          ])
        : [{ data: [] }, { data: [] }, { data: [] }];

      const exportData = {
        exportedAt: new Date().toISOString(),
        user: { email: user.email, id: user.id },
        cases: casesRes.data || [],
        documents: docsRes.data || [],
        timeline: timelineRes.data || [],
        finance: financeRes.data || [],
        communications: commsRes.data || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `courtcraft-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showFeedback('Data exported successfully.');
    } catch (err: any) {
      showFeedback('Export failed. Please try again.', true);
    } finally {
      setExportLoading(false);
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'account', label: 'Account Details', icon: 'UserCircleIcon' },
    { id: 'password', label: 'Password', icon: 'LockClosedIcon' },
    { id: 'notifications', label: 'Notifications', icon: 'BellIcon' },
    { id: 'data', label: 'Data & Export', icon: 'ArrowDownTrayIcon' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 glass-dark border-r border-white border-opacity-10 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:flex`}
      >
        <div className="p-6 border-b border-white border-opacity-10">
          <Link href="/homepage" className="flex items-center gap-3">
            <AppLogo size={32} iconName="ScaleIcon" className="text-gold-500" />
            <div className="flex flex-col">
              <span className="font-display font-900 text-base tracking-tight text-white leading-none">
                Court<span className="text-gold-500">Craft</span>
              </span>
              <span className="label-tag text-gold-500 opacity-70 leading-none" style={{ fontSize: '8px' }}>
                Advocate
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                link.active
                  ? 'bg-gold-500 bg-opacity-15 border border-gold-500 border-opacity-30 text-gold-400' :'text-white text-opacity-60 hover:text-white hover:bg-white hover:bg-opacity-5'
              }`}
            >
              <Icon name={link.icon} size={18} />
              <span className="font-display font-700 text-xs tracking-wide uppercase">{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white border-opacity-10">
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white text-opacity-50 hover:text-danger hover:bg-white hover:bg-opacity-5 transition-all duration-200"
          >
            <Icon name="ArrowRightOnRectangleIcon" size={18} />
            <span className="font-display font-700 text-xs tracking-wide uppercase">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 glass-navy border-b border-white border-opacity-10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden w-9 h-9 rounded-xl bg-navy-700 border border-navy-600 flex items-center justify-center text-white"
              onClick={() => setSidebarOpen(true)}
            >
              <Icon name="Bars3Icon" size={18} />
            </button>
            <div>
              <h1 className="font-display font-800 text-lg text-white leading-none">Settings</h1>
              <p className="text-white text-opacity-40 text-xs mt-0.5">Manage your account and preferences</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BackButton className="text-white/60 hover:text-gold-400" label="Back" />
            <NotificationBell />
            <div className="w-9 h-9 rounded-xl bg-gold-500 bg-opacity-20 border border-gold-500 border-opacity-30 flex items-center justify-center">
              <span className="font-display font-800 text-xs text-gold-400">
                {accountForm.fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full">
          {/* Feedback Banner */}
          {(saveSuccess || saveError) && (
            <div
              className={`mb-6 px-5 py-3 rounded-xl border text-sm font-display font-700 flex items-center gap-2 ${
                saveSuccess
                  ? 'bg-green-500 bg-opacity-10 border-green-500 border-opacity-30 text-green-400' :'bg-red-500 bg-opacity-10 border-red-500 border-opacity-30 text-red-400'
              }`}
            >
              <Icon name={saveSuccess ? 'CheckCircleIcon' : 'ExclamationCircleIcon'} size={16} />
              {saveSuccess || saveError}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-display font-700 text-xs tracking-wide uppercase whitespace-nowrap transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gold-500 bg-opacity-15 border-gold-500 border-opacity-40 text-gold-400' :'bg-navy-800 border-navy-600 text-white text-opacity-50 hover:text-white hover:border-navy-500'
                }`}
              >
                <Icon name={tab.icon} size={15} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── ACCOUNT DETAILS ── */}
          {activeTab === 'account' && (
            <div className="surface-card rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gold-500 bg-opacity-15 border border-gold-500 border-opacity-30 flex items-center justify-center">
                  <Icon name="UserCircleIcon" size={20} className="text-gold-400" />
                </div>
                <div>
                  <h2 className="font-display font-800 text-base text-white">Account Details</h2>
                  <p className="text-white text-opacity-40 text-xs">Update your personal information</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-display font-700 text-xs text-white text-opacity-60 uppercase tracking-widest mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={accountForm.fullName}
                    onChange={(e) => setAccountForm({ ...accountForm, fullName: e.target.value })}
                    className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold-500 transition-colors"
                    placeholder="Your full name"
                  />
                </div>

                <div>
                  <label className="block font-display font-700 text-xs text-white text-opacity-60 uppercase tracking-widest mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={accountForm.email}
                    disabled
                    className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-white text-opacity-40 text-sm cursor-not-allowed"
                    placeholder="your@email.com"
                  />
                  <p className="text-white text-opacity-30 text-xs mt-1.5">Email cannot be changed here</p>
                </div>

                <div>
                  <label className="block font-display font-700 text-xs text-white text-opacity-60 uppercase tracking-widest mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={accountForm.phone}
                    onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                    className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold-500 transition-colors"
                    placeholder="+44 7700 000000"
                  />
                </div>

                <div>
                  <label className="block font-display font-700 text-xs text-white text-opacity-60 uppercase tracking-widest mb-2">
                    Country
                  </label>
                  <select
                    value={accountForm.country}
                    onChange={(e) => setAccountForm({ ...accountForm, country: e.target.value })}
                    className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold-500 transition-colors"
                  >
                    <option value="GB">United Kingdom</option>
                    <option value="IE">Ireland</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="NZ">New Zealand</option>
                  </select>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handleAccountSave}
                  disabled={saving}
                  className="btn-gold text-xs py-3 px-8 disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    <>
                      <Icon name="CheckIcon" size={14} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── PASSWORD ── */}
          {activeTab === 'password' && (
            <div className="surface-card rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gold-500 bg-opacity-15 border border-gold-500 border-opacity-30 flex items-center justify-center">
                  <Icon name="LockClosedIcon" size={20} className="text-gold-400" />
                </div>
                <div>
                  <h2 className="font-display font-800 text-base text-white">Change Password</h2>
                  <p className="text-white text-opacity-40 text-xs">Keep your account secure with a strong password</p>
                </div>
              </div>

              <div className="max-w-md space-y-6">
                <div>
                  <label className="block font-display font-700 text-xs text-white text-opacity-60 uppercase tracking-widest mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold-500 transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block font-display font-700 text-xs text-white text-opacity-60 uppercase tracking-widest mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold-500 transition-colors"
                    placeholder="Min. 8 characters"
                  />
                </div>

                <div>
                  <label className="block font-display font-700 text-xs text-white text-opacity-60 uppercase tracking-widest mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-gold-500 transition-colors"
                    placeholder="••••••••"
                  />
                  {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                      <Icon name="ExclamationCircleIcon" size={12} />
                      Passwords do not match
                    </p>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-navy-900 border border-navy-600">
                  <p className="font-display font-700 text-xs text-white text-opacity-50 uppercase tracking-widest mb-2">Password requirements</p>
                  <ul className="space-y-1">
                    {[
                      { label: 'At least 8 characters', met: passwordForm.newPassword.length >= 8 },
                      { label: 'Contains a number', met: /\d/.test(passwordForm.newPassword) },
                      { label: 'Contains a special character', met: /[^a-zA-Z0-9]/.test(passwordForm.newPassword) },
                    ].map((req) => (
                      <li key={req.label} className={`flex items-center gap-2 text-xs ${req.met ? 'text-green-400' : 'text-white text-opacity-30'}`}>
                        <Icon name={req.met ? 'CheckCircleIcon' : 'MinusCircleIcon'} size={13} />
                        {req.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={handlePasswordChange}
                  disabled={saving || !passwordForm.newPassword}
                  className="btn-gold text-xs py-3 px-8 disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                      Updating…
                    </span>
                  ) : (
                    <>
                      <Icon name="LockClosedIcon" size={14} />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {/* Notification Toggles */}
              <div className="surface-card rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-gold-500 bg-opacity-15 border border-gold-500 border-opacity-30 flex items-center justify-center">
                    <Icon name="BellIcon" size={20} className="text-gold-400" />
                  </div>
                  <div>
                    <h2 className="font-display font-800 text-base text-white">Notification Preferences</h2>
                    <p className="text-white text-opacity-40 text-xs">Choose what you want to be notified about</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {([
                    { key: 'courtDateReminders', label: 'Court Date Reminders', desc: 'Get notified before upcoming hearings and deadlines' },
                    { key: 'documentUpdates', label: 'Document Updates', desc: 'Alerts when documents are created or modified' },
                    { key: 'caseActivity', label: 'Case Activity', desc: 'Updates on timeline events and case progress' },
                    { key: 'aiInsights', label: 'AI Insights', desc: 'Periodic AI-generated case analysis and suggestions' },
                    { key: 'securityAlerts', label: 'Security Alerts', desc: 'Login attempts and account security notifications' },
                    { key: 'marketingEmails', label: 'Product Updates', desc: 'News about new features and improvements' },
                  ] as { key: keyof NotificationPrefs; label: string; desc: string }[]).map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-4 rounded-xl bg-navy-900 border border-navy-600 hover:border-navy-500 transition-colors"
                    >
                      <div>
                        <p className="font-display font-700 text-sm text-white">{item.label}</p>
                        <p className="text-white text-opacity-40 text-xs mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifPrefs({ ...notifPrefs, [item.key]: !notifPrefs[item.key] })}
                        className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                          notifPrefs[item.key] ? 'bg-gold-500' : 'bg-navy-600'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${
                            notifPrefs[item.key] ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Email Frequency */}
              <div className="surface-card rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-gold-500 bg-opacity-15 border border-gold-500 border-opacity-30 flex items-center justify-center">
                    <Icon name="EnvelopeIcon" size={20} className="text-gold-400" />
                  </div>
                  <div>
                    <h2 className="font-display font-800 text-base text-white">Email Frequency</h2>
                    <p className="text-white text-opacity-40 text-xs">Control how often you receive emails</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-display font-700 text-xs text-white text-opacity-60 uppercase tracking-widest mb-3">
                      Court Date Reminders
                    </label>
                    <div className="space-y-2">
                      {(['immediate', 'daily', 'weekly', 'never'] as const).map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                            emailFreq.courtReminders === opt
                              ? 'border-gold-500 border-opacity-40 bg-gold-500 bg-opacity-10' :'border-navy-600 bg-navy-900 hover:border-navy-500'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              emailFreq.courtReminders === opt ? 'border-gold-500' : 'border-navy-500'
                            }`}
                          >
                            {emailFreq.courtReminders === opt && (
                              <div className="w-2 h-2 rounded-full bg-gold-500" />
                            )}
                          </div>
                          <input
                            type="radio"
                            className="hidden"
                            checked={emailFreq.courtReminders === opt}
                            onChange={() => setEmailFreq({ ...emailFreq, courtReminders: opt })}
                          />
                          <span className="font-display font-700 text-xs text-white capitalize">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-display font-700 text-xs text-white text-opacity-60 uppercase tracking-widest mb-3">
                      Activity Digest
                    </label>
                    <div className="space-y-2">
                      {(['daily', 'weekly', 'monthly', 'never'] as const).map((opt) => (
                        <label
                          key={opt}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                            emailFreq.digest === opt
                              ? 'border-gold-500 border-opacity-40 bg-gold-500 bg-opacity-10' :'border-navy-600 bg-navy-900 hover:border-navy-500'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                              emailFreq.digest === opt ? 'border-gold-500' : 'border-navy-500'
                            }`}
                          >
                            {emailFreq.digest === opt && (
                              <div className="w-2 h-2 rounded-full bg-gold-500" />
                            )}
                          </div>
                          <input
                            type="radio"
                            className="hidden"
                            checked={emailFreq.digest === opt}
                            onChange={() => setEmailFreq({ ...emailFreq, digest: opt })}
                          />
                          <span className="font-display font-700 text-xs text-white capitalize">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleNotifSave}
                  disabled={saving}
                  className="btn-gold text-xs py-3 px-8 disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    <>
                      <Icon name="CheckIcon" size={14} />
                      Save Preferences
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── DATA & EXPORT ── */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Export */}
              <div className="surface-card rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gold-500 bg-opacity-15 border border-gold-500 border-opacity-30 flex items-center justify-center">
                    <Icon name="ArrowDownTrayIcon" size={20} className="text-gold-400" />
                  </div>
                  <div>
                    <h2 className="font-display font-800 text-base text-white">Export Your Data</h2>
                    <p className="text-white text-opacity-40 text-xs">Download a complete copy of your CourtCraft Advocate data</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {[
                    { icon: 'FolderOpenIcon', label: 'Cases', desc: 'All case records and metadata' },
                    { icon: 'DocumentTextIcon', label: 'Documents', desc: 'Document builder history' },
                    { icon: 'ClockIcon', label: 'Timeline', desc: 'All timeline events' },
                    { icon: 'BanknotesIcon', label: 'Finance', desc: 'Income and expense entries' },
                    { icon: 'ChatBubbleLeftRightIcon', label: 'Communications', desc: 'Communication logs' },
                    { icon: 'UserCircleIcon', label: 'Profile', desc: 'Your account information' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-start gap-3 p-4 rounded-xl bg-navy-900 border border-navy-600">
                      <div className="w-8 h-8 rounded-lg bg-gold-500 bg-opacity-10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon name={item.icon} size={15} className="text-gold-400" />
                      </div>
                      <div>
                        <p className="font-display font-700 text-sm text-white">{item.label}</p>
                        <p className="text-white text-opacity-40 text-xs mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-navy-900 border border-navy-600 mb-6">
                  <p className="text-white text-opacity-50 text-xs leading-relaxed">
                    Your data will be exported as a <strong className="text-white text-opacity-70">JSON file</strong>. This includes all cases, documents, timeline events, finance entries, and communication logs associated with your account.
                  </p>
                </div>

                <button
                  onClick={handleDataExport}
                  disabled={exportLoading}
                  className="btn-gold text-xs py-3 px-8 disabled:opacity-50"
                >
                  {exportLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                      Preparing Export…
                    </span>
                  ) : (
                    <>
                      <Icon name="ArrowDownTrayIcon" size={14} />
                      Download My Data
                    </>
                  )}
                </button>
              </div>

              {/* Danger Zone */}
              <div className="rounded-2xl p-8 border border-red-500 border-opacity-20 bg-red-500 bg-opacity-5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-red-500 bg-opacity-15 border border-red-500 border-opacity-30 flex items-center justify-center">
                    <Icon name="ExclamationTriangleIcon" size={20} className="text-red-400" />
                  </div>
                  <div>
                    <h2 className="font-display font-800 text-base text-white">Danger Zone</h2>
                    <p className="text-white text-opacity-40 text-xs">Irreversible account actions</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-navy-900 border border-red-500 border-opacity-20">
                  <div>
                    <p className="font-display font-700 text-sm text-white">Delete Account</p>
                    <p className="text-white text-opacity-40 text-xs mt-0.5">Permanently delete your account and all associated data</p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                        signOut();
                      }
                    }}
                    className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl border border-red-500 border-opacity-40 text-red-400 font-display font-700 text-xs uppercase tracking-wide hover:bg-red-500 hover:bg-opacity-10 transition-all duration-200"
                  >
                    <Icon name="TrashIcon" size={14} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
