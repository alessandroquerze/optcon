import { rk4Step } from '../I1/systems';
import { axpy,norm,solveEqualityQP,searchMerit,residuals,type Matrix,type SmoothProblem } from '../O3/solver';
export type State=[number,number];
export type Method='euler'|'rk4';
export interface Physics {mass:number;length:number;gravity:number;}
export const physicsDefaults:Physics={mass:1,length:1,gravity:9.81};
export const equilibriumTorque=(angle:number,p:Physics)=>p.mass*p.gravity*p.length*Math.sin(angle);
export function field(x:readonly number[],input:number,p:Physics):State{return [x[1],-p.gravity/p.length*Math.sin(x[0])+input/(p.mass*p.length*p.length)];}
export function step(x:readonly number[],input:number,p:Physics,dt:number,method:Method):State{return (method==='euler'?axpy(x,field(x,input,p),dt):rk4Step(0,x,dt,(_t,y)=>field(y,input,p))) as State;}
export const energy=(x:readonly number[],p:Physics)=>p.mass*p.length*p.length*x[1]*x[1]/2+p.mass*p.gravity*p.length*(1-Math.cos(x[0]));
export interface SimulationParams extends Physics {angle:number;velocity:number;torque:number;duration:number;intervals:number;method:Method;}
export const simulationDefaults:SimulationParams={...physicsDefaults,angle:.7,velocity:0,torque:0,duration:4,intervals:80,method:'rk4'};
export function simulate(p:Readonly<SimulationParams>){
  const N=Math.round(p.intervals),dt=p.duration/N,states:State[]=[[p.angle,p.velocity]];for(let i=0;i<N;i++){const next=step(states[i],p.torque,p,dt,p.method);if(!next.every(Number.isFinite)||norm(next)>1e5)throw new Error('Integrazione oltre il limite numerico: riduci il passo.');states.push(next);}
  const times=states.map((_,i)=>i*dt),energies=states.map(x=>energy(x,p)),fine:State[]=[[p.angle,p.velocity]];let current:State=[p.angle,p.velocity];for(let i=0;i<N;i++){for(let j=0;j<4;j++)current=step(current,p.torque,p,dt/4,'rk4');fine.push(current);}
  return {N,dt,times,states,fine,energies,maxError:Math.max(...states.map((x,i)=>norm(axpy(x,fine[i],-1))))};
}
export interface EquilibriumParams extends Physics {angle:number;velocity:number;torque:number;balance:number;perturbation:number;duration:number;}
export const equilibriumDefaults:EquilibriumParams={...physicsDefaults,angle:.7,velocity:0,torque:0,balance:1,perturbation:.1,duration:4};
export function computeEquilibrium(p:Readonly<EquilibriumParams>){
  const torque=p.balance?equilibriumTorque(p.angle,p):p.torque,residual=field([p.angle,p.velocity],torque,p),isEquilibrium=norm(residual)<1e-9,c=Math.cos(p.angle),rate=Math.sqrt(p.gravity/p.length*Math.abs(c)),classification=!isEquilibrium?'La coppia candidata non è un equilibrio':c>1e-8?'Centro conservativo: stabile localmente, non asintoticamente stabile':c< -1e-8?'Equilibrio instabile: un autovalore reale positivo':'Autovalori nulli: il test lineare è inconcludente',simulation=simulate({...simulationDefaults,...p,angle:p.angle+p.perturbation,torque,intervals:80,method:'rk4'}),potential=(theta:number)=>p.mass*p.gravity*p.length*(1-Math.cos(theta))-torque*theta;
  return {torque,residual,isEquilibrium,rate,classification,potential,simulation};
}
export interface ReferenceParams extends Physics {startAngle:number;targetAngle:number;duration:number;intervals:number;}
export const referenceDefaults:ReferenceParams={...physicsDefaults,startAngle:-.6,targetAngle:.6,duration:4,intervals:80};
export function computeReference(p:Readonly<ReferenceParams>){
  const N=Math.round(p.intervals),dt=p.duration/N,at=(t:number)=>t<p.duration/2?p.startAngle:p.targetAngle,desired:State[]=Array.from({length:N+1},(_,i)=>[at(i*dt),0]),inputs=Array.from({length:N},(_,i)=>equilibriumTorque(at((i+.5)*dt),p)),states:State[]=[[p.startAngle,0]];
  for(let i=0;i<N;i++)states.push(step(states[i],inputs[i],p,dt,'rk4'));
  const defects=inputs.map((u,t)=>norm(axpy(desired[t+1],step(desired[t],u,p,dt,'rk4'),-1)));return {N,dt,times:states.map((_,i)=>i*dt),desired,inputs,states,defects,jump:Math.abs(p.targetAngle-p.startAngle),torque1:equilibriumTorque(p.startAngle,p),torque2:equilibriumTorque(p.targetAngle,p)};
}

