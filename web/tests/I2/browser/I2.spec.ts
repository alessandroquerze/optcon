import { test,expect,type Locator,type Page } from '@playwright/test';
async function lab(page:Page,anchor:string,id:string){await page.goto(`/introduzione.html#${anchor}`);await expect(page.locator(`#${anchor} h3`)).toBeVisible();const node=page.locator(`[data-demo="${id}"]`);await node.scrollIntoViewIfNeeded();await expect(node).toHaveAttribute('data-ready','true',{timeout:20000});return node;}
const ready=(node:Locator)=>expect(node).toHaveAttribute('data-ready','true',{timeout:20000});
const m=(node:Locator,label:string)=>node.locator('.o3-metrics>div').filter({has:node.page().getByText(label,{exact:true})}).locator('strong');
async function click(node:Locator,name:string){await node.getByRole('button',{name,exact:true}).click();await ready(node);}
const types=(node:Locator)=>node.locator('[data-i2-plot="0"],[data-o3-plot="0"]').evaluate(e=>(e as HTMLElement&{data:{type:string}[]}).data.map(t=>t.type));

test('I2 adds eight lessons for nine concepts and every assigned physical page',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await lab(page,'i2-dinamica','dynamics-residual');await expect(page.locator('.lesson[id^="i2-"]')).toHaveCount(8);await expect(page.locator('.lesson-toc a[href^="#i2-"]')).toHaveCount(8);await expect(page.locator('.lesson[id^="i1-"],.lesson[id^="i2-"]')).toHaveCount(18);
  await expect(page.locator('#i2-costi .lesson-sources a')).toHaveCount(2);await expect(page.locator('#i2-costi .lesson-sources a').first()).toHaveAttribute('href',/#page=20$/);await expect(page.locator('#i2-costi .lesson-sources a').last()).toHaveAttribute('href',/#page=22$/);await expect(page.locator('#i2-drone-vincoli .lesson-sources a')).toHaveAttribute('href',/#page=30$/);
  expect(await page.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id).filter((id,i,a)=>a.indexOf(id)!==i))).toEqual([]);expect(errors).toEqual([]);
});

test('dynamic residuals react to a single edited state and reset to a valid trajectory',async({page})=>{
  const node=await lab(page,'i2-dinamica','dynamics-residual');await expect(m(node,'Uguaglianze scalari')).toHaveText('12');await expect(m(node,'Massimo |hₜ|')).toHaveText('0,3');await click(node,'Passo +1 →');await expect(m(node,'Tempo t')).toHaveText('1');await click(node,'Traiettoria ammissibile');await expect(m(node,'Massimo |hₜ|')).toHaveText('0');
  await node.getByRole('spinbutton',{name:'Orizzonte T, valore numerico',exact:true}).fill('8');await ready(node);await expect(m(node,'Decisioni con x₀ fissato')).toHaveText('16');
});

test('stage and terminal cost bars recompute weights without double-counting the terminal',async({page})=>{
  const node=await lab(page,'i2-costi','trajectory-cost');const initial=await m(node,'Costo totale J').textContent();await click(node,'Ingresso costoso');await expect(m(node,'Costo totale J')).not.toHaveText(initial!);await click(node,'Nessun costo terminale');await expect(m(node,'Costo terminale')).toHaveText('0');await click(node,'Esegui tutto');await expect(node.locator('output')).toHaveText('Passo 12 / 12');
  expect(await node.locator('[data-o3-plot="1"]').evaluate(e=>(e as HTMLElement&{data:{type:string,x:number[]}[]}).data.filter(t=>t.type==='bar').map(t=>t.x.length))).toEqual([12,12,1]);
});

test('path limits and exact terminal constraints remain distinct from a terminal cost',async({page})=>{
  const node=await lab(page,'i2-vincoli','path-boundary');await click(node,'Esegui tutto');await expect(m(node,'Violazione limiti')).toHaveText('0');await expect(m(node,'Uguaglianza finale attiva?')).toHaveText('No');
  await click(node,'Uguaglianza terminale');await click(node,'Esegui tutto');await expect(m(node,'Uguaglianza finale attiva?')).toHaveText('Sì');await expect(m(node,'Residuo terminale')).toHaveText('0');
  await click(node,'Terminale incompatibile');await expect(node.locator('.o3-message')).toContainText('fuori');await expect(m(node,'Stato del problema')).toHaveText('Nessun candidato');
});

