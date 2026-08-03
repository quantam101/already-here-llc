import { createHash } from 'node:crypto';
import { persistDatabaseReadyWrites } from './revenue-command-db';
import type { DatabaseReadyWrite } from './revenue-command-intake';

function hashId(prefix: string, value: string): string {
  return `${prefix}_${createHash('sha256').update(value).digest('hex').slice(0, 16)}`;
}

function now(): string {
  return new Date().toISOString();
}

export interface SecurityFinding {
  findingType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resource: string;
  description: string;
  remediation?: string;
}

export interface RoleAssignment {
  contactId: string;
  roleName: string;
  grantedBy: string;
}

export function buildSecurityFindingWrites(finding: SecurityFinding): DatabaseReadyWrite[] {
  const id = hashId('security', `${finding.resource}:${finding.findingType}:${now()}`);
  return [{
    table: 'security_findings',
    id,
    action: 'insert',
    record: {
      id,
      finding_type: finding.findingType,
      severity: finding.severity,
      resource: finding.resource,
      description: finding.description,
      remediation: finding.remediation || '',
      status: 'open',
      created_at: now(),
      updated_at: now()
    }
  }, {
    table: 'audit_logs',
    id: hashId('audit', `security:${id}`),
    action: 'insert',
    record: {
      id: hashId('audit', `security:${id}`),
      actor: 'security_platform',
      action: 'security_finding_recorded',
      target_table: 'security_findings',
      target_id: id,
      risk_level: finding.severity === 'critical' ? 'high' : finding.severity,
      allowed: 1,
      reason: `Security finding recorded for ${finding.resource}: ${finding.findingType}`,
      created_at: now()
    }
  }];
}

export async function recordSecurityFinding(finding: SecurityFinding): Promise<{ ok: boolean; inserted: number; errors: string[]; id: string }> {
  const writes = buildSecurityFindingWrites(finding);
  const { inserted, errors } = await persistDatabaseReadyWrites(writes);
  return { ok: errors.length === 0, inserted, errors, id: writes[0].id };
}

export async function assignRole({ contactId, roleName, grantedBy }: RoleAssignment): Promise<{ ok: boolean; inserted: number; errors: string[]; id: string }> {
  const roleId = hashId('role', roleName);
  const id = hashId('user_role', `${contactId}:${roleName}`);
  const writes: DatabaseReadyWrite[] = [{
    table: 'roles',
    id: roleId,
    action: 'insert',
    record: {
      id: roleId,
      role_name: roleName,
      permissions_json: JSON.stringify(['read:owned_data', 'write:local_proof']),
      created_at: now(),
      updated_at: now()
    }
  }, {
    table: 'user_roles',
    id,
    action: 'insert',
    record: {
      id,
      contact_id: contactId,
      role_id: roleId,
      granted_by: grantedBy,
      created_at: now(),
      updated_at: now()
    }
  }];
  const { inserted, errors } = await persistDatabaseReadyWrites(writes);
  return { ok: errors.length === 0, inserted, errors, id };
}
