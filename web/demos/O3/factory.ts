import type { DemoDefinition } from '../../content/schema';
import type { Vec2 } from '../../math/quadratic';
import { html, required } from '../../ui/dom';
import { formula } from '../../ui/formula';
import { numberControl, type NumberControlSpec } from '../../ui/controls';
import { createPlot, type PlotFrame } from '../../ui/plot';

type Metric={label:string;value:string};
export interface Presentation {frames:PlotFrame[];metrics:Metric[];message:string;warning?:boolean;detail?:string;steps?:number;current?:number;}
export interface Config<P extends object> {
  id:string;title:string;formula:string;defaults:P;controls:NumberControlSpec[];
  selects?:{key:string;label:string;options:[string,string][]}[];
  presets?:{label:string;params:Partial<P>}[];views?:boolean;stepping?:boolean;plots:number;
  visibleControls?:Record<string,(p:Readonly<P>)=>boolean>;
  preserveIterationFor?:string[];
  controlGroups?:{title:string;keys:string[]}[];
  compute(p:Readonly<P>):unknown;present(p:Readonly<P>,view:'2d'|'3d',cursor:number):Presentation;
}
export const C=(key:string,label:string,min:number,max:number,step=.1):NumberControlSpec=>({key,label,min,max,step});
export const num=(v:number)=>!Number.isFinite(v)?'non finito':v===0?'0':Math.abs(v)<.001||Math.abs(v)>1e5?v.toExponential(2):v.toLocaleString('it-IT',{maximumFractionDigits:4});
export const M=(label:string,value:string|number):Metric=>({label,value:typeof value==='number'?num(value):value});
export const V=(v:Vec2)=>`(${num(v[0])}; ${num(v[1])})`;

