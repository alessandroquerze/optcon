import './styles.css';
import type { Data } from 'plotly.js';
import type { DemoDefinition } from '../../content/schema';
import type { Vec2 } from '../../math/quadratic';
import { html, required } from '../../ui/dom';
import { formula } from '../../ui/formula';
import { numberControl, type NumberControlSpec } from '../../ui/controls';
import { createPlot, type PlotFrame } from '../../ui/plot';
import { grid, linspace, dot } from '../../math/O1/foundations';
import { curve, marker, scalarFrame, surfaceFrame, circle, layout } from '../O1/plots';
import { computeDescent, descentDefaults, computeRoot, rootDefaults, computeModel, modelDefaults,
  computeProjection, projectionDefaults, computeProjected, projectedDefaults, computeGallery, galleryDefaults,
  computeBarrier, barrierDefaults, barrierObjective, backtrack, objective, project, add, norm,
  type DescentParams, type Iterate, type Objective, type SetKind } from '../../math/O2/methods';

type Metric={label:string;value:string};
interface Presentation {frames:PlotFrame[];metrics:Metric[];message:string;warning?:boolean;detail?:string;steps?:number;current?:number;}
interface Config<P extends object> {
  id:string;title:string;formula:string;defaults:P;controls:NumberControlSpec[];
  selects?:{key:string;label:string;options:[string,string][]}[];
  presets?:{label:string;params:Partial<P>}[];views?:boolean;stepping?:boolean;plots:number;
  visibleControls?:Record<string,(p:Readonly<P>)=>boolean>;
  compute(p:Readonly<P>):unknown;present(p:Readonly<P>,view:'2d'|'3d',cursor:number):Presentation;
}
const C=(key:string,label:string,min:number,max:number,step=.1):NumberControlSpec=>({key,label,min,max,step});
const num=(v:number)=>!Number.isFinite(v)?'non finito':v===0?'0':Math.abs(v)<.001||Math.abs(v)>1e5?v.toExponential(2):v.toLocaleString('it-IT',{maximumFractionDigits:4});
const M=(label:string,value:string|number):Metric=>({label,value:typeof value==='number'?num(value):value});
const V=(v:Vec2)=>`(${num(v[0])}; ${num(v[1])})`;
const kinds:[string,string][]=[['quadratic','QP convesso ruotato'],['double-well','Due valli: (x²−1)²+y²'],['exponential','Somma di esponenziali'],['linear','Lineare: x+y, illimitato']];
const setOptions:[string,string][]=[['box','Quadrato |x|,|y| ≤ b'],['disk','Disco ‖z‖ ≤ b']];

