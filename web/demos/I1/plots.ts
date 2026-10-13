import type { Data } from 'plotly.js';
import type { PlotFrame } from '../../ui/plot';
import type { Vec2 } from '../../math/quadratic';
import { curve,layout,circle } from '../O1/plots';
import { num } from '../O3/factory';

export function profile(traces:Data[],xTitle='Tempo t',yTitle='Valore',height=300):PlotFrame {
  return {data:traces,layout:layout({height,margin:{l:55,r:20,t:20,b:75},xaxis:{title:{text:xTitle}},yaxis:{title:{text:yTitle}},legend:{orientation:'h',y:-.28}})};
}
export function spatial(points:number[][],name:string,color:string,view:'2d'|'3d',dash?:'dash'|'dot'):Data {
  return view==='2d'?curve(points.map(z=>z[0]),points.map(z=>z[1]),name,color,dash):{type:'scatter3d',x:points.map(z=>z[0]),y:points.map(z=>z[1]),z:points.map(z=>z[2]),mode:'lines',name,line:{color,width:5,dash}};
}
export function navigationFrame(reference:number[][],actual:number[][],center:number[],radius:number,view:'2d'|'3d',scenario:string):PlotFrame {
  const data:Data[]=[spatial(reference,'Riferimento','#587d9a',view,'dash'),spatial(actual,'Percorso calcolato','#b77130',view)];
  const current=actual.at(-1)!;data.push(view==='2d'?{type:'scatter',x:[current[0]],y:[current[1]],mode:'markers',name:'Posizione corrente',marker:{size:8,color:'#b77130'}}:{type:'scatter3d',x:[current[0]],y:[current[1]],z:[current[2]],mode:'markers',name:'Posizione corrente',marker:{size:5,color:'#b77130'}});
  if(view==='2d'){
    const border=circle(radius).map(z=>[z[0]+center[0],z[1]+center[1]] as Vec2);data.push(curve(border.map(z=>z[0]),border.map(z=>z[1]),'Ostacolo','#b95a46'));
    if(scenario==='robot')for(const r of [.3,1.8])data.push(curve(circle(r).map(z=>z[0]),circle(r).map(z=>z[1]),'Zona lavoro','#77926a','dot'));
    if(scenario==='car')for(const y of [-.8,.8])data.push(curve([-1,5],[y,y],'Limite corsia','#77926a','dot'));
    const rangeX=scenario==='space'||scenario==='robot'?[-2.5,2.5]:[-1,5];
    return {data,layout:layout({height:410,xaxis:{title:{text:'Posizione x'},range:rangeX,constrain:'domain'},yaxis:{title:{text:'Posizione y'},range:[-2.5,2.5],scaleanchor:'x',scaleratio:1}})};
  }
  const lat=Array.from({length:17},(_,i)=>-Math.PI/2+i*Math.PI/16),lon=Array.from({length:25},(_,i)=>i*2*Math.PI/24);
  data.push({type:'surface',x:lat.map(a=>lon.map(b=>center[0]+radius*Math.cos(a)*Math.cos(b))),y:lat.map(a=>lon.map(b=>center[1]+radius*Math.cos(a)*Math.sin(b))),z:lat.map(a=>lon.map(()=>center[2]+radius*Math.sin(a))),colorscale:[[0,'#bd705c'],[1,'#bd705c']],opacity:.35,showscale:false,name:'Ostacolo'});
  return {data,layout:layout({height:410,margin:{l:0,r:0,t:10,b:50},scene:{xaxis:{title:{text:'x'}},yaxis:{title:{text:'y'}},zaxis:{title:{text:'z'}},aspectmode:'data',camera:{eye:{x:1.5,y:1.4,z:1}}},uirevision:'i1-navigation'})};
}
export function loopDiagram(reference:number,input:number,output:number,disturbance:number,controller='CONTROLLore') {
  const text=(x:number,y:number,t:string,size=12)=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" fill="#3e603e">${t}</text>`;
  return `<figure class="i1-flow"><svg viewBox="0 0 680 185" role="img" aria-label="Schema di retroazione: riferimento, controllore, sistema, uscita e disturbo."><g fill="#e7efdf" stroke="#a9c0a0"><rect x="132" y="55" width="150" height="65" rx="8"/><rect x="382" y="55" width="150" height="65" rx="8"/></g><g fill="none" stroke="#66855f" stroke-width="2"><path d="M38 88H132M282 88H382M532 88H635M595 88V155H92V88M456 25V55"/><path d="m125 83 7 5-7 5m250-10 7 5-7 5m246-10 7 5-7 5m-542 57 7-5-7-5m357-104 5 7 5-7"/></g>${text(60,68,'r = '+num(reference))}${text(207,82,controller.toUpperCase())}${text(207,105,'errore r − y')}${text(333,68,'u = '+num(input))}${text(457,82,'SISTEMA')}${text(457,105,'stato → uscita')}${text(598,68,'y = '+num(output))}${text(456,19,'disturbo d = '+num(disturbance))}${text(333,176,'misura riportata al controllore',11)}</svg><figcaption>Il riferimento e l’uscita vengono confrontati; l’ingresso agisce sul sistema. Tutti i valori sono adimensionali.</figcaption></figure>`;
}
