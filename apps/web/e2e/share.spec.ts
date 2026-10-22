import { test, expect, skipWithoutApi } from './fixtures';

test.describe('share task (requires running API)', () => {
  test.beforeEach(skipWithoutApi);

  test('should show copied share link', async ({ page, login }) => {
    await login();

    const taskTitle = `E2E share ${Date.now()}`;
    await page.getByPlaceholder('Task title').fill(taskTitle);
    await page.getByRole('button', { name: 'Add task' }).click();
    await expect(page.getByText(taskTitle)).toBeVisible();

    const taskItem = page.locator('.task-list__item', { hasText: taskTitle });
    await taskItem.getByRole('button', { name: 'Share', exact: true }).click();

    const copied = page.getByText('Link copied!');
    await expect(copied).toBeVisible();
    await expect(copied).toHaveAttribute('title', /\/s\/[\w-]+$/);
  });
});
