import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { mkdir,writeFile } from 'node:fs/promises';

const output='captures/forest-20261105';await mkdir(output,{recursive:true});
const server=await createServer({root:'dist',configFile:false,server:{host:'127.0.0.1',port:8793,strictPort:true}});await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],warnings=[],report={};
try{
  const page=await browser.newPage({viewport:{width:1800,height:1200},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});
  await page.goto('http://127.0.0.1:8793/?scene=precinct&time=0',{waitUntil:'networkidle',timeout:120000});await page.waitForFunction(()=>window.__MEIJI__?.stats().frames>5,null,{timeout:120000});
  for(const [id,name] of [[1,'01-whole-forest'],[2,'02-top-plan'],[3,'03-south-approach'],[4,'04-north-precinct'],[5,'05-west-woodland'],[6,'06-sanctuary'],[7,'07-imperial-garden'],[8,'08-treasure-museum'],[9,'09-forest-avenue'],[0,'10-reverse'],['west-detail','12-west-gate']]){
    await page.evaluate(id=>window.__MEIJI__.preset(id,true),id);await page.waitForTimeout(450);await page.screenshot({path:`${output}/${name}.png`});report[name]=await page.evaluate(()=>window.__MEIJI__.stats());
  }
  const layout=await page.evaluate(()=>window.__MEIJI__.layout());await writeFile(`${output}/layout.json`,JSON.stringify(layout,null,2));
  await writeFile(`${output}/capture.json`,JSON.stringify({errors,warnings,report},null,2));
  console.log(JSON.stringify({errors,warnings,whole:report['01-whole-forest'],close:report['06-sanctuary']},null,2));
  if(errors.length)process.exitCode=1;
}finally{await browser.close();await server.close();}
