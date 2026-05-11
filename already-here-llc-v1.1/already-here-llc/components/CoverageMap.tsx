import { markets } from '@/lib/site';

const primaryMarkets = ['Phoenix', 'Tempe', 'Chandler', 'Scottsdale', 'Glendale', 'Mesa', 'Peoria', 'Avondale', 'Goodyear', 'Surprise'];
const extendedMarkets = markets.filter((market) => !primaryMarkets.includes(market));

export function CoverageMap() {
  return (
    <div className="card overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-navy p-8 text-white sm:p-10">
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
            Arizona coverage anchor
          </span>
          <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Phoenix-centered field coverage across Arizona markets.</h2>
          <p className="mt-4 text-base leading-7 text-white/75">
            Built for out-of-state dispatchers and project managers who need a fast read on Arizona geography, travel planning, and qualified site coverage.
          </p>
          <div className="mt-8 rounded-3xl border border-white/15 bg-white/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">Coverage model</p>
            <p className="mt-3 text-sm leading-6 text-white/80">
              Phoenix metro is the core response market. Extended Arizona and nationwide project coverage are reviewed by scope, schedule, access requirements, and travel economics.
            </p>
          </div>
        </div>
        <div className="bg-white p-8 sm:p-10">
          <div className="relative min-h-[360px] overflow-hidden rounded-3xl border border-borderBrand bg-soft p-6">
            <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-action/30" />
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-action/20" />
            <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full border border-action/10" />
            <div className="relative z-10 grid min-h-[312px] place-items-center">
              <div className="rounded-3xl border border-action bg-white px-6 py-5 text-center shadow-panel">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-action">Core hub</p>
                <p className="mt-2 text-2xl font-semibold text-navy">Phoenix, AZ</p>
                <p className="mt-2 text-sm text-slate-600">Dispatch, project coordination, and market coverage base</p>
              </div>
            </div>
          </div>
          <div className="mt-8">
            <p className="grid-label">Primary metro markets</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {primaryMarkets.map((market) => (
                <span key={market} className="rounded-full border border-borderBrand bg-white px-3 py-2 text-sm font-medium text-slate-700">{market}</span>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <p className="grid-label">Extended / project-reviewed markets</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {extendedMarkets.map((market) => (
                <span key={market} className="rounded-full border border-borderBrand px-3 py-2 text-sm text-slate-600">{market}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
