import type { Vec2 } from '../quadratic';
import { dot, eigenvalues, grid, linspace } from '../O1/foundations';

export type ObjectiveKind = 'quadratic' | 'double-well' | 'exponential' | 'linear';
export type Matrix2 = [[number, number], [number, number]];
export interface Objective {
  value(z: Vec2): number;
  gradient(z: Vec2): Vec2;
  hessian(z: Vec2): Matrix2;
}
export const norm = (z: Vec2) => Math.hypot(...z);
export const add = (z: Vec2, d: Vec2, step = 1): Vec2 => [z[0] + step*d[0], z[1] + step*d[1]];
export const scale = (z: Vec2, a: number): Vec2 => [a*z[0], a*z[1]];
export function solve(A: Matrix2, b: Vec2): Vec2 | undefined {
  const det = A[0][0]*A[1][1]-A[0][1]*A[1][0];
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return undefined;
  return [(A[1][1]*b[0]-A[0][1]*b[1])/det, (A[0][0]*b[1]-A[1][0]*b[0])/det];
}
export function objective(kind: ObjectiveKind, condition = 8): Objective {
  if (kind === 'linear') return {value: z=>z[0]+z[1], gradient: ()=>[1,1], hessian: ()=>[[0,0],[0,0]]};
  if (kind === 'double-well') return {
    value: ([x,y])=>(x*x-1)**2+y*y,
    gradient: ([x,y])=>[4*x*(x*x-1),2*y],
    hessian: ([x])=>[[12*x*x-4,0],[0,2]],
  };
  if (kind === 'exponential') {
    const terms = ([x,y]:Vec2)=>[Math.exp(x+3*y-0.1),Math.exp(x-3*y-0.1),Math.exp(-x-0.1)];
    return {
      value: z=>terms(z).reduce((a,b)=>a+b,0),
      gradient: z=>{const [a,b,c]=terms(z);return [a+b-c,3*(a-b)];},
      hessian: z=>{const [a,b,c]=terms(z);return [[a+b+c,3*(a-b)],[3*(a-b),9*(a+b)]];},
    };
  }
  // Rotated SPD quadratic; spectrum 1, condition. Same convention as O1: f = zᵀQz/2.
  const c=Math.cos(Math.PI/6),s=Math.sin(Math.PI/6);
  const Q:Matrix2=[[c*c+condition*s*s,(1-condition)*c*s],[(1-condition)*c*s,s*s+condition*c*c]];
  const gradient=([x,y]:Vec2):Vec2=>[Q[0][0]*x+Q[0][1]*y,Q[1][0]*x+Q[1][1]*y];
  return {value:z=>dot(z,gradient(z))/2,gradient,hessian:()=>Q};
}
export function finiteHessian(f: Objective, z: Vec2, h: number): Matrix2 {
  const column=(j:number):Vec2=>{
    const d:Vec2=j===0?[h,0]:[0,h];
    const a=f.gradient(add(z,d)), b=f.gradient(add(z,d,-1));
    return [(a[0]-b[0])/(2*h),(a[1]-b[1])/(2*h)];
  };
  const a=column(0),b=column(1),mixed=(a[1]+b[0])/2;
  return [[a[0],mixed],[mixed,b[1]]];
}
export interface Trial { step:number;value:number;bound:number;accepted:boolean; }
export function backtrack(f:Objective,z:Vec2,d:Vec2,initial=1,beta=0.7,c=0.5,max=70) {
  if (!(initial>0 && beta>0 && beta<1 && c>0 && c<1)) throw new Error('Armijo richiede γ₀ > 0 e β,c tra 0 e 1.');
  const slope=dot(f.gradient(z),d),trials:Trial[]=[];
  if (!Number.isFinite(slope) || slope>=0) return {step:0,slope,trials,status:'Direzione non di discesa'};
  for(let i=0,step=initial;i<max;i++,step*=beta) {
    const value=f.value(add(z,d,step)),bound=f.value(z)+c*step*slope;
    // The standard non-strict Armijo condition avoids a spurious rejection at floating-point equality.
    const accepted=Number.isFinite(value)&&value<=bound;
    trials.push({step,value,bound,accepted});
    if(accepted)return {step,slope,trials,status:'Passo accettato'};
  }
  return {step:0,slope,trials,status:'Limite di backtracking raggiunto'};
}
export interface DescentParams {
  kind:ObjectiveKind;method:'gradient'|'scaled'|'newton'|'finite-newton';rule:'fixed'|'armijo'|'diminishing';
  x:number;y:number;condition:number;step:number;beta:number;c:number;alpha:number;scaleX:number;regularization:number;difference:number;iterations:number;
}
export const descentDefaults:DescentParams={kind:'quadratic',method:'gradient',rule:'armijo',x:2,y:1.5,condition:8,step:1,beta:0.7,c:0.5,alpha:0.75,scaleX:0.25,regularization:0,difference:0.1,iterations:30};
export interface Iterate {z:Vec2;value:number;gradientNorm:number;step:number;slope:number;backtracks:number;}
export function direction(f:Objective,z:Vec2,p:Pick<DescentParams,'method'|'scaleX'|'regularization'|'difference'>) {
  const g=f.gradient(z);
  if(p.method==='gradient')return {d:scale(g,-1),matrix:[[1,0],[0,1]] as Matrix2,status:'Direzione −∇f'};
  if(p.method==='scaled')return {d:[-p.scaleX*g[0],-g[1]] as Vec2,matrix:[[p.scaleX,0],[0,1]] as Matrix2,status:'D diagonale positiva'};
  const H=p.method==='finite-newton'?finiteHessian(f,z,p.difference):f.hessian(z);
  const B:Matrix2=[[H[0][0]+p.regularization,H[0][1]],[H[1][0],H[1][1]+p.regularization]];
  if(eigenvalues(B)[0]<=1e-10)return {d:undefined,matrix:B,status:'Hessiana del modello non positiva: aumenta λ o cambia metodo'};
  return {d:solve(B,scale(g,-1)),matrix:B,status:p.method==='finite-newton'?'Hessiana da differenze centrate':'Sistema B d = −∇f'};
}
export function computeDescent(p:Readonly<DescentParams>) {
  const f=objective(p.kind,p.condition),points:Iterate[]=[];
  let z:Vec2=[p.x,p.y],status='Budget di iterazioni raggiunto';
  const push=(step=0,slope=0,backtracks=0)=>points.push({z:[...z],value:f.value(z),gradientNorm:norm(f.gradient(z)),step,slope,backtracks});
  push();
  for(let k=0;k<Math.min(120,p.iterations);k++) {
    if(norm(f.gradient(z))<1e-8){status='Tolleranza sul gradiente raggiunta';break;}
    const chosen=direction(f,z,p);
    if(!chosen.d){status=chosen.status;break;}
    let step=p.rule==='diminishing'?p.step/(k+1)**p.alpha:p.step,backtracks=0;
    const slope=dot(f.gradient(z),chosen.d);
    if(p.rule==='armijo') {
      const line=backtrack(f,z,chosen.d,p.step,p.beta,p.c);
      if(!line.step){status=line.status;break;}
      step=line.step;backtracks=line.trials.length-1;
    }
    const next=add(z,chosen.d,step),value=f.value(next),gradientNorm=norm(f.gradient(next));
    if(!Number.isFinite(value)||!Number.isFinite(gradientNorm)||norm(next)>1e5||Math.abs(value)>1e12){status='Divergenza o limite numerico: riduci il passo';break;}
    z=next;push(step,slope,backtracks);
  }
  return {points,status,objective:f,initialDirection:direction(f,[p.x,p.y],p),
    stableQuadraticStep:p.kind==='quadratic'?2/p.condition:undefined};
}

