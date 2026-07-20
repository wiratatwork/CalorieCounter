import { test, expect } from '@playwright/test';
import {
  addMeal,
  getListItem,
  gotoApp,
  parseThaiNumber,
  submitEmptyEntryForm,
  uniqueFood,
  waitForMealsApi,
} from './helpers';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await gotoApp(page, '/calorie.html');
  await waitForMealsApi(page);
});

test('บันทึกมื้อและเห็นในรายการวันนี้', async ({ page }) => {
  const foodName = uniqueFood('ข้าวผัด');

  await addMeal(page, { food: foodName, cal: 550, tag: 'กลางวัน' });

  await expect(page.getByText(foodName)).toBeVisible();
  await expect(page.locator('#food')).toHaveValue('');
  await expect(page.locator('#cal')).toHaveValue('');
  await expect(getListItem(page, foodName).locator('.meal-tag-badge')).toHaveText('กลางวัน');
});

test('ฟอร์มว่างไม่บันทึก', async ({ page }) => {
  const countBefore = await submitEmptyEntryForm(page);
  await expect(page.locator('#form-hint')).toContainText('กรอกชื่อเมนูและแคลอรี่ให้ครบ');
  await expect(page.locator('#list .app-list-item')).toHaveCount(countBefore);
});

test('บันทึกเวลาที่กินแม้ปิด panel แล้ว', async ({ page }) => {
  const foodName = uniqueFood('เวลา');

  await addMeal(page, { food: foodName, cal: 400, time: '08:30', closeTimePanel: true });

  const item = getListItem(page, foodName);
  await expect(item).toBeVisible();
  await expect(item.locator('.app-list-item__time')).toContainText('08');
  await expect(item.locator('.app-list-item__time')).toContainText('30');
});

test('progress bar อัปเดตหลังบันทึก', async ({ page }) => {
  const totalBefore = parseThaiNumber(await page.locator('#today-total').textContent());

  await addMeal(page, { food: uniqueFood('progress'), cal: 300 });

  await expect(page.locator('#goal-progress')).toBeVisible();
  await expect
    .poll(async () => parseThaiNumber(await page.locator('#today-total').textContent()))
    .toBe(totalBefore + 300);
});

test('เรียงลำดับตามแคลอรี่', async ({ page }) => {
  const low = uniqueFood('น้อย');
  const high = uniqueFood('มาก');

  await addMeal(page, { food: low, cal: 100 });
  await addMeal(page, { food: high, cal: 900 });
  await page.selectOption('#sort-by', 'cal_desc');

  const names = page.locator('#list .app-list-item__name');
  await expect(names.first()).toContainText(high);
});

test('แก้ไขมื้อ', async ({ page }) => {
  const original = uniqueFood('แก้ไข');
  const updated = `${original} ใหม่`;

  await addMeal(page, { food: original, cal: 500, tag: 'เย็น' });

  const item = getListItem(page, original);
  await item.locator('[data-action="edit"]').click();
  await page.fill('#edit-food', updated);
  await page.fill('#edit-cal', '620');
  await page.locator('#edit-tag-picker label.meal-tag-picker__item', { hasText: 'ของว่าง' }).click();
  await page.click('#edit-save-btn');
  await page.click('#confirm-ok-btn');

  await expect(page.locator('#form-hint')).toContainText('แก้ไขมื้อแล้ว');
  await expect(page.getByText(updated)).toBeVisible();
  await expect(getListItem(page, updated).locator('.meal-tag-badge')).toHaveText('ของว่าง');
});

test('ลบมื้อ', async ({ page }) => {
  const foodName = uniqueFood('ลบ');

  await addMeal(page, { food: foodName, cal: 450 });
  const countAfterAdd = parseThaiNumber(await page.locator('#today-count').textContent());
  const totalAfterAdd = parseThaiNumber(await page.locator('#today-total').textContent());

  const item = getListItem(page, foodName);
  await item.locator('[data-action="delete"]').click();
  const deleteDone = page.waitForResponse(
    (resp) => resp.url().includes('daily_calories') && resp.request().method() === 'DELETE'
  );
  await page.click('#confirm-ok-btn');
  await deleteDone;
  await waitForMealsApi(page);

  await expect(page.locator('#form-hint')).toContainText('ลบมื้อแล้ว');
  await expect.poll(async () => getListItem(page, foodName).count()).toBe(0);
  await expect
    .poll(async () => parseThaiNumber(await page.locator('#today-count').textContent()))
    .toBe(countAfterAdd - 1);
  await expect
    .poll(async () => parseThaiNumber(await page.locator('#today-total').textContent()))
    .toBe(totalAfterAdd - 450);
});

test('ลิงก์ไปแดชบอร์ดเพื่อแก้เป้า', async ({ page }) => {
  await addMeal(page, { food: uniqueFood('เป้า'), cal: 200 });
  await page.click('.goal-progress__link');
  await expect(page).toHaveURL(/\/dashboard(\.html)?$/);
  await expect(page.locator('#daily-goal')).toHaveValue('2000');
});
