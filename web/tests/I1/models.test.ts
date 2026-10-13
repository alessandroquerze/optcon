import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { I1Lessons } from '../../content/blocks/I1';
import { hasDemo } from '../../demos/registry';
import { formula } from '../../ui/formula';
import inventory from '../../../sources/inventory.json';
import { mapValue,mapJacobian,computeDiscrete,discreteDefaults,computeEquilibrium,equilibriumDefaults,computeLinearization,linearizationDefaults,computeContinuous,continuousDefaults,rk4Step,computeControl,controlDefaults,oneStepInput,computeMotivation,motivationDefaults,navigationReference } from '../../math/I1/systems';
import { computeScalar,scalarDefaults,computeWeights,weightDefaults,computeConstraints,constraintDefaults,constraintBoundary,computeOptimization,optimizationDefaults } from '../../math/I1/geometry';

describe('I1 — sistemi, geometria e copertura',()=>{
  it('matches an independent closed form for the forced linear recurrence and stack indices',()=>{
    const p={...discreteDefaults,nonlinear:0,amplitude:0,mean:.4},d=computeDiscrete(p);
    d.states.forEach((x,t)=>expect(x).toBeCloseTo(p.a**t*p.initial+p.b*p.mean*(1-p.a**t)/(1-p.a),12));
    expect(d.stateStack).toEqual(d.states.slice(1));expect(d.inputStack).toEqual(d.inputs);
    expect(d.stateStack).toHaveLength(d.N);expect(d.residual.every(v=>v===0)).toBe(true);
  });
  it('changes only future states after an input pulse and rejects overflowing trajectories',()=>{
    const p={...discreteDefaults,nonlinear:0},a=computeDiscrete(p),b=computeDiscrete({...p,kick:1,kickTime:4});
    expect(a.states.slice(0,5)).toEqual(b.states.slice(0,5));expect(b.states[5]-a.states[5]).toBeCloseTo(p.b,12);
    expect(()=>computeDiscrete({...p,a:100,horizon:40})).toThrow('limite numerico');
  });
  it('balances an equilibrium exactly and separates stability from existence',()=>{
    const d=computeEquilibrium({...equilibriumDefaults,initial:equilibriumDefaults.candidate});
    expect(Math.abs(d.equilibriumResidual)).toBeLessThan(1e-14);d.states.forEach(x=>expect(x).toBeCloseTo(equilibriumDefaults.candidate,12));
    expect(d.classification).toContain('asintoticamente stabile');
    expect(computeEquilibrium({...equilibriumDefaults,a:1.2,nonlinear:0}).classification).toContain('instabile');
    expect(computeEquilibrium({...equilibriumDefaults,a:1,nonlinear:0}).classification).toContain('inconcludente');
    expect(computeEquilibrium({...equilibriumDefaults,balance:0,input:0}).classification).toContain('non è un equilibrio');
  });
  it('detects the two dynamic residuals created by editing an interior state',()=>{
    const d=computeEquilibrium({...equilibriumDefaults,editDelta:.5,nonlinear:0,a:.7});
    expect(d.residual[4]).toBeCloseTo(.5,12);expect(d.residual[5]).toBeCloseTo(-.35,12);
    expect(d.residual.filter(v=>Math.abs(v)>1e-12)).toHaveLength(2);
  });
  it('agrees with independent finite differences of both map Jacobians',()=>{
    const p=linearizationDefaults,h=1e-6;
    for(const x of [-1.2,0,.9]){const J=mapJacobian(x,p);expect(J.A).toBeCloseTo((mapValue(x+h,.3,p)-mapValue(x-h,.3,p))/(2*h),8);expect(J.B).toBeCloseTo((mapValue(x,.3+h,p)-mapValue(x,.3-h,p))/(2*h),8);}
  });
  it('is exact for affine dynamics and shows second-order perturbation error for nonlinear dynamics',()=>{
    expect(computeLinearization({...linearizationDefaults,nonlinear:0}).maxError).toBeLessThan(1e-12);
    const small=computeLinearization({...linearizationDefaults,epsilon:.001}),large=computeLinearization({...linearizationDefaults,epsilon:.002});
    expect(large.maxError/small.maxError).toBeGreaterThan(3.8);expect(large.maxError/small.maxError).toBeLessThan(4.2);
  });
  it('requires an affine defect correction around a sequence that is not a trajectory',()=>{
    const p={...linearizationDefaults,nonlinear:0,defect:.3};
    expect(computeLinearization(p).maxDefect).toBeGreaterThan(.29);expect(computeLinearization(p).maxError).toBeGreaterThan(.29);
    expect(computeLinearization({...p,correction:1}).maxError).toBeLessThan(1e-12);
  });
  it('integrates a harmonic oscillator against its analytic sine/cosine solution',()=>{
    const p={...continuousDefaults,amplitude:0,bias:0,damping:0,nonlinear:0,omega:1.5,dt:.02},d=computeContinuous(p);
    d.states.forEach((z,i)=>{expect(z[0]).toBeCloseTo(Math.cos(p.omega*d.times[i]),6);expect(z[1]).toBeCloseTo(-p.omega*Math.sin(p.omega*d.times[i]),6);});
    expect(Math.max(...d.energy)-Math.min(...d.energy)).toBeLessThan(1e-7);
  });
  it('has fourth-order global convergence for the RK4 integrator',()=>{
    const integrate=(dt:number)=>{let z=[1];for(let k=0;k<Math.round(1/dt);k++)z=rk4Step(k*dt,z,dt,(_t,z)=>[z[0]]);return Math.abs(z[0]-Math.E);};
    expect(integrate(.1)/integrate(.05)).toBeGreaterThan(15);expect(integrate(.1)/integrate(.05)).toBeLessThan(17);
  });
  it('changes the output independently of the state and dissipates free damped energy',()=>{
    const a=computeContinuous(continuousDefaults),b=computeContinuous({...continuousDefaults,outputVelocity:1,feedthrough:.5});
    expect(a.states).toEqual(b.states);b.outputs.forEach((y,i)=>expect(y).toBeCloseTo(b.states[i][0]+b.states[i][1]+.5*b.inputs[i],12));
    const damped=computeContinuous({...continuousDefaults,amplitude:0,bias:0});expect(damped.energy.at(-1)!).toBeLessThan(damped.energy[0]);
  });
  it('solves the one-step quadratic independently of a dense feasible grid',()=>{
    for(const limit of [.1,2])for(const x of [-2,.3,2]){
      const p={...controlDefaults,limit},d=oneStepInput(x,1,p),derivative=p.q*p.b*(p.a*x+p.b*d.free-1)+p.r*d.free;
      expect(Math.abs(derivative)).toBeLessThan(1e-12);expect(Math.abs(d.input)).toBeLessThanOrEqual(limit);
      for(let i=0;i<=200;i++)expect(d.cost(d.input)).toBeLessThanOrEqual(d.cost(-limit+2*limit*i/200)+1e-12);
    }
  });
  it('enforces saturation, accounts for unanticipated disturbance and distinguishes weights from gain design',()=>{
    const p={...controlDefaults,limit:.1,disturbance:.8},d=computeControl(p);
    d.inputs.forEach(u=>expect(Math.abs(u)).toBeLessThanOrEqual(.1));
    const t=Math.floor(d.N/2);expect(d.states[t+1]-p.a*d.states[t]-p.b*d.inputs[t]).toBeCloseTo(.8,12);
    const gain=computeControl({...p,r:2});expect(gain.states).toEqual(d.states);expect(gain.costs.at(-1)!).toBeGreaterThan(d.costs.at(-1)!);
    const cheap=computeControl({...controlDefaults,mode:'one-step'}),costly=computeControl({...controlDefaults,mode:'one-step',r:2});expect(Math.abs(costly.inputs[0])).toBeLessThan(Math.abs(cheap.inputs[0]));
  });
  it('obeys exact constant-acceleration steps and the vector input limit in every application',()=>{
    for(const scenario of ['aircraft','robot','car','drone','space'] as const){
      const p={...motivationDefaults,scenario,limit:.2,disturbance:.3},d=computeMotivation(p);
      for(let k=0;k<d.N;k++){const a=d.points[k],b=d.points[k+1];expect(Math.hypot(...a.input)).toBeLessThanOrEqual(p.limit+1e-12);
        for(let j=0;j<3;j++){const acc=a.input[j]+(j===1?p.disturbance:0);expect(b.position[j]).toBeCloseTo(a.position[j]+d.dt*a.velocity[j]+.5*d.dt**2*acc,12);expect(b.velocity[j]).toBeCloseTo(a.velocity[j]+d.dt*acc,12);}}
      expect(d.points.at(-1)!.tracking).toBeGreaterThanOrEqual(0);expect(d.points.at(-1)!.effort).toBeGreaterThanOrEqual(0);
      expect(computeMotivation({...p,trackingWeight:4,effortWeight:2}).points).toEqual(d.points);
      if(['car','robot','space'].includes(scenario))expect(d.points.every(z=>z.position[2]===0)).toBe(true);
    }
    expect(navigationReference('drone',.5,6,.7).position[2]).not.toBe(0);
  });
  it('has the scalar quadratic derivatives and the correct zero-weight argmin',()=>{
    const p={...scalarDefaults,weight:3,point:-.4},d=computeScalar(p),h=1e-5;
    expect(d.derivative).toBeCloseTo((d.value(p.point+h)-d.value(p.point-h))/(2*h),9);expect(d.curvature).toBe(3);
    const zero=computeScalar({...p,weight:0});expect(zero.unique).toBe(false);expect(zero.cost).toBe(0);
  });
  it('has a rotated PSD kernel and distinguishes rank zero, one and two',()=>{
    for(const angle of [-90,0,35,90]){const d=computeWeights({...weightDefaults,angle});expect(d.rank).toBe(1);
      for(const t of [-3,0,3])expect(Math.abs(d.value(d.center[0]+t*d.flat[0],d.center[1]+t*d.flat[1]))).toBeLessThan(1e-12);
      for(const x of [-2,0,2])for(const y of [-2,0,2])expect(d.value(x,y)).toBeGreaterThanOrEqual(-1e-12);}
    expect(computeWeights({...weightDefaults,w1:0,w2:0}).rank).toBe(0);expect(computeWeights({...weightDefaults,w2:2}).rank).toBe(2);
  });
  it('classifies ellipses, hyperbolas, empty sets, entire planes and a nonaffine convex equality',()=>{
    expect(computeConstraints(constraintDefaults).convex).toBe(true);
    expect(computeConstraints({...constraintDefaults,kind:'equality'}).convex).toBe(false);
    expect(computeConstraints({...constraintDefaults,b:-1,kind:'equality'}).empty).toBe(false);
    expect(computeConstraints({...constraintDefaults,c:-1}).empty).toBe(true);
    expect(computeConstraints({...constraintDefaults,a:-1,b:-1,c:1}).whole).toBe(true);
    const line=computeConstraints({...constraintDefaults,kind:'equality',a:1,b:0,c:0});expect(line.convex).toBe(true);expect(line.whole).toBe(false);
  });
  it('computes global conic ranges with rotation, null directions and linear terms',()=>{
    const p={...constraintDefaults,a:2,b:2,cross:1,qx:2,qy:-2,c:1},d=computeConstraints(p);
    expect(d.minimum).toBeCloseTo(-3,12);expect(d.maximum).toBe(Infinity);expect(d.value(-1,1)).toBeCloseTo(d.minimum,12);
    const singular=computeConstraints({...constraintDefaults,a:1,b:0,qy:1});expect(singular.minimum).toBe(-Infinity);expect(singular.maximum).toBe(Infinity);
    const negative=computeConstraints({...p,a:-2,b:-2,cross:-1});expect(negative.maximum).toBeCloseTo(1,12);expect(negative.minimum).toBe(-Infinity);
  });
  it('matches exact projections, detects incompatible constraints and guards the optimality gap',()=>{
    const disk=computeOptimization(optimizationDefaults);expect(Math.hypot(...disk.optimum!)).toBeCloseTo(1,12);
    expect(disk.optimum![0]).toBeCloseTo(2/Math.sqrt(5),12);
    expect(computeOptimization({...optimizationDefaults,set:'box'}).optimum).toEqual([1,1]);
    const line=computeOptimization({...optimizationDefaults,set:'line',offset:1});expect(line.optimum![0]+line.optimum![1]).toBeCloseTo(1,12);
    const mixed=computeOptimization({...optimizationDefaults,set:'intersection',offset:1});expect(Math.hypot(...mixed.optimum!)).toBeLessThanOrEqual(1+1e-12);expect(mixed.optimum![0]+mixed.optimum![1]).toBeCloseTo(1,12);
    expect(computeOptimization({...optimizationDefaults,set:'intersection',offset:3}).optimum).toBeUndefined();
    expect(computeOptimization({...optimizationDefaults,x:2,y:1}).gap).toBeUndefined();expect(disk.gap!).toBeGreaterThanOrEqual(0);
  });
  it('draws exact conic roots including repeated-root lines, isolated points and intersecting lines',()=>{
    const cases=[constraintDefaults,{...constraintDefaults,a:1,b:-1},{...constraintDefaults,a:1,b:0,c:0},{...constraintDefaults,a:1,b:1,c:0},{...constraintDefaults,a:0,b:0,cross:1,c:0},{...constraintDefaults,a:1,b:1,cross:1,c:0}];
    for(const p of cases){const d=computeConstraints(p),paths=constraintBoundary(p);expect(paths.length).toBeGreaterThan(0);for(const path of paths)for(const [x,y] of path){expect(Math.abs(d.value(x,y))).toBeLessThan(1e-9);expect(Math.max(Math.abs(x),Math.abs(y))).toBeLessThanOrEqual(3+1e-10);}}
    expect(constraintBoundary({...constraintDefaults,a:1,b:1,c:0})).toEqual([[[0,0]]]);
    expect(constraintBoundary({...constraintDefaults,c:-1})).toEqual([]);
  });
  it('covers every assigned concept/page with registered laboratories and valid KaTeX',()=>{
    const entries=inventory.sources.find(s=>s.id==='introduzione')!.concepts.filter(c=>c.block==='I1'&&c.kind==='theory');
    expect(I1Lessons.flatMap(s=>s.conceptIds).sort()).toEqual(entries.map(c=>c.id).sort());expect(I1Lessons).toHaveLength(10);
    expect([...new Set(I1Lessons.flatMap(s=>s.sources.flatMap(r=>r.pages)))].sort((a,b)=>a-b)).toEqual(Array.from({length:17},(_,i)=>i+2));
    expect(new Set(I1Lessons.flatMap(s=>s.demoIds)).size).toBe(11);
    for(const s of I1Lessons){expect(s.intuition&&s.example&&s.assumptions.length&&s.observe.length).toBeTruthy();s.demoIds.forEach(id=>expect(hasDemo(id)).toBe(true));s.formulas.forEach(f=>expect(()=>formula(f.latex)).not.toThrow());}
  });
  it('preserves every Base contract and the versioned O1/O2/O3 modules',()=>{
    const m=JSON.parse(readFileSync(new URL('../../../manifest.json',import.meta.url),'utf8')),hashes={...m.baseContractHashes};
    for(const id of ['O1','O2','O3'])for(const [path,hash] of Object.entries(m.sessions.find((s:{id:string})=>s.id===id).artifactHashes))if(id!=='O1'||!path.includes('/tests/'))hashes[path]=hash;
    for(const [path,hash] of Object.entries(hashes))expect(createHash('sha256').update(readFileSync(new URL('../../../'+path,import.meta.url))).digest('hex'),path).toBe(hash);
  });
});
