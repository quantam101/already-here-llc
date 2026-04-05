import Image from 'next/image';
import { closeoutItems } from '@/lib/site';

export function ProofBlock() {
  return (
    <section className="card overflow-hidden">
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
          <span className="eyebrow">Proof block</span>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight text-navy">Documented field execution, not vague capability claims</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Positioning is grounded in documented field activity spanning hardware replacement, surveys, rollouts, remediation,
            store technology, networking, AV/media, and infrastructure-related onsite work across Arizona project markets.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {closeoutItems.map((item) => (
              <li key={item} className="rounded-2xl border border-borderBrand bg-white px-4 py-4 text-sm text-slate-700">
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-6 text-slate-500">
            Sample shown is redacted for privacy. Additional proof assets and documentation samples can be added after launch.
          </p>
        </div>
      </div>
    </section>
  );
}
