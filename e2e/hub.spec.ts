import { test, expect } from '@playwright/test';

test('การ์ด Calorie Counter เปิดแท็บใหม่', async ({ page, context }) => {
  await page.goto('/app.html');

  const popupPromise = context.waitForEvent('page');
  await page.getByRole('link', { name: /Calorie Counter/i }).click();
  const popup = await popupPromise;

  await expect(popup).toHaveURL(/\/calorie(\.html)?$/);
  await popup.close();
});

test('แสดงหัวข้อ Wellness Hub', async ({ page }) => {
  await page.goto('/app.html');
  await expect(page.getByRole('heading', { name: 'ศูนย์รวมแอปสุขภาพ' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Calorie Counter' })).toBeVisible();
});
