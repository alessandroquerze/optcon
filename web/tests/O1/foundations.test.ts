import { describe,it,expect } from 'vitest';
import { computeLandscape,landscapeDefaults,wellStationary,wellValue,computeDerivatives,derivativeDefaults,
  derivativeValue,computeStationary,stationaryDefaults,computeSet,setDefaults,computeConstraints,constraintDefaults,
  computeFunction,functionDefaults,computeBounds,boundsDefaults,computeQP,qpDefaults,dot,multiply } from '../../math/O1/foundations';
import { O1Lessons } from '../../content/blocks/O1';
import inventory from '../../../sources/inventory.json';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { matrixLatex } from '../../demos/O1';
import { formula } from '../../ui/formula';

describe('O1: definitions, counterexamples and analytic calculations',()=>{
  it('renders numeric matrices and column vectors as valid KaTeX tables',()=>{
    for(const entries of [[[1,2],[3,4]],[[.7],[1.2]],[[0,0],[0,2]]]) {
      expect(()=>formula(matrixLatex(entries))).not.toThrow();
      expect(formula(matrixLatex(entries))).toContain('<mtable');
    }
  });
  it('finds both equal global minima and the intervening maximum of the symmetric quartic',()=>{
    const d=computeLandscape({...landscapeDefaults,tilt:0});
    expect(d.stationary.map(p=>p.x)).toEqual(expect.arrayContaining([expect.closeTo(-1,9),expect.closeTo(0,9),expect.closeTo(1,9)]));
    expect(d.minimum).toBeCloseTo(0,12);expect(d.minimizers).toHaveLength(2);
    expect(d.classification).toContain('non stretto');
  });
  it('solves the cubic stationarity equation, including the merger of two stationary points',()=>{
    for(const tilt of [-2,-0.5,0,0.5,2,8/(3*Math.sqrt(3))]) {
      const roots=wellStationary(tilt);
      for(const root of roots)expect(4*root**3-4*root+tilt).toBeCloseTo(0,8);
    }
    expect(wellStationary(2)).toHaveLength(1);
    expect(wellStationary(8/(3*Math.sqrt(3)))).toHaveLength(2);
    const tilted=computeLandscape({...landscapeDefaults,tilt:0.5});
    expect(tilted.minimizers).toHaveLength(1);expect(tilted.minimizers[0]).toBeLessThan(0);
    for(const x of [-3,-1,0,1,3])expect(wellValue(x,.5)).toBeGreaterThanOrEqual(tilted.minimum-1e-9);
  });
  it('matches finite differences for gradient, Hessian and directional derivative',()=>{
    const p={...derivativeDefaults,x:.7,y:-.4,cross:1.2,quartic:.35},d=computeDerivatives(p),eps=1e-5;
    const gradient=(x:number,y:number)=>computeDerivatives({...p,x,y}).gradient;
    expect(d.gradient[0]).toBeCloseTo((derivativeValue(p.x+eps,p.y,p.cross,p.quartic)-derivativeValue(p.x-eps,p.y,p.cross,p.quartic))/(2*eps),7);
    expect(d.gradient[1]).toBeCloseTo((derivativeValue(p.x,p.y+eps,p.cross,p.quartic)-derivativeValue(p.x,p.y-eps,p.cross,p.quartic))/(2*eps),7);
    expect(d.hessian[0][0]).toBeCloseTo((gradient(p.x+eps,p.y)[0]-gradient(p.x-eps,p.y)[0])/(2*eps),7);
    expect(d.hessian[0][1]).toBeCloseTo((gradient(p.x,p.y+eps)[0]-gradient(p.x,p.y-eps)[0])/(2*eps),7);
    const plus=derivativeValue(p.x+eps*d.direction[0],p.y+eps*d.direction[1],p.cross,p.quartic);
    const minus=derivativeValue(p.x-eps*d.direction[0],p.y-eps*d.direction[1],p.cross,p.quartic);
    expect(d.directional).toBeCloseTo((plus-minus)/(2*eps),7);
  });
  it('has an exact quadratic Taylor model without a quartic term',()=>{
    expect(computeDerivatives({...derivativeDefaults,quartic:0}).secondError).toBeLessThan(1e-12);
    const big=computeDerivatives({...derivativeDefaults,step:.4});
    const small=computeDerivatives({...derivativeDefaults,step:.1});
    expect(small.firstError).toBeLessThan(big.firstError);expect(small.secondError).toBeLessThan(big.secondError);
  });
  it('distinguishes degenerate minima and saddles with the same zero Hessian',()=>{
    const minimum=computeStationary({...stationaryDefaults,a:0,b:0,quarticX:1,quarticY:1});
    const saddle=computeStationary({...stationaryDefaults,a:0,b:0,quarticX:1,quarticY:-1});
    expect(minimum.eigenvalues).toEqual([0,0]);expect(saddle.eigenvalues).toEqual([0,0]);
    expect(minimum.classification).toBe('Minimo locale stretto');expect(saddle.classification).toBe('Punto di sella');
    expect(computeStationary({...stationaryDefaults,a:0,b:0,quarticX:0,quarticY:1}).classification).toBe('Minimo locale non stretto');
  });
  it('finds a segment counterexample for an annulus and circle but not for a disk',()=>{
    for(const kind of ['annulus','circle'] as const) {
      const d=computeSet({...setDefaults,kind});expect(d.inside).toBe(false);expect(d.convex).toBe(false);
    }
    for(const theta of [0,.1,.5,.9,1])expect(computeSet({...setDefaults,kind:'disk',theta}).inside).toBe(true);
    expect(computeSet({...setDefaults,kind:'annulus',theta:0}).inside).toBe(true);
  });
  it('disproves the fixed-sublevel equivalence using the same non-quasiconvex function',()=>{
    const zero=computeConstraints({...constraintDefaults,level:0});
    const negative=computeConstraints({...constraintDefaults,level:-.5});
    expect(zero.outer).toBeCloseTo(Math.sqrt(2),12);expect(zero.inner).toBe(0);expect(zero.inside).toBe(true);
    expect(negative.inner).toBeGreaterThan(0);expect(negative.inside).toBe(false);expect(negative.residual).toBeCloseTo(.5,12);
  });
  it('shows a convex zero set for a nonaffine equality and equality at segment endpoints',()=>{
    const affine=computeConstraints({...constraintDefaults,kind:'affine',level:.5});
    const nonlinear=computeConstraints({...constraintDefaults,kind:'nonlinear-equality',level:.5});
    expect(affine.point).toEqual(nonlinear.point);expect(nonlinear.convex).toBe(true);expect(nonlinear.inside).toBe(true);
    expect(nonlinear.point[0]).toBe(.5);
    for(const theta of [0,1])expect(computeConstraints({...constraintDefaults,level:-.8,theta}).inside).toBe(true);
  });
  it('handles strict convexity without positive Hessian, chord violations and non-attainment',()=>{
    const quartic=computeFunction({...functionDefaults,a:0,b:1});expect(quartic.strict).toBe(true);expect(quartic.convex).toBe(true);
    const nonconvex=computeFunction({...functionDefaults,a:-1,b:1,A:-.5,B:.5});expect(nonconvex.gap).toBeLessThan(0);
    expect(computeFunction({...functionDefaults,kind:'exponential'}).minimum).toContain('non raggiunto');
    expect(computeFunction({...functionDefaults,theta:0}).gap).toBeCloseTo(0,12);
    expect(computeFunction({...functionDefaults,kind:'affine',a:0}).minimum).toContain('Ogni punto');
  });
  it('uses the standard mu/2 convention and the finite-domain Lipschitz constant',()=>{
    const d=computeBounds(boundsDefaults);expect(d.actualMu).toBe(1);expect(d.actualL).toBeCloseTo(2.8,12);
    expect(d.validMu&&d.validL).toBe(true);
    for(const base of [-1.8,-.5,0,.9,1.8])for(const target of [-1.8,-.5,0,.9,1.8]) {
      const r=computeBounds({...boundsDefaults,base,target});
      for(const gap of [r.lowerGap,r.upperGap,r.monotoneGap,r.cocoerciveGap,r.combinedGap])expect(gap).toBeGreaterThanOrEqual(-1e-9);
    }
    expect(computeBounds({...boundsDefaults,mu:3}).validMu).toBe(false);
    expect(computeBounds({...boundsDefaults,L:.5}).validL).toBe(false);
    const weak=computeBounds({...boundsDefaults,a:0,b:1,mu:0,L:12});
    expect(weak.validMu&&weak.validL).toBe(true);expect(weak.combinedGap).toBeGreaterThanOrEqual(-1e-9);
    expect(()=>computeBounds({...boundsDefaults,target:3})).toThrow(RangeError);
  });
  it('recovers exact lower, upper and combined equalities for a quadratic with mu=L',()=>{
    const d=computeBounds({...boundsDefaults,a:2,b:0,mu:2,L:2});
    for(const gap of [d.lowerGap,d.upperGap,d.monotoneGap,d.cocoerciveGap,d.combinedGap])expect(gap).toBeCloseTo(0,12);
  });
  it('solves a rotated positive definite QP and agrees with the analytic stationary cost',()=>{
    const d=computeQP(qpDefaults);expect(d.bounded&&d.unique).toBe(true);expect(d.stationaryResidual).toBeLessThan(1e-12);
    const q=[qpDefaults.qx,qpDefaults.qy] as const;
    expect(d.minimum).toBeCloseTo(.5*dot(d.minimizer,multiply(d.Q,d.minimizer))+dot(q,d.minimizer),12);
    expect(d.minimum).toBeCloseTo(.5*dot(q,d.minimizer),12);
  });
  it('distinguishes compatible and incompatible linear terms in a singular PSD QP',()=>{
    const compatible=computeQP({lambda1:0,lambda2:2,angle:0,qx:0,qy:1});
    expect(compatible.bounded).toBe(true);expect(compatible.unique).toBe(false);
    expect(compatible.minimizer).toEqual([0,-.5]);expect(compatible.minimum).toBe(-.25);
    const incompatible=computeQP({lambda1:0,lambda2:2,angle:0,qx:1,qy:0});
    expect(incompatible.bounded).toBe(false);expect(incompatible.minimum).toBeNull();
    expect(dot([1,0],incompatible.descent)).toBeLessThan(0);
    expect(computeQP({...qpDefaults,lambda1:-1}).bounded).toBe(false);
    const negative=computeQP({lambda1:-1,lambda2:2,angle:0,qx:1,qy:0});
    expect(dot([1,0],negative.descent)).toBeLessThanOrEqual(0);
  });
  it('covers exactly the 12 O1 theory concepts without duplicate section ids, with complete source references',()=>{
    const expected=inventory.sources.find(s=>s.id==='ottimizzazione')!.concepts.filter(c=>c.block==='O1'&&c.kind==='theory').map(c=>c.id);
    const assigned=O1Lessons.flatMap(s=>s.conceptIds);
    expect([...assigned].sort()).toEqual([...expected].sort());expect(new Set(assigned).size).toBe(12);
    expect(new Set(O1Lessons.map(s=>s.id)).size).toBe(9);
    const covered=new Set(O1Lessons.flatMap(s=>s.sources.flatMap(r=>r.pages)));
    expect([...covered].sort((a,b)=>a-b)).toEqual(Array.from({length:24},(_,i)=>i+2));
    for(const section of O1Lessons)expect(section.formulas.length&&section.assumptions.length&&section.demoIds.length&&section.observe.length).toBeTruthy();
  });
  it('keeps all frozen Base contracts byte-for-byte identical',()=>{
    const manifest=JSON.parse(readFileSync(new URL('../../../manifest.json',import.meta.url),'utf8'));
    for(const [path,hash] of Object.entries(manifest.baseContractHashes)) {
      const bytes=readFileSync(new URL('../../../'+path,import.meta.url));
      expect(createHash('sha256').update(bytes).digest('hex'),path).toBe(hash);
    }
  });
});
