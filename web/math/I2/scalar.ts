import { solveEqualityQP,solveSQP,solverDefaults,type SmoothProblem,type SolverIterate } from '../O3/solver';

export interface ScalarParams {
  a:number;b:number;initial:number;target:number;horizon:number;q:number;r:number;terminalWeight:number;
  reference:'step'|'ramp'|'sine';limit:number;lower:number;upper:number;bounds:number;endpoint:number;
  editTime:number;editDelta:number;input:number;outputGain:number;outputDirect:number;
}
export const scalarDefaults:ScalarParams={a:1,b:.3,initial:0,target:1,horizon:12,q:1,r:.2,terminalWeight:5,reference:'step',limit:1,lower:-.5,upper:1.5,bounds:0,endpoint:0,editTime:5,editDelta:.3,input:.2,outputGain:1,outputDirect:0};
export function scalarReference(p:ScalarParams){const N=Math.round(p.horizon);return Array.from({length:N+1},(_,t)=>p.reference==='step'?(t<N/3?0:p.target):p.reference==='ramp'?p.target*t/N:p.target*Math.sin(Math.PI*t/N));}
export function scalarRollout(p:ScalarParams,inputs:readonly number[]){const states=[p.initial];for(const u of inputs)states.push(p.a*states.at(-1)!+p.b*u);return states;}
export function scalarResidual(p:ScalarParams,states:readonly number[],inputs:readonly number[]){return inputs.map((u,t)=>states[t+1]-(p.a*states[t]+p.b*u));}
export function scalarCosts(p:ScalarParams,states:readonly number[],inputs:readonly number[]){
  const reference=scalarReference(p),tracking=inputs.map((_,t)=>p.q*(states[t]-reference[t])**2/2),effort=inputs.map(u=>p.r*u*u/2),terminal=p.terminalWeight*(states.at(-1)!-reference.at(-1)!)**2/2;
  return {tracking,effort,terminal,total:tracking.reduce((a,b)=>a+b,0)+effort.reduce((a,b)=>a+b,0)+terminal};
}
export function computeResidual(p:ScalarParams){const N=Math.round(p.horizon),inputs=Array.from({length:N},(_,t)=>p.input*Math.cos(2*Math.PI*t/N)),states=scalarRollout(p,inputs),edited=[...states],at=Math.min(N,Math.max(1,Math.round(p.editTime)));edited[at]+=p.editDelta;
  return {N,inputs,states,edited,at,residual:scalarResidual(p,edited,inputs)};
}
export function scalarQP(p:ScalarParams){
  const N=Math.round(p.horizon),D=2*N,reference=scalarReference(p),H=Array.from({length:D},()=>Array(D).fill(0) as number[]),linear=Array(D).fill(0) as number[];
  for(let t=1;t<=N;t++){const weight=t===N?p.terminalWeight:p.q;H[t-1][t-1]=weight;linear[t-1]=-weight*reference[t];}
  for(let t=0;t<N;t++)H[N+t][N+t]=p.r;
  const A=Array.from({length:N},(_,t)=>{const row=Array(D).fill(0) as number[];row[t]=1;if(t>0)row[t-1]=-p.a;row[N+t]=-p.b;return row;}),rhs=Array(N).fill(0) as number[];rhs[0]=p.a*p.initial;
  if(p.endpoint){const row=Array(D).fill(0) as number[];row[N-1]=1;A.push(row);rhs.push(reference[N]);}
  return {N,D,H,linear,A,rhs,reference};
}
export function computeScalarControl(p:ScalarParams){
  const d=scalarQP(p),{N,D,H,linear,A,rhs,reference}=d,initial=[...scalarRollout(p,Array(N).fill(0)).slice(1),...Array(N).fill(0)],points:SolverIterate[]=[];
  const decode=(z:number[])=>({states:[p.initial,...z.slice(0,N)],inputs:z.slice(N)});
  const baseValue=(z:number[])=>scalarCosts(p,decode(z).states,decode(z).inputs).total;
  const margins=(z:number[])=>[...z.slice(0,N).flatMap(x=>[x-p.lower,p.upper-x]),...z.slice(N).flatMap(u=>[u+p.limit,p.limit-u])];
  let status='Minimo globale del QP convesso',converged=true;
  if(p.r<=0)throw new Error('R deve essere positivo.');
  if(p.bounds&&(p.initial<=p.lower||p.initial>=p.upper||p.lower>=p.upper||p.limit<=0))return {N,reference,points,trajectories:[],status:'Stato iniziale o limiti senza interno strettamente ammissibile.',converged:false};
  if(p.bounds&&p.endpoint&&(reference[N]<=p.lower||reference[N]>=p.upper))return {N,reference,points,trajectories:[],status:'Obiettivo terminale fuori dall’interno della fascia: il metodo a barriera non può imporlo.',converged:false};
  const make=(epsilon:number):SmoothProblem=>({dimension:D,
    value:z=>baseValue(z)-(p.bounds?epsilon*margins(z).reduce((s,v)=>s+Math.log(v),0):0),
    gradient:z=>z.map((v,i)=>H[i][i]*v+linear[i]+(p.bounds?i<N?epsilon*(-1/(v-p.lower)+1/(p.upper-v)):epsilon*(-1/(v+p.limit)+1/(p.limit-v)):0)),
    hessian:z=>H.map((row,i)=>row.map((v,j)=>v+(p.bounds&&i===j?i<N?epsilon*(1/(z[i]-p.lower)**2+1/(p.upper-z[i])**2):epsilon*(1/(z[i]+p.limit)**2+1/(p.limit-z[i])**2):0))),
    equalities:z=>A.map((row,i)=>row.reduce((s,v,j)=>s+v*z[j],0)-rhs[i]),jacobian:()=>A,equalityHessians:()=>A.map(()=>Array.from({length:D},()=>Array(D).fill(0))),
    interior:z=>!p.bounds||margins(z).every(v=>v>0),
  });
  if(!p.bounds){
    const qp=solveEqualityQP(H,linear,A,rhs);if(qp.z){const pb=make(0),push=(z:number[],lambda:number[])=>{const h=pb.equalities(z),dual=pb.gradient(z).map((v,i)=>v+A.reduce((s,row,j)=>s+row[i]*lambda[j],0));points.push({z,lambda,cost:baseValue(z),primal:Math.hypot(...h),dual:Math.hypot(...dual),residual:Math.hypot(...h,...dual),penalty:0,step:1,regularization:0,backtracks:0});};push(initial,Array(A.length).fill(0));push(qp.z,qp.multipliers!);}
    else{status='Vincoli degeneri o incompatibili: '+qp.status;converged=false;}
  }else {
    let z=initial,lambda=Array(A.length).fill(0) as number[];
    for(const epsilon of [.1,.02,.004]){const result=solveSQP(make(epsilon),z,lambda,{...solverDefaults,adaptiveRegularization:false,model:'objective',maxIterations:45,tolerance:1e-7});points.push(...result.points.map(point=>({...point,cost:baseValue(point.z)})));if(!result.points.length||!result.converged){status=result.status;converged=false;break;}z=result.points.at(-1)!.z;lambda=result.points.at(-1)!.lambda;}
    if(converged)status='Minimo della barriera convessa, ε finale=0,004; approssimazione del problema vincolato.';
  }
  const trajectories=points.map(point=>{const data=decode(point.z),cost=scalarCosts(p,data.states,data.inputs),residual=scalarResidual(p,data.states,data.inputs),pathViolation=Math.max(0,...data.inputs.map(u=>Math.abs(u)-p.limit),...data.states.map(x=>Math.max(p.lower-x,x-p.upper)));
    return {...data,cost,residual,pathViolation,endpointResidual:data.states[N]-reference[N],outputs:data.states.map((x,t)=>p.outputGain*x+p.outputDirect*(data.inputs[t]??0))};});
  return {N,reference,points,trajectories,status,converged};
}
