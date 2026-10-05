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

  const {
    data: tasks,
    error: tasksError,
    isPending: areTasksLoading,
  } = useTasksQuery(status);
  const { data: overdueData } = useOverdueCountQuery();
  const overdueCount = overdueData ?? null;

  return (
    <>
      <header className="page__header">
        <div className="page__header-row">
          <h1 className="page__title">
            Task List
            {overdueCount !== null && overdueCount > 0 ? (
              <span className="page__overdue-badge">
                overdue {overdueCount}
              </span>
            ) : null}
          </h1>
          <LogoutButton />
        </div>
      </header>

      <CreateTaskForm />

      <StatusTabs active={status} />

      {tasksError ? (
        <p className="page__error">
          Could not load tasks: {tasksError.message}
        </p>
      ) : areTasksLoading ? (
        <p className="page__loading">Loading…</p>
      ) : (
        <TaskList tasks={tasks} />
      )}
    </>
  );
}
