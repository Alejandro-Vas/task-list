import { USER_ROLES, USER_ROLE_RANK, type UserRole } from '@repo/shared';

/**
 * Client-side mirror of the API hierarchy rules. It only decides which buttons
 * to disable — the API stays the single source of truth and rejects anything
 * else with 403.
 */
export function canManageRole(
  actorRole: UserRole,
  targetRole: UserRole,
): boolean {
  return USER_ROLE_RANK[targetRole] > USER_ROLE_RANK[actorRole];
}

/** Roles the actor may assign: strictly below their own. */
export function assignableRoles(actorRole: UserRole): UserRole[] {
  return USER_ROLES.filter((role) => canManageRole(actorRole, role));
}

/** Roles allowed to open the admin panel; mirrors the API `@Roles(...)`. */
export const ADMIN_ROLES = ['ADMIN', 'OWNER'] as const;

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  USER: 'User',
};
