import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'shogi2:game:v1';

test('undo restores previous state and persists after reload', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();

  await page.getByRole('button', { name: '筋5段7' }).click();
  await page.getByRole('button', { name: '筋5段6' }).click();
  await page.getByRole('button', { name: '一手戻す' }).click();

  await expect(page.getByText('手番: 先手')).toBeVisible();
  await expect(page.getByRole('button', { name: '筋5段7' })).toContainText('歩');
  await expect(page.getByRole('button', { name: '筋5段6' })).not.toContainText('歩');

  await page.reload();

  await expect(page.getByText('手番: 先手')).toBeVisible();
  await expect(page.getByRole('button', { name: '筋5段7' })).toContainText('歩');
  await expect(page.getByRole('button', { name: '筋5段6' })).not.toContainText('歩');
});

test('reset returns to initial state and persists after reload', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();

  await page.getByRole('button', { name: '筋5段7' }).click();
  await page.getByRole('button', { name: '筋5段6' }).click();
  await page.getByRole('button', { name: 'リセット' }).click();

  await expect(page.getByText('手番: 先手')).toBeVisible();
  await expect(page.getByRole('button', { name: '筋5段7' })).toContainText('歩');
  await expect(page.getByRole('button', { name: '筋5段6' })).not.toContainText('歩');

  await page.reload();

  await expect(page.getByText('手番: 先手')).toBeVisible();
  await expect(page.getByRole('button', { name: '筋5段7' })).toContainText('歩');
  await expect(page.getByRole('button', { name: '筋5段6' })).not.toContainText('歩');
});
