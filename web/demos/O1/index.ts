import './styles.css';
import type { DemoDefinition } from '../../content/schema';
import { html, required, formatNumber as number } from '../../ui/dom';
import { formula } from '../../ui/formula';
import { numberControl, type NumberControlSpec } from '../../ui/controls';
import { createPlot, type PlotFrame } from '../../ui/plot';
import { computeLandscape,landscapeDefaults,computeDerivatives,derivativeDefaults,computeStationary,stationaryDefaults,
  computeSet,setDefaults,computeConstraints,constraintDefaults,computeFunction,functionDefaults,
  computeBounds,boundsDefaults,computeQP,qpDefaults } from '../../math/O1/foundations';
import { circle,curve,marker,regionFrame,scalarFrame,surfaceFrame } from './plots';

type Parameters=Record<string,number|string>;
type Metric={label:string;value:string};
type Select={key:string;label:string;options:[string,string][]};
interface Computed { frame:PlotFrame;metrics:Metric[];message:string;detail?:string;warning?:boolean; }
interface Configuration<P> {
  id:string;title:string;formula:string;defaults:P;controls:NumberControlSpec[];selects?:Select[];views?:boolean;
  presets?:{label:string;params:Partial<P>}[];
  compute(params:Readonly<P>):unknown;
  present(params:Readonly<P>,view:'2d'|'3d'):Computed;
}
const control=(key:string,label:string,min:number,max:number,step=0.1):NumberControlSpec=>({key,label,min,max,step});
export const matrixLatex=(A:readonly (readonly number[])[])=>String.raw`\begin{bmatrix}${A.map(row=>row.map(v=>v.toFixed(2)).join('&')).join(String.raw`\\`)}\end{bmatrix}`;
const matrix=matrixLatex;
const metric=(label:string,value:number|string):Metric=>({label,value:typeof value==='number'?
  (Math.abs(value)<1e-10?number(0):Math.abs(value)<0.005?value.toExponential(2).replace('.',','):number(value)):value});