export interface RootParams {kind:'square'|'cycle';a:number;start:number;iterations:number;}
export const rootDefaults:RootParams={kind:'square',a:2,start:2,iterations:8};
export function rootFunction(p:RootParams) {
  return p.kind==='square'?{r:(x:number)=>x*x-p.a,dr:(x:number)=>2*x}:{r:(x:number)=>x**3-2*x+2,dr:(x:number)=>3*x*x-2};
}
export function computeRoot(p:Readonly<RootParams>) {
  const {r,dr}=rootFunction(p),points=[p.start];let status='Budget raggiunto';
  for(let i=0;i<Math.min(p.iterations,30);i++) {
    const x=points.at(-1)!;
    if(Math.abs(r(x))<1e-10){status='Residuo sotto tolleranza';break;}
    if(Math.abs(dr(x))<1e-10){status='Derivata nulla: passo Newton non definito';break;}
    const next=x-r(x)/dr(x);
    if(!Number.isFinite(next)||Math.abs(next)>1e5){status='Limite numerico raggiunto';break;}
    points.push(next);
    if(points.length>2&&Math.abs(next-points.at(-3)!)<1e-12&&Math.abs(r(next))>1e-8){status='Ciclo di periodo 2: Newton non converge';break;}
  }
  return {points,status,r,dr};
}

