import { test as base, expect } from '@playwright/test';

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:4000';

export const DEMO_USER = { email: 'owner@example.com', password: 'demo1234' };

/** Пропускает тест, если API не поднят (в CI бэкенда нет). */
export async function skipWithoutApi(): Promise<void> {
  const available = await fetch(`${API_URL}/api/health`, {
    signal: AbortSignal.timeout(2000),
  })
    .then((response) => response.ok)
    .catch(() => false);

  base.skip(!available, `API is not available at ${API_URL}`);
}

type TestFixtures = {
  login: () => Promise<void>;
};

const test = base.extend<TestFixtures>({
  login: async ({ page }, use) => {
    await use(async () => {
      await page.goto('/login');
      await page.getByPlaceholder('Email').fill(DEMO_USER.email);
      await page.getByPlaceholder('Password').fill(DEMO_USER.password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await page.waitForURL('/');
      await expect(page.getByRole('heading', { name: /Task List/ })).toBeVisible();
    });
  },
});

export { test, expect };
