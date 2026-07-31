import type { Metadata } from 'next';
import { GincListingForm } from '@/components/GincListingForm';
import { gincConfig } from '@/lib/ginc';

export const metadata: Metadata = {
  title: 'List an Asset on GINC',
  description: 'List a vehicle, tool, equipment, apartment, storage space, or other asset on GINC.',
  alternates: { canonical: '/ginc/list' }
};

export default function GincListPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">{gincConfig.name}</span>
      <h1 className="section-title mt-5">List an asset</h1>
      <p className="section-copy">
        Turn idle vehicles, tools, equipment, or space into income. List it once and get matched with renters, businesses, and workers who need it.
      </p>
      <GincListingForm />
    </div>
  );
}
