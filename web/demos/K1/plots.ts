import type { Data } from 'plotly.js';
import type { PlotFrame } from '../../ui/plot';
import { layout,curve,marker } from '../O1/plots';
import { linspace } from '../../math/O1/foundations';
import { computeGeometry,type GeometryParams } from '../../math/K1/trajectories';
export const green='#356b45',orange='#b77130',blue='#587d9a',red='#af503c';
export const profile=(data:Data[],x='Tempo discreto t',y='Valore',height=320):PlotFrame=>({data,layout:layout({height,margin:{l:60,r:25,t:25,b:85},xaxis:{title:{text:x}},yaxis:{title:{text:y}},legend:{orientation:'h',y:-.32}})});
const path3=(points:number[][],name:string,color:string):Data=>({type:'scatter3d',x:points.map(p=>p[0]),y:points.map(p=>p[1]),z:points.map(p=>p[2]),mode:'lines+markers',line:{color,width:5},marker:{color,size:4},name});
export function manifoldFrame(d:ReturnType<typeof computeGeometry>,p:GeometryParams,view:'2d'|'3d',tangent=false):PlotFrame{
  if(view==='2d'){
    if(tangent){const s=linspace(-.9,.9,101),slope=d.dx[d.N];return profile([curve(s,s.map(v=>d.terminal(p.input0+v*p.delta0,p.input1+v*p.delta1)),'Rollout perturbato',green),curve(s,s.map(v=>d.states[d.N]+v*slope),'Previsione lineare',orange,'dash'),marker([d.epsilon,d.actual[d.N]],'Stato finale reale',green),marker([d.epsilon,d.predicted[d.N]],'Previsione selezionata',orange)],'Ampiezza della perturbazione ε','Stato finale xT',400);}
    const u=linspace(p.input1-1.2,p.input1+1.2,101);return profile([curve(u,u.map(v=>d.terminal(p.input0,v)),'Sezione a u₀ fissato',green),curve(d.chordInputs.map(x=>x[1]),d.chordStates.map(x=>x[d.N]),'Corda tra traiettorie',red,'dash'),marker([p.input1,d.states[d.N]],'Rollout al punto base',green),marker([p.input1,d.midStates[d.N]],'Media degli stack',red)],'Ingresso u₁','Stato finale xT',400);
  }
  const u0=linspace(p.input0-1.2,p.input0+1.2,41),u1=linspace(p.input1-1.2,p.input1+1.2,41),data:Data[]=[{type:'surface',x:u0,y:u1,z:u1.map(v=>u0.map(u=>d.terminal(u,v))),name:'Rollout Φ',showscale:false,opacity:.82,colorscale:[[0,'#dcebd3'],[1,green]]},path3([[p.input0,p.input1,d.states[d.N]]],'Punto base',blue)];
  if(tangent){const a=linspace(p.input0-.7,p.input0+.7,3),b=linspace(p.input1-.7,p.input1+.7,3);data.push({type:'surface',x:a,y:b,z:b.map(v=>a.map(u=>d.plane(u,v))),name:'Piano tangente del rollout',showscale:false,opacity:.5,colorscale:[[0,'#e8b983'],[1,orange]]},path3([[p.input0,p.input1,d.states[d.N]],[d.actualInputs[0],d.actualInputs[1],d.predicted[d.N]]],'Passo lineare',orange),path3([[d.actualInputs[0],d.actualInputs[1],d.actual[d.N]]],'Rollout perturbato',green));}
  else data.push(path3(d.chordInputs.map((u,i)=>[u[0],u[1],d.chordStates[i][d.N]]),'Corda tra traiettorie',red),path3([[p.input0,p.input1,d.midStates[d.N]]],'Media degli stack',red));
  return {data,layout:layout({height:430,margin:{l:0,r:0,t:15,b:65},scene:{xaxis:{title:{text:'u₀'}},yaxis:{title:{text:'u₁'}},zaxis:{title:{text:'xT'}},camera:{eye:{x:1.5,y:1.5,z:1.1}}},legend:{orientation:'h',y:-.08},uirevision:'k1-manifold'})};
}
export function matrixFrame(A:number[][],rows:string[],columns:string[],selected?:number[]):PlotFrame{
  const max=Math.max(1,...A.flat().map(Math.abs));return {data:[{type:'heatmap',x:columns,y:rows,z:A,zmin:-max,zmax:max,colorscale:[[0,blue],[.5,'#fff'],[1,green]],showscale:true,colorbar:{thickness:12},hovertemplate:'%{y}<br>%{x}: %{z:.4f}<extra></extra>'}],layout:layout({height:Math.max(300,Math.min(500,180+rows.length*15)),margin:{l:75,r:50,t:20,b:100},xaxis:{title:{text:'Decisioni z=(x,u)'},tickangle:-55,tickfont:{size:10},automargin:true},yaxis:{title:{text:'Righe'},autorange:'reversed',tickfont:{size:10},automargin:true},shapes:selected?.map(i=>({type:'rect',xref:'paper',yref:'y',x0:0,x1:1,y0:i-.5,y1:i+.5,line:{color:orange,width:2},fillcolor:'transparent'})),showlegend:false})};
}
