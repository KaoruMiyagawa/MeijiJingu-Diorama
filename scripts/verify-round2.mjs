import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { PATH_EDGES, PATH_NODES, LANDMARKS, REGIONS, PONDS, PRECINCT, WHOLE_VIEWS } from '../src/data/precinct-layout.js';
import { pointInPolygon, polygonBounds, projectedPixels, selectVegetationLOD, RegionRegistry } from '../src/core/spatial.js';
import { pathCurve } from '../src/scene/paths.js';
import { heightAt } from '../src/scene/heightfield.js';

const checks=[],errors=[],warnings=[],failedRequests=[];
const check=(name,ok)=>{assert.ok(ok,name);checks.push(name);};
const delta=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex').toUpperCase();
await mkdir('captures/round2',{recursive:true});
const servers=[],measurements={};let browser,result;
try {
  const manifest=JSON.parse(await readFile('baselines/v1-20261103/SHA256.json','utf8'));
  for(const file of manifest)assert.equal(sha(await readFile(`baselines/v1-20261103/${file.path}`)),file.sha256,`Baseline changed: ${file.path}`);
  check('All 43 baseline file hashes are intact',manifest.length===43);
  for(const file of ['scene/architecture.js','scene/roofs.js','scene/forest.js','scene/terrain.js','scene/props.js','core/materials.js'])assert.equal(sha(await readFile(`src/${file}`)),sha(await readFile(`baselines/v1-20261103/src/${file}`)),file);
  check('Original architecture, roofs, forest, terrain, props and base materials source is unchanged',true);
  check('Landmark IDs are unique and all have provenance',new Set(LANDMARKS.map(p=>p.id)).size===LANDMARKS.length&&LANDMARKS.every(p=>p.source.length&&p.region&&p.confidence.worldCoordinates==='artistic-approximation'));
  check('North and east are consistently -Z and +X',PRECINCT.north[2]===-1&&PRECINCT.east[0]===1);
  check('Shrine north of garden; north entry east of west entry',LANDMARKS.find(p=>p.id==='main-sanctuary').position[2]<LANDMARKS.find(p=>p.id==='south-pond').position[2]&&PATH_NODES.north[0]>PATH_NODES.west[0]);
  const graph=new Map(Object.keys(PATH_NODES).map(id=>[id,[]]));
  for(const edge of PATH_EDGES){assert.ok(graph.has(edge.from)&&graph.has(edge.to));graph.get(edge.from).push(edge.to);graph.get(edge.to).push(edge.from);}
  const seen=new Set(),queue=['south'];while(queue.length){const id=queue.pop();if(seen.has(id))continue;seen.add(id);queue.push(...graph.get(id));}
  check('All approach and garden nodes belong to one connected graph',seen.size===graph.size);
  const collisions=[];
  for(const edge of PATH_EDGES){const curve=pathCurve(edge);for(let i=0;i<=120;i++){
    const p=curve.getPointAt(i/120);assert.ok(Number.isFinite(heightAt(p.x,p.z)));
    assert.ok(pointInPolygon(p.x,p.z,PRECINCT.boundary),`${edge.id} outside precinct`);
    for(const area of [...REGIONS.filter(r=>r.kind==='forest'),...PONDS])if(pointInPolygon(p.x,p.z,area.polygon))collisions.push(`${edge.id}:${area.id}`);
  }}
  check('Sampled road centrelines avoid forest volumes and ponds',collisions.length===0);
  check('Core foundation height is stable',Math.abs(heightAt(-18,-26.4)-.9)<1e-6);
  const registry=new RegionRegistry();for(const region of REGIONS)registry.register(region.id,polygonBounds(region.polygon),null);
  check('Region registry exposes finite spatial bounds',registry.snapshot().length===REGIONS.length&&registry.snapshot().every(r=>r.bounds.min.every(Number.isFinite)));
  check('Orthographic projected size doubles with zoom',projectedPixels(10,{zoom:2,top:50,bottom:-50},1000)===2*projectedPixels(10,{zoom:1,top:50,bottom:-50},1000));
  check('Vegetation LOD hysteresis avoids rapid threshold toggling',selectVegetationLOD(145,1)===1&&selectVegetationLOD(170,1)===0&&selectVegetationLOD(125,0)===0&&selectVegetationLOD(110,0)===1&&selectVegetationLOD(5,3)===3);
  const captures=JSON.parse(await readFile('captures/round2/capture.json','utf8'));
  check('All four comparison cameras, targets, canvas sizes, animation times and object counts match',Object.values(captures.comparison).every(v=>v.cameraMaxDelta===0&&v.targetMaxDelta===0&&v.sameZoom&&v.sameTime&&v.sameCanvas&&v.sameCounts));
  for(const [root,port] of [['dist',8791],['baselines/v1-20261103/dist',8792]]){const server=await createServer({root,configFile:false,server:{host:'127.0.0.1',port,strictPort:true}});await server.listen();servers.push(server);}
  browser=await chromium.launch({channel:'chrome',headless:true});
  let gpu;
  for(const mode of ['baseline','precinct','core']) {
    const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(`${mode}: ${e.message}`));
    page.on('console',m=>{if(m.type()==='error')errors.push(`${mode}: ${m.text()}`);if(m.type()==='warning')warnings.push(`${mode}: ${m.text()}`);});
    page.on('requestfailed',r=>failedRequests.push(r.url()));
    const started=performance.now();await page.goto(`http://127.0.0.1:${mode==='baseline'?8792:8791}/?scene=${mode}`,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.__MEIJI__?.stats().frames>0,null,{timeout:60000});
    const navigationToFirstFrameMs=Math.round(performance.now()-started);
    await page.waitForTimeout(1200);
    const timing=await page.evaluate(()=>new Promise(resolve=>{let last;const times=[];function tick(now){if(last!==undefined)times.push(now-last);last=now;if(times.length<240)requestAnimationFrame(tick);else{times.sort((a,b)=>a-b);resolve({medianMs:times[120],p95Ms:times[228],p99Ms:times[237],samples:times.length,over33ms:times.filter(v=>v>33.4).length});}}requestAnimationFrame(tick);}));
    const stats=()=>page.evaluate(()=>window.__MEIJI__.stats());
    const initial=await stats();
    gpu=await page.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';});
    measurements[mode]={navigationToFirstFrameMs,timing,stats:initial};
    if(mode==='baseline'){await context.close();continue;}
    check(`${mode}: canvas-only UI remains`,await page.locator('canvas').count()===1&&await page.locator('button,nav,aside,input').count()===0);
    if(mode==='precinct'){
      check('Graybox builds zero detailed trees and does not fetch forest sample chunk',initial.counts.trees===0&&await page.evaluate(()=>!performance.getEntriesByType('resource').some(e=>e.name.includes('core-sample'))));
      const layout=await page.evaluate(()=>window.__MEIJI__.layout());await writeFile('captures/round2/layout.json',JSON.stringify(layout,null,2));
      check('Exported landmark heights agree with terrain query',layout.landmarks.every(p=>Math.abs(p.position[1]-heightAt(p.position[0],p.position[2]))<1e-6));
    } else check('Core retains v1 tree and canopy counts',JSON.stringify(initial.counts)===JSON.stringify(measurements.baseline.stats.counts));
    await page.mouse.move(900,520);await page.mouse.down();await page.mouse.move(1180,590,{steps:16});await page.mouse.up();await page.waitForTimeout(400);
    const rotated=await stats();check(`${mode}: left drag rotates`,delta(initial.camera,rotated.camera)>10);
    await page.mouse.wheel(0,-450);await page.waitForTimeout(500);const zoomed=await stats();check(`${mode}: wheel zooms`,zoomed.zoom>rotated.zoom*1.2);
    await page.mouse.move(900,520);await page.mouse.down({button:'right'});await page.mouse.move(1100,620,{steps:12});await page.mouse.up({button:'right'});await page.waitForTimeout(400);
    const panned=await stats();check(`${mode}: right drag pans`,delta(zoomed.target,panned.target)>1);
    await page.mouse.wheel(0,-30000);await page.waitForTimeout(800);check(`${mode}: maximum zoom bounded`,(await stats()).zoom<=4.801);
    await page.mouse.wheel(0,30000);await page.waitForTimeout(800);check(`${mode}: minimum zoom bounded`,(await stats()).zoom>=.699);
    await page.keyboard.press('2');const from=await stats();await page.waitForTimeout(350);const mid=await stats();await page.waitForTimeout(1700);const end=await stats();
    check(`${mode}: animated preset passes through intermediate pose`,delta(from.camera,mid.camera)>.1&&delta(mid.camera,end.camera)>.1);
    check(`${mode}: preset reaches expected target`,delta(end.target,mode==='precinct'?WHOLE_VIEWS[2].target:[0,4.7,-17])<.1);
    await page.keyboard.press('r');await page.waitForTimeout(1800);check(`${mode}: R returns panorama`,delta((await stats()).target,mode==='precinct'?[0,1,0]:[0,2,0])<.1);
    for(let i=0;i<4;i++){await page.mouse.move(1800,900);await page.mouse.down({button:'right'});await page.mouse.move(30,30,{steps:4});await page.mouse.up({button:'right'});}
    await page.waitForTimeout(400);const bounded=await stats(),limit=mode==='precinct'?130.01:30.01;
    check(`${mode}: pan obeys mode-specific boundaries`,Math.abs(bounded.target[0])<=limit&&Math.abs(bounded.target[2])<=limit);
    for(let id=1;id<=6;id++){await page.evaluate(id=>window.__MEIJI__.preset(id,true),id);await page.waitForTimeout(70);assert.ok((await stats()).camera.every(Number.isFinite));}
    check(`${mode}: all six presets render finite camera poses`,true);
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);check(`${mode}: portrait resize updates canvas`,JSON.stringify((await stats()).canvas)==='[390,844]');
    await page.evaluate(()=>window.__MEIJI__.preset(1,true));await page.screenshot({path:`captures/round2/${mode}-portrait.png`});
    const wind=(await stats()).windTime;await page.waitForTimeout(150);check(`${mode}: normal animation time advances`,(await stats()).windTime>wind);
    await context.close();
  }
  for(const mode of ['precinct','core']){
    const context=await browser.newContext({viewport:{width:430,height:932},hasTouch:true,isMobile:true,deviceScaleFactor:1});
    const page=await context.newPage();await page.goto(`http://127.0.0.1:8791/?scene=${mode}&time=0`);await page.waitForFunction(()=>window.__MEIJI__?.stats().frames>3);
    const before=await page.evaluate(()=>window.__MEIJI__.stats()),cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:170,y:430}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:280,y:470}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(300);
    const rotated=await page.evaluate(()=>window.__MEIJI__.stats());check(`${mode}: one finger rotates`,delta(before.camera,rotated.camera)>5);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:160,y:420},{x:260,y:420}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:110,y:420},{x:310,y:420}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(400);
    const pinched=await page.evaluate(()=>window.__MEIJI__.stats());check(`${mode}: pinch persists while animation is frozen`,Math.abs(pinched.zoom-rotated.zoom)>.15&&pinched.windTime===0);
    await context.close();
  }
  check('No runtime / WebGL errors or failed requests',errors.length===0&&failedRequests.length===0);
  result={status:'passed',testedAt:new Date().toISOString(),browser:browser.version(),gpu,viewport:[1920,1080],dpr:1,measurementNotes:'Production dist, fresh browser context for each mode; local HTTP; OS/GPU caches not flushed. First-frame time includes automation polling. RAF frame intervals include display scheduling; not isolated GPU duration. 1.2 s warmup, 240 samples.',checks,measurements,errors,warnings,failedRequests};
} catch(error){result={status:'failed',error:error.stack,checks,measurements,errors,warnings,failedRequests};process.exitCode=1;}
finally {await writeFile('captures/round2/verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser?.close();for(const server of servers)await server.close();}
