import type { Metadata } from 'next';
import { GincJobForm } from '@/components/GincJobForm';
import { gincConfig } from '@/lib/ginc';

export const metadata: Metadata = {
  title: 'Post Work on GINC',
  description: 'Post a job, contract, or work need on GINC and get matched with workers, vehicles, and equipment.',
  alternates: { canonical: '/ginc/work' }
};

export default function GincWorkPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">{gincConfig.name}</span>
      <h1 className="section-title mt-5">Post work / need</h1>
      <p className="section-copy">
        Need a worker, a vehicle, a trailer, or a crew? Post it here and the network will match you with people and assets nearby.
      </p>
      <GincJobForm />
    </div>
  );
}
