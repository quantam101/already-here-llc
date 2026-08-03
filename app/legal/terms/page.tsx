import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of service for Already Here LLC, GINC, and the marketplace platform.',
  alternates: { canonical: '/legal/terms' }
};

export default function TermsPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">Legal</span>
      <h1 className="section-title mt-5">Terms of Service</h1>
      <div className="mt-10 card p-8 sm:p-10">
        <div className="space-y-8 text-sm leading-7 text-slate-600">
          <section>
            <h2 className="text-lg font-semibold text-navy">1. Acceptance of terms</h2>
            <p className="mt-3">
              By accessing or using the Already Here LLC website, GINC platform, marketplace, dispatch form, or any related service, you agree to be bound by these Terms of Service and all applicable laws and regulations.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-navy">2. Platform description</h2>
            <p className="mt-3">
              Already Here LLC operates GINC — Growth & Interconnected Networks Collective, a DBA of Already Here LLC — a networking and marketplace platform that connects owners of vehicles, equipment, and spaces with renters, contractors, and businesses; and connects people seeking work or contracts with people and organizations that can perform the work. We facilitate introductions and intake; we do not guarantee transactions, employment, or outcomes.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-navy">3. User accounts and listings</h2>
            <p className="mt-3">
              Users may create member profiles, list assets or equipment for rent, and post work or contract needs. All information provided must be accurate and lawful. We reserve the right to remove content that violates these terms or applicable law.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-navy">4. Payments, deposits, and subscriptions</h2>
            <p className="mt-3">
              Payments processed through the platform are handled by third-party providers such as Stripe. Deposits, subscriptions, and marketplace fees are described at checkout. Users are responsible for understanding and complying with the terms of any rental, contract, or payment agreement they enter into.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-navy">5. Limitation of liability</h2>
            <p className="mt-3">
              Already Here LLC is not a party to transactions or contracts arranged through the platform. We are not liable for disputes, damages, injuries, or losses arising from rentals, work, contracts, or interactions between users. Users must carry appropriate insurance and obtain any required licenses or permits.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-navy">6. Intellectual property</h2>
            <p className="mt-3">
              All content, branding, and software on this site are the property of Already Here LLC or its licensors and are protected by copyright, trademark, and other laws.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-navy">7. Governing law</h2>
            <p className="mt-3">
              These terms are governed by the laws of the State of Arizona, USA, without regard to conflict of law principles.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-navy">8. Changes to terms</h2>
            <p className="mt-3">
              We may update these terms at any time. Continued use of the platform after changes constitutes acceptance of the updated terms.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-navy">9. Contact</h2>
            <p className="mt-3">
              For legal inquiries, contact dispatch@alreadyherellc.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
