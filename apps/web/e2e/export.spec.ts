import { test, expect, skipWithoutApi } from './fixtures';

test.describe('export CSV (requires running API)', () => {
  test.beforeEach(skipWithoutApi);

  test('should download CSV file', async ({ page, login }) => {
    await login();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export CSV' }).click();

    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^tasks-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});