export interface ModelParams {kind:ObjectiveKind;x:number;y:number;condition:number;regularization:number;}
export const modelDefaults:ModelParams={kind:'double-well',x:0.2,y:0.6,condition:8,regularization:5};
export function computeModel(p:Readonly<ModelParams>) {
  const f=objective(p.kind,p.condition),z:Vec2=[p.x,p.y],g=f.gradient(z),H=f.hessian(z);
  const B:Matrix2=[[H[0][0]+p.regularization,H[0][1]],[H[1][0],H[1][1]+p.regularization]];
  const spectrum=eigenvalues(B),d=spectrum[0]>1e-10?solve(B,scale(g,-1)):undefined;
  const model=(w:Vec2)=>{const v=add(w,z,-1);return f.value(z)+dot(g,v)+dot(v,[B[0][0]*v[0]+B[0][1]*v[1],B[1][0]*v[0]+B[1][1]*v[1]])/2;};
  return {f,z,g,H,B,spectrum,d,next:d?add(z,d):undefined,model,
    modelResidual:d?norm(add(g,[B[0][0]*d[0]+B[0][1]*d[1],B[1][0]*d[0]+B[1][1]*d[1]])):undefined};
}

export type SetKind='box'|'disk';
export const violation=(z:Vec2,kind:SetKind,size:number)=>Math.max(0,kind==='disk'?norm(z)-size:Math.max(Math.abs(z[0]),Math.abs(z[1]))-size);
export function project(z:Vec2,kind:SetKind,size:number):Vec2 {
  if(!(size>0))throw new Error('L’insieme deve avere dimensione positiva.');
  if(kind==='disk')return norm(z)>size?scale(z,size/norm(z)):[...z];
  return [Math.max(-size,Math.min(size,z[0])),Math.max(-size,Math.min(size,z[1]))];
}
export interface ProjectionParams {set:SetKind;size:number;x:number;y:number;targetX:number;targetY:number;theta:number;}
export const projectionDefaults:ProjectionParams={set:'disk',size:1.5,x:2.5,y:1,targetX:3,targetY:0,theta:0.5};
export function computeProjection(p:Readonly<ProjectionParams>) {
  const raw:Vec2=[p.x,p.y],z=project(raw,p.set,p.size),target:Vec2=[p.targetX,p.targetY],g=add(z,target,-1);
  const endpoint=(v:number)=>v>0?-p.size:v<0?p.size:0;
  const support:Vec2=p.set==='disk'?scale(g,norm(g)>1e-12?-p.size/norm(g):0):[endpoint(g[0]),endpoint(g[1])];
  const minSlope=dot(g,add(support,z,-1)),candidate=project(target,p.set,p.size);
  const trial:Vec2=p.set==='disk'?[p.size*Math.cos(2*Math.PI*p.theta),p.size*Math.sin(2*Math.PI*p.theta)]:[-p.size+2*p.size*p.theta,p.size];
  return {raw,z,target,g,candidate,support,minSlope,distance:norm(add(raw,z,-1)),
    mapping:norm(add(z,project(add(z,g,-1),p.set,p.size),-1)),
    trial,projectionInequality:dot(add(raw,z,-1),add(trial,z,-1))};
}
export interface ProjectedParams {set:SetKind;size:number;x:number;y:number;targetX:number;targetY:number;condition:number;step:number;method:'projected'|'feasible';iterations:number;}
export const projectedDefaults:ProjectedParams={set:'box',size:1.5,x:-1,y:1,targetX:3,targetY:0.5,condition:4,step:0.3,method:'projected',iterations:40};
export function computeProjected(p:Readonly<ProjectedParams>) {
  if(!(p.step>0)||(p.method==='feasible'&&p.step>1))throw new Error('La combinazione ammissibile richiede 0 < γ ≤ 1.');
  const target:Vec2=[p.targetX,p.targetY];
  const f:Objective={value:z=>((z[0]-target[0])**2+p.condition*(z[1]-target[1])**2)/2,
    gradient:z=>[z[0]-target[0],p.condition*(z[1]-target[1])],hessian:()=>[[1,0],[0,p.condition]]};
  let z=project([p.x,p.y],p.set,p.size),status='Budget raggiunto';
  const points:Iterate[]=[],mapping=(w:Vec2)=>norm(add(w,project(add(w,f.gradient(w),-1),p.set,p.size),-1));
  const push=()=>points.push({z:[...z],value:f.value(z),gradientNorm:mapping(z),step:p.step,slope:0,backtracks:0});push();
  for(let i=0;i<Math.min(p.iterations,120);i++) {
    if(mapping(z)<1e-8){status='Residuo di punto fisso sotto tolleranza';break;}
    z=p.method==='projected'?project(add(z,f.gradient(z),-p.step),p.set,p.size):add(z,add(project(add(z,f.gradient(z),-1),p.set,p.size),z,-1),p.step);
    push();
  }
  const last=points.at(-1)!.z,unprojected=add(last,f.gradient(last),-(p.method==='projected'?p.step:1));
  return {points,status,objective:f,target,rawInitial:[p.x,p.y] as Vec2,
    initialWasProjected:violation([p.x,p.y],p.set,p.size)>0,
    unconstrainedTrial:unprojected,projectedTrial:project(unprojected,p.set,p.size)};
}

