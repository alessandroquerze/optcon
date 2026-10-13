import { solveDrone,type DroneParams } from '../../math/I2/drone';
const worker=self as unknown as {onmessage:(event:MessageEvent<{id:number;params:DroneParams}>)=>void;postMessage:(data:unknown)=>void};
worker.onmessage=event=>{const {id,params}=event.data;try{worker.postMessage({id,result:solveDrone(params)});}catch(error){worker.postMessage({id,error:error instanceof Error?error.message:'Calcolo non disponibile.'});}};
