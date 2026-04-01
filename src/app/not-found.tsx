'use client';

import React from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <h1 className="text-9xl font-display font-900 text-navy-900 opacity-10">404</h1>
          </div>
        </div>

        <div className="w-16 h-16 rounded-2xl bg-gold-50 border border-gold-300 flex items-center justify-center mx-auto mb-6">
          <Icon name="ExclamationTriangleIcon" size={32} className="text-gold-500" />
        </div>

        <h2 className="text-2xl font-display font-800 text-navy-900 mb-3">Page Not Found</h2>
        <p className="text-navy-600 text-sm leading-relaxed mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back on track.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/homepage"
            className="btn-gold text-sm py-3 px-8 justify-center"
          >
            <Icon name="HomeIcon" size={16} className="text-navy-900" />
            Back to Home
          </Link>
          <Link
            href="/dashboard"
            className="btn-outline text-sm py-3 px-8 justify-center"
          >
            <Icon name="Squares2X2Icon" size={16} />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}