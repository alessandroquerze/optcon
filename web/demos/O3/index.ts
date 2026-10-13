import './styles.css';
import type { Vec2 } from '../../math/quadratic';
import type { PlotFrame } from '../../ui/plot';
import { formula } from '../../ui/formula';
import { grid,linspace } from '../../math/O1/foundations';
import { dot,axpy,matvec,nullBasis,lagrangianHessian,type SolverIterate } from '../../math/O3/solver';
import { computeActive,activeDefaults,computeKKT,kktDefaults,computeCurvature,curvatureDefaults,
  computeConstrainedQP,qpDefaults,computeNLP,nlpDefaults,computeMerit,meritDefaults,computeBarrierEquality,barrierEqDefaults,
  makeBarrierProblem,computeTime,timeDefaults,formStep,type NLPParams } from '../../math/O3/models';
import { curve,marker,scalarFrame,circle,layout } from '../O1/plots';
import { line,arrows,geometry,history,feasibleCurve,matrixLatex } from './plots';
import { define,C,M,V,num,type Config } from './factory';
const point=(z:number[]):Vec2=>[z[0],z[1]];
const green='#356b45',orange='#b77130',blue='#587d9a',red='#af503c';
const paths=(points:Vec2[],label:string,color=green,dash?:'dash'|'dot')=>({points,label,color,dash});

export const activeDemo=define({id:'active-constraints',title:'Quando i gradienti sono indipendenti?',formula:String.raw`\mathcal A(z)=\{j:g_j(z)=0\},\qquad\mathrm{LICQ}:\;\{\nabla h_i,\nabla g_j\ (j\in\mathcal A)\}\text{ indipendenti}`,defaults:activeDefaults,plots:1,
  controls:[C('x','Punto x',-2,2),C('y','Punto y',-2,2),C('angle','Angolo fra normali',0,180,5),C('offset','Soglia del secondo vincolo',-1,1),C('equality','Aggiungi uguaglianza y=0',0,1,1)],
  selects:[{key:'kind',label:'Famiglia di vincoli',options:[['halfplanes','Due semipiani'],['degenerate','Uguaglianza degenere x²=0']]}],
  presets:[{label:'Due attivi indipendenti',params:{}},{label:'Gradienti paralleli',params:{angle:0}},{label:'Troppi gradienti attivi',params:{equality:1}},{label:'Uno solo attivo',params:{offset:.5}},{label:'Minimo senza LICQ',params:{kind:'degenerate',x:0,y:0}}],compute:computeActive,
  present(p){const d=computeActive(p),region=grid((x,y)=>Number(d.contains(x,y)),3,81);
    const boundaries=p.kind==='degenerate'?[line([1,0],0)]:[line([1,0],0),line(d.n,p.offset),...(p.equality?[line([0,1],0)]:[])];
    const frame=scalarFrame([{type:'heatmap',x:region.x,y:region.y,z:region.z,zmin:0,zmax:1,colorscale:[[0,'#fff'],[1,'#e4efdc']],showscale:false,hoverinfo:'skip'},
      ...boundaries.map((b,i)=>curve(b.map(v=>v[0]),b.map(v=>v[1]),`Vincolo ${i+1}`,[green,orange,blue][i])),marker(d.z,'Punto z')],
      {xaxis:{title:{text:'z₁'},range:[-3,3],constrain:'domain'},yaxis:{title:{text:'z₂'},range:[-3,3],scaleanchor:'x'},annotations:arrows(d.z,[...d.normals.map((v,i)=>({v,label:`∇g${i+1}`,color:i?orange:green})),...d.equalityNormals.map(v=>({v,label:'∇h',color:blue}))])});
    return {frames:[frame],metrics:[M('Punto ammissibile?',d.feasible?'Sì':'No'),M('Disuguaglianze attive',d.active.length?d.active.map(i=>`g${i+1}`).join(', '):'nessuna'),M('Numero gradienti richiesti',d.count),M('Rango',d.rank),M('LICQ nel punto?',d.licq?'Sì':'No')],
      message:p.kind==='degenerate'?'Per f(x,y)=x e h=x²=0 ogni punto ammissibile è minimo, ma ∇h=0 e nessun λ annulla ∇f.':!d.feasible?'Il punto è esterno: la regolarità per KKT si valuta su un punto ammissibile.':d.licq?'I gradienti richiesti sono indipendenti. I vincoli inattivi non entrano nel test LICQ.':'LICQ non vale: non si possono dedurre esistenza e unicità dei moltiplicatori da questo teorema.',warning:!d.licq,
      detail:'<p>Semipiani: g₁=x≤0, g₂=cos(θ)x+sin(θ)y−b≤0. L’uguaglianza opzionale è y=0. Le frecce mostrano i gradienti; solo quelli attivi, insieme a tutte le uguaglianze, concorrono al rango. Nel caso x²=0 il gradiente nullo non produce una freccia.</p>'};
  }});

