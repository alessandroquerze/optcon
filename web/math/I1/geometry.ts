import type { Vec2 } from '../quadratic';
import { grid,eigenvalues } from '../O1/foundations';
import { dot,matvec,norm } from '../O3/solver';
import { project } from '../O2/methods';

export interface ScalarParams {weight:number;center:number;point:number;}
export const scalarDefaults:ScalarParams={weight:1,center:1,point:0};
export function computeScalar(p:Readonly<ScalarParams>){const value=(x:number)=>p.weight*(x-p.center)**2/2;return {value,cost:value(p.point),derivative:p.weight*(p.point-p.center),curvature:p.weight,unique:p.weight>0};}
export interface WeightParams {w1:number;w2:number;angle:number;centerX:number;centerY:number;x:number;y:number;}
export const weightDefaults:WeightParams={w1:1,w2:0,angle:30,centerX:.5,centerY:0,x:1,y:1};
export function computeWeights(p:Readonly<WeightParams>){
  const angle=p.angle*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),W=[[p.w1*c*c+p.w2*s*s,(p.w1-p.w2)*s*c],[(p.w1-p.w2)*s*c,p.w1*s*s+p.w2*c*c]],
    center:Vec2=[p.centerX,p.centerY],point:Vec2=[p.x,p.y],delta=[p.x-p.centerX,p.y-p.centerY],gradient=matvec(W,delta),value=(x:number,y:number)=>{const d=[x-p.centerX,y-p.centerY];return dot(d,matvec(W,d))/2;},rank=Number(p.w1>0)+Number(p.w2>0),flat:Vec2=p.w1===0?[c,s]:[-s,c];
  return {W,center,point,gradient,value,cost:value(p.x,p.y),rank,flat,spectrum:[p.w1,p.w2],surface:grid(value,3,41)};
}
export interface ConstraintParams {kind:'inequality'|'equality';a:number;b:number;cross:number;qx:number;qy:number;c:number;x:number;y:number;}
export const constraintDefaults:ConstraintParams={kind:'inequality',a:1,b:2,cross:0,qx:0,qy:0,c:1,x:.5,y:0};
export function computeConstraints(p:Readonly<ConstraintParams>){
  const Q:[[number,number],[number,number]]=[[p.a,p.cross],[p.cross,p.b]],spectrum=eigenvalues(Q),angle=.5*Math.atan2(2*p.cross,p.a-p.b),v=[Math.cos(angle),Math.sin(angle)],t=[-v[1],v[0]],linear=[p.qx,p.qy],lambda=[spectrum[1],spectrum[0]],q=[dot(v,linear),dot(t,linear)],tol=1e-9;
  let minimum=-p.c,maximum=-p.c;
  for(let i=0;i<2;i++){
    if(lambda[i]< -tol||Math.abs(lambda[i])<=tol&&Math.abs(q[i])>tol)minimum=-Infinity;
    else if(lambda[i]>tol&&Number.isFinite(minimum))minimum-=q[i]*q[i]/(4*lambda[i]);
    if(lambda[i]>tol||Math.abs(lambda[i])<=tol&&Math.abs(q[i])>tol)maximum=Infinity;
    else if(lambda[i]< -tol&&Number.isFinite(maximum))maximum-=q[i]*q[i]/(4*lambda[i]);
  }
  const value=(x:number,y:number)=>p.a*x*x+2*p.cross*x*y+p.b*y*y+p.qx*x+p.qy*y-p.c,residual=value(p.x,p.y),empty=p.kind==='inequality'?minimum>tol:minimum>tol||maximum< -tol,
    whole=p.kind==='inequality'?maximum<=tol:Math.abs(minimum)<=tol&&Math.abs(maximum)<=tol,
    affine=spectrum.every(v=>Math.abs(v)<=tol),convex=empty||whole||p.kind==='inequality'&&spectrum[0]>=-tol||p.kind==='equality'&&(affine||Math.abs(minimum)<=tol||Math.abs(maximum)<=tol);
  return {Q,spectrum,minimum,maximum,value,residual,feasible:p.kind==='inequality'?residual<=tol:Math.abs(residual)<=tol,empty,whole,convex,surface:grid(value,3,61)};
}

/** Sample exact roots of F(x,y)=0; include repeated roots and vertical components.
 * Unlike a sign-change contour, this also draws x²=0 and isolated zero-level points. */
