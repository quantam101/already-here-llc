import { authenticated, ok } from '@/lib/ahfos/api-utils';
import { AhfosRole } from '@/lib/ahfos/schema';
import { getKnowledgeEntries } from '@/lib/ahfos/store';

export const runtime = 'nodejs';

const KB_ROLES: AhfosRole[] = ['admin', 'dispatcher', 'project_manager', 'technician', 'office_manager'];

export async function GET(request: Request) {
  const { response } = await authenticated(request, KB_ROLES);
  if (response) return response;

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const trade = (url.searchParams.get('trade') ?? '').trim().toLowerCase();

  let entries = await getKnowledgeEntries();
  if (trade) entries = entries.filter((e) => e.trade.toLowerCase().includes(trade));
  if (q) {
    entries = entries.filter((e) =>
      e.problem.toLowerCase().includes(q) ||
      e.resolution.toLowerCase().includes(q) ||
      e.parts.some((p) => p.toLowerCase().includes(q)) ||
      e.labor.some((l) => l.toLowerCase().includes(q)),
    );
  }

  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return ok({ entries: entries.slice(0, 100) });
}
