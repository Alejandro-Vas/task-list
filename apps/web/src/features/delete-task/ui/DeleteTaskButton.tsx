'use client';

import { useState } from 'react';
import { deleteTask } from '@/shared/api/tasks';
import { useRefresh } from '@/shared/lib/refresh-context';

type DeleteTaskButtonProps = {
  taskId: string;
};

export function DeleteTaskButton(props: DeleteTaskButtonProps) {
  const { taskId } = props;
  const { refresh } = useRefresh();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleClick() {
    setIsDeleting(true);

    try {
      await deleteTask(taskId);
      refresh();
    } catch {
      setIsDeleting(false);
    }
  }

  return (
    <button
      className="task-list__delete"
      type="button"
      onClick={handleClick}
      disabled={isDeleting}
    >
      {isDeleting ? '...' : '✕'}
    </button>
  );
}
