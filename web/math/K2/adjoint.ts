import { map,derivatives,rollout,residual,computeControl,type Dynamics } from '../K1/trajectories';
import { norm,axpy,dot,type Matrix } from '../O3/solver';
export interface AdjointParams extends Dynamics {initial:number;target:number;horizon:number;q:number;r:number;terminalWeight:number;mean:number;amplitude:number;mode:'manual'|'optimal';editTime:number;lambdaShift:number;stateShift:number;}
export const adjointDefaults:AdjointParams={a:.8,b:.6,nonlinear:.3,quadratic:.2,initial:.2,target:1,horizon:5,q:1,r:.3,terminalWeight:3,mean:.1,amplitude:.2,mode:'manual',editTime:2,lambdaShift:0,stateShift:0};
export function costs(states:readonly number[],inputs:readonly number[],reference:readonly number[],p:Pick<AdjointParams,'q'|'r'|'terminalWeight'>){const N=inputs.length,stage=inputs.map((u,t)=>(p.q*(states[t]-reference[t])**2+p.r*u*u)/2),terminal=p.terminalWeight*(states[N]-reference[N])**2/2;return {stage,terminal,total:stage.reduce((a,b)=>a+b,0)+terminal};}
/** lambda[0] is initial-state sensitivity, not a multiplier when x0 is fixed. */
export function backward(states:readonly number[],inputs:readonly number[],reference:readonly number[],p:AdjointParams){const N=inputs.length,lambda=Array(N+1).fill(0) as number[];lambda[N]=p.terminalWeight*(states[N]-reference[N]);for(let t=N-1;t>=0;t--)lambda[t]=p.q*(states[t]-reference[t])+derivatives(states[t],inputs[t],p).A*lambda[t+1];return lambda;}
export function evaluate(states:number[],inputs:number[],lambda:number[],p:AdjointParams){
  const N=inputs.length,reference=Array.from({length:N+1},(_,t)=>p.target*t/N),cost=costs(states,inputs,reference,p),h=residual(states,inputs,p),local=Array(N+1).fill(0) as number[],stateGradient=Array(N+1).fill(0) as number[],inputGradient:number[]=[],dependency:Matrix=Array.from({length:N+1},()=>Array(3*N).fill(0)),groupJacobian:Matrix=dependency.map(row=>[...row]);
  for(let t=0;t<N;t++){const f=map(states[t],inputs[t],p),{A,B}=derivatives(states[t],inputs[t],p);local[t]=cost.stage[t]+lambda[t+1]*f-(t?lambda[t]*states[t]:0);stateGradient[t]=p.q*(states[t]-reference[t])+A*lambda[t+1]-(t?lambda[t]:0);inputGradient[t]=p.r*inputs[t]+B*lambda[t+1];
    if(t){dependency[t][t-1]=1;groupJacobian[t][t-1]=stateGradient[t];dependency[t][2*N+t-1]=1;groupJacobian[t][2*N+t-1]=-states[t];}
    dependency[t][N+t]=1;groupJacobian[t][N+t]=inputGradient[t];dependency[t][2*N+t]=1;groupJacobian[t][2*N+t]=f;
  }
  local[N]=cost.terminal-lambda[N]*states[N];stateGradient[N]=p.terminalWeight*(states[N]-reference[N])-lambda[N];dependency[N][N-1]=1;dependency[N][3*N-1]=1;groupJacobian[N][N-1]=stateGradient[N];groupJacobian[N][3*N-1]=-states[N];
  const direct=cost.total+dot(lambda.slice(1),h),rearranged=local.reduce((a,b)=>a+b,0),gradient=[...stateGradient.slice(1),...inputGradient],dual=norm(gradient);
  return {N,reference,cost,h,local,dependency,groupJacobian,direct,rearranged,stateGradient,inputGradient,gradient,primal:norm(h),dual,kkt:norm([...gradient,...h])<1e-8};
}
export function computeAdjoint(p:Readonly<AdjointParams>){
  const N=Math.round(p.horizon);if(N<2||N>10||p.q<0||p.r<=0||p.terminalWeight<0)throw new Error('Orizzonte o pesi non validi.');const model={...p,nonlinear:p.mode==='optimal'?0:p.nonlinear,quadratic:p.mode==='optimal'?0:p.quadratic},reference=Array.from({length:N+1},(_,t)=>p.target*t/N);
  const inputs=p.mode==='optimal'?computeControl({...p,reference:'ramp'}).points[1].inputs:Array.from({length:N},(_,t)=>p.mean+p.amplitude*Math.sin(2*Math.PI*t/N)),states=rollout(p.initial,inputs,model),edit=Math.max(1,Math.min(N,Math.round(p.editTime)));states[edit]+=p.stateShift;
  const correct=backward(states,inputs,reference,model),lambda=[...correct];lambda[edit]+=p.lambdaShift;const data=evaluate(states,inputs,lambda,model);
  return {...data,model,states,inputs,lambda,correct,edit,initialSensitivity:correct[0],adjointResidual:norm(data.stateGradient.slice(1))};
}
