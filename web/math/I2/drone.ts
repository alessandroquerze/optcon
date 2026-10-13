import { dot,norm,axpy,matvec,solveEqualityQP,searchMerit,residuals,type Matrix,type SmoothProblem } from '../O3/solver';
export type State=[number,number,number,number,number,number];
export type Thrust=[number,number];
export interface Physics {mass:number;inertia:number;length:number;gravity:number;dt:number;}
export const physicsDefaults:Physics={mass:1,inertia:.03,length:.35,gravity:9.81,dt:.2};
export function droneField(x:readonly number[],u:readonly number[],p:Physics):State {
  const sum=u[0]+u[1];return [x[1],-sum*Math.sin(x[4])/p.mass,x[3],sum*Math.cos(x[4])/p.mass-p.gravity,x[5],p.length*(u[0]-u[1])/(2*p.inertia)];
}
export function droneStep(x:readonly number[],u:readonly number[],p:Physics):State {return axpy(x,droneField(x,u,p),p.dt) as State;}
export function droneJacobians(x:readonly number[],u:readonly number[],p:Physics){
  const A=Array.from({length:6},(_,i)=>Array.from({length:6},(_,j)=>Number(i===j))),B=Array.from({length:6},()=>[0,0]),sum=u[0]+u[1],s=Math.sin(x[4]),c=Math.cos(x[4]);
  A[0][1]=p.dt;A[2][3]=p.dt;A[4][5]=p.dt;A[1][4]=-p.dt*sum*c/p.mass;A[3][4]=-p.dt*sum*s/p.mass;
  B[1]=[-p.dt*s/p.mass,-p.dt*s/p.mass];B[3]=[p.dt*c/p.mass,p.dt*c/p.mass];B[5]=[p.dt*p.length/(2*p.inertia),-p.dt*p.length/(2*p.inertia)];return {A,B};
}
export function droneRollout(initial:State,inputs:Thrust[],p:Physics){const states:State[]=[[...initial]];for(const u of inputs){const next=droneStep(states.at(-1)!,u,p);if(!next.every(Number.isFinite)||norm(next)>1e5)throw new Error('Traiettoria oltre il limite numerico: riduci orizzonte, passo o spinte.');states.push(next);}return states;}
export interface FlightParams extends Physics {horizon:number;x0:number;y0:number;theta0:number;u1:number;u2:number;}
export const flightDefaults:FlightParams={...physicsDefaults,horizon:20,x0:0,y0:1,theta0:0,u1:4.905,u2:4.905};
export function computeFlight(p:FlightParams){const N=Math.round(p.horizon),inputs=Array.from({length:N},()=>[p.u1,p.u2] as Thrust),states=droneRollout([p.x0,0,p.y0,0,p.theta0,0],inputs,p);return {N,inputs,states,times:states.map((_,t)=>t*p.dt),hover:p.mass*p.gravity/2};}

