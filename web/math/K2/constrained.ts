import { solveEqualityQP,nullBasis,matvec,axpy,dot,norm,transposeMultiply,type Matrix } from '../O3/solver';
export interface BoundParams {a:number;b:number;initial:number;target:number;horizon:number;q:number;r:number;terminalWeight:number;initialMode:'fixed'|'free';endpoint:number;inputBounds:number;stateBounds:number;limit:number;lower:number;upper:number;iterations:number;}
export const boundDefaults:BoundParams={a:1,b:.5,initial:0,target:1,horizon:5,q:1,r:.2,terminalWeight:4,initialMode:'fixed',endpoint:0,inputBounds:1,stateBounds:0,limit:.4,lower:-.5,upper:1.4,iterations:80};
export interface Inequality {row:number[];bound:number;label:string;time:number;kind:'u+'|'u-'|'x+'|'x-';}
export function assemble(p:Readonly<BoundParams>){
  const N=Math.round(p.horizon),D=2*N+1;if(!Object.values(p).every(v=>typeof v!=='number'||Number.isFinite(v))||N!==p.horizon||N<2||N>8||p.a<=0||p.b<=0||p.q<=0||p.r<=0||p.terminalWeight<0||p.limit<=0||p.lower>=p.upper||p.iterations<1||!Number.isInteger(p.iterations)||p.iterations>150)throw new Error('Parametri, pesi, intervalli o budget non validi.');
  const reference=Array.from({length:N+1},(_,t)=>p.target*t/N),H:Matrix=Array.from({length:D},()=>Array(D).fill(0)),linear=Array(D).fill(0) as number[];
  for(let t=0;t<=N;t++){const w=t===N?p.terminalWeight:p.q;H[t][t]=w;linear[t]=-w*reference[t];}for(let t=0;t<N;t++)H[N+1+t][N+1+t]=p.r;
  const A:Matrix=Array.from({length:N},(_,t)=>{const row=Array(D).fill(0) as number[];row[t]=p.a;row[t+1]=-1;row[N+1+t]=p.b;return row;}),rhs=Array(N).fill(0) as number[];
  const unit=(j:number,sign=1)=>{const row=Array(D).fill(0) as number[];row[j]=sign;return row;};
  if(p.initialMode==='fixed'){A.push(unit(0));rhs.push(p.initial);}if(p.endpoint){A.push(unit(N));rhs.push(p.target);}
  const constraints:Inequality[]=[];for(let t=0;t<N;t++){if(p.inputBounds)constraints.push({row:unit(N+1+t),bound:p.limit,label:`u${t} − U`,time:t,kind:'u+'},{row:unit(N+1+t,-1),bound:p.limit,label:`−u${t} − U`,time:t,kind:'u-'});if(p.stateBounds)constraints.push({row:unit(t),bound:p.upper,label:`x${t} − H`,time:t,kind:'x+'},{row:unit(t,-1),bound:-p.lower,label:`L − x${t}`,time:t,kind:'x-'});}
  const cost=(z:readonly number[])=>{const stage=Array.from({length:N},(_,t)=>(p.q*(z[t]-reference[t])**2+p.r*z[N+1+t]**2)/2),terminal=p.terminalWeight*(z[N]-reference[N])**2/2;return {stage,terminal,total:stage.reduce((a,b)=>a+b,0)+terminal};};
  return {N,D,H,linear,A,rhs,constraints,reference,cost};
}
export type BoundProblem=ReturnType<typeof assemble>;
export function feasibility(p:Readonly<BoundParams>,d=assemble(p)){
  const N=d.N,U=p.inputBounds?p.limit:Infinity,L=p.stateBounds?p.lower:-Infinity,H=p.stateBounds?p.upper:Infinity,intervals:[number,number][]=[[p.initialMode==='fixed'?p.initial:L,p.initialMode==='fixed'?p.initial:H]];
  intervals[0]=[Math.max(intervals[0][0],L),Math.min(intervals[0][1],H)];
  if(intervals[0][0]>intervals[0][1]+1e-10)return {intervals,seed:undefined,status:'Inammissibile: lo stato iniziale fissato è fuori dalla fascia di percorso.'};
  for(let t=0;t<N;t++){const lo=p.a*intervals[t][0]-p.b*U,hi=p.a*intervals[t][1]+p.b*U,next:[number,number]=t+1<N?[Math.max(lo,L),Math.min(hi,H)]:[lo,hi];intervals.push(next);if(next[0]>next[1]+1e-10)return {intervals,seed:undefined,status:`Inammissibile: insieme raggiungibile vuoto al tempo ${t+1}.`};}
  const [lo,hi]=intervals[N];if(p.endpoint&&(p.target<lo-1e-10||p.target>hi+1e-10))return {intervals,seed:undefined,status:'Inammissibile: il terminale imposto è fuori dall’intervallo raggiungibile.'};
  const states=Array(N+1).fill(0) as number[],inputs=Array(N).fill(0) as number[];states[N]=p.endpoint?p.target:Math.max(lo,Math.min(hi,p.target));
  for(let t=N-1;t>=0;t--){const lower=Math.max(intervals[t][0],(states[t+1]-p.b*U)/p.a),upper=Math.min(intervals[t][1],(states[t+1]+p.b*U)/p.a);states[t]=Math.max(lower,Math.min(upper,d.reference[t]));inputs[t]=(states[t+1]-p.a*states[t])/p.b;}
  return {intervals,seed:[...states,...inputs],status:'Partenza ammissibile ricostruita con intervalli raggiungibili.'};
}
export function kktResidual(d:BoundProblem,z:number[],lambda:number[],mu:number[]){
  const h=axpy(matvec(d.A,z),d.rhs,-1),g=d.constraints.map(c=>dot(c.row,z)-c.bound),gradient=axpy(matvec(d.H,z),d.linear),stationarity=axpy(axpy(gradient,transposeMultiply(d.A,lambda,d.D)),transposeMultiply(d.constraints.map(c=>c.row),mu,d.D)),primalEq=norm(h),primalIneq=Math.max(0,...g),dual=Math.max(0,...mu.map(v=>-v)),products=mu.map((v,j)=>v*g[j]),complementarity=Math.max(0,...products.map(Math.abs)),stationarityNorm=norm(stationarity),active=g.flatMap((v,j)=>Math.abs(v)<1e-8?[j]:[]),rank=nullBasis([...d.A,...active.map(j=>d.constraints[j].row)],d.D).rank,regular=rank===d.A.length+active.length;
  return {h,g,gradient,stationarity,primalEq,primalIneq,dual,products,complementarity,stationarityNorm,active,rank,regular,kkt:Math.max(primalEq,primalIneq,dual,complementarity,stationarityNorm)<1e-7};
}
export interface BoundPoint {z:number[];lambda:number[];mu:number[];cost:number;working:number[];action:string;residual:ReturnType<typeof kktResidual>;}
export interface BoundResult {problem:BoundProblem;points:BoundPoint[];status:string;converged:boolean;reachability:ReturnType<typeof feasibility>;}
/** Primal active set: feasible start, equality QP steps, independent working rows. */
export function solveConstrained(p:Readonly<BoundParams>):BoundResult {
  const problem=assemble(p),d=problem,reachability=feasibility(p,d),points:BoundPoint[]=[];if(!reachability.seed)return {problem,points,status:reachability.status,converged:false,reachability};
  let z=[...reachability.seed],working:number[]=[],lambda=Array(d.A.length).fill(0) as number[],mu=Array(d.constraints.length).fill(0) as number[];
  const rows=()=>[...d.A,...working.map(j=>d.constraints[j].row)],independent=(j:number)=>nullBasis([...rows(),d.constraints[j].row],d.D).rank===rows().length+1;
  for(let j=0;j<d.constraints.length;j++)if(Math.abs(dot(d.constraints[j].row,z)-d.constraints[j].bound)<1e-8&&independent(j))working.push(j);
  const push=(action:string)=>points.push({z:[...z],lambda:[...lambda],mu:[...mu],cost:d.cost(z).total,working:[...working],action,residual:kktResidual(d,z,lambda,mu)});
  push('Partenza ammissibile');
  for(let k=0;k<p.iterations;k++){
    const gradient=axpy(matvec(d.H,z),d.linear),W=rows(),qp=solveEqualityQP(d.H,gradient,W,Array(W.length).fill(0));if(!qp.z||!qp.multipliers)return {problem,points,status:'Sottoproblema non risolto: '+qp.status,converged:false,reachability};
    const direction=qp.z;lambda=qp.multipliers.slice(0,d.A.length);mu=Array(d.constraints.length).fill(0);working.forEach((j,i)=>mu[j]=qp.multipliers![d.A.length+i]);
    if(norm(direction)<1e-9*(1+norm(z))){
      const drop=working.filter(j=>mu[j]<-1e-8).sort((a,b)=>mu[a]-mu[b]||a-b)[0];if(drop===undefined){push('Condizioni KKT verificate');const ok=points.at(-1)!.residual.kkt;return {problem,points,status:ok?'Minimo globale del QP convesso: tutte le condizioni KKT verificate.':'Arresto numerico: residui da verificare.',converged:ok,reachability};}
      working=working.filter(j=>j!==drop);push('Rimuovi vincolo con μ negativo: '+d.constraints[drop].label);continue;
    }
    let step=1,blocker=-1;for(let j=0;j<d.constraints.length;j++)if(!working.includes(j)){const slope=dot(d.constraints[j].row,direction);if(slope>1e-10){const alpha=Math.max(0,(d.constraints[j].bound-dot(d.constraints[j].row,z))/slope);if(alpha<step-1e-12||(Math.abs(alpha-step)<1e-12&&blocker<0)){step=Math.min(step,alpha);blocker=j;}}}
    z=axpy(z,direction,step);let action='Passo QP completo';if(blocker>=0&&step<1-1e-10){if(independent(blocker)){working.push(blocker);action='Attiva '+d.constraints[blocker].label;}else action='Passo su vincolo dipendente';}push(action);
  }
  return {problem,points,status:'Budget raggiunto: candidato ammissibile, KKT non ancora certificate.',converged:false,reachability};
}
export interface InspectParams extends BoundParams {editTime:number;stateShift:number;inputShift:number;lambdaShift:number;boundaryShift:number;muIndex:number;muShift:number;}
export const inspectDefaults:InspectParams={...boundDefaults,editTime:2,stateShift:0,inputShift:0,lambdaShift:0,boundaryShift:0,muIndex:1,muShift:0};
export function inspect(p:Readonly<InspectParams>,result=solveConstrained(p)){
  const point=result.points.at(-1);if(!point)return {result,point:undefined};const d=result.problem,t=Math.max(0,Math.min(d.N,Math.round(p.editTime))),z=[...point.z],lambda=[...point.lambda],mu=[...point.mu],j=mu.length?Math.max(0,Math.min(mu.length-1,Math.round(p.muIndex))):-1;z[t]+=p.stateShift;z[d.N+1+Math.min(t,d.N-1)]+=p.inputShift;lambda[Math.max(0,t-1)]+=p.lambdaShift;if(lambda.length>d.N)lambda[d.N]+=p.boundaryShift;if(j>=0)mu[j]+=p.muShift;
  return {result,point:{...point,z,lambda,mu,cost:d.cost(z).total,residual:kktResidual(d,z,lambda,mu)},t,j};
}
