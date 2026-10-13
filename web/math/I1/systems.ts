import type { Vec2 } from '../quadratic';
import { dot,norm,axpy } from '../O3/solver';

export interface MapParams {a:number;b:number;nonlinear:number;}
export const mapValue=(x:number,u:number,p:MapParams)=>p.a*x+p.nonlinear*Math.tanh(x)+p.b*u;
export const mapJacobian=(x:number,p:MapParams)=>({A:p.a+p.nonlinear*(1-Math.tanh(x)**2),B:p.b});
export function rollout(initial:number,inputs:readonly number[],p:MapParams){
  const states=[initial];for(const u of inputs){const next=mapValue(states.at(-1)!,u,p);if(!Number.isFinite(next)||Math.abs(next)>1e8)throw new Error('La traiettoria supera il limite numerico: riduci coefficienti o orizzonte.');states.push(next);}return states;
}
export interface DiscreteParams extends MapParams {initial:number;mean:number;amplitude:number;period:number;horizon:number;kickTime:number;kick:number;}
export const discreteDefaults:DiscreteParams={a:.7,b:1,nonlinear:.2,initial:1,mean:.1,amplitude:.3,period:8,horizon:16,kickTime:4,kick:0};
export function computeDiscrete(p:Readonly<DiscreteParams>){
  const N=Math.min(40,Math.max(2,Math.round(p.horizon))),inputs=Array.from({length:N},(_,t)=>p.mean+p.amplitude*Math.sin(2*Math.PI*t/p.period)+(t===Math.round(p.kickTime)?p.kick:0));
  const states=rollout(p.initial,inputs,p),residual=states.slice(1).map((x,t)=>x-mapValue(states[t],inputs[t],p));
  return {N,inputs,states,stateStack:states.slice(1),inputStack:[...inputs],residual};
}
export interface EquilibriumParams extends MapParams {candidate:number;input:number;initial:number;balance:number;horizon:number;editTime:number;editDelta:number;}
export const equilibriumDefaults:EquilibriumParams={a:.7,b:1,nonlinear:.2,candidate:1,input:.14768116880884702,initial:1.5,balance:1,horizon:16,editTime:5,editDelta:0};
export function computeEquilibrium(p:Readonly<EquilibriumParams>){
  const input=p.balance?((1-p.a)*p.candidate-p.nonlinear*Math.tanh(p.candidate))/p.b:p.input,N=Math.round(p.horizon),inputs=Array(N).fill(input) as number[],states=rollout(p.initial,inputs,p),edited=[...states];
  const editedTime=Math.min(N,Math.max(1,Math.round(p.editTime)));edited[editedTime]+=p.editDelta;
  const residual=edited.slice(1).map((x,t)=>x-mapValue(edited[t],input,p)),equilibriumResidual=mapValue(p.candidate,input,p)-p.candidate,{A}=mapJacobian(p.candidate,p);
  const classification=Math.abs(equilibriumResidual)>1e-9?'La coppia candidata non è un equilibrio':Math.abs(A)<1-1e-8?'Equilibrio localmente asintoticamente stabile':Math.abs(A)>1+1e-8?'Equilibrio instabile':'Autovalore sul cerchio unitario: linearizzazione inconcludente';
  return {N,input,states,edited,editedTime,residual,equilibriumResidual,A,classification};
}
export interface LinearizationParams extends MapParams {baseInitial:number;baseInput:number;baseAmplitude:number;epsilon:number;inputDelta:number;horizon:number;defect:number;correction:number;}
export const linearizationDefaults:LinearizationParams={a:.7,b:1,nonlinear:.6,baseInitial:.7,baseInput:.1,baseAmplitude:.1,epsilon:.3,inputDelta:.2,horizon:12,defect:0,correction:0};
export function computeLinearization(p:Readonly<LinearizationParams>){
  const N=Math.round(p.horizon),inputs=Array.from({length:N},(_,t)=>p.baseInput+p.baseAmplitude*Math.sin(2*Math.PI*t/N)),base=rollout(p.baseInitial,inputs,p);
  base[Math.floor(N/2)]+=p.defect;
  const defects=base.slice(1).map((x,t)=>x-mapValue(base[t],inputs[t],p)),deltaInputs=inputs.map((_,t)=>p.epsilon*p.inputDelta*Math.cos(2*Math.PI*t/N)),
    perturbedInputs=inputs.map((u,t)=>u+deltaInputs[t]),actual=rollout(base[0]+p.epsilon,perturbedInputs,p),delta=[p.epsilon],jacobians=base.slice(0,-1).map(x=>mapJacobian(x,p));
  for(let t=0;t<N;t++)delta.push(jacobians[t].A*delta[t]+p.b*deltaInputs[t]-(p.correction?defects[t]:0));
  const predicted=base.map((x,t)=>x+delta[t]),errors=predicted.map((x,t)=>Math.abs(x-actual[t]));
  return {N,inputs,base,defects,deltaInputs,perturbedInputs,actual,delta,predicted,errors,jacobians,maxError:Math.max(...errors),maxDefect:Math.max(...defects.map(Math.abs))};
}

