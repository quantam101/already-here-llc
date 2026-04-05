import Link from "next/link";

export default function ThankYouPage() {
  return (
    <section className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-16 lg:px-8 lg:py-24">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center md:p-12">
          <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-sky-700">
            Submission received
          </div>

          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 md:text-5xl">
            Dispatch request received.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Your scope has been submitted. If the coverage fit, schedule, and
            site requirements align, the next step is dispatch confirmation.
          </p>

          <div className="mx-auto mt-10 grid max-w-3xl gap-4 text-left md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                What we received
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Scope details, site information, timing, and any notes you
                included with the request.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                What happens next
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                We review the request for coverage fit, scheduling, access
                constraints, and execution requirements.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Need another request
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                You can return to the dispatch page anytime to submit another
                site, project, or follow-up scope.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Submit Another Request
            </Link>

            <Link
              href="/services"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Review Services
            </Link>

            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}