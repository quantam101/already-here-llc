import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Self-Hosted Software Setup & Support',
  description:
    'Already Here LLC deploys and supports self-hosted open-source software for MSPs, enterprises, and commercial operators — CRM, analytics, automation, scheduling, document signing, monitoring, and more. Own your data, eliminate SaaS fees.',
  alternates: { canonical: '/self-hosted-solutions' },
};

const toolCategories = [
  {
    category: 'Web Analytics',
    icon: '📊',
    tools: [
      {
        name: 'Umami',
        grade: 'A+',
        description: 'Privacy-first, cookie-free Google Analytics alternative. Lightweight script, real-time dashboard, GDPR-ready out of the box.',
        license: 'MIT',
        stack: 'Node.js / Docker',
        replaces: 'Google Analytics',
        link: 'https://umami.is',
      },
      {
        name: 'Plausible',
        grade: 'A',
        description: 'Simple, open-source, privacy-respecting analytics. Sub-1KB script, no cookie banner required.',
        license: 'AGPL-3.0',
        stack: 'Elixir / Docker',
        replaces: 'Google Analytics',
        link: 'https://plausible.io',
      },
    ],
  },
  {
    category: 'CRM',
    icon: '🤝',
    tools: [
      {
        name: 'Twenty',
        grade: 'A+',
        description: 'Modern open-source CRM with a clean Notion-like UI, flexible data model, REST + GraphQL API, and full self-host Docker stack.',
        license: 'AGPL-3.0',
        stack: 'Docker / Node.js',
        replaces: 'Salesforce / HubSpot',
        link: 'https://twenty.com',
      },
      {
        name: 'EspoCRM',
        grade: 'A',
        description: 'Enterprise-class CRM with a single-page app frontend, REST API, and extensive workflow automation.',
        license: 'AGPL-3.0',
        stack: 'PHP / Docker',
        replaces: 'Zoho / Salesforce',
        link: 'https://www.espocrm.com',
      },
    ],
  },
  {
    category: 'Automation',
    icon: '⚡',
    tools: [
      {
        name: 'Activepieces',
        grade: 'A+',
        description: 'No-code business automation with 200+ integrations. Visual flow builder, webhook triggers, and a clean open-source Zapier replacement.',
        license: 'MIT',
        stack: 'Docker / Node.js',
        replaces: 'Zapier / Make',
        link: 'https://www.activepieces.com',
      },
      {
        name: 'n8n',
        grade: 'A',
        description: 'Workflow automation with a powerful visual editor, custom code nodes, and enterprise-grade access controls.',
        license: 'Sustainable Use',
        stack: 'Docker / Node.js',
        replaces: 'Zapier / Integromat',
        link: 'https://n8n.io',
      },
    ],
  },
  {
    category: 'Scheduling & Booking',
    icon: '📅',
    tools: [
      {
        name: 'Cal.diy',
        grade: 'A+',
        description: 'Open-source scheduling infrastructure. Embed booking widgets, set availability rules, integrate with Google/Outlook calendar, and own the data.',
        license: 'MIT',
        stack: 'Node.js / Docker',
        replaces: 'Calendly / Acuity',
        link: 'https://cal.com',
      },
      {
        name: 'Easy!Appointments',
        grade: 'A',
        description: 'Full-featured appointment booking system for customer-facing scheduling. Simple deploy, PHP/MySQL stack.',
        license: 'GPL-3.0',
        stack: 'PHP / Docker',
        replaces: 'Booksy / Square Appointments',
        link: 'https://easyappointments.org',
      },
    ],
  },
  {
    category: 'Document Signing',
    icon: '✍️',
    tools: [
      {
        name: 'Docuseal',
        grade: 'A+',
        description: 'Create, fill, and sign digital documents. Drag-and-drop form builder, audit trail, embedded signing flows, and zero per-signature fees.',
        license: 'AGPL-3.0',
        stack: 'Docker',
        replaces: 'DocuSign / HelloSign',
        link: 'https://www.docuseal.co',
      },
      {
        name: 'Documenso',
        grade: 'A',
        description: 'Open DocuSign alternative with beautiful UI, team signing workflows, and verifiable cryptographic audit logs.',
        license: 'AGPL-3.0',
        stack: 'Node.js / Docker',
        replaces: 'DocuSign',
        link: 'https://documenso.com',
      },
    ],
  },
  {
    category: 'Monitoring & Uptime',
    icon: '🔍',
    tools: [
      {
        name: 'Uptime Kuma',
        grade: 'A+',
        description: 'Self-hosted monitoring tool with a clean UI. HTTP, TCP, ping, DNS, and SSL checks. Slack/email/webhook alerts. No cloud dependency.',
        license: 'MIT',
        stack: 'Node.js / Docker',
        replaces: 'UptimeRobot / Pingdom',
        link: 'https://github.com/louislam/uptime-kuma',
      },
      {
        name: 'Gatus',
        grade: 'A',
        description: 'Developer-oriented health dashboard. YAML config, Slack/PagerDuty alerting, and a clean status-page output.',
        license: 'Apache-2.0',
        stack: 'Go / Docker',
        replaces: 'StatusPage / BetterUptime',
        link: 'https://github.com/TwiN/gatus',
      },
    ],
  },
  {
    category: 'Newsletter & Email Marketing',
    icon: '📧',
    tools: [
      {
        name: 'Listmonk',
        grade: 'A+',
        description: 'High-performance newsletter and mailing list manager. Handles millions of emails per month. Single binary, PostgreSQL backend.',
        license: 'AGPL-3.0',
        stack: 'Go / Docker',
        replaces: 'Mailchimp / ConvertKit',
        link: 'https://listmonk.app',
      },
      {
        name: 'Mautic',
        grade: 'A',
        description: 'Full marketing automation platform — email, SMS, landing pages, lead scoring, and campaign workflows.',
        license: 'GPL-3.0',
        stack: 'PHP / Docker',
        replaces: 'HubSpot Marketing / Marketo',
        link: 'https://mautic.org',
      },
    ],
  },
  {
    category: 'Forms & Lead Capture',
    icon: '📋',
    tools: [
      {
        name: 'Typebot',
        grade: 'A+',
        description: 'Visual conversational form builder. Embed as a chat widget or full-page flow. Integrates with CRMs, webhooks, and email platforms.',
        license: 'AGPL-3.0',
        stack: 'Docker / Node.js',
        replaces: 'Typeform / Landbot',
        link: 'https://typebot.io',
      },
      {
        name: 'Formbricks',
        grade: 'A',
        description: 'Open-source survey and experience-management platform. In-app, link, and email surveys with a clean response dashboard.',
        license: 'AGPL-3.0',
        stack: 'Docker / Node.js',
        replaces: 'SurveyMonkey / Qualtrics',
        link: 'https://formbricks.com',
      },
    ],
  },
  {
    category: 'Team Communication',
    icon: '💬',
    tools: [
      {
        name: 'Rocket.Chat',
        grade: 'A+',
        description: 'Full-featured Slack alternative with channels, DMs, video, file sharing, and enterprise SSO. Data stays on your server.',
        license: 'MIT',
        stack: 'Node.js / Docker',
        replaces: 'Slack / Teams',
        link: 'https://rocket.chat',
      },
      {
        name: 'Zulip',
        grade: 'A',
        description: 'Threaded team chat designed for async workflows. Open-source with mobile apps and a powerful search.',
        license: 'Apache-2.0',
        stack: 'Python / Docker',
        replaces: 'Slack',
        link: 'https://zulip.com',
      },
    ],
  },
  {
    category: 'Notifications',
    icon: '🔔',
    tools: [
      {
        name: 'Novu',
        grade: 'A+',
        description: 'Multi-channel notification infrastructure — email, SMS, push, in-app, Slack, webhook — from a single API. Open-source, self-hostable.',
        license: 'MIT',
        stack: 'Docker / Node.js',
        replaces: 'Twilio / Sendgrid Notifications',
        link: 'https://novu.co',
      },
      {
        name: 'ntfy',
        grade: 'A',
        description: 'Push notifications via HTTP. Send alerts from scripts, CI pipelines, or apps to your phone with zero signup.',
        license: 'Apache-2.0',
        stack: 'Go / Docker',
        replaces: 'Pushover / PagerDuty alerts',
        link: 'https://ntfy.sh',
      },
    ],
  },
];

