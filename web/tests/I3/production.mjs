/** Verify the compiled Worker on a temporary static server, then close both. */
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
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],workers=[];page.on('pageerror',e=>errors.push(e.message));page.on('worker',worker=>workers.push(worker.url()));
  const response=await page.goto(`http://127.0.0.1:${port}/introduzione.html#i3-pendolo-controllo`);expect(response.status()).toBe(200);
  const node=page.locator('[data-demo="pendulum-optimal-control"]');await node.scrollIntoViewIfNeeded();await expect(node).toHaveAttribute('data-ready','true',{timeout:20000});
  const metric=label=>node.locator('.o3-metrics>div').filter({has:page.getByText(label,{exact:true})}).locator('strong');
  await expect(node.locator('.o3-message')).toContainText('Stazionarietà locale');await expect(metric('Violazione coppia (N·m)')).toHaveText('0');
  const count=await node.getAttribute('data-computations');await node.getByRole('button',{name:'3D',exact:true}).click();await expect(node).toHaveAttribute('data-ready','true');await expect(node).toHaveAttribute('data-computations',count);
  expect(workers.some(url=>/\/assets\/solver\.worker-.*\.js$/.test(url))).toBe(true);await node.screenshot({path:resolve(root,'../artifacts/I3-production.png')});expect(errors).toEqual([]);
  console.log(JSON.stringify({passed:true,builtWorker:true,route:'introduzione.html#i3-pendolo-controllo',errors,temporaryServer:true}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
