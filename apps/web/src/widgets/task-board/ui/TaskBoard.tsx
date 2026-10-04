'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { taskFilterSchema, type Task, type TaskFilter } from '@repo/shared';
import { TaskList } from '@/entities/task';
import { LogoutButton } from '@/features/auth';
import { CreateTaskForm } from '@/features/create-task';
import { StatusTabs } from '@/features/filter-status';
import { fetchOverdueCount, fetchTasks } from '@/shared/api/tasks';
import { useRefresh } from '@/shared/lib/refresh-context';

export function TaskBoard() {
  const searchParams = useSearchParams();
  const parsed = taskFilterSchema.safeParse(searchParams.get('status') ?? 'ALL');
  const status: TaskFilter = parsed.success ? parsed.data : 'ALL';

  const { version } = useRefresh();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [overdueCount, setOverdueCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setError(null);

    Promise.all([fetchTasks(status), fetchOverdueCount().catch(() => null)])
      .then(([nextTasks, nextOverdueCount]) => {
        if (!isActive) {
          return;
        }

        setTasks(nextTasks);
        setOverdueCount(nextOverdueCount);
      })
      .catch((loadError) => {
        if (!isActive) {
          return;
        }

        setError(
          loadError instanceof Error ? loadError.message : 'Unknown error',
        );
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [status, version]);

  return (
    <>
      <header className="page__header">
        <div className="page__header-row">
          <h1 className="page__title">
            Task List
            {overdueCount !== null && overdueCount > 0 ? (
              <span className="page__overdue-badge">
                просрочено {overdueCount}
              </span>
            ) : null}
          </h1>
          <LogoutButton />
        </div>
      </header>

      <CreateTaskForm />

      <StatusTabs active={status} />

      {error ? (
        <p className="page__error">Could not load tasks: {error}</p>
      ) : isLoading ? (
        <p className="page__loading">Loading…</p>
      ) : (
        <TaskList tasks={tasks} />
      )}
    </>
  );
}
