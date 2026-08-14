import { z } from 'zod';
import { getUserByEmail } from '@/lib/ahfos/store';
import { setSessionCookie, verifyPassword } from '@/lib/ahfos/auth';
import { err, ok } from '@/lib/ahfos/api-utils';
import { getClientIp, isRateLimited } from '@/lib/ahfos/rate-limit';

export const runtime = 'nodejs';

const LoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(128),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return err('Too many login attempts. Please try again later.', 429);
  }

  const body = await request.json().catch(() => ({}));
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) return err('Invalid login credentials.', 400);

  const { email, password } = parsed.data;
  const user = await getUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return err('Invalid email or password.', 401);
  }

  const response = ok({
    user: { id: user.id, email: user.email, name: user.name, roles: user.roles },
  });
  setSessionCookie(response, user);
  return response;
}
