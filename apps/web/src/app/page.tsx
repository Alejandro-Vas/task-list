import { TaskList, type Task } from '@/entities/task';
import { CreateTaskForm } from '@/features/create-task';
import { StatusTabs } from '@/features/filter-status';
import { fetchTasks } from '@/shared/api/tasks';
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
  let loadError: string | null = null;

  try {
    tasks = await fetchTasks(status);
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Unknown error';
  }

  return (
    <main className="page">
      <header className="page__header">
        <h1 className="page__title">Task List</h1>
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
