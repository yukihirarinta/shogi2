import { expect, test } from '@playwright/test';

const STORAGE_KEY = 'shogi2:game:v1';

test('moves a pawn and persists state across reload', async ({ page }) => {
  await page.goto('/');
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();

  await page.getByRole('button', { name: '筋5段7' }).click();
  await page.getByRole('button', { name: '筋5段6' }).click();

  await expect(page.getByText('手番: 後手')).toBeVisible();

  const storage = await page.context().storageState();
  const origin = storage.origins.find((item) => item.origin === 'http://127.0.0.1:4173');
  const localState = origin?.localStorage.find((item) => item.name === STORAGE_KEY);
  const parsed: unknown = localState ? JSON.parse(localState.value) : null;
  const storedTurn = typeof parsed === 'object' && parsed !== null ? (parsed as { turn?: unknown }).turn : null;

  expect(storedTurn).toBe('white');

  await page.reload();
  await expect(page.getByText('手番: 後手')).toBeVisible();
});
