import React from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackButton from '@/components/ui/BackButton';

export const metadata = {
  title: 'Terms of Service | CourtCraft Advocate',
  description: 'Terms of Service for CourtCraft Advocate — the conditions under which you may use our UK family law self-advocacy platform.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <BackButton />
          </div>
          {/* Page Header */}
          <div className="mb-10 sm:mb-14">
            <p className="text-xs font-display font-700 text-gold-600 tracking-widest uppercase mb-3">Legal</p>
            <h1 className="text-3xl sm:text-4xl font-display font-900 tracking-tight mb-4 text-navy-900">Terms of Service</h1>
            <p className="text-sm text-navy-500">Last updated: 16 March 2026</p>
          </div>

          {/* Important Notice */}
          <div className="mb-10 bg-gold-100 border border-gold-300 rounded-xl p-5">
            <p className="text-sm font-700 text-gold-700 mb-1">Important Notice</p>
            <p className="text-sm text-navy-700 leading-relaxed">
              CourtCraft Advocate is a <strong>self-help and lay support platform</strong>. It does not provide legal advice and is not a substitute for a qualified solicitor or barrister. Nothing on this platform constitutes legal advice. You should seek independent legal advice for your specific circumstances.
            </p>
          </div>

          <div className="prose prose-sm sm:prose-base max-w-none space-y-10 leading-relaxed text-navy-700">

            {/* 1 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">1. About CourtCraft Advocate</h2>
              <p>
                These Terms of Service ("<strong>Terms</strong>") govern your use of the CourtCraft Advocate platform, website, and services (collectively, the "<strong>Service</strong>") operated by CourtCraft Advocate Ltd ("<strong>CourtCraft</strong>", "<strong>we</strong>", "<strong>us</strong>").
              </p>
              <p className="mt-3">
                By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, you must not use the Service.
              </p>
              <p className="mt-3">
                CourtCraft Advocate is designed to assist litigants in person (LIPs) and self-representing parties in England and Wales family court proceedings. Our McKenzie Friend support services are provided by lay advisers and are not regulated legal services.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">2. Eligibility</h2>
              <p>To use the Service, you must:</p>
              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Be at least 18 years of age.</li>
                <li>Be a resident of the United Kingdom or be involved in proceedings in the courts of England and Wales.</li>
                <li>Have the legal capacity to enter into a binding contract.</li>
                <li>Not be prohibited from using the Service under any applicable law.</li>
              </ul>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">3. Account Registration</h2>
              <p>
                You must register for an account to access most features of the Service. You agree to:
              </p>
              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Provide accurate, current, and complete information during registration.</li>
                <li>Maintain and promptly update your account information.</li>
                <li>Keep your password confidential and not share it with any third party.</li>
                <li>Notify us immediately at <a href="mailto:support@courtcraftadvocate.com" className="text-gold-600 hover:text-gold-700 underline">support@courtcraftadvocate.com</a> if you suspect unauthorised access to your account.</li>
                <li>Accept responsibility for all activity that occurs under your account.</li>
              </ul>
              <p className="mt-3">
                We reserve the right to suspend or terminate accounts that provide false information or violate these Terms.
              </p>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">4. Subscription Plans and Payment</h2>
              <p>
                Access to certain features requires a paid subscription. By subscribing, you agree to the following:
              </p>
              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Subscription fees are charged in advance on a monthly or annual basis as selected.</li>
                <li>Payments are processed securely by Stripe. By providing payment details, you authorise us to charge the applicable fees.</li>
                <li>Subscriptions automatically renew unless cancelled at least 24 hours before the renewal date.</li>
                <li>You may cancel your subscription at any time through your account settings. Cancellation takes effect at the end of the current billing period; no partial refunds are issued for unused time.</li>
                <li>We reserve the right to change subscription prices with 30 days' notice. Continued use after the notice period constitutes acceptance of the new pricing.</li>
              </ul>
              <p className="mt-3">
                <strong>Refund Policy:</strong> We offer a 14-day money-back guarantee for new subscribers. If you are not satisfied within the first 14 days of your initial subscription, contact us at <a href="mailto:support@courtcraftadvocate.com" className="text-gold-600 hover:text-gold-700 underline">support@courtcraftadvocate.com</a> for a full refund. This does not affect your statutory rights as a consumer under UK law.
              </p>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">5. McKenzie Friend Services</h2>
              <p>
                CourtCraft Advocate facilitates the booking of McKenzie Friend lay support sessions. You acknowledge and agree that:
              </p>
              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>McKenzie Friends are lay advisers, not solicitors or barristers, and are not regulated by the Solicitors Regulation Authority (SRA) or the Bar Standards Board (BSB).</li>
                <li>A McKenzie Friend may assist you in court by taking notes, quietly giving advice, and helping you organise documents, but may not address the court on your behalf unless the court grants specific permission.</li>
                <li>The right to have a McKenzie Friend is subject to the court's discretion. We cannot guarantee that any court will permit a McKenzie Friend to attend or assist.</li>
                <li>Our McKenzie Friend services do not constitute legal representation or legal advice.</li>
                <li>Session fees are as displayed at the time of booking and are non-refundable except where a session is cancelled by us with less than 24 hours' notice.</li>
              </ul>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">6. AI-Assisted Features</h2>
              <p>
                The Service includes AI-assisted tools for document drafting and case preparation. You acknowledge that:
              </p>
              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>AI-generated content is provided as a starting point only and must be reviewed, verified, and adapted by you before use.</li>
                <li>AI tools do not provide legal advice and may produce inaccurate, incomplete, or outdated information.</li>
                <li>You are solely responsible for the accuracy and appropriateness of any documents you submit to a court or other party.</li>
                <li>You must not submit AI-generated content to a court without first reviewing it and satisfying yourself that it is accurate and appropriate.</li>
                <li>Prompts and inputs you provide to AI features may be processed by third-party AI providers (currently OpenAI) subject to their terms of service.</li>
              </ul>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">7. Acceptable Use</h2>
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Violate any applicable law or regulation, including the Family Procedure Rules 2010 or any court order.</li>
                <li>Harass, intimidate, or harm any other person.</li>
                <li>Upload or transmit malicious code, viruses, or harmful content.</li>
                <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure.</li>
                <li>Scrape, copy, or redistribute content from the Service without our written permission.</li>
                <li>Use the Service to provide legal services to third parties without appropriate authorisation.</li>
                <li>Misrepresent your identity or your relationship to any proceedings.</li>
                <li>Use the Service in any way that could bring CourtCraft Advocate into disrepute.</li>
              </ul>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">8. Intellectual Property</h2>
              <p>
                All content, features, and functionality of the Service — including but not limited to text, graphics, logos, software, and templates — are owned by CourtCraft Advocate™ Ltd or its licensors and are protected by UK and international intellectual property laws. The name "CourtCraft Advocate™" and the CourtCraft Advocate logo are trade marks of CourtCraft Advocate Ltd. Unauthorised use of these trade marks is strictly prohibited.
              </p>
              <p className="mt-3">
                You retain ownership of any case data, notes, and documents you create using the Service. By using the Service, you grant us a limited, non-exclusive licence to store and process your content solely to provide the Service to you.
              </p>
              <p className="mt-3">
                You may not reproduce, distribute, or create derivative works from our content without our prior written consent.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">9. Disclaimer of Warranties</h2>
              <p>
                The Service is provided on an "<strong>as is</strong>" and "<strong>as available</strong>" basis without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
              </p>
              <p className="mt-3">
                We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components. We do not warrant the accuracy, completeness, or suitability of any information provided through the Service for any particular legal purpose.
              </p>
              <p className="mt-3">
                Nothing in these Terms excludes or limits our liability for death or personal injury caused by our negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be excluded or limited under applicable UK law.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">10. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, CourtCraft Advocate Ltd shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, arising out of or in connection with your use of the Service.
              </p>
              <p className="mt-3">
                Our total aggregate liability to you for any claims arising under or in connection with these Terms shall not exceed the total amount paid by you to us in the 12 months preceding the claim.
              </p>
              <p className="mt-3">
                We are not liable for any outcome in your legal proceedings, whether or not you used our Service in preparation for those proceedings.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">11. Confidentiality of Court Proceedings</h2>
              <p>
                Family court proceedings in England and Wales are subject to strict confidentiality rules. You are responsible for ensuring that your use of the Service complies with any applicable court orders, reporting restrictions, or rules regarding the confidentiality of proceedings, including the Children Act 1989 and the Family Procedure Rules 2010.
              </p>
              <p className="mt-3">
                We strongly advise you not to share information about your proceedings on any public forum or social media platform.
              </p>
            </section>

            {/* 12 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">12. Termination</h2>
              <p>
                We may suspend or terminate your access to the Service at any time, with or without notice, if we reasonably believe you have violated these Terms or if required by law.
              </p>
              <p className="mt-3">
                You may terminate your account at any time by contacting us at <a href="mailto:support@courtcraftadvocate.com" className="text-gold-600 hover:text-gold-700 underline">support@courtcraftadvocate.com</a> or through your account settings. Upon termination, your right to use the Service ceases immediately.
              </p>
              <p className="mt-3">
                Sections 8, 9, 10, 13, and 14 of these Terms survive termination.
              </p>
            </section>

            {/* 13 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">13. Governing Law and Disputes</h2>
              <p>
                These Terms are governed by and construed in accordance with the laws of England and Wales. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.
              </p>
              <p className="mt-3">
                If you have a complaint about the Service, please contact us first at <a href="mailto:support@courtcraftadvocate.com" className="text-gold-600 hover:text-gold-700 underline">support@courtcraftadvocate.com</a>. We will endeavour to resolve complaints within 14 working days.
              </p>
            </section>

            {/* 14 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">14. Changes to These Terms</h2>
              <p>
                We may update these Terms from time to time. We will notify you of material changes by email or by a prominent notice on the platform at least 14 days before the changes take effect. Your continued use of the Service after the effective date constitutes acceptance of the revised Terms.
              </p>
            </section>

            {/* 15 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">15. Contact Us</h2>
              <p>If you have any questions about these Terms, please contact us:</p>
              <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
                <p className="font-700 text-navy-900">CourtCraft Advocate Ltd</p>
                <p className="text-navy-600 mt-1">Email: <a href="mailto:support@courtcraftadvocate.com" className="text-gold-600 hover:text-gold-700 underline">support@courtcraftadvocate.com</a></p>
                <p className="text-navy-600">Website: <a href="https://courtcraftadvocate.com" className="text-gold-600 hover:text-gold-700 underline">courtcraftadvocate.com</a></p>
              </div>
            </section>

          </div>

          {/* Back link */}
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap gap-6">
            <Link href="/homepage" className="text-sm text-gold-600 hover:text-gold-700 transition-colors">
              ← Back to Home
            </Link>
            <Link href="/privacy" className="text-sm text-gold-600 hover:text-gold-700 transition-colors">
              Privacy Policy →
            </Link>
          </div>

          {/* Copyright & Brand Protection */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-navy-400 leading-relaxed text-center">
              © {new Date()?.getFullYear()} CourtCraft Advocate™ Ltd. All rights reserved. CourtCraft Advocate™ is a trade mark of CourtCraft Advocate Ltd, registered in England and Wales. Unauthorised reproduction or use of the CourtCraft Advocate name or brand is strictly prohibited.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
