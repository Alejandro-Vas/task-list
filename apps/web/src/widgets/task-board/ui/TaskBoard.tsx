'use client';

import { useSearchParams } from 'next/navigation';
import { taskFilterSchema, type TaskFilter } from '@repo/shared';
import { TaskList, useOverdueCountQuery, useTasksQuery } from '@/entities/task';
import { LogoutButton } from '@/features/auth';
import { CreateTaskForm } from '@/features/create-task';
import { StatusTabs } from '@/features/filter-status';

export function TaskBoard() {
  const searchParams = useSearchParams();
  const parsed = taskFilterSchema.safeParse(searchParams.get('status') ?? 'ALL');
  const status: TaskFilter = parsed.success ? parsed.data : 'ALL';

  const tasksQuery = useTasksQuery(status);
  const overdueQuery = useOverdueCountQuery();
  const overdueCount = overdueQuery.data ?? null;

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

      {tasksQuery.error ? (
        <p className="page__error">
          Could not load tasks: {tasksQuery.error.message}
        </p>
      ) : tasksQuery.isPending ? (
        <p className="page__loading">Loading…</p>
      ) : (
        <TaskList tasks={tasksQuery.data} />
      )}
    </>
  );
}