test('discrete control selects solver iterations separately from time and compares reference feasibility',async({page})=>{
  const node=await lab(page,'i2-problema','discrete-control');await expect(m(node,'Iterazione k')).toHaveText('0');await click(node,'Esegui tutto');await expect(m(node,'Iterazione k')).toHaveText('1');await expect(node.locator('.o3-message')).toContainText('Minimo globale');
  const ref=await lab(page,'i2-riferimento','reference-versus-trajectory');await expect(m(ref,'Massimo residuo desiderato')).toHaveText('1');await expect(m(ref,'Massimo residuo calcolato')).not.toHaveText('1');await click(ref,'Rampa desiderata');await expect(m(ref,'Massimo residuo desiderato')).not.toHaveText('1');
});

test('the planar drone simulates hover, free fall, torque and a time-based third axis',async({page})=>{
  const node=await lab(page,'i2-drone-modello','planar-drone');await expect(m(node,'Spinta di hovering per rotore (N)')).toHaveText('4,905');await click(node,'Esegui tutto');await expect(m(node,'px / py (m)')).toHaveText('0 / 1');
  await click(node,'Caduta libera');await click(node,'Passo +1 →');await expect(m(node,'px / py (m)')).toHaveText('0 / 1');await click(node,'Passo +1 →');await expect(m(node,'px / py (m)')).not.toHaveText('0 / 1');
  await click(node,'Coppia positiva');await click(node,'Esegui tutto');await expect(m(node,'θ (rad)')).not.toHaveText('0');await click(node,'3D');expect(await types(node)).toContain('scatter3d');await node.screenshot({path:'../artifacts/I2-drone-modello-3d.png'});
});

test('the raw drone animation advances real states and pauses on a parameter change',async({page})=>{
  const node=await lab(page,'i2-drone-modello','planar-drone');await click(node,'Coppia positiva');await node.getByRole('button',{name:'▶ Anima',exact:true}).click();await expect.poll(()=>m(node,'Tempo t').textContent()).not.toBe('0');await node.getByRole('spinbutton',{name:'Angolo iniziale (rad), valore numerico',exact:true}).fill('0.1');await ready(node);await expect(node.getByRole('button',{name:'▶ Anima',exact:true})).toHaveAttribute('aria-pressed','false');await expect(m(node,'Tempo t')).toHaveText('0');
});

test('the worker computes a feasible flight and time/view changes preserve its optimization result',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));const node=await lab(page,'i2-drone-costo','drone-optimal-control');await expect(node.locator('.o3-message')).toContainText('Convergenza locale');await expect(m(node,'Violazione limiti')).toHaveText('0');const calls=await node.getAttribute('data-computations'),cost=await m(node,'Costo J').textContent();
  await node.getByRole('slider',{name:'Tempo osservato t',exact:true}).fill('8');await ready(node);await expect(m(node,'Tempo t')).toHaveText('8');await click(node,'3D');expect(await types(node)).toContain('scatter3d');await expect(m(node,'Costo J')).toHaveText(cost!);await expect(node).toHaveAttribute('data-computations',calls!);
  await click(node,'Iterazione 0');const seed=await m(node,'Costo J').textContent();expect(seed).not.toBe(cost);await click(node,'Passo SQP +1 →');await expect(m(node,'Iterazione k')).toHaveText('1');await click(node,'Soluzione calcolata');await expect(m(node,'Costo J')).toHaveText(cost!);await node.screenshot({path:'../artifacts/I2-drone-ottimo-3d.png'});expect(errors).toEqual([]);
});

