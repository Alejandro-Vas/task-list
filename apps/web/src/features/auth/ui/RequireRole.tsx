'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@repo/shared';
import { useAuth } from '../model/auth-context';

type RequireRoleProps = {
  /** Roles allowed to see the children; the hierarchy is checked by the API. */
  roles: readonly UserRole[];
  children: ReactNode;
};

export function RequireRole(props: RequireRoleProps) {
  const { roles, children } = props;
  const router = useRouter();
  const { status, user } = useAuth();

  const allowed = user !== null && roles.includes(user.role);

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login');
    }

    if (status === 'authenticated' && !allowed) {
      router.replace('/');
    }
  }, [status, allowed, router]);

  if (status === 'loading') {
    return <p className="page__loading">Loading…</p>;
  }

  if (status === 'anonymous') {
    return null;
  }

  // The redirect above is asynchronous, so a plain notice is rendered first.
  if (!allowed) {
    return <p className="page__error">You do not have access to this page.</p>;
  }

  return <>{children}</>;
}
