'use client';

import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';

const Footer: React.FC = () => {
  return (
    <footer className="bg-navy-900 border-t border-white/10 py-10 sm:py-14 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Main grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10">
          {/* Col 1: Brand */}
          <div className="flex flex-col gap-3 sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <AppLogo size={30} iconName="ScaleIcon" className="text-gold-400" />
              <span className="font-display font-900 text-lg tracking-tight text-white">
                Court<span className="text-gold-500">Craft</span>
              </span>
            </div>
            <p className="text-xs font-display font-700 text-gold-400 tracking-widest uppercase">
              Prepare. Represent. Prevail.™
            </p>
            <p className="text-xs text-white/50 leading-relaxed mt-1 max-w-xs">
              McKenzie Friend lay support services. Not a law firm. CourtCraft Advocate™ is a registered trade name of CourtCraft Advocate Ltd.
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold tracking-widest uppercase text-white/40 mb-2">Navigation</h4>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-1">
              {[
                { label: 'Home', href: '/homepage' },
                { label: 'About', href: '/about' },
                { label: 'Free Templates', href: '/templates' },
                { label: 'Resources', href: '/resources' },
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Sign Up', href: '/register' },
              ].map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-xs font-bold tracking-widest uppercase text-white/50 hover:text-gold-400 transition-colors py-1.5 w-fit"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Col 3: International Coverage */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="GlobeAltIcon" size={16} className="text-gold-400 flex-shrink-0" />
              <h4 className="text-xs font-bold tracking-widest uppercase text-white/40">Coverage</h4>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">
              Pricing and documentation automatically adapt to your jurisdiction.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {['🇬🇧 UK', '🇺🇸 USA', '🇨🇦 Canada', '🇦🇺 Australia', '🇳🇿 NZ', '🇮🇪 Ireland'].map((country) => (
                <span key={country} className="dark-context badge badge-gold text-xs">{country}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <a
              href="mailto:support@courtcraftadvocate.com"
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-navy-700 border border-navy-600 text-white/50 hover:text-gold-400 hover:border-gold-500 transition-all text-xs font-bold tracking-wide w-full sm:w-auto justify-center sm:justify-start"
              aria-label="Contact support"
            >
              <Icon name="EnvelopeIcon" size={13} className="flex-shrink-0" />
              <span>support@courtcraftadvocate.com</span>
            </a>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-xs font-bold text-white/55 tracking-widest uppercase">
              <Link href="/privacy" className="hover:text-gold-400 transition-colors py-1">Privacy</Link>
              <span className="text-white/25">·</span>
              <Link href="/terms" className="hover:text-gold-400 transition-colors py-1">Terms</Link>
              <span className="text-white/25">·</span>
              <Link href="/disclaimer" className="hover:text-gold-400 transition-colors py-1">Disclaimer</Link>
            </div>
          </div>
          <p className="text-xs font-bold text-white/45 tracking-widest uppercase text-center">
            © {new Date().getFullYear()} CourtCraft Advocate<Link href="/admin/login" className="cursor-default" tabIndex={-1} aria-hidden="true">™</Link> Ltd.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;