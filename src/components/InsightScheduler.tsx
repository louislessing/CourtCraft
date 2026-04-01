'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/AppIcon';
import toast from 'react-hot-toast';

interface InsightSchedule {
  id: string;
  frequency: 'weekly' | 'monthly';
  delivery_email: string;
  day_of_week: number;
  day_of_month: number;
  hour_utc: number;
  is_active: boolean;
  last_sent_at: string | null;
  next_run_at: string | null;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: `${String(i).padStart(2, '0')}:00 UTC`,
}));

export default function InsightScheduler() {
  const { user, profile } = useAuth();
  const supabase = createClient();

  const [schedule, setSchedule] = useState<InsightSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    frequency: 'weekly\' as \'weekly\' | \'monthly',
    delivery_email: '',
    day_of_week: 1,
    day_of_month: 1,
    hour_utc: 8,
    is_active: true,
  });

  const loadSchedule = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('insight_schedules')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setSchedule(data);
        setForm({
          frequency: data.frequency,
          delivery_email: data.delivery_email,
          day_of_week: data.day_of_week ?? 1,
          day_of_month: data.day_of_month ?? 1,
          hour_utc: data.hour_utc ?? 8,
          is_active: data.is_active,
        });
      } else {
        // Pre-fill email from profile
        setForm((f) => ({ ...f, delivery_email: profile?.email || user.email || '' }));
      }
    } catch (err) {
      console.error('Failed to load insight schedule:', err);
    } finally {
      setLoading(false);
    }
  }, [user, profile, supabase]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const computeNextRun = (f: typeof form): Date => {
    const now = new Date();
    const next = new Date(now);
    if (f.frequency === 'weekly') {
      const targetDay = f.day_of_week;
      const currentDay = next.getUTCDay();
      let daysUntil = (targetDay - currentDay + 7) % 7;
      if (daysUntil === 0) daysUntil = 7;
      next.setUTCDate(next.getUTCDate() + daysUntil);
    } else {
      next.setUTCMonth(next.getUTCMonth() + 1);
      next.setUTCDate(Math.min(f.day_of_month, 28));
    }
    next.setUTCHours(f.hour_utc, 0, 0, 0);
    return next;
  };

  const handleSave = async () => {
    if (!user || !form.delivery_email.trim()) {
      toast.error('Please enter a delivery email address');
      return;
    }
    setSaving(true);
    try {
      const nextRunAt = computeNextRun(form).toISOString();
      const payload = {
        user_id: user.id,
        frequency: form.frequency,
        delivery_email: form.delivery_email.trim(),
        day_of_week: form.day_of_week,
        day_of_month: form.day_of_month,
        hour_utc: form.hour_utc,
        is_active: form.is_active,
        next_run_at: nextRunAt,
      };

      if (schedule) {
        const { error } = await supabase
          .from('insight_schedules')
          .update(payload)
          .eq('id', schedule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('insight_schedules')
          .insert(payload);
        if (error) throw error;
      }

      toast.success('Schedule saved successfully');
      setShowForm(false);
      await loadSchedule();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!schedule) return;
    setSaving(true);
    try {
      const newActive = !schedule.is_active;
      const { error } = await supabase
        .from('insight_schedules')
        .update({ is_active: newActive })
        .eq('id', schedule.id);
      if (error) throw error;
      toast.success(newActive ? 'Schedule enabled' : 'Schedule paused');
      await loadSchedule();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    if (!user) return;
    setSending(true);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/scheduled-insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          email: schedule?.delivery_email || profile?.email || user.email,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to send insights');
      }
      toast.success('Insights generated and sent to your inbox!');
      await loadSchedule();
    } catch (err: any) {
      toast.error(err.message || 'Failed to send insights');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!schedule) return;
    if (!confirm('Remove your automated insights schedule?')) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('insight_schedules')
        .delete()
        .eq('id', schedule.id);
      if (error) throw error;
      setSchedule(null);
      setForm((f) => ({ ...f, frequency: 'weekly', day_of_week: 1, day_of_month: 1, hour_utc: 8, is_active: true }));
      toast.success('Schedule removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove schedule');
    } finally {
      setSaving(false);
    }
  };

  const scheduleDescription = (s: InsightSchedule) => {
    if (s.frequency === 'weekly') {
      return `Every ${DAY_NAMES[s.day_of_week]} at ${String(s.hour_utc).padStart(2, '0')}:00 UTC`;
    }
    return `Monthly on day ${s.day_of_month} at ${String(s.hour_utc).padStart(2, '0')}:00 UTC`;
  };

  if (loading) {
    return (
      <div className="surface-card rounded-2xl p-5">
        <div className="h-4 w-48 bg-gray-100 rounded animate-pulse mb-3" />
        <div className="h-3 w-64 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="surface-card rounded-2xl hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold-gradient flex items-center justify-center flex-shrink-0">
            <Icon name="ClockIcon" size={16} className="text-navy-900" />
          </div>
          <div>
            <h3 className="font-display font-700 text-navy-900 text-sm leading-tight">Automated Insights Delivery</h3>
            <p className="text-navy-500 mt-0.5" style={{ fontSize: '10px' }}>Weekly or monthly AI reports sent to your inbox</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {schedule && (
            <button
              onClick={handleSendNow}
              disabled={sending}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-navy-700 font-display font-600 text-xs hover:border-gold-400 hover:text-gold-700 hover:bg-gold-50 active:scale-95 transition-all duration-150 cursor-pointer disabled:opacity-50"
              title="Send insights now"
            >
              {sending ? (
                <div className="w-3 h-3 rounded-full border-2 border-navy-700 border-t-transparent animate-spin" />
              ) : (
                <Icon name="PaperAirplaneIcon" size={12} className="text-navy-700" />
              )}
              Send Now
            </button>
          )}
          <button
            onClick={() => setShowForm((v) => !v)}
            className="btn-gold text-xs py-2 px-4 gap-1 hover:opacity-90 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <Icon name={schedule ? 'PencilIcon' : 'PlusIcon'} size={12} className="text-navy-900" />
            {schedule ? 'Edit Schedule' : 'Set Schedule'}
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Current schedule status */}
        {schedule && !showForm && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${schedule.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                <div>
                  <p className="text-sm font-display font-700 text-navy-900 capitalize">{schedule.frequency} Report</p>
                  <p className="text-xs text-navy-500 mt-0.5">{scheduleDescription(schedule)}</p>
                  <p className="text-xs text-navy-400 mt-0.5">→ {schedule.delivery_email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleActive}
                  disabled={saving}
                  className={`text-xs px-3 py-1.5 rounded-lg font-600 transition-colors cursor-pointer ${
                    schedule.is_active
                      ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' :'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                  }`}
                >
                  {schedule.is_active ? 'Active' : 'Paused'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Remove schedule"
                >
                  <Icon name="TrashIcon" size={13} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {schedule.last_sent_at && (
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                  <p className="text-xs font-600 text-blue-700 mb-0.5">Last Sent</p>
                  <p className="text-xs text-blue-600">
                    {new Date(schedule.last_sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
              {schedule.next_run_at && schedule.is_active && (
                <div className="rounded-xl bg-gold-50 border border-gold-200 p-3">
                  <p className="text-xs font-600 text-gold-700 mb-0.5">Next Delivery</p>
                  <p className="text-xs text-gold-600">
                    {new Date(schedule.next_run_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* No schedule yet */}
        {!schedule && !showForm && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gold-500 bg-opacity-10 border border-gold-500 border-opacity-25 flex items-center justify-center mb-3">
              <Icon name="ClockIcon" size={22} className="text-gold-600" />
            </div>
            <p className="font-display font-700 text-navy-900 text-sm mb-1">No Schedule Set</p>
            <p className="text-xs text-navy-400 mb-4 max-w-xs">
              Set up weekly or monthly automated AI case insights delivered directly to your inbox — with PDF-quality analysis every time.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="btn-gold text-xs py-2 px-5 hover:opacity-90 active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <Icon name="PlusIcon" size={13} className="text-navy-900 mr-1" />
              Set Up Schedule
            </button>
          </div>
        )}

        {/* Schedule form */}
        {showForm && (
          <div className="space-y-4">
            {/* Frequency */}
            <div>
              <label className="block text-xs font-600 text-navy-700 mb-2">Frequency</label>
              <div className="grid grid-cols-2 gap-2">
                {(['weekly', 'monthly'] as const).map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setForm((f) => ({ ...f, frequency: freq }))}
                    className={`py-2.5 rounded-xl border text-xs font-display font-700 capitalize transition-all cursor-pointer ${
                      form.frequency === freq
                        ? 'bg-gold-gradient text-navy-900 border-gold-400' :'bg-white text-navy-600 border-gray-200 hover:border-gold-300'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            {/* Day selector */}
            {form.frequency === 'weekly' ? (
              <div>
                <label className="block text-xs font-600 text-navy-700 mb-2">Day of Week</label>
                <div className="grid grid-cols-7 gap-1">
                  {DAY_NAMES.map((day, idx) => (
                    <button
                      key={day}
                      onClick={() => setForm((f) => ({ ...f, day_of_week: idx }))}
                      className={`py-1.5 rounded-lg text-center transition-all cursor-pointer ${
                        form.day_of_week === idx
                          ? 'bg-gold-gradient text-navy-900 font-700' :'bg-gray-100 text-navy-600 hover:bg-gray-200'
                      }`}
                      style={{ fontSize: '10px' }}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-600 text-navy-700 mb-2">Day of Month</label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={form.day_of_month}
                  onChange={(e) => setForm((f) => ({ ...f, day_of_month: Math.min(28, Math.max(1, parseInt(e.target.value) || 1)) }))}
                  className="input-navy text-xs py-2 w-full"
                />
                <p className="text-navy-400 mt-1" style={{ fontSize: '10px' }}>Day 1–28 (to avoid month-end issues)</p>
              </div>
            )}

            {/* Time */}
            <div>
              <label className="block text-xs font-600 text-navy-700 mb-2">Delivery Time (UTC)</label>
              <select
                value={form.hour_utc}
                onChange={(e) => setForm((f) => ({ ...f, hour_utc: parseInt(e.target.value) }))}
                className="input-navy text-xs py-2 w-full"
              >
                {HOUR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-600 text-navy-700 mb-2">Delivery Email</label>
              <input
                type="email"
                value={form.delivery_email}
                onChange={(e) => setForm((f) => ({ ...f, delivery_email: e.target.value }))}
                placeholder="your@email.com"
                className="input-navy text-xs py-2 w-full"
              />
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200">
              <div>
                <p className="text-xs font-600 text-navy-700">Enable Schedule</p>
                <p className="text-navy-400 mt-0.5" style={{ fontSize: '10px' }}>Pause at any time without losing settings</p>
              </div>
              <button
                onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_active ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>

            {/* Preview */}
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
              <p className="text-xs font-600 text-blue-700 mb-1">Schedule Preview</p>
              <p className="text-xs text-blue-600">
                {form.frequency === 'weekly'
                  ? `Every ${DAY_NAMES[form.day_of_week]} at ${String(form.hour_utc).padStart(2, '0')}:00 UTC`
                  : `Monthly on day ${form.day_of_month} at ${String(form.hour_utc).padStart(2, '0')}:00 UTC`}
              </p>
              <p className="text-xs text-blue-500 mt-0.5">
                Next delivery: {computeNextRun(form).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-navy-700 font-600 text-xs hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.delivery_email.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gold-gradient text-navy-900 font-display font-700 text-xs hover:opacity-90 active:scale-95 transition-all duration-150 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-navy-900 border-t-transparent animate-spin" />
                ) : (
                  <Icon name="CheckIcon" size={13} className="text-navy-900" />
                )}
                Save Schedule
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
