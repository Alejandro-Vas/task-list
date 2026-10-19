import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fetchSharedTask } from '@/shared/api/tasks';

type PageProps = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { token } = await params;
  try {
    const task = await fetchSharedTask(token);
    return { title: `${task.title} — Shared Task` };
  } catch {
    return { title: 'Shared Task Not Found' };
  }
}

export default async function SharedTaskPage({ params }: PageProps) {
  const { token } = await params;

  let task: Awaited<ReturnType<typeof fetchSharedTask>>;

  try {
    task = await fetchSharedTask(token);
  } catch {
    notFound();
  }

  return (
    <main className="page">
      <div className="shared-task">
        <h1 className="shared-task__title">{task.title}</h1>

        {task.description && (
          <p className="shared-task__description">{task.description}</p>
        )}

        <dl className="shared-task__meta">
          <dt>Status</dt>
          <dd>{task.status}</dd>

          {task.dueDate && (
            <>
              <dt>Due date</dt>
              <dd>{task.dueDate}</dd>
            </>
          )}

          <dt>Created</dt>
          <dd>{task.createdAt}</dd>

          <dt>Owner</dt>
          <dd>{task.ownerName}</dd>
        </dl>
      </div>
    </main>
  );
}
