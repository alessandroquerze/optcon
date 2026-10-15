export interface IntegralParams {duration:number;intervals:number;initial:number;target:number;bias:number;amplitude:number;frequency:number;q:number;r:number;terminalWeight:number;}
export const integralDefaults:IntegralParams={duration:4,intervals:16,initial:0,target:1,bias:.2,amplitude:.5,frequency:1,q:1,r:.2,terminalWeight:2};
export function computeIntegral(p:Readonly<IntegralParams>){
  if(!(p.duration>0&&p.intervals>=2&&p.frequency>=0))throw new Error('Durata, numero di intervalli e frequenza non validi.');
  const T=p.duration,N=Math.round(p.intervals),dt=T/N,w=p.frequency,d=p.initial-p.target,b=p.bias,A=p.amplitude,
    input=(t:number)=>b+A*Math.cos(w*t),exact=(t:number)=>p.initial+b*t+(w>1e-8?A*Math.sin(w*t)/w:A*t),density=(t:number)=>p.q*(exact(t)-p.target)**2+p.r*input(t)**2;
  let tracking:number,effort:number;
  if(w<1e-8){const v=b+A;tracking=d*d*T+d*v*T*T+v*v*T**3/3;effort=v*v*T;}
  else{const c=A/w;tracking=d*d*T+d*b*T*T+b*b*T**3/3+2*d*c*(1-Math.cos(w*T))/w+2*b*c*(-T*Math.cos(w*T)/w+Math.sin(w*T)/(w*w))+c*c*(T/2-Math.sin(2*w*T)/(4*w));effort=b*b*T+2*b*A*Math.sin(w*T)/w+A*A*(T/2+Math.sin(2*w*T)/(4*w));}
  const times=Array.from({length:N+1},(_,i)=>i*dt),inputs=times.slice(0,-1).map(input),states=[p.initial];for(const u of inputs)states.push(states.at(-1)!+dt*u);
  const exactStates=times.map(exact),samples=times.slice(0,-1).map(density),terminal=p.terminalWeight*(exact(T)-p.target)**2,
    leftIntegral=dt*samples.reduce((a,b)=>a+b,0),eulerIntegral=dt*inputs.reduce((sum,u,t)=>sum+p.q*(states[t]-p.target)**2+p.r*u*u,0),eulerTerminal=p.terminalWeight*(states[N]-p.target)**2;
  return {N,dt,times,inputs,states,exactStates,samples,input,exact,density,tracking:p.q*tracking,effort:p.r*effort,terminal,exactCost:p.q*tracking+p.r*effort+terminal,leftCost:leftIntegral+terminal,eulerCost:eulerIntegral+eulerTerminal,unscaledCost:samples.reduce((a,b)=>a+b,0)+terminal,maxStateError:Math.max(...states.map((x,i)=>Math.abs(x-exactStates[i])))};
}
