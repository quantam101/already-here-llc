import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requirePageAuth } from '@/lib/ahfos/auth';
import { getJobById } from '@/lib/ahfos/store';
import { TechnicianJobView } from '@/components/ahfos/TechnicianJobView';

export const metadata: Metadata = {
  title: 'Job | AHFOS Technician',
};

export default async function TechnicianJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageAuth(['admin', 'dispatcher', 'technician', 'project_manager']);
  const job = await getJobById(id);
  if (!job) notFound();

  const canAccess = user.roles.some((r) => ['admin', 'dispatcher', 'project_manager'].includes(r)) || job.assignedTo === user.id;
  if (!canAccess) notFound();

  return <TechnicianJobView jobId={job.id} user={{ id: user.id, name: user.name, roles: user.roles }} />;
}
