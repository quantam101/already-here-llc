import { z } from 'zod';
import { authenticated, err, ok, safeJson } from '@/lib/ahfos/api-utils';
import { AhfosRoleSchema, User } from '@/lib/ahfos/schema';
import { hashPassword } from '@/lib/ahfos/auth';
import { createUser, getUsers } from '@/lib/ahfos/store';

export const runtime = 'nodejs';

const ADMIN_ROLES: User['roles'][number][] = ['admin', 'dispatcher', 'project_manager'];

const CreateUserSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  roles: z.array(AhfosRoleSchema).min(1),
  skills: z.array(z.string().max(80)).default([]),
  company: z.string().max(200).optional().default(''),
});

export async function GET(request: Request) {
  const { response } = await authenticated(request, ADMIN_ROLES);
  if (response) return response;

  const url = new URL(request.url);
  const role = url.searchParams.get('role');
  const users = await getUsers();
  const filtered = role ? users.filter((u) => u.roles.includes(role as User['roles'][number])) : users;

  return ok({
    users: filtered.map((u) => ({ id: u.id, email: u.email, name: u.name, roles: u.roles, skills: u.skills, company: u.company })),
  });
}

export async function POST(request: Request) {
  const { response } = await authenticated(request, ['admin']);
  if (response) return response;

  const body = await safeJson(request);
  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) return err('Invalid user payload.', 400);

  const { name, email, password, roles, skills, company } = parsed.data;

  const created = await createUser({
    email,
    passwordHash: hashPassword(password),
    name,
    roles,
    skills,
    company,
  });

  return ok({
    user: { id: created.id, email: created.email, name: created.name, roles: created.roles, skills: created.skills, company: created.company },
  }, { status: 201 });
}
