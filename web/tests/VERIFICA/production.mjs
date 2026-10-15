/** Cross-chapter QA against dist/, served under a non-root path. No CDN or browser download. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';

const web = fileURLToPath(new URL('../../', import.meta.url));
const root = resolve(web, '..'), dist = resolve(web, 'dist'), artifacts = resolve(root, 'artifacts');
const inventory = JSON.parse(await readFile(resolve(root, 'sources/inventory.json'), 'utf8'));
const prefix = '/quaderno/';
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.pdf':'application/pdf', '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf', '.svg':'image/svg+xml' };
const report = { schemaVersion:1, startedAt:new Date().toISOString(), passed:false, prefix, pages:[], labs:[], failures:[], externalRequests:[], httpErrors:[], pageErrors:[], workerScripts:[], assets:[], screenshots:[] };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (!pathname.startsWith(prefix)) { res.writeHead(404); res.end(); return; }
    const path = resolve(dist, pathname.slice(prefix.length) || 'index.html');
    if (!path.startsWith(dist + sep)) { res.writeHead(403); res.end(); return; }
    const bytes = await readFile(path);
    res.writeHead(200, { 'Content-Type':mime[extname(path)] ?? 'application/octet-stream' });
    res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});

let browser;
try {
  await mkdir(artifacts, { recursive:true });
  for (const filename of await readdir(resolve(dist, 'assets'))) {
    if (!/\.(js|css)$/.test(filename)) continue;
    const bytes = await readFile(resolve(dist, 'assets', filename));
    report.assets.push({ filename, bytes:bytes.length, gzipBytes:gzipSync(bytes).length });
  }
  for (const source of inventory.sources) {
    const copied = await readFile(resolve(dist, 'pdfs', source.filename));
    assert.equal(createHash('sha256').update(copied).digest('hex'), source.sha256);
  }
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless:true, executablePath:process.env.OPTCON_BROWSER_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', args:['--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport:{ width:1440, height:1000 }, reducedMotion:'reduce' });
  await context.route('**/*', route => {
    const url = route.request().url();
    if (/^https?:/.test(url) && new URL(url).origin !== origin) {
      report.externalRequests.push(url); return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => report.pageErrors.push({ route:page.url(), message:e.message }));
  page.on('worker', worker => { if (!report.workerScripts.includes(worker.url())) report.workerScripts.push(worker.url()); });
  page.on('response', response => { if (response.status() >= 400) report.httpErrors.push({ url:response.url(), status:response.status() }); });
  const entry = (route, hash='') => origin + prefix + route + '.html' + hash;
  const fit = async () => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Horizontal overflow: ${page.url()}`);
  async function settle(lab, allowParameterError=false) {
    // Some historical labs keep data-ready=true while Plotly renders; allow two paint cycles.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect.poll(() => lab.getAttribute('data-ready'), { timeout:35000 }).toMatch(/^(true|error)$/);
    const state = await lab.getAttribute('data-ready');
    if (state === 'error') {
      // Worker labs announce domain/infeasibility failures through a polite live status.
      const alert = lab.locator('[role="alert"]:visible,[role="status"][data-error="true"]:visible');
      assert(allowParameterError && await alert.count() > 0, `Unexplained lab failure: ${await lab.getAttribute('data-demo')}`);
      assert((await alert.allTextContents()).join('').trim().length > 0);
    }
    return state;
  }
  async function reset(lab) {
    await lab.locator('[data-reset],[data-o1-reset],[data-o2-reset],[data-o3-reset]').click();
    await settle(lab);
    assert.equal(await lab.getAttribute('data-ready'), 'true');
  }
  async function accessibleControls(lab) {
    const issues = await lab.evaluate(node => {
      const issues = [];
      for (const control of node.querySelectorAll('input,select,button')) {
        const name = control.getAttribute('aria-label') || (control.labels ? [...control.labels].map(l => l.textContent).join(' ') : '') || control.textContent;
        if (!name?.trim()) issues.push(`${control.tagName}: missing accessible name`);
        if (control instanceof HTMLInputElement && ['number','range'].includes(control.type)) {
          if (!Number.isFinite(control.valueAsNumber)) issues.push(`${name}: nonfinite value`);
          if (control.min !== '' && control.valueAsNumber < Number(control.min) - 1e-8) issues.push(`${name}: below min`);
          if (control.max !== '' && control.valueAsNumber > Number(control.max) + 1e-8) issues.push(`${name}: above max`);
        }
      }
      for (const plot of node.querySelectorAll('[role="img"]')) if (!plot.getAttribute('aria-label')) issues.push('Unnamed chart');
      return issues;
    });
    assert.deepEqual(issues, [], await lab.getAttribute('data-demo'));
  }

  // Cold home: heavy plotting code must not load before a laboratory is visited.
  await page.goto(entry('index'));
  await expect(page.locator('h1')).toHaveCount(1);
  const cold = await page.evaluate(() => ({
    resources:performance.getEntriesByType('resource').map(r => r.name),
    domContentLoadedMs:performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,
    main:document.querySelectorAll('main').length, lang:document.documentElement.lang,
  }));
  assert.equal(cold.main, 1); assert.equal(cold.lang, 'it');
  assert(!cold.resources.some(url => /plotly/i.test(url)), 'Plotly loaded on home');
  report.coldHome = cold;
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'contenuto');

  const locations = [];
  for (const source of inventory.sources) {
    await page.goto(entry(source.id));
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('.course-nav [aria-current="page"]')).toHaveAttribute('href', `./${source.id}.html`);
    const structure = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map(n => n.id);
      const missingAnchors = [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href').slice(1)).filter(id => !document.getElementById(decodeURIComponent(id)));
      return {
        duplicateIds:ids.filter((id,i) => ids.indexOf(id) !== i), missingAnchors,
        sections:[...document.querySelectorAll('.lesson')].map(n => n.id),
        pdfLinks:[...new Set([...document.querySelectorAll('a[href*=".pdf"]')].map(a => a.getAttribute('href')))],
        labs:[...document.querySelectorAll('[data-demo]')].map((n,index) => ({ id:n.dataset.demo, anchor:n.closest('.lesson')?.id ?? 'laboratorio', index })),
        formulaErrors:document.querySelectorAll('.katex-error').length,
        incomplete:[...document.querySelectorAll('main p,main span')].some(n => /in preparazione|In costruzione/.test(n.textContent)),
      };
    });
    assert.deepEqual(structure.duplicateIds, []); assert.deepEqual(structure.missingAnchors, []);
    assert.equal(structure.formulaErrors, 0); assert.equal(structure.incomplete, false);
    assert.equal(structure.sections.length, {introduzione:23,ottimizzazione:30,kkt:11}[source.id]);
    for (const concept of source.concepts.filter(c => c.kind === 'theory')) assert.equal(await page.locator(`[id="${concept.id}"]`).count(), 1);
    for (const href of structure.pdfLinks) {
      const url = new URL(href, page.url());
      const pageNumber = Number(url.hash.replace('#page=', ''));
      const linkedSource = inventory.sources.find(s => decodeURIComponent(url.pathname).endsWith('/' + s.filename));
      assert(linkedSource, `Unknown PDF: ${href}`);
      assert(!url.hash || pageNumber >= 1 && pageNumber <= linkedSource.pageCount);
      const response = await context.request.get(url.href);
      assert.equal(response.status(), 200); assert.match(response.headers()['content-type'], /application\/pdf/);
    }
    await fit();
    report.pages.push({ sourceId:source.id, ...structure });
    locations.push(...structure.labs.map(l => ({ ...l, route:source.id })));
  }

  // Revisit each mounted lab independently, so WebGL contexts and Workers are released on navigation.
  for (const location of locations) {
    const t0 = performance.now();
    const result = { ...location, presets:0, selectOptions:0, numericEndpoints:0, keyboard:false, threeD:false, mobile:false, expectedParameterErrors:0 };
    report.labs.push(result);
    console.log(`VERIFY ${location.route}/${location.id}`);
    try {
      await page.setViewportSize({ width:1440, height:1000 });
      await page.goto(entry(location.route, '#' + location.anchor));
      const lab = page.locator(`[data-demo="${location.id}"]`).first();
      await lab.scrollIntoViewIfNeeded();
      await settle(lab);
      result.initialReadyMs = Math.round(performance.now() - t0);
      await accessibleControls(lab);
      // Every preset is exercised, including intentionally infeasible/degenerate examples.
      const presets = lab.locator('[data-preset],[data-o1-preset],[data-o2-preset],[data-o3-preset]');
      for (let i=0; i<await presets.count(); i++) {
        await presets.nth(i).click();
        if (await settle(lab, true) === 'error') result.expectedParameterErrors++;
        result.presets++;
        await reset(lab);
      }
      // Exercise all offered select options independently; numeric flags must recompute too.
      const selects = lab.locator('select');
      for (let i=0; i<await selects.count(); i++) {
        const values = await selects.nth(i).locator('option').evaluateAll(options => options.map(o => o.value));
        for (const value of values) {
          await selects.nth(i).selectOption(value);
          if (await settle(lab, true) === 'error') result.expectedParameterErrors++;
          result.selectOptions++;
          await reset(lab);
        }
      }
      // Bounds of the first and last visible numeric parameter, isolated by a reset.
      const numbers = lab.locator('input[type="number"]:visible');
      const numberCount = await numbers.count();
      for (const index of new Set([0, Math.max(0, numberCount-1)])) {
        if (!numberCount) break;
        // Visibility can change when a flag is edited; keep the same control by its stable ID.
        const inputId = await numbers.nth(index).getAttribute('id');
        const input = lab.locator(`[id="${inputId}"]`);
        for (const bound of ['min','max']) {
          const value = await input.getAttribute(bound);
          await input.fill(value);
          await input.dispatchEvent('input');
          if (await settle(lab, true) === 'error') result.expectedParameterErrors++;
          result.numericEndpoints++;
          await reset(lab);
        }
      }
      const slider = lab.locator('input[type="range"]:visible').first();
      if (await slider.count()) {
        const before = await slider.inputValue(), max = await slider.getAttribute('max');
        await slider.focus(); await page.keyboard.press(Number(before) < Number(max) ? 'ArrowRight' : 'ArrowLeft');
        assert.notEqual(await slider.inputValue(), before);
        await settle(lab, true); result.keyboard = true; await reset(lab);
      }
      const view = lab.getByRole('button', { name:'3D', exact:true });
      if (await view.count()) {
        await view.click(); await settle(lab);
        await expect(view).toHaveAttribute('aria-pressed', 'true');
        await expect.poll(() => lab.locator('.js-plotly-plot').evaluateAll(plots => plots.some(p => p.data?.some(t => /3d|surface/.test(t.type)))), { timeout:15000 }).toBe(true);
        result.threeD = true;
        await lab.getByRole('button', { name:'2D', exact:true }).click(); await settle(lab);
      }
      // Recompute after responsive resize and test controls at 390px for every lab.
      await page.setViewportSize({ width:390, height:844 });
      await reset(lab); await accessibleControls(lab); await fit();
      result.mobile = true;
      if (['motivation-map','quadratic-program','optimal-control-kkt'].includes(location.id)) {
        const path = resolve(artifacts, `VERIFICA-${location.route}-mobile.png`);
        await lab.screenshot({ path }); report.screenshots.push(path);
      }
      result.passed = true;
    } catch (error) {
      result.passed = false; result.error = error.message;
      console.error(`FAIL ${location.route}/${location.id}: ${error.message}`);
      report.failures.push({ ...location, message:error.message });
      await page.screenshot({ path:resolve(artifacts, `VERIFICA-failure-${location.route}-${location.id}.png`) }).catch(() => {});
    }
    result.totalMs = Math.round(performance.now() - t0);
  }

  for (const route of ['index','introduzione','ottimizzazione','kkt']) {
    await page.goto(entry(route)); await fit();
    for (const link of await page.locator('.course-nav a').all()) assert.equal((await context.request.get(new URL(await link.getAttribute('href'), page.url()).href)).status(), 200);
  }
  report.summary = {
    pages:report.pages.length, sections:report.pages.reduce((n,p) => n+p.sections.length,0),
    labMounts:report.labs.length, uniqueMountedIds:new Set(report.labs.map(l => l.id)).size,
    presets:report.labs.reduce((n,l) => n+l.presets,0), selectOptions:report.labs.reduce((n,l) => n+l.selectOptions,0),
    numericEndpoints:report.labs.reduce((n,l) => n+l.numericEndpoints,0),
    keyboard:report.labs.filter(l => l.keyboard).length, threeD:report.labs.filter(l => l.threeD).length,
    mobile:report.labs.filter(l => l.mobile).length,
    maxInitialReadyMs:Math.max(...report.labs.map(l => l.initialReadyMs ?? 0)),
  };
  assert.deepEqual(report.failures, []);
  assert.deepEqual(report.externalRequests, []);
  assert.deepEqual(report.httpErrors, []);
  assert.deepEqual(report.pageErrors, []);
  assert.equal(report.workerScripts.length, 2, 'Both compiled module Workers must run');
  for (const url of report.workerScripts) assert(new URL(url).pathname.startsWith(prefix + 'assets/solver.worker-'));
  report.passed = true;
  console.log(JSON.stringify({ passed:true, ...report.summary }));
} catch (error) {
  report.error = error.message; process.exitCode = 1; console.error(error);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  report.finishedAt = new Date().toISOString();
  await mkdir(artifacts, { recursive:true });
  await writeFile(resolve(artifacts, 'VERIFICA-browser.json'), JSON.stringify(report, null, 2) + '\n');
}
