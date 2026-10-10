'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { changePasswordSchema } from '@repo/shared';
import { useAuth } from '@/features/auth';

export function ChangePasswordForm() {
  const router = useRouter();
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid data');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await changePassword(parsed.data);
      router.replace('/login');
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not change password',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1 className="auth-form__title">Change password</h1>
      <input
        className="auth-form__input"
        type="password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        placeholder="Current password"
        autoComplete="current-password"
        disabled={isSubmitting}
      />
      <input
        className="auth-form__input"
        type="password"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        placeholder="New password (min 8 characters)"
        autoComplete="new-password"
        disabled={isSubmitting}
      />
      <input
        className="auth-form__input"
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        placeholder="Confirm new password"
        autoComplete="new-password"
        disabled={isSubmitting}
      />
      <button
        className="auth-form__button"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Saving…' : 'Change password'}
      </button>
      {error ? <p className="auth-form__error">{error}</p> : null}
    </form>
  );
}
