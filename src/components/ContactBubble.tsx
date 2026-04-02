'use client';

import React, { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';

interface FormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

const ContactBubble: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        const trigger = document.getElementById('contact-bubble-trigger');
        if (trigger && trigger.contains(e.target as Node)) return;
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const res = await fetch('/api/contact-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to send');
      setStatus('success');
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again or email us directly.');
    }
  };

  return (
    <>
      {/* Floating trigger bubble */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Tooltip label — visible when closed */}
        {!isOpen && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-navy-900 shadow-lg animate-bounce-slow"
            style={{
              background: 'linear-gradient(135deg, #C9A84C 0%, #D4B866 100%)',
              boxShadow: '0 4px 20px rgba(201,168,76,0.45)',
              letterSpacing: '0.02em',
            }}
          >
            <span>💬</span>
            <span>Talk to Us</span>
          </div>
        )}

        {/* Main bubble button */}
        <button
          id="contact-bubble-trigger"
          onClick={() => { setIsOpen(o => !o); setStatus('idle'); }}
          aria-label={isOpen ? 'Close contact form' : 'Open contact form'}
          className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:ring-offset-2"
          style={{
            background: isOpen
              ? 'linear-gradient(135deg, #1a3560 0%, #234a85 100%)'
              : 'linear-gradient(135deg, #C9A84C 0%, #A8832A 100%)',
            boxShadow: isOpen
              ? '0 8px 32px rgba(26,53,96,0.45)'
              : '0 8px 32px rgba(201,168,76,0.55)',
            transform: isOpen ? 'rotate(45deg) scale(1.05)' : 'rotate(0deg) scale(1)',
          }}
        >
          {/* Pulse ring */}
          {!isOpen && (
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-30"
              style={{ background: 'rgba(201,168,76,0.6)' }}
            />
          )}
          <Icon
            name={isOpen ? 'XMarkIcon' : 'ChatBubbleLeftEllipsisIcon'}
            size={24}
            className="text-white relative z-10"
          />
        </button>
      </div>

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        className="fixed bottom-28 right-6 z-50 w-[calc(100vw-3rem)] max-w-sm transition-all duration-300 origin-bottom-right"
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(20px)',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        <div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: '#fff',
            border: '1.5px solid rgba(201,168,76,0.3)',
            boxShadow: '0 20px 60px rgba(26,53,96,0.18), 0 4px 16px rgba(201,168,76,0.12)',
          }}
        >
          {/* Header */}
          <div
            className="px-5 py-4"
            style={{ background: 'linear-gradient(135deg, #1a3560 0%, #234a85 100%)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(201,168,76,0.2)', border: '1px solid rgba(201,168,76,0.4)' }}
              >
                <Icon name="UserIcon" size={18} className="text-gold-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">Personal Contact Request</p>
                <p className="text-white/60 text-xs mt-0.5">We'll reach out to you directly</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            {status === 'success' ? (
              <div className="py-6 flex flex-col items-center text-center gap-3">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '2px solid rgba(34,197,94,0.3)' }}
                >
                  <Icon name="CheckCircleIcon" size={28} className="text-green-500" />
                </div>
                <div>
                  <p className="font-semibold text-navy-900 text-sm">Message Sent!</p>
                  <p className="text-navy-700/60 text-xs mt-1 leading-relaxed">
                    Our support team will contact you personally within 24 hours.
                  </p>
                </div>
                <button
                  onClick={() => { setStatus('idle'); setIsOpen(false); }}
                  className="mt-1 text-xs text-gold-600 hover:text-gold-700 font-medium underline underline-offset-2"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <p className="text-navy-700/70 text-xs leading-relaxed mb-4">
                  Interested in CourtCraft Advocate but prefer a personal conversation? Leave your details and our team will contact you directly.
                </p>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-navy-800 mb-1">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="Your full name"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-navy-200 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent text-navy-900 placeholder-navy-400/50"
                      style={{ fontSize: '16px' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-navy-800 mb-1">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="your@email.com"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-navy-200 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent text-navy-900 placeholder-navy-400/50"
                      style={{ fontSize: '16px' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-navy-800 mb-1">
                      Phone Number <span className="text-navy-400/50 font-normal">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+44 7700 000000"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-navy-200 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent text-navy-900 placeholder-navy-400/50"
                      style={{ fontSize: '16px' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-navy-800 mb-1">
                      Brief Message <span className="text-navy-400/50 font-normal">(optional)</span>
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Tell us a little about your situation..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-navy-200 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent text-navy-900 placeholder-navy-400/50 resize-none"
                      style={{ fontSize: '16px' }}
                    />
                  </div>

                  {status === 'error' && (
                    <p className="text-red-500 text-xs">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full py-2.5 rounded-lg text-sm font-semibold text-navy-900 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{
                      background: 'linear-gradient(135deg, #C9A84C 0%, #A8832A 100%)',
                      boxShadow: '0 4px 14px rgba(201,168,76,0.35)',
                    }}
                  >
                    {status === 'sending' ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Sending…
                      </>
                    ) : (
                      <>
                        <Icon name="PaperAirplaneIcon" size={16} className="text-navy-900" />
                        Request Personal Contact
                      </>
                    )}
                  </button>
                </form>

                <p className="text-center text-navy-400/50 text-xs mt-3">
                  🔒 Your details are kept private and never shared.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2.5s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default ContactBubble;
