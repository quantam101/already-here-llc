import { NextResponse } from 'next/server';
import { assignRole, recordSecurityFinding } from '@/lib/revenue-command-security';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const type = String(body?.type || '');

  try {
    if (type === 'finding') {
      const result = await recordSecurityFinding({
        findingType: String(body?.findingType || 'unknown'),
        severity: body?.severity || 'medium',
        resource: String(body?.resource || 'unknown'),
        description: String(body?.description || ''),
        remediation: body?.remediation ? String(body.remediation) : undefined
      });
      return NextResponse.json({ type, ...result });
    }

    if (type === 'assign_role') {
      const result = await assignRole({
        contactId: String(body?.contactId || ''),
        roleName: String(body?.roleName || 'viewer'),
        grantedBy: String(body?.grantedBy || 'system')
      });
      return NextResponse.json({ type, ...result });
    }

    return NextResponse.json({ ok: false, message: 'Unknown security operation. Use finding or assign_role.' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Security operation failed.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'revenue-command-spine-security',
    operations: ['finding', 'assign_role'],
    description: 'Record security findings and role assignments into the owned operational database.'
  });
}
