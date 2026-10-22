import { test, expect, skipWithoutApi } from './fixtures';

test.describe('tasks (requires running API)', () => {
  test.beforeEach(skipWithoutApi);

  test('should create a task after login', async ({ page, login }) => {
    await login();

    const taskTitle = `E2E task ${Date.now()}`;
    await page.getByPlaceholder('Task title').fill(taskTitle);
    await page.getByRole('button', { name: 'Add task' }).click();
    await expect(page.getByText(taskTitle)).toBeVisible();
  });
});
