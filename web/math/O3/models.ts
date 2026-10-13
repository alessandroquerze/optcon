import type { Vec2 } from '../quadratic';
import { eigenvalues } from '../O1/foundations';
import { barrierObjective } from '../O2/methods';
import { dot,norm,axpy,matvec,nullBasis,identity,solveEqualityQP,solveSQP,solverDefaults,formStep,residuals,searchMerit,
  type SmoothProblem,type SolverOptions,type SolverIterate,type Matrix,type Vector } from './solver';
const v2=(z:Vector):Vec2=>[z[0],z[1]];
export const degrees=(a:number)=>a*Math.PI/180;

export interface ActiveParams {kind:'halfplanes'|'degenerate';x:number;y:number;angle:number;offset:number;equality:number;}
export const activeDefaults:ActiveParams={kind:'halfplanes',x:0,y:0,angle:90,offset:0,equality:0};
export function computeActive(p:Readonly<ActiveParams>) {
  const z:Vec2=[p.x,p.y],n:Vec2=[Math.cos(degrees(p.angle)),Math.sin(degrees(p.angle))];
  const inequalities=p.kind==='halfplanes'?[p.x,dot(n,z)-p.offset]:[],equalities=p.kind==='degenerate'?[p.x*p.x]:p.equality?[p.y]:[];
  const normals:Vec2[]=p.kind==='halfplanes'?[[1,0],n]:[],equalityNormals:Vec2[]=p.kind==='degenerate'?[[2*p.x,0]]:p.equality?[[0,1]]:[];
  const active=inequalities.flatMap((g,i)=>Math.abs(g)<1e-8?[i]:[]),gradients=[...equalityNormals,...active.map(i=>normals[i])];
  const rank=nullBasis(gradients.map(r=>[...r]),2).rank,feasible=inequalities.every(g=>g<=1e-8)&&equalities.every(h=>Math.abs(h)<1e-8);
  return {z,n,inequalities,equalities,normals,equalityNormals,active,rank,count:gradients.length,feasible,licq:feasible&&rank===gradients.length,
    contains:(x:number,y:number)=>p.kind==='degenerate'?Math.abs(x)<.04:x<=0&&n[0]*x+n[1]*y<=p.offset};
}

export interface KKTParams {x:number;y:number;targetX:number;targetY:number;bound:number;level:number;lambda:number;mu:number;}
export const kktDefaults:KKTParams={x:1,y:0,targetX:2,targetY:1,bound:1,level:0,lambda:2,mu:1};
export function computeKKT(p:Readonly<KKTParams>) {
  const z:Vec2=[p.x,p.y],g=p.x-p.bound,h=p.y-p.level,gradient:Vec2=[p.x-p.targetX,2*(p.y-p.targetY)];
  const weightedG:Vec2=[p.mu,0],weightedH:Vec2=[0,p.lambda],stationarity:Vec2=[gradient[0]+p.mu,gradient[1]+p.lambda];
  const optimum:Vec2=[Math.min(p.targetX,p.bound),p.level],optimalMu=Math.max(0,p.targetX-p.bound),optimalLambda=-2*(p.level-p.targetY);
  const value=(x:number,y:number)=>((x-p.targetX)**2+2*(y-p.targetY)**2)/2;
  const primal=Math.hypot(Math.max(0,g),h),dual=Math.max(0,-p.mu),complementarity=Math.abs(p.mu*g);
  return {z,g,h,gradient,weightedG,weightedH,stationarity,primal,dual,complementarity,stationarityNorm:norm(stationarity),
    kkt:Math.max(primal,dual,complementarity,norm(stationarity))<1e-8,optimum,optimalMu,optimalLambda,value,
    lagrangian:(x:number,y:number)=>value(x,y)+p.mu*(x-p.bound)+p.lambda*(y-p.level)};
}

