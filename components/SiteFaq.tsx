const faqs = [
  {
    question: 'Is Already Here LLC a managed service provider (MSP)?',
    answer:
      'Yes. Already Here LLC is a Phoenix-based managed service provider delivering managed IT support, help desk and remote support, network and systems administration, Microsoft 365 and cloud support, security hardening, infrastructure support, and onsite technical services. The company brings 30+ years of IT experience and has operated as Already Here LLC since 2013.'
  },
  {
    question: 'What managed IT services does Already Here LLC provide?',
    answer:
      'Managed IT services include help desk and remote user support, endpoint and server administration, network and Wi-Fi support, firewall and security configuration, Microsoft 365 and cloud administration, identity and access support, monitoring and maintenance, troubleshooting, documentation, vendor coordination, lifecycle work, and technical projects.'
  },
  {
    question: 'Can Already Here LLC support an internal IT team?',
    answer:
      'Yes. Engagements can be structured as fully managed IT, co-managed support for an internal IT team, project-based engineering, or onsite field execution. The exact operating model is scoped around the client environment, responsibilities, users, sites, and service requirements.'
  },
  {
    question: 'What makes Already Here LLC different from a remote-only MSP?',
    answer:
      'Already Here LLC combines managed IT and remote administration with real onsite execution. When an issue requires physical access to networks, servers, endpoints, retail systems, infrastructure, or a project site, the same technical organization can coordinate the remote work and the field work instead of handing the problem to an unrelated provider.'
  },
  {
    question: 'What areas does Already Here LLC serve?',
    answer:
      'Already Here LLC is based in Phoenix and supports businesses across the Phoenix metro. Remote managed support and broader project coverage are available when the client scope and operating requirements are a fit, with onsite Arizona and qualified multi-site project work handled by scope.'
  },
  {
    question: 'How do I request managed IT support or a consultation?',
    answer:
      'Use the IT support intake to describe the organization, users or sites, current environment, issue or objective, timing, and any relevant files. Requests can be routed as managed services, co-managed support, project work, or onsite dispatch. Same-day onsite needs have a separate rapid-dispatch path.'
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
          Managed IT and MSP questions
        </h2>
        <p className="section-copy">
          Direct answers for organizations evaluating Already Here LLC for managed IT, co-managed support, projects, and onsite technical services.
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
