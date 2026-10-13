import { test,expect,type Page,type Locator } from '@playwright/test';
async function lab(page:Page,anchor:string,id:string){
  await page.goto(`/introduzione.html#${anchor}`);await expect(page.locator(`#${anchor} h3`)).toBeVisible();
  const node=page.locator(`[data-demo="${id}"]`);await node.scrollIntoViewIfNeeded();await expect(node).toHaveAttribute('data-ready','true');return node;
}
const ready=(node:Locator)=>expect(node).toHaveAttribute('data-ready','true');
// Filter directly against the metric label; no dependence on its formatted value.
const m=(node:Locator,label:string)=>node.locator('.o3-metrics>div').filter({has:node.page().getByText(label,{exact:true})}).locator('strong');
const types=(node:Locator,index=0)=>node.locator(`[data-o3-plot="${index}"]`).evaluate(e=>(e as HTMLElement&{data?:{type:string}[]}).data?.map(t=>t.type));
async function click(node:Locator,name:string){await node.getByRole('button',{name,exact:true}).click();await ready(node);}

test('I1 covers eleven concepts in ten unique lessons with both physical-page problem links',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await lab(page,'i1-motivazioni','motivation-map');
  await expect(page.locator('.lesson[id^="i1-"]')).toHaveCount(10);await expect(page.locator('.lesson-toc a[href^="#i1-"]')).toHaveCount(10);
  await expect(page.locator('#i1-problema .lesson-sources a')).toHaveCount(2);
  await expect(page.locator('#i1-problema .lesson-sources a').first()).toHaveAttribute('href',/#page=14$/);
  await expect(page.locator('#i1-problema .lesson-sources a').last()).toHaveAttribute('href',/#page=18$/);
  await expect(page.locator('#problema-minimizzazione')).toHaveCount(1);await expect(page.locator('[data-demo="optimization-geometry"]')).toHaveCount(1);
  expect(await page.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id).filter((id,i,a)=>a.indexOf(id)!==i))).toEqual([]);
  expect(errors).toEqual([]);
});

test('all five motivation scenarios change geometry and support a true spatial view',async({page})=>{
  const node=await lab(page,'i1-motivazioni','motivation-map');
  for(const scenario of ['aircraft','robot','car','drone','space']){await node.getByRole('combobox',{name:'Ambito applicativo'}).selectOption(scenario);await ready(node);await click(node,'Esegui tutto');await expect(node.locator('svg[role="img"]')).toBeVisible();}
  await click(node,'Drone e ostacolo');await click(node,'Esegui tutto');await click(node,'3D');expect(await types(node)).toContain('surface');expect(await types(node)).toContain('scatter3d');
  await node.screenshot({path:'../artifacts/I1-motivazioni-3d.png'});
});

test('motivation weights change the score while preserving trajectory and observed time',async({page})=>{
  const node=await lab(page,'i1-motivazioni','motivation-map');await click(node,'Esegui tutto');
  const before=await m(node,'Indice J accumulato').textContent(),path=await node.locator('[data-o3-plot="0"]').evaluate(e=>(e as HTMLElement&{data:{x:number[],y:number[]}[]}).data[1].y);
  await node.getByText('Indice di prestazione e disturbo',{exact:true}).click();await node.getByRole('spinbutton',{name:'Peso q della distanza, valore numerico',exact:true}).fill('4');await ready(node);
  await expect(m(node,'Indice J accumulato')).not.toHaveText(before!);await expect(node.locator('output')).toHaveText('Passo 120 / 120');
  expect(await node.locator('[data-o3-plot="0"]').evaluate(e=>(e as HTMLElement&{data:{y:number[]}[]}).data[1].y)).toEqual(path);
  await click(node,'Ingresso molto limitato');await click(node,'Esegui tutto');await expect(m(node,'Passi con saturazione')).not.toHaveText('0');
});

