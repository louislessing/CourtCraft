'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface BackButtonProps {
  className?: string;
  label?: string;
}

export default function BackButton({ className = '', label = 'Back' }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className={`inline-flex items-center gap-2 text-sm font-medium text-navy-700 hover:text-gold-600 transition-colors duration-200 group ${className}`}
      aria-label="Go back to previous page"
    >
      <svg
        className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
