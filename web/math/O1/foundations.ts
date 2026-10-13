import type { Matrix2, Vec2 } from '../quadratic';

export interface Grid { x: number[]; y: number[]; z: number[][]; }
export const linspace = (a: number, b: number, n = 101): number[] => Array.from({ length: n }, (_, i) => a + (b-a)*i/(n-1));
export const dot = (a: Vec2, b: Vec2): number => a[0]*b[0]+a[1]*b[1];
export const multiply = (A: Matrix2, x: Vec2): Vec2 => [dot(A[0],x),dot(A[1],x)];
export function eigenvalues(A: Matrix2): Vec2 {
  const mean=(A[0][0]+A[1][1])/2, spread=Math.hypot(A[0][0]-A[1][1],2*A[0][1])/2;
  return [mean-spread,mean+spread];
}
export function grid(fn: (x: number,y: number)=>number, extent=2.5, n=41): Grid {
  const x=linspace(-extent,extent,n), y=[...x];
  return { x,y,z:y.map(yy=>x.map(xx=>fn(xx,yy))) };
}
function finite(params: object) {
  if (Object.values(params).some(value=>typeof value==='number' && !Number.isFinite(value))) throw new RangeError('Parametri non finiti.');
}
const sign = (x: number): number => Math.abs(x)<1e-9 ? 0 : Math.sign(x);

export interface LandscapeParams { tilt:number; point:number; epsilon:number; }
export const landscapeDefaults: LandscapeParams={tilt:0.5,point:1,epsilon:0.35};
export function wellValue(x:number,tilt:number):number { return (x*x-1)**2+tilt*x; }
export function wellStationary(tilt:number):number[] {
  const discriminant=(tilt/8)**2-1/27;
  let roots:number[];
  if (discriminant>1e-14) roots=[Math.cbrt(-tilt/8+Math.sqrt(discriminant))+Math.cbrt(-tilt/8-Math.sqrt(discriminant))];
  else {
    const angle=Math.acos(Math.max(-1,Math.min(1,-3*Math.sqrt(3)*tilt/8)));
    roots=[0,1,2].map(k=>2/Math.sqrt(3)*Math.cos((angle+2*Math.PI*k)/3));
  }
  return roots.sort((a,b)=>a-b).filter((x,i,a)=>!i || Math.abs(x-a[i-1])>1e-7);
}
export function computeLandscape(p:Readonly<LandscapeParams>) {
  finite(p);
  const stationary=wellStationary(p.tilt).map(x=>({x,value:wellValue(x,p.tilt),curvature:12*x*x-4,
    kind:12*x*x-4>1e-7?'minimo locale':12*x*x-4 < -1e-7?'massimo locale':'stazionario degenere'}));
  const minimum=Math.min(...stationary.map(s=>s.value));
  const minimizers=stationary.filter(s=>Math.abs(s.value-minimum)<1e-8).map(s=>s.x);
  const x=linspace(-2.25,2.25,181);
  const derivative=4*p.point**3-4*p.point+p.tilt;
  const selected=stationary.find(s=>Math.abs(s.x-p.point)<1e-6);
  return {x,y:x.map(z=>wellValue(z,p.tilt)),stationary,minimum,minimizers,point:[p.point,wellValue(p.point,p.tilt)] as Vec2,
    derivative,classification:selected ? (minimizers.some(z=>Math.abs(z-p.point)<1e-6)?(minimizers.length>1?'Minimo globale, non stretto':'Minimo globale stretto') : selected.kind) : 'Punto non stazionario',
    epsilon:p.epsilon,nonunique:minimizers.length>1};
}

export interface DerivativeParams { x:number; y:number; cross:number; quartic:number; direction:number; step:number; }
export const derivativeDefaults:DerivativeParams={x:0.7,y:0.5,cross:0.3,quartic:0.2,direction:35,step:0.4};
export function derivativeValue(x:number,y:number,cross:number,quartic:number):number {
  return 0.5*x*x+y*y+cross*x*y+quartic*(x**4+y**4)/4;
}
export function computeDerivatives(p:Readonly<DerivativeParams>) {
  finite(p);
  const value=derivativeValue(p.x,p.y,p.cross,p.quartic);
  const gradient:Vec2=[p.x+p.cross*p.y+p.quartic*p.x**3,2*p.y+p.cross*p.x+p.quartic*p.y**3];
  const hessian:Matrix2=[[1+3*p.quartic*p.x*p.x,p.cross],[p.cross,2+3*p.quartic*p.y*p.y]];
  const direction:Vec2=[Math.cos(p.direction*Math.PI/180),Math.sin(p.direction*Math.PI/180)];
  const target:Vec2=[p.x+p.step*direction[0],p.y+p.step*direction[1]];
  const targetValue=derivativeValue(target[0],target[1],p.cross,p.quartic);
  const directional=dot(gradient,direction), curvature=dot(direction,multiply(hessian,direction));
  const linear=value+p.step*directional, quadratic=linear+p.step*p.step*curvature/2;
  return { ...grid((x,y)=>derivativeValue(x,y,p.cross,p.quartic)),point:[p.x,p.y] as Vec2,value,gradient,hessian,
    eigenvalues:eigenvalues(hessian),direction,target,targetValue,directional,linear,quadratic,
    firstError:Math.abs(targetValue-linear),secondError:Math.abs(targetValue-quadratic),
    jacobian:[[2*p.x,1],[p.y,p.x]] as Matrix2,
  };
}