test('continuous states, independent output, RK4 resolution and time-as-third-axis work',async({page})=>{
  const node=await lab(page,'i1-sistemi-continui','continuous-system');await click(node,'Esegui tutto');const state=await m(node,'Stato (q,v)').textContent(),output=await m(node,'Uscita y').textContent();
  await node.getByText('Uscita e discretizzazione numerica',{exact:true}).click();await node.getByRole('spinbutton',{name:'Passaggio diretto dᵤ, valore numerico',exact:true}).fill('1');await ready(node);
  await expect(m(node,'Stato (q,v)')).toHaveText(state!);await expect(m(node,'Uscita y')).not.toHaveText(output!);
  await node.getByRole('spinbutton',{name:'Passo di integrazione Δt, valore numerico',exact:true}).fill('0.1');await ready(node);await expect(node.locator('output')).toHaveText('Passo 0 / 80');
  await click(node,'Esegui tutto');await click(node,'3D');expect(await types(node)).toContain('scatter3d');
  await node.screenshot({path:'../artifacts/I1-continuo-3d.png'});
});

test('the discrete model steps through correctly indexed stacks and modifies a single input',async({page})=>{
  const node=await lab(page,'i1-sistemi-discreti','discrete-system');await expect(m(node,'Dimensione di x')).toHaveText('16');
  await click(node,'Passo +1 →');await expect(node.locator('output')).toHaveText('Passo 1 / 16');
  await click(node,'Un ingresso modificato');await click(node,'Esegui tutto');await expect(m(node,'uₜ')).toHaveText('non definito a t=T');await expect(m(node,'Massimo residuo dinamico')).toHaveText('0');
  await node.getByText('Leggi i vettori impilati',{exact:true}).click();await expect(node.locator('.i1-stack p')).toHaveCount(2);
  expect(await types(node,1)).toEqual(['heatmap']);
});

test('equilibrium examples separate existence, stability and a dynamically inadmissible edited curve',async({page})=>{
  const node=await lab(page,'i1-traiettorie','trajectory-equilibrium');await expect(node.locator('.o3-message')).toContainText('asintoticamente stabile');
  await click(node,'Equilibrio instabile');await expect(node.locator('.o3-message')).toContainText('instabile');
  await click(node,'Coppia non di equilibrio');await expect(node.locator('.o3-message')).toContainText('non è un equilibrio');
  await click(node,'Curva non ammissibile');await expect(m(node,'Massimo residuo curva modificata')).not.toHaveText('0');
  await click(node,'Caso neutro');await expect(node.locator('.o3-message')).toContainText('inconcludente');
});

test('linearization compares real trajectories, diagnoses a defective base and draws its tangent plane',async({page})=>{
  const node=await lab(page,'i1-linearizzazione','linearization');
  const before=await m(node,'Errore massimo sulla traiettoria').textContent();await click(node,'Perturbazione piccola');await expect(m(node,'Errore massimo sulla traiettoria')).not.toHaveText(before!);
  await click(node,'Base non traiettoria');await expect(node.locator('.o3-message')).toContainText('Ipotesi violata');
  await click(node,'Correggi il difetto affine');await expect(node.locator('.o3-message')).toContainText('include il termine affine');
  await click(node,'Passo +1 →');await expect(m(node,'Tempo del modello locale')).toHaveText('1');
  await click(node,'3D');expect((await types(node))!.filter(t=>t==='surface')).toHaveLength(2);
  await node.screenshot({path:'../artifacts/I1-linearizzazione-3d.png'});
});

test('the control objective distinguishes gain feedback from a constrained one-step optimum',async({page})=>{
  const node=await lab(page,'i1-obiettivi','control-objectives');await expect(node.locator('.o3-message')).toContainText('non è stato progettato');
  await click(node,'Minimo a un passo');await expect(node.locator('.o3-message')).toContainText('non è il controllo ottimo dell’intero orizzonte');
  const before=await m(node,'Minimo a un passo').textContent();await click(node,'Ingresso costoso');await expect(m(node,'Minimo a un passo')).not.toHaveText(before!);
  await click(node,'Stabilizza l’origine');await click(node,'Esegui tutto');await expect(node.locator('output')).toHaveText('Passo 25 / 25');await expect(node.locator('.i1-flow svg')).toBeVisible();
});

