'use client';

import React, { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

const DisclaimerSection: React.FC = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('revealed');
        });
      },
      { threshold: 0.1 }
    );

    const elements = sectionRef.current?.querySelectorAll('.reveal-hidden');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-10 sm:py-16 px-4 sm:px-6 bg-gray-50" id="disclaimer">
      <div className="max-w-4xl mx-auto">
        <div className="reveal-hidden rounded-2xl p-6 sm:p-8" style={{ background: '#fafbfc', border: '1px solid rgba(26,53,96,0.16)', boxShadow: '0 4px 24px rgba(26,53,96,0.06)' }}>
          {/* Header */}
          <div className="flex items-start gap-4 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gold-50 border border-gold-300 flex items-center justify-center flex-shrink-0">
              <Icon name="ScaleIcon" size={18} className="text-gold-600" />
            </div>
            <div>
              <span className="badge badge-gold mb-2">Important Service Information</span>
              <h2 className="font-display font-800 text-base sm:text-lg text-navy-900">
                Service Scope & Legal Boundaries
              </h2>
            </div>
          </div>

          {/* Core disclaimer */}
          <div className="space-y-3 text-sm text-navy-700 leading-relaxed">
            <p>
              <strong className="text-gold-600">CourtCraft Advocate™</strong> is a technology-enabled McKenzie Friend lay support platform operating within the boundaries of the <strong className="text-navy-900">Practice Guidance (McKenzie Friends)</strong> (July 2010).
            </p>
            <p>
              <strong className="text-gold-600">We are not</strong> a law firm, solicitors' practice, or any form of regulated legal services provider. We do not provide legal advice, legal representation, or any reserved legal activity as defined under the <strong className="text-navy-900">Legal Services Act 2007</strong>.
            </p>

            {expanded && (
              <>
                <p>
                  All services constitute <strong className="text-gold-600">lay support services</strong> only: moral support, note-taking, document organisation, court procedure guidance, and quiet assistance during proceedings.
                </p>
                <p>
                  <strong className="text-gold-600">AI-generated content</strong> is general informational guidance only — not legal advice tailored to your specific circumstances. Seek independent legal advice from a regulated solicitor for case-specific matters.
                </p>
                <p>
                  Payments are processed securely via Stripe. Data is processed in accordance with <strong className="text-gold-600">UK GDPR</strong> and the Data Protection Act 2018.
                </p>
              </>
            )}
          </div>

          {/* Expand button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 mt-4 text-gold-600 text-sm font-display font-700 hover:text-gold-500 transition-colors"
          >
            <Icon name={expanded ? 'ChevronUpIcon' : 'ChevronDownIcon'} size={16} />
            {expanded ? 'Show Less' : 'Read Full Disclaimer'}
          </button>

          {/* Compliance badges */}
          <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-gray-200">
            {[
              { icon: 'ScaleIcon', text: 'Legal Services Act 2007 Compliant' },
              { icon: 'ShieldCheckIcon', text: 'McKenzie Friends Practice Guidance 2010' },
              { icon: 'LockClosedIcon', text: 'UK GDPR Compliant' },
              { icon: 'DocumentCheckIcon', text: 'Not a Regulated Law Firm' },
            ].map((badge) => (
              <div key={badge.text} className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1.5">
                <Icon name={badge.icon as any} size={12} className="text-gold-500" />
                <span className="label-tag text-navy-500" style={{ fontSize: '9px' }}>{badge.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DisclaimerSection;