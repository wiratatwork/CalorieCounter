import { test, expect } from '@playwright/test';
import { addMeal, gotoApp, parseThaiNumber, uniqueFood, waitForMealsApi } from './helpers';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await gotoApp(page, '/history.html');
  await waitForMealsApi(page);
});

test('แสดง banner สรุปแบบ history', async ({ page }) => {
  await expect(page.locator('.day-summary--history')).toBeVisible();
  await expect(page.locator('.day-summary--history .day-summary__label')).toHaveText(
    'แคลอรี่ในช่วงที่เลือก'
  );
});

test('ปุ่ม MTD โหลดช่วงเดือนนี้', async ({ page }) => {
  await page.click('#filter-toggle');
  await page.click('#range-mtd');
  await waitForMealsApi(page);

  const now = new Date();
  const firstOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  await expect(page.locator('#range-from')).toHaveValue(firstOfMonth);
  await expect(page.locator('#range-to')).toHaveValue(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  );
});

test('ค้นหาช่วงวันที่แสดงมื้อที่บันทึก', async ({ page }) => {
  const foodName = uniqueFood('ประวัติ');

  await gotoApp(page, '/calorie.html');
  await waitForMealsApi(page);
  await addMeal(page, { food: foodName, cal: 333 });

  await page.goto('/history.html');
  await waitForMealsApi(page);

  await page.click('#filter-toggle');
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  await page.fill('#range-from', dateStr);
  await page.fill('#range-to', dateStr);
  await page.click('#range-form button[type="submit"]');
  await waitForMealsApi(page);

  await expect(page.getByText(foodName)).toBeVisible();
  expect(parseThaiNumber(await page.locator('#range-total').textContent())).toBeGreaterThanOrEqual(333);
});

test('ช่วงวันที่ไม่ถูกต้องแสดง error', async ({ page }) => {
  await page.click('#filter-toggle');
  await page.fill('#range-from', '2026-07-20');
  await page.fill('#range-to', '2026-07-01');
  await page.click('#range-form button[type="submit"]');

  await expect(page.locator('#range-hint')).toContainText('กรุณาเลือกช่วงวันที่ให้ถูกต้อง');
});
