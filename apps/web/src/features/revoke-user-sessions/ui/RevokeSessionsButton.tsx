'use client';

import type { AdminUser, UserRole } from '@repo/shared';
import { useRevokeAdminUserSessions } from '@/entities/user';
import { canManageRole } from '@/shared/lib/role-hierarchy';

type RevokeSessionsButtonProps = {
  target: AdminUser;
  actorRole: UserRole;
  isSelf: boolean;
};

export function RevokeSessionsButton(props: RevokeSessionsButtonProps) {
  const { target, actorRole, isSelf } = props;
  const { mutate, isPending, error } = useRevokeAdminUserSessions();

  const disabled = isSelf || !canManageRole(actorRole, target.role) || isPending;

  function handleClick() {
    mutate(target.id);
  }

  return (
    <span className="admin-users__cell">
      <button
        className="admin-users__action"
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title="Drop every refresh token: the user must log in again"
      >
        {isPending ? '…' : 'Log out'}
      </button>
      {error ? (
        <span className="admin-users__error">{error.message}</span>
      ) : null}
    </span>
  );
}
