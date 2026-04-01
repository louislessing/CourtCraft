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
  { icon: 'UserCircleIcon', label: 'Profile', href: '/profile', active: true },
  { icon: 'Cog6ToothIcon', label: 'Settings', href: '/settings' },
];

type ProfileTab = 'account' | 'password' | 'notifications' | 'integrations';

interface AccountForm {
  fullName: string;
  displayName: string;
  email: string;
  phone: string;
  country: string;
  bio: string;
}

interface PasswordForm {
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
  emailDigest: boolean;
}

interface SubscriptionData {
  status: string;
  amount: number;
  currency: string;
  trial_end: string | null;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, signOut, loading } = useAuth();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<ProfileTab>('account');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  const [accountForm, setAccountForm] = useState<AccountForm>({
    fullName: '',
    displayName: '',
    email: '',
    phone: '',
    country: 'GB',
    bio: '',
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
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
    emailDigest: true,
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
        displayName: profile?.full_name?.split(' ')[0] || user.user_metadata?.full_name?.split(' ')[0] || '',
        email: user.email || '',
        phone: profile?.phone || '',
        country: user.user_metadata?.country || profile?.country || 'GB',
        bio: profile?.bio || '',
      });

      if (profile?.notification_preferences) {
        setNotifPrefs((prev) => ({ ...prev, ...profile.notification_preferences }));
      }
    }
  }, [user, profile]);

  useEffect(() => {
    if (user) {
      loadSubscription();
    }
  }, [user]);

  const loadSubscription = async () => {
    setSubLoading(true);
    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('status, amount, currency, trial_end, current_period_end, stripe_subscription_id')
        .eq('user_id', user.id)
        .maybeSingle();
      setSubscription(data);
    } catch {
      setSubscription(null);
    } finally {
      setSubLoading(false);
    }
  };

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

      await supabase.from('user_profiles').upsert({
        id: user.id,
        full_name: accountForm.fullName,
        phone: accountForm.phone,
        country: accountForm.country,
      });

      showFeedback('Profile updated successfully.');
    } catch (err: any) {
      showFeedback(err.message || 'Failed to save profile.', true);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showFeedback('Passwords do not match.', true);
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      showFeedback('Password must be at least 8 characters.', true);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
      if (error) throw error;
      setPasswordForm({ newPassword: '', confirmPassword: '' });
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
      await supabase.from('user_profiles').upsert({
        id: user.id,
        notification_preferences: notifPrefs,
      });
      showFeedback('Notification preferences saved.');
    } catch (err: any) {
      showFeedback(err.message || 'Failed to save preferences.', true);
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    const name = accountForm.fullName || accountForm.email || '';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-500 bg-opacity-10 border-green-500 border-opacity-30';
      case 'trialing': return 'text-blue-400 bg-blue-500 bg-opacity-10 border-blue-500 border-opacity-30';
      case 'past_due': return 'text-yellow-400 bg-yellow-500 bg-opacity-10 border-yellow-500 border-opacity-30';
      case 'canceled': return 'text-red-400 bg-red-500 bg-opacity-10 border-red-500 border-opacity-30';
      default: return 'text-white text-opacity-40 bg-white bg-opacity-5 border-white border-opacity-10';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const tabs: { id: ProfileTab; label: string; icon: string }[] = [
    { id: 'account', label: 'Account', icon: 'UserCircleIcon' },
    { id: 'password', label: 'Password', icon: 'LockClosedIcon' },
    { id: 'notifications', label: 'Notifications', icon: 'BellIcon' },
    { id: 'integrations', label: 'Integrations', icon: 'PuzzlePieceIcon' },
  ];

  const notifToggles: { key: keyof NotificationPrefs; label: string; desc: string; icon: string }[] = [
    { key: 'courtDateReminders', label: 'Court Date Reminders', desc: 'Get notified before upcoming hearings', icon: 'CalendarDaysIcon' },
    { key: 'documentUpdates', label: 'Document Updates', desc: 'Alerts when documents are modified', icon: 'DocumentTextIcon' },
    { key: 'caseActivity', label: 'Case Activity', desc: 'Updates on your active cases', icon: 'FolderOpenIcon' },
    { key: 'aiInsights', label: 'AI Insights', desc: 'Periodic AI-generated case insights', icon: 'SparklesIcon' },
    { key: 'securityAlerts', label: 'Security Alerts', desc: 'Login and account security notifications', icon: 'ShieldCheckIcon' },
    { key: 'emailDigest', label: 'Weekly Digest', desc: 'Weekly summary of your case activity', icon: 'EnvelopeIcon' },
    { key: 'marketingEmails', label: 'Product Updates', desc: 'News and feature announcements', icon: 'MegaphoneIcon' },
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
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-white text-opacity-50 hover:text-red-400 hover:bg-white hover:bg-opacity-5 transition-all duration-200"
          >
            <Icon name="ArrowRightOnRectangleIcon" size={18} />
            <span className="font-display font-700 text-xs tracking-wide uppercase">Sign Out</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden" onClick={() => setSidebarOpen(false)} />
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
              <h1 className="font-display font-800 text-lg text-white leading-none">My Profile</h1>
              <p className="text-white text-opacity-40 text-xs mt-0.5">Manage your account and preferences</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BackButton className="text-white/60 hover:text-gold-400" label="Back" />
            <NotificationBell />
            <div className="w-9 h-9 rounded-xl bg-gold-500 bg-opacity-20 border border-gold-500 border-opacity-60 flex items-center justify-center">
              <span className="font-display font-800 text-xs text-gold-600">{getInitials()}</span>
            </div>
          </div>
        </header>

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

          {/* Profile Hero */}
          <div className="surface-card rounded-2xl p-6 mb-6 flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gold-500 bg-opacity-20 border-2 border-gold-500 border-opacity-60 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-900 text-2xl text-gold-600">{getInitials()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display font-800 text-xl text-white truncate">
                {accountForm.fullName || 'Your Name'}
              </h2>
              <p className="text-white text-opacity-50 text-sm mt-0.5 truncate">{accountForm.email}</p>
              <div className="flex items-center gap-2 mt-2">
                {profile?.email_verified ? (
                  <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500 bg-opacity-10 border border-green-500 border-opacity-30 px-2 py-0.5 rounded-full">
                    <Icon name="CheckBadgeIcon" size={12} />
                    Verified
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500 bg-opacity-10 border border-yellow-500 border-opacity-30 px-2 py-0.5 rounded-full">
                    <Icon name="ExclamationTriangleIcon" size={12} />
                    Unverified
                  </span>
                )}
                <span className="text-xs text-white text-opacity-30">
                  Member since {user?.created_at ? formatDate(user.created_at) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

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

          {/* ── ACCOUNT ── */}
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
                  <div className="relative">
                    <input
                      type="email"
                      value={accountForm.email}
                      disabled
                      className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-white text-opacity-40 text-sm cursor-not-allowed pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {profile?.email_verified ? (
                        <Icon name="CheckBadgeIcon" size={16} className="text-green-400" />
                      ) : (
                        <Icon name="ExclamationTriangleIcon" size={16} className="text-yellow-400" />
                      )}
                    </div>
                  </div>
                  <p className="text-white text-opacity-30 text-xs mt-1.5">Email is managed via authentication</p>
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
                    <span className="flex items-center gap-2">
                      <Icon name="CheckIcon" size={14} />
                      Save Changes
                    </span>
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
                    placeholder="Repeat new password"
                  />
                  {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                      <Icon name="ExclamationCircleIcon" size={12} />
                      Passwords do not match
                    </p>
                  )}
                </div>

                {/* Password strength */}
                {passwordForm.newPassword && (
                  <div>
                    <p className="font-display font-700 text-xs text-white text-opacity-60 uppercase tracking-widest mb-2">
                      Password Strength
                    </p>
                    <div className="flex gap-1">
                      {[8, 12, 16, 20].map((len, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            passwordForm.newPassword.length >= len
                              ? i < 1 ? 'bg-red-400' : i < 2 ? 'bg-yellow-400' : i < 3 ? 'bg-blue-400' : 'bg-green-400' :'bg-white bg-opacity-10'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-white text-opacity-30 text-xs mt-1">
                      {passwordForm.newPassword.length < 8 ? 'Too short' :
                       passwordForm.newPassword.length < 12 ? 'Weak' :
                       passwordForm.newPassword.length < 16 ? 'Fair' :
                       passwordForm.newPassword.length < 20 ? 'Strong' : 'Very strong'}
                    </p>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handlePasswordChange}
                    disabled={saving || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                    className="btn-gold text-xs py-3 px-8 disabled:opacity-50"
                  >
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                        Updating…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Icon name="LockClosedIcon" size={14} />
                        Update Password
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <div className="surface-card rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-gold-500 bg-opacity-15 border border-gold-500 border-opacity-30 flex items-center justify-center">
                  <Icon name="BellIcon" size={20} className="text-gold-400" />
                </div>
                <div>
                  <h2 className="font-display font-800 text-base text-white">Notification Preferences</h2>
                  <p className="text-white text-opacity-40 text-xs">Control which alerts and emails you receive</p>
                </div>
              </div>

              <div className="space-y-4">
                {notifToggles.map((toggle) => (
                  <div
                    key={toggle.key}
                    className="flex items-center justify-between p-4 rounded-xl bg-navy-900 border border-navy-700 hover:border-navy-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-navy-800 border border-navy-600 flex items-center justify-center flex-shrink-0">
                        <Icon name={toggle.icon} size={16} className="text-white text-opacity-50" />
                      </div>
                      <div>
                        <p className="font-display font-700 text-sm text-white">{toggle.label}</p>
                        <p className="text-white text-opacity-40 text-xs">{toggle.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setNotifPrefs({ ...notifPrefs, [toggle.key]: !notifPrefs[toggle.key] })}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                        notifPrefs[toggle.key] ? 'bg-gold-500' : 'bg-navy-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          notifPrefs[toggle.key] ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-end">
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
                    <span className="flex items-center gap-2">
                      <Icon name="CheckIcon" size={14} />
                      Save Preferences
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── INTEGRATIONS ── */}
          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gold-500 bg-opacity-15 border border-gold-500 border-opacity-30 flex items-center justify-center">
                  <Icon name="PuzzlePieceIcon" size={20} className="text-gold-400" />
                </div>
                <div>
                  <h2 className="font-display font-800 text-base text-white">Connected Integrations</h2>
                  <p className="text-white text-opacity-40 text-xs">Status of your connected services and subscriptions</p>
                </div>
              </div>

              {/* Stripe */}
              <div className="surface-card rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-500 bg-opacity-15 border border-indigo-500 border-opacity-30 flex items-center justify-center flex-shrink-0">
                      <Icon name="CreditCardIcon" size={22} className="text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-display font-800 text-sm text-white">Stripe Payments</p>
                      <p className="text-white text-opacity-40 text-xs mt-0.5">Subscription billing and payment processing</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-display font-700 px-3 py-1 rounded-full border text-green-400 bg-green-500 bg-opacity-10 border-green-500 border-opacity-30 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    Connected
                  </span>
                </div>

                <div className="mt-5 pt-5 border-t border-white border-opacity-5">
                  {subLoading ? (
                    <div className="flex items-center gap-2 text-white text-opacity-40 text-sm">
                      <span className="w-4 h-4 border-2 border-white border-opacity-20 border-t-white border-t-opacity-60 rounded-full animate-spin" />
                      Loading subscription…
                    </div>
                  ) : subscription ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="font-display font-700 text-xs text-white text-opacity-40 uppercase tracking-widest mb-1">Status</p>
                        <span className={`inline-flex items-center gap-1 text-xs font-display font-700 px-2.5 py-1 rounded-full border ${getStatusColor(subscription.status)}`}>
                          {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                        </span>
                      </div>
                      <div>
                        <p className="font-display font-700 text-xs text-white text-opacity-40 uppercase tracking-widest mb-1">Plan</p>
                        <p className="text-white text-sm font-display font-700">
                          {subscription.currency} {subscription.amount?.toFixed(2)}/mo
                        </p>
                      </div>
                      <div>
                        <p className="font-display font-700 text-xs text-white text-opacity-40 uppercase tracking-widest mb-1">
                          {subscription.status === 'trialing' ? 'Trial Ends' : 'Renews'}
                        </p>
                        <p className="text-white text-sm font-display font-700">
                          {formatDate(subscription.status === 'trialing' ? subscription.trial_end : subscription.current_period_end)}
                        </p>
                      </div>
                      <div>
                        <p className="font-display font-700 text-xs text-white text-opacity-40 uppercase tracking-widest mb-1">Subscription ID</p>
                        <p className="text-white text-opacity-50 text-xs font-mono truncate">
                          {subscription.stripe_subscription_id ? subscription.stripe_subscription_id.slice(0, 20) + '…' : 'N/A'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-white text-opacity-40 text-sm">No active subscription found.</p>
                      <Link
                        href="/subscription"
                        className="btn-gold text-xs py-2 px-5"
                      >
                        <Icon name="SparklesIcon" size={13} />
                        View Plans
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* OpenAI */}
              <div className="surface-card rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500 bg-opacity-15 border border-emerald-500 border-opacity-30 flex items-center justify-center flex-shrink-0">
                      <Icon name="SparklesIcon" size={22} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-display font-800 text-sm text-white">OpenAI (GPT-4o)</p>
                      <p className="text-white text-opacity-40 text-xs mt-0.5">AI Legal Assistant powering your case analysis</p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs font-display font-700 px-3 py-1 rounded-full border flex-shrink-0 ${
                    process.env.NEXT_PUBLIC_SUPABASE_URL
                      ? 'text-green-400 bg-green-500 bg-opacity-10 border-green-500 border-opacity-30' :'text-red-400 bg-red-500 bg-opacity-10 border-red-500 border-opacity-30'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    Active
                  </span>
                </div>

                <div className="mt-5 pt-5 border-t border-white border-opacity-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="font-display font-700 text-xs text-white text-opacity-40 uppercase tracking-widest mb-1">Model</p>
                      <p className="text-white text-sm font-display font-700">GPT-4o</p>
                    </div>
                    <div>
                      <p className="font-display font-700 text-xs text-white text-opacity-40 uppercase tracking-widest mb-1">Integration</p>
                      <p className="text-white text-sm font-display font-700">API Route (Secure)</p>
                    </div>
                    <div>
                      <p className="font-display font-700 text-xs text-white text-opacity-40 uppercase tracking-widest mb-1">Specialisation</p>
                      <p className="text-white text-sm font-display font-700">UK Family Law</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 rounded-xl bg-emerald-500 bg-opacity-5 border border-emerald-500 border-opacity-15">
                    <p className="text-emerald-400 text-xs flex items-center gap-2">
                      <Icon name="ShieldCheckIcon" size={13} />
                      API key is securely stored server-side and never exposed to the browser.
                    </p>
                  </div>
                </div>
              </div>

              {/* Resend */}
              <div className="surface-card rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500 bg-opacity-15 border border-blue-500 border-opacity-30 flex items-center justify-center flex-shrink-0">
                      <Icon name="EnvelopeIcon" size={22} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="font-display font-800 text-sm text-white">Resend Email</p>
                      <p className="text-white text-opacity-40 text-xs mt-0.5">Transactional emails, verification codes, and notifications</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-display font-700 px-3 py-1 rounded-full border text-blue-400 bg-blue-500 bg-opacity-10 border-blue-500 border-opacity-30 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    Configured
                  </span>
                </div>

                <div className="mt-5 pt-5 border-t border-white border-opacity-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="font-display font-700 text-xs text-white text-opacity-40 uppercase tracking-widest mb-1">Email Types</p>
                      <p className="text-white text-sm font-display font-700">Transactional</p>
                    </div>
                    <div>
                      <p className="font-display font-700 text-xs text-white text-opacity-40 uppercase tracking-widest mb-1">Templates</p>
                      <p className="text-white text-sm font-display font-700">Welcome, Verification, GDPR</p>
                    </div>
                    <div>
                      <p className="font-display font-700 text-xs text-white text-opacity-40 uppercase tracking-widest mb-1">Delivery</p>
                      <p className="text-white text-sm font-display font-700">Via Edge Function</p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 rounded-xl bg-blue-500 bg-opacity-5 border border-blue-500 border-opacity-15">
                    <p className="text-blue-400 text-xs flex items-center gap-2">
                      <Icon name="InformationCircleIcon" size={13} />
                      Email delivery is handled via Supabase Edge Functions with your Resend API key.
                    </p>
                  </div>
                </div>
              </div>

              {/* Supabase */}
              <div className="surface-card rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-500 bg-opacity-15 border border-teal-500 border-opacity-30 flex items-center justify-center flex-shrink-0">
                      <Icon name="CircleStackIcon" size={22} className="text-teal-400" />
                    </div>
                    <div>
                      <p className="font-display font-800 text-sm text-white">Supabase Database</p>
                      <p className="text-white text-opacity-40 text-xs mt-0.5">Authentication, database, and real-time subscriptions</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-display font-700 px-3 py-1 rounded-full border text-green-400 bg-green-500 bg-opacity-10 border-green-500 border-opacity-30 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Live
                  </span>
                </div>

                <div className="mt-5 pt-5 border-t border-white border-opacity-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="font-display font-700 text-xs text-white text-opacity-40 uppercase tracking-widest mb-1">Auth Status</p>
                      <p className="text-white text-sm font-display font-700">
                        {user ? 'Authenticated' : 'Not authenticated'}
                      </p>
                    </div>
                    <div>
                      <p className="font-display font-700 text-xs text-white text-opacity-40 uppercase tracking-widest mb-1">User ID</p>
                      <p className="text-white text-opacity-50 text-xs font-mono truncate">{user?.id?.slice(0, 20)}…</p>
                    </div>
                    <div>
                      <p className="font-display font-700 text-xs text-white text-opacity-40 uppercase tracking-widest mb-1">Last Sign In</p>
                      <p className="text-white text-sm font-display font-700">
                        {user?.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
