'use client';

import { useAuth } from '@/features/auth';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function UserBadge() {
  const { user } = useAuth();

  if (user === null) {
    return null;
  }

  return (
    <div className="user-badge">
      <div className="user-badge__avatar">
        {getInitials(user.name)}
      </div>
      <div className="user-badge__info">
        <span className="user-badge__name">{user.name}</span>
        <span className="user-badge__email">{user.email}</span>
      </div>
    </div>
  );
}
