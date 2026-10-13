import { test,expect,type Page,type Locator } from '@playwright/test';

async function laboratory(page:Page,id:string) {
  const lab=page.locator(`[data-demo="${id}"]`);
  await lab.scrollIntoViewIfNeeded();
  await expect(lab).toHaveAttribute('data-ready','true');
  return lab;
}
const metric=(lab:Locator,label:string)=>lab.locator('.o1-metrics>div').filter({hasText:label}).locator('strong');

test('O1 renders each complete lesson once, with an index, formulas, source links and stable anchors',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/ottimizzazione.html');
  await expect(page.locator('.lesson[id^="o1-"]')).toHaveCount(9);
  await expect(page.locator('.lesson-toc a[href^="#o1-"]')).toHaveCount(9);
  await expect(page.locator('.lesson[id^="o1-"] .lesson-sources a')).toHaveCount(9);
  await expect(page.locator('.lesson[id^="o1-"] .lesson-anchor')).toHaveCount(12);
  expect(await page.locator('.lesson[id^="o1-"]').evaluateAll(nodes=>new Set(nodes.map(n=>n.id)).size)).toBe(9);
  await page.getByRole('link',{name:'Appunti disponibili',exact:true}).click();
  await expect(page).toHaveURL(/#o1-minimi$/);
  await expect(page.locator('#o1-minimi h3')).toBeInViewport();
  const source=page.locator('#o1-convessita-vincoli .lesson-sources a');
  await expect(source).toHaveAttribute('href',/#page=12$/);
  expect(errors).toEqual([]);
});

test('the quartic distinguishes min from argmin and recalculates its stationary points',async({page})=>{
  await page.goto('/ottimizzazione.html#o1-minimi');
  const lab=await laboratory(page,'local-global-minima');
  await lab.getByRole('button',{name:'Due minimi globali',exact:true}).click();
  await expect(metric(lab,'Valore minimo')).toHaveText('0,00');
  await expect(metric(lab,'argmin f')).toHaveText('-1,00 e 1,00');
  await expect(lab.locator('.o1-message')).toContainText('non stretto');
  await lab.getByRole('spinbutton',{name:'Inclinazione α, valore numerico'}).fill('0.5');
  await expect(metric(lab,'Valore minimo')).not.toHaveText('0,00');
  await expect(metric(lab,'argmin f')).not.toContainText(' e ');
  await lab.screenshot({path:'../artifacts/O1-minimi.png'});
});

test('the derivative lab updates Taylor errors and displays the tangent plane in 3D',async({page})=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/ottimizzazione.html#o1-derivate');
  const lab=await laboratory(page,'derivatives');
  await lab.getByRole('spinbutton',{name:'Termine quartico q, valore numerico'}).fill('0');
  await expect(metric(lab,'Errore modello quadratico')).toHaveText('0,00');
  await lab.getByRole('button',{name:'3D',exact:true}).click();
  await expect.poll(()=>lab.locator('.o1-plot').evaluate(e=>(e as HTMLElement&{data?:{type:string}[]}).data?.filter(d=>d.type==='surface').length)).toBe(2);
  await expect(lab.locator('.o1-error')).toBeHidden();
  await lab.screenshot({path:'../artifacts/O1-derivate-3d.png'});
  expect(errors).toEqual([]);
});

test('equal zero Hessians can produce a strict minimum or a saddle, in 2D and 3D',async({page})=>{
  await page.goto('/ottimizzazione.html#o1-stazionarieta');
  const lab=await laboratory(page,'stationary-classification');
  await lab.getByRole('button',{name:'Hessiana nulla: minimo',exact:true}).click();
  await expect(lab.locator('.o1-message')).toContainText('Minimo locale stretto');
  await expect(metric(lab,'Autovalori Hessiana')).toHaveText('0,00 / 0,00');
  await lab.getByRole('button',{name:'Hessiana nulla: sella',exact:true}).click();
  await expect(lab.locator('.o1-message')).toContainText('Punto di sella');
  await expect(metric(lab,'Autovalori Hessiana')).toHaveText('0,00 / 0,00');
  await lab.getByRole('button',{name:'3D',exact:true}).click();
  await expect.poll(()=>lab.locator('.o1-plot').evaluate(e=>(e as HTMLElement&{data?:{type:string}[]}).data?.[0]?.type)).toBe('surface');
  await lab.screenshot({path:'../artifacts/O1-sella-3d.png'});
});