export interface StationaryParams { a:number; b:number; quarticX:number; quarticY:number; }
export const stationaryDefaults:StationaryParams={a:1,b:-1,quarticX:0,quarticY:0};
export function computeStationary(p:Readonly<StationaryParams>) {
  finite(p);
  const sx=sign(p.a)||sign(p.quarticX), sy=sign(p.b)||sign(p.quarticY);
  let classification:string;
  if (sx*sy<0) classification='Punto di sella';
  else if (sx>=0 && sy>=0 && sx+sy>0) classification=sx*sy>0?'Minimo locale stretto':'Minimo locale non stretto';
  else if (sx<=0 && sy<=0 && sx+sy<0) classification=sx*sy>0?'Massimo locale stretto':'Massimo locale non stretto';
  else classification='Funzione costante: ogni punto è minimo e massimo';
  const eigenvalues:Vec2=[Math.min(p.a,p.b),Math.max(p.a,p.b)];
  const hessianClass= eigenvalues[0]>1e-9?'Definita positiva':eigenvalues[1]<-1e-9?'Definita negativa':
    eigenvalues[0]<-1e-9&&eigenvalues[1]>1e-9?'Indefinita':'Semidefinita o nulla: test inconcludente';
  return {...grid((x,y)=>0.5*(p.a*x*x+p.b*y*y)+(p.quarticX*x**4+p.quarticY*y**4)/4,2,45),
    classification,hessianClass,eigenvalues,point:[0,0] as Vec2,value:0};
}

export type SetKind='disk'|'annulus'|'circle';
export interface SetParams { kind:SetKind; radius:number; angleA:number; angleB:number; theta:number; }
export const setDefaults:SetParams={kind:'annulus',radius:1.5,angleA:0,angleB:180,theta:0.5};
export function computeSet(p:Readonly<SetParams>) {
  finite(p);
  if (p.radius<=0 || p.theta<0 || p.theta>1) throw new RangeError('Raggio o theta non validi.');
  const polar=(angle:number):Vec2=>[p.radius*Math.cos(angle*Math.PI/180),p.radius*Math.sin(angle*Math.PI/180)];
  const A=polar(p.angleA),B=polar(p.angleB);
  const point:Vec2=[p.theta*A[0]+(1-p.theta)*B[0],p.theta*A[1]+(1-p.theta)*B[1]];
  const inside=(x:number,y:number)=>{
    const r=Math.hypot(x,y);
    return p.kind==='disk' ? r<=p.radius+1e-8 : p.kind==='annulus' ? r<=p.radius+1e-8 && r>=p.radius/2-1e-8 : Math.abs(r-p.radius)<1e-8;
  };
  return {...grid((x,y)=>inside(x,y)?1:0,2.3,61),A,B,point,inside:inside(...point),convex:p.kind==='disk',
    radius:p.radius,innerRadius:p.kind==='annulus'?p.radius/2:p.kind==='circle'?p.radius:0,
    kind:p.kind,margin:p.radius-Math.hypot(...point)};
}

