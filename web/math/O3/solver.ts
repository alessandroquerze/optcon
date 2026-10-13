/** Small/medium dense educational solver. Pure functions, arbitrary dimension, no DOM. */
export type Vector=number[];
export type Matrix=number[][];
export const dot=(a:readonly number[],b:readonly number[])=>a.reduce((s,v,i)=>s+v*b[i],0);
export const norm=(a:readonly number[])=>Math.hypot(...a);
export const l1=(a:readonly number[])=>a.reduce((s,v)=>s+Math.abs(v),0);
export const axpy=(a:readonly number[],b:readonly number[],t=1)=>a.map((v,i)=>v+t*b[i]);
export const matvec=(A:Matrix,x:Vector)=>A.map(row=>dot(row,x));
export const identity=(n:number):Matrix=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>Number(i===j)));
export function transposeMultiply(A:Matrix,v:Vector,n:number):Vector {return Array.from({length:n},(_,i)=>A.reduce((s,row,j)=>s+row[i]*v[j],0));}
const finite=(a:readonly number[])=>a.every(Number.isFinite);
function checkMatrix(A:Matrix,n:number,m=n){if(A.length!==n||A.some(row=>row.length!==m||!finite(row)))throw new Error('Dimensioni o valori della matrice non validi.');}

/** Scaled partial pivoting; explicit failure and a relative residual, never an inverse. */
export function solveLinear(A:Matrix,b:Vector,tolerance=1e-12) {
  const n=b.length;checkMatrix(A,n);if(!n||n>640||!finite(b))throw new Error('Sistema vuoto, non finito o oltre il limite didattico di 640 variabili.');
  const M=A.map((r,i)=>[...r,b[i]]),scales=A.map(r=>Math.max(...r.map(Math.abs)));
  let smallestPivot=1;
  for(let j=0;j<n;j++){
    let pivot=j;for(let i=j+1;i<n;i++)if(Math.abs(M[i][j])/(scales[i]||1)>Math.abs(M[pivot][j])/(scales[pivot]||1))pivot=i;
    const relative=Math.abs(M[pivot][j])/(scales[pivot]||1);smallestPivot=Math.min(smallestPivot,relative);
    if(relative<=tolerance)return {status:'singular' as const,solution:undefined,relativeResidual:Infinity,smallestPivot};
    [M[j],M[pivot]]=[M[pivot],M[j]];[scales[j],scales[pivot]]=[scales[pivot],scales[j]];
    for(let i=j+1;i<n;i++){const factor=M[i][j]/M[j][j];M[i][j]=0;for(let k=j+1;k<=n;k++)M[i][k]-=factor*M[j][k];}
  }
  const x=Array(n).fill(0) as Vector;
  for(let i=n-1;i>=0;i--){let rhs=M[i][n];for(let j=i+1;j<n;j++)rhs-=M[i][j]*x[j];x[i]=rhs/M[i][i];}
  const residual=norm(axpy(matvec(A,x),b,-1)),scale=norm(b)+norm(A.flat())*norm(x);
  return {status:finite(x)?'solved' as const:'singular' as const,solution:finite(x)?x:undefined,relativeResidual:residual/Math.max(1,scale),smallestPivot};
}
export function nullBasis(A:Matrix,n:number,tol=1e-10) {
  checkMatrix(A,A.length,n);
  const rows:Matrix=[];
  function orthogonal(v:Vector,basis:Matrix){let w=[...v];for(let pass=0;pass<2;pass++)for(const r of basis)w=axpy(w,r,-dot(w,r));return w;}
  for(const row of A){const length=norm(row);if(!length)continue;const w=orthogonal(row.map(v=>v/length),rows),size=norm(w);if(size>tol)rows.push(w.map(v=>v/size));}
  const basis:Matrix=[];
  for(let i=0;i<n&&basis.length<n-rows.length;i++){const v=Array(n).fill(0) as Vector;v[i]=1;const w=orthogonal(v,[...rows,...basis]),size=norm(w);if(size>tol)basis.push(w.map(v=>v/size));}
  return {rank:rows.length,basis};
}
export function positiveDefinite(A:Matrix,tolerance=1e-10):boolean {
  const n=A.length;checkMatrix(A,n);if(!n)return true;
  const L=Array.from({length:n},()=>Array(n).fill(0) as Vector),scale=Math.max(1,...A.flat().map(Math.abs));
  for(let i=0;i<n;i++)for(let j=0;j<=i;j++){
    let v=(A[i][j]+A[j][i])/2;for(let k=0;k<j;k++)v-=L[i][k]*L[j][k];
    if(i===j){if(v<=tolerance*scale)return false;L[i][j]=Math.sqrt(v);}else L[i][j]=v/L[j][j];
  }
  return true;
}
export function kktMatrix(H:Matrix,A:Matrix):Matrix {
  const n=H.length,m=A.length;checkMatrix(H,n);checkMatrix(A,m,n);
  return [...H.map((row,i)=>[...row,...A.map(r=>r[i])]),...A.map(row=>[...row,...Array(m).fill(0)])];
}
export function solveEqualityQP(H:Matrix,q:Vector,A:Matrix,b:Vector,requireMinimum=true) {
  const n=q.length;checkMatrix(H,n);checkMatrix(A,b.length,n);if(!finite(q)||!finite(b))throw new Error('Dati QP non finiti.');
  if(H.some((r,i)=>r.some((v,j)=>Math.abs(v-H[j][i])>1e-9*Math.max(1,Math.abs(v)))))throw new Error('La Hessiana QP deve essere simmetrica.');
  const space=nullBasis(A,n),reduced=space.basis.map(u=>space.basis.map(v=>dot(u,matvec(H,v))));
  const strict=positiveDefinite(reduced);
  const matrix=kktMatrix(H,A);
  if(space.rank<A.length)return {status:'rank-deficient' as const,z:undefined,multipliers:undefined,matrix,reduced,strict,relativeResidual:Infinity};
  if(requireMinimum&&!strict)return {status:'non-positive-curvature' as const,z:undefined,multipliers:undefined,matrix,reduced,strict,relativeResidual:Infinity};
  const result=solveLinear(matrix,[...q.map(v=>-v),...b]);
  return {status:result.solution?'solved' as const:'singular' as const,z:result.solution?.slice(0,n),multipliers:result.solution?.slice(n),matrix,reduced,strict,relativeResidual:result.relativeResidual};
}

