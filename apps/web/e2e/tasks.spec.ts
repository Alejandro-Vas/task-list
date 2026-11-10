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

  test('should refetch the list with the chosen page size', async ({
    page,
    login,
  }) => {
    await login();

    const requested = page.waitForResponse((response) => {
      const url = new URL(response.url());

      return (
        url.pathname === '/api/tasks' && url.searchParams.get('perPage') === '10'
      );
    });

    await page.getByLabel('Tasks per page').selectOption('10');

    const body = await (await requested).json();
    expect(body).toMatchObject({ page: 1, perPage: 10 });
    await expect(page.getByText('Page 1 of')).toBeVisible();
  });
});
