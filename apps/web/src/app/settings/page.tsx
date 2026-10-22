import { RequireAuth } from '@/features/auth';
import { ChangePasswordForm } from '@/features/change-password';
import { SettingsHeader } from './SettingsHeader';

export default function SettingsPage() {
  return (
    <main className="page">
      <RequireAuth>
        <SettingsHeader />
        <ChangePasswordForm />
      </RequireAuth>
    </main>
  );
}
