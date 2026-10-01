'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateTask } from '@/shared/api/tasks';

type EditTaskButtonProps = {
  taskId: string;
  title: string;
};

export function EditTaskButton(props: EditTaskButtonProps) {
  const { taskId, title } = props;
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function handleChange(next: string) {
    setValue(next);
    setError(null);
  }

  async function save() {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      setError('Title is required');
      return;
    }

    if (trimmed === title) {
      cancel();
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateTask(taskId, { title: trimmed });
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  }

  function cancel() {
    setValue(title);
    setError(null);
    setIsEditing(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void save();
    }

    if (event.key === 'Escape') {
      cancel();
    }
  }

  if (!isEditing) {
    return (
      <button
        className="task-list__title task-list__title--editable"
        type="button"
        onClick={() => setIsEditing(true)}
      >
        {title}
      </button>
    );
  }

  return (
    <span className="task-list__edit">
      <input
        className={`task-list__edit-input${error ? ' task-list__edit-input--error' : ''}`}
        type="text"
        value={value}
        maxLength={200}
        autoFocus
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!isSaving) {
            cancel();
          }
        }}
        disabled={isSaving}
      />
      {error ? <span className="task-list__edit-error">{error}</span> : null}
    </span>
  );
}