const serviceSteps = [
  { step: '01', title: 'Discovery', body: 'We assess your current SaaS stack, data requirements, compliance posture, and infrastructure. We identify which tools to replace or augment with self-hosted alternatives.' },
  { step: '02', title: 'Provisioning', body: 'We stand up servers, configure Docker Compose or Kubernetes deployments, set up reverse proxies, TLS certificates, and backups.' },
  { step: '03', title: 'Migration', body: 'We migrate existing data from SaaS platforms, configure integrations, and run parallel validation before cutover.' },
  { step: '04', title: 'Hardening', body: 'Firewall rules, fail2ban, access controls, secret management, automated backups, and uptime monitoring are configured before handoff.' },
  { step: '05', title: 'Training & Handoff', body: 'We provide documentation and walkthrough sessions so your team can operate the stack independently.' },
  { step: '06', title: 'Ongoing Support', body: 'Optional retainer support for updates, expansions, incident response, and adding new self-hosted tools as your stack grows.' },
];

export default function SelfHostedSolutionsPage() {
  return (
    <>
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell py-16 lg:py-24">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <span className="eyebrow">Open-source infrastructure</span>
            <span className="inline-flex items-center rounded-full border border-borderBrand bg-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-steel">Own Your Stack</span>
            <span className="inline-flex items-center rounded-full border border-borderBrand bg-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-steel">Zero Per-Seat Fees</span>
          </div>
          <h1 className="mt-2 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl lg:text-6xl">
            Self-Hosted Software Setup &amp; Support
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Deploy enterprise-grade open-source software on your own infrastructure. We provision, configure, harden, and hand off production-ready self-hosted stacks — CRM, analytics, automation, scheduling, document signing, monitoring, and more — so you own the data and eliminate recurring SaaS fees.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/rfq" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy">
              Request a Self-Hosted Stack Quote
            </Link>
            <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">
              Standard Dispatch Intake
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-borderBrand bg-soft">
        <div className="container-shell py-16 lg:py-24">
          <span className="eyebrow">Why self-host</span>
          <h2 className="section-title mt-5">Eliminate SaaS lock-in. Own your data.</h2>
          <p className="section-copy">Enterprise SaaS tools charge per seat, per send, and per signature. Self-hosted alternatives give you the same functionality at infrastructure cost — typically 80–95% cheaper at scale — with full data sovereignty and no vendor dependency.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {[
              'No per-seat pricing — run unlimited users on your own server for a flat infrastructure cost.',
              'Data sovereignty — your customer, employee, and operational data never leaves your servers.',
              'No vendor lock-in — migrate away or fork the project if the vendor changes terms.',
              'Compliance-ready — GDPR, HIPAA-adjacent, and SOC 2 postures are easier when you control the stack.',
            ].map((item) => (
              <div key={item} className="card p-6">
                <p className="text-sm leading-7 text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <span className="eyebrow">A+ rated open-source tools</span>
        <h2 className="section-title mt-5">Curated self-hosted stack — tested, graded, production-ready.</h2>
        <p className="section-copy">Every tool below is graded against four criteria: deployment simplicity, community health, production stability, and how cleanly it replaces its SaaS counterpart. A+ means we recommend it without reservation.</p>

        <div className="mt-12 space-y-12">
          {toolCategories.map((cat) => (
            <div key={cat.category}>
              <div className="mb-5 flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">{cat.icon}</span>
                <h3 className="text-xl font-semibold text-navy">{cat.category}</h3>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {cat.tools.map((tool) => (
                  <div key={tool.name} className="card p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-semibold text-navy">{tool.name}</h4>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            tool.grade === 'A+' ? 'bg-action text-white' : 'border border-borderBrand bg-soft text-slate-600'
                          }`}>
                            {tool.grade}
                          </span>
                        </div>
                        <p className="mt-1 text-xs font-medium text-slate-500">Replaces: {tool.replaces}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{tool.license}</p>
                        <p className="text-[10px] text-slate-400">{tool.stack}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{tool.description}</p>
                    <a
                      href={tool.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-action hover:underline"
                    >
                      Project site →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-borderBrand bg-white">
        <div className="container-shell py-16 lg:py-24">
          <span className="eyebrow">Our process</span>
          <h2 className="section-title mt-5">From SaaS to self-hosted in a structured engagement.</h2>
          <p className="section-copy">We handle every step from server provisioning to production handoff. You get a documented, monitored, and maintainable stack you can operate independently or retain us to support.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {serviceSteps.map(({ step, title, body }) => (
              <div key={step} className="rounded-3xl border border-borderBrand bg-soft p-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-action">{step}</p>
                <h3 className="mt-2 text-base font-semibold text-navy">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <span className="eyebrow">Who this is for</span>
        <h2 className="section-title mt-5">Built for operators who want to own their stack.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[
            { title: 'MSPs', body: 'Replace expensive per-client SaaS licensing with self-hosted tools you control. Deploy a single stack for internal operations or white-label for clients.' },
            { title: 'Enterprise operators', body: 'Meet data sovereignty and compliance requirements that SaaS vendors cannot satisfy. Reduce audit surface and eliminate third-party data processing agreements.' },
            { title: 'Commercial multi-site operators', body: 'CRM, scheduling, analytics, and communication tools that scale across locations without per-seat fees eating into margin.' },
            { title: 'Government contractors', body: 'Closed-network and FedRAMP-adjacent deployments where data must stay on-premise or in a controlled environment.' },
            { title: 'Startups scaling fast', body: 'Replace $3,000/month in SaaS fees with a $60/month server and open-source software. Reallocate budget to engineering and operations.' },
            { title: 'IT teams taking back control', body: 'Audit every request, control every integration, and eliminate shadow IT by consolidating tools on infrastructure you own.' },
          ].map(({ title, body }) => (
            <div key={title} className="card p-6">
              <h3 className="text-base font-semibold text-navy">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-borderBrand bg-soft">
        <div className="container-shell py-16 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="eyebrow">Get started</span>
            <h2 className="section-title mt-5">Ready to own your stack?</h2>
            <p className="section-copy mx-auto">Tell us which tools you want to replace and what infrastructure you have (or need). We&rsquo;ll scope the engagement and deliver a fixed-cost proposal.</p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/rfq" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy">
                Request a Quote
              </Link>
              <Link href="/capability-statement" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">
                View Capability Statement
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
