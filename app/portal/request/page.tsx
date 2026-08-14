import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPageSessionUser } from '@/lib/ahfos/auth';
import { IntakeForm } from '@/components/ahfos/IntakeForm';

export const metadata: Metadata = {
  title: 'Request Service | AHFOS Portal',
  alternates: { canonical: '/portal/request' },
};

export default async function RequestServicePage() {
  const user = await getPageSessionUser();
  if (!user) redirect('/portal/login');

  return (
    <main className="container-shell py-16">
      <IntakeForm />
    </main>
  );
}
