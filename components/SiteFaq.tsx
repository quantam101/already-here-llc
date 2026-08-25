const faqs = [
  {
    question: 'What onsite IT field services does Already Here LLC provide?',
    answer:
      'Already Here LLC provides onsite smart hands, network troubleshooting, infrastructure remediation, rollout recovery, POS and retail technology support, RFID and asset-tracking field support, site surveys, equipment replacement, decommissioning, asset recovery, and structured technical closeout.'
  },
  {
    question: 'What areas does Already Here LLC serve?',
    answer:
      'Already Here LLC is based in Phoenix and serves the Phoenix metro and Arizona for qualified onsite dispatches, with nationwide project coverage available when scope, scheduling, travel, and commercial terms support the engagement.'
  },
  {
    question: 'How do MSPs and vendors request onsite support?',
    answer:
      'MSPs, vendors, and project teams can use the dispatch or RFQ intake on the website to provide site location, scope, timing, equipment details, closeout requirements, and attachments so the work can be qualified before scheduling.'
  },
  {
    question: 'Does Already Here LLC provide documented closeout?',
    answer:
      'Yes. Closeout can include arrival and departure notes, work performed, field observations, photos when permitted, serial or asset details when in scope, unresolved blockers, and buyer-ready ticket closure notes.'
  }
] as const;

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: answer
    }
  }))
};

export function SiteFaq() {
  return (
    <section className="border-t border-borderBrand bg-white" aria-labelledby="faq-heading">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="container-shell py-16 lg:py-24">
        <span className="eyebrow">Frequently asked questions</span>
        <h2 id="faq-heading" className="section-title mt-5">
          Onsite IT field service questions
        </h2>
        <p className="section-copy">
          Direct answers for MSPs, vendors, project teams, and commercial operators evaluating Already Here LLC for onsite technical execution.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {faqs.map(({ question, answer }) => (
            <article key={question} className="card p-6">
              <h3 className="text-lg font-semibold text-navy">{question}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
