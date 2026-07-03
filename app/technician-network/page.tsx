import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Already Here Technician Network',
  description: 'Join the Already Here LLC technician network for Phoenix metro and project-based onsite IT, low-voltage-adjacent, POS, access-control, smart-hands, and field execution work.'
};

const skills = [
  'Smart hands and remote-hands support',
  'Network, AP, router, SD-WAN, and switch support',
  'POS, payment device, printer, scanner, and kiosk support',
  'Camera, AV, display, cable tracing, and signal checks',
  'Access-control and low-voltage-adjacent field support',
  'Rack/stack, part swaps, asset photos, closeout notes, and site documentation'
];

const requirements = [
  'Reliable transportation and professional onsite conduct',
  'Clear photos, notes, and closeout documentation',
  'Tool list and skill matrix verified before assignment',
  'No work accepted until scope, rate, and closeout requirements are approved',
  '1099/vendor model to start, with compliance requirements by client scope'
];

export default function TechnicianNetworkPage() {
  return (
    <section className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Technician network</span>
      <h1 className="section-title mt-5">Join the Already Here field execution network.</h1>
      <p className="section-copy">
        Already Here LLC is building a vetted Phoenix-centered technician network for onsite IT, smart hands, POS, access-control, cabling-adjacent, AV, camera, printer, and infrastructure support work.
      </p>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <div className="card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-navy">Skill lanes</h2>
          <div className="mt-6 grid gap-3">
            {skills.map((skill) => (
              <div key={skill} className="rounded-2xl border border-borderBrand bg-soft p-4 text-sm leading-6 text-slate-700">{skill}</div>
            ))}
          </div>
        </div>
        <div className="card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-navy">Operating standards</h2>
          <div className="mt-6 grid gap-3">
            {requirements.map((requirement) => (
              <div key={requirement} className="rounded-2xl border border-borderBrand bg-soft p-4 text-sm leading-6 text-slate-700">{requirement}</div>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-12 rounded-3xl border border-borderBrand bg-navy p-8 text-white">
        <h2 className="text-2xl font-semibold">Apply as a field resource</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80">
          Submit your name, phone, email, city, skills, tools, vehicle status, availability, travel radius, photos of tool kit if available, and preferred work lanes. Diesel/heavy-duty work is outside the current scope.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/dispatch" className="link-ring inline-flex items-center justify-center rounded-full bg-action px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white hover:text-navy">Submit Intake</Link>
          <Link href="/partner-with-us" className="link-ring inline-flex items-center justify-center rounded-full border border-white/35 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">Partner Standards</Link>
        </div>
      </section>
    </section>
  );
}
