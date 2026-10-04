'use client';

import { useState } from 'react';
import { updateTaskDueDate } from '@/shared/api/tasks';
import { useRefresh } from '@/shared/lib/refresh-context';

type EditDueDateButtonProps = {
  taskId: string;
  dueDate: string | null;
  overdue: boolean;
};

function toInputValue(dueDate: string): string {
  const date = new Date(dueDate);
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toLabel(dueDate: string): string {
  const date = new Date(dueDate);

  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
  });
}

export function EditDueDateButton(props: EditDueDateButtonProps) {
  const { taskId, dueDate, overdue } = props;
  const { refresh } = useRefresh();
  const [isEditing, setIsEditing] = useState(false);

  async function save(next: string) {
    try {
      await updateTaskDueDate(
        taskId,
        next ? new Date(`${next}T00:00:00`).toISOString() : null,
      );
    } finally {
      setIsEditing(false);
      refresh();
    }
  }

  function commit(input: HTMLInputElement) {
    const next = input.value;
    const current = dueDate ? toInputValue(dueDate) : '';

    if (input.validity.valid && next !== current) {
      void save(next);
      return;
    }

    setIsEditing(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commit(event.currentTarget);
    }

    if (event.key === 'Escape') {
      setIsEditing(false);
    }
  }

  if (isEditing) {
    return (
      <input
        className="task-list__date-input"
        type="date"
        autoFocus
        defaultValue={dueDate ? toInputValue(dueDate) : ''}
        onKeyDown={handleKeyDown}
        onBlur={(event) => commit(event.currentTarget)}
      />
    );
  }

  if (dueDate === null) {
    return (
      <button
        className="task-list__due-add"
        type="button"
        onClick={() => setIsEditing(true)}
      >
        + date
      </button>
    );
  }

  return (
    <button
      className={`task-list__due${overdue ? ' task-list__due--overdue' : ''}`}
      type="button"
      onClick={() => setIsEditing(true)}
      title="Change due date"
    >
      {toLabel(dueDate)}
    </button>
  );
}