export type ConstraintKind='sublevel'|'affine'|'nonlinear-equality';
export interface ConstraintParams { kind:ConstraintKind; level:number; theta:number; }
export const constraintDefaults:ConstraintParams={kind:'sublevel',level:0,theta:0.5};
export function computeConstraints(p:Readonly<ConstraintParams>) {
  finite(p);
  if(p.level < -1 || p.theta<0 || p.theta>1) throw new RangeError('Livello o theta non valido.');
  const sublevel=p.kind==='sublevel';
  const outer=sublevel?Math.sqrt(1+Math.sqrt(p.level+1)):0;
  const inner=sublevel?Math.sqrt(Math.max(0,1-Math.sqrt(p.level+1))):0;
  const A:Vec2=sublevel?[outer,0]:[p.level,1.5],B:Vec2=sublevel?[-outer,0]:[p.level,-1.5];
  const point:Vec2=[p.theta*A[0]+(1-p.theta)*B[0],p.theta*A[1]+(1-p.theta)*B[1]];
  const residual=(x:number,y:number)=>sublevel?(x*x+y*y-1)**2-1-p.level:p.kind==='affine'?x-p.level:(x-p.level)**2;
  const inside=(x:number,y:number)=>sublevel?residual(x,y)<=1e-8:Math.abs(residual(x,y))<=1e-8;
  return {...grid((x,y)=>inside(x,y)?1:0,2.3,61),A,B,point,outer,inner,inside:inside(...point),
    convex:!sublevel||p.level>=0,residual:residual(...point),kind:p.kind,level:p.level,
    description:sublevel?(p.level>=0?'Il sottolivello è un disco convesso; questo non rende g quasi-convessa su tutti i livelli.':'Un livello negativo produce una corona (o una circonferenza): questo segmento può uscire dall’insieme.'):
      p.kind==='affine'?'La retta x=c è affine. Se c≠0 non è uno spazio vettoriale.':'La stessa retta convessa è definita da h=(x−c)², una funzione non affine: l’implicazione inversa delle slide è falsa.'};
}

export type FunctionKind='polynomial'|'exponential'|'affine';
export interface FunctionParams { kind:FunctionKind; a:number; b:number; A:number; B:number; theta:number; }
export const functionDefaults:FunctionParams={kind:'polynomial',a:1,b:0.2,A:-1.5,B:1.5,theta:0.5};
export function scalarValue(x:number,p:Pick<FunctionParams,'kind'|'a'|'b'>):number {
  return p.kind==='exponential'?Math.exp(x):p.kind==='affine'?p.a*x+p.b:0.5*p.a*x*x+0.25*p.b*x**4;
}
export function scalarGradient(x:number,p:Pick<FunctionParams,'kind'|'a'|'b'>):number {
  return p.kind==='exponential'?Math.exp(x):p.kind==='affine'?p.a:p.a*x+p.b*x**3;
}
export function computeFunction(p:Readonly<FunctionParams>) {
  finite(p);
  if (p.b<0 || p.theta<0 || p.theta>1) throw new RangeError('b o theta non valido.');
  const x=linspace(-2.3,2.3,161),point=p.theta*p.A+(1-p.theta)*p.B;
  const fA=scalarValue(p.A,p),fB=scalarValue(p.B,p),value=scalarValue(point,p);
  const chord=p.theta*fA+(1-p.theta)*fB;
  const convex=p.kind!=='polynomial'||p.a>=0;
  const strict=p.kind==='exponential'||p.kind==='polynomial'&&p.a>=0&&(p.a>0||p.b>0);
  let minimum:string;
  if(p.kind==='exponential') minimum='Infimo 0, non raggiunto su ℝ';
  else if(p.kind==='affine') minimum=p.a===0?'Ogni punto è minimo globale':'Costo illimitato inferiormente su ℝ';
  else if(p.a>=0) minimum=p.a===0&&p.b===0?'Ogni punto è minimo globale':'Minimo globale unico in 0';
  else minimum=p.b>0?'Due minimi globali; funzione non convessa':'Costo illimitato inferiormente su ℝ';
  return {x,y:x.map(z=>scalarValue(z,p)),A:[p.A,fA] as Vec2,B:[p.B,fB] as Vec2,point:[point,value] as Vec2,
    chord,gap:chord-value,convex,strict,minimum,tangent:x.map(z=>fA+scalarGradient(p.A,p)*(z-p.A)),
    gradient:scalarGradient(point,p)};
}

