import '@testing-library/jest-dom/vitest';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

export { render, screen, userEvent };

export function setup(ui: ReactElement) {
  const user = userEvent.setup();

  return { user, ...render(ui) };
}
