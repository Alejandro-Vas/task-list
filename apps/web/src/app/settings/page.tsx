import { RequireAuth } from '@/features/auth';
import { ChangePasswordForm } from '@/features/change-password';

export default function SettingsPage() {
  return (
    <main className="page">
      <RequireAuth>
        <ChangePasswordForm />
      </RequireAuth>
    </main>
  );
}