const kktControls=[C('x','Punto x',-2,3),C('y','Punto y',-2,2),C('targetX','Obiettivo a₁',-2,3),C('targetY','Obiettivo a₂',-2,2),C('bound','Bordo x≤b',-2,2),C('level','Uguaglianza y=c',-1.5,1.5),C('lambda','Moltiplicatore λ',-5,5,.25),C('mu','Moltiplicatore μ',-2,5,.25)];
function kktConfig(id:string,title:string,lagrangian=false):Config<typeof kktDefaults> {
  return {id,title,formula:String.raw`L=f+\mu(x-b)+\lambda(y-c),\quad f=\tfrac12[(x-a_1)^2+2(y-a_2)^2]`,defaults:kktDefaults,views:true,plots:1,controls:kktControls,
    presets:[{label:'KKT sul bordo',params:{}},{label:'Ottimo interno, μ=0',params:{targetX:0,x:0,mu:0}},{label:'Complementarità violata',params:{targetX:0,x:0,mu:1}},{label:'Dualità violata',params:{targetX:0,x:1,mu:-1}},{label:'Uguaglianza violata',params:{y:.5}}],compute:computeKKT,
    present(p,view){const d=computeKKT(p),f=lagrangian?d.lagrangian:d.value,feasible=linspace(-3,p.bound,61).map(x=>[x,p.level] as Vec2),frame=geometry(f,view,[paths(feasible,'Insieme ammissibile',blue)]);
      if(view==='2d'){
        frame.data.push(marker(d.z,'Punto z',orange),marker(d.optimum,'Ottimo esatto',green,'diamond'));
        frame.layout.annotations=arrows(d.z,[{v:d.gradient,label:'∇f',color:green},{v:d.weightedG,label:'μ∇g',color:orange},{v:d.weightedH,label:'λ∇h',color:blue},{v:d.stationarity,label:'∇z L',color:red}]);
      }else frame.data.push({type:'scatter3d',x:[p.x,d.optimum[0]],y:[p.y,d.optimum[1]],z:[f(p.x,p.y),f(...d.optimum)],mode:'markers',name:'Punto e ottimo',marker:{size:5,color:[orange,green]}});
      return {frames:[frame],metrics:[M('‖∇z L‖₂',d.stationarityNorm),M('Residuo primale',d.primal),M('Residuo duale',d.dual),M('|μg|',d.complementarity),M('Ottimo esatto',V(d.optimum)),M('λ*, μ*',`${num(d.optimalLambda)}; ${num(d.optimalMu)}`),M('Costo ottimo f*',d.value(...d.optimum)),M(lagrangian?'L nel punto':'Costo nel punto',f(p.x,p.y))],
        message:d.kkt?'Tutte le condizioni KKT sono soddisfatte; in questo problema convesso identificano il minimo globale unico.':'Almeno una condizione KKT non è soddisfatta. Controlla separatamente i quattro residui.',warning:!d.kkt,
        detail:`<p>La superficie rappresenta ${lagrangian?'L a moltiplicatori fissati':'il costo f'}. In 2D le frecce hanno un fattore di scala comune, così conservano la somma vettoriale. λ è libero nel segno; μ≥0. Un vincolo inattivo richiede μ=0. Qui il valore ottimo ha sensibilità ∂f*/∂b=−μ* e ∂f*/∂c=−λ*; varia b o c e confronta gli ottimi esatti. Minimizzare L rispetto a z a moltiplicatori fissati è un sottoproblema diverso dal problema vincolato.</p>`};
    }};
}
export const lagrangianDemo=define(kktConfig('lagrangian','Il costo e i vincoli nello stesso gradiente',true));
export const kktDemo=define(kktConfig('kkt-geometry','Quattro condizioni, quattro residui'));

