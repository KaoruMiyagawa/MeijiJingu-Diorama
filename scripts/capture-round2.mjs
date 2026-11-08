import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir, writeFile, readFile } from 'node:fs/promises';

const server=await createServer({root:'dist',configFile:false,server:{host:'127.0.0.1',port:8793,strictPort:true}});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],warnings=[],report={};
try {
  const page=await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});
  for(const mode of ['precinct','core']){
    const directory=`captures/round2/${mode==='core'?'after':'graybox'}`;await mkdir(directory,{recursive:true});
    await page.goto(`http://127.0.0.1:8793/?scene=${mode}&time=0`,{waitUntil:'networkidle'});
    await page.waitForFunction(()=>window.__MEIJI__?.stats().frames>3);
    const views=mode==='core'?[[1,'panorama'],[2,'sanctuary'],[3,'torii'],[6,'low-angle']]:[[1,'01-whole-park'],[2,'02-top-plan'],[3,'03-south-entrance'],[4,'04-north-entrance'],[5,'05-northwest-entrance'],[6,'06-sanctuary']];
    report[mode]={};
    for(const [id,name] of views){await page.evaluate(id=>window.__MEIJI__.preset(id,true),id);await page.waitForTimeout(300);await page.screenshot({path:`${directory}/${name}.png`});report[mode][name]=await page.evaluate(()=>window.__MEIJI__.stats());}
  }
  const before=JSON.parse(await readFile('captures/round2/before/capture.json','utf8'));
  const comparison={};
  for(const name of Object.keys(report.core)){
    const a=before.views[name],b=report.core[name];
    comparison[name]={cameraMaxDelta:Math.max(...a.camera.map((v,i)=>Math.abs(v-b.camera[i]))),targetMaxDelta:Math.max(...a.target.map((v,i)=>Math.abs(v-b.target[i]))),sameZoom:a.zoom===b.zoom,sameTime:a.windTime===b.windTime,sameCanvas:JSON.stringify(a.canvas)===JSON.stringify(b.canvas),sameCounts:JSON.stringify(a.counts)===JSON.stringify(b.counts)};
  }
  await writeFile('captures/round2/capture.json',JSON.stringify({errors,warnings,comparison,report},null,2));
  console.log(JSON.stringify({errors,warnings,comparison,graybox:report.precinct['01-whole-park'],core:report.core.panorama},null,2));
} finally {await browser.close();await server.close();}