export interface CurvatureParams {kind:'circle'|'weak-inequality';angle:number;radius:number;linear:number;curvature:number;lambda:number;normalMix:number;direction:number;arc:number;}
export const curvatureDefaults:CurvatureParams={kind:'circle',angle:-90,radius:1,linear:1,curvature:0,lambda:.5,normalMix:0,direction:0,arc:.3};
export function computeCurvature(p:Readonly<CurvatureParams>) {
  if(p.kind==='weak-inequality'){
    const d:Vec2=[Math.cos(degrees(p.direction)),Math.sin(degrees(p.direction))];
    return {z:[0,0] as Vec2,tangent:[0,1] as Vec2,d,normal:[-1,0] as Vec2,H:[[-2,0],[0,2]] as Matrix,
      stationarity:0,tangency:-d[0],tangentCurvature:2,directionalCurvature:-2*d[0]**2+2*d[1]**2,
      critical:d[0]>=-1e-10,classification:'KKT e test ristretto superati, ma non minimo: f(t,0)=−t² per t>0',
      value:(x:number,y:number)=>-x*x+y*y,feasiblePoint:[p.arc,0] as Vec2,linearPoint:[p.arc*d[0],p.arc*d[1]] as Vec2,constraintError:Math.max(0,-p.arc*d[0])};
  }
  const a=degrees(p.angle),normal:Vec2=[Math.cos(a),Math.sin(a)],z:Vec2=[p.radius*normal[0],p.radius*normal[1]],tangent:Vec2=[-normal[1],normal[0]],length=Math.hypot(1,p.normalMix),
    d:Vec2=[(tangent[0]+p.normalMix*normal[0])/length,(tangent[1]+p.normalMix*normal[1])/length];
  const H:Matrix=[[p.curvature+2*p.lambda,0],[0,2*p.lambda]],g=[p.curvature*z[0],p.linear],stationarity=norm(axpy(g,z,2*p.lambda));
  const tangentCurvature=dot(tangent,matvec(H,[...tangent])),directionalCurvature=dot(d,matvec(H,[...d]));
  const feasiblePoint:Vec2=[p.radius*Math.cos(a+p.arc/p.radius),p.radius*Math.sin(a+p.arc/p.radius)],linearPoint:Vec2=[z[0]+p.arc*d[0],z[1]+p.arc*d[1]];
  const classification=stationarity>1e-7?'Il punto e il moltiplicatore non soddisfano la stazionarietà':tangentCurvature>1e-8?'Minimo locale stretto sulla circonferenza':tangentCurvature< -1e-8?'Massimo locale sulla circonferenza':'Curvatura tangente nulla: test inconcludente';
  return {z,tangent,d,normal,H,stationarity,tangency:2*dot(z,d),tangentCurvature,directionalCurvature,critical:Math.abs(dot(z,d))<1e-8,classification,
    value:(x:number,y:number)=>p.curvature*x*x/2+p.linear*y,feasiblePoint,linearPoint,constraintError:dot(linearPoint,linearPoint)-p.radius*p.radius};
}

export interface QPParams {q11:number;q22:number;cross:number;linearX:number;linearY:number;angle:number;offset:number;}
export const qpDefaults:QPParams={q11:-1,q22:2,cross:0,linearX:1,linearY:-1,angle:0,offset:1};
export function computeConstrainedQP(p:Readonly<QPParams>) {
  const H:Matrix=[[p.q11,p.cross],[p.cross,p.q22]],q=[p.linearX,p.linearY],n:Vec2=[Math.cos(degrees(p.angle)),Math.sin(degrees(p.angle))],t:Vec2=[-n[1],n[0]],base:Vec2=[p.offset*n[0],p.offset*n[1]];
  const reduced=dot(t,matvec(H,[...t])),linear=dot(t,axpy(matvec(H,[...base]),q)),value=(x:number,y:number)=>dot([x,y],matvec(H,[x,y]))/2+dot(q,[x,y]);
  let status:string,solution:Vec2|undefined,lambda:number|undefined;
  if(reduced>1e-9){solution=v2(axpy(base,t,-linear/reduced));lambda=-dot(n,axpy(matvec(H,[...solution]),q));status='Minimo unico sul vincolo';}
  else if(Math.abs(reduced)<=1e-9&&Math.abs(linear)<=1e-9){solution=base;lambda=-dot(n,axpy(matvec(H,[...base]),q));status='Infiniti minimi sul vincolo';}
  else status='Costo illimitato inferiormente sul vincolo';
  const kkt=solveEqualityQP(H,q,[[...n]],[p.offset],false);
  return {H,q,n,t,base,reduced,linear,status,solution,lambda,value,kkt,spectrum:eigenvalues(H as [[number,number],[number,number]]),
    residual:solution&&lambda!==undefined?norm([...axpy(axpy(matvec(H,[...solution]),q),n,lambda),dot(n,solution)-p.offset]):undefined};
}