export const curvatureDemo=define({id:'constrained-curvature',title:'La curvatura lungo le direzioni consentite',formula:String.raw`d^T\nabla^2_{zz}L\,d,\quad J_h d=0;\qquad\text{con disuguaglianze: cono critico}`,defaults:curvatureDefaults,views:true,plots:1,
  controls:[C('angle','Posizione sul cerchio (gradi)',-180,180,5),C('radius','Raggio R',.5,2,.1),C('linear','Coefficiente lineare c',-2,2,.25),C('curvature','Curvatura del costo a',-3,3,.25),C('lambda','Moltiplicatore λ',-3,3,.25),C('normalMix','Componente normale della direzione',-1,1,.1),C('direction','Direzione nel semipiano (gradi)',-180,180,5),C('arc','Lunghezza perturbazione s',.05,.5,.05)],
  selects:[{key:'kind',label:'Geometria del vincolo',options:[['circle','Uguaglianza: x²+y²=R²'],['weak-inequality','Attivo con μ=0: x≥0']]}],
  visibleControls:{angle:p=>p.kind==='circle',radius:p=>p.kind==='circle',linear:p=>p.kind==='circle',curvature:p=>p.kind==='circle',lambda:p=>p.kind==='circle',normalMix:p=>p.kind==='circle',direction:p=>p.kind==='weak-inequality'},
  presets:[{label:'Minimo sul cerchio',params:{}},{label:'Massimo sul cerchio',params:{angle:90,lambda:-.5}},{label:'Direzione non tangente',params:{normalMix:.5}},{label:'Attivo debole: test insufficiente',params:{kind:'weak-inequality',direction:0}}],compute:computeCurvature,
  present(p,view){const d=computeCurvature(p),border=p.kind==='circle'?circle(p.radius):line([1,0],0),arc=p.kind==='circle'?linspace(0,p.arc,21).map(s=>[p.radius*Math.cos(p.angle*Math.PI/180+s/p.radius),p.radius*Math.sin(p.angle*Math.PI/180+s/p.radius)] as Vec2):[d.z,d.feasiblePoint],frame=geometry(d.value,view,[paths(border,'Vincolo',blue),paths([d.z,d.linearPoint],'Perturbazione rettilinea',orange,'dash'),paths(arc,'Percorso ammissibile',green)],3);
    if(view==='2d'){frame.data.push(marker(d.z,'Punto base'),marker(d.feasiblePoint,'Perturbazione ammissibile',green));frame.layout.annotations=arrows(d.z,[{v:d.d,label:'d',color:orange},{v:d.tangent,label:'Tangente',color:blue}]);}
    return {frames:[frame],metrics:[M('Residuo stazionarietà',d.stationarity),M('Jh·d / ∇g·d',d.tangency),M('Curvatura sul tangente',d.tangentCurvature),M('dᵀ HL d',d.directionalCurvature),M('Direzione critica?',d.critical?'Sì':'No'),M('Violazione passo rettilineo',d.constraintError)],message:d.classification,warning:p.kind==='weak-inequality'||d.stationarity>1e-7||!d.critical,
      detail:`<p>${p.kind==='circle'?'Costo f=ax²/2+cy, h=x²+y²−R². Il tangente è perpendicolare al raggio; una retta tangente esce dal cerchio al secondo ordine, mentre l’arco resta ammissibile. Solo in un punto KKT la curvatura di L sul tangente decide il test locale.':'Costo f=−x²+y², vincolo g=−x≤0, punto (0,0), μ=0. Imporre ∇gᵀd=0 guarda solo l’asse y e dà curvatura 2. Il cono critico include d=(1,0), con curvatura −2: il punto non è minimo.'} Il test delle slide è necessario sul sottospazio indicato, ma non è in generale un criterio sufficiente sulle disuguaglianze debolmente attive.</p>`};
  }});

