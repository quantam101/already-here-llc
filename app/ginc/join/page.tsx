import type { Metadata } from 'next';
import { GincJoinForm } from '@/components/GincJoinForm';
import { gincConfig } from '@/lib/ginc';

export const metadata: Metadata = {
  title: 'Join GINC',
  description: 'Create a GINC profile and start listing assets or finding work.',
  alternates: { canonical: '/ginc/join' }
};

export default function GincJoinPage() {
  return (
    <div className="container-shell py-16 lg:py-24">
      <span className="eyebrow">{gincConfig.name}</span>
      <h1 className="section-title mt-5">Join the network</h1>
      <p className="section-copy">
        Create a profile so you can list assets, post work, and be matched with people nearby.
      </p>
      <GincJoinForm />
    </div>
  );
}
