'use client';

import React, { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface SuccessModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  subMessage?: string;
  ctaLabel?: string;
  onCta?: () => void;
  onClose?: () => void;
  autoCloseSecs?: number;
  icon?: string;
  variant?: 'gold' | 'green';
}

export default function SuccessModal({
  isOpen,
  title,
  message,
  subMessage,
  ctaLabel,
  onCta,
  onClose,
  autoCloseSecs,
  icon = 'CheckCircleIcon',
  variant = 'green',
}: SuccessModalProps) {
  const [visible, setVisible] = useState(false);
  const [particles] = useState(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.6,
      size: Math.random() * 6 + 4,
      color: i % 3 === 0 ? '#c9a84c' : i % 3 === 1 ? '#4ade80' : '#60a5fa',
    }))
  );

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && autoCloseSecs) {
      const timer = setTimeout(() => {
        onClose?.();
      }, autoCloseSecs * 1000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseSecs, onClose]);

  if (!isOpen) return null;

  const ringColor = variant === 'gold' ? 'bg-gold-500 bg-opacity-20' : 'bg-green-500 bg-opacity-20';
  const iconColor = variant === 'gold' ? 'text-gold-400' : 'text-green-400';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(5,10,24,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm surface-card rounded-3xl p-6 sm:p-8 text-center overflow-hidden"
        style={{
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(20px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Particle burst */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: `${p.x}%`,
                top: '40%',
                width: p.size,
                height: p.size,
                background: p.color,
                opacity: visible ? 0 : 0.8,
                transform: visible ? `translateY(-${60 + Math.random() * 40}px) scale(0)` : 'translateY(0) scale(1)',
                transition: `all 0.8s ease ${p.delay}s`,
              }}
            />
          ))}
        </div>

        {/* Icon ring with pulse */}
        <div className="relative mx-auto mb-5 w-20 h-20">
          <div
            className={`absolute inset-0 rounded-full ${ringColor}`}
            style={{
              transform: visible ? 'scale(1)' : 'scale(0)',
              transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.1s',
            }}
          />
          <div
            className={`absolute inset-0 rounded-full ${ringColor} animate-ping`}
            style={{ animationDuration: '2s', opacity: 0.4 }}
          />
          <div
            className="relative w-20 h-20 rounded-full flex items-center justify-center"
            style={{
              transform: visible ? 'scale(1) rotate(0deg)' : 'scale(0) rotate(-90deg)',
              transition: 'transform 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.15s',
            }}
          >
            <Icon name={icon as any} size={36} className={iconColor} />
          </div>
        </div>

        {/* Text */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'all 0.4s ease 0.3s',
          }}
        >
          <h2 className="font-display font-800 text-2xl text-white mb-2">{title}</h2>
          <p className="text-sm text-white text-opacity-60 leading-relaxed">{message}</p>
          {subMessage && (
            <p className="text-xs text-white text-opacity-35 mt-2">{subMessage}</p>
          )}
        </div>

        {/* CTA */}
        {ctaLabel && onCta && (
          <button
            onClick={onCta}
            className="btn-gold justify-center py-3.5 w-full mt-5 sm:mt-6 text-sm sm:text-base"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'all 0.4s ease 0.45s',
              minHeight: '48px',
            }}
          >
            {ctaLabel}
          </button>
        )}

        {/* Auto-close progress bar */}
        {autoCloseSecs && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-navy-700 rounded-b-3xl overflow-hidden">
            <div
              className={`h-full ${variant === 'gold' ? 'bg-gold-500' : 'bg-green-500'}`}
              style={{
                width: visible ? '0%' : '100%',
                transition: `width ${autoCloseSecs}s linear 0.5s`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
