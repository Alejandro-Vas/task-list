'use client';

import { useState } from 'react';
import type { AdminAction } from '@repo/shared';
import { useAdminLogsQuery } from '@/entities/user';

const ACTION_LABELS: Record<AdminAction, string> = {
  role_change: 'Role changed',
  user_update: 'Profile updated',
  user_delete: 'User deleted',
  user_block: 'Blocked',
  user_unblock: 'Unblocked',
  sessions_revoke: 'Sessions revoked',
};

function formatMeta(meta: Record<string, unknown> | null): string {
  if (meta === null) {
    return '';
  }

  return Object.entries(meta)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(', ');
}

export function AdminLogsTable() {
  const [page, setPage] = useState(1);
  const { data, error, isPending } = useAdminLogsQuery(page);

  if (isPending) {
    return <p className="page__loading">Loading…</p>;
  }

  if (error) {
    return <p className="page__error">Could not load the history: {error.message}</p>;
  }

  const totalPages = data
    ? Math.max(1, Math.ceil(data.total / data.perPage))
    : 1;

  return (
    <>
      <table className="admin-logs">
        <thead>
          <tr>
            <th>When</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Target</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((entry) => (
            <tr key={entry.id}>
              <td>{new Date(entry.createdAt).toLocaleString()}</td>
              <td>{entry.actorName ?? 'deleted user'}</td>
              <td>{ACTION_LABELS[entry.action]}</td>
              <td>{entry.targetName ?? (entry.targetId ? 'deleted user' : '—')}</td>
              <td>{formatMeta(entry.meta)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.items.length === 0 ? <p>No admin actions yet.</p> : null}

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