export interface BoundsParams { a:number; b:number; base:number; target:number; mu:number; L:number; }
export const boundsDefaults:BoundsParams={a:1,b:0.15,base:-0.7,target:1.2,mu:1,L:3};
export function computeBounds(p:Readonly<BoundsParams>) {
  finite(p);
  if(p.a<0 || p.b<0 || p.mu<0 || p.L<=0) throw new RangeError('Curvature o costanti non valide.');
  if(Math.abs(p.base)>2 || Math.abs(p.target)>2) throw new RangeError('I punti devono appartenere al dominio dichiarato [-2,2].');
  const value=(x:number)=>0.5*p.a*x*x+0.25*p.b*x**4;
  const grad=(x:number)=>p.a*x+p.b*x**3;
  const actualMu=p.a,actualL=p.a+12*p.b;
  const x=linspace(-2,2,121),atBase=value(p.base),slope=grad(p.base);
  const tangent=(z:number)=>atBase+slope*(z-p.base);
  const lower=(z:number)=>tangent(z)+p.mu*(z-p.base)**2/2;
  const upper=(z:number)=>tangent(z)+p.L*(z-p.base)**2/2;
  const delta=p.target-p.base,dg=grad(p.target)-grad(p.base),monotonicity=dg*delta;
  return {x,y:x.map(value),tangent:x.map(tangent),lower:x.map(lower),upper:x.map(upper),
    base:[p.base,atBase] as Vec2,target:[p.target,value(p.target)] as Vec2,
    actualMu,actualL,validMu:p.mu<=actualMu+1e-9,validL:p.L>=actualL-1e-9,
    lowerGap:value(p.target)-lower(p.target),upperGap:upper(p.target)-value(p.target),
    monotoneGap:monotonicity-p.mu*delta*delta,cocoerciveGap:monotonicity-dg*dg/p.L,
    combinedGap:monotonicity-(p.mu*p.L*delta*delta+dg*dg)/(p.mu+p.L),
  };
}

export interface QPParams { lambda1:number; lambda2:number; angle:number; qx:number; qy:number; }
export const qpDefaults:QPParams={lambda1:1,lambda2:2,angle:20,qx:-1,qy:0.5};
export function computeQP(p:Readonly<QPParams>) {
  finite(p);
  const radians=p.angle*Math.PI/180,c=Math.cos(radians),s=Math.sin(radians);
  const Q:Matrix2=[[p.lambda1*c*c+p.lambda2*s*s,(p.lambda1-p.lambda2)*c*s],[(p.lambda1-p.lambda2)*c*s,p.lambda1*s*s+p.lambda2*c*c]];
  const projectedQ:Vec2=[c*p.qx+s*p.qy,-s*p.qx+c*p.qy];
  const lambdas:Vec2=[p.lambda1,p.lambda2];
  const negative=lambdas.some(lambda=>lambda < -1e-9);
  const incompatible=lambdas.some((lambda,i)=>Math.abs(lambda)<1e-9&&Math.abs(projectedQ[i])>1e-8);
  const bounded=!negative&&!incompatible;
  const coordinates:Vec2=bounded?lambdas.map((lambda,i)=>Math.abs(lambda)>1e-9?-projectedQ[i]/lambda:0) as unknown as Vec2:[0,0];
  const minimizer:Vec2=[c*coordinates[0]-s*coordinates[1],s*coordinates[0]+c*coordinates[1]];
  const value=(x:number,y:number)=>0.5*(Q[0][0]*x*x+2*Q[0][1]*x*y+Q[1][1]*y*y)+p.qx*x+p.qy*y;
  const nullIndex=lambdas.findIndex(lambda=>Math.abs(lambda)<1e-9);
  const nullDirection:Vec2=nullIndex===0?[c,s]:[-s,c];
  const unboundedIndex=negative?lambdas.findIndex(lambda=>lambda < -1e-9):lambdas.findIndex((lambda,i)=>Math.abs(lambda)<1e-9&&Math.abs(projectedQ[i])>1e-8);
  const basis:Vec2=unboundedIndex===0?[c,s]:[-s,c];
  const orientation=unboundedIndex>=0&&Math.abs(projectedQ[unboundedIndex])>1e-9?-Math.sign(projectedQ[unboundedIndex]):1;
  const descent:Vec2=[orientation*basis[0],orientation*basis[1]];
  const extent=bounded?Math.max(3,Math.abs(minimizer[0])+1,Math.abs(minimizer[1])+1):3;
  return {...grid(value,extent,45),Q,bounded,unique:bounded&&nullIndex===-1,
    minimizer,minimum:bounded?value(...minimizer):null,nullDirection,descent,extent,
    eigenvalues:[Math.min(...lambdas),Math.max(...lambdas)] as Vec2,
    stationaryResidual:bounded?Math.hypot(...multiply(Q,minimizer).map((z,i)=>z+[p.qx,p.qy][i])):null,
    reason:negative?'Una curvatura negativa rende il costo illimitato inferiormente.':incompatible?'q ha una componente non nulla lungo il nucleo di Q: il costo scende senza limite.':
      nullIndex>=0?'Q è semidefinita e q appartiene alla sua immagine: il minimo esiste ma non è unico.':'Q è definita positiva: il minimo globale esiste ed è unico.'};
}
