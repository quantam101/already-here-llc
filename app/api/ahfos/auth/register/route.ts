import { z } from 'zod';
import { createCustomer, createUser, getUserByEmail } from '@/lib/ahfos/store';
import { hashPassword, setSessionCookie } from '@/lib/ahfos/auth';
import { err, ok } from '@/lib/ahfos/api-utils';

export const runtime = 'nodejs';

const RegisterSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  company: z.string().max(200).optional().default(''),
  phone: z.string().min(10).max(40).optional().default(''),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) return err('Invalid registration data.', 400);

  const { name, email, password, company, phone } = parsed.data;

  const existing = await getUserByEmail(email);
  if (existing) return err('Email already registered.', 409);

  const user = await createUser({
    email,
    passwordHash: hashPassword(password),
    name,
    roles: ['customer'],
    company,
  });

  await createCustomer({
    userId: user.id,
    name,
    company,
    phone,
    email,
    addresses: [],
  });

  const response = ok({ user: { id: user.id, email: user.email, name: user.name, roles: user.roles } });
  setSessionCookie(response, user);
  return response;
}
