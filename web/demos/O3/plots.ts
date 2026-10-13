import type { Data } from 'plotly.js';
import type { Vec2 } from '../../math/quadratic';
import { grid,linspace } from '../../math/O1/foundations';
import type { SolverIterate } from '../../math/O3/solver';
import { curve,layout,surfaceFrame } from '../O1/plots';
import type { PlotFrame } from '../../ui/plot';

export function line(n:readonly number[],b:number,extent=3):Vec2[] {
  const length=Math.hypot(...n);if(length<1e-10)return [];
  const points:Vec2[]=[];
  const push=(x:number,y:number)=>{if(Math.abs(x)<=extent+1e-8&&Math.abs(y)<=extent+1e-8&&!points.some(p=>Math.hypot(p[0]-x,p[1]-y)<1e-8))points.push([x,y]);};
  for(const edge of [-extent,extent]){if(Math.abs(n[1])>1e-10)push(edge,(b-n[0]*edge)/n[1]);if(Math.abs(n[0])>1e-10)push((b-n[1]*edge)/n[0],edge);}
  return points;
}
export function arrows(z:Vec2,vectors:{v:Vec2;label:string;color:string}[]) {
  const size=Math.max(1,...vectors.map(q=>Math.hypot(...q.v))),factor=1.1/size;
  return vectors.filter(q=>Math.hypot(...q.v)>1e-10).map(q=>({x:z[0]+factor*q.v[0],y:z[1]+factor*q.v[1],ax:z[0],ay:z[1],xref:'x' as const,yref:'y' as const,axref:'x' as const,ayref:'y' as const,text:q.label,showarrow:true,arrowhead:3,arrowwidth:2,arrowcolor:q.color,font:{color:q.color,size:11},xanchor:'left' as const}));
}
export function geometry(f:(x:number,y:number)=>number,view:'2d'|'3d',paths:{points:Vec2[];label:string;color:string;dash?:'dash'|'dot'}[]=[],extent=3):PlotFrame {
  const frame=surfaceFrame(grid(f,extent,41),view);frame.layout.uirevision='o3';
  frame.layout.showlegend=true;
  if(view==='2d')paths.forEach(p=>frame.data.push(curve(p.points.map(v=>v[0]),p.points.map(v=>v[1]),p.label,p.color,p.dash)));
  else paths.forEach(p=>frame.data.push({type:'scatter3d',x:p.points.map(v=>v[0]),y:p.points.map(v=>v[1]),z:p.points.map(v=>f(...v)),mode:'lines+markers',name:p.label,line:{color:p.color,width:5,dash:p.dash},marker:{size:2,color:p.color}}));
  return frame;
}
export function history(points:SolverIterate[]):PlotFrame {
  const k=points.map((_,i)=>i),trace=(values:number[],name:string,color:string)=>({...curve(k,values,name,color),mode:'lines+markers',marker:{size:3}} as Data);
  return {data:[trace(points.map(q=>q.cost),'Costo','#356b45'),{...trace(points.map(q=>q.primal),'‖h‖₂','#b77130'),yaxis:'y2'} as Data,{...trace(points.map(q=>q.dual),'‖∇z L‖₂','#587d9a'),yaxis:'y2'} as Data],
    layout:layout({height:300,margin:{l:50,r:65,t:25,b:70},xaxis:{title:{text:'Iterazione k'},dtick:points.length<8?1:undefined},yaxis:{title:{text:'Costo'}},yaxis2:{title:{text:'Residui'},overlaying:'y',side:'right',showgrid:false,rangemode:'tozero'},legend:{orientation:'h',y:-.28}})};
}
export function feasibleCurve(kind:string,shape:number,offset:number):Vec2[] {
  if(kind==='circle')return linspace(0,2*Math.PI,121).map(a=>[shape*Math.cos(a),shape*Math.sin(a)]);
  if(kind==='line')return line([1,1],offset);
  if(kind==='degenerate')return [[0,-3],[0,3]];
  return linspace(-3,3,121).map(x=>[x,shape*x*x+offset] as Vec2).filter(z=>Math.abs(z[1])<=3);
}
export const matrixLatex=(A:readonly (readonly number[])[])=>String.raw`\begin{bmatrix}${A.map(r=>r.map(v=>Math.abs(v)<1e-12?'0':v.toFixed(2)).join('&')).join(String.raw`\\`)}\end{bmatrix}`;
