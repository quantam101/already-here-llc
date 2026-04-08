import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Service Area | Already Here LLC',
  description:
    'Phoenix-based, Arizona-first onsite technical field execution with qualified regional and project-based travel support for remote teams, MSPs, vendors, healthcare-adjacent operators, and rollout programs.',
};

const primaryCoverage = [
  'Phoenix metro and surrounding Arizona markets',
  'Arizona-first support for qualified onsite dispatches',
  'Single-site and multi-site execution across Arizona',
  'Scheduled work, remediation, rollout support, and structured onsite follow-through',
];

const travelCoverage = [
  'Regional travel for qualified work',
  'Project-based travel reviewed by scope, timing, logistics, and commercial fit',
  'Common travel consideration includes Southern Nevada / Las Vegas, California, Texas, and surrounding western and southwestern markets',
  'Additional out-of-market work reviewed case by case',
];

const bestFitTravel = [
  'Multi-site rollout work',
  'Modernization and remediation assignments',
  'Vendor and prime-contractor support',
  'Remote-team-driven onsite execution',
  'Time-bound project work with clear scope',
  'Travel-capable dispatches with real site context and workable scheduling',
];

const reviewFactors = [
  {
    title: 'Scope quality',
    body: 'The work must be defined clearly enough to route, schedule, and execute without vague assumptions.',
  },
  {
    title: 'Timing and schedule fit',
    body: 'Requested date, arrival window, due-by constraints, and execution timing must be workable.',
  },
  {
    title: 'Access and site conditions',
    body: 'Travel work is reviewed against access readiness, onsite contact quality, site constraints, and any lift or staging requirements.',
  },
  {
    title: 'Commercial fit',
    body: 'Regional and extended-travel work is reviewed against travel burden, duration, project structure, and total dispatch value.',
  },
];

const notPositionedFor = [
  'City-spam style “we cover everywhere” claims',
  'Undefined break-fix requests with no real brief',
  'Low-detail travel calls without site, timing, access, or commercial clarity',
  'Commodity labor coverage positioning',
];

export default function ServiceAreaPage() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
            Service area
          </p>
          <h1 className="mt-4 max-w-5xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Phoenix-based. Arizona-first. Travel-capable for qualified onsite work.
          </h1>
          <p className="mt-6 max-w-4xl text-lg leading-8 text-slate-300">
            Already Here LLC is based in Phoenix and built to support Arizona first.
            Regional and project-based travel is available for qualified dispatches,
            multi-site rollout work, remediation assignments, and scheduled onsite
            technical field execution across surrounding markets and beyond.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dispatch"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Request Dispatch
            </Link>
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
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Primary coverage
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              Arizona is the operating base
            </h2>
            <ul className="mt-5 space-y-3 text-base leading-7 text-slate-700">
              {primaryCoverage.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-slate-950" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Qualified travel support
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              Travel is available for the right work
            </h2>
            <ul className="mt-5 space-y-3 text-base leading-7 text-slate-700">
              {travelCoverage.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              What fits travel best
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Travel works best when the assignment justifies disciplined field execution
            </h2>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-2">
            {bestFitTravel.map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-slate-200 bg-white p-5 text-base leading-7 text-slate-700"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              How travel requests are reviewed
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Coverage is qualified, not loosely promised
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              Already Here LLC is not framed as broad local IT help or generic national
              coverage. Travel requests are reviewed against execution quality, site
              readiness, logistics, and commercial viability before acceptance.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {reviewFactors.map((item) => (
              <article
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:p-8"
              >
                <h3 className="text-xl font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-4 text-base leading-7 text-slate-700">{item.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Positioning rule
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              This is qualified field coverage, not city spam
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-700">
              The model is Phoenix-based, Arizona-first, with regional and project travel
              available where the work is operationally and commercially sound.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 lg:p-8">
            <h3 className="text-xl font-semibold text-slate-950">Not positioned for</h3>
            <ul className="mt-5 space-y-3 text-base leading-7 text-slate-700">
              {notPositionedFor.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2.5 w-2.5 rounded-full bg-slate-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
              Need Arizona coverage or qualified travel support?
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Send the full site, timing, scope, and travel context through dispatch.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Requests with clear site details, access readiness, and workable scheduling
              move faster.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dispatch"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Request Dispatch
            </Link>
            <a
              href="mailto:dispatch@alreadyherellc.com"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-900"
            >
              Email Dispatch
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
