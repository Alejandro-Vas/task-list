'use client';

import { useState } from 'react';
import type { AdminUser, UserRole } from '@repo/shared';
import { useDeleteAdminUser } from '@/entities/user';
import { canManageRole } from '@/shared/lib/role-hierarchy';

type DeleteUserButtonProps = {
  target: AdminUser;
  actorRole: UserRole;
  isSelf: boolean;
};

/**
 * Deleting cascades to every task and project of the user, so the first click
 * only arms the button and the second one sends the request.
 */
export function DeleteUserButton(props: DeleteUserButtonProps) {
  const { target, actorRole, isSelf } = props;
  const [confirming, setConfirming] = useState(false);
  const { mutate, isPending, error } = useDeleteAdminUser();

  const disabled = isSelf || !canManageRole(actorRole, target.role);

  if (!confirming) {
    return (
      <button
        className="admin-users__action admin-users__action--danger"
        type="button"
        disabled={disabled}
        onClick={() => setConfirming(true)}
        title="Delete the user with all their tasks and projects"
      >
        Delete
      </button>
    );
  }

  return (
    <span className="admin-users__cell">
      <button
        className="admin-users__action admin-users__action--danger"
        type="button"
        disabled={isPending}
        onClick={() => mutate(target.id)}
      >
        {isPending
          ? '…'
          : `Delete ${target.name}: ${target.tasksCount} tasks, ${target.projectsCount} projects`}
      </button>
      <button
        className="admin-users__action"
        type="button"
        onClick={() => setConfirming(false)}
      >
        Cancel
      </button>
      {error ? <span className="admin-users__error">{error.message}</span> : null}
    </span>
  );
}
