import { DispatchForm } from "../../components/DispatchForm";

const intakeItems = [
  "Site city and any known access constraints",
  "Scope summary and ticket, WO, or project reference",
  "Requested date, arrival window, or due-by timing",
  "Shared links to PDFs, screenshots, surveys, or project files",
];

const fitItems = [
  "Single-site dispatches that need reliable onsite ownership",
  "Recurring field visits and post-install follow-through",
  "Store, branch, and multi-site technology support",
  "Projects that require clear documentation and clean closeout",
];

const fileItems = [
  "Share links when files are large or held in your portal",
  "Include screenshots, survey notes, device lists, or reference docs",
  "Use the notes field to call out lockbox, access, or scheduling issues",
];

export default function ContactPage() {
  return (
    <section className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
        <div>
          <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-sky-700">
            Request dispatch
          </div>

          <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-tight text-slate-900 md:text-6xl">
            Send scope, city, timing, and the details that affect the site
            visit.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Use this form to send dispatch details, schedule constraints,
            project references, and supporting notes so the onsite visit starts
            with the right context.
          </p>

          <div className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-6 md:p-7">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              What to include
            </h2>
            <ul className="mt-5 space-y-4 text-base leading-8 text-slate-600">
              {intakeItems.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 md:p-7">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Best fit
            </h2>
            <ul className="mt-5 space-y-4 text-base leading-8 text-slate-600">
              {fitItems.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 md:p-7">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Shared files and notes
            </h2>
            <ul className="mt-5 space-y-4 text-base leading-8 text-slate-600">
              {fileItems.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-3 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <DispatchForm />
        </div>
      </div>
    </section>
  );
}