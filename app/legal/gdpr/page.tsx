import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GDPR & Data Rights',
  description: 'Data protection and GDPR rights for Already Here LLC and GINC users.',
  alternates: { canonical: '/legal/gdpr' }
};

export default function GdprPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Legal</span>
      <h1 className="section-title mt-5">GDPR & Data Rights</h1>
      <div className="mt-10 card p-8 sm:p-10">
        <div className="space-y-8 text-sm leading-7 text-slate-600">
          <section>
            <h2 className="text-lg font-semibold text-navy">Data controller</h2>
            <p className="mt-3">
              Already Here LLC is the data controller for information collected through this website and the GINC platform. Contact: dispatch@alreadyherellc.com.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-navy">What we collect</h2>
            <p className="mt-3">
              We collect contact details, company information, location, service or rental requests, member profile information, and transaction-related data when you submit forms, create profiles, list assets, or post work opportunities.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-navy">Legal basis</h2>
            <p className="mt-3">
              We process personal data on the basis of contract performance, legitimate interest, and consent where required. You may withdraw consent at any time by contacting us.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-navy">Your rights</h2>
            <p className="mt-3">
              Depending on your jurisdiction, you may have rights to access, correct, delete, restrict, or object to processing of your personal data, and to data portability. To exercise these rights, contact dispatch@alreadyherellc.com.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-navy">Data retention and deletion</h2>
            <p className="mt-3">
              We retain data for business, legal, and operational needs. When you request deletion, we will remove your personal data from active systems unless we are required to retain it by law.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-navy">International transfers</h2>
            <p className="mt-3">
              Data is stored in the United States. If you are located outside the United States, your data will be transferred to and processed in the US. We use appropriate safeguards for international transfers.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-navy">Cookies and analytics</h2>
            <p className="mt-3">
              We use minimal cookies and analytics to operate and improve the site. You can control cookies through your browser settings.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-navy">Complaints</h2>
            <p className="mt-3">
              If you believe your data rights have been violated, you have the right to lodge a complaint with your local supervisory authority.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
