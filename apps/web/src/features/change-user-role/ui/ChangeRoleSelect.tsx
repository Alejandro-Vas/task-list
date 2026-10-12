'use client';

import type { AdminUser, UserRole } from '@repo/shared';
import { useUpdateUserRole } from '@/entities/user';
import {
  assignableRoles,
  canManageRole,
  ROLE_LABELS,
} from '@/shared/lib/role-hierarchy';

type ChangeRoleSelectProps = {
  target: AdminUser;
  actorRole: UserRole;
  isSelf: boolean;
};

/**
 * Renders a plain badge when the actor cannot manage the target: the select
 * would only offer roles the API rejects anyway.
 */
export function ChangeRoleSelect(props: ChangeRoleSelectProps) {
  const { target, actorRole, isSelf } = props;
  const { mutate, isPending } = useUpdateUserRole();

  if (isSelf || !canManageRole(actorRole, target.role)) {
    return (
      <span
        className={`admin-users__role admin-users__role--${target.role.toLowerCase()}`}
      >
        {ROLE_LABELS[target.role]}
      </span>
    );
  }

  return (
    <select
      className="admin-users__select"
      value={target.role}
      disabled={isPending}
      aria-label={`Role of ${target.email}`}
      onChange={(event) =>
        mutate({
          id: target.id,
          role: event.target.value as UserRole,
        })
      }
    >
      {assignableRoles(actorRole).map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </select>
  );
}
