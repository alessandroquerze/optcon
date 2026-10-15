/** Test the compiled active-set and KKT laboratory on a temporary static server. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve,extname,sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium,expect } from '@playwright/test';
const root=fileURLToPath(new URL('../../',import.meta.url)),dist=resolve(root,'dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.pdf':'application/pdf','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{const path=resolve(dist,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname));if(!path.startsWith(dist+sep)){res.writeHead(403);res.end();return;}res.writeHead(200,{'Content-Type':mime[extname(path)]??'application/octet-stream'});res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
let browser;
try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
  browser=await chromium.launch({headless:true,executablePath:process.env.OPTCON_BROWSER_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));const response=await page.goto(`http://127.0.0.1:${port}/kkt.html#k2-kkt`);expect(response.status()).toBe(200);
  const n=page.locator('[data-demo="optimal-control-kkt"]');await n.scrollIntoViewIfNeeded();await expect(n).toHaveAttribute('data-ready','true',{timeout:20000});const metric=label=>n.locator('.o3-metrics>div').filter({has:page.getByText(label,{exact:true})}).locator('strong');
  await expect(metric('Condizioni KKT?')).toHaveText('Sì');await n.getByRole('button',{name:'3D',exact:true}).click();await expect(n).toHaveAttribute('data-ready','true');expect(await n.locator('[data-o3-plot="0"]').evaluate(e=>e.data.some(t=>t.type==='scatter3d'))).toBe(true);await n.screenshot({path:resolve(root,'../artifacts/K2-production.png')});
  await n.getByRole('button',{name:'Inattivo con μ positivo',exact:true}).click();await expect(n).toHaveAttribute('data-ready','true');await expect(metric('Condizioni KKT?')).toHaveText('No');await expect(metric('Violazione μ≥0')).toHaveText('0');expect(errors).toEqual([]);
  console.log(JSON.stringify({passed:true,route:'kkt.html#k2-kkt',activeSet:true,lazyModule:true,errors,temporaryServer:true}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
