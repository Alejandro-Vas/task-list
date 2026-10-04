import type { ReactNode } from 'react';
import { AuthProvider } from '@/features/auth';
import { RefreshProvider } from '@/shared/lib/refresh-context';
import './globals.css';

export const metadata = {
  title: 'Task List',
  description: 'Fullstack TypeScript monorepo boilerplate',
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout(props: RootLayoutProps) {
  const { children } = props;

  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <RefreshProvider>{children}</RefreshProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
