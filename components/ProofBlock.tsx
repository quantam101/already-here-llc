import { closeoutItems, representativeWork } from '@/lib/site';

export function ProofBlock() {
  return (
    <section>
      <div className="mb-10">
        <span className="eyebrow">Representative work</span>
        <h2 className="section-title mt-5">Field execution across environments that matter</h2>
        <p className="section-copy">
          Clients include national retail technology vendors, enterprise infrastructure teams,
          healthcare-adjacent operators, and MSPs. Client names are available for qualified buyers when appropriate.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {representativeWork.map((item) => (
            <div key={item.scope} className="rounded-3xl border border-borderBrand bg-soft p-6">
              <span className="grid-label mb-2 block">{item.tag}</span>
              <p className="mb-2 text-sm font-semibold leading-snug text-navy">{item.client}</p>
              <p className="text-sm leading-6 text-slate-600">{item.scope}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-400">
          Dispatch history and closeout examples can be reviewed by qualified procurement buyers when relevant to scope.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex min-h-[360px] flex-col justify-between border-b border-borderBrand bg-slate-50 p-8 lg:border-b-0 lg:border-r sm:p-10">
            <div>
              <span className="eyebrow">Closeout standard</span>
              <h2 className="mt-5 text-3xl font-semibold tracking-tight text-navy">
                Clean documentation for work that remote teams cannot close remotely
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Closeout is structured around what a vendor, MSP, project manager, or buyer needs after the site visit: what was done, what was observed, what remains open, and what evidence supports the ticket.
              </p>
            </div>
            <div className="mt-8 rounded-3xl border border-borderBrand bg-white p-6">
              <p className="grid-label">Typical closeout package</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Arrival notes, field observations, photo references when permitted, equipment status, unresolved blockers, and next-step escalation notes.
              </p>
            </div>
          </div>
          <div className="p-8 sm:p-10">
            <span className="eyebrow">Documented closeout</span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-navy">
              Documented field execution, not vague capability claims
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Positioning is grounded in documented field activity spanning hardware replacement, surveys, rollouts, remediation, store technology, networking, AV/media, and infrastructure-related onsite work.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {closeoutItems.map((item) => (
                <li key={item} className="rounded-2xl border border-borderBrand bg-white px-4 py-4 text-sm text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
