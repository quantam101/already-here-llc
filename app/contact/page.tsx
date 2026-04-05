import type { Metadata } from 'next';
import { DispatchForm } from '@/components/DispatchForm';
import { markets } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Dispatch',
  description:
    'Submit scope, schedule, city, and dispatch details for Arizona field execution, recurring support, rollout work, remediation, and onsite project support.'
};

export default function ContactPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <span className="eyebrow">Request Dispatch</span>

          <h1 className="section-title mt-5">
            Send scope, city, timing, and the details that affect the site visit.
          </h1>

          <p className="section-copy">
            This form is built for B2B dispatch intake. Use it to submit scope details,
            schedule constraints, ticket references, and shared file links when needed.
          </p>

          <div className="mt-10 space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-navy">What to include</h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-600">
                <li>Site city and any known access constraints</li>
                <li>Scope summary and ticket or work-order number</li>
                <li>Due date or arrival window</li>
                <li>Shared links to PDFs, screenshots, survey references, or project files when needed</li>
              </ul>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold text-navy">Coverage note</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Public coverage language remains disciplined. Phoenix-based, with broader Arizona
                project support based on scope, scheduling, and travel requirements.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Documented Arizona markets include: {markets.join(', ')}.
              </p>
            </div>

            <div className="card p-6">
              <h2 className="text-lg font-semibold text-navy">Large files</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Attachments are currently accepted by shared link only. For manuals, photo sets,
                screenshots, closeout files, or other project documents, paste a Google Drive,
                Dropbox, or OneDrive link in the notes field.
              </p>
            </div>
          </div>
        </div>

        <DispatchForm />
      </div>
    </div>
  );
}