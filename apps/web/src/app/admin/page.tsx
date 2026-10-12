import { RequireRole } from '@/features/auth';
import { ADMIN_ROLES } from '@/shared/lib/role-hierarchy';
import { AdminPanel } from '@/widgets/admin-panel';

export default function AdminPage() {
  return (
    <main className="page page--wide">
      <RequireRole roles={ADMIN_ROLES}>
        <AdminPanel />
      </RequireRole>
    </main>
  );
}
