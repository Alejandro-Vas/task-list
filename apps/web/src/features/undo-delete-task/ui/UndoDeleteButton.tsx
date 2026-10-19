'use client';

import { useEffect, useState } from 'react';
import { useUndoDeleteTask } from '@/entities/task';

type UndoDeleteButtonProps = {
  taskId: string;
  pendingDeletionAt: string;
};

export function UndoDeleteButton(props: UndoDeleteButtonProps) {
  const { taskId, pendingDeletionAt } = props;
  const { mutate, isPending } = useUndoDeleteTask();

  const [countdown, setCountdown] = useState(() => {
    const ms = new Date(pendingDeletionAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / 1000));
  });

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        const next = prev - 1;
        return next <= 0 ? 0 : next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  function handleClick() {
    mutate(taskId);
  }

  return (
    <button
      className="task-list__undo"
      type="button"
      onClick={handleClick}
      disabled={isPending || countdown <= 0}
    >
      {isPending ? '...' : `Undo (${countdown}s)`}
    </button>
  );
}
