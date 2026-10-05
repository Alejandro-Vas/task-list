'use client';

import { useDeleteTask } from '@/entities/task';

type DeleteTaskButtonProps = {
  taskId: string;
};

export function DeleteTaskButton(props: DeleteTaskButtonProps) {
  const { taskId } = props;
  const deleteTask = useDeleteTask();

  function handleClick() {
    deleteTask.mutate(taskId);
  }

  return (
    <button
      className="task-list__delete"
      type="button"
      onClick={handleClick}
      disabled={deleteTask.isPending}
    >
      {deleteTask.isPending ? '...' : '✕'}
    </button>
  );
}