export interface SmoothProblem {
  dimension:number;
  value(z:Vector):number;
  gradient(z:Vector):Vector;
  hessian(z:Vector):Matrix;
  equalities(z:Vector):Vector;
  jacobian(z:Vector):Matrix; // rows are gradients of h_i
  equalityHessians?(z:Vector):Matrix[];
  lagrangianHessian?(z:Vector,lambda:Vector):Matrix; // optional direct assembly for trajectory problems
  interior?(z:Vector):boolean;
}
export interface SolverOptions {
  mode:'newton'|'sqp';model:'lagrangian'|'objective'|'identity';lineSearch:'full'|'merit'|'residual';
  initialStep:number;beta:number;c:number;penalty:number;adaptivePenalty:boolean;regularization:number;adaptiveRegularization:boolean;maxIterations:number;tolerance:number;
}
export const solverDefaults:SolverOptions={mode:'sqp',model:'lagrangian',lineSearch:'merit',initialStep:1,beta:.5,c:.1,penalty:2,adaptivePenalty:true,regularization:0,adaptiveRegularization:true,maxIterations:40,tolerance:1e-8};
export function lagrangianHessian(p:SmoothProblem,z:Vector,lambda:Vector):Matrix {
  if(p.lagrangianHessian){const H=p.lagrangianHessian(z,lambda);checkMatrix(H,p.dimension);return H.map(r=>[...r]);}
  if(!p.equalityHessians)throw new Error('Fornire le Hessiane dei vincoli o l’assemblaggio diretto della Lagrangiana.');
  const H=p.hessian(z).map(r=>[...r]),terms=p.equalityHessians(z);
  if(terms.length!==lambda.length)throw new Error('Numero di Hessiane dei vincoli incoerente.');
  terms.forEach((B,k)=>{checkMatrix(B,p.dimension);H.forEach((r,i)=>r.forEach((_,j)=>H[i][j]+=lambda[k]*B[i][j]));});return H;
}
export function residuals(p:SmoothProblem,z:Vector,lambda:Vector) {
  const h=p.equalities(z),stationarity=axpy(p.gradient(z),transposeMultiply(p.jacobian(z),lambda,p.dimension));
  return {h,stationarity,primal:norm(h),dual:norm(stationarity),total:norm([...stationarity,...h])};
}
export function formStep(p:SmoothProblem,z:Vector,lambda:Vector,o:SolverOptions) {
  const n=p.dimension,g=p.gradient(z),A=p.jacobian(z),h=p.equalities(z);
  const H=o.model==='identity'?identity(n):o.model==='objective'?p.hessian(z):lagrangianHessian(p,z,lambda);
  let shift=o.regularization;
  if(o.mode==='sqp'&&o.adaptiveRegularization){
    const lower=Math.min(...H.map((r,i)=>r[i]-r.reduce((s,v,j)=>s+(i===j?0:Math.abs(v)),0)));
    shift=Math.max(shift,1e-4-lower); // conservative positive-definite safeguard
  }
  const B=H.map((r,i)=>r.map((v,j)=>v+(i===j?shift:0)));
  const qp=solveEqualityQP(B,g,A,h.map(v=>-v),o.mode==='sqp');
  return {g,A,h,B,shift,qp,d:qp.z,lambdaQP:qp.multipliers};
}
export function merit(p:SmoothProblem,z:Vector,penalty:number){return p.value(z)+penalty*l1(p.equalities(z));}
export interface SearchTrial {step:number;value:number;bound:number;accepted:boolean;}
/** Requires J_h d = -h. The optional QP data avoid cancellation near stationarity. */
export function searchMerit(p:SmoothProblem,z:Vector,d:Vector,penalty:number,o:Pick<SolverOptions,'initialStep'|'beta'|'c'>,model?:{B:Matrix;lambdaQP:Vector}) {
  const h=p.equalities(z),g=p.gradient(z),costSlope=norm(g)===0?0:model?-dot(d,matvec(model.B,d))+dot(model.lambdaQP,h):dot(g,d),slope=costSlope-penalty*l1(h),trials:SearchTrial[]=[];
  if(slope>=0)return {step:0,slope,trials,status:'non-descent' as const};
  const base=merit(p,z,penalty);
  for(let i=0,step=o.initialStep;i<70;i++,step*=o.beta){
    const next=axpy(z,d,step),value=p.interior&&!p.interior(next)?Infinity:merit(p,next,penalty),bound=base+o.c*step*slope;
    const accepted=Number.isFinite(value)&&value<=bound;trials.push({step,value,bound,accepted});
    if(accepted)return {step,slope,trials,status:'accepted' as const};
  }
  return {step:0,slope,trials,status:'failed' as const};
}
export interface SolverIterate {z:Vector;lambda:Vector;cost:number;primal:number;dual:number;residual:number;penalty:number;step:number;regularization:number;backtracks:number;}
export function solveSQP(p:SmoothProblem,initial:Vector,initialMultipliers?:Vector,options:Partial<SolverOptions>={}) {
  const o={...solverDefaults,...options},m=p.equalities(initial).length;
  if(p.dimension<1||p.dimension+m>640||initial.length!==p.dimension||!finite(initial)||!finite([o.initialStep,o.beta,o.c,o.penalty,o.regularization,o.maxIterations,o.tolerance])||!Number.isInteger(o.maxIterations)||o.maxIterations<1||!(o.initialStep>0&&o.initialStep<=1&&o.beta>0&&o.beta<1&&o.c>0&&o.c<1&&o.penalty>=0&&o.regularization>=0&&o.tolerance>0))throw new Error('Dimensioni o parametri del solutore non validi.');
  let z=[...initial],lambda=initialMultipliers?[...initialMultipliers]:Array(m).fill(0) as Vector,penalty=o.penalty;
  if(lambda.length!==m||!finite(lambda))throw new Error('Moltiplicatori iniziali non validi.');
  const points:SolverIterate[]=[];let status='Budget di iterazioni raggiunto';
  if((p.interior&&!p.interior(z))||!Number.isFinite(p.value(z)))return {points,status:'Partenza fuori dal dominio interno',converged:false};
  const push=(step=0,regularization=0,backtracks=0)=>{const r=residuals(p,z,lambda);points.push({z:[...z],lambda:[...lambda],cost:p.value(z),primal:r.primal,dual:r.dual,residual:r.total,penalty,step,regularization,backtracks});};push();
  for(let k=0;k<Math.min(120,o.maxIterations);k++){
    if(points.at(-1)!.residual<=o.tolerance){status='Residuo KKT sotto tolleranza';break;}
    const s=formStep(p,z,lambda,o);
    if(!s.d||!s.lambdaQP){status=s.qp.status==='rank-deficient'?'Jacobiano dei vincoli non a rango pieno':s.qp.status==='non-positive-curvature'?'Curvatura ridotta non positiva definita alla tolleranza: minimo unico non garantito':'Sistema KKT singolare';break;}
    if(o.adaptivePenalty)penalty=Math.max(penalty,...s.lambdaQP.map(v=>Math.abs(v)+1));
    let step=o.initialStep,backtracks=0;
    const dualOnly=norm(s.d)<=1e-12*(1+norm(z))&&norm(s.h)<=o.tolerance;
    if(o.lineSearch==='merit'&&!dualOnly){
      const search=searchMerit(p,z,s.d,penalty,o,{B:s.B,lambdaQP:s.lambdaQP});
      if(!search.step){status=search.status==='non-descent'?'Direzione non di discesa per il merito: aumenta s':'Backtracking sul merito fallito';break;}
      step=search.step;backtracks=search.trials.length-1;
    } else if(o.lineSearch==='residual'){
      let accepted=false;
      for(let i=0;i<70;i++,step*=o.beta){const next=axpy(z,s.d,step),nextLambda=axpy(lambda,axpy(s.lambdaQP,lambda,-1),step);
        if((!p.interior||p.interior(next))&&Number.isFinite(p.value(next))&&residuals(p,next,nextLambda).total<=(1-o.c*step)*points.at(-1)!.residual){accepted=true;backtracks=i;break;}}
      if(!accepted){status='Backtracking sul residuo fallito';break;}
    }
    const next=axpy(z,s.d,step),nextLambda=axpy(lambda,axpy(s.lambdaQP,lambda,-1),step);
    if((p.interior&&!p.interior(next))||!finite(next)||norm(next)>1e5||!Number.isFinite(p.value(next))||!Number.isFinite(residuals(p,next,nextLambda).total)){status='Passo fuori dominio o limite numerico';break;}
    z=next;lambda=nextLambda;push(step,s.shift,backtracks);
  }
  const converged=points.length>0&&points.at(-1)!.residual<=o.tolerance;
  if(converged)status='Residuo KKT sotto tolleranza';
  return {points,status,converged};
}
