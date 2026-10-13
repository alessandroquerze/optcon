import type { Data, Layout } from 'plotly.js';
import type { PlotFrame } from '../../ui/plot';
import type { Grid } from '../../math/O1/foundations';
import type { Vec2 } from '../../math/quadratic';

const colors:[[number,string],...([number,string])[]]=[[0,'#eef5e9'],[0.25,'#c5dfbc'],[0.6,'#74a780'],[1,'#285940']];
export function layout(extra:Partial<Layout>={}):Partial<Layout> {
  return {autosize:true,height:400,margin:{l:55,r:20,t:20,b:48},paper_bgcolor:'transparent',plot_bgcolor:'#fff',
    font:{family:'Segoe UI, sans-serif',size:12,color:'#536a50'},showlegend:true,
    legend:{orientation:'h',y:-0.18,x:0,font:{size:11}},uirevision:'o1',
    xaxis:{title:{text:'z'},gridcolor:'#e5ecdf',zerolinecolor:'#bccdb3'},
    yaxis:{title:{text:'Costo'},gridcolor:'#e5ecdf',zerolinecolor:'#bccdb3'},...extra};
}
export function curve(x:readonly number[],y:readonly number[],name:string,color='#356b45',dash?:'dash'|'dot'):Data {
  return {type:'scatter',x:[...x],y:[...y],mode:'lines',name,line:{color,width:2.2,dash},hovertemplate:'z: %{x:.3f}<br>valore: %{y:.3f}<extra>'+name+'</extra>'};
}
export function marker(point:Vec2,name:string,color='#d28a48',symbol:'circle'|'diamond'='circle'):Data {
  return {type:'scatter',x:[point[0]],y:[point[1]],mode:'markers',name,marker:{color,size:10,symbol,line:{color:'#fff',width:1.5}},hovertemplate:'%{x:.3f}, %{y:.3f}<extra>'+name+'</extra>'};
}
export function scalarFrame(traces:Data[],extra:Partial<Layout>={}):PlotFrame { return {data:traces,layout:layout(extra)}; }

export function surfaceFrame(data:Grid,view:'2d'|'3d',point?:Vec2,value=0,tangent?:{gradient:Vec2},extraTraces:Data[]=[]):PlotFrame {
  if(view==='2d') {
    const traces:Data[]=[{type:'contour',x:data.x,y:data.y,z:data.z,colorscale:colors,showscale:false,ncontours:16,
      contours:{coloring:'fill'},line:{width:0.7,color:'#91b68b'},name:'Costo',hovertemplate:'x: %{x:.2f}<br>y: %{y:.2f}<br>f: %{z:.3f}<extra></extra>'}];
    if(point) traces.push(marker(point,'Punto selezionato'));
    traces.push(...extraTraces);
    const gradient=tangent?.gradient, length=gradient?Math.hypot(...gradient):0;
    return {data:traces,layout:layout({showlegend:false,
      xaxis:{title:{text:'z₁'},range:[data.x[0],data.x.at(-1)!],gridcolor:'#e5ecdf',fixedrange:true,constrain:'domain'},
      yaxis:{title:{text:'z₂'},range:[data.y[0],data.y.at(-1)!],gridcolor:'#e5ecdf',fixedrange:true,scaleanchor:'x',scaleratio:1},
      annotations:point&&gradient&&length>1e-9?[{x:point[0]+0.65*gradient[0]/length,y:point[1]+0.65*gradient[1]/length,
        ax:point[0],ay:point[1],xref:'x',yref:'y',axref:'x',ayref:'y',text:'',showarrow:true,arrowcolor:'#b27136',arrowwidth:2,arrowhead:3}]:[],
    })};
  }
  const traces:Data[]=[{type:'surface',x:data.x,y:data.y,z:data.z,colorscale:colors,showscale:false,opacity:0.93,
    name:'Costo',hovertemplate:'z₁: %{x:.2f}<br>z₂: %{y:.2f}<br>f: %{z:.3f}<extra></extra>'}];
  if(point) {
    traces.push({type:'scatter3d',x:[point[0]],y:[point[1]],z:[value],mode:'markers',name:'Punto',marker:{color:'#d28a48',size:5}});
    if(tangent) {
      const x=[point[0]-0.7,point[0],point[0]+0.7], y=[point[1]-0.7,point[1],point[1]+0.7];
      traces.push({type:'surface',x,y,z:y.map(yy=>x.map(xx=>value+tangent.gradient[0]*(xx-point[0])+tangent.gradient[1]*(yy-point[1]))),
        colorscale:[[0,'#dfa366'],[1,'#dfa366']],opacity:0.55,showscale:false,name:'Piano tangente',hoverinfo:'skip'});
    }
  }
  return {data:traces,layout:layout({showlegend:false,margin:{l:0,r:0,t:5,b:0},uirevision:'o1-3d',
    scene:{xaxis:{title:{text:'z₁'}},yaxis:{title:{text:'z₂'}},zaxis:{title:{text:'f'}},
      camera:{eye:{x:1.5,y:1.5,z:1}},aspectratio:{x:1,y:1,z:0.75}},})};
}

export function regionFrame(data:Grid,A:Vec2,B:Vec2,point:Vec2,inside:boolean,boundaries:Vec2[][]):PlotFrame {
  const traces:Data[]=[{type:'heatmap',x:data.x,y:data.y,z:data.z,zmin:0,zmax:1,colorscale:[[0,'#fff'],[1,'#e4efdc']],showscale:false,hoverinfo:'skip'}];
  boundaries.forEach(points=>traces.push(curve(points.map(p=>p[0]),points.map(p=>p[1]),'Bordo','#71976a')));
  traces.push(curve([A[0],B[0]],[A[1],B[1]],'Segmento A–B','#cc935b'));
  traces.push(marker(A,'A','#356b45'),marker(B,'B','#356b45'),marker(point,inside?'Combinazione ammissibile':'Combinazione non ammissibile',inside?'#ce8c48':'#b94e40'));
  return {data:traces,layout:layout({showlegend:false,
    xaxis:{title:{text:'z₁'},range:[-2.3,2.3],fixedrange:true,constrain:'domain',gridcolor:'#e6eddf'},
    yaxis:{title:{text:'z₂'},range:[-2.3,2.3],fixedrange:true,scaleanchor:'x',scaleratio:1,gridcolor:'#e6eddf'},})};
}
export const circle=(radius:number):Vec2[]=>Array.from({length:121},(_,i)=>[radius*Math.cos(i*2*Math.PI/120),radius*Math.sin(i*2*Math.PI/120)] as Vec2);
