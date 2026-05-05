import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy policy for Already Here LLC website visitors and dispatch form submissions.'
};

export default function PrivacyPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Privacy Policy</span>
      <h1 className="section-title mt-5">Privacy policy</h1>
      <div className="mt-10 card p-8 sm:p-10">
        <div className="space-y-8 text-sm leading-7 text-slate-600">
          <section>
            <h2 className="text-lg font-semibold text-navy">Information collected</h2>
            <p className="mt-3">
              When you submit the dispatch form, the site may collect contact details, company information, site location details,
              service request information, scheduling notes, and any files you choose to upload.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy">How information is used</h2>
            <p className="mt-3">
              Submitted information is used to review scope, confirm coverage fit, respond to dispatch inquiries, and maintain records
              related to business communications and project intake.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy">File uploads and third-party processing</h2>
            <p className="mt-3">
              The dispatch form may route submissions through a third-party form processing service. Uploaded files and submitted details
              are transmitted only for dispatch intake and response handling.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy">Data retention</h2>
            <p className="mt-3">
              Information may be retained for business records, dispatch history, scheduling follow-up, and legal or operational needs.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-navy">Contact</h2>
            <p className="mt-3">
              If you have a privacy-related request regarding information submitted through this website, use the dispatch contact route provided on the site.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