export interface NLPParams {constraint:'parabola'|'circle'|'line'|'degenerate';targetX:number;targetY:number;shape:number;offset:number;x:number;y:number;lambda:number;model:SolverOptions['model'];lineSearch:SolverOptions['lineSearch'];regularization:number;adaptive:number;penalty:number;adaptivePenalty:number;beta:number;c:number;step:number;iterations:number;}
export const nlpDefaults:NLPParams={constraint:'parabola',targetX:1,targetY:0,shape:1,offset:0,x:.8,y:.5,lambda:0,model:'lagrangian',lineSearch:'merit',regularization:0,adaptive:1,penalty:2,adaptivePenalty:1,beta:.5,c:.1,step:1,iterations:35};
export function makeProblem(p:Pick<NLPParams,'constraint'|'targetX'|'targetY'|'shape'|'offset'>):SmoothProblem {
  const value=(z:Vector)=>((z[0]-p.targetX)**2+(z[1]-p.targetY)**2)/2;
  return {dimension:2,value,gradient:z=>[z[0]-p.targetX,z[1]-p.targetY],hessian:()=>identity(2),
    equalities:([x,y])=>[p.constraint==='parabola'?y-p.shape*x*x-p.offset:p.constraint==='circle'?x*x+y*y-p.shape*p.shape:p.constraint==='line'?x+y-p.offset:x*x],
    jacobian:([x,y])=>[p.constraint==='parabola'?[-2*p.shape*x,1]:p.constraint==='circle'?[2*x,2*y]:p.constraint==='line'?[1,1]:[2*x,0]],
    equalityHessians:()=>[p.constraint==='parabola'?[[-2*p.shape,0],[0,0]]:p.constraint==='circle'?[[2,0],[0,2]]:p.constraint==='line'?[[0,0],[0,0]]:[[2,0],[0,0]]],
  };
}
export function optionsFrom(p:Readonly<NLPParams>,mode:'newton'|'sqp'):SolverOptions {
  return {...solverDefaults,mode,model:p.model,lineSearch:p.lineSearch,initialStep:p.step,beta:p.beta,c:p.c,penalty:p.penalty,adaptivePenalty:!!p.adaptivePenalty,regularization:p.regularization,adaptiveRegularization:!!p.adaptive,maxIterations:p.iterations};
}
export function computeNLP(p:Readonly<NLPParams>,mode:'newton'|'sqp'='sqp') {
  const problem=makeProblem(p),options=optionsFrom(p,mode),result=solveSQP(problem,[p.x,p.y],[p.lambda],options);
  return {...result,problem,options};
}
export interface MeritParams extends NLPParams {}
export const meritDefaults:MeritParams={...nlpDefaults,x:1,y:0,model:'identity',adaptivePenalty:0,penalty:2};
export function computeMerit(p:Readonly<MeritParams>) {
  const problem=makeProblem(p),options=optionsFrom(p,'sqp'),z=[p.x,p.y],s=formStep(problem,z,[p.lambda],options);
  const penalty=p.adaptivePenalty&&s.lambdaQP?Math.max(p.penalty,...s.lambdaQP.map(v=>Math.abs(v)+1)):p.penalty;
  const search=s.d&&s.lambdaQP?searchMerit(problem,z,s.d,penalty,options,{B:s.B,lambdaQP:s.lambdaQP}):{step:0,slope:NaN,trials:[],status:'failed'};
  return {problem,options,z,s,penalty,search};
}

