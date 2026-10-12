'use client';

import { useAdminStatsQuery } from '@/entities/user';
import { ROLE_LABELS } from '@/shared/lib/role-hierarchy';

const ROLE_KEYS = ['OWNER', 'ADMIN', 'USER'] as const;

export function AdminStatsCard() {
  const { data, error, isPending } = useAdminStatsQuery();

  if (isPending) {
    return <p className="page__loading">Loading…</p>;
  }

  if (error) {
    return <p className="page__error">Could not load stats: {error.message}</p>;
  }

  return (
    <>
      <div className="admin-stats">
        <div className="admin-stats__card">
          <span className="admin-stats__value">{data.usersTotal}</span>
          <span className="admin-stats__label">Users</span>
        </div>
        <div className="admin-stats__card">
          <span className="admin-stats__value">{data.tasksTotal}</span>
          <span className="admin-stats__label">Tasks</span>
        </div>
        <div className="admin-stats__card">
          <span className="admin-stats__value admin-stats__value--overdue">
            {data.tasksOverdue}
          </span>
          <span className="admin-stats__label">Overdue</span>
        </div>
        <div className="admin-stats__card">
          <span className="admin-stats__value">{data.projectsTotal}</span>
          <span className="admin-stats__label">Projects</span>
        </div>
      </div>

      <ul className="admin-stats__roles">
        {ROLE_KEYS.map((role) => (
          <li key={role} className="admin-stats__role">
            <span
              className={`admin-users__role admin-users__role--${role.toLowerCase()}`}
            >
              {ROLE_LABELS[role]}
            </span>
            <span className="admin-stats__role-value">
              {data.usersByRole[role]}
            </span>
          </li>
        ))}
      </ul>

      <h2 className="admin-logs__title">Recently registered</h2>
      {data.recentUsers.length === 0 ? (
        <p>No users yet.</p>
      ) : (
        <ul className="admin-recent">
          {data.recentUsers.map((recent) => (
            <li key={recent.id} className="admin-recent__item">
              <span className="admin-users__name">{recent.name}</span>
              <span className="admin-users__email">{recent.email}</span>
              <span
                className={`admin-users__role admin-users__role--${recent.role.toLowerCase()}`}
              >
                {ROLE_LABELS[recent.role]}
              </span>
              <span className="admin-recent__date">
                {new Date(recent.createdAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
