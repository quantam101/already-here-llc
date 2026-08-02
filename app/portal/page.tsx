import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPageSessionUser } from '@/lib/ahfos/auth';
import { CustomerPortal } from '@/components/ahfos/CustomerPortal';

export const metadata: Metadata = {
  title: 'Customer Portal | AHFOS',
  alternates: { canonical: '/portal' },
};

export default async function PortalPage() {
  const user = await getPageSessionUser();
  if (!user) redirect('/portal/login');

  if (user.roles.includes('admin') || user.roles.includes('dispatcher') || user.roles.includes('project_manager')) {
    redirect('/dispatch-board');
  }

  if (user.roles.includes('technician')) {
    redirect('/technician/jobs');
  }

  return <CustomerPortal user={{ name: user.name, email: user.email, roles: user.roles }} />;
}
