import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { integralDefaults,computeIntegral } from '../../math/I3/continuous';
import { physicsDefaults,simulationDefaults,equilibriumDefaults,referenceDefaults,transferDefaults,field,step,energy,equilibriumTorque,simulate,computeEquilibrium,computeReference,assembleTransfer,solveTransfer,smoothSeed } from '../../math/I3/pendulum';
import { axpy,norm,positiveDefinite } from '../../math/O3/solver';
import { I3Lessons } from '../../content/blocks/I3';
import { hasDemo } from '../../demos/registry';
import { formula } from '../../ui/formula';
import inventory from '../../../sources/inventory.json';
describe('I3 — funzionali, pendolo e controllo continuo',()=>{
  it('covers all assigned concepts and physical pages with registered demos and valid formulas',()=>{
    const concepts=inventory.sources.find(s=>s.id==='introduzione')!.concepts.filter(c=>c.block==='I3');
    expect(I3Lessons.flatMap(s=>s.conceptIds).sort()).toEqual(concepts.map(c=>c.id).sort());
    expect([...new Set(I3Lessons.flatMap(s=>s.sources.flatMap(r=>r.pages)))].sort()).toEqual([31,32,33,34,35,36]);
    for(const lesson of I3Lessons){expect(lesson.intuition.length).toBeGreaterThan(100);expect(lesson.assumptions.length).toBeGreaterThan(0);lesson.demoIds.forEach(id=>expect(hasDemo(id),id).toBe(true));lesson.formulas.forEach(f=>expect(formula(f.latex)).not.toContain('formula-error'));}
  });
  it('matches a closed polynomial integral including the terminal without a half factor',()=>{
    const p={...integralDefaults,frequency:0,initial:2,target:1,bias:.2,amplitude:.5},d=computeIntegral(p),v=.7,T=p.duration;
    expect(d.exactCost).toBeCloseTo(p.q*(T+v*T*T+v*v*T**3/3)+p.r*v*v*T+p.terminalWeight*(1+v*T)**2,10);
    expect(d.maxStateError).toBeLessThan(1e-12);
  });
  it('agrees with an independent dense quadrature for the sinusoidal analytic integral',()=>{
    const d=computeIntegral(integralDefaults),N=10000,dt=integralDefaults.duration/N;let sum=0;for(let i=0;i<N;i++)sum+=dt*d.density((i+.5)*dt);
    expect(sum+d.terminal).toBeCloseTo(d.exactCost,6);
  });
  it('converges with the time weight and exposes divergence of the sum without dt',()=>{
    const p={...integralDefaults,frequency:0},a=computeIntegral({...p,intervals:16}),b=computeIntegral({...p,intervals:64});expect(Math.abs(b.leftCost-b.exactCost)).toBeLessThan(Math.abs(a.leftCost-a.exactCost));expect(b.unscaledCost).toBeGreaterThan(a.unscaledCost*2);
  });
  it('has the analytic equilibrium for arbitrary angles and the corrected zero-velocity condition',()=>{
    for(const angle of [-2,-.6,0,.7,Math.PI]){const u=equilibriumTorque(angle,physicsDefaults);expect(norm(field([angle,0],u,physicsDefaults))).toBeLessThan(1e-12);}
    const bad=computeEquilibrium({...equilibriumDefaults,velocity:.2});expect(bad.isEquilibrium).toBe(false);expect(bad.residual[0]).toBe(.2);
  });
  it('distinguishes conservative centers, unstable equilibria and a degenerate linear test',()=>{
    expect(computeEquilibrium(equilibriumDefaults).classification).toContain('non asintoticamente');expect(computeEquilibrium({...equilibriumDefaults,angle:Math.PI}).classification).toContain('instabile');expect(computeEquilibrium({...equilibriumDefaults,angle:Math.PI/2}).classification).toContain('inconcludente');
    expect(computeEquilibrium({...equilibriumDefaults,balance:0,torque:0}).isEquilibrium).toBe(false);
  });
  it('has gravity independent of mass and torque acceleration proportional to inverse inertia',()=>{
    const x=[.4,0];expect(field(x,0,{...physicsDefaults,mass:2})).toEqual(field(x,0,physicsDefaults));
    const a=field([0,0],2,physicsDefaults)[1];expect(field([0,0],2,{...physicsDefaults,mass:2})[1]).toBe(a/2);expect(field([0,0],2,{...physicsDefaults,length:2})[1]).toBe(a/4);
  });
  it('obeys mechanical power balance and conserves tilted energy under constant torque',()=>{
    const x=[.6,.8],u=1.4,p=physicsDefaults,f=field(x,u,p),h=1e-6;
    expect((energy(axpy(x,f,h),p)-energy(axpy(x,f,-h),p))/(2*h)).toBeCloseTo(u*x[1],8);
    const d=simulate({...simulationDefaults,torque:u,intervals:160}),tilted=d.states.map(x=>energy(x,p)-u*x[0]);expect(Math.max(...tilted)-Math.min(...tilted)).toBeLessThan(1e-4);
  });
  it('shows energy drift in Euler while RK4 preserves the free pendulum much better',()=>{
    const rk=simulate(simulationDefaults),eu=simulate({...simulationDefaults,method:'euler'}),drift=(a:number[])=>Math.max(...a)-Math.min(...a);expect(drift(rk.energies)).toBeLessThan(1e-4);expect(drift(eu.energies)).toBeGreaterThan(.1);
  });
  it('matches zero-gravity constant acceleration and Euler first-order convergence',()=>{
    const p={...physicsDefaults,gravity:0},T=2,u=1,acc=u/(p.mass*p.length*p.length),run=(N:number,method:'euler'|'rk4')=>{let x=[0,0];for(let i=0;i<N;i++)x=step(x,u,p,T/N,method);return x;};
    expect(run(10,'rk4')[0]).toBeCloseTo(.5*acc*T*T,12);expect(Math.abs(run(20,'euler')[0]-2)/Math.abs(run(40,'euler')[0]-2)).toBeCloseTo(2,10);
  });
  it('places the discontinuity at T/2 and does not confuse equilibrium feedforward with a transfer',()=>{
    const d=computeReference(referenceDefaults);expect(d.defects.filter(v=>v>1e-8)).toHaveLength(1);expect(d.defects[d.N/2-1]).toBeCloseTo(d.jump,12);
    d.states.slice(0,d.N/2+1).forEach(x=>expect(x[0]).toBeCloseTo(referenceDefaults.startAngle,12));expect(d.states.at(-1)![0]).not.toBeCloseTo(referenceDefaults.targetAngle,2);
  });
  it('uses the integral time weight and the source cost without 1/2 on every grid',()=>{
    const p={...transferDefaults,startAngle:0,targetAngle:1},expected=p.duration*p.qAngle/2+p.duration*p.r*equilibriumTorque(1,p)**2/2+p.terminalAngle;
    for(const intervals of [16,32])for(const method of ['euler','rk4'] as const){const d=assembleTransfer(Array(intervals).fill(0),{...p,intervals,method});expect(d.cost.total).toBeCloseTo(expected,10);}
  });
  it('matches finite differences of the exact discretized integral and barrier gradient for both methods',()=>{
    for(const method of ['euler','rk4'] as const){const p={...transferDefaults,intervals:8,duration:1,method},z=Array.from({length:8},(_,i)=>smoothSeed((i+.5)/8,p).torque/(p.mass*p.gravity*p.length)),d=assembleTransfer(z,p,.02),h=1e-6;
      for(let j=0;j<8;j++){const a=[...z],b=[...z];a[j]+=h;b[j]-=h;expect(d.gradient[j]).toBeCloseTo((assembleTransfer(a,p,.02).value-assembleTransfer(b,p,.02).value)/(2*h),5);}}
  });
  it('uses a positive symmetric Gauss–Newton model and correct endpoint sensitivities',()=>{
    const p={...transferDefaults,intervals:8,duration:1,endpoint:1},z=Array(8).fill(0),d=assembleTransfer(z,p,.02),h=1e-6;expect(positiveDefinite(d.model)).toBe(true);
    d.model.forEach((row,i)=>row.forEach((v,j)=>expect(v).toBeCloseTo(d.model[j][i],12)));
    for(let j=0;j<8;j++){const a=[...z],b=[...z];a[j]+=h;b[j]-=h;const ap=assembleTransfer(a,p).h,bp=assembleTransfer(b,p).h;for(let i=0;i<2;i++)expect(d.A[i][j]).toBeCloseTo((ap[i]-bp[i])/(2*h),6);}
  });
  it('leaves a constant equilibrium at zero cost when no torque barrier is requested',()=>{
    const p={...transferDefaults,startAngle:.4,targetAngle:.4,limits:0},d=solveTransfer(p);expect(d.converged,d.status).toBe(true);expect(d.points.at(-1)!.cost.total).toBeLessThan(1e-20);
  });
  it('optimizes a bounded transfer and validates the same torque on a refined RK4 grid',()=>{
    const start=performance.now(),d=solveTransfer(transferDefaults),last=d.points.at(-1)!;console.info('Pendulum default:',d.status,'candidates',d.points.length,'dual',last?.dual,'ms',Math.round(performance.now()-start));
    expect(d.converged,d.status).toBe(true);expect(last.cost.total).toBeLessThan(d.points[0].cost.total);expect(last.violation).toBe(0);expect(last.dual).toBeLessThan(2e-5);expect(d.refined!.maxStateError).toBeLessThan(.01);expect(d.refined!.states).toHaveLength(4*d.N+1);
    for(let t=0;t<d.N;t++)expect(norm(axpy(last.states[t+1],step(last.states[t],last.inputs[t],transferDefaults,d.dt,transferDefaults.method),-1))).toBeLessThan(1e-10);
  },20000);
  it('can impose both terminal angle and zero angular velocity explicitly',()=>{
    const d=solveTransfer({...transferDefaults,endpoint:1});expect(d.converged,d.status).toBe(true);expect(d.points.at(-1)!.primal).toBeLessThan(2e-5);expect(d.points.at(-1)!.violation).toBe(0);
  },20000);
  it('reports budgets and rejects invalid physical parameters without claiming global optimality',()=>{
    expect(solveTransfer({...transferDefaults,iterations:1}).status).toContain('Budget');expect(()=>solveTransfer({...transferDefaults,mass:0})).toThrow();expect(()=>solveTransfer({...transferDefaults,intervals:9})).toThrow();
    for(const changes of [{mass:2,length:.7},{intervals:16,method:'euler' as const},{torqueLimit:2},{reference:'smooth' as const},{targetAngle:Math.PI,duration:5,iterations:12}]){const d=solveTransfer({...transferDefaults,...changes});expect(d.status.length).toBeGreaterThan(0);for(const row of d.points){expect(row.violation).toBe(0);expect(Number.isFinite(row.cost.total)).toBe(true);expect(row.states.flat().every(Number.isFinite)).toBe(true);}}
  },30000);
  it('preserves Base and all consolidated artifacts through I2 byte for byte',()=>{
    const m=JSON.parse(readFileSync(new URL('../../../manifest.json',import.meta.url),'utf8')),hashes={...m.baseContractHashes};for(const id of ['O1','O2','O3','I1','I2'])for(const [path,hash] of Object.entries(m.sessions.find((s:{id:string})=>s.id===id).artifactHashes))if(id!=='O1'||!path.includes('/tests/'))hashes[path]=hash;
    for(const [path,hash] of Object.entries(hashes))expect(createHash('sha256').update(readFileSync(new URL('../../../'+path,import.meta.url))).digest('hex'),path).toBe(hash);
  });
});
