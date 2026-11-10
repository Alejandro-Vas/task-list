'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { taskFilterSchema, type TaskFilter } from '@repo/shared';
import {
  TASK_PER_PAGE,
  TASK_PER_PAGE_OPTIONS,
  useOverdueCountQuery,
  useTasksQuery,
} from '@/entities/task';
import { UserBadge } from '@/entities/user';
import { LogoutButton, useAuth } from '@/features/auth';
import { CreateTaskForm } from '@/features/create-task';
import { ExportTasksCsvButton } from '@/features/export-tasks-csv';
import { StatusTabs } from '@/features/filter-status';
import { isAdminRole } from '@/shared/lib/role-hierarchy';
import { TaskList } from './TaskList';

export function TaskBoard() {
  const searchParams = useSearchParams();
  const parsed = taskFilterSchema.safeParse(searchParams.get('status') ?? 'ALL');
  const status: TaskFilter = parsed.success ? parsed.data : 'ALL';
  const { user } = useAuth();

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState<number>(TASK_PER_PAGE);

  // A narrower filter has fewer pages than the one the user was browsing.
  useEffect(() => {
    setPage(1);
  }, [status]);

  const {
    data: tasksPage,
    error: tasksError,
    isPending: areTasksLoading,
  } = useTasksQuery({ status, page, perPage });
  const { data: overdueData } = useOverdueCountQuery();
  const overdueCount = overdueData ?? null;

  const totalPages = tasksPage
    ? Math.max(1, Math.ceil(tasksPage.total / tasksPage.perPage))
    : 1;

  useEffect(() => {
    if (tasksPage && page > totalPages) {
      setPage(totalPages);
    }
  }, [tasksPage, page, totalPages]);

  return (
    <>
      <header className="page__header">
        <div className="page__header-row">
          <div>
            <h1 className="page__title">
              Task List
              {overdueCount !== null && overdueCount > 0 ? (
                <span className="page__overdue-badge">
                  overdue {overdueCount}
                </span>
              ) : null}
            </h1>
          </div>
          <div className="page__nav">
            <UserBadge />
            {user !== null && isAdminRole(user.role) ? (
              <Link href="/admin" className="page__nav-link">
                Admin
              </Link>
            ) : null}
            <Link href="/settings" className="page__nav-link">
              Settings
            </Link>
            <ExportTasksCsvButton />
            <LogoutButton />
          </div>
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
        <>
          <TaskList tasks={tasksPage?.items ?? []} />
          <nav className="task-pagination">
            <label className="task-pagination__size">
              Per page
              <select
                className="task-pagination__select"
                value={perPage}
                aria-label="Tasks per page"
                onChange={(event) => {
                  setPerPage(Number(event.target.value));
                  setPage(1);
                }}
              >
                {TASK_PER_PAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="task-pagination__btn"
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </button>
            <span className="task-pagination__info">
              Page {tasksPage?.page ?? 1} of {totalPages}
            </span>
            <button
              className="task-pagination__btn"
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </nav>
        </>
      )}
    </>
  );
}