export interface ContinuousParams {position:number;velocity:number;bias:number;amplitude:number;frequency:number;omega:number;damping:number;nonlinear:number;outputVelocity:number;feedthrough:number;duration:number;dt:number;}
export const continuousDefaults:ContinuousParams={position:1,velocity:0,bias:0,amplitude:.3,frequency:1,omega:1,damping:.3,nonlinear:1,outputVelocity:.2,feedthrough:0,duration:8,dt:.05};
export const continuousInput=(t:number,p:ContinuousParams)=>p.bias+p.amplitude*Math.sin(p.frequency*t);
export function continuousField(t:number,z:readonly number[],p:ContinuousParams):Vec2 {
  return [z[1],-(p.omega**2)*((1-p.nonlinear)*z[0]+p.nonlinear*Math.sin(z[0]))-p.damping*z[1]+continuousInput(t,p)];
}
export function rk4Step(t:number,z:readonly number[],dt:number,field:(t:number,z:readonly number[])=>readonly number[]):number[]{
  const k1=field(t,z),k2=field(t+dt/2,axpy(z,k1,dt/2)),k3=field(t+dt/2,axpy(z,k2,dt/2)),k4=field(t+dt,axpy(z,k3,dt));
  return z.map((v,i)=>v+dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);
}
export function computeContinuous(p:Readonly<ContinuousParams>){
  if(!(p.dt>0&&p.duration>0))throw new Error('Durata e passo di integrazione devono essere positivi.');
  const N=Math.min(1000,Math.ceil(p.duration/p.dt)),dt=p.duration/N,times=Array.from({length:N+1},(_,i)=>i*dt),states:Vec2[]=[[p.position,p.velocity]];
  for(let t=0;t<N;t++){const z=rk4Step(times[t],states[t],dt,(time,state)=>continuousField(time,state,p));if(!z.every(Number.isFinite)||norm(z)>1e6)throw new Error('Integrazione oltre il limite numerico.');states.push([z[0],z[1]]);}
  const inputs=times.map(t=>continuousInput(t,p)),outputs=states.map((z,t)=>z[0]+p.outputVelocity*z[1]+p.feedthrough*inputs[t]);
  const energy=states.map(z=>z[1]**2/2+p.omega**2*((1-p.nonlinear)*z[0]**2/2+p.nonlinear*(1-Math.cos(z[0]))));
  return {N,dt,times,states,inputs,outputs,energy};
}

