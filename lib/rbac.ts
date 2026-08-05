import type { GincMember, GincMemberRole } from '@/lib/ginc';

export const roleHierarchy: Record<GincMemberRole, number> = {
  member: 0,
  moderator: 1,
  admin: 2
};

export function hasRole(member: GincMember | undefined, minimumRole: GincMemberRole): boolean {
  if (!member) return false;
  return (roleHierarchy[member.role || 'member'] || 0) >= roleHierarchy[minimumRole];
}

export function canModerate(member: GincMember | undefined): boolean {
  return hasRole(member, 'moderator');
}

export function canAdminister(member: GincMember | undefined): boolean {
  return hasRole(member, 'admin');
}

export function ownsResource(member: GincMember | undefined, memberId: string): boolean {
  return member?.id === memberId;
}

export function canManage(member: GincMember | undefined, resourceMemberId: string): boolean {
  return canModerate(member) || ownsResource(member, resourceMemberId);
}