test('set and constraint labs expose the counterexamples instead of repeating incorrect equivalences',async({page})=>{
  await page.goto('/ottimizzazione.html#o1-insiemi-convessi');
  const sets=await laboratory(page,'convex-set');
  await sets.getByRole('button',{name:'Corona non convessa',exact:true}).click();
  await expect(metric(sets,'zθ ∈ insieme?')).toHaveText('No');
  await sets.getByRole('button',{name:'Disco convesso',exact:true}).click();
  await expect(metric(sets,'zθ ∈ insieme?')).toHaveText('Sì');
  const constraints=await laboratory(page,'constraint-convexity');
  await constraints.getByRole('button',{name:'Livello 0: convesso',exact:true}).click();
  await expect(metric(constraints,'Insieme convesso?')).toHaveText('Sì');
  await constraints.getByRole('button',{name:'Livello −0,5: non convesso',exact:true}).click();
  await expect(metric(constraints,'Insieme convesso?')).toHaveText('No');
  await expect(metric(constraints,'zθ ammissibile?')).toHaveText('No');
  await constraints.getByRole('button',{name:'h non affine, insieme convesso',exact:true}).click();
  await expect(metric(constraints,'Insieme convesso?')).toHaveText('Sì');
  await expect(constraints.locator('.o1-message')).toContainText('non affine');
});

test('convexity and gradient bounds report invalid hypotheses and unattained minima honestly',async({page})=>{
  await page.goto('/ottimizzazione.html#o1-funzioni-convesse');
  const functions=await laboratory(page,'convex-function');
  await functions.getByRole('button',{name:'Non convessa',exact:true}).click();
  await functions.getByRole('spinbutton',{name:'Estremo A, valore numerico'}).fill('-0.5');
  await functions.getByRole('spinbutton',{name:'Estremo B, valore numerico'}).fill('0.5');
  await expect(metric(functions,'Corda − f(zθ)')).toHaveText('-0,11');
  await functions.getByRole('button',{name:'Convessa senza minimo',exact:true}).click();
  await expect(functions.locator('.o1-message')).toContainText('non raggiunto');
  const bounds=await laboratory(page,'quadratic-bounds');
  await bounds.getByRole('button',{name:'L troppo piccola',exact:true}).click();
  await expect(bounds.locator('.o1-message')).toContainText('Ipotesi non soddisfatte');
  await bounds.getByRole('button',{name:'Modelli esatti',exact:true}).click();
  for(const label of ['f(y) − limite inferiore','Limite superiore − f(y)','Scarto disuguaglianza combinata'])await expect(metric(bounds,label)).toHaveText('0,00');
});

test('a singular PSD QP can have infinitely many minima or no minimum',async({page})=>{
  await page.goto('/ottimizzazione.html#o1-programmi-quadratici');
  const lab=await laboratory(page,'quadratic-program');
  await lab.getByRole('button',{name:'Infiniti minimi',exact:true}).click();
  await expect(metric(lab,'Esito')).toHaveText('Infiniti minimi');
  await expect(metric(lab,'Valore minimo')).toHaveText('-0,25');
  await lab.getByRole('button',{name:'Q ≥ 0, ma nessun minimo',exact:true}).click();
  await expect(metric(lab,'Esito')).toHaveText('Nessun minimo');
  await expect(metric(lab,'Valore minimo')).toHaveText('−∞');
  await lab.getByRole('button',{name:'Minimo unico',exact:true}).click();
  await lab.getByRole('button',{name:'3D',exact:true}).click();
  await expect.poll(()=>lab.locator('.o1-plot').evaluate(e=>(e as HTMLElement&{data?:{type:string}[]}).data?.[0]?.type)).toBe('surface');
});

test('complete lessons and new laboratories fit mobile and keep slider/number synchronization',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/ottimizzazione.html#o1-convessita-vincoli');
  const lab=await laboratory(page,'constraint-convexity');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  const slider=lab.getByRole('slider',{name:'Coefficiente θ',exact:true});
  await slider.focus();await page.keyboard.press('ArrowRight');
  await expect(lab.getByRole('spinbutton',{name:'Coefficiente θ, valore numerico'})).toHaveValue('0.55');
  await lab.getByRole('button',{name:'↺ Ripristina',exact:true}).click();
  await expect(lab.getByRole('spinbutton',{name:'Coefficiente θ, valore numerico'})).toHaveValue('0.5');
  await page.locator('#o1-convessita-vincoli h3').scrollIntoViewIfNeeded();
  await page.screenshot({path:'../artifacts/O1-mobile.png'});
});