export const qpDemo=define({id:'constrained-qp',title:'Una Hessiana indefinita può dare un minimo vincolato',formula:String.raw`\begin{bmatrix}Q&A^T\\A&0\end{bmatrix}\begin{bmatrix}z\\\lambda\end{bmatrix}=\begin{bmatrix}-q\\b\end{bmatrix},\quad Ad=0`,defaults:qpDefaults,views:true,plots:2,
  controls:[C('q11','Q₁₁',-3,5,.25),C('q22','Q₂₂',-3,5,.25),C('cross','Q₁₂=Q₂₁',-2,2,.25),C('linearX','Termine lineare q₁',-2,2,.25),C('linearY','Termine lineare q₂',-2,2,.25),C('angle','Normale A (gradi)',0,180,5),C('offset','Termine noto b',-1.5,1.5)],
  presets:[{label:'Q indefinita, minimo unico',params:{}},{label:'Curvatura negativa ammissibile',params:{angle:90}},{label:'Infiniti minimi',params:{q22:0,linearY:0}},{label:'Direzione piatta illimitata',params:{q22:0,linearY:1}}],compute:computeConstrainedQP,
  present(p,view){const d=computeConstrainedQP(p),feasible=line(d.n,p.offset),frame=geometry(d.value,view,[paths(feasible,'Az=b',blue)]),s=linspace(-3,3,141),values=s.map(v=>d.value(d.base[0]+v*d.t[0],d.base[1]+v*d.t[1]));
    if(view==='2d'){frame.layout.annotations=arrows(d.base,[{v:d.n,label:'Normale A',color:blue},{v:d.t,label:'Tangente: Ad=0',color:orange}]);if(d.solution)frame.data.push(marker(d.solution,'Minimo sul vincolo',green,'diamond'));}
    else if(d.solution)frame.data.push({type:'scatter3d',x:[d.solution[0]],y:[d.solution[1]],z:[d.value(...d.solution)],mode:'markers',name:'Minimo',marker:{size:6,color:orange}});
    return {frames:[frame,scalarFrame([curve(s,values,'Costo ridotto f(z₀+sd)')],{height:280,xaxis:{title:{text:'Coordinata tangente s'}},yaxis:{title:{text:'Costo sul vincolo'}}})],
      metrics:[M('Autovalori Q',d.spectrum.map(num).join(' / ')),M('dᵀQd (ridotta)',d.reduced),M('Termine lineare ridotto',d.linear),M('Decisione minima',d.solution?V(d.solution):'non esiste'),M('λ',d.lambda??'non definito'),M('Residuo KKT al minimo',d.residual??'non applicabile')],
      message:d.status,warning:!d.solution,
      detail:`<p>La base ammissibile è z₀=bAᵀ, con A unitario; d genera ker A. Il problema ridotto ha costo costante + s·ℓ + s²(dᵀQd)/2. Curvatura positiva: minimo unico; curvatura nulla e ℓ=0: infiniti minimi; altrimenti il costo è illimitato inferiormente. La soluzione di un sistema KKT con curvatura negativa è soltanto stazionaria.</p><p>Matrice KKT numerica: ${formula(matrixLatex(d.kkt.matrix))}. P. 68 corretta: lo spazio tangente è ker A, non ker Aᵀ.</p>`};
  }});