export interface DroneParams extends Physics {
  horizon:number;initialX:number;initialY:number;targetX:number;targetY:number;reference:'move'|'step'|'hover'|'sine';inputReference:'zero'|'hover';
  qx:number;qvx:number;qy:number;qvy:number;qtheta:number;qomega:number;r1:number;r2:number;
  terminalPosition:number;terminalVelocity:number;terminalAngle:number;terminalOmega:number;
  limits:number;minThrust:number;maxThrust:number;minY:number;maxY:number;maxAngle:number;maxOmega:number;endpoint:number;
  epsilon:number;iterations:number;
}
export const droneDefaults:DroneParams={...physicsDefaults,horizon:16,initialX:0,initialY:1,targetX:1,targetY:1.3,reference:'move',inputReference:'zero',qx:8,qvx:1,qy:8,qvy:1,qtheta:.5,qomega:.1,r1:.02,r2:.02,terminalPosition:30,terminalVelocity:3,terminalAngle:1,terminalOmega:.3,limits:1,minThrust:.2,maxThrust:12,minY:.2,maxY:2.5,maxAngle:.7,maxOmega:2.5,endpoint:0,epsilon:.004,iterations:35};
export function validateDrone(p:DroneParams){
  if(!Object.values(p).every(v=>typeof v!=='number'||Number.isFinite(v))||p.mass<=0||p.inertia<=0||p.length<=0||p.dt<=0||p.gravity<=0||!Number.isInteger(p.horizon)||p.horizon<4||p.horizon>40||p.r1<=0||p.r2<=0||p.epsilon<=0||p.iterations<1)throw new Error('Parametri fisici, pesi o budget non validi.');
  if([p.qx,p.qvx,p.qy,p.qvy,p.qtheta,p.qomega,p.terminalPosition,p.terminalVelocity,p.terminalAngle,p.terminalOmega].some(v=>v<0))throw new Error('Q e QT devono essere semidefinite positive.');
}
export function droneReference(p:DroneParams):State[]{
  const N=p.horizon,T=N*p.dt;return Array.from({length:N+1},(_,t)=>{
    const s=t/N,shape=p.reference==='move'?s*s*s*(10+s*(-15+6*s)):p.reference==='sine'?(1-Math.cos(Math.PI*s))/2:p.reference==='step'?Number(s>=.35):1,
      velocity=p.reference==='move'?30*s*s*(1-s)**2/T:p.reference==='sine'?Math.PI*Math.sin(Math.PI*s)/(2*T):0;
    return [p.initialX+(p.targetX-p.initialX)*shape,(p.targetX-p.initialX)*velocity,p.initialY+(p.targetY-p.initialY)*shape,(p.targetY-p.initialY)*velocity,0,0];
  });
}
const weights=(p:DroneParams)=>({Q:[p.qx,p.qvx,p.qy,p.qvy,p.qtheta,p.qomega],QT:[p.terminalPosition,p.terminalVelocity,p.terminalPosition,p.terminalVelocity,p.terminalAngle,p.terminalOmega],R:[p.r1,p.r2]});
export function physicalInputs(z:number[],p:DroneParams):Thrust[]{const hover=p.mass*p.gravity/2;return Array.from({length:p.horizon},(_,t)=>[hover*(1+z[2*t]),hover*(1+z[2*t+1])]);}
export function droneCosts(states:State[],inputs:Thrust[],p:DroneParams){
  const reference=droneReference(p),{Q,QT,R}=weights(p),uref=p.inputReference==='hover'?p.mass*p.gravity/2:0;
  const tracking=inputs.map((_,t)=>Q.reduce((sum,w,j)=>sum+w*(states[t][j]-reference[t][j])**2/2,0)),effort=inputs.map(u=>R.reduce((sum,w,j)=>sum+w*(u[j]-uref)**2/2,0)),last=states.at(-1)!,ref=reference.at(-1)!,terminal=QT.reduce((sum,w,j)=>sum+w*(last[j]-ref[j])**2/2,0);
  return {tracking,effort,terminal,total:tracking.reduce((a,b)=>a+b,0)+effort.reduce((a,b)=>a+b,0)+terminal};
}
export function droneMargins(states:State[],inputs:Thrust[],p:DroneParams){return [...inputs.flatMap(u=>u.flatMap(v=>[v-p.minThrust,p.maxThrust-v])),...states.flatMap(x=>[x[2]-p.minY,p.maxY-x[2],p.maxAngle-x[4],p.maxAngle+x[4],p.maxOmega-x[5],p.maxOmega+x[5]])];}
/** Forward sensitivities of all six states to the 2T dimensionless thrust variables. */
export function droneSensitivities(z:number[],p:DroneParams){
  const D=z.length,hover=p.mass*p.gravity/2,inputs=physicalInputs(z,p),states=droneRollout([p.initialX,0,p.initialY,0,0,0],inputs,p),sensitivities:Matrix[]=[Array.from({length:6},()=>Array(D).fill(0))];
  for(let t=0;t<p.horizon;t++){const {A,B}=droneJacobians(states[t],inputs[t],p),prev=sensitivities[t],next=A.map(row=>Array.from({length:D},(_,k)=>row.reduce((s,v,j)=>s+v*prev[j][k],0)));
    for(let j=0;j<6;j++)for(let k=0;k<2;k++)next[j][2*t+k]+=hover*B[j][k];sensitivities.push(next);}
  return {inputs,states,sensitivities};
}
export function assembleDrone(z:number[],p:DroneParams,epsilon:number){
  const data=droneSensitivities(z,p),{inputs,states,sensitivities}=data,{Q,QT,R}=weights(p),reference=droneReference(p),D=z.length,hover=p.mass*p.gravity/2,uref=p.inputReference==='hover'?hover:0,
    gradient=Array(D).fill(0) as number[],model=Array.from({length:D},()=>Array(D).fill(0) as number[]);
  function term(weight:number,error:number,jac:number[]){for(let i=0;i<D;i++){gradient[i]+=weight*error*jac[i];for(let j=0;j<D;j++)model[i][j]+=weight*jac[i]*jac[j];}}
  for(let t=0;t<=p.horizon;t++)for(let j=0;j<6;j++)term(t===p.horizon?QT[j]:Q[j],states[t][j]-reference[t][j],sensitivities[t][j]);
  for(let t=0;t<p.horizon;t++)for(let j=0;j<2;j++){const i=2*t+j;gradient[i]+=R[j]*(inputs[t][j]-uref)*hover;model[i][i]+=R[j]*hover*hover;}
  const margins:number[]=[];
  const barrier=(margin:number,jac:number[])=>{margins.push(margin);if(!p.limits)return;for(let i=0;i<D;i++){gradient[i]-=epsilon*jac[i]/margin;for(let j=0;j<D;j++)model[i][j]+=epsilon*jac[i]*jac[j]/(margin*margin);}};
  for(let t=0;t<p.horizon;t++)for(let j=0;j<2;j++){const e=Array(D).fill(0) as number[];e[2*t+j]=hover;barrier(inputs[t][j]-p.minThrust,e);barrier(p.maxThrust-inputs[t][j],e.map(v=>-v));}
  for(let t=0;t<=p.horizon;t++)for(const [index,lo,hi] of [[2,p.minY,p.maxY],[4,-p.maxAngle,p.maxAngle],[5,-p.maxOmega,p.maxOmega]]){barrier(states[t][index]-lo,sensitivities[t][index]);barrier(hi-states[t][index],sensitivities[t][index].map(v=>-v));}
  const cost=droneCosts(states,inputs,p),value=cost.total-(p.limits?epsilon*margins.reduce((s,v)=>s+Math.log(v),0):0),last=states.at(-1)!,target=reference.at(-1)!,h=p.endpoint?[last[0]-target[0],last[2]-target[2]]:[],A=p.endpoint?[sensitivities.at(-1)![0],sensitivities.at(-1)![2]]:[];
  return {...data,cost,value,gradient,model,margins,h,A};
}
export interface DroneIterate {z:number[];states:State[];inputs:Thrust[];cost:ReturnType<typeof droneCosts>;k:number;stage:number;epsilon:number;primal:number;dual:number;violation:number;step:number;}
export interface DroneResult {points:DroneIterate[];status:string;converged:boolean;reference:State[];referenceResidual:number;N:number;duration:number;}
/** Reduced-space SQP/Gauss–Newton. Dynamics are eliminated by exact Euler rollout.
 * O3 solves each equality QP and performs the merit search; no duplicate KKT solver. */
