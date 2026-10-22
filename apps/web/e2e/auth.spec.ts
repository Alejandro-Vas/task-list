import { test, expect } from './fixtures';

test.describe('auth pages', () => {
  test('should redirect anonymous user from / to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('should render login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Create one' })).toBeVisible();
  });

  test('should render register form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
    await expect(page.getByPlaceholder('Name')).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password (min 8 characters)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('should show client validation error when password is empty', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email').fill('user@example.com');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.locator('.auth-form__error')).toBeVisible();
  });

  test('should block submit with native validation for malformed email', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Email').fill('not-an-email');
    await page.getByPlaceholder('Password').fill('secret123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByPlaceholder('Email')).toHaveJSProperty('validity.valid', false);
    await expect(page.locator('.auth-form__error')).toBeHidden();
  });

  test('should navigate between login and register', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Create one' }).click();
    await expect(page).toHaveURL(/\/register/);
    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
