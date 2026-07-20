import { expect, type Page } from '@playwright/test';

export async function enableE2eMode(page: Page) {
  await page.addInitScript(() => {
    window.APP_CONFIG = { ...window.APP_CONFIG, e2eMode: true };
  });
}

export async function gotoApp(page: Page, path: string, goal = 2000) {
  await enableE2eMode(page);
  await page.goto(path);
  await page.evaluate((g) => localStorage.setItem('calorie_daily_goal', String(g)), goal);
}

export async function waitForMealsApi(page: Page) {
  await page.waitForResponse(
    (resp) => resp.url().includes('daily_calories') && resp.request().method() === 'GET'
  );
}

export async function waitForDashboardReady(page: Page) {
  await expect(page.locator('#insight-text')).not.toHaveText('กำลังโหลดแนวโน้ม…');
}

export function uniqueFood(prefix: string) {
  return `E2E ${prefix} ${Date.now()}`;
}

export function parseThaiNumber(text: string | null | undefined) {
  return parseInt(String(text ?? '').replace(/[^\d]/g, ''), 10) || 0;
}

export type MealTagLabel = 'เช้า' | 'กลางวัน' | 'เย็น' | 'ของว่าง';

export async function addMeal(
  page: Page,
  opts: {
    food: string;
    cal: number;
    tag?: MealTagLabel;
    time?: string;
    closeTimePanel?: boolean;
  }
) {
  await page.fill('#food', opts.food);
  await page.fill('#cal', String(opts.cal));
  if (opts.tag) {
    await page.locator('label.meal-tag-picker__item', { hasText: opts.tag }).click();
  }
  if (opts.time) {
    await page.click('#time-toggle');
    await page.fill('#eaten-time', opts.time);
    if (opts.closeTimePanel) {
      await page.click('#time-toggle');
    }
  }
  await page.click('#save-btn');
  await expect(page.locator('#form-hint')).toContainText('บันทึกมื้อแล้ว');
}

export function getListItem(page: Page, foodName: string) {
  return page.locator('.app-list-item', { has: page.getByText(foodName, { exact: true }) });
}

export async function submitEmptyEntryForm(page: Page) {
  const countBefore = await page.locator('#list .app-list-item').count();
  await page.locator('#entry-form').evaluate((form) => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  return countBefore;
}

export function todayInputValue() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
