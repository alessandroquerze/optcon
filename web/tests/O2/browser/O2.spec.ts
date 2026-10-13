import { test, expect, type Page, type Locator } from '@playwright/test';

async function lab(page:Page,anchor:string,id:string) {
  await page.goto(`/ottimizzazione.html#${anchor}`);
  await expect(page.locator(`#${anchor} h3`)).toBeVisible();
  const node=page.locator(`[data-demo="${id}"]`);await node.scrollIntoViewIfNeeded();
  await expect(node).toHaveAttribute('data-ready','true');return node;
}
const metric=(node:Locator,label:string)=>node.locator('.o2-metrics>div').filter({has:node.page().locator('span',{hasText:new RegExp('^'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')})}).locator('strong');
const ready=(node:Locator)=>expect(node).toHaveAttribute('data-ready','true');
const types=(node:Locator)=>node.locator('[data-o2-plot="0"]').evaluate(e=>(e as HTMLElement&{data?:{type:string}[]}).data?.map(t=>t.type));

test('O2 provides 11 unique lessons, 29 source pages and working direct anchors inside its module',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await lab(page,'o2-discesa','descent-methods');
  await expect(page.locator('.lesson[id^="o2-"]')).toHaveCount(11);
  await expect(page.locator('.lesson-toc a[href^="#o2-"]')).toHaveCount(11);
  await expect(page.locator('#o2-discesa .lesson-sources a')).toHaveAttribute('href',/#page=26$/);
  await expect(page.locator('#o2-barriere .lesson-sources a')).toHaveAttribute('href',/#page=54$/);
  expect(await page.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id).filter((id,i,a)=>a.indexOf(id)!==i))).toEqual([]);
  expect(errors).toEqual([]);
});

test('descent controls recompute one step, reset history and display the same path on the 3D surface',async({page})=>{
  const node=await lab(page,'o2-discesa','descent-methods');
  await expect(node.locator('output')).toHaveText('Passo 0 / 30');
  const before=await metric(node,'f(zₖ)').textContent();
  await node.getByRole('button',{name:'Passo +1 →',exact:true}).click();await ready(node);
  await expect(node.locator('output')).toHaveText('Passo 1 / 30');
  await expect(metric(node,'f(zₖ)')).not.toHaveText(before!);
  await node.getByRole('button',{name:'3D',exact:true}).click();await ready(node);
  expect(await types(node)).toContain('surface');expect(await types(node)).toContain('scatter3d');
  await node.screenshot({path:'../artifacts/O2-discesa-3d.png'});
  await node.getByRole('button',{name:'↺ Ripristina',exact:true}).click();await ready(node);
  await expect(node.locator('output')).toHaveText('Passo 0 / 30');await expect(metric(node,'f(zₖ)')).toHaveText(before!);
});

test('Newton solves the QP in one iteration and reports non-positive curvature',async({page})=>{
  const node=await lab(page,'o2-gradiente-newton','gradient-versus-newton');
  await node.getByRole('button',{name:'Newton: QP in un passo',exact:true}).click();await ready(node);
  await node.getByRole('button',{name:'Esegui tutto',exact:true}).click();await ready(node);
  await expect(node.locator('output')).toHaveText('Passo 1 / 1');
  await expect(metric(node,'‖∇f(zₖ)‖₂')).toHaveText(/^(0|\d[,.]\d+e-\d+)$/);
  await node.getByRole('button',{name:'Newton: Hessiana indefinita',exact:true}).click();await ready(node);
  await expect(node.locator('.o2-message')).toContainText('non positiva');
  await expect(node.getByRole('button',{name:'Passo +1 →',exact:true})).toBeDisabled();
});

test('root finding exposes the tangent iteration, derivative-zero failure and a two-cycle',async({page})=>{
  const node=await lab(page,'o2-newton-zeri','newton-root');
  await node.getByRole('button',{name:'Passo +1 →',exact:true}).click();await ready(node);
  await expect(metric(node,'zₖ')).toHaveText('1,5');
  await node.getByRole('button',{name:'Derivata nulla',exact:true}).click();await ready(node);
  await expect(node.locator('.o2-message')).toContainText('Derivata nulla');
  await node.getByRole('button',{name:'Ciclo 0 ↔ 1',exact:true}).click();await ready(node);
  await node.getByRole('button',{name:'Esegui tutto',exact:true}).click();await ready(node);
  await expect(node.locator('.o2-message')).toContainText('Ciclo di periodo 2');
  await expect(metric(node,'zₖ')).toHaveText('0');
});

test('the model distinguishes positive curvature from an indefinite Hessian in 2D and 3D',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const node=await lab(page,'o2-modelli','newton-model');
  await node.getByRole('button',{name:'Modello indefinito',exact:true}).click();await ready(node);
  await expect(node.locator('.o2-message')).toContainText('non è positiva definita');
  await node.getByRole('button',{name:'QP: modello esatto',exact:true}).click();await ready(node);
  await expect(metric(node,'z + Δz')).toHaveText(/\(.*;.*\)/);
  await node.getByRole('button',{name:'3D',exact:true}).click();await ready(node);
  expect((await types(node))?.filter(t=>t==='surface')).toHaveLength(2);
  await node.screenshot({path:'../artifacts/O2-modello-3d.png'});
  expect(errors).toEqual([]);
});

test('Armijo exposes rejected geometric trials and its first accepted step',async({page})=>{
  const node=await lab(page,'o2-armijo','armijo');
  await expect(metric(node,'Accettato?')).toHaveText('No');
  await node.getByRole('button',{name:'Passo +1 →',exact:true}).click();await ready(node);
  await expect(node.locator('tbody tr')).toHaveCount(2);
  await node.getByRole('button',{name:'Esegui tutto',exact:true}).click();await ready(node);
  await expect(metric(node,'Accettato?')).toHaveText('Sì');
  await node.getByRole('button',{name:'Direzione di salita',exact:true}).click();await ready(node);
  await expect(node.locator('.o2-message')).toContainText('non di discesa');
  await expect(node.locator('tbody tr')).toHaveCount(0);
});

test('convergence shows cost, gradient and the separate alternating subsequence example',async({page})=>{
  const node=await lab(page,'o2-convergenza','convergence');
  await node.getByRole('button',{name:'Esegui tutto',exact:true}).click();await ready(node);
  await expect(node.locator('[data-o2-plot]')).toHaveCount(3);
  await expect(node.locator('.o2-detail')).toContainText('Non ogni sottosequenza converge');
  await node.getByRole('button',{name:'Lineare senza minimo',exact:true}).click();await ready(node);
  await node.getByRole('button',{name:'Esegui tutto',exact:true}).click();await ready(node);
  await expect(metric(node,'‖∇f(zₖ)‖₂')).toHaveText('1,4142');
  await node.getByRole('button',{name:'Sella stazionaria',exact:true}).click();await ready(node);
  await expect(metric(node,'‖∇f(zₖ)‖₂')).toHaveText('0');
});

test('the projection and variational inequality laboratories distinguish distance from optimality',async({page})=>{
  let node=await lab(page,'o2-proiezione','projection');
  await node.getByRole('button',{name:'Ottimo sul bordo',exact:true}).click();await ready(node);
  await expect(metric(node,'Residuo punto fisso')).toHaveText('0');
  await expect(metric(node,'Gradiente del costo in P(v)')).toHaveText('(-1,5; 0)');
  await node.getByRole('button',{name:'Punto non ottimo',exact:true}).click();await ready(node);
  await expect(node.locator('.o2-message')).toContainText('non minimizza');
  node=await lab(page,'o2-ottimalita-vincolata','feasible-directions');
  await expect(metric(node,'Residuo punto fisso')).toHaveText('0');
});

test('projected gradient reaches a constrained stationary point and rejects infeasible extrapolation',async({page})=>{
  const node=await lab(page,'o2-gradiente-proiettato','projected-gradient');
  await node.getByRole('button',{name:'Esegui tutto',exact:true}).click();await ready(node);
  await expect(metric(node,'‖z−P(z−∇f)‖')).toHaveText(/^(0|\d[,.]\d+e-\d+)$/);
  await expect(metric(node,'‖∇f(zₖ)‖')).toHaveText('1,5');
  await node.getByRole('button',{name:'Direzione ammissibile',exact:true}).click();await ready(node);
  await node.getByRole('spinbutton',{name:'Passo γ, valore numerico',exact:true}).fill('1.5');
  await expect(node.locator('.o2-error')).toContainText('0 < γ ≤ 1');
  await node.getByRole('button',{name:'↺ Ripristina',exact:true}).click();await ready(node);
  await expect(node.locator('.o2-error')).toBeHidden();
});

test('the gallery changes actual values and distinguishes scalar curves from bivariate surfaces',async({page})=>{
  const node=await lab(page,'o2-galleria','function-gallery');
  await node.getByRole('spinbutton',{name:'Punto x, valore numerico',exact:true}).fill('2');await ready(node);
  await expect(metric(node,'Costo nel punto')).toHaveText('-14');
  await node.getByRole('combobox',{name:'Funzione della galleria',exact:true}).selectOption('exponential');await ready(node);
  await expect(metric(node,'Dimensione del problema')).toHaveText('2');
  await node.getByRole('button',{name:'3D',exact:true}).click();await ready(node);expect(await types(node)).toContain('surface');
});

test('the barrier keeps iterates internal, changes epsilon between stages and rejects an exterior start',async({page})=>{
  const node=await lab(page,'o2-barriere','barrier');
  await expect(metric(node,'ε corrente')).toHaveText('1');
  await node.getByRole('button',{name:'Esegui tutto',exact:true}).click();await ready(node);
  await expect(metric(node,'ε corrente')).toHaveText('0,008');
  await expect(node.locator('.o2-message')).toHaveText('Stadi completati');
  await node.getByRole('button',{name:'3D',exact:true}).click();await ready(node);expect(await types(node)).toContain('surface');
  await node.screenshot({path:'../artifacts/O2-barriera-3d.png'});
  await node.getByRole('button',{name:'Partenza non interna',exact:true}).click();await ready(node);
  await expect(node.locator('.o2-message')).toContainText('Partenza fuori dall’interno');
  await expect(node.getByRole('button',{name:'Passo +1 →',exact:true})).toBeDisabled();
});

test('O2 fits a 390px viewport and supports keyboard parameter and step controls',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const node=await lab(page,'o2-armijo','armijo');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  const slider=node.getByRole('slider',{name:'Riduzione β',exact:true});await slider.focus();await page.keyboard.press('ArrowRight');
  await expect(node.getByRole('spinbutton',{name:'Riduzione β, valore numerico',exact:true})).toHaveValue('0.75');await ready(node);
  const next=node.getByRole('button',{name:'Passo +1 →',exact:true});await next.focus();await page.keyboard.press('Enter');await ready(node);
  await expect(node.locator('output')).toContainText('Passo 1 /');
  await node.getByRole('button',{name:'↺ Ripristina',exact:true}).click();await ready(node);
  await expect(node.getByRole('spinbutton',{name:'Riduzione β, valore numerico',exact:true})).toHaveValue('0.7');
  await page.locator('#o2-armijo h3').scrollIntoViewIfNeeded();await page.screenshot({path:'../artifacts/O2-mobile.png'});
  await node.getByRole('slider',{name:'Riduzione β',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:'../artifacts/O2-mobile-controls.png'});
});
