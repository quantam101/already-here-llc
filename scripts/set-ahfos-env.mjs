import { randomBytes } from 'crypto';

const token = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID || 'prj_BIlFNPBMqdEVPrshDZwIQBHULeAh';
const teamId = process.env.VERCEL_TEAM_ID || 'team_NeZ8G2LAkYH8RVIx6ZiPi43T';

if (!token) {
  console.error('VERCEL_TOKEN is required');
  process.exit(1);
}

const base = `https://api.vercel.com/v10/projects/${projectId}/env`;
const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

async function api(method, path = '', body) {
  const url = `${base}${path}${teamId ? `?teamId=${teamId}` : ''}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`Vercel API ${method} ${path} returned ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function findEnv(key) {
  const list = await api('GET');
  return (list.envs || []).find((e) => e.key === key);
}

async function upsertEnv(key, value, targets = ['production', 'preview', 'development']) {
  const existing = await findEnv(key);
  if (existing) {
    await api('PATCH', `/${existing.id}`, { value, target: targets });
    console.log(`Updated ${key}`);
  } else {
    await api('POST', '', { key, value, target: targets, type: 'encrypted' });
    console.log(`Created ${key}`);
  }
}

async function main() {
  const sessionSecret = process.env.AHFOS_SESSION_SECRET || randomBytes(64).toString('base64url');
  const bootstrapToken = process.env.AHFOS_BOOTSTRAP_TOKEN || randomBytes(32).toString('hex');

  await upsertEnv('AHFOS_SESSION_SECRET', sessionSecret);
  await upsertEnv('AHFOS_BOOTSTRAP_TOKEN', bootstrapToken);
  await upsertEnv('AHFOS_DATA_DIR', '/tmp/ahfos');

  console.log('AHFOS production environment variables configured on Vercel.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
