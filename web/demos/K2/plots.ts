import type { Data } from 'plotly.js';
import type { PlotFrame } from '../../ui/plot';
import { layout,curve } from '../O1/plots';
export { profile,matrixFrame,green,orange,blue,red } from '../K1/plots';
export const trace=(x:number[],y:number[],name:string,color:string):Data=>({type:'scatter',x,y,mode:'lines+markers',line:{color,width:2},marker:{color,size:5},name});
export function stateCostate(states:number[],lambda:number[],known:number[],name='Traiettoria'):PlotFrame{
  return {data:[{type:'scatter3d',x:known.map(t=>states[t]),y:known.map(t=>lambda[t-1]),z:known,mode:'lines+markers',line:{color:'#356b45',width:5},marker:{color:'#b77130',size:4},name}],layout:layout({height:400,margin:{l:20,r:30,t:20,b:75},scene:{xaxis:{title:{text:'xₜ'}},yaxis:{title:{text:'λₜ'}},zaxis:{title:{text:'t'}}},uirevision:'k2-state-costate'})};
}
export function boundState(states:number[],reference:number[],limits?:{lower:number;upper:number}){
  const N=states.length-1,t=states.map((_,i)=>i),data:Data[]=[trace(t,states,'Stati', '#356b45'),curve(t,reference,'Riferimento','#587d9a','dash')];if(limits)data.push(curve([0,N-1],[limits.lower,limits.lower],'Fascia inferiore (t<T)','#b77130','dot'),curve([0,N-1],[limits.upper,limits.upper],'Fascia superiore (t<T)','#b77130','dot'));
  return {data,layout:layout({height:380,xaxis:{title:{text:'Tempo discreto t'}},yaxis:{title:{text:'Stato'}},margin:{l:60,r:25,t:25,b:80},legend:{orientation:'h',y:-.28}})};
}