export interface ControlParams {mode:'gain'|'one-step';reference:'constant'|'sine'|'ramp';amplitude:number;gain:number;limit:number;q:number;r:number;initial:number;a:number;b:number;disturbance:number;horizon:number;}
export const controlDefaults:ControlParams={mode:'gain',reference:'constant',amplitude:1,gain:1,limit:1,q:1,r:.2,initial:0,a:1,b:.2,disturbance:0,horizon:25};
export const referenceValue=(t:number,p:ControlParams)=>p.reference==='constant'?p.amplitude:p.reference==='sine'?p.amplitude*Math.sin(2*Math.PI*t/p.horizon):p.amplitude*t/p.horizon;
export function oneStepInput(x:number,reference:number,p:Pick<ControlParams,'a'|'b'|'q'|'r'|'limit'>){
  const free=p.q*p.b*(reference-p.a*x)/(p.q*p.b*p.b+p.r),input=Math.max(-p.limit,Math.min(p.limit,free));
  return {free,input,cost:(u:number)=>p.q*(p.a*x+p.b*u-reference)**2/2+p.r*u*u/2};
}
export function computeControl(p:Readonly<ControlParams>){
  const N=Math.round(p.horizon),states=[p.initial],inputs:number[]=[],references=Array.from({length:N+1},(_,t)=>referenceValue(t,p)),requested:number[]=[],costs=[0];
  for(let t=0;t<N;t++){
    const proposal=p.mode==='one-step'?oneStepInput(states[t],references[t+1],p).free:p.gain*(references[t+1]-states[t]);
    const u=Math.max(-p.limit,Math.min(p.limit,proposal)),next=p.a*states[t]+p.b*u+(t===Math.floor(N/2)?p.disturbance:0);
    requested.push(proposal);inputs.push(u);states.push(next);costs.push(costs[t]+p.q*(next-references[t+1])**2/2+p.r*u*u/2);
  }
  return {N,states,inputs,references,requested,costs};
}

export type Scenario='aircraft'|'robot'|'car'|'drone'|'space';
export interface MotivationParams {scenario:Scenario;amplitude:number;gain:number;limit:number;duration:number;offset:number;obstacle:number;trackingWeight:number;effortWeight:number;disturbance:number;}
export const motivationDefaults:MotivationParams={scenario:'aircraft',amplitude:.7,gain:1.5,limit:2,duration:6,offset:.6,obstacle:.35,trackingWeight:1,effortWeight:.2,disturbance:0};
export function navigationReference(scenario:Scenario,t:number,T:number,amplitude:number){
  const w=2*Math.PI/T,theta=w*t;
  if(scenario==='space'||scenario==='robot'){
    const R=scenario==='space'?1.5:1.2;return {position:[R*Math.cos(theta),amplitude*Math.sin(theta),0],velocity:[-R*w*Math.sin(theta),amplitude*w*Math.cos(theta),0]};
  }
  return {position:[4*t/T,amplitude*Math.sin(theta),(scenario==='aircraft'||scenario==='drone')?.5*amplitude*Math.sin(2*theta):0],velocity:[4/T,amplitude*w*Math.cos(theta),(scenario==='aircraft'||scenario==='drone')?amplitude*w*Math.cos(2*theta):0]};
}
export function computeMotivation(p:Readonly<MotivationParams>){
  const N=Math.round(p.duration/.05),dt=p.duration/N,obstacleCenter=p.scenario==='space'?[0,0,0]:p.scenario==='robot'?[.3,.2,0]:[2,0,0];
  let position=axpy(navigationReference(p.scenario,0,p.duration,p.amplitude).position,[0,p.offset,0]),velocity=[0,0,0],tracking=0,effort=0,saturations=0;
  const points:{time:number;position:number[];velocity:number[];reference:number[];input:number[];tracking:number;effort:number;clearance:number;saturations:number}[]=[];
  for(let k=0;k<=N;k++){
    const ref=navigationReference(p.scenario,k*dt,p.duration,p.amplitude),raw=axpy(ref.position,position,-1).map((v,i)=>p.gain*v+2*Math.sqrt(p.gain)*(ref.velocity[i]-velocity[i])),length=norm(raw),input=raw.map(v=>v*Math.min(1,p.limit/Math.max(length,1e-12)));
    points.push({time:k*dt,position:[...position],velocity:[...velocity],reference:ref.position,input,tracking,effort,clearance:norm(axpy(position,obstacleCenter,-1))-p.obstacle,saturations});
    if(k===N)break;if(length>p.limit)saturations++;
    tracking+=dt*dot(axpy(position,ref.position,-1),axpy(position,ref.position,-1));effort+=dt*dot(input,input);
    const acceleration=input.map((v,i)=>v+(i===1?p.disturbance:0));position=position.map((v,i)=>v+dt*velocity[i]+dt*dt*acceleration[i]/2);velocity=axpy(velocity,acceleration,dt);
  }
  return {N,dt,points,obstacleCenter};
}
