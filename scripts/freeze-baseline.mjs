import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const destination='captures/round2/before';
await mkdir(destination,{recursive:true});
const server=await createServer({root:path.resolve('baselines/v1-20261103'),configFile:false,server:{host:'127.0.0.1',port:8792,strictPort:true}});
await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});
  await page.addInitScript(()=>{
    performance.now=()=>0;
    const native=window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame=callback=>native(()=>callback(0));
  });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8792/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__MEIJI__?.stats().frames>3);
  const views={};
  for(const [id,name] of [[1,'panorama'],[2,'sanctuary'],[3,'torii'],[6,'low-angle']]) {
    await page.evaluate(id=>window.__MEIJI__.preset(id,true),id);await page.waitForTimeout(250);
    await page.screenshot({path:`${destination}/${name}.png`});views[name]=await page.evaluate(()=>window.__MEIJI__.stats());
  }
  await writeFile(`${destination}/capture.json`,JSON.stringify({source:'baselines/v1-20261103 (unmodified source)',animationTime:0,viewport:[1600,1100],dpr:1,errors,views},null,2));
  console.log(JSON.stringify({errors,views:Object.keys(views),windTime:views.panorama.windTime}));
} finally {await browser.close();await server.close();}
