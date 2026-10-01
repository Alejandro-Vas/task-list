import { TaskList, type Task } from '@/entities/task';
import { CreateTaskForm } from '@/features/create-task';
import { fetchTasks } from '@/shared/api/tasks';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let tasks: Task[] = [];
  let loadError: string | null = null;

  try {
    tasks = await fetchTasks();
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Unknown error';
  }

  return (
    <main className="page">
      <header className="page__header">
        <h1 className="page__title">Task List</h1>
        <p className="page__subtitle">
          Monorepo boilerplate: Next.js + NestJS + Prisma + BullMQ
        </p>
      </header>

      <CreateTaskForm />

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