const nlpControls=[C('x','Partenza x',-2,2),C('y','Partenza y',-2,2),C('lambda','λ iniziale',-3,3,.25),C('targetX','Obiettivo a₁',-2,3),C('targetY','Obiettivo a₂',-2,3),C('shape','Curvatura / raggio del vincolo',.5,2),C('offset','Offset del vincolo',-1,1),C('regularization','Regolarizzazione τ',0,5,.25),C('adaptive','Salvaguardia di curvatura',0,1,1),C('penalty','Penalità s',0,8,.25),C('adaptivePenalty','Adatta s ai moltiplicatori',0,1,1),C('beta','Riduzione β',.1,.9,.1),C('c','Sufficiente discesa c',.05,.5,.05),C('step','Passo iniziale γ₀',.1,1,.1),C('iterations','Budget iterazioni',1,60,1)];
const constraintOptions:[string,string][]=[['parabola','y−κx²−b=0'],['circle','x²+y²−R²=0'],['line','x+y−b=0'],['degenerate','x²=0, vincolo degenere']];
function nlpConfig(id:string,title:string,mode:'newton'|'sqp'):Config<NLPParams> {
  const defaults={...nlpDefaults,...(mode==='newton'?{lineSearch:'residual' as const,adaptive:0}:{} )};
  return {id,title,formula:String.raw`B_kd_k+J_h^T\lambda_k^{QP}=-\nabla f,\quad J_hd_k=-h,\quad\lambda^+=(1-\gamma)\lambda+\gamma\lambda^{QP}`,defaults,views:true,plots:2,stepping:true,controls:nlpControls,
    controlGroups:[{title:'Vincolo e obiettivo',keys:['targetX','targetY','shape','offset']},{title:'Moltiplicatori e curvatura',keys:['lambda','regularization','adaptive']},{title:'Ricerca del passo',keys:['penalty','adaptivePenalty','beta','c','step']}],
    selects:[{key:'constraint',label:'Vincolo di uguaglianza',options:constraintOptions},{key:'model',label:'Hessiana del modello',options:[['lagrangian','Hessiana della Lagrangiana'],['objective','Hessiana del costo'],['identity','Identità']]},{key:'lineSearch',label:'Scelta del passo',options:[['merit','Armijo sul merito L1'],['residual','Diminuzione residuo KKT'],['full','Passo fissato']]}],
    visibleControls:{shape:p=>p.constraint==='parabola'||p.constraint==='circle',offset:p=>p.constraint==='parabola'||p.constraint==='line',penalty:p=>p.lineSearch==='merit',adaptivePenalty:p=>p.lineSearch==='merit',beta:p=>p.lineSearch!=='full',c:p=>p.lineSearch!=='full',adaptive:()=>mode==='sqp'},
    presets:[{label:'Parabola',params:{}},{label:'Retta: KKT lineare',params:{constraint:'line',offset:1,x:-1,y:0,lambda:2,lineSearch:'full',adaptive:0}},{label:'Minimo sul cerchio',params:{constraint:'circle',targetX:2,targetY:0,x:1,y:.5,lambda:0}},{label:'KKT massimo sul cerchio',params:{constraint:'circle',targetX:2,targetY:0,x:-1,y:0,lambda:-1.5}},{label:'Jacobiano singolare',params:{constraint:'degenerate',x:0,y:0}},{label:'QP non minimo',params:{constraint:'circle',x:1,y:0,lambda:-2,adaptive:0}}],compute:p=>computeNLP(p,mode),
    present(p,view,cursor){const d=computeNLP(p,mode),k=Math.min(cursor,d.points.length-1),selected=d.points[k],prefix=d.points.slice(0,k+1),z=point(selected.z),step=formStep(d.problem,selected.z,selected.lambda,d.options),
      f=(x:number,y:number)=>d.problem.value([x,y]),curvePoints=feasibleCurve(p.constraint,p.shape,p.offset),frame=geometry(f,view,[paths(curvePoints,'h(z)=0',blue),paths(prefix.map(q=>point(q.z)),'Iterati',orange)]);
      if(view==='2d'){
        frame.data.push(marker(z,'Iterato corrente',orange));
        const A=step.A[0],rhs=dot(A,selected.z)-step.h[0],linearized=line(A,rhs);
        if(linearized.length)frame.data.push(curve(linearized.map(v=>v[0]),linearized.map(v=>v[1]),'h+Jh·d=0','#9d6d43','dash'));
        if(step.d)frame.data.push(marker(point(axpy(selected.z,step.d)),'Minimo del QP / proposta Newton',red));
      }
      const basis=nullBasis(d.problem.jacobian(selected.z),2).basis,H=lagrangianHessian(d.problem,selected.z,selected.lambda),curvature=basis.length===1?dot(basis[0],matvec(H,basis[0])):undefined;
      const notMinimum=selected.residual<1e-7&&curvature!==undefined&&curvature< -1e-7;
      return {frames:[frame,history(prefix)],steps:d.points.length-1,current:k,
        metrics:[M('zₖ',V(z)),M('λₖ',selected.lambda.map(num).join('; ')),M('‖h‖₂',selected.primal),M('‖∇z L‖₂',selected.dual),M('λQP proposta',step.lambdaQP?.map(num).join('; ')??'non disponibile'),M('Δλ proposta',step.lambdaQP?step.lambdaQP.map((v,i)=>num(v-selected.lambda[i])).join('; '):'non disponibile'),M('Curvatura tangente di L',curvature??'non definita'),M('Ultimo passo γ',selected.step)],
        message:notMinimum?'Punto KKT con curvatura tangente negativa: non è un minimo.':k===d.points.length-1?d.status:'Il sottoproblema linearizza il vincolo e aggiorna decisione e moltiplicatore insieme.',warning:notMinimum||d.status.includes('singolare')||d.status.includes('non positiva')||d.status.includes('non a rango'),
        detail:`<p>${mode==='newton'?'Newton cerca uno zero del sistema KKT: può convergere a massimi o selle. Con Hessiana esatta e τ=0 il passo coincide con la linearizzazione congiunta.':'SQP richiede un minimo unico del sottoproblema; la salvaguardia rende B positiva mediante uno shift conservativo. Senza salvaguardia, una curvatura ridotta non positiva viene dichiarata.'} λQP è il nuovo moltiplicatore del QP; Δλ=λQP−λₖ, non λQP. Un passo γ&lt;1 interpola anche i moltiplicatori. L’ammissibilità del vincolo nonlineare è generalmente raggiunta solo al limite.</p><p>Modello corrente B: ${formula(matrixLatex(step.B))}; shift ${num(step.shift)}. Con τ o una Hessiana approssimata, il passo è modificato rispetto al Newton esatto. La norma del gradiente della Lagrangiana e ‖h‖ vengono sempre controllate insieme. L’arresto KKT non certifica un minimo globale.</p>`};
    }};
}
export const newtonDemo=define(nlpConfig('constrained-newton','Newton aggiorna z e λ','newton'));
export const sqpDemo=define(nlpConfig('sqp','Un QP locale, poi un nuovo punto','sqp'));

