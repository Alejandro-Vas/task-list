'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogoutButton, useAuth } from '@/features/auth';
import { AdminLogsTable } from '@/widgets/admin-logs';
import { AdminStatsCard } from '@/widgets/admin-stats';
import { AdminUsersTable } from '@/widgets/admin-users';

const TABS = [
  { key: 'users', label: 'Users' },
  { key: 'stats', label: 'Statistics' },
  { key: 'history', label: 'History' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export function AdminPanel() {
  const [tab, setTab] = useState<TabKey>('users');
  const { user } = useAuth();

  // RequireRole already guarantees an authenticated admin; this only narrows
  // the type for the widgets below.
  if (user === null) {
    return null;
  }

  return (
    <>
      <header className="page__header">
        <div className="page__header-row">
          <h1 className="page__title">Admin panel</h1>
          <div className="page__nav">
            <Link href="/" className="page__nav-link">
              Tasks
            </Link>
            <Link href="/settings" className="page__nav-link">
              Settings
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <nav className="status-tabs">
        {TABS.map((item) => (
          <button
            key={item.key}
            className={`status-tabs__tab${
              tab === item.key ? ' status-tabs__tab--active' : ''
            }`}
            type="button"
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'users' ? <AdminUsersTable actorRole={user.role} /> : null}
      {tab === 'stats' ? <AdminStatsCard /> : null}
      {tab === 'history' ? <AdminLogsTable /> : null}
    </>
  );
}
