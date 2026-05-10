import Image from 'next/image';
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
            <div
              key={item.scope}
              className="rounded-3xl border border-borderBrand bg-soft p-6"
            >
              <span className="grid-label block mb-2">{item.tag}</span>
              <p className="text-sm font-semibold text-navy leading-snug mb-2">{item.client}</p>
              <p className="text-sm leading-6 text-slate-600">{item.scope}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-slate-400">
          Field Nation and WorkMarket dispatch history available for verification by qualified procurement buyers.
        </p>
      </div>

      {/* Closeout documentation proof */}
      <div className="card overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="border-b border-borderBrand bg-slate-50 lg:border-b-0 lg:border-r">
            <Image
              src="/proof-sample.jpg"
              alt="Redacted field-work documentation sample"
              width={1600}
              height={900}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div className="p-8 sm:p-10">
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
