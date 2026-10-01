'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createTask } from '@/shared/api/tasks';

export function CreateTaskForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createTask({ title });
      setTitle('');
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Unknown error',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="create-task" onSubmit={handleSubmit}>
      <input
        className="create-task__input"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Task title"
        disabled={isSubmitting}
      />
      <button
        className="create-task__button"
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Adding...' : 'Add task'}
      </button>
      {error ? <p className="create-task__error">{error}</p> : null}
    </form>
  );
}
