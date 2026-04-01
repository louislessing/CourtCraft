'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';


import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BackButton from '@/components/ui/BackButton';

const resourceCategories = [
{ id: 'all', label: 'All Resources', icon: 'Squares2X2Icon' },
{ id: 'guides', label: 'Guides & Articles', icon: 'BookOpenIcon' },
{ id: 'templates', label: 'Document Templates', icon: 'DocumentTextIcon' },
{ id: 'faqs', label: 'FAQs', icon: 'QuestionMarkCircleIcon' },
{ id: 'mckenzie', label: 'McKenzie Friend', icon: 'ScaleIcon' }];


const resources = [
{
  id: 1,
  category: 'guides',
  title: 'Understanding the Children Act 1989: A Complete Guide for Parents',
  desc: 'A comprehensive breakdown of the legal framework governing child arrangements in England and Wales, written for non-lawyers.',
  icon: 'BookOpenIcon',
  time: '15 min read',
  level: 'Beginner',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1d1cd6b0b-1766512429912.png",
  imageAlt: 'Open law book with scales of justice',
  featured: true,
  tags: ['Children Act', 'Child Arrangements', 'Family Law']
},
{
  id: 2,
  category: 'guides',
  title: 'Your Rights as a Litigant in Person: McKenzie Friend Explained',
  desc: 'Everything you need to know about McKenzie Friends — what they can and cannot do, how to find one, and your rights in court.',
  icon: 'ScaleIcon',
  time: '10 min read',
  level: 'Beginner',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1d6b99911-1773155337331.png",
  imageAlt: 'British courtroom interior with wooden benches',
  featured: true,
  tags: ['McKenzie Friend', 'Rights', 'Litigant in Person']
},
{
  id: 3,
  category: 'templates',
  title: 'Position Statement Template — Child Arrangements',
  desc: 'A professionally formatted position statement template for child arrangements hearings, with guidance notes.',
  icon: 'DocumentTextIcon',
  time: 'Template',
  level: 'All levels',
  image: '',
  imageAlt: '',
  featured: false,
  tags: ['Position Statement', 'Child Arrangements', 'Template']
},
{
  id: 4,
  category: 'videos',
  title: 'How to Prepare for Your First Hearing (FHDRA)',
  desc: 'Step-by-step video guide to preparing for your First Hearing Dispute Resolution Appointment in the family court.',
  icon: 'PlayCircleIcon',
  time: '22 min video',
  level: 'Beginner',
  image: "https://images.unsplash.com/photo-1726568313407-c7d9c8a8ce88",
  imageAlt: 'Person watching legal tutorial on laptop screen',
  featured: false,
  tags: ['FHDRA', 'Court Preparation', 'Video']
},
{
  id: 5,
  category: 'guides',
  title: 'Financial Remedy Proceedings: A Step-by-Step Guide',
  desc: 'Navigate Form E, First Appointment (FDA), Financial Dispute Resolution (FDR), and Final Hearing with confidence.',
  icon: 'BanknotesIcon',
  time: '20 min read',
  level: 'Intermediate',
  image: '',
  imageAlt: '',
  featured: false,
  tags: ['Financial Remedy', 'Form E', 'FDA', 'FDR']
},
{
  id: 6,
  category: 'faqs',
  title: 'FAQs: Child Arrangements Orders',
  desc: '50 frequently asked questions about child arrangements orders, residence, contact, and enforcement.',
  icon: 'QuestionMarkCircleIcon',
  time: '50 questions',
  level: 'All levels',
  image: '',
  imageAlt: '',
  featured: false,
  tags: ['FAQ', 'Child Arrangements', 'Contact']
},
{
  id: 7,
  category: 'templates',
  title: 'Chronology of Events Template',
  desc: 'A structured chronology template for presenting the history of your case to the court in date order.',
  icon: 'ClockIcon',
  time: 'Template',
  level: 'All levels',
  image: '',
  imageAlt: '',
  featured: false,
  tags: ['Chronology', 'Template', 'Court Documents']
},
{
  id: 8,
  category: 'guides',
  title: 'Domestic Abuse in Family Proceedings: Your Protections',
  desc: 'Understanding Practice Direction 12J, fact-finding hearings, non-molestation orders, and occupation orders.',
  icon: 'ShieldCheckIcon',
  time: '18 min read',
  level: 'Intermediate',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_123e05e50-1773594744308.png",
  imageAlt: 'Supportive hands symbolising legal protection',
  featured: false,
  tags: ['Domestic Abuse', 'PD12J', 'Protection Orders']
},
{
  id: 9,
  category: 'videos',
  title: 'How to Present Evidence in Family Court',
  desc: 'Video tutorial on preparing and presenting your evidence bundle, speaking to exhibits, and addressing the judge.',
  icon: 'PlayCircleIcon',
  time: '35 min video',
  level: 'Intermediate',
  image: '',
  imageAlt: '',
  featured: false,
  tags: ['Evidence', 'Court Skills', 'Video']
},
{
  id: 10,
  category: 'mckenzie',
  title: 'McKenzie Friend Practice Guidance (2010) — Full Text',
  desc: 'The complete Practice Guidance issued by the Master of the Rolls and President of the Family Division.',
  icon: 'DocumentCheckIcon',
  time: 'Official Guidance',
  level: 'All levels',
  image: '',
  imageAlt: '',
  featured: false,
  tags: ['McKenzie Friend', 'Practice Guidance', 'Official']
},
{
  id: 11,
  category: 'templates',
  title: 'Witness Statement Template with Statement of Truth',
  desc: 'Court-compliant witness statement template with guidance on what to include and how to structure your evidence.',
  icon: 'UserIcon',
  time: 'Template',
  level: 'All levels',
  image: '',
  imageAlt: '',
  featured: false,
  tags: ['Witness Statement', 'Statement of Truth', 'Template']
},
{
  id: 12,
  category: 'guides',
  title: 'International Jurisdiction: When UK Courts Apply',
  desc: 'Guide for international clients on when UK family courts have jurisdiction, habitual residence, and cross-border cases.',
  icon: 'GlobeAltIcon',
  time: '12 min read',
  level: 'Advanced',
  image: '',
  imageAlt: '',
  featured: false,
  tags: ['International', 'Jurisdiction', 'Habitual Residence']
}];


