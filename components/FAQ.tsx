'use client';

import { useState } from 'react';

const faqs = [
  {
    q: 'What states do you cover?',
    a: 'Primary coverage is the Phoenix metropolitan area and Arizona. Out-of-state project travel is available depending on client scope, timeline, and engagement requirements. Submit scope through dispatch and coverage will be confirmed.'
  },
  {
    q: 'What is the typical rate for a field dispatch?',
    a: 'Standard field dispatch runs $95–$195/hr depending on scope, travel, access requirements, and closeout deliverables. Urgent or same-day requests carry a premium rate. Multi-site and recurring programs qualify for volume pricing.'
  },
  {
    q: 'How quickly can you respond to a same-day request?',
    a: 'Same-day requests should come in by phone at (602) 882-2920. Response time depends on current schedule and site location. Premium rate applies for same-day coverage.'
  },
  {
    q: 'What does structured closeout documentation include?',
    a: 'Arrival and departure notes, action summary and field observations, photos where permitted, part swap or equipment notes, escalation notes for unresolved items, and usable closeout language for the client-side ticket.'
  },
  {
    q: 'Are you SDVOSB eligible?',
    a: 'Already Here LLC is SAM.gov registered and actively pursuing SDVOSB certification. Once certified, the firm will be eligible for federal and state procurement opportunities.'
  },
  {
    q: 'Do you work with Field Nation or WorkMarket dispatches?',
    a: 'Yes. Already Here LLC has documented dispatch history through both platforms. Direct dispatch via the website form or phone is also available for qualified buyers.'
  },
  {
    q: 'What types of environments do you work in?',
    a: 'Retail, QSR/restaurant, hospitality, healthcare-adjacent, enterprise/office, AV/media environments, data center/infrastructure, and controlled-access sites. Healthcare and controlled environment work includes documented execution with GE Healthcare medical equipment.'
  },
  {
    q: 'How do I submit a multi-site rollout request?',
    a: 'Use the dispatch form and describe the full scope — number of sites, cities, timeline, work type, and any program documentation. Multi-site programs are quoted based on the actual scope and qualify for volume pricing.'
  }
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };

  return (
    <section>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <span className="eyebrow">Common questions</span>
      <h2 className="section-title mt-5">Dispatch questions answered directly.</h2>
      <p className="section-copy">No vague answers. If coverage or pricing depends on the scope, that is what is said.</p>

      <div className="mt-10 grid gap-2">
        {faqs.map((faq, i) => (
          <div key={i} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpen(open === i ? null : i)}
              className="link-ring flex w-full items-center justify-between gap-4 px-7 py-5 text-left"
              aria-expanded={open === i}
            >
              <span className="text-sm font-semibold text-navy">{faq.q}</span>
              <span
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-borderBrand transition-transform duration-200 ${open === i ? 'rotate-45 border-action bg-action/5' : ''}`}
                aria-hidden="true"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M5 1v8M1 5h8" stroke={open === i ? '#1565C0' : '#64748B'} strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              </span>
            </button>
            {open === i && (
              <div className="border-t border-borderBrand px-7 py-5">
                <p className="text-sm leading-7 text-slate-600">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
