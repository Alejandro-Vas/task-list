'use client';

import { useDeleteTask } from '@/entities/task';

type DeleteTaskButtonProps = {
  taskId: string;
};

export function DeleteTaskButton(props: DeleteTaskButtonProps) {
  const { taskId } = props;
  const { mutate, isPending } = useDeleteTask();

  function handleClick() {
    mutate(taskId);
  }

  return (
    <button
      className="task-list__delete"
      type="button"
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? '...' : '✕'}
    </button>
  );
}
