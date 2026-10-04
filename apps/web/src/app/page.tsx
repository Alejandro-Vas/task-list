import { Suspense } from 'react';
import { RequireAuth } from '@/features/auth';
import { TaskBoard } from '@/widgets/task-board';

export default function HomePage() {
  return (
    <main className="page">
      <RequireAuth>
        <Suspense fallback={<p className="page__loading">Loading…</p>}>
          <TaskBoard />
        </Suspense>
      </RequireAuth>
    </main>
  );
}
