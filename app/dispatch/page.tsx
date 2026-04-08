import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Dispatch | Already Here LLC',
  description:
    'Request onsite technical field execution from Already Here LLC. Phoenix-based, Arizona-first support for remote teams, MSPs, vendors, healthcare-adjacent operators, and rollout programs.',
};

const serviceTypes = [
  'Remote Team Support',
  'Endpoint and User-Device Support',
  'Infrastructure Field Work',
  'Rollout and Modernization Support',
  'Healthcare / Controlled Environment Support',
  'Emergency / Time-Sensitive Request',
];

const priorityOptions = ['Standard', 'Urgent', 'Critical / Time-Sensitive'];

const windowOptions = [
  'Anytime',
  'Morning',
  'Midday',
  'Afternoon',
  'Evening',
  'After Hours',
  'Customer-Specified Window',
];

const yesNoOptions = ['No', 'Yes'];

const stateOptions = [
  'Arizona',
  'Nevada',
  'California',
  'Texas',
  'New Mexico',
  'Utah',
  'Colorado',
  'Other',
];

const bestFitItems = [
  'Structured work orders with a defined scope',
  'Remote-team coordination and bridge-call support',
  'Infrastructure, endpoint, rollout, remediation, and controlled-environment work',
  'Multi-site or travel-capable work with real site context',
  'Buyers who need documentation and usable closeout, not just physical presence',
];

const notIdealItems = [
  'Consumer or residential tech support',
  'Undefined handyman-style requests',
  'Low-detail emergency requests with no scope or access information',
  'Broad requests with no real brief',
  'Requests that cannot provide a real site address, timing window, or onsite contact',
];

const handlingSteps = [
  {
    step: '01',
    title: 'Submit the request',
    body: 'Send the site details, requested timing, service type, scope summary, and any supporting context that affects onsite execution.',
  },
  {
    step: '02',
    title: 'We review fit',
    body: 'Coverage, schedule alignment, access requirements, travel factors, and execution fit are reviewed before the request is accepted.',
  },
  {
    step: '03',
    title: 'Onsite execution and closeout',
    body: 'Accepted work is handled onsite with communication, field notes, and closeout documentation your team can actually use.',
  },
];

