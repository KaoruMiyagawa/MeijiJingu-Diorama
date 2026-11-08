import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { performance } from 'node:perf_hooks';

// Self-contained acceptance test against the built artifact, using installed Chrome.
const server=await createServer({server:{host:'127.0.0.1',port:8791,strictPort:true},root:'dist',configFile:false});
await server.listen();
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
const errors=[],warnings=[],failures=[],checks=[];
const context=await browser.newContext({viewport:{width:1600,height:1100},deviceScaleFactor:1});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
page.on('console',msg=>{if(msg.type()==='error')errors.push(msg.text());if(msg.type()==='warning')warnings.push(msg.text());});
page.on('requestfailed',request=>failures.push(request.url()));
const stats=()=>page.evaluate(()=>window.__MEIJI__.stats());
const delay=ms=>page.waitForTimeout(ms);
const check=(name,condition)=>{assert.ok(condition,name);checks.push(name);};
const delta=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
let result;
try {
  const started=performance.now();
  const response=await page.goto('http://127.0.0.1:8791',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__MEIJI__?.stats().frames>5,{timeout:60000});
  check('Production page returns HTTP 200',response.status()===200);
  const initial=await stats();
  check('WebGL2 renders a substantial scene',initial.triangles>300000&&initial.counts.trees>=240);
  check('UI consists only of one canvas',await page.locator('canvas').count()===1&&await page.locator('button,nav,aside,input').count()===0);
  const loadMs=Math.round(performance.now()-started);

  await page.mouse.move(800,560);await page.mouse.down();await page.mouse.move(1060,600,{steps:18});await page.mouse.up();await delay(600);
  const rotated=await stats();check('Left drag rotates camera',delta(initial.camera,rotated.camera)>10);
  await page.mouse.wheel(0,-450);await delay(500);const zoomed=await stats();check('Wheel smoothly zooms in',zoomed.zoom>rotated.zoom*1.2);
  await page.mouse.move(850,570);await page.mouse.down({button:'right'});await page.mouse.move(1030,630,{steps:15});await page.mouse.up({button:'right'});await delay(500);
  const panned=await stats();check('Right drag pans target',delta(zoomed.target,panned.target)>1);
  await page.mouse.wheel(0,-30000);await delay(800);check('Maximum zoom is bounded',(await stats()).zoom<=4.801);
  await page.mouse.wheel(0,30000);await delay(800);check('Minimum zoom is bounded',(await stats()).zoom>=0.699);

  await page.keyboard.press('2');const startPose=await stats();await delay(350);const middlePose=await stats();await delay(1600);const finalPose=await stats();
  check('Preset moves through an intermediate pose',delta(startPose.camera,middlePose.camera)>0.1&&delta(middlePose.camera,finalPose.camera)>0.1);
  check('Preset reaches shrine target',delta(finalPose.target,[0,4.7,-17])<0.1&&Math.abs(finalPose.zoom-1)<0.01);
  await page.keyboard.press('r');await delay(1800);check('R restores panorama',delta((await stats()).target,[0,2,0])<0.1);
  await page.mouse.move(800,550);await page.mouse.down({button:'right'});await page.mouse.move(1550,1050,{steps:6});await page.mouse.move(40,50,{steps:6});await page.mouse.up({button:'right'});await delay(400);
  const bounded=await stats();check('Pan remains inside model region',Math.abs(bounded.target[0])<=30.01&&Math.abs(bounded.target[2])<=30.01);

  await page.evaluate(()=>window.__MEIJI__.preset(1,true));await delay(500);
  const timing=await page.evaluate(()=>new Promise(resolve=>{
    const times=[];let previous=performance.now();
    function tick(now){times.push(now-previous);previous=now;if(times.length<180)requestAnimationFrame(tick);else{times.shift();times.sort((a,b)=>a-b);resolve({medianMs:times[Math.floor(times.length*0.5)],p95Ms:times[Math.floor(times.length*0.95)],frames:times.length});}}
    requestAnimationFrame(tick);
  }));
  const gpu=await page.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):'not exposed';});
  const beforeWind=(await stats()).windTime;await delay(200);check('Wind shader time advances',(await stats()).windTime>beforeWind);

  await mkdir('captures',{recursive:true});
  for(const [id,name] of [[1,'01-panorama'],[2,'02-sanctuary'],[3,'03-torii'],[4,'04-reverse'],[5,'05-plan'],[6,'06-front']]) {
    await page.keyboard.press(String(id));await delay(1850);
    const shot=await page.screenshot({path:`captures/${name}.png`});check(`View ${id} produces a detailed render`,shot.length>100000);
  }
  await page.setViewportSize({width:1280,height:720});await page.evaluate(()=>window.__MEIJI__.preset(1,true));await delay(400);
  check('Desktop resize updates render resolution',JSON.stringify((await stats()).canvas)==='[1280,720]');
  await page.screenshot({path:'captures/07-desktop-1280.png'});
  await page.setViewportSize({width:390,height:844});await delay(500);
  check('Portrait resize updates render resolution',JSON.stringify((await stats()).canvas)==='[390,844]');
  await page.screenshot({path:'captures/08-portrait.png'});

  const touch=await browser.newContext({viewport:{width:430,height:932},hasTouch:true,isMobile:true,deviceScaleFactor:1});
  const mobile=await touch.newPage();await mobile.goto('http://127.0.0.1:8791');await mobile.waitForFunction(()=>window.__MEIJI__?.stats().frames>3);
  const touchBefore=await mobile.evaluate(()=>window.__MEIJI__.stats());
  const cdp=await touch.newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:170,y:430}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:280,y:470}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.waitForTimeout(300);
  const touchAfter=await mobile.evaluate(()=>window.__MEIJI__.stats());check('One-finger touch rotates model',delta(touchBefore.camera,touchAfter.camera)>5);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:160,y:420},{x:260,y:420}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:110,y:420},{x:310,y:420}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.waitForTimeout(400);
  const pinched=await mobile.evaluate(()=>window.__MEIJI__.stats());check('Two-finger pinch changes zoom persistently',Math.abs(pinched.zoom-touchAfter.zoom)>0.15);
  await touch.close();

  check('No failed resource requests',failures.length===0);check('No runtime or WebGL console errors',errors.length===0);
  await page.setViewportSize({width:1600,height:1100});await page.evaluate(()=>window.__MEIJI__.preset(1,true));await delay(200);
  result={status:'passed',testedAt:new Date().toISOString(),browser:browser.version(),gpu,loadMs,timing,checks,errors,warnings,failedRequests:failures,stats:await stats()};
  console.log(JSON.stringify(result,null,2));
} catch(error) {
  result={status:'failed',checks,error:error.stack,errors,warnings,failures};console.error(JSON.stringify(result,null,2));process.exitCode=1;
} finally {
  await writeFile('captures/verification.json',JSON.stringify(result,null,2));await browser.close();await server.close();
}
