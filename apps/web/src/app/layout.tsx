import type { ReactNode } from 'react';
import { QueryProvider } from './providers';
import { AuthProvider } from '@/features/auth';
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
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
