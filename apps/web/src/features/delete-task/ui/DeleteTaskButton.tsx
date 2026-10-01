'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteTask } from '@/shared/api/tasks';

type DeleteTaskButtonProps = {
  taskId: string;
};

export function DeleteTaskButton(props: DeleteTaskButtonProps) {
  const { taskId } = props;
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleClick() {
    setIsDeleting(true);

    try {
      await deleteTask(taskId);
      router.refresh()
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