export function solveDrone(p:DroneParams):DroneResult {
  validateDrone(p);const N=p.horizon,D=2*N,reference=droneReference(p),hover=p.mass*p.gravity/2,points:DroneIterate[]=[],zero=Array(D).fill(0) as number[];
  const seedInputs=Array.from({length:N},()=>[hover,hover] as Thrust),desiredInput=p.inputReference==='hover'?hover:0,referenceResidual=Math.max(...reference.slice(1).map((x,t)=>norm(axpy(x,droneStep(reference[t],[desiredInput,desiredInput],p),-1))));
  const result=(status:string,converged=false):DroneResult=>({points,status,converged,reference,referenceResidual,N,duration:N*p.dt});
  if(p.limits&&(p.minThrust>=p.maxThrust||p.minY>=p.maxY||p.maxAngle<=0||p.maxOmega<=0))return result('Limiti incompatibili: intervallo vuoto.');
  if(p.limits&&!droneMargins(droneRollout([p.initialX,0,p.initialY,0,0,0],seedInputs,p),seedInputs,p).every(v=>v>0))return result('La partenza in hovering non è strettamente interna. Cambia limiti o stato iniziale; questo non dimostra che il problema sia impossibile.');
  if(p.limits&&p.endpoint&&(p.targetY<=p.minY||p.targetY>=p.maxY))return result('Vincolo terminale fuori dall’interno della fascia di quota.');
  let z=zero,lambda=Array(p.endpoint?2:0).fill(0) as number[],penalty=10,k=0;
  const stages=p.limits?[Math.max(.05,p.epsilon*10),Math.max(.01,p.epsilon*2),p.epsilon]:[0];
  for(let stage=0;stage<stages.length;stage++){
    const epsilon=stages[stage];let cacheKey='',cache:ReturnType<typeof assembleDrone>;
    const data=(v:number[])=>{const key=v.join(',');if(key!==cacheKey||!cache){cache=assembleDrone(v,p,epsilon);cacheKey=key;}return cache;};
    const simple=(v:number[])=>{const inputs=physicalInputs(v,p),states=droneRollout([p.initialX,0,p.initialY,0,0,0],inputs,p),margins=droneMargins(states,inputs,p);return {inputs,states,margins};};
    const pb:SmoothProblem={dimension:D,value:v=>{const d=simple(v);return droneCosts(d.states,d.inputs,p).total-(p.limits?epsilon*d.margins.reduce((s,m)=>s+Math.log(m),0):0);},gradient:v=>data(v).gradient,
      hessian:v=>data(v).model, // Positive Gauss–Newton model, explicitly not an exact Hessian.
      equalities:v=>{if(!p.endpoint)return [];const s=simple(v).states.at(-1)!;return [s[0]-reference[N][0],s[2]-reference[N][2]];},jacobian:v=>data(v).A,
      interior:v=>{try{return !p.limits||simple(v).margins.every(m=>m>0);}catch{return false;}}};
    let stageConverged=false;
    for(let it=0;it<=p.iterations;it++){
      const d=data(z),res=residuals(pb,z,lambda),violation=Math.max(0,...d.margins.map(v=>-v));
      points.push({z:[...z],states:d.states,inputs:d.inputs,cost:d.cost,k:k++,stage,epsilon,primal:res.primal,dual:res.dual,violation,step:0});
      if(res.total<2e-5){stageConverged=true;break;}if(it===p.iterations)break;
      const B=d.model.map((row,i)=>row.map((v,j)=>v+(i===j?1e-7:0))),qp=solveEqualityQP(B,d.gradient,d.A,d.h.map(v=>-v));
      if(!qp.z||!qp.multipliers)return result('Sottoproblema non risolto: '+qp.status);
      penalty=Math.max(penalty,...qp.multipliers.map(v=>Math.abs(v)+1));
      const search=searchMerit(pb,z,qp.z,penalty,{initialStep:1,beta:.5,c:.1},{B,lambdaQP:qp.multipliers});
      if(!search.step)return result('Ricerca del passo fallita; candidato da verificare, non ottimo certificato.');
      points.at(-1)!.step=search.step;z=axpy(z,qp.z,search.step);lambda=axpy(lambda,axpy(qp.multipliers,lambda,-1),search.step);
    }
    if(!stageConverged)return result('Budget di iterazioni raggiunto: traiettoria candidata; residuo KKT sopra tolleranza.');
  }
  return result(p.limits?'Convergenza locale della barriera; soluzione approssimata, senza garanzia globale.':'Stazionarietà locale raggiunta; il problema nonlineare non garantisce un minimo globale.',true);
}
