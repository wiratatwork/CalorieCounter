import { test, expect } from '@playwright/test';
import { addMeal, gotoApp, uniqueFood, waitForDashboardReady, waitForMealsApi } from './helpers';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await gotoApp(page, '/calorie.html');
  await waitForMealsApi(page);
  await addMeal(page, { food: uniqueFood('dash'), cal: 480, tag: 'กลางวัน' });

  await gotoApp(page, '/dashboard.html');
  await waitForDashboardReady(page);
});

test('โหลดแดชบอร์ดและแสดงเนื้อหา', async ({ page }) => {
  await expect(page.locator('#dash-content')).toBeVisible();
  await expect(page.locator('#dash-empty')).toBeHidden();
  await expect(page.locator('#kpi-avg')).not.toHaveText('0');
  await expect(page.locator('#insight-banner')).toBeVisible();
  await expect(page.locator('#tag-stats .tag-stat').first()).toBeVisible();
});

test('สลับช่วง 7 / 14 / 30 วัน', async ({ page }) => {
  for (const days of ['14', '30', '7']) {
    await page.locator(`.period-tabs__btn[data-days="${days}"]`).click();
    await waitForDashboardReady(page);
    await expect(page.locator(`.period-tabs__btn[data-days="${days}"]`)).toHaveClass(/is-active/);
  }

  await expect(page.locator('#trend-chart .apexcharts-canvas')).toBeVisible();
});

test('บันทึกเป้าต่อวัน', async ({ page }) => {
  await page.fill('#daily-goal', '2200');
  await page.click('#goal-form button[type="submit"]');

  await expect(page.locator('#daily-goal')).toHaveValue('2200');
  await expect
    .poll(async () =>
      page.evaluate(() => localStorage.getItem('calorie_daily_goal'))
    )
    .toBe('2200');
});

test('แสดงเมนูเด่นหลังบันทึก', async ({ page }) => {
  await expect(page.locator('#top-frequent li').first()).toBeVisible();
  await expect(page.locator('#top-calories li').first()).toBeVisible();
});
