import { getSessionUser } from '@/lib/ahfos/auth';
import { ok } from '@/lib/ahfos/api-utils';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return ok({ user: null });
  return ok({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
      company: user.company,
    },
  });
}
