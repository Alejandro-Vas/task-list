'use client';

import { useState } from 'react';
import type { UserRole } from '@repo/shared';
import { ADMIN_PER_PAGE, useAdminUsersQuery } from '@/entities/user';
import { useAuth } from '@/features/auth';
import { BlockUserButton } from '@/features/block-user';
import { ChangeRoleSelect } from '@/features/change-user-role';
import { DeleteUserButton } from '@/features/delete-user';
import { RevokeSessionsButton } from '@/features/revoke-user-sessions';
import {
  assignableRoles,
  ROLE_LABELS,
} from '@/shared/lib/role-hierarchy';

const ANY_ROLE = '';

type AdminUsersTableProps = {
  actorRole: UserRole;
};

export function AdminUsersTable(props: AdminUsersTableProps) {
  const { actorRole } = props;
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const [role, setRole] = useState<UserRole | typeof ANY_ROLE>(ANY_ROLE);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');

  const { data, error, isPending, isPlaceholderData } = useAdminUsersQuery({
    page,
    perPage: ADMIN_PER_PAGE,
    ...(search ? { search } : {}),
    ...(role ? { role } : {}),
  });

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.perPage))
    : 1;

  function applyFilters(nextSearch: string, nextRole: UserRole | typeof ANY_ROLE) {
    setSearch(nextSearch);
    setRole(nextRole);
    setPage(1);
  }

  if (isPending) {
    return <p className="page__loading">Loading…</p>;
  }

  if (error) {
    return <p className="page__error">Could not load users: {error.message}</p>;
  }

  return (
    <>
      <form
        className="admin-users__filters"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters(searchDraft.trim(), role);
        }}
      >
        <input
          className="admin-users__search"
          type="search"
          value={searchDraft}
          placeholder="Search by email or name"
          aria-label="Search by email or name"
          onChange={(event) => setSearchDraft(event.target.value)}
        />
        <select
          className="admin-users__select"
          value={role}
          aria-label="Filter by role"
          onChange={(event) =>
            applyFilters(
              search,
              event.target.value as UserRole | typeof ANY_ROLE,
            )
          }
        >
          <option value={ANY_ROLE}>All manageable roles</option>
          {assignableRoles(actorRole).map((option) => (
            <option key={option} value={option}>
              {ROLE_LABELS[option]}
            </option>
          ))}
        </select>
        <button className="admin-users__action" type="submit">
          Search
        </button>
      </form>

      <p className="admin-users__total">
        {data.total} user{data.total === 1 ? '' : 's'}
        {isPlaceholderData ? ' (loading…)' : ''}
      </p>

      <table className="admin-users">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Tasks</th>
            <th>Projects</th>
            <th>Registered</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((target) => {
            const isSelf = target.id === user?.id;

            return (
              <tr
                key={target.id}
                className={target.isBlocked ? 'admin-users__row--blocked' : undefined}
              >
                <td>
                  <span className="admin-users__name">
                    {target.name}
                    {isSelf ? <span className="admin-users__tag">you</span> : null}
                    {target.isBlocked ? (
                      <span className="admin-users__tag admin-users__tag--blocked">
                        blocked
                      </span>
                    ) : null}
                  </span>
                  <span className="admin-users__email">{target.email}</span>
                </td>
                <td>
                  <ChangeRoleSelect
                    target={target}
                    actorRole={actorRole}
                    isSelf={isSelf}
                  />
                </td>
                <td>{target.tasksCount}</td>
                <td>{target.projectsCount}</td>
                <td>{new Date(target.createdAt).toLocaleDateString()}</td>
                <td>
                  <span className="admin-users__actions">
                    <RevokeSessionsButton
                      target={target}
                      actorRole={actorRole}
                      isSelf={isSelf}
                    />
                    <BlockUserButton
                      target={target}
                      actorRole={actorRole}
                      isSelf={isSelf}
                    />
                    <DeleteUserButton
                      target={target}
                      actorRole={actorRole}
                      isSelf={isSelf}
                    />
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {data.items.length === 0 ? <p>No users match the filters.</p> : null}

      <nav className="admin-users__pagination">
        <button
          className="admin-users__action"
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((current) => current - 1)}
        >
          Previous
        </button>
        <span className="admin-users__page">
          Page {data.page} of {totalPages}
        </span>
        <button
          className="admin-users__action"
          type="button"
          disabled={page >= totalPages}
          onClick={() => setPage((current) => current + 1)}
        >
          Next
        </button>
      </nav>
    </>
  );
}
