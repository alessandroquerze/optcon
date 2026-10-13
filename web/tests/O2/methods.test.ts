import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Vec2 } from '../../math/quadratic';
import { objective, finiteHessian, direction, computeDescent, descentDefaults, backtrack, add, norm,
  computeRoot, rootDefaults, computeModel, modelDefaults, project, violation, computeProjection, projectionDefaults,
  computeProjected, projectedDefaults, computeGallery, galleryDefaults, barrierObjective, barrierCenter, computeBarrier, barrierDefaults } from '../../math/O2/methods';
import { dot } from '../../math/O1/foundations';
import { O2Lessons } from '../../content/blocks/O2';
import { hasDemo } from '../../demos/registry';
import { formula } from '../../ui/formula';
import inventory from '../../../sources/inventory.json';

describe('O2: analytic checks of algorithms and domain conditions',()=>{
  it('matches analytic gradients and Hessians to independent centered finite differences',()=>{
    const z:Vec2=[.7,-.3],h=1e-5;
    for(const kind of ['quadratic','double-well','exponential','linear'] as const){
      const f=objective(kind,7),g=f.gradient(z),H=f.hessian(z);
      for(let j=0;j<2;j++){
        const d:Vec2=j===0?[h,0]:[0,h];
        expect(g[j]).toBeCloseTo((f.value(add(z,d))-f.value(add(z,d,-1)))/(2*h),6);
        const gp=f.gradient(add(z,d)),gm=f.gradient(add(z,d,-1));
        for(let i=0;i<2;i++)expect(H[i][j]).toBeCloseTo((gp[i]-gm[i])/(2*h),6);
      }
    }
  });
  it('recovers the quadratic minimizer with exact and finite-difference Newton in one step',()=>{
    for(const method of ['newton','finite-newton'] as const){
      const d=computeDescent({...descentDefaults,method,rule:'fixed',step:1});
      expect(d.points).toHaveLength(2);expect(norm(d.points[1].z)).toBeLessThan(1e-12);
      expect(d.points[1].value).toBeLessThan(1e-24);
    }
  });
  it('checks scaled descent and rejects an indefinite Newton model instead of calling it a minimum',()=>{
    const f=objective('double-well'),z:Vec2=[.2,.5];
    const scaled=direction(f,z,{...descentDefaults,method:'scaled'});
    expect(dot(f.gradient(z),scaled.d!)).toBeLessThan(0);
    expect(direction(f,z,{...descentDefaults,method:'newton'}).d).toBeUndefined();
    expect(direction(f,z,{...descentDefaults,method:'newton',regularization:5}).d).toBeDefined();
  });
  it('has exact finite-difference curvature for a QP and second-order error for the quartic',()=>{
    const z:Vec2=[.2,.5];
    const quadratic=objective('quadratic'),H=quadratic.hessian(z),approx=finiteHessian(quadratic,z,.1);
    for(let i=0;i<2;i++)for(let j=0;j<2;j++)expect(approx[i][j]).toBeCloseTo(H[i][j],12);
    const f=objective('double-well'),exact=f.hessian(z)[0][0];
    expect((finiteHessian(f,z,.2)[0][0]-exact)/(finiteHessian(f,z,.1)[0][0]-exact)).toBeCloseTo(4,9);
  });
  it('satisfies Armijo at the first accepted geometric trial and rejects ascent',()=>{
    const f=objective('quadratic',8),z:Vec2=[1,1],d=f.gradient(z).map(v=>-v) as unknown as Vec2;
    const a=backtrack(f,z,d,1,.7,.5);
    expect(a.trials.length).toBeGreaterThan(1);
    a.trials.forEach((t,i)=>{expect(t.step).toBeCloseTo(.7**i,12);expect(t.accepted).toBe(i===a.trials.length-1);});
    expect(f.value(add(z,d,a.step))).toBeLessThanOrEqual(f.value(z)+.5*a.step*dot(f.gradient(z),d));
    expect(backtrack(f,z,f.gradient(z)).step).toBe(0);
    expect(backtrack(f,[0,0],[0,0]).trials).toHaveLength(0);
    expect(()=>backtrack(f,z,d,1,1,.5)).toThrow();
  });
  it('agrees with the closed-form quadratic recurrence and detects unstable steps',()=>{
    const p={...descentDefaults,rule:'fixed' as const,step:.1,condition:5,iterations:12};
    const d=computeDescent(p),Q=objective('quadratic',5).hessian([0,0]);
    let expected:Vec2=[p.x,p.y];
    for(const point of d.points){expect(point.z[0]).toBeCloseTo(expected[0],12);expect(point.z[1]).toBeCloseTo(expected[1],12);expected=add(expected,[Q[0][0]*expected[0]+Q[0][1]*expected[1],Q[1][0]*expected[0]+Q[1][1]*expected[1]],-.1);}
    const unstable=computeDescent({...p,step:.6});
    expect(unstable.points.at(-1)!.value).toBeGreaterThan(unstable.points[0].value);
    const alternating=computeDescent({...p,condition:1,step:2,iterations:4});
    expect(alternating.points[2].z[0]).toBeCloseTo(p.x,12);
    expect(alternating.points[1].value).toBeCloseTo(alternating.points[0].value,12);
  });
  it('keeps Armijo costs decreasing and distinguishes unbounded linear cost from stationarity',()=>{
    const d=computeDescent({...descentDefaults,kind:'double-well',x:.2,y:1,iterations:40});
    d.points.slice(1).forEach((p,i)=>expect(p.value).toBeLessThanOrEqual(d.points[i].value));
    const linear=computeDescent({...descentDefaults,kind:'linear',rule:'fixed',step:1,iterations:10});
    expect(linear.points.at(-1)!.value-linear.points[0].value).toBeCloseTo(-20,12);
    linear.points.forEach(p=>expect(p.gradientNorm).toBeCloseTo(Math.sqrt(2),12));
    const saddle=computeDescent({...descentDefaults,kind:'double-well',x:0,y:0});
    expect(saddle.points).toHaveLength(1);expect(saddle.status).toContain('gradiente');
    expect(objective('double-well').value([.1,0])).toBeLessThan(saddle.points[0].value);
  });
  it('uses k+1 for diminishing steps and shows stalling when their sum is too small',()=>{
    const d=computeDescent({...descentDefaults,condition:1,rule:'diminishing',step:.1,alpha:1.5,iterations:100});
    expect(d.points[1].step).toBeCloseTo(.1,12);
    expect(d.points[2].step).toBeCloseTo(.1/2**1.5,12);
    expect(d.points.at(-1)!.gradientNorm).toBeGreaterThan(1);
  });
  it('solves square roots locally and reports zero derivatives and the explicit Newton cycle',()=>{
    const root=computeRoot(rootDefaults);expect(root.points.at(-1)!).toBeCloseTo(Math.sqrt(2),9);
    expect(root.status).toContain('tolleranza');
    const error=root.points.slice(0,4).map(z=>z-Math.sqrt(2));
    expect(error[3]/error[2]**2).toBeCloseTo(1/(2*root.points[2]),8);
    expect(Math.abs(error[3]/error[2]**2-1/(2*Math.sqrt(2)))).toBeLessThan(.001);
    expect(computeRoot({...rootDefaults,start:0}).status).toContain('Derivata nulla');
    const cycle=computeRoot({...rootDefaults,kind:'cycle',start:0});
    expect(cycle.points).toEqual([0,1,0]);expect(cycle.status).toContain('Ciclo');
  });
  it('has an exact quadratic model and the corrected signed Newton update',()=>{
    const d=computeModel({...modelDefaults,kind:'quadratic',regularization:0});
    for(const z of [[1,1],[-2,.3],[0,0]] as Vec2[])expect(d.model(z)).toBeCloseTo(d.f.value(z),12);
    expect(norm(d.next!)).toBeLessThan(1e-12);expect(d.modelResidual!).toBeLessThan(1e-12);
    expect(computeModel({...modelDefaults,regularization:0}).d).toBeUndefined();
    expect(computeModel(modelDefaults).spectrum[0]).toBeGreaterThan(0);
  });
  it('projects analytically onto disks and boxes, including interiors and idempotence',()=>{
    expect(project([3,4],'disk',1)[0]).toBeCloseTo(.6,12);expect(project([3,4],'disk',1)[1]).toBeCloseTo(.8,12);
    expect(project([3,4],'box',1)).toEqual([1,1]);
    for(const set of ['disk','box'] as const)for(const v of [[0,0],[.2,-.3],[3,4],[-2,.5]] as Vec2[]){
      const z=project(v,set,1);expect(violation(z,set,1)).toBeLessThan(1e-12);expect(project(z,set,1)).toEqual(z);
    }
    expect(()=>project([1,1],'disk',0)).toThrow();
  });
  it('verifies the projection inequality and the exact minimum of the variational slope',()=>{
    for(const set of ['disk','box'] as const)for(const theta of [0,.2,.5,.8,1]){
      const d=computeProjection({...projectionDefaults,set,theta});
      expect(d.projectionInequality).toBeLessThanOrEqual(1e-12);
      expect(dot(d.g,add(d.trial,d.z,-1))).toBeGreaterThanOrEqual(d.minSlope-1e-12);
    }
    const optimum=computeProjection({...projectionDefaults,x:3,y:0});
    expect(optimum.minSlope).toBeCloseTo(0,12);expect(optimum.mapping).toBeCloseTo(0,12);expect(norm(optimum.g)).toBeGreaterThan(0);
    const nonoptimal=computeProjection({...projectionDefaults,x:0,y:1});expect(nonoptimal.minSlope).toBeLessThan(0);
  });
  it('converges to the analytic box QP optimum while keeping every point feasible',()=>{
    const d=computeProjected({...projectedDefaults,iterations:100});
    expect(d.points.at(-1)!.z[0]).toBeCloseTo(1.5,8);expect(d.points.at(-1)!.z[1]).toBeCloseTo(.5,8);
    expect(d.points.at(-1)!.gradientNorm).toBeLessThan(1e-8);
    expect(norm(d.objective.gradient(d.points.at(-1)!.z))).toBeCloseTo(1.5,8);
    d.points.forEach(p=>expect(violation(p.z,'box',1.5)).toBeLessThan(1e-12));
  });
  it('keeps feasible-direction combinations in convex sets and rejects extrapolation',()=>{
    for(const set of ['box','disk'] as const)for(const step of [.1,.5,1]){
      const d=computeProjected({...projectedDefaults,set,method:'feasible',step,x:3,y:3});
      expect(d.initialWasProjected).toBe(true);d.points.forEach(p=>expect(violation(p.z,set,1.5)).toBeLessThan(1e-12));
    }
    expect(()=>computeProjected({...projectedDefaults,method:'feasible',step:1.1})).toThrow();
  });
  it('preserves the original gallery functions and the analytic exponential optimum',()=>{
    const q=computeGallery({...galleryDefaults,x:2});expect(q.value).toBe(-14);expect(q.derivative).toBe(6);expect(q.curvature).toBe(48);
    const e=computeGallery({...galleryDefaults,kind:'exponential',x:-Math.log(2)/2,y:0});
    expect(e.value).toBeCloseTo(2*Math.sqrt(2)*Math.exp(-.1),12);
    expect(norm(objective('exponential').gradient([-Math.log(2)/2,0]))).toBeLessThan(1e-12);
    expect(computeGallery({...galleryDefaults,kind:'square',x:2}).value).toBe(4);
  });
  it('matches barrier derivatives and treats the boundary as outside the logarithm domain',()=>{
    const p=barrierDefaults,f=barrierObjective(p,.2),z:Vec2=[.4,-.6],h=1e-5;
    for(let j=0;j<2;j++){
      const d:Vec2=j===0?[h,0]:[0,h];
      expect(f.gradient(z)[j]).toBeCloseTo((f.value(add(z,d))-f.value(add(z,d,-1)))/(2*h),7);
      expect(f.hessian(z)[j][j]).toBeCloseTo((f.gradient(add(z,d))[j]-f.gradient(add(z,d,-1))[j])/(2*h),7);
    }
    expect(f.value([p.size,0])).toBe(Infinity);expect(f.value([p.size+.01,0])).toBe(Infinity);
    expect(computeBarrier({...p,x:p.size}).valid).toBe(false);
  });
  it('checks central points independently, barrier gap bounds, and strictly interior Newton iterates',()=>{
    const p=barrierDefaults,d=computeBarrier(p),exact:Vec2=[p.size,p.targetY],fstar=((exact[0]-p.targetX)**2)/2;
    expect(d.status).toBe('Stadi completati');expect(d.centers).toHaveLength(p.stages);
    for(let stage=0;stage<p.stages;stage++){
      const eps=p.epsilon*p.shrink**stage,z=d.centers[stage],f=barrierObjective(p,eps);
      expect(norm(f.gradient(z))).toBeLessThan(1e-9);
      const gap=((z[0]-p.targetX)**2+(z[1]-p.targetY)**2)/2-fstar;
      expect(gap).toBeGreaterThanOrEqual(0);expect(gap).toBeLessThanOrEqual(4*eps);
    }
    d.points.forEach(q=>expect(Math.max(...q.z.map(Math.abs))).toBeLessThan(p.size));
    expect(norm(add(d.points.at(-1)!.z,d.centers.at(-1)!,-1))).toBeLessThan(1e-7);
    expect(barrierCenter(3,1.5,.001)).toBeGreaterThan(barrierCenter(3,1.5,.1));
  });
  it('keeps finite recorded data or reports failure at the displayed parameter extremes',()=>{
    for(const kind of ['quadratic','double-well','exponential','linear'] as const)
      for(const method of ['gradient','scaled','newton','finite-newton'] as const)
        for(const rule of ['fixed','armijo','diminishing'] as const){
          const d=computeDescent({...descentDefaults,kind,method,rule,x:-3,y:3,condition:30,step:2,regularization:0,difference:.001,iterations:100});
          expect(d.status.length).toBeGreaterThan(0);expect(d.points.length).toBeLessThanOrEqual(101);
          for(const q of d.points)for(const v of [...q.z,q.value,q.gradientNorm,q.step])expect(Number.isFinite(v)).toBe(true);
        }
    for(const size of [.5,2.5])for(const epsilon of [.01,3]){
      const p={...barrierDefaults,size,epsilon,shrink:.1,stages:6,targetX:4,targetY:-4};
      const d=computeBarrier(p);expect(d.valid).toBe(true);
      for(const q of d.points){expect(q.value).not.toBeNaN();expect(norm(q.z)).not.toBeNaN();expect(Math.max(...q.z.map(Math.abs))).toBeLessThan(size);}
      expect(d.status==='Stadi completati'||d.status.includes('Budget')||d.status.includes('fallita')).toBe(true);
    }
  });
  it('covers the 11 concepts and all 29 assigned pages with valid formulas and registered demos',()=>{
    const concepts=inventory.sources.find(s=>s.id==='ottimizzazione')!.concepts.filter(c=>c.block==='O2');
    expect(O2Lessons.flatMap(s=>s.conceptIds).sort()).toEqual(concepts.map(c=>c.id).sort());
    expect(new Set(O2Lessons.map(s=>s.id)).size).toBe(11);
    expect([...new Set(O2Lessons.flatMap(s=>s.sources.flatMap(r=>r.pages)))].sort((a,b)=>a-b)).toEqual(Array.from({length:29},(_,i)=>i+26));
    for(const section of O2Lessons){
      expect(section.intuition&&section.example&&section.assumptions.length&&section.observe.length).toBeTruthy();
      section.demoIds.forEach(id=>expect(hasDemo(id),id).toBe(true));
      section.formulas.forEach(f=>expect(()=>formula(f.latex)).not.toThrow());
    }
  });
  it('preserves all Base contracts and the completed O1 content, computation and visualization files',()=>{
    const m=JSON.parse(readFileSync(new URL('../../../manifest.json',import.meta.url),'utf8'));
    const o1=m.sessions.find((s:{id:string})=>s.id==='O1');
    const hashes={...m.baseContractHashes,...Object.fromEntries(Object.entries(o1.artifactHashes).filter(([p])=>!p.includes('/tests/')))};
    for(const [path,hash] of Object.entries(hashes))expect(createHash('sha256').update(readFileSync(new URL('../../../'+path,import.meta.url))).digest('hex'),path).toBe(hash);
  });
});
