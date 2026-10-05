'use client';

import { useChangeTaskStatus } from '@/entities/task';
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
  const changeStatus = useChangeTaskStatus();

  function handleClick() {
    changeStatus.mutate({ id: taskId, status: NEXT_STATUS[status] });
  }

  return (
    <button
      className={`task-list__status task-list__status--${status.toLowerCase()}`}
      type="button"
      onClick={handleClick}
      disabled={changeStatus.isPending}
      title={`Change status: ${status} → ${NEXT_STATUS[status]}`}
    >
      {status}
    </button>
  );
}
