'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../model/auth-context';

export function LogoutButton() {
  const router = useRouter();
  const { logout } = useAuth();
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    setIsPending(true);
    await logout();
    router.replace('/login');
  }

  return (
    <button
      className="logout-button"
      type="button"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
