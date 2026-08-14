import { authenticated, ok } from '@/lib/ahfos/api-utils';
import { managementAgent } from '@/lib/ahfos/agents';
import { AhfosRole } from '@/lib/ahfos/schema';
import { getJobs, getUsers } from '@/lib/ahfos/store';

export const runtime = 'nodejs';

const MANAGEMENT_ROLES: AhfosRole[] = ['admin', 'dispatcher', 'project_manager', 'office_manager', 'accounting'];

export async function GET(request: Request) {
  const { response } = await authenticated(request, MANAGEMENT_ROLES);
  if (response) return response;

  const [jobs, users] = await Promise.all([getJobs(), getUsers()]);
  const technicians = users
    .filter((u) => u.roles.includes('technician'))
    .map((u) => ({ id: u.id, name: u.name }));

  return ok({ report: managementAgent(jobs, technicians) });
}
