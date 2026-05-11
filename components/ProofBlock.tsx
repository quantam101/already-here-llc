import { closeoutItems, representativeWork } from '@/lib/site';

export function ProofBlock() {
  return (
    <section>
      {/* Representative work — real jobs, no client names */}
      <div className="mb-10">
        <span className="eyebrow">Representative work</span>
        <h2 className="section-title mt-5">Field execution across environments that matter</h2>
        <p className="section-copy">
          Clients include national retail technology vendors, enterprise infrastructure teams,
          healthcare-adjacent operators, and MSPs across the Phoenix metro and Western US.
          Client names available for qualified buyers upon request.
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
          Field Nation and WorkMarket dispatch history available for verification by qualified procurement buyers.
        </p>
      </div>

      {/* Closeout documentation proof */}
      <div className="card overflow-hidden bg-white">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="border-b border-[#19324D] bg-white p-6 lg:border-b-0 lg:border-r sm:p-8">
            <div className="rounded-3xl border border-[#19324D] bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 border-b border-[#19324D] pb-5">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#475569]">Closeout packet</p>
                  <h3 className="mt-2 text-xl font-bold leading-snug text-[#071B34]">Redacted field-work sample</h3>
                </div>
                <span className="rounded-full border border-[#CBD5E1] bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#475569]">
                  Completed
                </span>
              </div>
              <div className="mt-6 grid gap-4">
                {[
                  ['Site verification', 'Access, equipment state, and visible site conditions documented.'],
                  ['Work performed', 'Defined onsite tasks completed or escalated with clear blocker notes.'],
                  ['Photo evidence', 'Before, during, and after photos captured when permitted by site policy.'],
                  ['Ticket closeout', 'Outcome, next action, and buyer-facing summary returned for dispatch closure.']
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-[#19324D] bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1B66FF]">{label}</p>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#334155]">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-white p-8 sm:p-10">
            <span className="eyebrow">Documented closeout</span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-navy">
              Documented field execution, not vague capability claims
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Positioning is grounded in documented field activity spanning hardware replacement, surveys,
              rollouts, remediation, store technology, networking, AV/media, and infrastructure-related
              onsite work across Arizona and out-of-state project markets.
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
