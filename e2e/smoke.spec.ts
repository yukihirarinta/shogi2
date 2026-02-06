import { expect, test } from '@playwright/test';

test('board is visible', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '将棋盤コンポーネント' })).toBeVisible();
  await expect(page.getByRole('grid', { name: '9x9将棋盤' })).toBeVisible();
});
