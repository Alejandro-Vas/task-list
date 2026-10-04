'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../model/auth-context';

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth(props: RequireAuthProps) {
  const { children } = props;
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <p className="page__loading">Loading…</p>;
  }

  if (status === 'anonymous') {
    return null;
  }

  return <>{children}</>;
}
