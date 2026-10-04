'use client';

import { useEffect, useState } from 'react';
import { updateTaskStatus } from '@/shared/api/tasks';
import { useRefresh } from '@/shared/lib/refresh-context';
import type { TaskStatus } from '@/entities/task';

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  TODO: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  DONE: 'TODO',
};

type ChangeStatusButtonProps = {
  taskId: string;
  status: TaskStatus;
};

export function ChangeStatusButton(props: ChangeStatusButtonProps) {
  const { taskId, status } = props;
  const { refresh } = useRefresh();
  const [optimisticStatus, setOptimisticStatus] = useState(status);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setOptimisticStatus(status);
  }, [status]);

  async function handleClick() {
    const nextStatus = NEXT_STATUS[optimisticStatus];

    setOptimisticStatus(nextStatus);
    setIsSaving(true);

    try {
      await updateTaskStatus(taskId, nextStatus);
      refresh();
    } catch {
      setOptimisticStatus(status);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <button
      className={`task-list__status task-list__status--${optimisticStatus.toLowerCase()}`}
      type="button"
      onClick={handleClick}
      disabled={isSaving}
      title={`Change status: ${optimisticStatus} → ${NEXT_STATUS[optimisticStatus]}`}
    >
      {optimisticStatus}
    </button>
  );
}
