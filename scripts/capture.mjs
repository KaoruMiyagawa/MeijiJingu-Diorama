import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());});
await page.goto('http://127.0.0.1:8787',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__MEIJI__?.stats().frames>5,{timeout:90000});
await page.waitForTimeout(1500);
await mkdir('captures',{recursive:true});
for(const [id,name] of [[1,'01-panorama'],[2,'02-sanctuary'],[3,'03-torii'],[4,'04-reverse'],[5,'05-plan'],[6,'06-front']]) {
  await page.evaluate(id=>window.__MEIJI__.preset(id,true),id);
  await page.waitForTimeout(600);
  await page.screenshot({path:`captures/${name}.png`});
}
const stats=await page.evaluate(()=>window.__MEIJI__.stats());
const gpu=await page.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'not exposed';});
await writeFile('captures/initial-report.json',JSON.stringify({errors,stats,gpu},null,2));
console.log(JSON.stringify({errors,stats,gpu},null,2));await browser.close();