export const meritDemo=define({id:'merit-line-search',title:'Accettare un passo che bilancia costo e violazione',formula:String.raw`M_1(z;s)=f(z)+s\|h(z)\|_1,\quad M'_1(z;d)=\nabla f(z)^Td-s\|h(z)\|_1`,defaults:meritDefaults,plots:2,stepping:true,
  controls:[C('x','Punto x',-2,2),C('y','Punto y',-2,2),C('penalty','Penalità s',0,8,.25),C('adaptivePenalty','Adatta s ai moltiplicatori',0,1,1),C('beta','Riduzione β',.1,.9,.1),C('c','Sufficiente discesa c',.05,.5,.05),C('step','Passo iniziale γ₀',.1,1,.1)],
  presets:[{label:'Ripristina ammissibilità',params:{}},{label:'Penalità insufficiente',params:{penalty:0}},{label:'Penalità adattata',params:{penalty:0,adaptivePenalty:1}},{label:'Esattezza: soglia s=1',params:{penalty:1}}],compute:computeMerit,
  present(p,_view,cursor){const d=computeMerit(p),k=Math.min(cursor,Math.max(0,d.search.trials.length-1)),trials=d.search.trials.slice(0,k+1),gamma=linspace(0,p.step,121),cost=(a:number)=>d.s.d?d.problem.value(axpy(d.z,d.s.d,a)):NaN,violation=(a:number)=>d.s.d?d.penalty*Math.abs(d.problem.equalities(axpy(d.z,d.s.d,a))[0]):NaN;
    const main=scalarFrame([curve(gamma,gamma.map(cost),'Costo f'),curve(gamma,gamma.map(violation),'s|h|',blue),curve(gamma,gamma.map(a=>cost(a)+violation(a)),'Merito M1',orange),curve(gamma,gamma.map(a=>cost(0)+violation(0)+p.c*a*d.search.slope),'Limite Armijo',red,'dash'),{type:'scatter',x:trials.map(t=>t.step),y:trials.map(t=>t.value),mode:'markers',name:'Tentativi',marker:{size:9,color:trials.map(t=>t.accepted?green:red)}}],{xaxis:{title:{text:'Passo γ'}},yaxis:{title:{text:'Costo, penalità, merito'}}});
    const scalar=linspace(-2,2,121),last=trials.at(-1);
    return {frames:[main,scalarFrame([curve(scalar,scalar.map(x=>x+d.penalty*Math.abs(x)),'Esempio separato: x+s|x|',orange),marker([0,0],'Vincolo x=0')],{height:280,xaxis:{title:{text:'x, esempio scalare separato'}},yaxis:{title:{text:'Merito scalare'}}})],steps:Math.max(0,d.search.trials.length-1),current:k,
      metrics:[M('Penalità usata',d.penalty),M('Pendenza del merito',d.search.slope),M('λQP',d.s.lambdaQP?.map(num).join('; ')??'non disponibile'),M('Tentativo γ',last?.step??'nessuno'),M('Accettato?',last?(last.accepted?'Sì':'No'):'No')],
      message:!d.s.d?'Sottoproblema non risolvibile.':d.search.status==='non-descent'?'Nessuna discesa del merito: aumenta s o attiva l’adattamento.':last?.accepted?'Passo accettato sul merito; costo e violazione possono cambiare in direzioni opposte.':'Riduci γ per soddisfare Armijo sul merito.',warning:!last?.accepted,
      detail:`<p>Il punto iniziale (1,0) è il minimo libero del costo, ma viola y=x². Ripristinare il vincolo richiede qui un aumento del costo: non si pretende che costo e violazione diminuiscano entrambi a ogni passo. La formula della pendenza usa Jh·d=−h.</p><table><caption>Tentativi mostrati</caption><thead><tr><th>i</th><th>γ</th><th>Merito</th><th>Limite</th><th>Esito</th></tr></thead><tbody>${trials.map((t,i)=>`<tr><td>${i}</td><td>${num(t.step)}</td><td>${num(t.value)}</td><td>${num(t.bound)}</td><td>${t.accepted?'accettato':'rifiutato'}</td></tr>`).join('')}</tbody></table><p>Nel secondo grafico si minimizza f(x)=x soggetto a h=x=0: λ*=−1. Per s&gt;1 il minimo del merito è unico in 0; per s=1 è piatto su x≤0; per s&lt;1 è illimitato inferiormente. È un esempio distinto dal problema parabolico.</p>`};
  }});