export function define<P extends object>(config:Config<P>):DemoDefinition<P,unknown> {
  return {id:config.id,defaults:config.defaults,compute:config.compute,async mount(container) {
    let p={...config.defaults},view:'2d'|'3d'='2d',cursor=0,steps=0,disposed=false,revision=0;
    container.classList.add('o3-lab');
    container.innerHTML=`<div class="o3-header"><div><span class="mini-label">ESPERIMENTO INTERATTIVO</span><h4>${html(config.title)}</h4></div>${config.views?'<div class="view-switch" role="group" aria-label="Vista del grafico"><button type="button" data-o3-view="2d" aria-pressed="true">2D</button><button type="button" data-o3-view="3d" aria-pressed="false">3D</button></div>':''}</div>
      <div class="o3-formula">${formula(config.formula)}</div><div class="o3-presets">${(config.presets??[]).map((x,i)=>`<button type="button" data-o3-preset="${i}">${html(x.label)}</button>`).join('')}<button type="button" data-o3-reset>↺ Ripristina</button></div>
      ${config.stepping?'<div class="o3-steps" role="group" aria-label="Esecuzione per passi"><button type="button" data-o3-prev>← Indietro</button><button type="button" data-o3-next>Passo +1 →</button><button type="button" data-o3-all>Esegui tutto</button><output aria-live="polite"></output></div>':''}
      <div class="o3-body"><div class="o3-charts">${Array.from({length:config.plots},(_,i)=>`<div class="o3-plot ${i?'o3-history':''}" data-o3-plot="${i}" role="img" aria-label="${html(config.title)}: ${i?'andamento delle misure':'geometria'}. Valori disponibili nelle misure testuali."></div>`).join('')}</div><div class="o3-controls"></div></div>
      <div class="o3-metrics" aria-live="polite" aria-atomic="true"></div><p class="o3-message" role="status"></p><div class="o3-detail"></div><p class="o3-error" role="alert" hidden></p>`;
    const plots=await Promise.all([...container.querySelectorAll<HTMLElement>('[data-o3-plot]')].map(node=>createPlot(node)));
    const controls=new Map<string,ReturnType<typeof numberControl>>();
    function update() {
      if(disposed)return;const rev=++revision;container.dataset.ready='loading';
      try {
        const d=config.present(p,view,cursor);steps=d.steps??0;cursor=d.current??0;
        required(container,'.o3-charts').hidden=false;
        controls.forEach((input,key)=>input.element.hidden=config.visibleControls?.[key]?!config.visibleControls[key](p):false);
        required(container,'.o3-metrics').innerHTML=d.metrics.map(m=>`<div><span>${html(m.label)}</span><strong>${html(m.value)}</strong></div>`).join('');
        const message=required(container,'.o3-message');message.textContent=d.message;message.classList.toggle('is-warning',!!d.warning);
        required(container,'.o3-detail').innerHTML=d.detail??'';required(container,'.o3-error').hidden=true;
        if(config.stepping) {
          required(container,'output').textContent=`Passo ${cursor} / ${steps}`;
          required<HTMLButtonElement>(container,'[data-o3-prev]').disabled=cursor===0;
          required<HTMLButtonElement>(container,'[data-o3-next]').disabled=cursor>=steps;
          required<HTMLButtonElement>(container,'[data-o3-all]').disabled=cursor>=steps;
        }
        void Promise.all(d.frames.map((frame,i)=>plots[i].render(frame))).then(()=>{if(!disposed&&revision===rev)container.dataset.ready='true';}).catch(fail);
      }catch(error){
        steps=0;cursor=0;required(container,'.o3-charts').hidden=true;required(container,'.o3-metrics').innerHTML='';
        required(container,'.o3-message').textContent='Esperimento sospeso: correggi i parametri o ripristina il caso iniziale.';
        if(config.stepping){required(container,'output').textContent='Passo sospeso';container.querySelectorAll<HTMLButtonElement>('.o3-steps button').forEach(b=>b.disabled=true);}
        fail(error);
      }
    }
    function fail(error:unknown) {if(disposed)return;container.dataset.ready='error';const node=required(container,'.o3-error');node.hidden=false;node.textContent=error instanceof Error?error.message:'Grafico non disponibile.';}
    for(const spec of config.selects??[]) {
      const label=document.createElement('label');label.className='o3-select';label.textContent=spec.label;
      const input=document.createElement('select');input.setAttribute('aria-label',spec.label);input.dataset.key=spec.key;
      input.innerHTML=spec.options.map(([v,t])=>`<option value="${html(v)}">${html(t)}</option>`).join('');
      input.value=String((p as Record<string,unknown>)[spec.key]);input.onchange=()=>{p={...p,[spec.key]:input.value};cursor=0;update();};
      label.append(input);required(container,'.o3-controls').append(label);
    }
    const grouped=new Map<string,HTMLElement>();
    for(const group of config.controlGroups??[]){
      const details=document.createElement('details');details.className='o3-control-group';
      const summary=document.createElement('summary');summary.textContent=group.title;
      const body=document.createElement('div');body.className='o3-control-group-body';details.append(summary,body);
      required(container,'.o3-controls').append(details);group.keys.forEach(key=>grouped.set(key,body));
    }
    for(const spec of config.controls) {
      const input=numberControl(spec,Number((p as Record<string,unknown>)[spec.key]),v=>{p={...p,[spec.key]:v};if(!config.preserveIterationFor?.includes(spec.key))cursor=0;update();});
      controls.set(spec.key,input);
      const group=grouped.get(spec.key);if(group)group.append(input.element);else required(container,'.o3-controls').insertBefore(input.element,container.querySelector('.o3-control-group'));
    }
    function sync(){controls.forEach((input,key)=>input.setValue(Number((p as Record<string,unknown>)[key])));container.querySelectorAll<HTMLSelectElement>('select').forEach(s=>s.value=String((p as Record<string,unknown>)[s.dataset.key!]));}
    const click=(event:Event)=>{
      const b=(event.target as Element).closest<HTMLButtonElement>('button');if(!b)return;
      if(b.dataset.o3Preset!==undefined){p={...config.defaults,...config.presets![Number(b.dataset.o3Preset)].params};cursor=0;sync();}
      else if(b.hasAttribute('data-o3-reset')){p={...config.defaults};cursor=0;sync();}
      else if(b.hasAttribute('data-o3-next'))cursor++;
      else if(b.hasAttribute('data-o3-prev'))cursor=Math.max(0,cursor-1);
      else if(b.hasAttribute('data-o3-all'))cursor=steps;
      else if(b.dataset.o3View){view=b.dataset.o3View as '2d'|'3d';container.querySelectorAll<HTMLElement>('[data-o3-view]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.o3View===view)));}
      else return;
      update();
    };
    container.addEventListener('click',click);update();
    return {destroy(){disposed=true;revision++;container.removeEventListener('click',click);controls.forEach(c=>c.destroy());container.querySelectorAll<HTMLSelectElement>('select').forEach(s=>s.onchange=null);plots.forEach(plot=>plot.destroy());}};
  }};
}

