'use client';

import { useState, type FormEvent } from 'react';
import { useCreateTask } from '@/entities/task';

export function CreateTaskForm() {
  const createTask = useCreateTask();
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    createTask.mutate(
      {
        title,
        dueDate: dueDate ? new Date(`${dueDate}T00:00:00`).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          setTitle('');
          setDueDate('');
        },
      },
    );
  }

  const isSubmitting = createTask.isPending;
  const error = createTask.error ? createTask.error.message : null;

  return (
    <form className="create-task" onSubmit={handleSubmit}>
      <input
        className="create-task__input"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Task title"
        disabled={isSubmitting}
      />
      <input
        className="create-task__date"
        type="date"
        value={dueDate}
        onChange={(event) => setDueDate(event.target.value)}
        disabled={isSubmitting}
        title="Due date"
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
