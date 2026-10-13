import { test,expect,type Page,type Locator } from '@playwright/test';
async function lab(page:Page,anchor:string,id:string){
  await page.goto(`/ottimizzazione.html#${anchor}`);await expect(page.locator(`#${anchor} h3`)).toBeVisible();
  const node=page.locator(`[data-demo="${id}"]`);await node.scrollIntoViewIfNeeded();await expect(node).toHaveAttribute('data-ready','true');return node;
}
const ready=(node:Locator)=>expect(node).toHaveAttribute('data-ready','true');
const metric=(node:Locator,label:string)=>node.locator('.o3-metrics>div').filter({has:node.page().locator('span',{hasText:new RegExp('^'+label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$')})}).locator('strong');
const plotTypes=(node:Locator)=>node.locator('[data-o3-plot="0"]').evaluate(e=>(e as HTMLElement&{data?:{type:string}[]}).data?.map(t=>t.type));

test('O3 completes the Optimization source with ten unique sections, valid anchors and physical-page links',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await lab(page,'o3-regolarita','active-constraints');
  await expect(page.locator('.lesson[id^="o3-"]')).toHaveCount(10);
  await expect(page.locator('.lesson-toc a[href^="#o3-"]')).toHaveCount(10);
  await expect(page.locator('.lesson')).toHaveCount(30);
  await expect(page.locator('.concept')).toHaveCount(0);
  await expect(page.locator('#o3-regolarita .lesson-sources a')).toHaveAttribute('href',/#page=55$/);
  await expect(page.locator('#o3-tempo-iterazione .lesson-sources a')).toHaveAttribute('href',/#page=79$/);
  expect(await page.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id).filter((id,i,a)=>a.indexOf(id)!==i))).toEqual([]);
  expect(errors).toEqual([]);
});

test('LICQ changes with active constraints and detects a degenerate equality',async({page})=>{
  const node=await lab(page,'o3-regolarita','active-constraints');
  await expect(metric(node,'LICQ nel punto?')).toHaveText('Sì');
  await node.getByRole('button',{name:'Gradienti paralleli',exact:true}).click();await ready(node);
  await expect(metric(node,'Rango')).toHaveText('1');await expect(metric(node,'LICQ nel punto?')).toHaveText('No');
  await node.getByRole('button',{name:'Uno solo attivo',exact:true}).click();await ready(node);await expect(metric(node,'Disuguaglianze attive')).toHaveText('g1');
  await node.getByRole('button',{name:'Minimo senza LICQ',exact:true}).click();await ready(node);await expect(metric(node,'Rango')).toHaveText('0');
  await expect(node.locator('.o3-message')).toContainText('nessun λ');
});

test('the Lagrangian recomputes multipliers and provides a rotatable 3D surface',async({page})=>{
  const node=await lab(page,'o3-lagrangiana','lagrangian');
  await expect(metric(node,'‖∇z L‖₂')).toHaveText('0');
  await node.getByRole('spinbutton',{name:'Moltiplicatore μ, valore numerico',exact:true}).fill('2');await ready(node);
  await expect(metric(node,'‖∇z L‖₂')).toHaveText('1');
  await node.getByRole('button',{name:'3D',exact:true}).click();await ready(node);expect(await plotTypes(node)).toContain('surface');
  await node.screenshot({path:'../artifacts/O3-lagrangiana-3d.png'});
});

test('KKT checks primal, dual and complementarity separately',async({page})=>{
  const node=await lab(page,'o3-kkt','kkt-geometry');
  await expect(node.locator('.o3-message')).toContainText('Tutte le condizioni');
  await node.getByRole('button',{name:'Complementarità violata',exact:true}).click();await ready(node);await expect(metric(node,'|μg|')).toHaveText('1');
  await node.getByRole('button',{name:'Dualità violata',exact:true}).click();await ready(node);await expect(metric(node,'Residuo duale')).toHaveText('1');
  await node.getByRole('button',{name:'Uguaglianza violata',exact:true}).click();await ready(node);await expect(metric(node,'Residuo primale')).toHaveText('0,5');
});

test('curvature distinguishes circle extrema and the weak-activity critical-cone counterexample',async({page})=>{
  const node=await lab(page,'o3-curvatura','constrained-curvature');
  await expect(node.locator('.o3-message')).toContainText('Minimo locale');
  await node.getByRole('button',{name:'Massimo sul cerchio',exact:true}).click();await ready(node);await expect(node.locator('.o3-message')).toContainText('Massimo locale');
  await node.getByRole('button',{name:'Attivo debole: test insufficiente',exact:true}).click();await ready(node);
  await expect(metric(node,'Curvatura sul tangente')).toHaveText('2');await expect(metric(node,'dᵀ HL d')).toHaveText('-2');
  await expect(node.locator('.o3-message')).toContainText('non minimo');
  await node.getByRole('button',{name:'3D',exact:true}).click();await ready(node);expect(await plotTypes(node)).toContain('surface');
});

test('the constrained QP reports a unique minimum with indefinite Q and separates nonunique/unbounded cases',async({page})=>{
  const node=await lab(page,'o3-qp','constrained-qp');await expect(node.locator('.o3-message')).toHaveText('Minimo unico sul vincolo');
  await expect(metric(node,'Decisione minima')).toHaveText('(1; 0,5)');
  await node.getByRole('button',{name:'Infiniti minimi',exact:true}).click();await ready(node);await expect(node.locator('.o3-message')).toContainText('Infiniti minimi');
  await node.getByRole('button',{name:'Direzione piatta illimitata',exact:true}).click();await ready(node);await expect(node.locator('.o3-message')).toContainText('illimitato');
  await node.getByRole('button',{name:'Q indefinita, minimo unico',exact:true}).click();await ready(node);
  await node.getByRole('button',{name:'3D',exact:true}).click();await ready(node);expect(await plotTypes(node)).toContain('surface');
  await node.screenshot({path:'../artifacts/O3-qp-3d.png'});
});

test('Newton updates the affine KKT system once and rejects a KKT maximum as a minimum',async({page})=>{
  const node=await lab(page,'o3-newton','constrained-newton');
  await node.getByRole('button',{name:'Retta: KKT lineare',exact:true}).click();await ready(node);
  await node.getByRole('button',{name:'Passo +1 →',exact:true}).click();await ready(node);
  await expect(node.locator('output')).toHaveText('Passo 1 / 1');await expect(metric(node,'λₖ')).toHaveText('0');
  await node.getByRole('button',{name:'KKT massimo sul cerchio',exact:true}).click();await ready(node);await expect(node.locator('.o3-message')).toContainText('non è un minimo');
  await node.getByRole('button',{name:'Jacobiano singolare',exact:true}).click();await ready(node);await expect(node.locator('.o3-message')).toContainText('non a rango pieno');
});

test('SQP steps, history, curvature safeguard and 3D update without changing the preceding blocks',async({page})=>{
  const node=await lab(page,'o3-sqp','sqp');
  await node.getByRole('button',{name:'Passo +1 →',exact:true}).click();await ready(node);await expect(node.locator('output')).toContainText('Passo 1 /');
  await node.getByRole('button',{name:'Esegui tutto',exact:true}).click();await ready(node);await expect(node.locator('.o3-message')).toContainText('sotto tolleranza');
  await node.getByRole('button',{name:'3D',exact:true}).click();await ready(node);expect(await plotTypes(node)).toContain('scatter3d');
  await node.screenshot({path:'../artifacts/O3-sqp-3d.png'});
  await node.getByRole('button',{name:'QP non minimo',exact:true}).click();await ready(node);await expect(node.locator('.o3-message')).toContainText('non positiva');
  await node.getByRole('button',{name:'↺ Ripristina',exact:true}).click();await ready(node);await expect(node.locator('output')).toContainText('Passo 0 /');
  await node.getByText('Moltiplicatori e curvatura',{exact:true}).click();
  await node.getByRole('spinbutton',{name:'λ iniziale, valore numerico',exact:true}).fill('0.5');await ready(node);
  await expect(node.getByRole('spinbutton',{name:'λ iniziale, valore numerico',exact:true})).toHaveValue('0.5');
});

test('merit accepts restoration with a cost increase and reports insufficient penalty',async({page})=>{
  const node=await lab(page,'o3-merito','merit-line-search');
  await expect(metric(node,'Accettato?')).toHaveText('Sì');await expect(node.locator('.o3-detail')).toContainText('aumento del costo');
  await node.getByRole('button',{name:'Penalità insufficiente',exact:true}).click();await ready(node);await expect(node.locator('.o3-message')).toContainText('Nessuna discesa');
  await node.getByRole('button',{name:'Penalità adattata',exact:true}).click();await ready(node);await expect(metric(node,'Accettato?')).toHaveText('Sì');
  await expect(node.locator('tbody tr')).not.toHaveCount(0);
});

test('the equality barrier reaches successive interior centers and diagnoses incompatible interiors',async({page})=>{
  const node=await lab(page,'o3-barriere','barrier-equalities');
  await node.getByRole('button',{name:'Esegui tutto',exact:true}).click();await ready(node);await expect(node.locator('.o3-message')).toHaveText('Stadi completati');
  await expect(metric(node,'ε corrente')).toHaveText('0,004');
  await node.getByRole('button',{name:'3D',exact:true}).click();await ready(node);expect(await plotTypes(node)).toContain('surface');
  await node.screenshot({path:'../artifacts/O3-barriera-3d.png'});
  await node.getByRole('button',{name:'Interno incompatibile',exact:true}).click();await ready(node);await expect(node.locator('.o3-message')).toContainText('Nessun punto strettamente interno');
  await node.getByRole('button',{name:'Partenza fuori dominio',exact:true}).click();await ready(node);await expect(node.locator('.o3-message')).toContainText('fuori dal dominio');
});

test('time and optimizer iteration select different components of the trajectory',async({page})=>{
  const node=await lab(page,'o3-tempo-iterazione','time-iteration');await expect(metric(node,'Iterazione k')).toHaveText('0');await expect(metric(node,'Tempo t selezionato')).toHaveText('3');
  await node.getByRole('button',{name:'Passo +1 →',exact:true}).click();await ready(node);await expect(metric(node,'Iterazione k')).toHaveText('1');
  const before=await metric(node,'xₜᵏ').textContent();
  await node.getByRole('spinbutton',{name:'Tempo osservato t, valore numerico',exact:true}).fill('8');await ready(node);
  await expect(metric(node,'Tempo t selezionato')).toHaveText('8');await expect(metric(node,'uₜᵏ')).toHaveText('nessun ingresso a t=N');
  await expect(metric(node,'Iterazione k')).toHaveText('1');await expect(metric(node,'xₜᵏ')).not.toHaveText(before!);
  await node.getByRole('button',{name:'QP in un aggiornamento',exact:true}).click();await ready(node);
  await node.getByRole('button',{name:'Esegui tutto',exact:true}).click();await ready(node);await expect(node.locator('output')).toHaveText('Passo 1 / 1');
  await node.screenshot({path:'../artifacts/O3-tempo-iterazione.png'});
});

test('O3 fits mobile and exposes keyboard controls and reset',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const node=await lab(page,'o3-kkt','kkt-geometry');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  const slider=node.getByRole('slider',{name:'Moltiplicatore μ',exact:true});await slider.focus();await page.keyboard.press('ArrowRight');
  await expect(node.getByRole('spinbutton',{name:'Moltiplicatore μ, valore numerico',exact:true})).toHaveValue('1.25');await ready(node);
  await node.getByRole('button',{name:'↺ Ripristina',exact:true}).click();await ready(node);
  await expect(node.getByRole('spinbutton',{name:'Moltiplicatore μ, valore numerico',exact:true})).toHaveValue('1');
  await slider.scrollIntoViewIfNeeded();await page.screenshot({path:'../artifacts/O3-mobile.png'});
});
