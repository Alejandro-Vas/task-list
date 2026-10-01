import type { ReactNode } from 'react';
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
      <body>{children}</body>
    </html>
  );
}
