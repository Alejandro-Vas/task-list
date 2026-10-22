import { test, expect, skipWithoutApi } from './fixtures';

test.describe('task CRUD (requires running API)', () => {
  test.beforeEach(skipWithoutApi);

  test('should create, edit and delete a task', async ({ page, login }) => {
    await login();

    const originalTitle = `E2E CRUD ${Date.now()}`;
    await page.getByPlaceholder('Task title').fill(originalTitle);
    await page.getByRole('button', { name: 'Add task' }).click();
    await expect(page.getByText(originalTitle)).toBeVisible();

    const newTitle = `Edited ${Date.now()}`;
    await page.locator('.task-list__title--editable', { hasText: originalTitle }).click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type(newTitle);
    await page.keyboard.press('Enter');
    await expect(page.locator('.task-list__title', { hasText: newTitle })).toBeVisible();

    const taskItem = page.locator('.task-list__item', { hasText: newTitle });
    await taskItem.getByRole('button', { name: '✕' }).click();
    await expect(taskItem.getByRole('button', { name: /Undo/ })).toBeVisible();
  });
});
