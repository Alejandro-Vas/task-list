import Link from 'next/link';
import { TASK_FILTERS, type TaskFilter } from '@repo/shared';

const LABELS: Record<TaskFilter, string> = {
  ALL: 'All',
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
};

type StatusTabsProps = {
  active: TaskFilter;
};

export function StatusTabs({ active }: StatusTabsProps) {
  return (
    <nav className="status-tabs">
      {TASK_FILTERS.map((filter) => (
        <Link
          key={filter}
          href={filter === 'ALL' ? '/' : `/?status=${filter}`}
          className={`status-tabs__tab${
            filter === active ? ' status-tabs__tab--active' : ''
          }`}
        >
          {LABELS[filter]}
        </Link>
      ))}
    </nav>
  );
}