test('the optimization geometry handles empty constraints and only shows a feasible optimality gap',async({page})=>{
  const node=await lab(page,'i1-problema','optimization-geometry');await expect(m(node,'Decisione ammissibile?')).toHaveText('Sì');
  await node.getByRole('spinbutton',{name:'Decisione z₁, valore numerico',exact:true}).fill('2');await ready(node);await expect(m(node,'Scarto dal minimo')).toHaveText('solo per decisioni ammissibili');
  await click(node,'Insieme vuoto');await expect(node.locator('.o3-message')).toContainText('incompatibili');await expect(m(node,'Valore minimo')).toHaveText('non definito');
  await click(node,'Vincoli insieme');await click(node,'3D');expect(await types(node)).toContain('surface');
});

test('the scalar and PSD cost labs show zero weights, nonunique minima and the reused Base lab',async({page})=>{
  const scalar=await lab(page,'i1-costo-scalare','scalar-cost');await click(scalar,'Peso nullo');await expect(m(scalar,'Costo')).toHaveText('0');await expect(m(scalar,'Minimo unico?')).toContainText('ogni z');
  const node=await lab(page,'i1-costo-pesato','semidefinite-cost');await expect(m(node,'Rango W')).toHaveText('1');await expect(m(node,'Argmin')).toContainText('una retta');
  await click(node,'Matrice nulla');await expect(m(node,'Argmin')).toHaveText('Tutto ℝ²');await click(node,'Due pesi positivi');await expect(m(node,'Rango W')).toHaveText('2');
  await click(node,'3D');expect(await types(node)).toContain('surface');
  const base=page.locator('[data-demo="weighted-cost"]');await base.scrollIntoViewIfNeeded();await ready(base);await expect(base.locator('[data-metric=condition]')).toBeVisible();
  await expect(page.locator('#i1-costo-pesato')).toContainText('il coefficiente corretto è w₂');
});

test('constraints distinguish interior, boundary, hyperbola, empty sets and a convex nonlinear equality',async({page})=>{
  const node=await lab(page,'i1-vincoli','constraint-sets');await expect(m(node,'Convesso?')).toHaveText('Sì');
  await click(node,'Solo bordo');await expect(m(node,'Convesso?')).toHaveText('No');
  await click(node,'Iperbole');await expect(m(node,'Insieme')).toHaveText('Non vuoto');
  await click(node,'Insieme vuoto');await expect(m(node,'Insieme')).toHaveText('Vuoto');
  await click(node,'Tutto il piano');await expect(m(node,'Insieme')).toHaveText('Tutto ℝ²');
  await click(node,'Uguaglianza non affine, retta');await expect(m(node,'Convesso?')).toHaveText('Sì');
  expect(await node.locator('[data-o3-plot="0"]').evaluate(e=>(e as HTMLElement&{data:{type:string,x:number[],y:number[]}[]}).data.some(t=>t.type==='scatter'&&t.x.length===2&&t.x.every(x=>x===0)&&t.y[0]===-3&&t.y[1]===3))).toBe(true);
  await click(node,'Ellisse piena');await click(node,'3D');expect((await types(node))!.filter(t=>t==='surface')).toHaveLength(2);
  await node.screenshot({path:'../artifacts/I1-vincoli-3d.png'});
});

test('I1 remains usable on a narrow screen with keyboard, collapsible controls and reset',async({page})=>{
  await page.setViewportSize({width:390,height:844});const node=await lab(page,'i1-motivazioni','motivation-map');
  const slider=node.getByRole('slider',{name:'Ampiezza del percorso',exact:true});await slider.focus();await page.keyboard.press('ArrowRight');await ready(node);
  await expect(node.getByRole('spinbutton',{name:'Ampiezza del percorso, valore numerico',exact:true})).toHaveValue('0.8');
  await click(node,'Passo +1 →');await expect(node.locator('output')).toHaveText('Passo 1 / 120');await click(node,'↺ Ripristina');
  await expect(node.locator('output')).toHaveText('Passo 0 / 120');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await node.screenshot({path:'../artifacts/I1-mobile.png'});
  for(const [anchor,id] of [['i1-linearizzazione','linearization'],['i1-costo-pesato','semidefinite-cost'],['i1-vincoli','constraint-sets']]){await lab(page,anchor,id);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);}
});
