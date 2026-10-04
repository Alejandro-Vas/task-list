'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerSchema } from '@repo/shared';
import { useAuth } from '../model/auth-context';

export function RegisterForm() {
  const router = useRouter();
  const { status, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/');
    }
  }, [status, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = registerSchema.safeParse({ name, email, password });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid data');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await register(parsed.data);
      router.replace('/');
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Registration failed',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h1 className="auth-form__title">Create account</h1>
      <input
        className="auth-form__input"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Name"
        autoComplete="name"
        disabled={isSubmitting}
      />
      <input
        className="auth-form__input"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email"
        autoComplete="email"
        disabled={isSubmitting}
      />
      <input
        className="auth-form__input"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Password (min 8 characters)"
        autoComplete="new-password"
        disabled={isSubmitting}
      />
      <button
        className="auth-form__button"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Creating…' : 'Create account'}
      </button>
      {error ? <p className="auth-form__error">{error}</p> : null}
      <p className="auth-form__hint">
        Already have an account? <Link href="/login">Sign in</Link>
      </p>
    </form>
  );
}
