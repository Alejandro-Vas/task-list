import { DeleteTaskButton } from '@/features/delete-task';
import type { Task } from '../model/types';

type TaskListProps = {
  tasks: Task[];
};

export function TaskList(props: TaskListProps) {
  const { tasks } = props;

  if (tasks.length === 0) {
    return <p>No tasks yet. Create the first one.</p>;
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <li key={task.id} className="task-list__item">
          <span
            className={`task-list__status task-list__status--${task.status.toLowerCase()}`}
          >
            {task.status}
          </span>
          <span className="task-list__title">{task.title}</span>
          {task.description ? (
            <span className="task-list__description">{task.description}</span>
          ) : null}
          <DeleteTaskButton taskId={task.id} />
        </li>
      ))}
    </ul>
  );
}