export interface BarrierEqParams {epsilon:number;shrink:number;stages:number;size:number;sum:number;targetX:number;targetY:number;x:number;y:number;}
export const barrierEqDefaults:BarrierEqParams={epsilon:.5,shrink:.2,stages:4,size:1.5,sum:0,targetX:3,targetY:0,x:0,y:0};
export function makeBarrierProblem(p:Readonly<BarrierEqParams>,epsilon:number):SmoothProblem {
  const f=barrierObjective(p,epsilon);
  return {dimension:2,value:z=>f.value(v2(z)),gradient:z=>[...f.gradient(v2(z))],hessian:z=>f.hessian(v2(z)).map(r=>[...r]),
    equalities:z=>[z[0]+z[1]-p.sum],jacobian:()=>[[1,1]],equalityHessians:()=>[[[0,0],[0,0]]],interior:z=>Math.max(...z.map(Math.abs))<p.size};
}
export function barrierEqualityCenter(p:Readonly<BarrierEqParams>,epsilon:number):Vec2|undefined {
  let lo=Math.max(-p.size,p.sum-p.size),hi=Math.min(p.size,p.sum+p.size);
  if(lo>=hi)return undefined;const f=makeBarrierProblem(p,epsilon);
  for(let i=0;i<80;i++){const x=(lo+hi)/2,g=f.gradient([x,p.sum-x]);if(g[0]-g[1]>0)hi=x;else lo=x;}
  const x=(lo+hi)/2;return [x,p.sum-x];
}
export function computeBarrierEquality(p:Readonly<BarrierEqParams>) {
  if(!(p.epsilon>0&&p.shrink>0&&p.shrink<1&&p.size>0))throw new Error('Parametri della barriera non validi.');
  const points:(SolverIterate&{epsilon:number;stage:number})[]=[],centers:Vec2[]=[];
  if(Math.abs(p.sum)>=2*p.size)return {points,centers,status:'Nessun punto strettamente interno soddisfa l’uguaglianza',valid:false};
  let z=[p.x,p.y],lambda=[0],status='Stadi completati';
  for(let stage=0;stage<Math.min(6,p.stages);stage++){
    const epsilon=p.epsilon*p.shrink**stage,problem=makeBarrierProblem(p,epsilon),center=barrierEqualityCenter(p,epsilon)!;
    centers.push(center);
    const result=solveSQP(problem,z,lambda,{model:'objective',adaptiveRegularization:false,adaptivePenalty:true,maxIterations:50,tolerance:1e-7});
    points.push(...result.points.map(q=>({...q,epsilon,stage})));
    if(!result.converged){status=result.status;break;}z=result.points.at(-1)!.z;lambda=result.points.at(-1)!.lambda;
  }
  return {points,centers,status,valid:points.length>0};
}

export interface TimeParams {horizon:number;time:number;initial:number;target:number;a:number;b:number;stateWeight:number;inputWeight:number;terminalWeight:number;step:number;iterations:number;}
export const timeDefaults:TimeParams={horizon:8,time:3,initial:2,target:1,a:1,b:1,stateWeight:.2,inputWeight:1,terminalWeight:5,step:.4,iterations:12};
export function computeTime(p:Readonly<TimeParams>) {
  const N=Math.min(20,Math.max(2,Math.round(p.horizon))),n=2*N+1,Q=identity(n).map(row=>row.map(()=>0)),q=Array(n).fill(0) as Vector;
  for(let i=0;i<N;i++){Q[i][i]=p.stateWeight;Q[N+1+i][N+1+i]=p.inputWeight;}
  Q[N][N]=p.terminalWeight;q[N]=-p.terminalWeight*p.target;
  const A:Matrix=[Array.from({length:n},(_,i)=>Number(i===0))],rhs=[p.initial];
  for(let t=0;t<N;t++){const row=Array(n).fill(0) as Vector;row[t]=-p.a;row[t+1]=1;row[N+1+t]=-p.b;A.push(row);rhs.push(0);}
  const initial=Array(n).fill(0) as Vector;initial[0]=p.initial;for(let t=0;t<N;t++)initial[t+1]=p.a*initial[t];
  const problem:SmoothProblem={dimension:n,value:z=>dot(z,matvec(Q,z))/2+dot(q,z)+p.terminalWeight*p.target*p.target/2,
    gradient:z=>axpy(matvec(Q,z),q),hessian:()=>Q,equalities:z=>axpy(matvec(A,z),rhs,-1),jacobian:()=>A,lagrangianHessian:()=>Q};
  const result=solveSQP(problem,initial,undefined,{model:'objective',lineSearch:'full',adaptiveRegularization:false,initialStep:p.step,maxIterations:p.iterations});
  const reference=solveEqualityQP(Q,q,A,rhs);
  return {...result,N,problem,reference,time:Math.min(N,Math.max(0,Math.round(p.time))),
    trajectories:result.points.map(z=>({x:z.z.slice(0,N+1),u:z.z.slice(N+1)}))};
}
export { formStep,residuals };