export interface GalleryParams {kind:'square'|'quartic'|'exponential'|'quadratic';coefficient:number;condition:number;domain:number;x:number;y:number;}
export const galleryDefaults:GalleryParams={kind:'quartic',coefficient:1,condition:8,domain:3,x:0.5,y:0};
export function computeGallery(p:Readonly<GalleryParams>) {
  const scalar=p.kind==='square'||p.kind==='quartic';
  const original=(x:number)=>p.kind==='square'?x*x:x**4+2*x**3-12*x*x-2*x+6;
  const f=objective(p.kind==='exponential'?'exponential':'quadratic',p.condition);
  const value=(z:Vec2)=>p.coefficient*(scalar?original(z[0]):f.value(z));
  const derivative=scalar?p.coefficient*(p.kind==='square'?2*p.x:4*p.x**3+6*p.x*p.x-24*p.x-2):undefined;
  const curvature=scalar?p.coefficient*(p.kind==='square'?2:12*p.x*p.x+12*p.x-24):undefined;
  const x=linspace(-p.domain,p.domain,161);
  return {scalar,x,y:x.map(v=>value([v,0])),surface:grid((x,y)=>value([x,y]),p.domain,41),value:value([p.x,p.y]),valueAt:value,derivative,curvature};
}

export interface BarrierParams {epsilon:number;shrink:number;stages:number;size:number;targetX:number;targetY:number;x:number;y:number;}
export const barrierDefaults:BarrierParams={epsilon:1,shrink:0.2,stages:4,size:1.5,targetX:3,targetY:0.5,x:0,y:0};
export function barrierObjective(p:Pick<BarrierParams,'size'|'targetX'|'targetY'>,epsilon:number):Objective {
  const b=p.size,slack=([x,y]:Vec2)=>[b-x,b+x,b-y,b+y];
  return {
    value:z=>slack(z).some(s=>s<=0)?Infinity:((z[0]-p.targetX)**2+(z[1]-p.targetY)**2)/2-epsilon*slack(z).reduce((s,v)=>s+Math.log(v),0),
    gradient:([x,y])=>[x-p.targetX+epsilon*(1/(b-x)-1/(b+x)),y-p.targetY+epsilon*(1/(b-y)-1/(b+y))],
    hessian:([x,y])=>[[1+epsilon*(1/(b-x)**2+1/(b+x)**2),0],[0,1+epsilon*(1/(b-y)**2+1/(b+y)**2)]],
  };
}
export function barrierCenter(target:number,b:number,epsilon:number) {
  let lo=-b,hi=b;
  for(let i=0;i<80;i++){const x=(lo+hi)/2,g=x-target+epsilon*(1/(b-x)-1/(b+x));if(g>0)hi=x;else lo=x;}
  return (lo+hi)/2;
}
export function computeBarrier(p:Readonly<BarrierParams>) {
  if(!(p.epsilon>0&&p.size>0&&p.shrink>0&&p.shrink<1))throw new Error('ε e raggio positivi; fattore di riduzione tra 0 e 1.');
  let z:Vec2=[p.x,p.y],status='Stadi completati';
  const points:{z:Vec2;epsilon:number;stage:number;value:number;gradientNorm:number;step:number}[]=[];
  if(Math.max(Math.abs(z[0]),Math.abs(z[1]))>=p.size)return {points,status:'Partenza fuori dall’interno: occorre |x|, |y| < b',centers:[] as Vec2[],valid:false};
  const centers:Vec2[]=[];
  outer:for(let stage=0;stage<Math.min(8,p.stages);stage++) {
    const epsilon=p.epsilon*p.shrink**stage,f=barrierObjective(p,epsilon);
    centers.push([barrierCenter(p.targetX,p.size,epsilon),barrierCenter(p.targetY,p.size,epsilon)]);
    points.push({z:[...z],epsilon,stage,value:f.value(z),gradientNorm:norm(f.gradient(z)),step:0});
    let converged=false;
    for(let k=0;k<30;k++) {
      const g=f.gradient(z);
      if(norm(g)<1e-7){converged=true;break;}
      const d=solve(f.hessian(z),scale(g,-1));if(!d){status='Sistema Newton singolare';break outer;}
      const line=backtrack(f,z,d,1,0.5,0.1);
      if(!line.step){status='Line search di barriera fallita';break outer;}
      z=add(z,d,line.step);
      points.push({z:[...z],epsilon,stage,value:f.value(z),gradientNorm:norm(f.gradient(z)),step:line.step});
    }
    if(!converged&&norm(f.gradient(z))>=1e-7){status='Budget Newton per stadio raggiunto; ε non ridotta ulteriormente';break;}
  }
  return {points,status,centers,valid:true};
}