function define<P extends object>(config:Config<P>):DemoDefinition<P,unknown> {
  return {id:config.id,defaults:config.defaults,compute:config.compute,async mount(container) {
    let p={...config.defaults},view:'2d'|'3d'='2d',cursor=0,steps=0,disposed=false,revision=0;
    container.classList.add('o2-lab');
    container.innerHTML=`<div class="o2-header"><div><span class="mini-label">ESPERIMENTO INTERATTIVO</span><h4>${html(config.title)}</h4></div>${config.views?'<div class="view-switch" role="group" aria-label="Vista del grafico"><button type="button" data-o2-view="2d" aria-pressed="true">2D</button><button type="button" data-o2-view="3d" aria-pressed="false">3D</button></div>':''}</div>
      <div class="o2-formula">${formula(config.formula)}</div><div class="o2-presets">${(config.presets??[]).map((x,i)=>`<button type="button" data-o2-preset="${i}">${html(x.label)}</button>`).join('')}<button type="button" data-o2-reset>↺ Ripristina</button></div>
      ${config.stepping?'<div class="o2-steps" role="group" aria-label="Esecuzione per passi"><button type="button" data-o2-prev>← Indietro</button><button type="button" data-o2-next>Passo +1 →</button><button type="button" data-o2-all>Esegui tutto</button><output aria-live="polite"></output></div>':''}
      <div class="o2-body"><div class="o2-charts">${Array.from({length:config.plots},(_,i)=>`<div class="o2-plot ${i?'o2-history':''}" data-o2-plot="${i}" role="img" aria-label="${html(config.title)}: ${i?'andamento delle misure':'geometria'}. Valori disponibili nelle misure testuali."></div>`).join('')}</div><div class="o2-controls"></div></div>
      <div class="o2-metrics" aria-live="polite" aria-atomic="true"></div><p class="o2-message" role="status"></p><div class="o2-detail"></div><p class="o2-error" role="alert" hidden></p>`;
    const plots=await Promise.all([...container.querySelectorAll<HTMLElement>('[data-o2-plot]')].map(node=>createPlot(node)));
    const controls=new Map<string,ReturnType<typeof numberControl>>();
    function update() {
      if(disposed)return;const rev=++revision;container.dataset.ready='loading';
      try {
        const d=config.present(p,view,cursor);steps=d.steps??0;cursor=d.current??0;
        required(container,'.o2-charts').hidden=false;
        controls.forEach((input,key)=>input.element.hidden=config.visibleControls?.[key]?!config.visibleControls[key](p):false);
        required(container,'.o2-metrics').innerHTML=d.metrics.map(m=>`<div><span>${html(m.label)}</span><strong>${html(m.value)}</strong></div>`).join('');
        const message=required(container,'.o2-message');message.textContent=d.message;message.classList.toggle('is-warning',!!d.warning);
        required(container,'.o2-detail').innerHTML=d.detail??'';required(container,'.o2-error').hidden=true;
        if(config.stepping) {
          required(container,'output').textContent=`Passo ${cursor} / ${steps}`;
          required<HTMLButtonElement>(container,'[data-o2-prev]').disabled=cursor===0;
          required<HTMLButtonElement>(container,'[data-o2-next]').disabled=cursor>=steps;
          required<HTMLButtonElement>(container,'[data-o2-all]').disabled=cursor>=steps;
        }
        void Promise.all(d.frames.map((frame,i)=>plots[i].render(frame))).then(()=>{if(!disposed&&revision===rev)container.dataset.ready='true';}).catch(fail);
      }catch(error){
        steps=0;cursor=0;required(container,'.o2-charts').hidden=true;required(container,'.o2-metrics').innerHTML='';
        required(container,'.o2-message').textContent='Esperimento sospeso: correggi i parametri o ripristina il caso iniziale.';
        if(config.stepping){required(container,'output').textContent='Passo sospeso';container.querySelectorAll<HTMLButtonElement>('.o2-steps button').forEach(b=>b.disabled=true);}
        fail(error);
      }
    }
    function fail(error:unknown) {if(disposed)return;container.dataset.ready='error';const node=required(container,'.o2-error');node.hidden=false;node.textContent=error instanceof Error?error.message:'Grafico non disponibile.';}
    for(const spec of config.selects??[]) {
      const label=document.createElement('label');label.className='o2-select';label.textContent=spec.label;
      const input=document.createElement('select');input.setAttribute('aria-label',spec.label);input.dataset.key=spec.key;
      input.innerHTML=spec.options.map(([v,t])=>`<option value="${html(v)}">${html(t)}</option>`).join('');
      input.value=String((p as Record<string,unknown>)[spec.key]);input.onchange=()=>{p={...p,[spec.key]:input.value};cursor=0;update();};
      label.append(input);required(container,'.o2-controls').append(label);
    }
    for(const spec of config.controls) {
      const input=numberControl(spec,Number((p as Record<string,unknown>)[spec.key]),v=>{p={...p,[spec.key]:v};cursor=0;update();});
      controls.set(spec.key,input);required(container,'.o2-controls').append(input.element);
    }
    function sync(){controls.forEach((input,key)=>input.setValue(Number((p as Record<string,unknown>)[key])));container.querySelectorAll<HTMLSelectElement>('select').forEach(s=>s.value=String((p as Record<string,unknown>)[s.dataset.key!]));}
    const click=(event:Event)=>{
      const b=(event.target as Element).closest<HTMLButtonElement>('button');if(!b)return;
      if(b.dataset.o2Preset!==undefined){p={...config.defaults,...config.presets![Number(b.dataset.o2Preset)].params};cursor=0;sync();}
      else if(b.hasAttribute('data-o2-reset')){p={...config.defaults};cursor=0;sync();}
      else if(b.hasAttribute('data-o2-next'))cursor++;
      else if(b.hasAttribute('data-o2-prev'))cursor=Math.max(0,cursor-1);
      else if(b.hasAttribute('data-o2-all'))cursor=steps;
      else if(b.dataset.o2View){view=b.dataset.o2View as '2d'|'3d';container.querySelectorAll<HTMLElement>('[data-o2-view]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.o2View===view)));}
      else return;
      update();
    };
    container.addEventListener('click',click);update();
    return {destroy(){disposed=true;revision++;container.removeEventListener('click',click);controls.forEach(c=>c.destroy());container.querySelectorAll<HTMLSelectElement>('select').forEach(s=>s.onchange=null);plots.forEach(plot=>plot.destroy());}};
  }};
}

function pathFrame(f:Objective,points:Vec2[],view:'2d'|'3d',extent=3,boundary?:Vec2[]):PlotFrame {
  const frame=surfaceFrame(grid((x,y)=>f.value([x,y]),extent,41),view);
  frame.layout.uirevision='o2-path';
  if(view==='2d') {
    frame.layout.showlegend=true;
    frame.data.push({type:'scatter',x:points.map(z=>z[0]),y:points.map(z=>z[1]),mode:'lines+markers',name:'Iterati',line:{color:'#b77130',width:2},marker:{size:6,color:'#b77130'}});
    if(boundary)frame.data.push(curve(boundary.map(z=>z[0]),boundary.map(z=>z[1]),'Bordo ammissibile','#344d39'));
  } else {
    frame.data.push({type:'scatter3d',x:points.map(z=>z[0]),y:points.map(z=>z[1]),z:points.map(z=>f.value(z)),mode:'lines+markers',name:'Iterati',line:{color:'#b77130',width:6},marker:{size:4,color:'#b77130'}});
  }
  return frame;
}
function history(points:Iterate[],residual='‖∇f‖₂'):PlotFrame {
  const k=points.map((_,i)=>i);
  const a=curve(k,points.map(z=>z.value),'Costo','#356b45');
  const b={...curve(k,points.map(z=>z.gradientNorm),residual,'#b77130'),yaxis:'y2'} as Data;
  return {data:[a,b],layout:layout({height:300,margin:{l:55,r:65,t:25,b:70},xaxis:{title:{text:'Iterazione k'},rangemode:'tozero',dtick:k.length<10?1:undefined},yaxis:{title:{text:'Costo'},zeroline:true},yaxis2:{title:{text:residual},overlaying:'y',side:'right',showgrid:false},legend:{orientation:'h',y:-.28}})};
}
const boundary=(set:SetKind,size:number):Vec2[]=>set==='disk'?circle(size):[[-size,-size],[size,-size],[size,size],[-size,size],[-size,-size]];
const algorithmControls=[C('x','Partenza x',-3,3),C('y','Partenza y',-3,3),C('condition','Condizionamento κ',1,30,1),C('step','Passo iniziale γ₀',.01,2,.01),C('beta','Riduzione β',.1,.9,.05),C('c','Sufficiente discesa c',.05,.9,.05),C('alpha','Esponente α',.25,1.5,.05),C('scaleX','Scala D₁₁',.05,3,.05),C('regularization','Regolarizzazione λ',0,10,.25),C('difference','Differenza finita h',.001,.5,.001),C('iterations','Budget iterazioni',1,100,1)];
function descentConfig(id:string,title:string,defaults=descentDefaults):Config<DescentParams> {
  return {id,title,formula:String.raw`z_{k+1}=z_k+\gamma_kd_k,\quad d_k=-D_k\nabla f(z_k)`,defaults,views:true,stepping:true,plots:2,controls:algorithmControls,
    visibleControls:{condition:p=>p.kind==='quadratic',beta:p=>p.rule==='armijo',c:p=>p.rule==='armijo',alpha:p=>p.rule==='diminishing',scaleX:p=>p.method==='scaled',regularization:p=>p.method==='newton'||p.method==='finite-newton',difference:p=>p.method==='finite-newton'},
    selects:[{key:'kind',label:'Funzione di costo',options:kinds},{key:'method',label:'Metodo',options:[['gradient','Gradiente'],['scaled','Gradiente scalato'],['newton','Newton'],['finite-newton','Newton con differenze finite']]},{key:'rule',label:'Regola del passo',options:[['armijo','Armijo'],['fixed','Costante'],['diminishing','Decrescente γ₀/(k+1)^α']]}],
    presets:[{label:'Gradiente con Armijo',params:{}},{label:'Newton: QP in un passo',params:{method:'newton',rule:'fixed',step:1}},{label:'Passo instabile',params:{rule:'fixed',step:.4,condition:8}},{label:'Newton: Hessiana indefinita',params:{kind:'double-well',method:'newton',x:.2,y:.5}},{label:'Lineare senza minimo',params:{kind:'linear',rule:'fixed',step:1}},{label:'Sella stazionaria',params:{kind:'double-well',x:0,y:0}}],compute:computeDescent,
    present(p,view,cursor){const d=computeDescent(p),k=Math.min(cursor,d.points.length-1),points=d.points.slice(0,k+1),last=points.at(-1)!;
      const extent=Math.min(8,Math.max(3,...points.map(q=>norm(q.z)*1.1))),outside=points.some(q=>Math.max(...q.z.map(Math.abs))>extent);
      return {frames:[pathFrame(d.objective,points.map(q=>q.z),view,extent),history(points)],steps:d.points.length-1,current:k,
        metrics:[M('Iterazione k',k),M('zₖ',V(last.z)),M('f(zₖ)',last.value),M('‖∇f(zₖ)‖₂',last.gradientNorm),M('Ultimo passo γ',last.step),M('Backtracking ultimo passo',last.backtracks)],
        message:k===d.points.length-1?d.status:'Avanza di un passo per osservare direzione, costo e residuo.',warning:outside||d.status.includes('Divergenza')||d.status.includes('non positiva'),
        detail:`<p>${p.kind==='quadratic'?`QP con autovalori 1 e κ: gradiente a passo costante stabile per 0 &lt; γ &lt; ${num(2/p.condition)}.`:p.kind==='linear'?'Il gradiente resta (1,1); f scende senza limite e non esistono punti di accumulazione.':p.kind==='double-well'?'Costo coercivo non convesso: gradiente nullo può indicare anche la sella (0,0).':'Funzione esponenziale convessa: la curvatura varia con il punto.'} ${outside?'Iterati fuori dalla finestra ±8: i valori restano leggibili nelle misure.':''}</p><p>γ decrescente: la serie dei passi diverge per α ≤ 1, quella dei quadrati converge per α &gt; 1/2. Per α &gt; 1 il movimento totale può essere insufficiente. I parametri D₁₁, λ e h agiscono rispettivamente sul metodo scalato, sui due Newton e sul Newton discreto. Il termine “tolleranza” certifica un residuo piccolo, non un minimo globale.</p>`};},
  };
}
export const descentDemo=define(descentConfig('descent-methods','Una direzione e una lunghezza del passo'));
export const comparisonDemo=define(descentConfig('gradient-versus-newton','Gradiente, scala e Newton'));
export const convergenceDemo=define({...descentConfig('convergence','Costo, residuo e convergenza'),present(p,view,cursor){
  const d=descentConfig('convergence','').present(p,view,cursor);
  const n=Math.min(cursor,p.iterations),x=Array.from({length:n+1},(_,i)=>i);
  d.frames.push(scalarFrame([{...curve(x,x.map(k=>(-1)**k),'Sequenza (−1)ᵏ','#587d9a'),mode:'markers'},
    {type:'scatter',x:x.filter(k=>k%2===0),y:x.filter(k=>k%2===0).map(()=>1),mode:'markers',name:'Sottosequenza pari → 1',marker:{color:'#b77130',symbol:'diamond',size:10}}],{height:280,xaxis:{title:{text:'Indice k'},dtick:1},yaxis:{title:{text:'Valore della sequenza'},range:[-1.4,1.4]}}));
  d.detail+='<p>Il terzo grafico è un esempio di sequenza, distinto dagli iterati dell’algoritmo: (−1)ᵏ ha due punti di accumulazione, mentre la sottosequenza pari converge a 1. Non ogni sottosequenza converge.</p>';
  return d;
},plots:3});

export const rootDemo=define({id:'newton-root',title:'La tangente cerca uno zero',formula:String.raw`z_{k+1}=z_k-\frac{r(z_k)}{r'(z_k)}`,defaults:rootDefaults,plots:2,stepping:true,
  controls:[C('a','Parametro a',.1,5,.1),C('start','Punto iniziale',-3,3,.1),C('iterations','Budget iterazioni',1,20,1)],
  selects:[{key:'kind',label:'Funzione residuo',options:[['square','r(z)=z²−a'],['cycle','r(z)=z³−2z+2']]}],
  presets:[{label:'Radice √2',params:{}},{label:'Derivata nulla',params:{start:0}},{label:'Ciclo 0 ↔ 1',params:{kind:'cycle',start:0}}],compute:computeRoot,
  present(p,_view,cursor){const d=computeRoot(p),k=Math.min(cursor,d.points.length-1),z=d.points[k],x=linspace(-3.5,3.5,161),slope=d.dr(z),next=Math.abs(slope)>1e-10?z-d.r(z)/slope:undefined;
    const traces=[curve(x,x.map(d.r),'r(z)'),curve(x,x.map(v=>d.r(z)+slope*(v-z)),'Tangente','#b77130'),marker([z,d.r(z)],'Iterato corrente')];
    if(next!==undefined&&Math.abs(next)<10)traces.push(marker([next,0],'Zero della tangente','#587d9a'));
    const h=d.points.slice(0,k+1);
    return {steps:d.points.length-1,current:k,frames:[scalarFrame(traces,{xaxis:{title:{text:'z'},range:[-3.5,3.5]},yaxis:{title:{text:'Residuo e tangente'},range:[-8,12]}}),scalarFrame([curve(h.map((_,i)=>i),h.map(v=>Math.abs(d.r(v))),'|r(zₖ)|')],{height:280,xaxis:{title:{text:'Iterazione k'}},yaxis:{title:{text:'Residuo assoluto'},rangemode:'tozero'}})],
      metrics:[M('zₖ',z),M('|r(zₖ)|',Math.abs(d.r(z))),M('r′(zₖ)',slope),M('Zero tangente',next===undefined?'non definito':num(next))],message:k===d.points.length-1?d.status:'La tangente approssima r localmente; il suo zero è il prossimo candidato.',warning:d.status.includes('nulla')||d.status.includes('Ciclo'),detail:'<p>Newton per zeri non impone discesa del residuo. La convergenza quadratica è locale vicino a una radice semplice, con regolarità sufficiente e partenza vicina. Il parametro a agisce solo su z²−a.</p>'};
  }});

export const modelDemo=define({id:'newton-model',title:'Il passo minimizza un modello locale',formula:String.raw`m_z(w)=f(z)+g^T(w-z)+\tfrac12(w-z)^T(H+\lambda I)(w-z)`,defaults:modelDefaults,views:true,plots:1,
  controls:[C('x','Punto base x',-2,2),C('y','Punto base y',-2,2),C('condition','Condizionamento κ',1,20,1),C('regularization','Regolarizzazione λ',0,10,.25)],selects:[{key:'kind',label:'Funzione di costo',options:kinds}],
  presets:[{label:'QP: modello esatto',params:{kind:'quadratic',regularization:0}},{label:'Modello indefinito',params:{kind:'double-well',regularization:0}},{label:'Modello regolarizzato',params:{kind:'double-well',regularization:5}}],compute:computeModel,
  present(p,view){const d=computeModel(p),frame=surfaceFrame(grid((x,y)=>d.f.value([x,y]),3,41),view,d.z,d.f.value(d.z));
    const modelGrid=grid((x,y)=>d.model([x,y]),3,41);
    frame.data.push(view==='3d'?{type:'surface',x:modelGrid.x,y:modelGrid.y,z:modelGrid.z,colorscale:[[0,'#d89959'],[1,'#d89959']],opacity:.45,showscale:false,name:'Modello m'}:{type:'contour',x:modelGrid.x,y:modelGrid.y,z:modelGrid.z,contours:{coloring:'none'},line:{color:'#bd7b3e',width:1.5},showscale:false,ncontours:10,name:'Modello m'});
    if(d.next&&view==='2d')frame.data.push(marker(d.next,'Minimo del modello','#bd7b3e'));
    if(d.next&&view==='3d')frame.data.push({type:'scatter3d',x:[d.next[0]],y:[d.next[1]],z:[d.model(d.next)],mode:'markers',marker:{color:'#bd7b3e',size:6},name:'Minimo del modello'});
    return {frames:[frame],metrics:[M('Autovalori B',d.spectrum.map(num).join(' / ')),M('Δz',d.d?V(d.d):'minimo unico non definito'),M('z + Δz',d.next?V(d.next):'non calcolato'),M('‖g+BΔz‖',d.modelResidual??'non applicabile')],
      message:d.d?'Il modello arancione ha curvatura positiva. Il passo Δz si somma al punto base; il costo reale richiede comunque una scelta del passo.':'La Hessiana del modello non è positiva definita: non si presenta la soluzione del sistema come un minimo unico.',warning:!d.d,
      detail:'<p>Con λ=0 si ottiene il modello di Newton. Con B=D⁻¹ positivo si ottiene il modello del gradiente scalato. Il verde mostra f, l’arancione m; nel QP con λ=0 coincidono. La regolarizzazione modifica il modello, non la funzione originale. Correzione delle slide pp. 36–37: Δz=−D∇f e aggiornamento z+Δz.</p>'};
  }});

interface ArmijoParams {x:number;y:number;condition:number;step:number;beta:number;c:number;ascent:number;}
const armijoDefaults:ArmijoParams={x:1,y:1,condition:6,step:1,beta:.7,c:.5,ascent:-1};
function computeArmijo(p:Readonly<ArmijoParams>) {const f=objective('quadratic',p.condition),z:Vec2=[p.x,p.y],g=f.gradient(z),d:Vec2=[p.ascent*g[0],p.ascent*g[1]];return {...backtrack(f,z,d,p.step,p.beta,p.c),f,z,d};}
export const armijoDemo=define({id:'armijo',title:'Backtracking, un tentativo alla volta',formula:String.raw`f(z+\gamma d)\leq f(z)+c\gamma\nabla f(z)^Td,\quad\gamma_i=\beta^i\gamma_0`,defaults:armijoDefaults,stepping:true,plots:1,
  controls:[C('x','Punto x',-2,2),C('y','Punto y',-2,2),C('condition','Condizionamento κ',1,20,1),C('step','Passo iniziale γ₀',.05,2,.05),C('beta','Riduzione β',.1,.9,.05),C('c','Sufficiente discesa c',.05,.9,.05),C('ascent','Segno direzione (±1)',-1,1,1)],
  presets:[{label:'Riduci finché accetti',params:{}},{label:'Direzione di salita',params:{ascent:1}},{label:'Punto stazionario',params:{x:0,y:0}}],compute:computeArmijo,
  present(p,_view,cursor){const d=computeArmijo(p),k=Math.min(cursor,Math.max(0,d.trials.length-1)),trials=d.trials.slice(0,k+1),x=linspace(0,p.step,141),base=d.f.value(d.z),t=trials.at(-1);
    const frame=scalarFrame([curve(x,x.map(step=>d.f.value(add(d.z,d.d,step))),'Costo lungo d'),curve(x,x.map(step=>base+p.c*step*d.slope),'Limite Armijo','#b77130'),curve(x,x.map(step=>base+step*d.slope),'Tangente','#587d9a','dash'),
      {type:'scatter',x:trials.map(t=>t.step),y:trials.map(t=>t.value),mode:'markers',name:'Tentativi',marker:{size:10,color:trials.map(t=>t.accepted?'#356b45':'#b24f3c')}}],{xaxis:{title:{text:'Passo γ'}},yaxis:{title:{text:'Costo e limiti'}}});
    return {frames:[frame],steps:Math.max(0,d.trials.length-1),current:k,metrics:[M('∇fᵀd',d.slope),M('Tentativo γ',t?.step??'non eseguito'),M('Accettato?',t?(t.accepted?'Sì':'No'):'No'),M('γ accettato',t?.accepted?t.step:'in ricerca')],
      message:t?(t.accepted?'Passo accettato: il costo soddisfa Armijo.':'Tentativo rifiutato: premi Passo +1 per moltiplicare γ per β.'):d.status,warning:!t||!t.accepted,
      detail:`<table><caption>Tentativi mostrati</caption><thead><tr><th>i</th><th>γᵢ</th><th>f nuovo</th><th>Limite</th><th>Esito</th></tr></thead><tbody>${trials.map((t,i)=>`<tr><td>${i}</td><td>${num(t.step)}</td><td>${num(t.value)}</td><td>${num(t.bound)}</td><td>${t.accepted?'accettato':'rifiutato'}</td></tr>`).join('')}</tbody></table><p>Il segno −1 usa −∇f, +1 usa ∇f. Una direzione nulla o di salita viene fermata prima del backtracking. Si usa la convenzione standard ≤ per la diminuzione sufficiente.</p>`};
  }});

function projectionConfig(id:string,title:string,defaults=projectionDefaults) {
  return {id,title,defaults,formula:String.raw`P_\mathcal Z(v)=\arg\min_{w\in\mathcal Z}\tfrac12\|w-v\|^2`,plots:1,
    controls:[C('size','Dimensione b',.5,2.5),C('x','Punto esterno x',-4,4),C('y','Punto esterno y',-4,4),C('targetX','Centro del costo a₁',-4,4),C('targetY','Centro del costo a₂',-4,4),C('theta','Punto di prova θ',0,1,.05)],selects:[{key:'set',label:'Insieme ammissibile',options:setOptions}],
    presets:[{label:'Proietta sul disco',params:{}},{label:'Ottimo sul bordo',params:{x:3,y:0,targetX:3,targetY:0}},{label:'Punto non ottimo',params:{x:0,y:1,targetX:3,targetY:0}},{label:'Proietta sul quadrato',params:{set:'box' as const}}],compute:computeProjection,
    present(p:typeof defaults){const d=computeProjection(p),b=boundary(p.set,p.size),extent=4.5;
      const frame=scalarFrame([curve(b.map(z=>z[0]),b.map(z=>z[1]),'Bordo Z'),curve([d.raw[0],d.z[0]],[d.raw[1],d.z[1]],'Distanza minima','#b77130','dash'),marker(d.raw,'v da proiettare','#587d9a'),marker(d.z,'z = P(v)'),marker(d.candidate,'Ottimo del costo','#356b45','diamond'),marker(d.support,'Peggiore direzione per VI','#a74f3e'),marker(d.trial,'Punto di prova','#888')],{xaxis:{title:{text:'z₁'},range:[-extent,extent],constrain:'domain'},yaxis:{title:{text:'z₂'},range:[-extent,extent],scaleanchor:'x',scaleratio:1}});
      return {frames:[frame],metrics:[M('P(v)',V(d.z)),M('‖v−P(v)‖',d.distance),M('Gradiente del costo in P(v)',V(d.g)),M('minᵥ∈Z ∇fᵀ(v−z)',d.minSlope),M('Residuo punto fisso',d.mapping),M('(v−P(v))ᵀ(w−P(v))',d.projectionInequality)],
        message:d.minSlope>=-1e-9?'La disuguaglianza variazionale vale per tutto Z: il punto proiettato è ottimo per questo costo convesso.':'La proiezione è corretta, ma il punto proiettato non minimizza questo costo: esiste una direzione ammissibile di discesa.',warning:d.minSlope< -1e-9,
        detail:'<p>Due problemi distinti nello stesso piano: v è il punto da proiettare; f(z)=‖z−a‖²/2 è il costo con centro a. Il diamante è P(a), suo minimo esatto su Z. La condizione della proiezione (v−P(v))ᵀ(w−P(v))≤0 è verificata sul punto di prova selezionato da θ. Il minimo della disuguaglianza variazionale è calcolato analiticamente su tutto il disco o quadrato.</p>'};
    }};
}
export const projectionDemo=define(projectionConfig('projection','Il punto ammissibile più vicino'));
export const feasibleDemo=define(projectionConfig('feasible-directions','Al bordo il gradiente può essere diverso da zero',{...projectionDefaults,x:3,y:0}));

export const projectedDemo=define({id:'projected-gradient',title:'Passo libero, proiezione e direzione ammissibile',formula:String.raw`z^+=P_\mathcal Z(z-\gamma\nabla f(z)),\quad\widetilde z=P_\mathcal Z(z-\nabla f(z))`,defaults:projectedDefaults,plots:2,stepping:true,
  controls:[C('size','Dimensione b',.5,2.5),C('x','Partenza x',-3,3),C('y','Partenza y',-3,3),C('targetX','Centro del costo a₁',-4,4),C('targetY','Centro del costo a₂',-4,4),C('condition','Curvatura Q₂₂',1,15,1),C('step','Passo γ',.01,2,.01),C('iterations','Budget iterazioni',1,100,1)],
  selects:[{key:'set',label:'Insieme ammissibile',options:setOptions},{key:'method',label:'Metodo vincolato',options:[['projected','Gradiente proiettato'],['feasible','Combinazione ammissibile']]}],
  presets:[{label:'Ottimo al bordo',params:{}},{label:'Direzione ammissibile',params:{method:'feasible',step:.2}},{label:'Passo troppo grande',params:{step:1.5,condition:8}},{label:'Disco',params:{set:'disk'}}],compute:computeProjected,
  present(p,_view,cursor){const d=computeProjected(p),k=Math.min(cursor,d.points.length-1),points=d.points.slice(0,k+1),last=points.at(-1)!,raw=add(last.z,d.objective.gradient(last.z),-(p.method==='projected'?p.step:1)),projected=project(raw,p.set,p.size),frame=pathFrame(d.objective,points.map(q=>q.z),'2d',Math.max(3,p.size+.5),boundary(p.set,p.size));
    frame.data.push(curve([last.z[0],raw[0],projected[0]],[last.z[1],raw[1],projected[1]],'Proposta libera → proiettata','#587d9a','dash'),marker(projected,'Proposta ammissibile','#587d9a'));
    return {frames:[frame,history(points,'Residuo punto fisso')],steps:d.points.length-1,current:k,metrics:[M('zₖ',V(last.z)),M('f(zₖ)',last.value),M('‖∇f(zₖ)‖',norm(d.objective.gradient(last.z))),M('‖z−P(z−∇f)‖',last.gradientNorm),M('Proposta libera',V(raw)),M('Proposta proiettata',V(projected))],
      message:(k===d.points.length-1?d.status:'Ogni iterato resta ammissibile. Il residuo di punto fisso misura la stazionarietà vincolata.')+(d.initialWasProjected?' La partenza inserita è stata proiettata su Z.':''),
      detail:`<p>${p.method==='feasible'?'Si calcola z̃=P(z−∇f) e si aggiorna z+γ(z̃−z); 0&lt;γ≤1 mantiene l’ammissibilità per convessità.':'La proiezione mantiene l’ammissibilità per ogni γ&gt;0; la discesa richiede un passo adeguato (per questo QP è sufficiente γ&lt;2/Q₂₂).'} Gradiente non nullo al bordo non implica fallimento. Il tratto della proposta può uscire dalla finestra del grafico; le sue coordinate sono sempre riportate qui sopra.</p>`};
  }});

export const galleryDemo=define({id:'function-gallery',title:'Le quattro geometrie delle slide',formula:String.raw`z^2,\quad z^4+2z^3-12z^2-2z+6,\quad\sum_i e^{a_i^Tz-0.1},\quad\tfrac12z^TQz`,defaults:galleryDefaults,plots:1,views:true,
  controls:[C('coefficient','Fattore del costo',.1,3),C('condition','Condizionamento Q',1,20,1),C('domain','Semilarghezza del dominio',1,4),C('x','Punto x',-3,3),C('y','Punto y',-2,2)],
  selects:[{key:'kind',label:'Funzione della galleria',options:[['square','z²'],['quartic','Quartica non convessa'],['exponential','Tre esponenziali'],['quadratic','QP positivo ruotato']]}],compute:computeGallery,
  presets:[{label:'Parabola al minimo',params:{kind:'square',x:0,y:0}},{label:'Quartica a z=2',params:{kind:'quartic',x:2}},{label:'Minimo esponenziale',params:{kind:'exponential',x:-Math.log(2)/2,y:0}},{label:'QP allungato',params:{kind:'quadratic',condition:20}}],
  present(p,view){const d=computeGallery(p);let frame:PlotFrame;
    if(d.scalar)frame=view==='2d'?scalarFrame([curve(d.x,d.y,'Costo'),marker([p.x,d.value],'Punto')]):{data:[{type:'scatter3d',x:d.x,y:d.x.map(()=>0),z:d.y,mode:'lines',line:{color:'#356b45',width:5},name:'Costo scalare'}],layout:layout({scene:{xaxis:{title:{text:'z'}},yaxis:{title:{text:'Coordinata ausiliaria = 0'}},zaxis:{title:{text:'f(z)'}}}})};
    else frame=surfaceFrame(d.surface,view,[p.x,p.y],d.value);
    return {frames:[frame],metrics:[M('Costo nel punto',d.value),M('Dimensione del problema',d.scalar?'1':'2'),M('f′(x)',d.derivative??'vedi gradiente 2D'),M('f″(x)',d.curvature??'vedi Hessiana 2D')],message:d.scalar?'Funzione scalare: la vista 3D dispone la stessa curva nel piano y=0, senza aggiungere variabili al problema.':'Funzione in due variabili: confronta livelli 2D e superficie 3D.',detail:'<p>Il fattore positivo moltiplica tutta la funzione. κ agisce solo sul QP, y solo sulle funzioni bivariate. Con fattore 1 si recuperano i costi originali; il termine lineare del QP è impostato a zero in questa galleria, ed è modificabile nel laboratorio O1.</p>'};
  }});

export const barrierDemo=define({id:'barrier',title:'Un cammino interno verso il bordo',formula:String.raw`\Phi_\varepsilon(z)=\tfrac12\|z-a\|^2-\varepsilon\sum_{j=1}^4\log(-g_j(z)),\quad g_j=\pm z_i-b`,defaults:barrierDefaults,views:true,stepping:true,plots:2,
  controls:[C('epsilon','Barriera iniziale ε',.01,3,.01),C('shrink','Riduzione di ε',.1,.8,.1),C('stages','Numero di stadi',1,6,1),C('size','Semilato b',.5,2.5),C('targetX','Centro del costo a₁',-4,4),C('targetY','Centro del costo a₂',-4,4),C('x','Partenza interna x',-2,2),C('y','Partenza interna y',-2,2)],
  presets:[{label:'Avvicina il bordo',params:{}},{label:'ε piccolo',params:{epsilon:.01}},{label:'Partenza non interna',params:{x:2,y:0}},{label:'Minimo interno',params:{targetX:.2,targetY:.3}}],compute:computeBarrier,
  present(p,view,cursor){const d=computeBarrier(p),k=Math.min(cursor,Math.max(0,d.points.length-1)),points=d.points.slice(0,k+1),last=points.at(-1),epsilon=last?.epsilon??p.epsilon,f=barrierObjective(p,epsilon),extent=p.size*.998;
    const frame=pathFrame(f,points.map(q=>q.z),view,extent);
    if(view==='2d') {
      frame.layout.xaxis={...frame.layout.xaxis,range:[-p.size,p.size]};frame.layout.yaxis={...frame.layout.yaxis,range:[-p.size,p.size]};
      frame.data.push({type:'scatter',x:d.centers.map(z=>z[0]),y:d.centers.map(z=>z[1]),mode:'lines+markers',name:'Minimi di barriera (riferimento)',line:{color:'#587d9a',dash:'dot'},marker:{symbol:'diamond',size:8}});
    }
    const cost=(z:Vec2)=>((z[0]-p.targetX)**2+(z[1]-p.targetY)**2)/2;
    const h:Iterate[]=points.map(q=>({z:q.z,value:cost(q.z),gradientNorm:q.gradientNorm,step:q.step,slope:0,backtracks:0}));
    return {frames:[frame,history(h,'‖∇Φε‖₂')],steps:Math.max(0,d.points.length-1),current:k,
      metrics:[M('ε corrente',epsilon),M('Stadio',last?last.stage+1:'non avviato'),M('zₖ',last?V(last.z):'non ammissibile'),M('Costo originale',last?cost(last.z):'non definito'),M('Slack minimo',last?p.size-Math.max(...last.z.map(Math.abs)):'≤ 0'),M('‖∇Φε‖₂',last?.gradientNorm??'non definito')],
      message:!d.valid?d.status:k===d.points.length-1?d.status:'Newton smorzato e Armijo mantengono l’interno; ε diminuisce solo dopo aver risolto lo stadio corrente.',warning:!d.valid||d.status.includes('fallita')||d.status.includes('Budget'),
      detail:`<p>Quattro disuguaglianze affini definiscono il quadrato aperto. La barriera vale +∞ fuori: questi passi vengono rifiutati. Il grafico di superficie usa ε corrente per tutti i punti; il residuo in basso usa l’ε dello stadio in cui ogni punto è stato calcolato, quindi può saltare al cambio di stadio. I diamanti sono minimi di riferimento calcolati indipendentemente con bisezione. Al minimo esatto di Φε, il gap sul costo vincolato è ≤ 4ε; un iterato intermedio richiede anche un residuo piccolo.</p>`};
  }});
