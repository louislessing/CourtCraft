'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Icon from '@/components/ui/AppIcon';

interface Notification {
  id: string;
  title: string;
  message: string;
  reminder_type: '2_weeks' | '1_week' | '48_hours';
  is_read: boolean;
  created_at: string;
  court_date_id: string | null;
}

const reminderColors: Record<string, string> = {
  '2_weeks': 'text-gold-400',
  '1_week': 'text-orange-400',
  '48_hours': 'text-red-400',
};

const reminderBadgeColors: Record<string, string> = {
  '2_weeks': 'bg-gold-500 bg-opacity-20 text-gold-400 border border-gold-500 border-opacity-30',
  '1_week': 'bg-orange-500 bg-opacity-20 text-orange-400 border border-orange-500 border-opacity-30',
  '48_hours': 'bg-red-500 bg-opacity-20 text-red-400 border border-red-500 border-opacity-30',
};

const reminderLabels: Record<string, string> = {
  '2_weeks': '2 Weeks',
  '1_week': '1 Week',
  '48_hours': '48 Hours',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // Real-time subscription for new notifications
    const channel = supabase
      .channel('notifications_rt')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Close panel on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data || []);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 rounded-xl bg-navy-800 border border-navy-600 flex items-center justify-center hover:border-gold-500 hover:border-opacity-40 transition-all"
        aria-label="Notifications"
      >
        <Icon name="BellIcon" size={18} className="text-white opacity-60" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white font-bold"
            style={{ fontSize: '9px' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-navy-900 border border-navy-600 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-navy-600">
            <div className="flex items-center gap-2">
              <Icon name="BellIcon" size={14} className="text-gold-400" />
              <span className="font-display font-700 text-white text-sm">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500 bg-opacity-20 text-red-400 font-bold border border-red-500 border-opacity-30"
                  style={{ fontSize: '9px' }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-gold-400 hover:text-gold-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-navy-800 flex items-center justify-center mb-3">
                  <Icon name="BellSlashIcon" size={20} className="text-white opacity-30" />
                </div>
                <p className="text-sm text-white text-opacity-40">No notifications yet</p>
                <p className="text-xs text-white text-opacity-25 mt-1">
                  Court date reminders will appear here
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={`w-full text-left px-4 py-3 border-b border-navy-700 hover:bg-navy-800 transition-colors ${!notif.is_read ? 'bg-navy-800 bg-opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${reminderBadgeColors[notif.reminder_type]}`}>
                      <Icon name="CalendarDaysIcon" size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`font-display font-700 text-xs ${reminderColors[notif.reminder_type]}`}>
                          {notif.title}
                        </span>
                        {!notif.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-white text-opacity-60 leading-snug line-clamp-2">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-1.5 py-0.5 rounded text-opacity-80 font-bold ${reminderBadgeColors[notif.reminder_type]}`}
                          style={{ fontSize: '8px' }}>
                          {reminderLabels[notif.reminder_type]} Notice
                        </span>
                        <span className="text-white text-opacity-25" style={{ fontSize: '9px' }}>
                          {formatTime(notif.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-navy-600 bg-navy-900">
              <p className="text-center text-white text-opacity-30" style={{ fontSize: '9px' }}>
                Court date reminders — 2 weeks, 1 week &amp; 48 hours before
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
