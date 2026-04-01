'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What is a McKenzie Friend and can I have one in my hearing?',
    answer:
      'A McKenzie Friend is a person who assists a litigant in person in court. They can help you organise documents, take notes, quietly advise you, and provide moral support. You have the right to request a McKenzie Friend in most civil and family proceedings in England and Wales.',
  },
  {
    question: 'Is CourtCraft Advocate™ a law firm or providing legal advice?',
    answer:
      'No. CourtCraft Advocate™ is not a law firm and does not provide legal advice. We provide AI-assisted tools, document templates, and McKenzie Friend support services to help you navigate court proceedings as a litigant in person. We strongly recommend consulting a qualified solicitor for complex legal matters.',
  },
  {
    question: 'How does the AI document builder work?',
    answer:
      'Our AI document builder uses Claude AI to help you draft court-ready documents such as position statements, witness statements, and C100 applications. You answer guided questions about your case, and the AI generates a structured draft. You can then review, edit, and download the document.',
  },
  {
    question: 'Is my data kept private and secure?',
    answer:
      'Yes. Your case information is stored securely using Supabase with row-level security — only you can access your data. We do not sell your data to third parties. All data is processed in compliance with UK GDPR.',
  },
  {
    question: 'Can I use CourtCraft Advocate™ for child arrangement cases?',
    answer:
      'Yes. CourtCraft Advocate™ is specifically designed to support parents navigating family court proceedings, including child arrangement orders, prohibited steps orders, and specific issue orders. Our tools help you prepare C100 applications, position statements, and track important court dates.',
  },
  {
    question: 'How do I book a McKenzie Friend session?',
    answer:
      'Once you have an active subscription, you can book a McKenzie Friend session directly from your dashboard. Select an available time slot, provide brief details about your hearing, and confirm your booking. You\'ll receive a confirmation email with joining instructions.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-16 sm:py-24 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-10 sm:mb-14">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-px bg-gold-500" />
            <span className="label-tag text-gold-600">FAQ</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 leading-tight">
            Common Questions <span className="text-gold-600">Answered Honestly.</span>
          </h2>
        </div>

        {/* Accordion */}
        <div className="flex flex-col gap-2">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="rounded-xl overflow-hidden transition-all duration-200"
                style={{
                  border: isOpen ? '1px solid rgba(201,168,76,0.45)' : '1px solid rgba(26,53,96,0.13)',
                  background: isOpen ? 'rgba(201,168,76,0.05)' : '#fafbfc',
                }}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left group focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className={`font-medium text-sm leading-snug pr-4 transition-colors duration-150 ${isOpen ? 'text-gold-600' : 'text-navy-900 group-hover:text-gold-600'}`}>
                    {faq.question}
                  </span>
                  <span
                    className={`flex-shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300 ${
                      isOpen ? 'rotate-180 border-gold-400 bg-gold-50' : 'border-gray-300'
                    }`}
                  >
                    <Icon name="ChevronDownIcon" size={14} className={isOpen ? 'text-gold-600' : 'text-navy-400'} />
                  </span>
                </button>

                <div
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-5 pb-5 text-navy-700 text-sm leading-relaxed border-t border-gray-100 pt-4">
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
