import { mapValue,mapJacobian } from '../I1/systems';
import { axpy,dot,norm,matvec,nullBasis,solveEqualityQP,transposeMultiply,type Matrix } from '../O3/solver';

export interface Dynamics {a:number;b:number;nonlinear:number;quadratic:number;}
export interface CurveParams extends Dynamics {initial:number;horizon:number;input0:number;input1:number;tail:number;editTime:number;editState:number;editInput:number;repair:number;}
export const curveDefaults:CurveParams={a:.7,b:.8,nonlinear:.2,quadratic:.4,initial:.3,horizon:4,input0:.2,input1:-.3,tail:.1,editTime:2,editState:.3,editInput:0,repair:0};
export const map=(x:number,u:number,p:Dynamics)=>mapValue(x,u,p)+p.quadratic*u*u/2;
export function derivatives(x:number,u:number,p:Dynamics){return {A:mapJacobian(x,p).A,B:p.b+p.quadratic*u};}
export function rollout(initial:number,inputs:readonly number[],p:Dynamics){const x=[initial];for(const u of inputs){const next=map(x.at(-1)!,u,p);if(!Number.isFinite(next)||Math.abs(next)>1e6)throw new Error('Traiettoria oltre il limite numerico.');x.push(next);}return x;}
export const residual=(states:readonly number[],inputs:readonly number[],p:Dynamics)=>inputs.map((u,t)=>map(states[t],u,p)-states[t+1]);
export function dynamicsJacobian(states:readonly number[],inputs:readonly number[],p:Dynamics):Matrix{
  const N=inputs.length;return inputs.map((u,t)=>{const row=Array(2*N).fill(0) as number[],{A,B}=derivatives(states[t],u,p);row[t]=-1;if(t>0)row[t-1]=A;row[N+t]=B;return row;});
}
export function sensitivities(states:readonly number[],inputs:readonly number[],p:Dynamics):Matrix{
  const N=inputs.length,S:Matrix=[Array(N).fill(0)];inputs.forEach((u,t)=>{const {A,B}=derivatives(states[t],u,p);S.push(S[t].map((v,j)=>A*v+(j===t?B:0)));});return S;
}
export function computeCurve(p:Readonly<CurveParams>){
  const N=Math.round(p.horizon);if(N<2||N>12)throw new Error('Orizzonte consentito: 2–12 passi.');const inputs=Array.from({length:N},(_,t)=>t===0?p.input0:t===1?p.input1:p.tail),states=rollout(p.initial,inputs,p),at=Math.max(1,Math.min(N,Math.round(p.editTime))),edited=[...states],editedInputs=[...inputs];edited[at]+=p.editState;editedInputs[at-1]+=p.editInput;
  const repaired=rollout(p.initial,editedInputs,p);if(p.repair)edited.splice(0,edited.length,...repaired);
  const h=residual(edited,editedInputs,p),J=dynamicsJacobian(edited,editedInputs,p),space=nullBasis(J,2*N);
  return {N,inputs,states,edited,editedInputs,at,h,J,rank:space.rank,tangentDimension:space.basis.length,repaired,defect:norm(h),z:[...edited.slice(1),...editedInputs]};
}
export interface GeometryParams extends Dynamics {initial:number;horizon:number;input0:number;input1:number;tail:number;delta0:number;delta1:number;epsilon:number;normal:number;}
export const geometryDefaults:GeometryParams={...curveDefaults,horizon:2,delta0:.7,delta1:-.4,epsilon:.4,normal:0};
export function computeGeometry(p:Readonly<GeometryParams>,epsilon=p.epsilon){
  const N=Math.round(p.horizon),inputs=Array.from({length:N},(_,t)=>t===0?p.input0:t===1?p.input1:p.tail),states=rollout(p.initial,inputs,p),S=sensitivities(states,inputs,p),du=inputs.map((_,t)=>t===0?p.delta0:t===1?p.delta1:0),dx=S.map(row=>dot(row,du));dx[N]+=p.normal;
  const actualInputs=axpy(inputs,du,epsilon),actual=rollout(p.initial,actualInputs,p),predicted=axpy(states,dx,epsilon),J=dynamicsJacobian(states,inputs,p),d=[...dx.slice(1),...du],linearDefect=matvec(J,d),h=residual(predicted,actualInputs,p),space=nullBasis(J,2*N);
  const terminal=(u0:number,u1:number)=>rollout(p.initial,inputs.map((u,t)=>t===0?u0:t===1?u1:u),p)[N],plane=(u0:number,u1:number)=>states[N]+S[N][0]*(u0-p.input0)+S[N][1]*(u1-p.input1);
  const chordInputs=[-.8,.8].map(s=>inputs.map((u,t)=>u+(t===1?s:0))),chordStates=chordInputs.map(u=>rollout(p.initial,u,p)),midStates=chordStates[0].map((x,t)=>(x+chordStates[1][t])/2),midInputs=chordInputs[0].map((u,t)=>(u+chordInputs[1][t])/2),chordDefect=norm(residual(midStates,midInputs,p));
  return {N,inputs,states,S,du,dx,d,J,actualInputs,actual,predicted,linearDefect,h,rank:space.rank,tangentDimension:space.basis.length,terminal,plane,epsilon,error:norm(axpy(actual,predicted,-1)),defect:norm(h),tangency:norm(linearDefect),chordInputs,chordStates,midStates,chordDefect};
}
export interface ControlParams {a:number;b:number;initial:number;target:number;horizon:number;q:number;r:number;terminalWeight:number;reference:'constant'|'ramp';}
export const controlDefaults:ControlParams={a:.9,b:.5,initial:0,target:1,horizon:5,q:1,r:.2,terminalWeight:4,reference:'ramp'};
export function computeControl(p:Readonly<ControlParams>){
  const N=Math.round(p.horizon),D=2*N;if(N<2||N>12||p.r<=0||p.q<0||p.terminalWeight<0)throw new Error('Orizzonte o pesi non validi.');
  const dynamics:Dynamics={a:p.a,b:p.b,nonlinear:0,quadratic:0},ref=Array.from({length:N+1},(_,t)=>p.reference==='constant'?p.target:p.target*t/N),seedInputs=Array(N).fill(0) as number[],seedStates=rollout(p.initial,seedInputs,dynamics),H:Matrix=Array.from({length:D},()=>Array(D).fill(0)),q=Array(D).fill(0) as number[];
  for(let t=1;t<=N;t++){const weight=t===N?p.terminalWeight:p.q;H[t-1][t-1]=weight;q[t-1]=-weight*ref[t];}for(let t=0;t<N;t++)H[N+t][N+t]=p.r;
  const A=dynamicsJacobian(seedStates,seedInputs,dynamics),rhs=Array(N).fill(0) as number[];rhs[0]=-p.a*p.initial;const qp=solveEqualityQP(H,q,A,rhs);if(!qp.z||!qp.multipliers)throw new Error('QP non risolto: '+qp.status);
  const cost=(states:number[],inputs:number[])=>{const stage=inputs.map((u,t)=>(p.q*(states[t]-ref[t])**2+p.r*u*u)/2),terminal=p.terminalWeight*(states[N]-ref[N])**2/2;return {stage,terminal,total:stage.reduce((a,b)=>a+b,0)+terminal};};
  const decode=(z:number[],lambda:number[])=>{const states=[p.initial,...z.slice(0,N)],inputs=z.slice(N),gradient=axpy(matvec(H,z),q),stationarity=axpy(gradient,transposeMultiply(A,lambda,D));return {z,lambda,states,inputs,cost:cost(states,inputs),primal:norm(residual(states,inputs,dynamics)),dual:norm(stationarity)};};
  const points=[decode([...seedStates.slice(1),...seedInputs],Array(N).fill(0)),decode(qp.z,qp.multipliers)];
  return {N,D,H,A,ref,points,cost,reduced:(u0:number,u1:number,tail:readonly number[])=>{const u=tail.map((v,t)=>t===0?u0:t===1?u1:v);return cost(rollout(p.initial,u,dynamics),u).total;}};
}
export interface StructureParams {n:number;m:number;horizon:number;a:number;b:number;nonlinear:number;initial:number;input:number;q:number;r:number;terminalWeight:number;}
export const structureDefaults:StructureParams={n:2,m:1,horizon:4,a:.7,b:.5,nonlinear:.2,initial:.3,input:.2,q:1,r:.2,terminalWeight:3};
export function computeStructure(p:Readonly<StructureParams>){
  const n=Math.round(p.n),m=Math.round(p.m),N=Math.round(p.horizon);if(n<1||n>3||m<1||m>3||N<2||N>8)throw new Error('Dimensioni oltre il limite didattico.');
  const A=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?p.a:j===i-1?.1:0)),B=Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>p.b/(1+Math.abs(i-j)))),inputs=Array.from({length:N},(_,t)=>Array.from({length:m},(_,j)=>p.input*Math.cos(2*Math.PI*t/N)/(j+1))),states=[Array.from({length:n},(_,i)=>p.initial/(i+1))],J:Matrix=[],blocks:Matrix[]=[],rows:string[]=[],columns=[...Array.from({length:N},(_,t)=>Array.from({length:n},(_,i)=>`x${t+1}[${i+1}]`)).flat(),...Array.from({length:N},(_,t)=>Array.from({length:m},(_,i)=>`u${t}[${i+1}]`)).flat()];
  for(let t=0;t<N;t++){const x=states[t],At=A.map((row,i)=>row.map((v,j)=>v+(i===j?p.nonlinear*(1-Math.tanh(x[i])**2):0)));blocks.push(At);states.push(axpy(matvec(A,x),matvec(B,inputs[t])).map((v,i)=>v+p.nonlinear*Math.tanh(x[i])));for(let i=0;i<n;i++){const row=Array((n+m)*N).fill(0) as number[];row[t*n+i]=-1;if(t>0)for(let j=0;j<n;j++)row[(t-1)*n+j]=At[i][j];for(let j=0;j<m;j++)row[n*N+t*m+j]=B[i][j];J.push(row);rows.push(`h${t}[${i+1}]`);}}
  const D=(n+m)*N,H=Array.from({length:D},(_,i)=>Array.from({length:D},(_,j)=>i===j?i<n*N?(i>=n*(N-1)?p.terminalWeight:p.q):p.r:0)),rank=nullBasis(J,D).rank;
  return {n,m,N,D,A,B,blocks,J,H,states,inputs,rows,columns,rank,tangentDimension:D-rank,nonzeros:J.flat().filter(v=>v!==0).length};
}
export interface RecallParams {kind:'graph'|'degenerate';x:number;y:number;targetX:number;targetY:number;shape:number;weight:number;lambda:number;}
export const recallDefaults:RecallParams={kind:'graph',x:0,y:0,targetX:0,targetY:-1,shape:.5,weight:1,lambda:1};
export function computeRecall(p:Readonly<RecallParams>){
  const degenerate=p.kind==='degenerate',h=degenerate?p.x*p.x:p.shape*p.x*p.x-p.y,gradient=degenerate?[1,p.y]:[p.x-p.targetX,p.weight*(p.y-p.targetY)],normal=degenerate?[2*p.x,0]:[2*p.shape*p.x,-1],weighted=normal.map(v=>v*p.lambda),stationarity=axpy(gradient,weighted),regular=norm(normal)>1e-9,feasible=Math.abs(h)<1e-9,kkt=feasible&&norm(stationarity)<1e-8,den=1+(2*p.shape*p.x)**2,curvature=(1+2*p.shape*p.lambda+p.weight*(2*p.shape*p.x)**2)/den;
  const value=(x:number,y:number)=>degenerate?x+y*y/2:((x-p.targetX)**2+p.weight*(y-p.targetY)**2)/2;
  const classification=degenerate?'Su x²=0, (0,0) è un minimo vincolato ma ∇h=0: nessun λ annulla ∇f. Il teorema richiede regolarità.':!feasible?'Punto non ammissibile: la stazionarietà da sola non basta.':!kkt?'Punto ammissibile, ma il gradiente della Lagrangiana non è nullo.':curvature>1e-8?'Punto KKT e curvatura tangente positiva: minimo locale stretto.':curvature< -1e-8?'Punto KKT con curvatura tangente negativa: massimo locale sulla curva, non un minimo.':'Punto KKT: test del secondo ordine inconcludente.';
  return {h,gradient,normal,weighted,stationarity,regular,feasible,kkt,curvature,value,classification,tangent:degenerate?[0,1]:[1,2*p.shape*p.x]};
}
