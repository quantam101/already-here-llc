import { z } from 'zod';
import { createUser, getUsers } from '@/lib/ahfos/store';
import { hashPassword, setSessionCookie } from '@/lib/ahfos/auth';
import { err, ok } from '@/lib/ahfos/api-utils';

export const runtime = 'nodejs';

const SetupSchema = z.object({
  token: z.string().min(1),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(160),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = SetupSchema.safeParse(body);
  if (!parsed.success) return err('Invalid setup payload.', 400);

  const { token, email, password, name } = parsed.data;
  const expected = process.env.AHFOS_BOOTSTRAP_TOKEN;
  if (!expected) return err('Bootstrap is not enabled.', 403);
  if (token !== expected) return err('Invalid bootstrap token.', 403);

  const users = await getUsers();
  if (users.length > 0) return err('Bootstrap already complete.', 409);

  const user = await createUser({
    email,
    passwordHash: hashPassword(password),
    name,
    roles: ['admin'],
    company: 'Already Here LLC',
  });

  const response = ok({
    user: { id: user.id, email: user.email, name: user.name, roles: user.roles },
  });
  setSessionCookie(response, user);
  return response;
}
