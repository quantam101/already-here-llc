import type { Metadata } from 'next';
import Link from 'next/link';
import { ApplicantForm } from '@/components/ApplicantForm';

export const metadata: Metadata = {
  title: 'Already Here Technician Network',
  description: 'Apply for employee, contractor, vendor, partner, and project-based field opportunities with Already Here LLC.'
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
  'Classification, onboarding, insurance, payroll, and compliance requirements depend on the approved work relationship and client scope'
];

export default function TechnicianNetworkPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <section>
        <span className="eyebrow">Technician and applicant network</span>
        <h1 className="section-title mt-5">Join the Already Here field execution and operations network.</h1>
        <p className="section-copy">
          Already Here LLC accepts applications from experienced field technicians, employee candidates, independent contractors, partner companies, project coordinators, and operational support resources. Applications are retained for screening, matching, future projects, and approved hiring processes.
        </p>
      </section>

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
        <h2 className="text-2xl font-semibold">What happens after application</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          {[
            ['1', 'Intake', 'Your information receives an applicant reference number and structured record.'],
            ['2', 'Screening', 'Skills, location, availability, tools, work path, and role fit are reviewed.'],
            ['3', 'Qualification', 'Additional documents, interview, references, testing, or compliance items may be requested.'],
            ['4', 'Approval', 'Only an approved written offer, contract, vendor agreement, or assignment creates a work relationship.']
          ].map(([number, title, body]) => (
            <div key={number} className="rounded-2xl border border-white/15 bg-white/5 p-5">
              <span className="text-sm font-bold text-[#7DB0FF]">{number}</span>
              <h3 className="mt-2 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/75">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
        <div>
          <span className="eyebrow">Apply</span>
          <h2 className="section-title mt-5">Submit one structured applicant record.</h2>
          <p className="section-copy">
            Choose employee, contractor, either, or partner-company consideration. Provide enough information to support skill matching and screening without sending high-risk identity or financial information.
          </p>
          <div className="mt-6 rounded-3xl border border-borderBrand bg-soft p-6 text-sm leading-7 text-slate-700">
            <h3 className="font-semibold text-navy">Initial intake does not request</h3>
            <p className="mt-2">Social Security numbers, banking information, driver-license numbers, passports, medical records, or tax forms. Those are handled only through a separate secure process after a legitimate need and approval exist.</p>
          </div>
          <Link href="/partner-with-us" className="link-ring mt-6 inline-flex rounded-full border border-borderBrand px-5 py-3 text-sm font-semibold text-navy hover:border-action">Review Partner Standards</Link>
        </div>
        <ApplicantForm />
      </section>
    </div>
  );
}
