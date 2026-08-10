import { NextResponse } from 'next/server';
import { assignRole, recordSecurityFinding } from '@/lib/revenue-command-security';
import { authorizeRevenueCommandInternalRequest, internalAuthError } from '@/lib/revenue-command-api-auth';

export const runtime = 'nodejs';

function denied(request: Request): NextResponse | null {
  const auth = authorizeRevenueCommandInternalRequest(request);
  return auth.ok ? null : NextResponse.json({ ok: false, ...internalAuthError(auth.reason) }, { status: 401 });
}

export async function POST(request: Request) {
  const unauthorized = denied(request);
  if (unauthorized) return unauthorized;
  const body = await request.json().catch(() => ({}));
  const type = String(body?.type || '');
  try {
    if (type === 'finding') {
      const result = await recordSecurityFinding({ findingType: String(body?.findingType || 'unknown'), severity: body?.severity || 'medium', resource: String(body?.resource || 'unknown'), description: String(body?.description || ''), remediation: body?.remediation ? String(body.remediation) : undefined });
      return NextResponse.json({ type, ...result });
    }
    if (type === 'assign_role') {
      const result = await assignRole({ contactId: String(body?.contactId || ''), roleName: String(body?.roleName || 'viewer'), grantedBy: String(body?.grantedBy || 'system') });
      return NextResponse.json({ type, ...result });
    }
    return NextResponse.json({ ok: false, message: 'Unknown security operation. Use finding or assign_role.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Security operation failed.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const unauthorized = denied(request);
  if (unauthorized) return unauthorized;
  return NextResponse.json({ ok: true, service: 'revenue-command-spine-security', operations: ['finding', 'assign_role'], description: 'Internal security findings and role assignments for the owned operational database.' });
}
