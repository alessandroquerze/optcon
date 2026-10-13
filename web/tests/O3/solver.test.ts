import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dot,norm,axpy,matvec,nullBasis,solveLinear,solveEqualityQP,lagrangianHessian,solveSQP,formStep,solverDefaults,merit,residuals } from '../../math/O3/solver';
import { computeActive,activeDefaults,computeKKT,kktDefaults,computeCurvature,curvatureDefaults,computeConstrainedQP,qpDefaults,
  makeProblem,computeNLP,nlpDefaults,computeMerit,meritDefaults,computeBarrierEquality,barrierEqDefaults,makeBarrierProblem,
  computeTime,timeDefaults } from '../../math/O3/models';
import { O3Lessons } from '../../content/blocks/O3';
import { hasDemo } from '../../demos/registry';
import { formula } from '../../ui/formula';
import { matrixLatex } from '../../demos/O3/plots';
import inventory from '../../../sources/inventory.json';

describe('O3: constrained algorithms, critical directions and reusable solver',()=>{
  it('solves a pivoting/scaled system with an independent residual and detects singularity',()=>{
    const A=[[0,2,1],[1e-8,0,1e-8],[1,1,0]],known=[1,-2,3],b=matvec(A,known),d=solveLinear(A,b);
    d.solution!.forEach((v,i)=>expect(v).toBeCloseTo(known[i],10));expect(d.relativeResidual).toBeLessThan(1e-12);
    expect(solveLinear([[1,2],[2,4]],[1,2]).status).toBe('singular');
    expect(()=>solveLinear([[1,2]],[1])).toThrow();
  });
  it('builds an orthonormal null basis and recognizes redundant or zero constraint gradients',()=>{
    const A=[[1,2,0,1],[0,1,1,0],[2,4,0,2]],d=nullBasis(A,4);
    expect(d.rank).toBe(2);expect(d.basis).toHaveLength(2);
    for(const v of d.basis){expect(norm(v)).toBeCloseTo(1,12);expect(norm(matvec(A,v))).toBeLessThan(1e-12);}
    expect(dot(d.basis[0],d.basis[1])).toBeCloseTo(0,12);expect(nullBasis([[0,0]],2).rank).toBe(0);
  });
  it('solves a three-dimensional equality QP and its analytic multipliers',()=>{
    const d=solveEqualityQP([[2,0,0],[0,4,0],[0,0,6]],[-2,0,0],[[1,1,1]],[2]);
    expect(d.status).toBe('solved');[17/11,3/11,2/11].forEach((v,i)=>expect(d.z![i]).toBeCloseTo(v,12));
    expect(d.multipliers![0]).toBeCloseTo(-12/11,12);expect(d.relativeResidual).toBeLessThan(1e-12);
  });
  it('accepts an indefinite Q that is positive on ker A and refuses negative reduced curvature as a minimum',()=>{
    const H=[[-1,0],[0,2]],q=[1,-1],good=solveEqualityQP(H,q,[[1,0]],[1]);
    expect(good.status).toBe('solved');expect(good.z).toEqual([1,.5]);
    expect(solveEqualityQP(H,q,[[0,1]],[1]).status).toBe('non-positive-curvature');
    expect(solveEqualityQP(H,q,[[0,1]],[1],false).status).toBe('solved');
    expect(solveEqualityQP(H,q,[[1,0],[1,0]],[1,1]).status).toBe('rank-deficient');
    expect(solveEqualityQP(H,q,[[1,0],[0,1]],[1,2]).status).toBe('solved');
  });
  it('calculates LICQ only from active gradients and all equalities',()=>{
    const regular=computeActive(activeDefaults);expect(regular.licq).toBe(true);expect(regular.rank).toBe(2);
    expect(computeActive({...activeDefaults,angle:0}).licq).toBe(false);
    expect(computeActive({...activeDefaults,equality:1}).licq).toBe(false);
    expect(computeActive({...activeDefaults,offset:.5}).active).toEqual([0]);
    const degenerate=computeActive({...activeDefaults,kind:'degenerate'});expect(degenerate.feasible).toBe(true);expect(degenerate.rank).toBe(0);expect(degenerate.licq).toBe(false);
  });
  it('separates all four KKT residuals and checks multiplier sensitivity analytically',()=>{
    const d=computeKKT(kktDefaults);expect(d.kkt).toBe(true);expect(d.optimum).toEqual([1,0]);
    expect(d.optimalMu).toBe(1);expect(d.optimalLambda).toBe(2);
    expect(computeKKT({...kktDefaults,mu:-1}).dual).toBe(1);
    expect(computeKKT({...kktDefaults,x:0,mu:1}).complementarity).toBe(1);
    expect(computeKKT({...kktDefaults,y:.5}).primal).toBe(.5);
    const h=1e-5,value=(bound:number,level:number)=>{const r=computeKKT({...kktDefaults,bound,level});return r.value(...r.optimum);};
    expect((value(1+h,0)-value(1-h,0))/(2*h)).toBeCloseTo(-d.optimalMu,8);
    expect((value(1,h)-value(1,-h))/(2*h)).toBeCloseTo(-d.optimalLambda,8);
  });
  it('uses Lagrangian curvature to classify linear cost extrema on a curved equality',()=>{
    const min=computeCurvature(curvatureDefaults),max=computeCurvature({...curvatureDefaults,angle:90,lambda:-.5});
    expect(min.stationarity).toBeLessThan(1e-12);expect(min.tangentCurvature).toBeCloseTo(1,12);
    expect(min.classification).toContain('Minimo');expect(max.classification).toContain('Massimo');
    expect(computeCurvature({...curvatureDefaults,normalMix:.5}).critical).toBe(false);
    expect(min.constraintError).toBeCloseTo(curvatureDefaults.arc**2,12);
    expect(min.feasiblePoint[0]**2+min.feasiblePoint[1]**2).toBeCloseTo(1,12);
  });
  it('exposes a negative critical direction missed by annihilating every active normal',()=>{
    const d=computeCurvature({...curvatureDefaults,kind:'weak-inequality',direction:0});
    expect(d.stationarity).toBe(0);expect(d.critical).toBe(true);expect(d.tangentCurvature).toBe(2);expect(d.directionalCurvature).toBe(-2);
    expect(d.value(.1,0)).toBeLessThan(d.value(0,0));
  });
  it('distinguishes unique, nonunique and unbounded reduced QPs',()=>{
    const unique=computeConstrainedQP(qpDefaults);expect(unique.status).toContain('unico');expect(unique.solution).toEqual([1,.5]);expect(unique.residual).toBeLessThan(1e-12);
    expect(computeConstrainedQP({...qpDefaults,angle:90}).status).toContain('illimitato');
    expect(computeConstrainedQP({...qpDefaults,q22:0,linearY:0}).status).toContain('Infiniti');
    expect(computeConstrainedQP({...qpDefaults,q22:0,linearY:1}).status).toContain('illimitato');
  });
  it('matches cost/constraint derivatives and the Lagrangian Hessian by finite differences',()=>{
    const z=[.7,-.4],lambda=[.6],eps=1e-5;
    for(const constraint of ['parabola','circle','line','degenerate'] as const){
      const p=makeProblem({...nlpDefaults,constraint}),H=lagrangianHessian(p,z,lambda),gradL=(w:number[])=>residuals(p,w,lambda).stationarity;
      for(let j=0;j<2;j++){
        const v=[0,0];v[j]=eps;const plus=axpy(z,v),minus=axpy(z,v,-1);
        expect(p.gradient(z)[j]).toBeCloseTo((p.value(plus)-p.value(minus))/(2*eps),8);
        expect(p.jacobian(z)[0][j]).toBeCloseTo((p.equalities(plus)[0]-p.equalities(minus)[0])/(2*eps),8);
        for(let i=0;i<2;i++)expect(H[i][j]).toBeCloseTo((gradL(plus)[i]-gradL(minus)[i])/(2*eps),8);
      }
    }
    const p=makeProblem(nlpDefaults);expect(lagrangianHessian({...p,equalityHessians:undefined,lagrangianHessian:()=>[[2,0],[0,3]]},z,lambda)).toEqual([[2,0],[0,3]]);
  });
  it('solves the affine KKT root in one Newton step and differentiates λQP from Δλ',()=>{
    const p={...nlpDefaults,constraint:'line' as const,offset:1,x:-1,y:0,lambda:2,lineSearch:'full' as const,adaptive:0};
    const d=computeNLP(p,'newton');expect(d.converged).toBe(true);expect(d.points).toHaveLength(2);
    expect(d.points[1].z[0]).toBeCloseTo(1,12);expect(d.points[1].z[1]).toBeCloseTo(0,12);expect(d.points[1].lambda[0]).toBeCloseTo(0,12);
    const s=formStep(d.problem,[-1,0],[2],d.options);expect(s.lambdaQP![0]-2).toBeCloseTo(-2,12);
  });
  it('interpolates primal and dual variables consistently for a damped update',()=>{
    const p=makeProblem({...nlpDefaults,constraint:'line',offset:1}),z=[-1,0],lambda=[2],o={...solverDefaults,mode:'newton' as const,lineSearch:'full' as const,adaptiveRegularization:false,initialStep:.3,maxIterations:1},s=formStep(p,z,lambda,o),d=solveSQP(p,z,lambda,o);
    expect(d.points[1].z).toEqual(axpy(z,s.d!,.3));expect(d.points[1].lambda).toEqual(axpy(lambda,axpy(s.lambdaQP!,lambda,-1),.3));
  });
  it('updates an incorrect multiplier when the primal decision is already optimal',()=>{
    const p=makeProblem({...nlpDefaults,constraint:'line',offset:1}),d=solveSQP(p,[1,0],[3]);
    expect(d.converged).toBe(true);expect(d.points).toHaveLength(2);expect(d.points[1].z).toEqual([1,0]);expect(d.points[1].lambda[0]).toBeCloseTo(0,12);
  });
  it('converges in the nonlinear teaching examples and does not label a KKT maximum as a global optimum',()=>{
    const parabola=computeNLP(nlpDefaults);expect(parabola.converged,parabola.status).toBe(true);
    const circle=computeNLP({...nlpDefaults,constraint:'circle',targetX:2,x:1,y:.5});expect(circle.converged,circle.status).toBe(true);
    expect(circle.points.at(-1)!.z[0]).toBeCloseTo(1,7);expect(circle.points.at(-1)!.z[1]).toBeCloseTo(0,7);
    const max=computeNLP({...nlpDefaults,constraint:'circle',targetX:2,x:-1,y:0,lambda:-1.5},'newton');
    expect(max.converged).toBe(true);expect(max.points).toHaveLength(1);expect(lagrangianHessian(max.problem,[-1,0],[-1.5])[1][1]).toBe(-2);
  });
  it('reports a singular Jacobian and a non-minimizing SQP model explicitly',()=>{
    expect(computeNLP({...nlpDefaults,constraint:'degenerate',x:0,y:0}).status).toContain('non a rango');
    expect(computeNLP({...nlpDefaults,constraint:'circle',x:1,y:0,lambda:-2,adaptive:0}).status).toContain('non positiva');
  });
  it('has the correct directional derivative for L1 merit under the linearized constraint',()=>{
    const d=computeMerit(meritDefaults),eps=1e-6,fd=(merit(d.problem,axpy(d.z,d.s.d!,eps),d.penalty)-merit(d.problem,d.z,d.penalty))/eps;
    expect(norm(axpy(matvec(d.s.A,d.s.d!),d.s.h))).toBeLessThan(1e-12);expect(fd).toBeCloseTo(d.search.slope,4);
    expect(d.search.step).toBeGreaterThan(0);const newz=axpy(d.z,d.s.d!,d.search.step);
    expect(d.problem.value(newz)).toBeGreaterThan(d.problem.value(d.z));expect(Math.abs(d.problem.equalities(newz)[0])).toBeLessThan(1);
    expect(merit(d.problem,newz,d.penalty)).toBeLessThan(merit(d.problem,d.z,d.penalty));
    expect(computeMerit({...meritDefaults,penalty:0}).search.status).toBe('non-descent');
    expect(computeMerit({...meritDefaults,penalty:0,adaptivePenalty:1}).search.step).toBeGreaterThan(0);
  });
  it('solves equality-constrained barrier stages and agrees with independent scalar centers',()=>{
    const d=computeBarrierEquality(barrierEqDefaults);expect(d.status).toBe('Stadi completati');expect(d.centers).toHaveLength(4);
    for(const q of d.points)expect(Math.max(...q.z.map(Math.abs))).toBeLessThan(barrierEqDefaults.size);
    const last=d.points.at(-1)!;expect(last.primal).toBeLessThan(1e-8);expect(last.dual).toBeLessThan(1e-7);
    expect(norm(axpy(last.z,[...d.centers.at(-1)!],-1))).toBeLessThan(1e-7);
    const p=makeBarrierProblem(barrierEqDefaults,last.epsilon);expect(residuals(p,last.z,last.lambda).total).toBeLessThan(1e-7);
    expect(computeBarrierEquality({...barrierEqDefaults,sum:3}).valid).toBe(false);
    expect(computeBarrierEquality({...barrierEqDefaults,x:2}).valid).toBe(false);
    expect(computeBarrierEquality({...barrierEqDefaults,x:.5,y:.5}).points.at(-1)!.primal).toBeLessThan(1e-7);
  });
  it('uses the general solver for trajectories and matches an independent Riccati recursion',()=>{
    const p={...timeDefaults,step:1},d=computeTime(p);expect(d.converged).toBe(true);expect(d.points).toHaveLength(2);
    const N=d.N,P=Array(N+1).fill(0),s=Array(N+1).fill(0),gain=Array(N).fill(0),feed=Array(N).fill(0);
    P[N]=p.terminalWeight;s[N]=-p.terminalWeight*p.target;
    for(let t=N-1;t>=0;t--){const D=p.inputWeight+p.b*p.b*P[t+1];gain[t]=p.a*p.b*P[t+1]/D;feed[t]=p.b*s[t+1]/D;P[t]=p.stateWeight+p.a*p.a*P[t+1]-(p.a*p.b*P[t+1])**2/D;s[t]=p.a*s[t+1]*p.inputWeight/D;}
    let x=p.initial;const result=d.trajectories.at(-1)!;
    for(let t=0;t<N;t++){const u=-gain[t]*x-feed[t];expect(result.x[t]).toBeCloseTo(x,9);expect(result.u[t]).toBeCloseTo(u,9);x=p.a*x+p.b*u;}
    expect(result.x[N]).toBeCloseTo(x,9);expect(d.points.at(-1)!.primal).toBeLessThan(1e-10);
  });
  it('keeps every damped trajectory dynamically feasible and handles ineffective inputs',()=>{
    const d=computeTime(timeDefaults);d.points.forEach(q=>expect(q.primal).toBeLessThan(1e-10));
    d.points.slice(1).forEach((q,i)=>expect(q.cost).toBeLessThan(d.points[i].cost));
    const noControl=computeTime({...timeDefaults,b:0,step:1});noControl.trajectories.at(-1)!.u.forEach(u=>expect(u).toBeCloseTo(0,12));
    expect(noControl.trajectories.at(-1)!.x.at(-1)).toBeCloseTo(timeDefaults.initial*timeDefaults.a**timeDefaults.horizon,12);
  });
  it('keeps finite iterates or an explicit failure across extreme displayed cases',()=>{
    for(const constraint of ['parabola','circle','line','degenerate'] as const)for(const lambda of [-3,3]){
      const d=computeNLP({...nlpDefaults,constraint,lambda,x:-2,y:2,shape:2,iterations:60});
      expect(d.status.length).toBeGreaterThan(0);for(const q of d.points)for(const v of [...q.z,...q.lambda,q.cost,q.primal,q.dual])expect(Number.isFinite(v)).toBe(true);
    }
    const trajectory=computeTime({...timeDefaults,horizon:16,a:1.2,b:0,step:1});expect(trajectory.converged).toBe(true);
  });
  it('rejects invalid dimensions, non-finite options and invalid multipliers at the public solver boundary',()=>{
    const p=makeProblem(nlpDefaults);
    expect(()=>solveSQP(p,[0])).toThrow();expect(()=>solveSQP(p,[0,0],[Infinity])).toThrow();
    expect(()=>solveSQP(p,[0,0],undefined,{beta:1})).toThrow();
    expect(()=>solveSQP(p,[0,0],undefined,{maxIterations:NaN})).toThrow();
    expect(()=>solveSQP(p,[0,0],undefined,{regularization:Infinity})).toThrow();
  });
  it('covers all O3 concepts/pages with registered laboratories and valid KaTeX',()=>{
    const entries=inventory.sources.find(s=>s.id==='ottimizzazione')!.concepts.filter(c=>c.block==='O3');
    expect(O3Lessons.flatMap(s=>s.conceptIds).sort()).toEqual(entries.map(c=>c.id).sort());expect(O3Lessons).toHaveLength(10);
    expect([...new Set(O3Lessons.flatMap(s=>s.sources.flatMap(r=>r.pages)))].sort((a,b)=>a-b)).toEqual(Array.from({length:27},(_,i)=>i+55));
    for(const s of O3Lessons){expect(s.intuition&&s.example&&s.assumptions.length&&s.observe.length).toBeTruthy();s.demoIds.forEach(id=>expect(hasDemo(id)).toBe(true));s.formulas.forEach(f=>expect(()=>formula(f.latex)).not.toThrow());}
    expect(()=>formula(matrixLatex([[1,2,3],[4,5,6],[7,8,9]]))).not.toThrow();
  });
  it('preserves Base, O1 modules and every O2 versioned artifact byte for byte',()=>{
    const m=JSON.parse(readFileSync(new URL('../../../manifest.json',import.meta.url),'utf8'));
    const hashes={...m.baseContractHashes};for(const id of ['O1','O2'])for(const [path,hash] of Object.entries(m.sessions.find((s:{id:string})=>s.id===id).artifactHashes))if(id==='O2'||!path.includes('/tests/'))hashes[path]=hash;
    for(const [path,hash] of Object.entries(hashes))expect(createHash('sha256').update(readFileSync(new URL('../../../'+path,import.meta.url))).digest('hex'),path).toBe(hash);
  });
});