const faqs = [
{
  q: 'What is a McKenzie Friend and can I have one in my hearing?',
  a: 'A McKenzie Friend is a person who assists a litigant in person in court. They can provide moral support, take notes, help with case papers, and give quiet advice. There is a strong presumption that you will be allowed a McKenzie Friend. They cannot address the court, examine witnesses, or conduct litigation unless the court specifically grants them rights of audience.'
},
{
  q: 'How do I get legal aid for family court proceedings?',
  a: 'Legal aid for private family law matters was largely removed by the Legal Aid, Sentencing and Punishment of Offenders Act 2012 (LASPO). It remains available in limited circumstances, including where there is evidence of domestic abuse or child abuse. You can check eligibility at gov.uk/check-legal-aid. CourtCraft Advocate exists specifically to support the 80% of litigants who cannot access legal aid.'
},
{
  q: 'What is the paramount consideration in child arrangements cases?',
  a: 'Under section 1 of the Children Act 1989, the child\'s welfare is the paramount consideration — the court\'s overriding concern. The court applies the "welfare checklist" which includes: the ascertainable wishes of the child; their physical, emotional and educational needs; the likely effect of any change; age, sex, background; any harm suffered or risk of harm; and the capability of each parent to meet their needs.'
},
{
  q: 'What is a CAFCASS officer and what do they do?',
  a: 'CAFCASS (Children and Family Court Advisory and Support Service) is an independent body that safeguards and promotes the welfare of children in family court proceedings. A CAFCASS officer (Family Court Adviser) will speak with your child, both parents, and other relevant parties, then produce a report (Section 7 or Section 37) recommending what order the court should make.'
},
{
  q: 'Can CourtCraft Advocate help with cases outside the UK?',
  a: 'Yes. CourtCraft Advocate automatically detects your jurisdiction and adapts documentation, pricing, and guidance accordingly. The McKenzie Friend concept exists in Australia, Canada, New Zealand, and Ireland. For US clients, we provide equivalent lay support guidance. Pricing is displayed in your local currency.'
}];