export const barrierDemo=define({id:'barrier-equalities',title:'La barriera conserva le uguaglianze esplicite',formula:String.raw`\min_{|x|,|y|<b}\Phi_\varepsilon(x,y)\quad\text{soggetto a }x+y=c`,defaults:barrierEqDefaults,views:true,plots:2,stepping:true,
  controls:[C('epsilon','Barriera iniziale ε',.01,2,.01),C('shrink','Riduzione di ε',.1,.8,.1),C('stages','Numero di stadi',1,5,1),C('size','Semilato b',.5,2),C('sum','Uguaglianza x+y=c',-4,4,.25),C('targetX','Obiettivo a₁',-2,4),C('targetY','Obiettivo a₂',-2,4),C('x','Partenza interna x',-2,2),C('y','Partenza interna y',-2,2)],
  presets:[{label:'Ottimo sul bordo',params:{}},{label:'Partenza fuori uguaglianza',params:{x:.5,y:.5}},{label:'Interno incompatibile',params:{sum:4}},{label:'Partenza fuori dominio',params:{x:2}},{label:'Minimo interno',params:{targetX:.2,targetY:-.2}}],compute:computeBarrierEquality,
  present(p,view,cursor){const d=computeBarrierEquality(p),k=Math.min(cursor,Math.max(0,d.points.length-1)),prefix=d.points.slice(0,k+1),last=prefix.at(-1),epsilon=last?.epsilon??p.epsilon,problem=makeBarrierProblem(p,epsilon),lo=Math.max(-p.size,p.sum-p.size),hi=Math.min(p.size,p.sum+p.size),feasible=lo<hi?linspace(lo+1e-5,hi-1e-5,81).map(x=>[x,p.sum-x] as Vec2):[],frame=geometry((x,y)=>problem.value([x,y]),view,[paths(feasible,'Uguaglianza interna',blue),paths(prefix.map(q=>point(q.z)),'Iterati',orange)],p.size*.998);
    if(view==='2d'){
      frame.layout.xaxis={...frame.layout.xaxis,range:[-p.size,p.size]};frame.layout.yaxis={...frame.layout.yaxis,range:[-p.size,p.size]};
      d.centers.forEach((z,i)=>frame.data.push(marker(z,`Centro stadio ${i+1}`,blue,'diamond')));
    }
    const original=(z:number[])=>((z[0]-p.targetX)**2+(z[1]-p.targetY)**2)/2;
    const rows:SolverIterate[]=prefix.map(q=>({...q,cost:original(q.z)}));
    return {frames:[frame,history(rows)],steps:Math.max(0,d.points.length-1),current:k,
      metrics:[M('ε corrente',epsilon),M('zₖ',last?V(point(last.z)):'non calcolato'),M('‖h‖₂',last?.primal??'non disponibile'),M('‖∇z L barriera‖₂',last?.dual??'non disponibile'),M('λ uguaglianza',last?.lambda.map(num).join('; ')??'non disponibile'),M('Slack minimo',last?p.size-Math.max(...last.z.map(Math.abs)):'non disponibile')],
      message:!d.valid||k===d.points.length-1?d.status:'Si risolve il sistema KKT della barriera, mantenendo x+y=c come uguaglianza esplicita.',warning:!d.valid||d.status!=='Stadi completati',
      detail:'<p>La superficie usa ε corrente; i residui storici usano l’ε dello stadio corrispondente. I centri blu sono calcolati indipendentemente con una bisezione lungo l’uguaglianza. Serve |c|&lt;2b per avere un punto strettamente interno compatibile; se |c|=2b il problema originale può essere ammissibile solo sul bordo, ma questa barriera non è applicabile. Una partenza interna può essere inizialmente fuori uguaglianza; il residuo h mostra il ripristino. Le disuguaglianze entrano nel costo, l’uguaglianza resta nel sistema KKT: il problema non diventa libero.</p>'};
  }});