export interface TransferParams extends Physics {startAngle:number;targetAngle:number;duration:number;intervals:number;method:Method;reference:'step'|'smooth';qAngle:number;qVelocity:number;r:number;terminalAngle:number;terminalVelocity:number;limits:number;torqueLimit:number;endpoint:number;epsilon:number;iterations:number;}
export const transferDefaults:TransferParams={...physicsDefaults,startAngle:-.6,targetAngle:.6,duration:4,intervals:32,method:'rk4',reference:'step',qAngle:6,qVelocity:.5,r:.03,terminalAngle:20,terminalVelocity:3,limits:1,torqueLimit:15,endpoint:0,epsilon:.002,iterations:45};
export function referenceAt(t:number,p:TransferParams){const s=Math.max(0,Math.min(1,t/p.duration)),shape=p.reference==='step'?Number(s>=.5):s**3*(10-15*s+6*s*s),angle=p.startAngle+(p.targetAngle-p.startAngle)*shape;return {angle,input:equilibriumTorque(angle,p)};}
export function smoothSeed(t:number,p:TransferParams){const s=t/p.duration,d=p.targetAngle-p.startAngle,angle=p.startAngle+d*s**3*(10-15*s+6*s*s),velocity=d*30*s*s*(1-s)**2/p.duration,acceleration=d*60*s*(1-s)*(1-2*s)/(p.duration*p.duration);return {angle,velocity,torque:p.mass*p.length*p.length*acceleration+equilibriumTorque(angle,p)};}
function validate(p:TransferParams){if(!Object.values(p).every(v=>typeof v!=='number'||Number.isFinite(v))||p.mass<=0||p.length<=0||p.gravity<=0||p.duration<=0||!Number.isInteger(p.intervals)||p.intervals<4||p.intervals>64||p.intervals%2||p.r<=0||[p.qAngle,p.qVelocity,p.terminalAngle,p.terminalVelocity].some(v=>v<0)||!Number.isInteger(p.iterations)||p.iterations<1||p.iterations>100||p.epsilon<=0||p.torqueLimit<=0)throw new Error('Parametri fisici, griglia, pesi o budget non validi.');}
interface Sample {y:number[];time:number;weight:number;}
/** State + forward sensitivity RK stages; stage weights also integrate the cost. */
function advance(y:number[],u:number,index:number,D:number,p:TransferParams,t:number,dt:number,method:Method){
  const scale=p.mass*p.gravity*p.length,derivative=(_time:number,v:readonly number[])=>{const f=field(v,u,p),out=[...f,...Array(2*D).fill(0)];for(let j=0;j<D;j++){out[2+j]=v[2+D+j];out[2+D+j]=-p.gravity/p.length*Math.cos(v[0])*v[2+j]+(j===index?scale/(p.mass*p.length*p.length):0);}return out;};
  let next:number[],samples:Sample[]=[];
  if(method==='euler'){samples=[{y:[...y],time:t,weight:dt}];next=axpy(y,derivative(t,y),dt);}
  else{const weights=[1,2,2,1];next=rk4Step(t,y,dt,(time,state)=>{samples.push({y:[...state],time,weight:dt*weights[samples.length]/6});return derivative(time,state);});}
  return {next,samples};
}
export function assembleTransfer(z:number[],p:TransferParams,epsilon=0,refinement=1,derivatives=true){
  const N=p.intervals,D=z.length,dt=p.duration/N,scale=p.mass*p.gravity*p.length,inputs=z.map(v=>v*scale),states:State[]=[[p.startAngle,0]],gradient=Array(D).fill(0) as number[],model=Array.from({length:D},()=>Array(D).fill(0) as number[]),tracking:number[]=[],speed:number[]=[],effort:number[]=[],times=[0],fineStates:State[]=[[p.startAngle,0]],fineTimes=[0];
  let y=[p.startAngle,0,...Array(2*D).fill(0)] as number[];
  const add=(weight:number,error:number,jac:number[])=>{if(!derivatives)return;for(let i=0;i<D;i++){gradient[i]+=2*weight*error*jac[i];for(let j=0;j<D;j++)model[i][j]+=2*weight*jac[i]*jac[j];}};
  for(let k=0;k<N;k++){
    let a=0,b=0,c=0;const heldReference=referenceAt((k+.5)*dt,p);
    for(let sub=0;sub<refinement;sub++){
      const t=k*dt+sub*dt/refinement,{next,samples}=advance(y,inputs[k],k,D,p,t,dt/refinement,refinement===1?p.method:'rk4');
      for(const sample of samples){const ref=p.reference==='step'?heldReference:referenceAt(sample.time,p),theta=sample.y[0],omega=sample.y[1],difference=theta-ref.angle,du=inputs[k]-ref.input;
        a+=sample.weight*p.qAngle*difference*difference;b+=sample.weight*p.qVelocity*omega*omega;c+=sample.weight*p.r*du*du;
        add(sample.weight*p.qAngle,difference,sample.y.slice(2,2+D));add(sample.weight*p.qVelocity,omega,sample.y.slice(2+D));
        if(derivatives){gradient[k]+=2*sample.weight*p.r*du*scale;model[k][k]+=2*sample.weight*p.r*scale*scale;}}
      y=next;if(!y.every(Number.isFinite)||norm(y.slice(0,2))>1e5)throw new Error('Integrazione o sensibilità oltre il limite numerico: aumenta gli intervalli o riduci la durata.');fineStates.push([y[0],y[1]]);fineTimes.push(k*dt+(sub+1)*dt/refinement);
    }
    states.push([y[0],y[1]]);times.push((k+1)*dt);tracking.push(a);speed.push(b);effort.push(c);
  }
  const finalAngle=y[0]-p.targetAngle,finalVelocity=y[1],terminal=p.terminalAngle*finalAngle*finalAngle+p.terminalVelocity*finalVelocity*finalVelocity;
  add(p.terminalAngle,finalAngle,y.slice(2,2+D));add(p.terminalVelocity,finalVelocity,y.slice(2+D));
  const cost={tracking,speed,effort,terminal,total:tracking.reduce((a,b)=>a+b,0)+speed.reduce((a,b)=>a+b,0)+effort.reduce((a,b)=>a+b,0)+terminal};
  let value=cost.total;
  if(p.limits)for(let k=0;k<D;k++){const lower=p.torqueLimit+inputs[k],upper=p.torqueLimit-inputs[k],weight=epsilon*dt;value-=weight*(Math.log(lower)+Math.log(upper));if(derivatives){gradient[k]+=weight*scale*(1/upper-1/lower);model[k][k]+=weight*scale*scale*(1/(upper*upper)+1/(lower*lower));}}
  const h=p.endpoint?[finalAngle,finalVelocity]:[],A=p.endpoint?[y.slice(2,2+D),y.slice(2+D)]:[];
  return {states,inputs,times,fineStates,fineTimes,cost,value,gradient,model,h,A,violation:Math.max(0,...inputs.map(u=>Math.abs(u)-p.torqueLimit))};
}
export interface TransferIterate {z:number[];states:State[];inputs:number[];cost:ReturnType<typeof assembleTransfer>['cost'];epsilon:number;stage:number;k:number;primal:number;dual:number;violation:number;}
export interface TransferResult {points:TransferIterate[];status:string;converged:boolean;N:number;dt:number;desired:State[];desiredInputs:number[];desiredDefects:number[];refined?:{states:State[];times:number[];cost:number;maxStateError:number;maxAngleError:number;maxVelocityError:number;terminalError:number;};}
export function solveTransfer(p:TransferParams):TransferResult {
  validate(p);const N=p.intervals,dt=p.duration/N,scale=p.mass*p.gravity*p.length,desired:State[]=Array.from({length:N+1},(_,i)=>[referenceAt(i*dt,p).angle,0]),desiredInputs=Array.from({length:N},(_,i)=>referenceAt((i+.5)*dt,p).input),desiredDefects=desiredInputs.map((u,i)=>norm(axpy(desired[i+1],step(desired[i],u,p,dt,p.method),-1))),points:TransferIterate[]=[];
  const finish=(status:string,converged=false):TransferResult=>{const last=points.at(-1);let refined:TransferResult['refined'];if(last){const fine=assembleTransfer(last.z,p,0,4,false);refined={states:fine.fineStates,times:fine.fineTimes,cost:fine.cost.total,maxStateError:Math.max(...last.states.map((x,i)=>norm(axpy(x,fine.states[i],-1)))),maxAngleError:Math.max(...last.states.map((x,i)=>Math.abs(x[0]-fine.states[i][0]))),maxVelocityError:Math.max(...last.states.map((x,i)=>Math.abs(x[1]-fine.states[i][1]))),terminalError:norm(axpy(fine.states.at(-1)!,[p.targetAngle,0],-1))};}return {points,status,converged,N,dt,desired,desiredInputs,desiredDefects,refined};};
  let z=Array.from({length:N},(_,i)=>{const u=smoothSeed((i+.5)*dt,p).torque;return (p.limits?Math.max(-.9*p.torqueLimit,Math.min(.9*p.torqueLimit,u)):u)/scale;}),lambda=Array(p.endpoint?2:0).fill(0) as number[],penalty=10,k=0;
  const stages=p.limits?[Math.max(.03,10*p.epsilon),Math.max(.006,3*p.epsilon),p.epsilon]:[0];
  for(let stage=0;stage<stages.length;stage++){
    const epsilon=stages[stage];let cache:ReturnType<typeof assembleTransfer>,key='';const data=(v:number[])=>{const next=v.join(',');if(next!==key||!cache){cache=assembleTransfer(v,p,epsilon);key=next;}return cache;};
    const pb:SmoothProblem={dimension:N,value:v=>assembleTransfer(v,p,epsilon,1,false).value,gradient:v=>data(v).gradient,hessian:v=>data(v).model,equalities:v=>data(v).h,jacobian:v=>data(v).A,interior:v=>!p.limits||v.every(u=>Math.abs(u*scale)<p.torqueLimit)};
    let done=false;
    for(let it=0;it<=p.iterations;it++){
      const d=data(z),res=residuals(pb,z,lambda);points.push({z:[...z],states:d.states,inputs:d.inputs,cost:d.cost,epsilon,stage,k:k++,primal:res.primal,dual:res.dual,violation:d.violation});
      if(res.total<2e-5){done=true;break;}if(it===p.iterations)break;
      const B=d.model.map((row,i)=>row.map((v,j)=>v+(i===j?1e-7:0))),qp=solveEqualityQP(B,d.gradient,d.A,d.h.map(v=>-v));if(!qp.z||!qp.multipliers)return finish('Sottoproblema non risolto: '+qp.status);
      penalty=Math.max(penalty,...qp.multipliers.map(v=>Math.abs(v)+1));
      const dualOnly=norm(qp.z)<1e-11*(1+norm(z))&&norm(d.h)<2e-5,search=dualOnly?{step:1}:searchMerit(pb,z,qp.z,penalty,{initialStep:1,beta:.5,c:.1},{B,lambdaQP:qp.multipliers});
      if(!search.step)return finish('Ricerca del passo fallita: candidato da verificare, senza certificazione di minimo.');
      z=axpy(z,qp.z,search.step);lambda=axpy(lambda,axpy(qp.multipliers,lambda,-1),search.step);
    }
    if(!done)return finish('Budget di iterazioni raggiunto: residuo di stazionarietà sopra tolleranza.');
  }
  return finish(p.limits?'Stazionarietà locale della barriera raggiunta; nessuna garanzia globale.':'Stazionarietà locale raggiunta; nessuna garanzia globale.',true);
}
