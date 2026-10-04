import { TaskList, type Task } from '@/entities/task';
import { CreateTaskForm } from '@/features/create-task';
import { StatusTabs } from '@/features/filter-status';
import { fetchOverdueCount, fetchTasks } from '@/shared/api/tasks';
import { taskFilterSchema, type TaskFilter } from '@repo/shared';

export const dynamic = 'force-dynamic';

type HomePageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { status: statusParam } = await searchParams;
  const parsed = taskFilterSchema.safeParse(statusParam ?? 'ALL');
  const status: TaskFilter = parsed.success ? parsed.data : 'ALL';

  let tasks: Task[] = [];
  let overdueCount: number | null = null;
  let loadError: string | null = null;

  try {
    [tasks, overdueCount] = await Promise.all([
      fetchTasks(status),
      fetchOverdueCount().catch(() => null),
    ]);
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Unknown error';
  }

  return (
    <main className="page">
      <header className="page__header">
        <h1 className="page__title">
          Task List
          {overdueCount !== null && overdueCount > 0 ? (
            <span className="page__overdue-badge">просрочено {overdueCount}</span>
          ) : null}
        </h1>
      </header>

      <CreateTaskForm />

      <StatusTabs active={status} />

      {loadError ? (
        <p className="page__error">
          Could not load tasks: {loadError}. Is the API running?
        </p>
      ) : (
        <TaskList tasks={tasks} />
      )}
    </main>
  );
}
