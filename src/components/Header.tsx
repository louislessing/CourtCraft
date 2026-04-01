'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';

const Header: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    if (mobileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const navLinks = [
    { label: 'About', href: '/about' },
    { label: 'Templates', href: '/templates' },
    { label: 'Pricing', href: '/homepage#pricing' },
  ];

  return (
    <header
      ref={menuRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'glass-navy shadow-navy py-2 sm:py-3'
          : 'bg-white/90 backdrop-blur-md border-b border-navy-900/08 py-3 sm:py-4 lg:py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/homepage" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
          <AppLogo
            size={28}
            iconName="ScaleIcon"
            className="text-gold-500"
          />
          <div className="flex flex-col">
            <span className={`font-display font-900 text-sm sm:text-base lg:text-lg tracking-tight leading-none ${scrolled ? 'text-white' : 'text-navy-900'}`}>
              Court<span className="text-gold-500">Craft</span>
            </span>
            <span className={`label-tag opacity-70 leading-none ${scrolled ? 'text-gold-400' : 'text-gold-600'}`} style={{ fontSize: '7px' }}>
              Advocate
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`text-xs font-bold tracking-widest uppercase transition-colors hover:text-gold-500 ${scrolled ? 'text-white/60' : 'text-navy-700/70'}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden lg:flex items-center gap-3 xl:gap-4">
          <a
            href="mailto:support@courtcraftadvocate.com"
            className={`flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase transition-colors hover:text-gold-500 ${scrolled ? 'text-white/60' : 'text-navy-700/70'}`}
            aria-label="Contact support"
          >
            <Icon name="EnvelopeIcon" size={14} />
            <span className="hidden xl:inline">Contact</span>
          </a>
          <Link href="/sign-in" className={`btn-outline text-xs py-2.5 px-5 xl:py-3 xl:px-6 ${scrolled ? 'text-white border-white/20 hover:border-gold-500 hover:text-gold-400' : ''}`}>
            Sign In
          </Link>
          <Link href="/register" className="btn-gold text-xs py-2.5 px-5 xl:py-3 xl:px-6">
            Register Now
          </Link>
        </div>

        {/* Mobile: Sign In + Menu Toggle */}
        <div className="lg:hidden flex items-center gap-2">
          <Link
            href="/sign-in"
            className={`text-xs font-bold tracking-wide uppercase px-3 py-2 rounded-full border transition-colors ${
              scrolled
                ? 'text-white/70 border-white/20 hover:border-gold-500 hover:text-gold-400' :'text-navy-700 border-navy-900/20 hover:border-gold-500 hover:text-gold-600'
            }`}
          >
            Sign In
          </Link>
          <button
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors flex-shrink-0 ${scrolled ? 'bg-navy-700 border-navy-600 text-white' : 'bg-white border-navy-900/15 text-navy-900'}`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            <Icon name={mobileOpen ? 'XMarkIcon' : 'Bars3Icon'} size={20} />
          </button>
        </div>
      </div>

      {/* Mobile Menu — slide down */}
      <div
        className={`lg:hidden border-t overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        } ${scrolled ? 'glass-dark border-white/10' : 'bg-white border-navy-900/10 shadow-xl'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`font-display font-700 text-sm uppercase tracking-widest hover:text-gold-500 transition-colors py-3 px-2 border-b rounded-lg hover:bg-gold-500/5 ${scrolled ? 'text-white/70 border-white/05' : 'text-navy-700/70 border-navy-900/08'}`}
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className={`font-display font-700 text-sm uppercase tracking-widest hover:text-gold-500 transition-colors py-3 px-2 border-b rounded-lg hover:bg-gold-500/5 ${scrolled ? 'text-white/70 border-white/05' : 'text-navy-700/70 border-navy-900/08'}`}
            onClick={() => setMobileOpen(false)}
          >
            Dashboard
          </Link>
          <a
            href="mailto:support@courtcraftadvocate.com"
            className={`flex items-center gap-2 font-display font-700 text-sm uppercase tracking-widest hover:text-gold-500 transition-colors py-3 px-2 border-b rounded-lg hover:bg-gold-500/5 ${scrolled ? 'text-white/70 border-white/05' : 'text-navy-700/70 border-navy-900/08'}`}
            onClick={() => setMobileOpen(false)}
          >
            <Icon name="EnvelopeIcon" size={15} />
            Contact Support
          </a>
          <div className={`flex flex-col gap-3 pt-4 pb-2 border-t ${scrolled ? 'border-white/10' : 'border-navy-900/10'}`}>
            <Link href="/register" className="btn-gold text-center justify-center w-full" onClick={() => setMobileOpen(false)}>
              Register Now
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;