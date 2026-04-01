import React from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackButton from '@/components/ui/BackButton';

export const metadata = {
  title: 'Privacy Policy | CourtCraft Advocate',
  description: 'Privacy Policy for CourtCraft Advocate — how we collect, use, and protect your personal data in accordance with UK GDPR and the Data Protection Act 2018.',
};

export default function PrivacyPage() {
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
            <h1 className="text-3xl sm:text-4xl font-display font-900 tracking-tight mb-4 text-navy-900">Privacy Policy</h1>
            <p className="text-sm text-navy-500">Last updated: 16 March 2026</p>
          </div>

          <div className="prose prose-sm sm:prose-base max-w-none space-y-10 text-navy-700 leading-relaxed">

            {/* 1 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">1. Who We Are</h2>
              <p>
                CourtCraft Advocate Ltd ("<strong>CourtCraft</strong>", "<strong>we</strong>", "<strong>us</strong>", "<strong>our</strong>") operates the website at{' '}
                <a href="https://courtcraftadvocate.com" className="text-gold-600 hover:text-gold-700 underline">courtcraftadvocate.com</a>{' '}
                and the CourtCraft Advocate platform. We are registered in England and Wales.
              </p>
              <p className="mt-3">
                We act as the <strong>data controller</strong> for personal data processed through this platform. If you have any questions about this policy or your personal data, please contact us at{' '}
                <a href="mailto:privacy@courtcraftadvocate.com" className="text-gold-600 hover:text-gold-700 underline">privacy@courtcraftadvocate.com</a>.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">2. What Data We Collect</h2>
              <p>We collect and process the following categories of personal data:</p>
              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li><strong>Account data:</strong> name, email address, and password (stored as a secure hash) when you register.</li>
                <li><strong>Profile data:</strong> any additional information you choose to add to your profile, such as your role in proceedings.</li>
                <li><strong>Case data:</strong> information you enter about your family law case, including court dates, case references, and notes. This data is stored solely to provide the service to you.</li>
                <li><strong>Document data:</strong> documents you create or upload using the Document Builder tool.</li>
                <li><strong>Payment data:</strong> billing information processed securely by Stripe. We do not store full card details on our servers.</li>
                <li><strong>Communication data:</strong> messages you send to us via email or the platform's support features.</li>
                <li><strong>Usage data:</strong> pages visited, features used, and device/browser information collected via analytics tools to improve the platform.</li>
                <li><strong>McKenzie Friend session data:</strong> information relating to any McKenzie Friend support sessions you book through the platform.</li>
              </ul>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">3. How We Use Your Data</h2>
              <p>We use your personal data for the following purposes and on the following legal bases:</p>
              <div className="mt-3 space-y-3">
                {[
                  { title: 'Providing the Service', basis: 'Performance of a contract.', desc: 'We process your account, case, and document data to deliver the CourtCraft platform features you have subscribed to.' },
                  { title: 'Payment Processing', basis: 'Performance of a contract.', desc: 'We share billing data with Stripe to process subscription payments securely.' },
                  { title: 'Communications', basis: 'Legitimate interests / consent.', desc: 'We send transactional emails (account verification, court date reminders, booking confirmations) and, where you have opted in, product updates.' },
                  { title: 'Platform Improvement', basis: 'Legitimate interests.', desc: 'We analyse aggregated, anonymised usage data to improve features and fix issues.' },
                  { title: 'Legal Compliance', basis: 'Legal obligation.', desc: 'We may process data to comply with applicable laws, court orders, or regulatory requirements.' },
                ]?.map((item) => (
                  <div key={item?.title} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="font-700 text-navy-900 text-sm mb-1">{item?.title}</p>
                    <p className="text-xs text-navy-600">Legal basis: <em>{item?.basis}</em> {item?.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">4. Special Category Data</h2>
              <p>
                Family law proceedings often involve sensitive personal data, including information about children, health, finances, and domestic circumstances. We treat all case data you enter as <strong>special category data</strong> and apply enhanced security measures accordingly. We process this data solely on the basis of your <strong>explicit consent</strong> and to provide the service you have requested.
              </p>
              <p className="mt-3">
                We strongly advise you not to enter the personal data of third parties (including your children or the other party) beyond what is strictly necessary for your own case preparation.
              </p>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">5. Data Sharing</h2>
              <p>We do not sell your personal data. We share data only with trusted third-party processors who are contractually bound to protect it:</p>
              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li><strong>Supabase</strong> — database hosting and authentication (EU data centres).</li>
                <li><strong>Stripe</strong> — payment processing (PCI-DSS compliant).</li>
                <li><strong>Resend</strong> — transactional email delivery.</li>
                <li><strong>OpenAI</strong> — AI-assisted document drafting features. Prompts you submit may be processed by OpenAI's API; we do not use your data to train OpenAI models.</li>
                <li><strong>Vercel / Rocket.new</strong> — platform hosting and deployment infrastructure.</li>
              </ul>
              <p className="mt-3">
                We may also disclose data where required by law, to protect the rights or safety of any person, or in connection with a business transfer (in which case you will be notified).
              </p>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">6. Data Retention</h2>
              <p>We retain your personal data for as long as your account is active or as needed to provide the service. Specifically:</p>
              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li>Account data is retained until you delete your account.</li>
                <li>Case and document data is retained for the duration of your subscription plus 12 months, after which it is permanently deleted unless you request earlier deletion.</li>
                <li>Payment records are retained for 7 years to comply with HMRC requirements.</li>
                <li>Communication records are retained for 3 years.</li>
              </ul>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">7. Your Rights Under UK GDPR</h2>
              <p>Under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018, you have the following rights:</p>
              <ul className="list-disc pl-5 mt-3 space-y-2">
                <li><strong>Right of access</strong> — request a copy of the personal data we hold about you.</li>
                <li><strong>Right to rectification</strong> — ask us to correct inaccurate or incomplete data.</li>
                <li><strong>Right to erasure</strong> — request deletion of your data in certain circumstances ("right to be forgotten").</li>
                <li><strong>Right to restriction</strong> — ask us to restrict processing of your data.</li>
                <li><strong>Right to data portability</strong> — receive your data in a structured, machine-readable format.</li>
                <li><strong>Right to object</strong> — object to processing based on legitimate interests or for direct marketing.</li>
                <li><strong>Rights related to automated decision-making</strong> — we do not make solely automated decisions with legal or significant effects on you.</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, email us at{' '}
                <a href="mailto:privacy@courtcraftadvocate.com" className="text-gold-600 hover:text-gold-700 underline">privacy@courtcraftadvocate.com</a>. We will respond within 30 days. You also have the right to lodge a complaint with the{' '}
                <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-gold-600 hover:text-gold-700 underline">Information Commissioner's Office (ICO)</a>.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">8. Cookies</h2>
              <p>
                We use essential cookies to keep you logged in and maintain your session. We may also use analytics cookies (e.g. Google Analytics) to understand how the platform is used. You can control non-essential cookies through your browser settings. By continuing to use the platform, you consent to our use of essential cookies.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">9. Security</h2>
              <p>
                We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, loss, or disclosure. These include encrypted data transmission (TLS), hashed passwords, row-level security on our database, and access controls. However, no internet transmission is completely secure, and we cannot guarantee absolute security.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">10. Children's Data</h2>
              <p>
                Our platform is intended for adults (18+) who are parties to family law proceedings. We do not knowingly collect personal data directly from children. If you believe a child has provided us with personal data without appropriate consent, please contact us immediately.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">11. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes by email or by a prominent notice on the platform. The "Last updated" date at the top of this page reflects the most recent revision.
              </p>
            </section>

            {/* 12 */}
            <section>
              <h2 className="text-lg sm:text-xl font-display font-800 text-navy-900 mb-3">12. Contact Us</h2>
              <p>
                For any privacy-related queries or to exercise your rights, please contact our Data Protection contact at:
              </p>
              <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
                <p className="font-700 text-navy-900">CourtCraft Advocate Ltd</p>
                <p className="text-navy-600 mt-1">Email: <a href="mailto:privacy@courtcraftadvocate.com" className="text-gold-600 hover:text-gold-700 underline">privacy@courtcraftadvocate.com</a></p>
                <p className="text-navy-600">Website: <a href="https://courtcraftadvocate.com" className="text-gold-600 hover:text-gold-700 underline">courtcraftadvocate.com</a></p>
              </div>
            </section>

          </div>

          {/* Back link */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <Link href="/homepage" className="text-sm text-gold-600 hover:text-gold-700 transition-colors">
              ← Back to Home
            </Link>
          </div>

          {/* Copyright */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-navy-400 leading-relaxed text-center">
              © {new Date()?.getFullYear()} CourtCraft Advocate™ Ltd. All rights reserved.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