export function constraintBoundary(p:Readonly<ConstraintParams>,extent=3,samples=241):Vec2[][] {
  const tol=1e-10,paths:Vec2[][]=[];
  const roots=(a:number,b:number,c:number):number[]=>{
    if(Math.abs(a)<tol)return Math.abs(b)<tol?[]:[-c/b];
    const discriminant=b*b-4*a*c;if(discriminant< -tol)return [];
    if(Math.abs(discriminant)<=tol)return [-b/(2*a)];
    const q=-.5*(b+(b<0?-1:1)*Math.sqrt(discriminant));return [q/a,c/q].sort((x,y)=>x-y);
  };
  const determinant=p.a*p.b-p.cross*p.cross;
  if(determinant>tol){
    const x=(-p.b*p.qx+p.cross*p.qy)/(2*determinant),y=(p.cross*p.qx-p.a*p.qy)/(2*determinant),value=p.a*x*x+2*p.cross*x*y+p.b*y*y+p.qx*x+p.qy*y-p.c;
    if(Math.abs(value)<tol)return Math.abs(x)<=extent&&Math.abs(y)<=extent?[[[x,y]]]:[];
  }
  if(Math.abs(p.b)<tol&&Math.abs(p.cross)<tol&&Math.abs(p.qy)<tol){
    return roots(p.a,p.qx,-p.c).filter(x=>Math.abs(x)<=extent).map(x=>[[x,-extent],[x,extent]]);
  }
  if(Math.abs(p.b)<tol&&Math.abs(p.cross)>tol){
    const x=-p.qy/(2*p.cross);if(Math.abs(x)<=extent&&Math.abs(p.a*x*x+p.qx*x-p.c)<tol)paths.push([[x,-extent],[x,extent]]);
  }
  for(let branch=0;branch<2;branch++){
    let path:Vec2[]=[];const flush=()=>{if(path.length)paths.push(path);path=[];};
    for(let i=0;i<samples;i++){
      const x=-extent+2*extent*i/(samples-1),ys=roots(p.b,2*p.cross*x+p.qy,p.a*x*x+p.qx*x-p.c),y=ys[branch];
      if(y===undefined||Math.abs(y)>extent+tol){flush();continue;}
      path.push([x,y]);
    }flush();
  }
  return paths;
}
export interface OptimizationParams {set:'disk'|'box'|'line'|'intersection';radius:number;offset:number;targetX:number;targetY:number;x:number;y:number;}
export const optimizationDefaults:OptimizationParams={set:'disk',radius:1,offset:0,targetX:2,targetY:1,x:0,y:0};
export function computeOptimization(p:Readonly<OptimizationParams>){
  const target:Vec2=[p.targetX,p.targetY],point:Vec2=[p.x,p.y],value=(x:number,y:number)=>((x-p.targetX)**2+(y-p.targetY)**2)/2;
  let optimum:Vec2|undefined,segment:Vec2[]=[];
  if(p.set==='disk'||p.set==='box')optimum=project(target,p.set,p.radius);
  else {
    const base:Vec2=[p.offset/2,p.offset/2],t:Vec2=[-Math.SQRT1_2,Math.SQRT1_2],coordinate=dot([target[0]-base[0],target[1]-base[1]],t),squared=p.radius*p.radius-p.offset*p.offset/2;
    if(p.set==='line')optimum=[base[0]+coordinate*t[0],base[1]+coordinate*t[1]];
    else if(squared>=-1e-12){const length=Math.sqrt(Math.max(0,squared)),s=Math.max(-length,Math.min(length,coordinate));optimum=[base[0]+s*t[0],base[1]+s*t[1]];segment=[[-length*t[0]+base[0],-length*t[1]+base[1]],[length*t[0]+base[0],length*t[1]+base[1]]];}
  }
  const g=p.set==='line'?0:p.set==='box'?Math.max(Math.abs(p.x),Math.abs(p.y))-p.radius:norm(point)-p.radius,
    h=p.set==='line'||p.set==='intersection'?p.x+p.y-p.offset:0,primal=Math.hypot(Math.max(0,g),h),feasible=primal<1e-9;
  return {target,point,value,optimum,segment,feasible,primal,g,h,cost:value(...point),minimum:optimum?value(...optimum):undefined,gap:optimum&&feasible?value(...point)-value(...optimum):undefined};
}
