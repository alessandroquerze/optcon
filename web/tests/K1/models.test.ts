import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { map,derivatives,rollout,residual,dynamicsJacobian,sensitivities,curveDefaults,computeCurve,geometryDefaults,computeGeometry,controlDefaults,computeControl,structureDefaults,computeStructure,recallDefaults,computeRecall } from '../../math/K1/trajectories';
import { axpy,norm,matvec,nullBasis,dot } from '../../math/O3/solver';
import { K1Lessons } from '../../content/blocks/K1';
import { hasDemo } from '../../demos/registry';
import { formula } from '../../ui/formula';
import inventory from '../../../sources/inventory.json';
describe('K1 — varietà delle traiettorie e spazio tangente',()=>{
  it('covers the eight theory concepts and physical pages 2–12 with registered demos',()=>{
    const concepts=inventory.sources.find(s=>s.id==='kkt')!.concepts.filter(c=>c.block==='K1'&&c.kind==='theory');expect(K1Lessons.flatMap(s=>s.conceptIds).sort()).toEqual(concepts.map(c=>c.id).sort());expect([...new Set(K1Lessons.flatMap(s=>s.sources.flatMap(r=>r.pages)))].sort((a,b)=>a-b)).toEqual(Array.from({length:11},(_,i)=>i+2));
    for(const lesson of K1Lessons){expect(lesson.intuition.length).toBeGreaterThan(100);expect(lesson.assumptions.length).toBeGreaterThan(0);lesson.demoIds.forEach(id=>expect(hasDemo(id),id).toBe(true));lesson.formulas.forEach(f=>expect(formula(f.latex)).not.toContain('formula-error'));}
  });
  it('uses the source sign f−xnext and keeps x0 fixed outside the decision stack',()=>{
    const p={...curveDefaults,nonlinear:0,quadratic:0},d=computeCurve(p);expect(d.z).toHaveLength(2*d.N);expect(d.z[0]).toBe(d.edited[1]);expect(d.edited[0]).toBe(p.initial);expect(d.h[1]).toBeCloseTo(-.3,12);expect(d.h[2]).toBeCloseTo(p.a*.3,12);expect(d.h.filter(v=>Math.abs(v)>1e-10)).toHaveLength(2);
  });
  it('changes only the preceding residual when a terminal state is edited',()=>{const d=computeCurve({...curveDefaults,editTime:4});expect(d.h.filter(v=>Math.abs(v)>1e-10)).toHaveLength(1);expect(d.h[3]).toBeCloseTo(-.3,12);});
  it('repairs a curve by forward rollout with the edited input, without a projection claim',()=>{const p={...curveDefaults,editInput:.4,repair:1},d=computeCurve(p);expect(d.defect).toBe(0);expect(d.editedInputs[1]).toBeCloseTo(.1,12);expect(d.edited).toEqual(rollout(p.initial,d.editedInputs,p));});
  it('matches derivatives of the reused nonlinear map plus quadratic input term',()=>{const p=curveDefaults,x=.4,u=-.6,h=1e-6,j=derivatives(x,u,p);expect(j.A).toBeCloseTo((map(x+h,u,p)-map(x-h,u,p))/(2*h),8);expect(j.B).toBeCloseTo((map(x,u+h,p)-map(x,u-h,p))/(2*h),8);});
  it('has the exact lower triangular state Jacobian with −1 on its diagonal',()=>{
    const d=computeCurve({...curveDefaults,editState:0});d.J.forEach((row,i)=>{expect(row[i]).toBe(-1);for(let j=i+1;j<d.N;j++)expect(row[j]).toBe(0);});expect(d.rank).toBe(d.N);expect(d.tangentDimension).toBe(d.N);
    const b0=computeCurve({...curveDefaults,b:0,quadratic:0});expect(b0.rank).toBe(b0.N);
  });
  it('matches every column of Dh with finite differences of the full stacked residual',()=>{
    const d=computeCurve(curveDefaults),h=1e-6;
    for(let j=0;j<2*d.N;j++){const a=[...d.z],b=[...d.z];a[j]+=h;b[j]-=h;const ra=residual([curveDefaults.initial,...a.slice(0,d.N)],a.slice(d.N),curveDefaults),rb=residual([curveDefaults.initial,...b.slice(0,d.N)],b.slice(d.N),curveDefaults);for(let i=0;i<d.N;i++)expect(d.J[i][j]).toBeCloseTo((ra[i]-rb[i])/(2*h),8);}
  });
  it('matches forward sensitivities with independently perturbed rollouts',()=>{
    const d=computeGeometry({...geometryDefaults,horizon:5}),h=1e-6;
    for(let j=0;j<d.N;j++){const a=[...d.inputs],b=[...d.inputs];a[j]+=h;b[j]-=h;const xa=rollout(geometryDefaults.initial,a,geometryDefaults),xb=rollout(geometryDefaults.initial,b,geometryDefaults);for(let t=0;t<=d.N;t++)expect(d.S[t][j]).toBeCloseTo((xa[t]-xb[t])/(2*h),8);}
  });
  it('spans the entire kernel by [S;I], including when inputs have no first-order effect',()=>{
    for(const changes of [{},{b:0,quadratic:0}]){const p={...geometryDefaults,horizon:4,...changes},d=computeGeometry(p);for(let j=0;j<d.N;j++){const direction=[...d.S.slice(1).map(row=>row[j]),...d.inputs.map((_,k)=>Number(k===j))];expect(norm(matvec(d.J,direction))).toBeLessThan(1e-12);}expect(nullBasis(d.J,2*d.N).basis).toHaveLength(d.N);expect(d.dx[0]).toBe(0);}
  });
  it('shows second-order rollout error and dynamics defect for a tangential perturbation',()=>{
    const a=computeGeometry(geometryDefaults,1e-3),b=computeGeometry(geometryDefaults,5e-4);expect(a.tangency).toBeLessThan(1e-12);expect(a.error/b.error).toBeCloseTo(4,2);expect(a.defect/b.defect).toBeCloseTo(4,2);
  });
  it('shows first-order error for an increment outside the kernel',()=>{const p={...geometryDefaults,normal:.3},a=computeGeometry(p,1e-4),b=computeGeometry(p,5e-5);expect(a.tangency).toBeCloseTo(.3,12);expect(a.error/b.error).toBeCloseTo(2,3);expect(a.defect/b.defect).toBeCloseTo(2,3);});
  it('is exactly affine up to roundoff when both nonlinear terms vanish',()=>{const d=computeGeometry({...geometryDefaults,nonlinear:0,quadratic:0});expect(d.error).toBeLessThan(1e-14);expect(d.defect).toBeLessThan(1e-14);expect(d.chordDefect).toBeLessThan(1e-14);});
  it('demonstrates nonconvexity with an infeasible midpoint of two full trajectories',()=>{const d=computeGeometry(geometryDefaults);d.chordStates.forEach((x,i)=>expect(norm(residual(x,d.chordInputs[i],geometryDefaults))).toBeLessThan(1e-14));expect(d.chordDefect).toBeGreaterThan(.1);});
  it('solves the linearly constrained QP with small primal and dual residuals',()=>{
    const d=computeControl(controlDefaults),last=d.points[1];expect(last.primal).toBeLessThan(1e-12);expect(last.dual).toBeLessThan(1e-12);expect(last.cost.total).toBeLessThan(d.points[0].cost.total);expect(d.reduced(last.inputs[0],last.inputs[1],last.inputs)).toBeCloseTo(last.cost.total,12);
  });
  it('agrees with an independent scalar Riccati recursion over the reference',()=>{
    const p=controlDefaults,d=computeControl(p),N=d.N,P=Array(N+1).fill(0),s=Array(N+1).fill(0),K=Array(N).fill(0),v=Array(N).fill(0);P[N]=p.terminalWeight;s[N]=-p.terminalWeight*d.ref[N];
    for(let t=N-1;t>=0;t--){const D=p.r+p.b*p.b*P[t+1];K[t]=p.a*p.b*P[t+1]/D;v[t]=p.b*s[t+1]/D;P[t]=p.q+p.a*p.a*P[t+1]-(p.a*p.b*P[t+1])**2/D;s[t]=-p.q*d.ref[t]+p.a*s[t+1]*p.r/D;}
    let x=p.initial;for(let t=0;t<N;t++){const u=-K[t]*x-v[t];expect(d.points[1].inputs[t]).toBeCloseTo(u,11);x=p.a*x+p.b*u;expect(d.points[1].states[t+1]).toBeCloseTo(x,11);}
  });
  it('counts stage zero and terminal once and distinguishes soft cost from equality',()=>{
    const p={...controlDefaults,initial:.7,reference:'constant' as const},d=computeControl(p),q=d.points[1],expected=q.inputs.reduce((sum,u,t)=>sum+(p.q*(q.states[t]-p.target)**2+p.r*u*u)/2,0)+p.terminalWeight*(q.states[d.N]-p.target)**2/2;expect(q.cost.total).toBeCloseTo(expected,12);expect(q.states[d.N]).not.toBeCloseTo(p.target,8);
    const zero=computeControl({...p,q:0,terminalWeight:0});zero.points[1].inputs.forEach(u=>expect(u).toBeCloseTo(0,12));
  });
  it('constructs rectangular Jacobians with full state rank for all illustrated n,m,T',()=>{
    for(const n of [1,2,3])for(const m of [1,2,3])for(const horizon of [2,5,8]){const d=computeStructure({...structureDefaults,n,m,horizon});expect(d.J).toHaveLength(n*horizon);expect(d.J[0]).toHaveLength((n+m)*horizon);expect(d.rank).toBe(n*horizon);expect(d.tangentDimension).toBe(m*horizon);for(let t=0;t<horizon;t++)for(let i=0;i<n;i++)expect(d.J[t*n+i][t*n+i]).toBe(-1);}
  });
  it('preserves temporal sparsity and the correct Q/QT/R block boundary',()=>{
    const d=computeStructure(structureDefaults);d.J.forEach((row,k)=>{const t=Math.floor(k/d.n);row.forEach((v,j)=>{if(j<d.n*d.N&&Math.floor(j/d.n)!==t&&Math.floor(j/d.n)!==t-1)expect(v).toBe(0);if(j>=d.n*d.N&&Math.floor((j-d.n*d.N)/d.m)!==t)expect(v).toBe(0);});});expect(d.H[0][0]).toBe(structureDefaults.q);expect(d.H[d.n*d.N-1][d.n*d.N-1]).toBe(structureDefaults.terminalWeight);expect(d.H.at(-1)!.at(-1)).toBe(structureDefaults.r);
  });
  it('distinguishes a KKT minimum from a KKT maximum and accepts negative equality multipliers',()=>{const min=computeRecall(recallDefaults),max=computeRecall({...recallDefaults,targetY:2,lambda:-2});expect(min.kkt).toBe(true);expect(min.curvature).toBeGreaterThan(0);expect(max.kkt).toBe(true);expect(max.curvature).toBeLessThan(0);expect(max.classification).toContain('massimo');});
  it('exhibits a convex nonlinear zero set with a minimum but no regular KKT multiplier',()=>{for(const lambda of [-3,0,2]){const d=computeRecall({...recallDefaults,kind:'degenerate',lambda});expect(d.feasible).toBe(true);expect(d.regular).toBe(false);expect(norm(d.stationarity)).toBe(1);expect(d.kkt).toBe(false);expect(d.value(0,1)).toBeGreaterThan(d.value(0,0));}});
  it('remains finite at the control extremes and guards unsupported sizes',()=>{
    for(const changes of [{a:1.1,nonlinear:.8,quadratic:1,horizon:6,initial:1,input0:1,input1:1},{a:.3,b:0,nonlinear:0,quadratic:0,initial:-1}]){const d=computeGeometry({...geometryDefaults,...changes});expect([...d.actual,...d.predicted,...d.J.flat()].every(Number.isFinite)).toBe(true);}
    expect(()=>computeCurve({...curveDefaults,horizon:50})).toThrow();expect(()=>computeStructure({...structureDefaults,n:4})).toThrow();expect(()=>computeControl({...controlDefaults,r:0})).toThrow();
  });
  it('preserves all consolidated module hashes through I3',()=>{
    const m=JSON.parse(readFileSync(new URL('../../../manifest.json',import.meta.url),'utf8')),hashes={...m.baseContractHashes};for(const id of ['O1','O2','O3','I1','I2','I3'])for(const [path,hash] of Object.entries(m.sessions.find((s:{id:string})=>s.id===id).artifactHashes))if(id!=='O1'||!path.includes('/tests/'))hashes[path]=hash;
    for(const [path,hash] of Object.entries(hashes))expect(createHash('sha256').update(readFileSync(new URL('../../../'+path,import.meta.url))).digest('hex'),path).toBe(hash);
  });
});