export default function DispatchPage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Dispatch
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Qualified onsite execution starts with a clear dispatch request
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            This is the primary intake route for remote teams, MSPs, vendors,
            healthcare-adjacent operators, and rollout programs that need onsite work
            handled correctly. The better the request, the faster it can be qualified,
            routed, and executed.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="mailto:dispatch@alreadyherellc.com"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Email dispatch@alreadyherellc.com
            </a>
            <Link
              href="/services"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            >
              Review Services
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Dispatch intake
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Send the work the way it needs to be routed
            </h2>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
              Include the site, timing, scope, access considerations, and the operational
              context that matters. Regional and out-of-market travel requests are welcome
              for qualified work.
            </p>

            <form
              action="/api/dispatch"
              method="POST"
              className="mt-10 space-y-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8"
            >
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Full name
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="company"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Company
                  </label>
                  <input
                    id="company"
                    name="company"
                    type="text"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="businessEmail"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Business email
                  </label>
                  <input
                    id="businessEmail"
                    name="businessEmail"
                    type="email"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-slate-900">
                    Phone
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="fullSiteAddress"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Full site address
                </label>
                <input
                  id="fullSiteAddress"
                  name="fullSiteAddress"
                  type="text"
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                />
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label htmlFor="state" className="block text-sm font-semibold text-slate-900">
                    State
                  </label>
                  <select
                    id="state"
                    name="state"
                    required
                    defaultValue="Arizona"
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    {stateOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="siteCount"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    One site or multi-site
                  </label>
                  <select
                    id="siteCount"
                    name="siteCount"
                    required
                    defaultValue=""
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    <option value="" disabled>
                      Select one
                    </option>
                    <option value="One site">One site</option>
                    <option value="Multi-site">Multi-site</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="travelLikely"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Travel likely
                  </label>
                  <select
                    id="travelLikely"
                    name="travelLikely"
                    required
                    defaultValue="No"
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    {yesNoOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="requestedDate"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Requested date
                  </label>
                  <input
                    id="requestedDate"
                    name="requestedDate"
                    type="date"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="requestedWindow"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Requested window
                  </label>
                  <select
                    id="requestedWindow"
                    name="requestedWindow"
                    required
                    defaultValue=""
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    <option value="" disabled>
                      Select one
                    </option>
                    {windowOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="dueByTime"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Due-by time
                  </label>
                  <input
                    id="dueByTime"
                    name="dueByTime"
                    type="time"
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="serviceType"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Service type
                  </label>
                  <select
                    id="serviceType"
                    name="serviceType"
                    required
                    defaultValue=""
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    <option value="" disabled>
                      Select one
                    </option>
                    {serviceTypes.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="priority"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Priority
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    required
                    defaultValue="Standard"
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    {priorityOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="ticketReference"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Ticket / reference number
                  </label>
                  <input
                    id="ticketReference"
                    name="ticketReference"
                    type="text"
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="onsiteContact"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Onsite contact
                  </label>
                  <input
                    id="onsiteContact"
                    name="onsiteContact"
                    type="text"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="billingContact"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Billing contact
                  </label>
                  <input
                    id="billingContact"
                    name="billingContact"
                    type="text"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="liftRequired"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Lift required
                  </label>
                  <select
                    id="liftRequired"
                    name="liftRequired"
                    required
                    defaultValue="No"
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    {yesNoOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="toolsOrStagingRequired"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Tools / staging required
                  </label>
                  <select
                    id="toolsOrStagingRequired"
                    name="toolsOrStagingRequired"
                    required
                    defaultValue="No"
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  >
                    {yesNoOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-6">
                <div>
                  <label
                    htmlFor="scopeSummary"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    One-line scope summary
                  </label>
                  <input
                    id="scopeSummary"
                    name="scopeSummary"
                    type="text"
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="remoteBridgeDetails"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Remote bridge details
                  </label>
                  <textarea
                    id="remoteBridgeDetails"
                    name="remoteBridgeDetails"
                    rows={4}
                    required
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="accessNotes"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Access notes
                  </label>
                  <textarea
                    id="accessNotes"
                    name="accessNotes"
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="sharedFileLink"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Shared file link
                  </label>
                  <input
                    id="sharedFileLink"
                    name="sharedFileLink"
                    type="url"
                    placeholder="https://"
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="additionalNotes"
                    className="block text-sm font-semibold text-slate-900"
                  >
                    Additional notes
                  </label>
                  <textarea
                    id="additionalNotes"
                    name="additionalNotes"
                    rows={5}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Submit Dispatch Request
                </button>
                <a
                  href="mailto:dispatch@alreadyherellc.com"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-white"
                >
                  Email Dispatch Instead
                </a>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Direct dispatch contact
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                dispatch@alreadyherellc.com
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-700">
                Best for follow-up, documentation exchange, scope clarification, and project
                communication.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Best fit
              </p>
              <ul className="mt-4 space-y-3 text-base leading-7 text-slate-700">
                {bestFitItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                Not ideal for
              </p>
              <ul className="mt-4 space-y-3 text-base leading-7 text-slate-700">
                {notIdealItems.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-slate-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              How requests are handled
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Clear qualification before the visit is accepted
            </h2>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {handlingSteps.map((item) => (
              <article
                key={item.step}
                className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">
                  Step {item.step}
                </p>
                <h3 className="mt-3 text-xl font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-4 text-base leading-7 text-slate-700">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Coverage note
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Phoenix-based. Arizona-first. Qualified travel support available.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Regional and out-of-market requests can be supported for qualified work based on
              scope, timing, logistics, and commercial fit.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
