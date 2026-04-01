'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import NotificationBell from '@/components/NotificationBell';
import toast, { Toaster } from 'react-hot-toast';
import BackButton from '@/components/ui/BackButton';

interface CourtFiling {
  id: string;
  user_id: string;
  document_title: string;
  document_type: string;
  submission_date: string;
  court_reference_number: string;
  court_name: string;
  hearing_date: string | null;
  response_status: 'pending' | 'acknowledged' | 'accepted' | 'rejected' | 'awaiting_hearing' | 'decided';
  response_date: string | null;
  response_notes: string;
  filed_by: string;
  case_number: string;
  notes: string;
  created_at: string;
}

const RESPONSE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Pending', color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', icon: 'ClockIcon' },
  acknowledged: { label: 'Acknowledged', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', icon: 'CheckCircleIcon' },
  accepted: { label: 'Accepted', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', icon: 'CheckBadgeIcon' },
  rejected: { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', icon: 'XCircleIcon' },
  awaiting_hearing: { label: 'Awaiting Hearing', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', icon: 'CalendarDaysIcon' },
  decided: { label: 'Decided', color: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/20', icon: 'DocumentCheckIcon' },
};

const DOCUMENT_TYPES = [
  'Application (C100)', 'Application (C79)', 'Application (FL401)', 'Application (D8)',
  'Position Statement', 'Witness Statement', 'Chronology', 'Schedule of Assets (Form E)',
  'Consent Order', 'Notice of Hearing', 'Court Bundle', 'Evidence Bundle',
  'CAFCASS Report Response', 'Section 7 Report', 'Other',
];

const sidebarLinks = [
  { icon: 'Squares2X2Icon', label: 'Dashboard', href: '/dashboard' },
  { icon: 'DocumentTextIcon', label: 'Document Builder', href: '/document-builder' },
  { icon: 'FolderOpenIcon', label: 'Case Management', href: '/case-management' },
  { icon: 'ClipboardDocumentListIcon', label: 'Court Filing Tracker', href: '/court-filing-tracker', active: true },
  { icon: 'BookOpenIcon', label: 'Resources', href: '/resources' },
  { icon: 'UserCircleIcon', label: 'Profile', href: '/profile' },
  { icon: 'Cog6ToothIcon', label: 'Settings', href: '/settings' },
];

const EMPTY_FORM = {
  document_title: '',
  document_type: 'Application (C100)',
  submission_date: '',
  court_reference_number: '',
  court_name: '',
  hearing_date: '',
  response_status: 'pending' as CourtFiling['response_status'],
  response_date: '',
  response_notes: '',
  filed_by: '',
  case_number: '',
  notes: '',
};

export default function CourtFilingTrackerPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const supabase = createClient();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filings, setFilings] = useState<CourtFiling[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingFiling, setEditingFiling] = useState<CourtFiling | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'submission_date' | 'hearing_date' | 'created_at'>('submission_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/sign-in');
  }, [user, loading, router]);

  const fetchFilings = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const { data, error } = await supabase
        .from('court_filings')
        .select('*')
        .eq('user_id', user.id)
        .order('submission_date', { ascending: false });
      if (error) throw error;
      setFilings(data || []);
    } catch {
      // Table may not exist yet — show empty state gracefully
      setFilings([]);
    } finally {
      setDataLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (user) fetchFilings();
  }, [user, fetchFilings]);

  const openAdd = () => {
    setEditingFiling(null);
    setFormData(EMPTY_FORM);
    setShowAddModal(true);
  };

  const openEdit = (filing: CourtFiling) => {
    setEditingFiling(filing);
    setFormData({
      document_title: filing.document_title,
      document_type: filing.document_type,
      submission_date: filing.submission_date,
      court_reference_number: filing.court_reference_number,
      court_name: filing.court_name,
      hearing_date: filing.hearing_date || '',
      response_status: filing.response_status,
      response_date: filing.response_date || '',
      response_notes: filing.response_notes,
      filed_by: filing.filed_by,
      case_number: filing.case_number,
      notes: filing.notes,
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!formData.document_title.trim()) { toast.error('Document title is required'); return; }
    if (!formData.submission_date) { toast.error('Submission date is required'); return; }

    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        document_title: formData.document_title.trim(),
        document_type: formData.document_type,
        submission_date: formData.submission_date,
        court_reference_number: formData.court_reference_number.trim(),
        court_name: formData.court_name.trim(),
        hearing_date: formData.hearing_date || null,
        response_status: formData.response_status,
        response_date: formData.response_date || null,
        response_notes: formData.response_notes.trim(),
        filed_by: formData.filed_by.trim(),
        case_number: formData.case_number.trim(),
        notes: formData.notes.trim(),
      };

      if (editingFiling) {
        const { error } = await supabase.from('court_filings').update(payload).eq('id', editingFiling.id);
        if (error) throw error;
        toast.success('Filing updated');
      } else {
        const { error } = await supabase.from('court_filings').insert(payload);
        if (error) throw error;
        toast.success('Filing added');
      }
      setShowAddModal(false);
      fetchFilings();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save filing');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('court_filings').delete().eq('id', id);
      if (error) throw error;
      toast.success('Filing deleted');
      setDeleteConfirm(null);
      fetchFilings();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete');
    }
  };

  const filteredFilings = filings
    .filter(f => {
      if (filterStatus !== 'all' && f.response_status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          f.document_title.toLowerCase().includes(q) ||
          f.court_reference_number.toLowerCase().includes(q) ||
          f.case_number.toLowerCase().includes(q) ||
          f.court_name.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

  const stats = {
    total: filings.length,
    pending: filings.filter(f => f.response_status === 'pending').length,
    awaitingHearing: filings.filter(f => f.response_status === 'awaiting_hearing').length,
    decided: filings.filter(f => ['accepted', 'rejected', 'decided'].includes(f.response_status)).length,
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white flex">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1a2035', color: '#fff', border: '1px solid #2a3050' } }} />

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0d1526] border-r border-[#1e2d4a] flex flex-col transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-5 border-b border-[#1e2d4a] flex items-center justify-between">
          <AppLogo className="h-8" />
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <Icon name="XMarkIcon" size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                link.active
                  ? 'bg-[#c9a84c]/10 text-[#c9a84c] border border-[#c9a84c]/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon name={link.icon} size={18} />
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-[#0d1526]/95 backdrop-blur border-b border-[#1e2d4a] px-4 lg:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-400 hover:text-white">
              <Icon name="Bars3Icon" size={22} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                <Icon name="ClipboardDocumentListIcon" size={20} className="text-[#c9a84c]" />
                Court Filing Tracker
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">Track all court submissions, reference numbers, and responses</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <BackButton className="text-white/60 hover:text-[#c9a84c]" label="Back" />
            <NotificationBell />
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-[#c9a84c] hover:bg-[#b8963e] text-[#0a0f1e] text-sm font-semibold rounded-lg transition-colors"
            >
              <Icon name="PlusIcon" size={16} />
              <span className="hidden sm:inline">Add Filing</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Filings', value: stats.total, icon: 'ClipboardDocumentListIcon', color: 'text-[#c9a84c]', bg: 'bg-[#c9a84c]/10' },
              { label: 'Pending Response', value: stats.pending, icon: 'ClockIcon', color: 'text-amber-400', bg: 'bg-amber-400/10' },
              { label: 'Awaiting Hearing', value: stats.awaitingHearing, icon: 'CalendarDaysIcon', color: 'text-purple-400', bg: 'bg-purple-400/10' },
              { label: 'Resolved', value: stats.decided, icon: 'CheckBadgeIcon', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
            ].map(stat => (
              <div key={stat.label} className="bg-[#0d1526] border border-[#1e2d4a] rounded-xl p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon name={stat.icon} size={20} className={stat.color} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filters & Search */}
          <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-xl p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Icon name="MagnifyingGlassIcon" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search by title, reference, case number, court..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#0a0f1e] border border-[#1e2d4a] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c9a84c]/50"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-[#0a0f1e] border border-[#1e2d4a] rounded-lg text-sm text-white focus:outline-none focus:border-[#c9a84c]/50"
              >
                <option value="all">All Statuses</option>
                {Object.entries(RESPONSE_STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <select
                value={`${sortField}-${sortDir}`}
                onChange={e => {
                  const [f, d] = e.target.value.split('-');
                  setSortField(f as typeof sortField);
                  setSortDir(d as typeof sortDir);
                }}
                className="px-3 py-2 bg-[#0a0f1e] border border-[#1e2d4a] rounded-lg text-sm text-white focus:outline-none focus:border-[#c9a84c]/50"
              >
                <option value="submission_date-desc">Submitted (Newest)</option>
                <option value="submission_date-asc">Submitted (Oldest)</option>
                <option value="hearing_date-asc">Hearing (Soonest)</option>
                <option value="hearing_date-desc">Hearing (Latest)</option>
                <option value="created_at-desc">Added (Newest)</option>
              </select>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterStatus === 'all' ? 'bg-[#c9a84c]/10 text-[#c9a84c] border-[#c9a84c]/30' : 'text-slate-400 border-[#1e2d4a] hover:border-slate-500'}`}
            >
              All ({filings.length})
            </button>
            {Object.entries(RESPONSE_STATUS_CONFIG).map(([k, v]) => {
              const count = filings.filter(f => f.response_status === k).length;
              return (
                <button
                  key={k}
                  onClick={() => setFilterStatus(k)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${filterStatus === k ? `${v.bg} ${v.color} border-current` : 'text-slate-400 border-[#1e2d4a] hover:border-slate-500'}`}
                >
                  {v.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Filings Table / Cards */}
          {dataLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#c9a84c] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredFilings.length === 0 ? (
            <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-[#c9a84c]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="ClipboardDocumentListIcon" size={32} className="text-[#c9a84c]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {searchQuery || filterStatus !== 'all' ? 'No filings match your filters' : 'No court filings yet'}
              </h3>
              <p className="text-slate-500 text-sm mb-6">
                {searchQuery || filterStatus !== 'all' ?'Try adjusting your search or filter criteria.' :'Start tracking your court submissions, reference numbers, and hearing dates.'}
              </p>
              {!searchQuery && filterStatus === 'all' && (
                <button
                  onClick={openAdd}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#c9a84c] hover:bg-[#b8963e] text-[#0a0f1e] font-semibold rounded-lg transition-colors text-sm"
                >
                  <Icon name="PlusIcon" size={16} />
                  Add Your First Filing
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFilings.map(filing => {
                const status = RESPONSE_STATUS_CONFIG[filing.response_status] || RESPONSE_STATUS_CONFIG.pending;
                const isUpcoming = filing.hearing_date && new Date(filing.hearing_date) > new Date();
                const daysToHearing = filing.hearing_date
                  ? Math.ceil((new Date(filing.hearing_date).getTime() - Date.now()) / 86400000)
                  : null;

                return (
                  <div key={filing.id} className="bg-[#0d1526] border border-[#1e2d4a] rounded-xl p-5 hover:border-[#2a3a5a] transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      {/* Left */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-9 h-9 bg-[#c9a84c]/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Icon name="DocumentTextIcon" size={18} className="text-[#c9a84c]" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-white text-sm leading-tight truncate">{filing.document_title}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{filing.document_type}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                          <div>
                            <p className="text-slate-500 mb-0.5">Submitted</p>
                            <p className="text-white font-medium">{formatDate(filing.submission_date)}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 mb-0.5">Court Ref No.</p>
                            <p className="text-white font-medium font-mono">{filing.court_reference_number || '—'}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 mb-0.5">Case Number</p>
                            <p className="text-white font-medium font-mono">{filing.case_number || '—'}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 mb-0.5">Court</p>
                            <p className="text-white font-medium truncate">{filing.court_name || '—'}</p>
                          </div>
                        </div>

                        {filing.hearing_date && (
                          <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${isUpcoming ? 'bg-purple-400/10 border border-purple-400/20' : 'bg-slate-700/30 border border-slate-600/20'}`}>
                            <Icon name="CalendarDaysIcon" size={14} className={isUpcoming ? 'text-purple-400' : 'text-slate-500'} />
                            <span className={isUpcoming ? 'text-purple-300' : 'text-slate-400'}>
                              Hearing: {formatDate(filing.hearing_date)}
                              {daysToHearing !== null && isUpcoming && (
                                <span className="ml-2 font-semibold text-purple-400">
                                  ({daysToHearing === 0 ? 'Today' : `${daysToHearing}d away`})
                                </span>
                              )}
                              {!isUpcoming && <span className="ml-2 text-slate-500">(Past)</span>}
                            </span>
                          </div>
                        )}

                        {filing.notes && (
                          <p className="mt-2 text-xs text-slate-500 line-clamp-2">{filing.notes}</p>
                        )}
                      </div>

                      {/* Right */}
                      <div className="flex sm:flex-col items-center sm:items-end gap-3 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.bg} ${status.color}`}>
                          <Icon name={status.icon} size={12} />
                          {status.label}
                        </span>
                        {filing.response_date && (
                          <p className="text-xs text-slate-500">Response: {formatDate(filing.response_date)}</p>
                        )}
                        <div className="flex gap-2 mt-auto">
                          <button
                            onClick={() => openEdit(filing)}
                            className="p-1.5 text-slate-400 hover:text-[#c9a84c] hover:bg-[#c9a84c]/10 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Icon name="PencilSquareIcon" size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(filing.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Icon name="TrashIcon" size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {filing.response_notes && (
                      <div className="mt-3 pt-3 border-t border-[#1e2d4a]">
                        <p className="text-xs text-slate-500 flex items-start gap-1.5">
                          <Icon name="ChatBubbleLeftIcon" size={13} className="flex-shrink-0 mt-0.5" />
                          <span><span className="text-slate-400 font-medium">Court Response: </span>{filing.response_notes}</span>
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#0d1526] border-b border-[#1e2d4a] px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {editingFiling ? 'Edit Court Filing' : 'Add Court Filing'}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <Icon name="XMarkIcon" size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Document Info */}
              <div>
                <h3 className="text-xs font-semibold text-[#c9a84c] uppercase tracking-wider mb-3">Document Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Document Title <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={formData.document_title}
                      onChange={e => setFormData(p => ({ ...p, document_title: e.target.value }))}
                      placeholder="e.g. C100 Application for Child Arrangements Order"
                      className="w-full px-3 py-2 bg-[#0a0f1e] border border-[#1e2d4a] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c9a84c]/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Document Type</label>
                      <select
                        value={formData.document_type}
                        onChange={e => setFormData(p => ({ ...p, document_type: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#0a0f1e] border border-[#1e2d4a] rounded-lg text-sm text-white focus:outline-none focus:border-[#c9a84c]/50"
                      >
                        {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Filed By</label>
                      <input
                        type="text"
                        value={formData.filed_by}
                        onChange={e => setFormData(p => ({ ...p, filed_by: e.target.value }))}
                        placeholder="Applicant / Respondent / Solicitor"
                        className="w-full px-3 py-2 bg-[#0a0f1e] border border-[#1e2d4a] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c9a84c]/50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Court & Reference */}
              <div>
                <h3 className="text-xs font-semibold text-[#c9a84c] uppercase tracking-wider mb-3">Court & Reference</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Court Name</label>
                    <input
                      type="text"
                      value={formData.court_name}
                      onChange={e => setFormData(p => ({ ...p, court_name: e.target.value }))}
                      placeholder="e.g. Central Family Court"
                      className="w-full px-3 py-2 bg-[#0a0f1e] border border-[#1e2d4a] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c9a84c]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Court Reference Number</label>
                    <input
                      type="text"
                      value={formData.court_reference_number}
                      onChange={e => setFormData(p => ({ ...p, court_reference_number: e.target.value }))}
                      placeholder="e.g. ZC21F00123"
                      className="w-full px-3 py-2 bg-[#0a0f1e] border border-[#1e2d4a] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c9a84c]/50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Case Number</label>
                    <input
                      type="text"
                      value={formData.case_number}
                      onChange={e => setFormData(p => ({ ...p, case_number: e.target.value }))}
                      placeholder="e.g. BS21P00456"
                      className="w-full px-3 py-2 bg-[#0a0f1e] border border-[#1e2d4a] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c9a84c]/50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Submission Date <span className="text-red-400">*</span></label>
                    <input
                      type="date"
                      value={formData.submission_date}
                      onChange={e => setFormData(p => ({ ...p, submission_date: e.target.value }))}
                      className="w-full px-3 py-2 bg-[#0a0f1e] border border-[#1e2d4a] rounded-lg text-sm text-white focus:outline-none focus:border-[#c9a84c]/50"
                    />
                  </div>
                </div>
              </div>

              {/* Hearing */}
              <div>
                <h3 className="text-xs font-semibold text-[#c9a84c] uppercase tracking-wider mb-3">Hearing Date</h3>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hearing Date (if scheduled)</label>
                  <input
                    type="date"
                    value={formData.hearing_date}
                    onChange={e => setFormData(p => ({ ...p, hearing_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#0a0f1e] border border-[#1e2d4a] rounded-lg text-sm text-white focus:outline-none focus:border-[#c9a84c]/50"
                  />
                </div>
              </div>

              {/* Court Response */}
              <div>
                <h3 className="text-xs font-semibold text-[#c9a84c] uppercase tracking-wider mb-3">Court Response</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Response Status</label>
                      <select
                        value={formData.response_status}
                        onChange={e => setFormData(p => ({ ...p, response_status: e.target.value as CourtFiling['response_status'] }))}
                        className="w-full px-3 py-2 bg-[#0a0f1e] border border-[#1e2d4a] rounded-lg text-sm text-white focus:outline-none focus:border-[#c9a84c]/50"
                      >
                        {Object.entries(RESPONSE_STATUS_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Response Date</label>
                      <input
                        type="date"
                        value={formData.response_date}
                        onChange={e => setFormData(p => ({ ...p, response_date: e.target.value }))}
                        className="w-full px-3 py-2 bg-[#0a0f1e] border border-[#1e2d4a] rounded-lg text-sm text-white focus:outline-none focus:border-[#c9a84c]/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Court Response Notes</label>
                    <textarea
                      value={formData.response_notes}
                      onChange={e => setFormData(p => ({ ...p, response_notes: e.target.value }))}
                      rows={3}
                      placeholder="Any notes about the court's response or decision..."
                      className="w-full px-3 py-2 bg-[#0a0f1e] border border-[#1e2d4a] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c9a84c]/50 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* General Notes */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">General Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Any additional notes about this filing..."
                  className="w-full px-3 py-2 bg-[#0a0f1e] border border-[#1e2d4a] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#c9a84c]/50 resize-none"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-[#0d1526] border-t border-[#1e2d4a] px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white border border-[#1e2d4a] hover:border-slate-500 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-[#c9a84c] hover:bg-[#b8963e] disabled:opacity-50 text-[#0a0f1e] text-sm font-semibold rounded-lg transition-colors"
              >
                {saving ? <div className="w-4 h-4 border-2 border-[#0a0f1e] border-t-transparent rounded-full animate-spin" /> : <Icon name="CheckIcon" size={16} />}
                {editingFiling ? 'Save Changes' : 'Add Filing'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0d1526] border border-[#1e2d4a] rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 bg-red-400/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="TrashIcon" size={24} className="text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Delete Filing?</h3>
            <p className="text-sm text-slate-400 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-sm text-slate-400 border border-[#1e2d4a] hover:border-slate-500 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
