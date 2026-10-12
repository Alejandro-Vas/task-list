import { USER_ROLES, USER_ROLE_RANK, type UserRole } from '@repo/shared';

/**
 * The hierarchy is strict: an actor manages only roles ranked below their own.
 * OWNER manages ADMIN and USER, ADMIN manages USER, USER manages nobody.
 */
export function canManageRole(actorRole: UserRole, targetRole: UserRole): boolean {
  return USER_ROLE_RANK[targetRole] > USER_ROLE_RANK[actorRole];
}

/** Roles the actor is allowed to manage, ordered from the highest to the lowest. */
export function manageableRoles(actorRole: UserRole): UserRole[] {
  return USER_ROLES.filter((role) => canManageRole(actorRole, role));
}
