'use client';

import React from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackButton from '@/components/ui/BackButton';

const DisclaimerPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Back button */}
          <div className="mb-8">
            <BackButton />
          </div>

          {/* Header */}
          <div className="flex items-start gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gold-50 border border-gold-300 flex items-center justify-center flex-shrink-0 mt-1">
              <Icon name="ScaleIcon" size={22} className="text-gold-600" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="badge badge-gold">Important Service Information</span>
                <span className="badge badge-gold">Legally Compliant</span>
              </div>
              <h1 className="font-display font-800 text-2xl sm:text-3xl text-navy-900">
                CourtCraft Advocate™ — Service Scope &amp; Legal Disclaimer
              </h1>
              <p className="text-xs text-navy-400 mt-2 font-display font-700 tracking-widest uppercase">
                Last updated: March 2026
              </p>
            </div>
          </div>

          {/* Disclaimer content */}
          <div className="disclaimer-box space-y-5 text-sm text-navy-700 leading-relaxed">

            <p>
              <strong className="text-gold-600">CourtCraft Advocate™</strong> is a technology-enabled McKenzie Friend lay support platform operating strictly within the boundaries of the{' '}
              <strong className="text-navy-900">Practice Guidance (McKenzie Friends)</strong> issued jointly by the Master of the Rolls and the President of the Family Division (July 2010), as applied in all civil and family proceedings before the Court of Appeal (Civil Division), the High Court of Justice, the County Courts, and Family Proceedings Courts in the Magistrates' Courts.
            </p>

            <p>
              <strong className="text-gold-600">We are not, and do not hold ourselves out to be</strong>, a law firm, solicitors' practice, barristers' chambers, or any form of regulated legal services provider. We do not provide legal advice, legal representation, or any reserved legal activity as defined under the{' '}
              <strong className="text-navy-900">Legal Services Act 2007</strong> — including but not limited to: the exercise of rights of audience, the conduct of litigation, reserved instrument activities, probate activities, notarial activities, or the administration of oaths.
            </p>

            <p>
              All services provided by CourtCraft Advocate™ constitute <strong className="text-gold-600">lay support services</strong> only. These services encompass: the provision of moral support to litigants in person; note-taking during hearings; assistance with document organisation and case preparation; guidance on court procedures; and quiet assistance during proceedings — none of which constitute regulated legal activity under applicable legislation.
            </p>

            <p>
              <strong className="text-gold-600">McKenzie Friend permitted activities</strong>, as established in McKenzie v McKenzie [1970] 3 All ER 1034 and affirmed in subsequent Court of Appeal authority, include: providing moral support, taking notes, helping with case papers, and quietly giving advice — but do not extend to addressing the court, examining witnesses, or conducting litigation, except where the court specifically grants rights of audience by judicial order in exceptional circumstances.
            </p>

            <p>
              <strong className="text-gold-600">Communications</strong> between CourtCraft Advocate™ and its members do not attract legal professional privilege. Members are advised that any information shared with CourtCraft Advocate™ or its McKenzie Friends may be disclosable in proceedings. We maintain strict confidentiality obligations contractually, but these are distinct from legal privilege.
            </p>

            <p>
              <strong className="text-gold-600">AI-generated content</strong> provided through our platform constitutes general informational guidance only. It does not constitute legal advice tailored to your specific circumstances. You should seek independent legal advice from a regulated solicitor or barrister for case-specific matters.
            </p>

            <p>
              All fees charged by CourtCraft Advocate™ are <strong className="text-gold-600">exclusively for lay McKenzie Friend support services</strong>. No portion of any fee constitutes payment for legal advice, legal representation, or any regulated legal activity. All prices displayed in GBP unless your location is detected as an alternative jurisdiction, whereupon local currency equivalents are shown for convenience.
            </p>

            <p>
              Payments are processed securely via Stripe. CourtCraft Advocate™ Ltd is registered in England and Wales. Data is processed in accordance with the <strong className="text-gold-600">UK GDPR</strong> and the Data Protection Act 2018. You have the right to access, correct, and erase your personal data at any time.
            </p>

            {/* For legal professionals box */}
            <div className="mt-6 p-4 sm:p-5 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-sm text-navy-600 leading-relaxed">
                <strong className="text-gold-600">For legal professionals:</strong> CourtCraft Advocate™ operates as a lay support service provider, not a competitor to regulated legal services. Our platform is designed to assist the 80% of family court litigants who appear without legal representation — individuals who, by definition, are not your clients. We actively encourage members to seek regulated legal advice where they have the means to do so, and we signpost regulated providers throughout our platform. We welcome constructive dialogue with the legal profession and are committed to operating within all applicable regulatory frameworks.
              </p>
            </div>

            {/* Compliance badges */}
            <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-gray-200">
              {[
                { icon: 'ScaleIcon', text: 'Legal Services Act 2007 Compliant' },
                { icon: 'ShieldCheckIcon', text: 'Practice Guidance (McKenzie Friends) 2010' },
                { icon: 'LockClosedIcon', text: 'UK GDPR Compliant' },
                { icon: 'DocumentCheckIcon', text: 'Not a Regulated Law Firm' },
              ].map((badge) => (
                <div key={badge.text} className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-2">
                  <Icon name={badge.icon as any} size={12} className="text-gold-500" />
                  <span className="label-tag text-navy-500" style={{ fontSize: '9px' }}>{badge.text}</span>
                </div>
              ))}
            </div>

            {/* Footer links */}
            <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t border-gray-200 text-xs font-display font-700 text-navy-400 tracking-widest uppercase">
              <Link href="/privacy" className="hover:text-gold-600 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-gold-600 transition-colors">Terms of Service</Link>
              <Link href="/homepage" className="hover:text-gold-600 transition-colors">Home</Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DisclaimerPage;