function define<P extends object>(config:Configuration<P>):DemoDefinition<P,unknown> {
  return {id:config.id,defaults:config.defaults,compute:config.compute,
    async mount(container) {
      let params={...config.defaults};let view:'2d'|'3d'='2d',disposed=false;
      container.innerHTML=`<div class="o1-lab-header"><div><span class="mini-label">ESPERIMENTO INTERATTIVO</span><h4>${html(config.title)}</h4></div>${config.views?'<div class="view-switch" role="group" aria-label="Vista del grafico"><button type="button" data-o1-view="2d" aria-pressed="true">2D</button><button type="button" data-o1-view="3d" aria-pressed="false">3D</button></div>':''}</div>
        <div class="o1-formula">${formula(config.formula)}</div>
        <div class="o1-presets">${(config.presets??[]).map((preset,i)=>`<button type="button" data-o1-preset="${i}">${html(preset.label)}</button>`).join('')}<button type="button" data-o1-reset>↺ Ripristina</button></div>
        <div class="o1-lab-body"><div class="o1-plot" role="img" aria-label="${html(config.title)}. I dati sono riportati anche nelle misure del laboratorio."></div><div class="o1-controls"></div></div>
        <div class="o1-metrics" aria-live="polite" aria-atomic="true"></div><p class="o1-message" role="status"></p><div class="o1-detail"></div><p class="o1-error" role="alert" hidden></p>`;
      const plot=await createPlot(required(container,'.o1-plot'));
      const controls=new Map<string,ReturnType<typeof numberControl>>();
      function update() {
        if(disposed)return;
        try {
          const result=config.present(params,view);
          required(container,'.o1-metrics').innerHTML=result.metrics.map(m=>`<div><span>${html(m.label)}</span><strong>${html(m.value)}</strong></div>`).join('');
          const message=required(container,'.o1-message');message.textContent=result.message;message.classList.toggle('is-warning',!!result.warning);
          required(container,'.o1-detail').innerHTML=result.detail??'';
          required(container,'.o1-error').hidden=true;
          void plot.render(result.frame).then(()=>{if(!disposed)container.dataset.ready='true';}).catch(error=>{container.dataset.ready='error';const node=required(container,'.o1-error');node.hidden=false;node.textContent=`Grafico non disponibile: ${error.message}. Prova la vista 2D.`;});
        } catch(error) {container.dataset.ready='error';const node=required(container,'.o1-error');node.hidden=false;node.textContent=error instanceof Error?error.message:'Parametri non validi.';}
      }
      for(const select of config.selects??[]) {
        const label=document.createElement('label');label.className='o1-select';label.textContent=select.label;
        const input=document.createElement('select');input.setAttribute('aria-label',select.label);
        input.innerHTML=select.options.map(([key,text])=>`<option value="${html(key)}">${html(text)}</option>`).join('');
        input.value=String((params as Parameters)[select.key]);
        input.onchange=()=>{params={...params,[select.key]:input.value};update();};
        input.dataset.parameter=select.key;label.append(input);required(container,'.o1-controls').append(label);
      }
      for(const spec of config.controls) {
        const input=numberControl(spec,Number((params as Parameters)[spec.key]),value=>{params={...params,[spec.key]:value};update();});
        controls.set(spec.key,input);required(container,'.o1-controls').append(input.element);
      }
      function sync() {
        controls.forEach((input,key)=>input.setValue(Number((params as Parameters)[key])));
        container.querySelectorAll<HTMLSelectElement>('select[data-parameter]').forEach(input=>input.value=String((params as Parameters)[input.dataset.parameter!]));
      }
      const click=(event:Event)=>{
        const button=(event.target as Element).closest<HTMLButtonElement>('button');if(!button)return;
        if(button.dataset.o1Preset!==undefined){params={...config.defaults,...config.presets![Number(button.dataset.o1Preset)].params};sync();}
        if(button.hasAttribute('data-o1-reset')){params={...config.defaults};sync();}
        if(button.dataset.o1View){view=button.dataset.o1View as '2d'|'3d';container.querySelectorAll<HTMLElement>('[data-o1-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.o1View===view)));}
        update();
      };
      container.addEventListener('click',click);update();
      return {destroy(){disposed=true;container.removeEventListener('click',click);controls.forEach(c=>c.destroy());container.querySelectorAll<HTMLSelectElement>('select').forEach(s=>s.onchange=null);plot.destroy();}};
    }};
}

export const landscapeDemo=define({id:'local-global-minima',title:'Minimi locali e globali',formula:String.raw`f(z)=(z^2-1)^2+\alpha z`,defaults:landscapeDefaults,
  controls:[control('tilt','Inclinazione α',-2,2),control('point','Punto da valutare',-2,2),control('epsilon','Raggio ε',0.1,1,0.05)],
  presets:[{label:'Due minimi globali',params:{tilt:0,point:1}},{label:'Locale ≠ globale',params:{tilt:0.5,point:1}},{label:'Una sola valle',params:{tilt:2,point:-1.2}}],compute:computeLandscape,
  present(p){const d=computeLandscape(p);return {frame:scalarFrame([curve(d.x,d.y,'f(z)'),...d.stationary.map(s=>marker([s.x,s.value],s.kind,s.kind.includes('massimo')?'#a95c46':'#356b45')),marker(d.point,'Punto selezionato')],
    {shapes:[{type:'rect',xref:'x',yref:'paper',x0:p.point-p.epsilon,x1:p.point+p.epsilon,y0:0,y1:1,fillcolor:'#e8b77922',line:{width:0},layer:'below'}]}),
    metrics:[metric('f(z) selezionato',d.point[1]),metric('Valore minimo',d.minimum),metric('argmin f',d.minimizers.map(v=>number(v)).join(' e ')),metric('Derivata f′(z)',d.derivative)],
    message:`${d.classification}. ${d.nonunique?'I due minimi sono stretti localmente, ma non stretti globalmente.':'Il minimo globale è ricavato confrontando tutti i punti stazionari della quartica coerciva.'}`,
    detail:`<p>La fascia evidenzia l’intorno di raggio ε, non una certificazione numerica di minimo. Punti stazionari: ${d.stationary.map(s=>`${number(s.x)} (${html(s.kind)})`).join('; ')}.</p>`};}});

export const derivativeDemo=define({id:'derivatives',title:'Gradiente, Hessiana e piano tangente',formula:String.raw`f(x,y)=\tfrac12x^2+y^2+cxy+\tfrac q4(x^4+y^4)`,defaults:derivativeDefaults,views:true,
  controls:[control('x','Punto x',-1.5,1.5),control('y','Punto y',-1.5,1.5),control('cross','Termine misto c',-2,2),control('quartic','Termine quartico q',0,1),control('direction','Direzione d (gradi)',-180,180,5),control('step','Perturbazione h',0.05,0.8,0.05)],
  compute:computeDerivatives,present(p,view){const d=computeDerivatives(p);const frame=surfaceFrame(d,view,d.point,d.value,{gradient:d.gradient},[curve([d.point[0],d.target[0]],[d.point[1],d.target[1]],'Perturbazione hd','#648dad','dash'),marker(d.target,'z + hd','#648dad')]);
    if(view==='3d')frame.data.push({type:'scatter3d',x:[d.point[0],d.target[0]],y:[d.point[1],d.target[1]],z:[d.value,d.targetValue],mode:'lines+markers',name:'Perturbazione hd',line:{color:'#648dad',width:4},marker:{color:'#648dad',size:4}});
    return {frame,
    metrics:[metric('f nel punto',d.value),metric('‖∇f‖₂',Math.hypot(...d.gradient)),metric('Derivata lungo d',d.directional),metric('Errore modello lineare',d.firstError),metric('Errore modello quadratico',d.secondError),metric('Autovalori Hessiana',d.eigenvalues.map(v=>number(v)).join(' / '))],
    message:view==='2d'?'La freccia è la direzione del gradiente, a lunghezza normalizzata. La derivata direzionale è ∇fᵀd.':'La superficie arancione è il piano tangente locale. Trascina il grafico per ruotarlo.',
    detail:`<div class="o1-matrix-row"><span>${formula(String.raw`\nabla f=${matrix(d.gradient.map(v=>[v]))}`)}</span><span>${formula(String.raw`\nabla^2f=${matrix(d.hessian)}`)}</span></div><p>Per r(x,y)=(x²+y,xy), il Jacobiano è ${formula(String.raw`J_r=${matrix(d.jacobian)}`)}. La convenzione delle slide usa ∇r=Jᵀ, non J.</p>`};}});

export const stationaryDemo=define({id:'stationary-classification',title:'Che tipo di punto stazionario è l’origine?',formula:String.raw`f(x,y)=\tfrac12(ax^2+by^2)+\tfrac14(c_xx^4+c_yy^4)`,defaults:stationaryDefaults,views:true,
  controls:[control('a','Curvatura a',-3,3,0.25),control('b','Curvatura b',-3,3,0.25),control('quarticX','Quartico cₓ',-1,1,0.25),control('quarticY','Quartico cᵧ',-1,1,0.25)],
  presets:[{label:'Minimo',params:{a:1,b:2}},{label:'Massimo',params:{a:-1,b:-2}},{label:'Sella',params:{a:1,b:-1}},{label:'Hessiana nulla: minimo',params:{a:0,b:0,quarticX:1,quarticY:1}},{label:'Hessiana nulla: sella',params:{a:0,b:0,quarticX:1,quarticY:-1}}],
  compute:computeStationary,present(p,view){const d=computeStationary(p);return {frame:surfaceFrame(d,view,d.point,0),
    metrics:[metric('Gradiente all’origine','(0, 0)'),metric('Autovalori Hessiana',d.eigenvalues.map(v=>number(v)).join(' / '))],
    message:`${d.classification}. Hessiana: ${d.hessianClass.toLowerCase()}.`,detail:'<p>La classificazione completa considera i primi termini non nulli sui due assi. La sola Hessiana semidefinita o nulla non decide: confronta i due casi degeneri.</p>'};}});

export const setDemo=define({id:'convex-set',title:'Il segmento resta nell’insieme?',formula:String.raw`z_\theta=\theta A+(1-\theta)B`,defaults:setDefaults,
  controls:[control('radius','Raggio esterno',0.5,1.8),control('angleA','Angolo A (gradi)',-180,180,5),control('angleB','Angolo B (gradi)',-180,180,5),control('theta','Coefficiente θ',0,1,0.05)],
  selects:[{key:'kind',label:'Forma dell’insieme',options:[['disk','Disco pieno'],['annulus','Corona circolare'],['circle','Solo circonferenza']]}],
  presets:[{label:'Disco convesso',params:{kind:'disk'}},{label:'Corona non convessa',params:{kind:'annulus'}},{label:'Bordo non convesso',params:{kind:'circle'}}],
  compute:computeSet,present(p){const d=computeSet(p);return {frame:regionFrame(d,d.A,d.B,d.point,d.inside,[circle(d.radius),...(d.innerRadius>0?[circle(d.innerRadius)]:[])]),
    metrics:[metric('θ',p.theta),metric('zθ ∈ insieme?',d.inside?'Sì':'No'),metric('Insieme convesso?',d.convex?'Sì':'No')],
    message:`${d.inside?'La combinazione selezionata è ammissibile.':'Il segmento fornisce un controesempio alla convessità.'} Un solo segmento contenuto non prova la convessità dell’intero insieme.`,warning:!d.inside};}});

export const constraintDemo=define({id:'constraint-convexity',title:'Quale vincolo produce un insieme convesso?',formula:String.raw`g(x,y)=(x^2+y^2-1)^2-1,\quad g(x,y)\leq\alpha`,defaults:constraintDefaults,
  controls:[control('level','Livello α / offset c',-1,1),control('theta','Coefficiente θ',0,1,0.05)],
  selects:[{key:'kind',label:'Tipo di vincolo',options:[['sublevel','Disuguaglianza: g ≤ α'],['affine','Uguaglianza affine: x − c = 0'],['nonlinear-equality','Uguaglianza non affine: (x − c)² = 0']]}],
  presets:[{label:'Livello 0: convesso',params:{kind:'sublevel',level:0}},{label:'Livello −0,5: non convesso',params:{kind:'sublevel',level:-0.5}},{label:'h non affine, insieme convesso',params:{kind:'nonlinear-equality',level:0.5}}],
  compute:computeConstraints,present(p){const d=computeConstraints(p);return {frame:regionFrame(d,d.A,d.B,d.point,d.inside,d.kind==='sublevel'?[circle(d.outer),...(d.inner>0?[circle(d.inner)]:[])]:[[[p.level,-2.3],[p.level,2.3]]]),
    metrics:[metric('Insieme convesso?',d.convex?'Sì':'No'),metric('zθ ammissibile?',d.inside?'Sì':'No'),metric('Residuo del vincolo',d.residual)],
    message:d.description,warning:!d.inside,detail:`<p>Vincolo attivo: ${formula(p.kind==='sublevel'?String.raw`g(x,y)\leq${p.level.toFixed(2)}`:p.kind==='affine'?String.raw`x-${p.level.toFixed(2)}=0`:String.raw`(x-${p.level.toFixed(2)})^2=0`)}. La retta è disegnata esattamente; lo sfondo campionato è soltanto un ausilio visivo.</p>`};}});

export const functionDemo=define({id:'convex-function',title:'La funzione sta sotto la corda?',formula:String.raw`f(\theta A+(1-\theta)B)\leq\theta f(A)+(1-\theta)f(B)`,defaults:functionDefaults,
  controls:[control('a','Coefficiente a',-2,3),control('b','Coefficiente b',0,1),control('A','Estremo A',-2,2),control('B','Estremo B',-2,2),control('theta','Coefficiente θ',0,1,0.05)],
  selects:[{key:'kind',label:'Funzione da esplorare',options:[['polynomial','f(z) = a z²/2 + b z⁴/4'],['exponential','f(z) = exp(z)'],['affine','f(z) = a z + b']]}],
  presets:[{label:'Convessa forte',params:{a:1,b:0.2}},{label:'Stretta, non forte',params:{a:0,b:1}},{label:'Non convessa',params:{a:-1,b:1}},{label:'Convessa senza minimo',params:{kind:'exponential'}}],
  compute:computeFunction,present(p){const d=computeFunction(p);return {frame:scalarFrame([curve(d.x,d.y,'f'),curve([d.A[0],d.B[0]],[d.A[1],d.B[1]],'Corda','#cf9757'),curve(d.x,d.tangent,'Tangente in A','#7994ac','dash'),marker(d.point,'f(zθ)'),marker([d.point[0],d.chord],'Corda in zθ','#be6b3f')]),
    metrics:[metric('Convessa su ℝ?',d.convex?'Sì':'No'),metric('Strettamente convessa?',d.strict?'Sì':'No'),metric('Corda − f(zθ)',d.gap),metric('f′(zθ)',d.gradient)],
    message:d.minimum+'. '+(p.kind==='exponential'?'I coefficienti a e b non intervengono nell’esponenziale.':p.kind==='affine'?'a è la pendenza e b è l’intercetta.':'Per il polinomio, a è la curvatura minima quando a≥0 e b≥0.'),
    warning:d.gap < -1e-9,detail:'<p>Un divario negativo smentisce la convessità. Agli estremi θ=0 o θ=1, oppure con A=B, il divario è zero anche per funzioni strettamente convesse.</p>'};}});

export const boundsDemo=define({id:'quadratic-bounds',title:'Tra tangente e due parabole',formula:String.raw`f(z)=\tfrac a2z^2+\tfrac b4z^4,\quad z\in[-2,2]`,defaults:boundsDefaults,
  controls:[control('a','Curvatura minima a',0,3),control('b','Termine quartico b',0,1),control('base','Punto base x',-1.8,1.8),control('target','Confronto y',-1.8,1.8),control('mu','μ dichiarata',0,5),control('L','L dichiarata',0.1,16)],
  presets:[{label:'Ipotesi valide',params:{}},{label:'μ troppo grande',params:{mu:3}},{label:'L troppo piccola',params:{L:0.5}},{label:'Modelli esatti',params:{a:2,b:0,mu:2,L:2}}],
  compute:computeBounds,present(p){const d=computeBounds(p);return {frame:scalarFrame([curve(d.x,d.y,'f'),curve(d.x,d.tangent,'Tangente','#8c9b87','dot'),curve(d.x,d.lower,'Limite inferiore μ','#c48c4b','dash'),curve(d.x,d.upper,'Limite superiore L','#6e91aa','dash'),marker(d.base,'Base x','#356b45'),marker(d.target,'Confronto y')]),
    metrics:[metric('μ effettiva',d.actualMu),metric('L su [−2,2]',d.actualL),metric('f(y) − limite inferiore',d.lowerGap),metric('Limite superiore − f(y)',d.upperGap),metric('Scarto monotonia forte',d.monotoneGap),metric('Scarto cocoercività',d.cocoerciveGap),metric('Scarto disuguaglianza combinata',d.combinedGap)],
    message:d.validMu&&d.validL?'Le costanti dichiarate soddisfano le ipotesi su [−2,2]. Gli scarti devono essere non negativi, a meno degli arrotondamenti.':'Ipotesi non soddisfatte su tutto l’intervallo: μ deve essere ≤a e L deve essere ≥a+12b. Una coincidenza nei due punti selezionati non garantisce il teorema.',
    warning:!d.validMu||!d.validL,detail:'<p>La μ più grande valida è a; la L più piccola valida su questo intervallo è a+12b. Per b>0 il gradiente non ha una costante Lipschitz finita sull’intera retta. Il limite superiore richiede regolarità del gradiente e vale anche per funzioni non convesse.</p>'};}});

export const qpDemo=define({id:'quadratic-program',title:'Quando un programma quadratico ha un minimo?',formula:String.raw`f(z)=\tfrac12z^\top Qz+q^\top z,\quad Q=R\operatorname{diag}(\lambda_1,\lambda_2)R^\top`,defaults:qpDefaults,views:true,
  controls:[control('lambda1','Autovalore λ₁',-2,3,0.25),control('lambda2','Autovalore λ₂',-2,3,0.25),control('angle','Rotazione (gradi)',-90,90,5),control('qx','Componente q₁',-2,2,0.25),control('qy','Componente q₂',-2,2,0.25)],
  presets:[{label:'Minimo unico',params:{}},{label:'Infiniti minimi',params:{lambda1:0,lambda2:2,angle:0,qx:0,qy:1}},{label:'Q ≥ 0, ma nessun minimo',params:{lambda1:0,lambda2:2,angle:0,qx:1,qy:0}},{label:'Curvatura negativa',params:{lambda1:-1,lambda2:2,angle:0,qx:0,qy:0}}],
  compute:computeQP,present(p,view){const d=computeQP(p);const extras=!d.bounded?[curve([0,2*d.descent[0]],[0,2*d.descent[1]],'Direzione senza limite','#be6547')]:!d.unique?[curve([d.minimizer[0]-2*d.nullDirection[0],d.minimizer[0]+2*d.nullDirection[0]],[d.minimizer[1]-2*d.nullDirection[1],d.minimizer[1]+2*d.nullDirection[1]],'Direzione del nucleo','#ce9252')]:[];
    return {frame:surfaceFrame(d,view,d.bounded?d.minimizer:undefined,d.minimum??0,undefined,extras),
      metrics:[metric('Esito',!d.bounded?'Nessun minimo':d.unique?'Minimo unico':'Infiniti minimi'),metric('Valore minimo',d.minimum??'−∞'),metric('Punto di minimo',d.bounded?d.minimizer.map(v=>number(v)).join('; '):'Non esiste'),metric('‖Qz* + q‖₂',d.stationaryResidual??'Non applicabile')],
      message:d.reason,warning:!d.bounded,detail:`<div class="o1-matrix-row">${formula(String.raw`Q=${matrix(d.Q)},\quad q=${matrix([[p.qx],[p.qy]])}`)}</div><p>La finestra si adatta al minimo quando esiste. Con Q singolare il punto mostrato è un rappresentante; il nucleo descrive gli altri minimi. Una direzione di discesa senza limite è disegnata nella vista 2D.</p>`};}});
