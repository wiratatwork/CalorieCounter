import { test, expect } from '@playwright/test';
import { gotoApp, waitForMealsApi } from './helpers';

test.use({ viewport: { width: 390, height: 844 } });

test('สลับแท็บล่างระหว่างหน้าหลัก', async ({ page }) => {
  await gotoApp(page, '/calorie.html');
  await waitForMealsApi(page);
  await expect(page.locator('.app-tab.is-active')).toContainText('วันนี้');

  await page.locator('.app-tabbar .app-tab', { hasText: 'แดชบอร์ด' }).click();
  await expect(page).toHaveURL(/\/dashboard(\.html)?$/);
  await expect(page.locator('.app-tab.is-active')).toContainText('แดชบอร์ด');

  await page.locator('.app-tabbar .app-tab', { hasText: 'ประวัติ' }).click();
  await expect(page).toHaveURL(/\/history(\.html)?$/);
  await expect(page.locator('.app-tab.is-active')).toContainText('ประวัติ');

  await page.locator('.app-tabbar .app-tab', { hasText: 'วันนี้' }).click();
  await expect(page).toHaveURL(/\/calorie(\.html)?$/);
});
