import { solveTransfer,type TransferParams } from '../../math/I3/pendulum';
const worker=self as unknown as {onmessage:(event:MessageEvent<{id:number;params:TransferParams}>)=>void;postMessage:(value:unknown)=>void};
worker.onmessage=event=>{const {id,params}=event.data;try{worker.postMessage({id,result:solveTransfer(params)});}catch(error){worker.postMessage({id,error:error instanceof Error?error.message:'Calcolo non disponibile.'});}};
