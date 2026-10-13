import { test, expect } from '@playwright/test';

test('the three chapters load directly, navigate and link to their PDFs', async ({ page, request }) => {
  for (const [path, title] of [
    ['introduzione', 'Introduzione al'], ['ottimizzazione', 'Geometria'], ['kkt', 'Condizioni'],
  ]) {
    const response = await page.goto(`/${path}.html`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText(title);
    await expect(page.locator('.course-nav [aria-current=page]')).toHaveAttribute('href', `./${path}.html`);
    const pdf = await page.locator('.source-card').getAttribute('href');
    const pdfResponse = await request.get(`/${pdf!.replace(/^\.\//,'')}`);
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()['content-type']).toContain('application/pdf');
    await page.locator('.page-nav a[href="#percorso"]').click();
    await expect(page).toHaveURL(/#percorso$/);
  }
  await page.locator('.course-nav a[href="./introduzione.html"]').click();
  await expect(page).toHaveURL(/introduzione.html$/);
});

test('the laboratory recalculates data, presets, target and both 2D/3D views', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error=>errors.push(error.message));
  await page.goto('/ottimizzazione.html#laboratorio');
  await expect(page.locator('[data-demo]')).toHaveAttribute('data-ready', 'true');
  const metric = page.locator('[data-metric=cost]');
  const initial = await metric.innerText();
  const firstWeight = page.getByRole('spinbutton', { name: 'Peso w₁, valore numerico' });
  await firstWeight.fill('4');
  await firstWeight.dispatchEvent('input');
  await expect(metric).not.toHaveText(initial);
  await page.getByRole('button', { name: 'Pesi uguali', exact: true }).click();
  await expect(page.locator('[data-metric=condition]')).toHaveText('1,00');
  await page.getByRole('spinbutton', { name: 'Punto z₁, valore numerico' }).fill('0');
  await page.getByRole('spinbutton', { name: 'Punto z₂, valore numerico' }).fill('0');
  await expect(metric).toHaveText('0,00');
  await expect(page.locator('[data-metric=gradient]')).toHaveText('0,00');
  await page.locator('.target-controls summary').click();
  await page.getByRole('spinbutton', { name: 'Obiettivo z̄₁, valore numerico' }).fill('1');
  await expect(metric).toHaveText('0,50');
  await page.getByRole('button', { name: '3D', exact: true }).click();
  await expect(page.getByRole('button', { name: '3D', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.locator('.plot-canvas').evaluate(element=>(element as HTMLElement & { data?: { type: string }[] }).data?.[0]?.type)).toBe('surface');
  await page.screenshot({ path: '../artifacts/laboratorio-3d.png' });
  await page.getByRole('button', { name: '2D', exact: true }).click();
  await expect.poll(() => page.locator('.plot-canvas').evaluate(element=>(element as HTMLElement & { data?: { type: string }[] }).data?.[0]?.type)).toBe('contour');
  await page.getByRole('button', { name: 'Ripristina' }).click();
  await expect(metric).toHaveText(initial);
  await expect(firstWeight).toHaveValue('1');
  await expect(page.locator('.lab-error')).toBeHidden();
  await page.screenshot({ path: '../artifacts/laboratorio-desktop.png', fullPage: false });
  expect(errors).toEqual([]);
});

test('numeric limits and keyboard control keep range and number inputs synchronized', async ({ page }) => {
  await page.goto('/ottimizzazione.html#laboratorio');
  await expect(page.locator('[data-demo]')).toHaveAttribute('data-ready', 'true');
  const value = page.getByRole('spinbutton', { name: 'Peso w₁, valore numerico' });
  await value.fill('999');
  await expect(value).toHaveValue('5');
  const slider = page.getByRole('slider', { name: 'Peso w₁', exact: true });
  await expect(slider).toHaveValue('5');
  await slider.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(value).toHaveValue('4.9');
  await page.getByRole('button', { name: 'Valle stretta', exact: true }).click();
  await expect(page.locator('[data-metric=condition]')).toHaveText('16,67');
});

test('all chapters and the lab fit a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['index', 'introduzione', 'ottimizzazione', 'kkt']) {
    await page.goto(`/${route}.html`);
    await expect(page.locator('h1')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth+1)).toBe(true);
  }
  await page.goto('/ottimizzazione.html#laboratorio');
  await expect(page.locator('[data-demo]')).toHaveAttribute('data-ready', 'true');
  await page.getByRole('button', { name: 'Valle stretta', exact: true }).click();
  await expect(page.locator('[data-metric=condition]')).toHaveText('16,67');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth+1)).toBe(true);
  await page.screenshot({ path: '../artifacts/laboratorio-mobile.png', fullPage: true });
});
