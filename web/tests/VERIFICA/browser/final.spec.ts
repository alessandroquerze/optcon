import { test, expect } from '@playwright/test';

test('the skip link transfers keyboard focus to the content on all four pages', async ({ page }) => {
  for (const route of ['index','introduzione','ottimizzazione','kkt']) {
    await page.goto(`/${route}.html`);
    await page.keyboard.press('Tab');
    await expect(page.locator('.skip-link')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
    await expect(page.locator('main')).toHaveAttribute('tabindex', '-1');
    await page.keyboard.press('Tab');
    const isInside = await page.evaluate(() => !!document.querySelector('main')?.contains(document.activeElement));
    expect(isInside).toBe(true);
  }
});

test('chapter navigation and completion wording remain correct at 390px', async ({ page }) => {
  await page.setViewportSize({ width:390, height:844 });
  for (const [route, sections] of [['introduzione',23],['ottimizzazione',30],['kkt',11]] as const) {
    await page.goto(`/${route}.html`);
    await expect(page.locator('.lesson')).toHaveCount(sections);
    await expect(page.locator('.edition')).toContainText('Appunti interattivi');
    await expect(page.locator('.course-nav [aria-current="page"]')).toHaveAttribute('href', `./${route}.html`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.locator('.page-nav a[href="#fonti"]').click();
    await expect(page).toHaveURL(/#fonti$/);
    await expect(page.locator('#fonti .source-card')).toBeVisible();
  }
});
