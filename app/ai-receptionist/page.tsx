import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AI Receptionist & Lead Recovery | Already Here LLC',
  description: 'AI receptionist intake for missed calls, service requests, quote requests, and lead recovery for Already Here LLC.',
  alternates: { canonical: 'https://www.alreadyherellc.com/ai-receptionist' }
};

const intakeFields = [
  'Customer name and contact details',
  'Company or property name when applicable',
  'Service needed and urgency',
  'Location, site city, and access notes',
  'Preferred callback or service window',
  'Proceed / Quote / Schedule / Discard decision state'
] as const;

const supportedRequests = [
  'IT field service and smart hands',
  'Door access and low-voltage service intake',
  'Network, Wi-Fi, AP, switch, and infrastructure requests',
  'Store IT equipment removal, asset inventory, packing, and RMA support',
  'Healthcare equipment and McKesson cabinet support requests',
  'Small-business AI receptionist pilot inquiries'
] as const;

export default function AiReceptionistPage() {
  return (
    <main>
      <section className="border-b border-borderBrand bg-white">
        <div className="container-shell grid gap-12 py-16 lg:grid-cols-[0.95fr_1.05fr] lg:py-24">
          <div>
            <span className="eyebrow">Already Here LLC AI receptionist</span>
            <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
              Capture missed calls, quote requests, and service leads before they disappear.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              This intake path is the first operating version of the Already Here LLC AI receptionist. It captures structured lead details, routes them to the dispatch queue, and creates a decision-ready record for follow-up.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="tel:+16028822920" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy">
                Call 602-882-2920
              </a>
              <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full border border-borderBrand px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-action hover:text-action">
                Request Dispatch
              </Link>
            </div>

            <div className="mt-10 grid gap-3">
              {intakeFields.map((item) => (
                <div key={item} className="rounded-2xl border border-borderBrand bg-soft px-4 py-3 text-sm font-semibold text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <form action="/api/ai-receptionist/intake" method="post" className="card p-6 sm:p-8">
            <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />
            <input type="hidden" name="source" value="website_ai_receptionist_page" />
            <h2 className="text-2xl font-semibold text-navy">AI receptionist intake</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Submit a request here. The intake system will package the details for Already Here LLC review.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Full name
                <input required name="fullName" className="rounded-2xl border border-borderBrand px-4 py-3 text-sm font-medium outline-none focus:border-action" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Company
                <input name="company" className="rounded-2xl border border-borderBrand px-4 py-3 text-sm font-medium outline-none focus:border-action" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Phone
                <input required name="phone" type="tel" className="rounded-2xl border border-borderBrand px-4 py-3 text-sm font-medium outline-none focus:border-action" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Email
                <input name="email" type="email" className="rounded-2xl border border-borderBrand px-4 py-3 text-sm font-medium outline-none focus:border-action" />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Service type
                <select required name="serviceType" className="rounded-2xl border border-borderBrand px-4 py-3 text-sm font-medium outline-none focus:border-action">
                  <option value="">Select one</option>
                  <option>IT field service / smart hands</option>
                  <option>Door access / low voltage</option>
                  <option>Network / Wi-Fi / AP / switch</option>
                  <option>Store equipment removal / asset inventory</option>
                  <option>Healthcare equipment / McKesson cabinet</option>
                  <option>AI receptionist pilot</option>
                  <option>Other service request</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700">
                Urgency
                <select name="urgency" className="rounded-2xl border border-borderBrand px-4 py-3 text-sm font-medium outline-none focus:border-action">
                  <option>Normal follow-up</option>
                  <option>Same day</option>
                  <option>Emergency / down site</option>
                  <option>Quote request</option>
                  <option>Schedule request</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                Location / site city
                <input name="location" className="rounded-2xl border border-borderBrand px-4 py-3 text-sm font-medium outline-none focus:border-action" placeholder="Phoenix, Mesa, Glendale, nationwide site, etc." />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                Preferred callback or service window
                <input name="preferredTime" className="rounded-2xl border border-borderBrand px-4 py-3 text-sm font-medium outline-none focus:border-action" placeholder="Today after 2 PM, tomorrow morning, flexible, etc." />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-slate-700 sm:col-span-2">
                Request details
                <textarea required name="message" rows={6} className="rounded-2xl border border-borderBrand px-4 py-3 text-sm font-medium outline-none focus:border-action" placeholder="Describe the issue, site notes, access constraints, equipment, urgency, and what outcome is needed." />
              </label>
            </div>

            <button type="submit" className="mt-6 w-full rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-navy">
              Submit to AI receptionist intake
            </button>
            <p className="mt-4 text-xs leading-6 text-slate-500">
              Submission confirms intake only. Scheduling, quote, or dispatch is confirmed after Already Here LLC reviews scope, location, timing, and coverage.
            </p>
          </form>
        </div>
      </section>

      <section className="container-shell py-16 lg:py-24">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="eyebrow">Supported intake categories</span>
            <h2 className="section-title mt-5">Built for our real operating lanes.</h2>
            <p className="section-copy">The AI receptionist is not generic. It is structured around Already Here LLC service categories, dispatch triage, customer follow-up, and lead recovery.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {supportedRequests.map((item) => (
              <div key={item} className="rounded-3xl border border-borderBrand bg-white p-6 text-sm leading-7 text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
