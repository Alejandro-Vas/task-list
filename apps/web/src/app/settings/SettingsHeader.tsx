'use client';

import Link from 'next/link';
import { UserBadge } from '@/entities/user';

export function SettingsHeader() {
  return (
    <header className="page__header">
      <div className="page__header-row">
        <h1 className="page__title">Settings</h1>
        <div className="page__nav">
          <UserBadge />
          <Link href="/" className="page__nav-link">
            Back
          </Link>
        </div>
      </div>
    </header>
  );
}