export const timeDemo=define({id:'time-iteration',title:'Un’iterazione aggiorna tutta la traiettoria',formula:String.raw`x_{t+1}=a x_t+b u_t,\quad z^k=(x_0^k,\ldots,x_N^k,u_0^k,\ldots,u_{N-1}^k)`,defaults:timeDefaults,plots:2,stepping:true,preserveIterationFor:['time'],
  controlGroups:[{title:'Dinamica e pesi',keys:['a','b','stateWeight','inputWeight','terminalWeight']}],
  controls:[C('horizon','Orizzonte N',2,16,1),C('time','Tempo osservato t',0,16,1),C('initial','Stato iniziale x₀',-2,2),C('target','Riferimento terminale',-2,2),C('a','Dinamica a',.5,1.2,.05),C('b','Efficacia ingresso b',0,2,.1),C('stateWeight','Peso q degli stati',.1,2,.1),C('inputWeight','Peso r degli ingressi',.1,3,.1),C('terminalWeight','Peso terminale qT',.5,8,.5),C('step','Frazione del passo γ',.1,1,.1),C('iterations','Budget iterazioni',1,20,1)],
  presets:[{label:'Traiettorie successive',params:{}},{label:'QP in un aggiornamento',params:{step:1}},{label:'Ingresso inefficace',params:{b:0}},{label:'Ingresso costoso',params:{inputWeight:3}}],compute:computeTime,
  present(p,_view,cursor){const d=computeTime(p),k=Math.min(cursor,d.points.length-1),selected=d.points[k],current=d.trajectories[k],t=Array.from({length:d.N+1},(_,i)=>i),frame:PlotFrame={data:[{type:'heatmap',x:t,y:d.points.slice(0,k+1).map((_,i)=>i),z:d.trajectories.slice(0,k+1).map(q=>q.x),colorscale:[[0,'#587d9a'],[.5,'#f2f5e8'],[1,'#b77130']],colorbar:{title:{text:'xₜᵏ'},thickness:12},hovertemplate:'t=%{x}<br>k=%{y}<br>x=%{z:.4f}<extra></extra>'}],layout:layout({xaxis:{title:{text:'Tempo del sistema t'},dtick:1},yaxis:{title:{text:'Iterazione del metodo k'},dtick:1},shapes:[{type:'rect',x0:d.time-.45,x1:d.time+.45,y0:k-.45,y1:k+.45,line:{color:green,width:2},fillcolor:'transparent'}]})};
    return {frames:[frame,scalarFrame([curve(t,current.x,'Stati xₜᵏ'),curve(t.slice(0,-1),current.u,'Ingressi uₜᵏ',orange),marker([d.time,current.x[d.time]],'Tempo osservato',blue)],{height:300,xaxis:{title:{text:'Tempo t'},dtick:1},yaxis:{title:{text:'Stato / ingresso'}}})],steps:d.points.length-1,current:k,
      metrics:[M('Iterazione k',k),M('Tempo t selezionato',d.time),M('xₜᵏ',current.x[d.time]),M('uₜᵏ',d.time<d.N?current.u[d.time]:'nessun ingresso a t=N'),M('‖Residuo dinamica‖₂',selected.primal),M('Costo traiettoria',selected.cost)],
      message:'Le colonne sono tempi diversi della stessa traiettoria; una nuova riga k aggiorna insieme tutti gli stati e ingressi.',
      detail:`<p>Esempio scalare discreto, adimensionale: costo ½Σ(qxₜ²+ruₜ²)+½qT(xN−riferimento)². Il nucleo QP/SQP generale risolve le ${2*d.N+1} decisioni con ${d.N+1} uguaglianze, incluso x₀ fissato. Un passo frazionario interpola due traiettorie ammissibili perché la dinamica è lineare. Il tempo osservato è limitato a N quando l’input t supera l’orizzonte. Il riferimento è un costo morbido, non un vincolo terminale; b=0 può renderlo irraggiungibile senza rendere il problema inammissibile.</p>`};
  }});
