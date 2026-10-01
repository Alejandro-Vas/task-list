import { ChangeStatusButton } from '@/features/change-status';
import { DeleteTaskButton } from '@/features/delete-task';
import { EditTaskButton } from '@/features/edit-task';
import type { Task } from '../model/types';

type TaskListProps = {
  tasks: Task[];
};

function isOverdue(task: Task, startOfToday: Date): boolean {
  return (
    task.dueDate !== null &&
    task.status !== 'DONE' &&
    new Date(task.dueDate) < startOfToday
  );
}

export function TaskList(props: TaskListProps) {
  const { tasks } = props;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  if (tasks.length === 0) {
    return <p>No tasks yet. Create the first one.</p>;
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <li
          key={task.id}
          className={`task-list__item${
            isOverdue(task, startOfToday) ? ' task-list__item--overdue' : ''
          }`}
        >
          <ChangeStatusButton taskId={task.id} status={task.status} />
          <EditTaskButton taskId={task.id} title={task.title} />
          {task.description ? (
            <span className="task-list__description">{task.description}</span>
          ) : null}
          {task.dueDate ? (
            <span
              className={`task-list__due${
                isOverdue(task, startOfToday) ? ' task-list__due--overdue' : ''
              }`}
            >
              {new Date(task.dueDate).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'short',
              })}
            </span>
          ) : null}
          <DeleteTaskButton taskId={task.id} />
        </li>
      ))}
    </ul>
  );
}
