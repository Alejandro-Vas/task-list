'use client';

import type { AdminUser, UserRole } from '@repo/shared';
import { useBlockAdminUser, useUnblockAdminUser } from '@/entities/user';
import { canManageRole } from '@/shared/lib/role-hierarchy';

type BlockUserButtonProps = {
  target: AdminUser;
  actorRole: UserRole;
  isSelf: boolean;
};

export function BlockUserButton(props: BlockUserButtonProps) {
  const { target, actorRole, isSelf } = props;
  const block = useBlockAdminUser();
  const unblock = useUnblockAdminUser();

  const isPending = block.isPending || unblock.isPending;
  const disabled = isSelf || !canManageRole(actorRole, target.role) || isPending;
  const error = block.error ?? unblock.error;

  function handleClick() {
    if (target.isBlocked) {
      unblock.mutate(target.id);

      return;
    }

    block.mutate(target.id);
  }

  return (
    <span className="admin-users__cell">
      <button
        className="admin-users__action"
        type="button"
        onClick={handleClick}
        disabled={disabled}
        title={
          target.isBlocked
            ? 'Unblock the account'
            : 'Block the account and drop its sessions'
        }
      >
        {isPending ? '…' : target.isBlocked ? 'Unblock' : 'Block'}
      </button>
      {error ? (
        <span className="admin-users__error">{error.message}</span>
      ) : null}
    </span>
  );
}
