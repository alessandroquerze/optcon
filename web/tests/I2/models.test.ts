import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { scalarDefaults,computeResidual,computeScalarControl,scalarReference,scalarCosts,scalarRollout } from '../../math/I2/scalar';
import { physicsDefaults,flightDefaults,droneDefaults,droneField,droneStep,droneJacobians,droneRollout,computeFlight,droneReference,droneCosts,droneMargins,droneSensitivities,assembleDrone,solveDrone } from '../../math/I2/drone';
import { norm,axpy,positiveDefinite } from '../../math/O3/solver';
import { I2Lessons } from '../../content/blocks/I2';
import { hasDemo } from '../../demos/registry';
import { formula } from '../../ui/formula';
import inventory from '../../../sources/inventory.json';

describe('I2 — controllo discreto e drone',()=>{
  it('detects exactly the adjacent residuals created by editing one state',()=>{
    const p={...scalarDefaults,a:.8,editTime:4,editDelta:.5},d=computeResidual(p);expect(d.residual[3]).toBeCloseTo(.5,12);expect(d.residual[4]).toBeCloseTo(-.4,12);expect(d.residual.filter(v=>Math.abs(v)>1e-10)).toHaveLength(2);
  });
  it('counts stage zero and terminal cost exactly once',()=>{
    const p={...scalarDefaults,horizon:4,initial:2,q:3,r:2,terminalWeight:5},u=[.1,.2,.3,.4],x=scalarRollout(p,u),ref=scalarReference(p),d=scalarCosts(p,x,u);
    const independent=u.reduce((s,v,t)=>s+1.5*(x[t]-ref[t])**2+v*v,0)+2.5*(x[4]-ref[4])**2;expect(d.total).toBeCloseTo(independent,12);expect(d.tracking).toHaveLength(4);expect(d.tracking[0]).toBe(6);
  });
  it('matches an independent affine Riccati recursion over a moving reference',()=>{
    const p={...scalarDefaults,reference:'ramp' as const},d=computeScalarControl(p),N=p.horizon,ref=scalarReference(p),P=Array(N+1).fill(0),s=Array(N+1).fill(0),K=Array(N).fill(0),feed=Array(N).fill(0);
    P[N]=p.terminalWeight;s[N]=-p.terminalWeight*ref[N];
    for(let t=N-1;t>=0;t--){const D=p.r+p.b*p.b*P[t+1];K[t]=p.a*p.b*P[t+1]/D;feed[t]=p.b*s[t+1]/D;P[t]=p.q+p.a*p.a*P[t+1]-(p.a*p.b*P[t+1])**2/D;s[t]=-p.q*ref[t]+p.a*s[t+1]*p.r/D;}
    let x=p.initial;const last=d.trajectories.at(-1)!;for(let t=0;t<N;t++){const u=-K[t]*x-feed[t];expect(last.inputs[t]).toBeCloseTo(u,9);expect(last.states[t]).toBeCloseTo(x,9);x=p.a*x+p.b*u;}
    expect(d.converged).toBe(true);expect(d.points.at(-1)!.residual).toBeLessThan(1e-9);
  });
  it('distinguishes a soft terminal cost from a hard terminal equality',()=>{
    const soft=computeScalarControl({...scalarDefaults,r:4,terminalWeight:0}),hard=computeScalarControl({...scalarDefaults,r:4,terminalWeight:0,endpoint:1});
    expect(Math.abs(soft.trajectories.at(-1)!.endpointResidual)).toBeGreaterThan(.1);expect(Math.abs(hard.trajectories.at(-1)!.endpointResidual)).toBeLessThan(1e-10);
  });
  it('solves scalar convex barriers without violating input or state limits',()=>{
    const p={...scalarDefaults,bounds:1},d=computeScalarControl(p);expect(d.converged,d.status).toBe(true);const last=d.trajectories.at(-1)!;
    expect(last.pathViolation).toBe(0);expect(Math.max(...last.residual.map(Math.abs))).toBeLessThan(1e-8);expect(d.points.at(-1)!.dual).toBeLessThan(1e-6);
    expect(computeScalarControl({...p,endpoint:1,target:2}).status).toContain('fuori');
  });
  it('preserves exact hover at physical gravity with both Euler and the continuous field',()=>{
    const p=physicsDefaults,x=[0,0,1,0,0,0],u=[p.mass*p.gravity/2,p.mass*p.gravity/2];expect(droneField(x,u,p)).toEqual([0,-0,0,0,0,0]);expect(droneStep(x,u,p)).toEqual(x);
    computeFlight(flightDefaults).states.forEach(z=>expect(z).toEqual(x));
  });
  it('has the source torque sign, free fall and the expected Euler update',()=>{
    const p=physicsDefaults,x=[0,0,1,0,.2,0],f=droneField(x,[6,4],p);expect(f[1]).toBeLessThan(0);expect(f[5]).toBeCloseTo(p.length*2/(2*p.inertia),12);
    const free=droneStep([0,0,1,0,0,0],[0,0],p);expect(free[2]).toBe(1);expect(free[3]).toBeCloseTo(-p.gravity*p.dt,12);
    const next=droneStep(free,[0,0],p);expect(next[2]).toBeCloseTo(1-p.gravity*p.dt**2,12);
  });
  it('matches finite differences of all state and input Jacobian columns',()=>{
    const x=[.1,.2,1,.1,.25,-.1],u=[5,4],p=physicsDefaults,{A,B}=droneJacobians(x,u,p),h=1e-6;
    for(let j=0;j<6;j++){const a=[...x],b=[...x];a[j]+=h;b[j]-=h;const plus=droneStep(a,u,p),minus=droneStep(b,u,p);for(let i=0;i<6;i++)expect(A[i][j]).toBeCloseTo((plus[i]-minus[i])/(2*h),8);}
    for(let j=0;j<2;j++){const a=[...u],b=[...u];a[j]+=h;b[j]-=h;const plus=droneStep(x,a,p),minus=droneStep(x,b,p);for(let i=0;i<6;i++)expect(B[i][j]).toBeCloseTo((plus[i]-minus[i])/(2*h),8);}
  });
  it('has first-order Euler convergence against analytic free fall',()=>{
    const error=(dt:number)=>{const p={...physicsDefaults,dt},N=Math.round(1/dt),x=droneRollout([0,0,10,0,0,0],Array.from({length:N},()=>[0,0]),p).at(-1)!;return Math.abs(x[2]-(10-p.gravity/2));};expect(error(.1)/error(.05)).toBeCloseTo(2,10);
  });
  it('propagates reduced state sensitivities consistently with independent rollouts',()=>{
    const p={...droneDefaults,horizon:6,dt:.1},z=Array(12).fill(0).map((_,i)=>.01*Math.sin(i)),d=droneSensitivities(z,p),h=1e-6;
    for(const j of [0,3,8,11]){const a=[...z],b=[...z];a[j]+=h;b[j]-=h;const plus=droneSensitivities(a,p).states.at(-1)!,minus=droneSensitivities(b,p).states.at(-1)!;for(let i=0;i<6;i++)expect(d.sensitivities.at(-1)![i][j]).toBeCloseTo((plus[i]-minus[i])/(2*h),7);}
  });
  it('matches the exact cost/barrier gradient and uses a positive symmetric Gauss–Newton model',()=>{
    const p={...droneDefaults,horizon:6,dt:.1},z=Array(12).fill(0).map((_,i)=>.003*Math.sin(i)),epsilon=.02,d=assembleDrone(z,p,epsilon),h=1e-6;
    for(let j=0;j<z.length;j++){const a=[...z],b=[...z];a[j]+=h;b[j]-=h;expect(d.gradient[j]).toBeCloseTo((assembleDrone(a,p,epsilon).value-assembleDrone(b,p,epsilon).value)/(2*h),5);}
    expect(positiveDefinite(d.model)).toBe(true);d.model.forEach((row,i)=>row.forEach((v,j)=>expect(v).toBeCloseTo(d.model[j][i],12)));
  });
  it('distinguishes absolute thrust cost from deviation about hover',()=>{
    const p={...droneDefaults,reference:'hover' as const,targetX:0,targetY:1},inputs=Array.from({length:p.horizon},()=>[p.mass*p.gravity/2,p.mass*p.gravity/2] as [number,number]),states=droneRollout([0,0,1,0,0,0],inputs,p);
    expect(droneCosts(states,inputs,p).total).toBeGreaterThan(0);expect(droneCosts(states,inputs,{...p,inputReference:'hover'}).total).toBe(0);
    const hovering=solveDrone({...p,limits:0,inputReference:'hover'});expect(hovering.converged).toBe(true);expect(hovering.referenceResidual).toBe(0);
    expect(solveDrone({...p,limits:0}).referenceResidual).toBeCloseTo(p.dt*p.gravity,12);
  });
  it('produces a feasible nonlinear optimized trajectory with a smaller cost than the hover seed',()=>{
    const start=performance.now(),d=solveDrone(droneDefaults),last=d.points.at(-1)!;
    console.info('Drone default:',d.status,'iterations',d.points.length,'dual',last?.dual,'ms',Math.round(performance.now()-start));
    expect(d.points.length).toBeGreaterThan(1);expect(last.cost.total).toBeLessThan(d.points[0].cost.total);expect(last.violation).toBe(0);expect(d.referenceResidual).toBeGreaterThan(.01);
    for(let t=0;t<d.N;t++)expect(norm(axpy(last.states[t+1],droneStep(last.states[t],last.inputs[t],droneDefaults),-1))).toBeLessThan(1e-12);
    expect(d.converged,d.status).toBe(true);expect(last.dual).toBeLessThan(2e-5);
  },20000);
  it('reports incompatible intervals and absence of a strictly interior seed explicitly',()=>{
    expect(solveDrone({...droneDefaults,minThrust:12,maxThrust:5}).status).toContain('intervallo vuoto');
    expect(solveDrone({...droneDefaults,maxThrust:4}).status).toContain('non è strettamente interna');
    expect(solveDrone({...droneDefaults,endpoint:1,targetY:3}).status).toContain('fuori');
    expect(()=>solveDrone({...droneDefaults,inertia:0})).toThrow();
    const d=solveDrone({...droneDefaults,iterations:1});expect(d.converged).toBe(false);expect(d.status).toContain('Budget');
  });
  it('keeps the model planar and constructs a smooth desired position/velocity curve',()=>{
    const p=droneDefaults,ref=droneReference(p);expect(ref[0]).toEqual([p.initialX,0,p.initialY,0,0,0]);expect(ref.at(-1)).toEqual([p.targetX,0,p.targetY,0,0,0]);expect(ref.every(x=>x.length===6)).toBe(true);
    const d=computeFlight({...flightDefaults,u1:6,u2:4});expect(d.states.at(-1)![4]).not.toBe(0);expect(d.states.every(x=>x.every(Number.isFinite))).toBe(true);
  });
  it('enforces the two terminal position equalities when explicitly requested',()=>{
    const p={...droneDefaults,endpoint:1},d=solveDrone(p),last=d.points.at(-1)!;expect(d.converged,d.status).toBe(true);expect(last.primal).toBeLessThan(2e-5);expect(last.states.at(-1)![0]).toBeCloseTo(p.targetX,5);expect(last.states.at(-1)![2]).toBeCloseTo(p.targetY,5);expect(last.violation).toBe(0);
  },20000);
  it('keeps finite feasible candidates or explains a failure at demanding displayed parameter values',()=>{
    for(const changes of [{horizon:24,dt:.1},{mass:2,maxThrust:15},{inertia:.01,length:.6},{targetX:-1,targetY:.5},{reference:'step' as const},{minY:.85,maxY:1.25},{qtheta:0,qomega:0,terminalAngle:0,terminalOmega:0}]){
      const d=solveDrone({...droneDefaults,...changes});expect(d.status.length).toBeGreaterThan(0);for(const row of d.points){expect(Number.isFinite(row.cost.total)).toBe(true);expect(row.violation).toBe(0);expect(row.states.flat().every(Number.isFinite)).toBe(true);}
    }
  },30000);
  it('covers every assigned concept and physical page with unique lessons, registered demos and valid KaTeX',()=>{
    const concepts=inventory.sources.find(s=>s.id==='introduzione')!.concepts.filter(c=>c.block==='I2');expect(I2Lessons).toHaveLength(8);expect(I2Lessons.flatMap(l=>l.conceptIds).sort()).toEqual(concepts.map(c=>c.id).sort());
    expect([...new Set(I2Lessons.flatMap(l=>l.sources.flatMap(s=>s.pages)))].sort((a,b)=>a-b)).toEqual(Array.from({length:12},(_,i)=>i+19));
    expect(new Set(I2Lessons.flatMap(l=>l.demoIds)).size).toBe(8);for(const lesson of I2Lessons){expect(lesson.intuition&&lesson.example&&lesson.assumptions.length&&lesson.observe.length).toBeTruthy();lesson.demoIds.forEach(id=>expect(hasDemo(id)).toBe(true));lesson.formulas.forEach(f=>expect(()=>formula(f.latex)).not.toThrow());}
  });
  it('preserves Base contracts and all consolidated module hashes through I1',()=>{
    const m=JSON.parse(readFileSync(new URL('../../../manifest.json',import.meta.url),'utf8')),hashes={...m.baseContractHashes};
    for(const id of ['O1','O2','O3','I1'])for(const [path,hash] of Object.entries(m.sessions.find((s:{id:string})=>s.id===id).artifactHashes))if(id!=='O1'||!path.includes('/tests/'))hashes[path]=hash;
    for(const [path,hash] of Object.entries(hashes))expect(createHash('sha256').update(readFileSync(new URL('../../../'+path,import.meta.url))).digest('hex'),path).toBe(hash);
  });
});