export default function ResourcesPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('revealed');
        });
      },
      { threshold: 0.05 }
    );

    const elements = sectionRef.current?.querySelectorAll('.reveal-hidden');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const filtered = useMemo(() => resources.filter((r) => {
    const matchCat = activeCategory === 'all' || r.category === activeCategory;
    const matchSearch = searchQuery === '' ||
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchSearch;
  }), [activeCategory, searchQuery]);

  const featured = useMemo(() => resources.filter((r) => r.featured), []);

  const levelColor: Record<string, string> = {
    'Beginner': 'badge-green',
    'Intermediate': 'badge-blue',
    'Advanced': 'badge-gold',
    'All levels': 'badge-blue'
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main ref={sectionRef} className="pt-24">
        {/* Hero */}
        <section className="py-10 sm:py-14 lg:py-16 px-4 sm:px-6 bg-white relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201,168,76,0.08), transparent)' }} />
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="mb-6">
              <BackButton />
            </div>
            <div className="reveal-hidden text-center mb-8 sm:mb-10 lg:mb-12">
              <div className="flex items-center justify-center gap-3 mb-4 sm:mb-5">
                <div className="w-8 h-px bg-gold-500" />
                <span className="label-tag text-gold-600">Legal Resources Library</span>
                <div className="w-8 h-px bg-gold-500" />
              </div>
              <h1 className="font-display font-900 text-3xl sm:text-4xl lg:text-5xl tracking-tight text-navy-900 mb-3 sm:mb-4 leading-tight">
                Everything You Need to<br />
                <span className="text-gold-gradient">Navigate Family Court.</span>
              </h1>
              <p className="text-navy-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8">
                50+ professional document templates, comprehensive guides, and expert FAQs — all built for parents representing themselves in UK family court.
              </p>

              {/* Search */}
              <div className="relative max-w-xl mx-auto">
                <Icon name="MagnifyingGlassIcon" size={18} className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-navy-400" />
                <input
                  type="text"
                  placeholder="Search guides, templates, FAQs..."
                  className="w-full pl-11 sm:pl-12 py-4 rounded-2xl text-base border border-gray-100 bg-white text-navy-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-400 shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        {/* Featured Resources */}
        {searchQuery === '' && activeCategory === 'all' &&
        <section className="py-8 sm:py-10 lg:py-12 px-4 sm:px-6 bg-white">
            <div className="max-w-7xl mx-auto">
              <div className="reveal-hidden flex items-center gap-3 mb-5 sm:mb-6 lg:mb-8">
                <div className="w-8 h-px bg-gold-500" />
                <span className="label-tag text-gold-600">Featured Resources</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-5 sm:gap-6">
                {featured.map((resource) =>
              <div key={resource.id} className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
                    {resource.image &&
                <div className="h-40 sm:h-44 lg:h-48 overflow-hidden relative">
                        <AppImage
                    src={resource.image}
                    alt={resource.imageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw" />
                  
                        <div className="absolute inset-0 bg-gradient-to-t from-navy-900 to-transparent" />
                        <div className="absolute top-4 left-4">
                          <span className="badge badge-gold" style={{ fontSize: '9px' }}>Featured</span>
                        </div>
                      </div>
                }
                    <div className="p-5 sm:p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`badge ${levelColor[resource.level]}`} style={{ fontSize: '8px' }}>{resource.level}</span>
                        <span className="label-tag text-navy-400" style={{ fontSize: '9px' }}>{resource.time}</span>
                      </div>
                      <h3 className="font-display font-700 tracking-tight text-navy-900 text-base sm:text-lg mb-2 leading-tight">{resource.title}</h3>
                      <p className="text-sm text-navy-600 leading-relaxed mb-4">{resource.desc}</p>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {resource.tags.map((tag) =>
                    <span key={tag} className="badge badge-blue" style={{ fontSize: '8px' }}>{tag}</span>
                    )}
                      </div>
                    </div>
                  </div>
              )}
              </div>
            </div>
          </section>
        }

        {/* All Resources */}
        <section className="py-8 sm:py-10 lg:py-12 px-4 sm:px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            {/* Category filter */}
            <div className="reveal-hidden flex gap-2 flex-wrap mb-5 sm:mb-6 lg:mb-8">
              {resourceCategories.map((cat) =>
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`tab-btn flex items-center gap-1.5 sm:gap-2 py-3.5 px-3 sm:px-4 text-xs sm:text-sm active:scale-95 ${activeCategory === cat.id ? 'active' : ''}`}>
                
                  <Icon name={cat.icon as any} size={13} />
                  <span className="whitespace-nowrap">{cat.label}</span>
                </button>
              )}
            </div>

            {/* Results count */}
            <div className="reveal-hidden flex flex-wrap items-center justify-between gap-3 mb-5 sm:mb-6">
              <p className="text-sm text-navy-600">
                Showing <span className="text-gold-500 font-700">{filtered.length}</span> resources
                {searchQuery && <span> for "<span className="text-navy-900">{searchQuery}</span>"</span>}
              </p>
              <Link href="/register" className="btn-gold text-xs py-2.5 sm:py-2 px-5">
                <Icon name="LockOpenIcon" size={14} className="text-navy-900" />
                Unlock All Resources
              </Link>
            </div>

            {/* Resource grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filtered.map((resource, i) =>
              <div
                key={resource.id}
                className={`rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 reveal-hidden stagger-${Math.min(i % 6 + 1, 6)}`}>
                
                  {resource.image &&
                <div className="h-32 sm:h-36 overflow-hidden relative">
                      <AppImage
                    src={resource.image}
                    alt={resource.imageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" />
                  
                      <div className="absolute inset-0 bg-gradient-to-t from-navy-900 to-transparent" />
                    </div>
                }
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-500 flex-shrink-0">
                        <Icon name={resource.icon as any} size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`badge ${levelColor[resource.level]}`} style={{ fontSize: '8px' }}>{resource.level}</span>
                          <span className="label-tag text-navy-400" style={{ fontSize: '9px' }}>{resource.time}</span>
                        </div>
                      </div>
                    </div>
                    <h3 className="font-display font-700 tracking-tight text-navy-900 text-sm mb-2 leading-tight">{resource.title}</h3>
                    <p className="text-xs text-navy-600 leading-relaxed mb-4">{resource.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {resource.tags.slice(0, 2).map((tag) =>
                    <span key={tag} className="badge badge-blue" style={{ fontSize: '8px' }}>{tag}</span>
                    )}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <Link href="/register" className="text-xs text-gold-500 font-display font-700 hover:text-gold-600 flex items-center gap-1 py-1">
                        Access Resource
                        <Icon name="ArrowRightIcon" size={12} />
                      </Link>
                      <div className="flex items-center gap-1 text-navy-400">
                        <Icon name="LockClosedIcon" size={12} />
                        <span className="label-tag" style={{ fontSize: '8px' }}>Members Only</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-10 sm:py-14 lg:py-16 px-4 sm:px-6 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="reveal-hidden mb-8 sm:mb-10 lg:mb-12 text-center">
              <div className="flex items-center justify-center gap-3 mb-4 sm:mb-5">
                <div className="w-8 h-px bg-gold-500" />
                <span className="label-tag text-gold-600">Frequently Asked Questions</span>
                <div className="w-8 h-px bg-gold-500" />
              </div>
              <h2 className="font-display font-900 text-2xl sm:text-3xl lg:text-4xl tracking-tight text-navy-900 mb-3 sm:mb-4 leading-tight">
                Common Questions<br />
                <span className="text-gold-gradient">Answered Honestly.</span>
              </h2>
            </div>

            <div className="space-y-0">
              {faqs.map((faq, i) =>
              <div key={i} className="reveal-hidden border-t border-gray-100 last:border-b">
                  <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full py-5 sm:py-6 flex items-center justify-between text-left group min-h-[56px]">
                  
                    <span className="font-display font-700 tracking-tight text-navy-900 text-sm sm:text-base leading-tight group-hover:text-gold-500 transition-colors pr-4 sm:pr-6">
                      {faq.q}
                    </span>
                    <div className={`w-9 h-9 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 border ${openFaq === i ? 'rotate-180 bg-gold-500 border-gold-500' : 'bg-white border-gray-100'}`}>
                      <Icon name="ChevronDownIcon" size={16} className={openFaq === i ? 'text-white' : 'text-navy-400'} />
                    </div>
                  </button>
                  {openFaq === i &&
                <div className="pb-5 sm:pb-6 text-sm text-navy-600 leading-relaxed max-w-3xl">
                      {faq.a}
                    </div>
                }
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-10 sm:py-14 lg:py-16 px-4 sm:px-6 bg-white">
          <div className="max-w-3xl mx-auto text-center">
            <div className="reveal-hidden rounded-3xl border border-gold-300 p-6 sm:p-8 lg:p-14 relative overflow-hidden bg-navy-950"
            style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.06), rgba(10,22,40,0.95))' }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 60% at 50% 0%, rgba(201,168,76,0.08), transparent)' }} />
              <div className="relative z-10">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gold-gradient flex items-center justify-center mx-auto mb-4 sm:mb-5 lg:mb-6">
                  <Icon name="ScaleIcon" size={28} className="text-navy-900" />
                </div>
                <h2 className="font-display font-900 tracking-tight text-xl sm:text-2xl lg:text-4xl text-white mb-3 sm:mb-4 leading-tight">
                  Ready to Take Control?
                </h2>
                <p className="text-white text-opacity-60 text-sm sm:text-base lg:text-lg mb-5 sm:mb-6 lg:mb-8 leading-relaxed">
                  Unlock the full library of 50+ templates, all guides, and AI assistance for just £35/month.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <Link href="/register" className="btn-gold py-4 px-8 sm:px-10 justify-center">
                    <Icon name="ShieldCheckIcon" size={18} className="text-navy-900" />
                    Register Now — Full Access
                  </Link>
                  <Link href="/homepage#pricing" className="btn-outline py-4 px-8 sm:px-10 justify-center">
                    View Pricing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>);

}