test('Q/R/QT and physical parameters trigger a fresh worker solution',async({page})=>{
  const node=await lab(page,'i2-drone-costo','drone-optimal-control');const cost=await m(node,'Costo J').textContent(),calls=Number(await node.getAttribute('data-computations'));
  await node.getByText('Spinte R e costo terminale QT',{exact:true}).click();await node.getByRole('spinbutton',{name:'QT: posizione, valore numerico',exact:true}).fill('60');await ready(node);await expect(m(node,'Costo J')).not.toHaveText(cost!);expect(Number(await node.getAttribute('data-computations'))).toBeGreaterThan(calls);
  await node.getByText('Condizione iniziale e parametri fisici',{exact:true}).click();await node.getByRole('spinbutton',{name:'Massa M (kg), valore numerico',exact:true}).fill('1.2');await ready(node);await expect(m(node,'Violazione limiti')).toHaveText('0');await node.getByRole('spinbutton',{name:'Orizzonte T (passi), valore numerico',exact:true}).fill('12');await ready(node);await expect(m(node,'Durata (s)')).toHaveText('2,4');
});

test('constraint failures and iteration budgets are explicit and reset recovers the worker',async({page})=>{
  const node=await lab(page,'i2-drone-vincoli','drone-constraints');await node.getByRole('button',{name:'Nessun interno',exact:true}).click();await expect(node).toHaveAttribute('data-ready','error');await expect(node.locator('.i2-worker-status')).toContainText('non è strettamente interna');
  await node.getByRole('button',{name:'Terminale incompatibile',exact:true}).click();await expect(node).toHaveAttribute('data-ready','error');await expect(node.locator('.i2-worker-status')).toContainText('fuori');
  await click(node,'Budget breve');await expect(node.locator('.o3-message')).toContainText('Budget');await click(node,'↺ Ripristina');await expect(node.locator('.o3-message')).toContainText('Convergenza locale');await click(node,'Fascia stretta');await expect(m(node,'Violazione limiti')).toHaveText('0');
  await node.screenshot({path:'../artifacts/I2-drone-vincoli.png'});
});

test('optimized animation, cancellation and rapid parameter replacement remain responsive',async({page})=>{
  const node=await lab(page,'i2-drone-costo','drone-optimal-control');await node.getByRole('button',{name:'▶ Anima',exact:true}).click();await expect.poll(()=>m(node,'Tempo t').textContent()).not.toBe('0');await node.getByRole('button',{name:'Ⅱ Pausa',exact:true}).click();await ready(node);
  await node.getByText('Budget e barriera',{exact:true}).click();await node.getByRole('spinbutton',{name:'Budget per stadio, valore numerico',exact:true}).fill('50');await node.getByRole('spinbutton',{name:'Obiettivo px (m), valore numerico',exact:true}).fill('1.3');await node.getByRole('spinbutton',{name:'Obiettivo px (m), valore numerico',exact:true}).fill('0.5');await ready(node);await expect(node.getByRole('spinbutton',{name:'Obiettivo px (m), valore numerico',exact:true})).toHaveValue('0.5');
  await node.evaluate(element=>{element.querySelector<HTMLButtonElement>('[data-calculate]')!.click();element.querySelector<HTMLButtonElement>('[data-cancel]')!.click();});await expect(node).toHaveAttribute('data-ready','error');await expect(node.locator('.i2-worker-status')).toContainText('Calcolo interrotto');
  await click(node,'↺ Ripristina');await expect(node.locator('.o3-message')).toContainText('Convergenza locale');
});

test('I2 fits a narrow screen and supports keyboard controls and source navigation',async({page})=>{
  await page.setViewportSize({width:390,height:844});const node=await lab(page,'i2-drone-costo','drone-optimal-control');const value=node.getByRole('spinbutton',{name:'Obiettivo px (m), valore numerico',exact:true});await value.focus();await page.keyboard.press('ArrowUp');await ready(node);await expect(value).toHaveValue('1.1');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);await node.screenshot({path:'../artifacts/I2-mobile.png'});
  for(const [anchor,id] of [['i2-costi','trajectory-cost'],['i2-vincoli','path-boundary'],['i2-drone-modello','planar-drone']]){await lab(page,anchor,id);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
});
