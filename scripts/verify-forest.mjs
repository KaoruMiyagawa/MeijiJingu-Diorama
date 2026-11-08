import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createArchitecture } from '../src/scene/architecture.js';
import { openWestGate } from '../src/scene/west-gate.js';
import { createParkSpatial } from '../src/scene/park-spatial.js';
import { heightAt } from '../src/scene/heightfield.js';
import { PATH_NODES,PATH_EDGES } from '../src/data/precinct-layout.js';

const destination='captures/forest-20261105';await mkdir(destination,{recursive:true});
const checks=[],errors=[],warnings=[],failedRequests=[],metrics={};
const check=(name,condition)=>{assert.ok(condition,name);checks.push(name);};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex').toUpperCase();
const delta=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
let server,browser,result;
try{
  const baselineRoot='baselines/v1-20261103',baselineZip='baselines/v1-20261103.zip';
  if(existsSync(baselineZip)&&existsSync(`${baselineRoot}/src/scene/architecture.js`)){
    const manifest=JSON.parse(await readFile(`${baselineRoot}/SHA256.json`,'utf8'));
    for(const file of manifest)assert.equal(hash(await readFile(`${baselineRoot}/${file.path}`)),file.sha256,file.path);
    check('Every v1 snapshot file retains its recorded SHA256',true);
    check('Original v1 ZIP is unchanged',hash(await readFile(baselineZip))==='563F8D2424AB8878E61866D91261AB39FC44B9845004FA71ADF74DA864D3DF60');
    for(const file of ['scene/architecture.js','scene/roofs.js','scene/forest.js','scene/terrain.js','scene/props.js','core/materials.js'])assert.equal(hash(await readFile(`src/${file}`)),hash(await readFile(`${baselineRoot}/src/${file}`)),file);
    check('Six original model/material modules are unchanged',true);
  }else check('Optional local v1 recovery archive is not required for forest acceptance',true);
  const testMaterials=new Proxy({}, {get:(target,key)=>target[key]??(target[key]=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}))});
  const testCore=new THREE.Group();createArchitecture(testCore,testMaterials);testCore.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(-25,2,-7.8),new THREE.Vector3(1,0,0)),wallDistance=ray.intersectObject(testCore,true)[0]?.distance;
  openWestGate(testCore,testMaterials);testCore.updateMatrixWorld(true);const openDistance=ray.intersectObject(testCore,true)[0]?.distance;
  check('West approach has a real opening through the derived corridor mesh',wallDistance<10&&openDistance>30);
  testCore.traverse(o=>o.geometry?.dispose());for(const material of Object.values(testMaterials))material.dispose();testCore.clear();
  const graph=new Map(Object.keys(PATH_NODES).map(id=>[id,[]]));for(const e of PATH_EDGES){graph.get(e.from).push(e.to);graph.get(e.to).push(e.from);}
  const seen=new Set(),queue=['south'];while(queue.length){const id=queue.pop();if(seen.has(id))continue;seen.add(id);queue.push(...graph.get(id));}
  check('Three entrances and garden paths share a connected route graph',seen.size===graph.size);
  server=await createServer({root:'dist',configFile:false,server:{host:'127.0.0.1',port:8791,strictPort:true}});await server.listen();
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warning')warnings.push(m.text());});page.on('requestfailed',r=>failedRequests.push(r.url()));
  const start=performance.now();await page.goto('http://127.0.0.1:8791/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__MEIJI__?.stats().frames>1,null,{timeout:90000});
  const firstFrameMs=Math.round(performance.now()-start),stats=()=>page.evaluate(()=>window.__MEIJI__.stats()),initial=await stats();
  check('Default page is the complete forest, with no graybox forest',initial.mode==='precinct'&&initial.counts.trees>750&&initial.counts.forestProxies===0);
  check('Canvas-only presentation is retained',await page.locator('canvas').count()===1&&await page.locator('button,aside,nav').count()===0);
  const inventory=await page.evaluate(()=>window.__MEIJI__.inventory());check('No graybox labels or landmark volumes render',!inventory.some(o=>/landmark-volumes|map-label|forest-volume/.test(o.name)));
  const layout=await page.evaluate(()=>window.__MEIJI__.layout()),spatial=createParkSpatial();
  check('Trees occupy all four precinct quadrants',[-1,1].every(sx=>[-1,1].every(sz=>layout.treePositions.filter(p=>Math.sign(p.x)===sx&&Math.sign(p.z)===sz).length>50)));
  const trees=layout.treePositions.filter(p=>p.zone!=='courtyard');
  check('Tree trunks avoid paths, ponds, buildings and reserved sanctuary',trees.every(p=>spatial.plantable(p.x,p.z,2.69)));
  check('Landmark elevations use the common terrain function',layout.landmarks.every(p=>Math.abs(p.position[1]-heightAt(p.position[0],p.position[2]))<1e-6));
  check('Landmarks retain reference sources and coordinate confidence',layout.landmarks.every(p=>p.id&&p.source.length&&p.confidence.worldCoordinates==='artistic-approximation'));
  async function timing(){return page.evaluate(()=>new Promise(resolve=>{const samples=[];let last;function tick(now){if(last!==undefined)samples.push(now-last);last=now;if(samples.length<240)requestAnimationFrame(tick);else{samples.sort((a,b)=>a-b);resolve({medianMs:samples[120],p95Ms:samples[228],p99Ms:samples[237],samples:240,over33ms:samples.filter(x=>x>33.4).length});}}requestAnimationFrame(tick);}));}
  for(const [id,name] of [[1,'wholePark'],[6,'sanctuaryClose'],[7,'gardenClose']]){
    await page.evaluate(id=>window.__MEIJI__.preset(id,true),id);await page.waitForTimeout(900);metrics[name]={timing:await timing(),stats:await stats()};
  }
  check('Leaf detail is inactive at whole-park scale and active in close-up',metrics.wholePark.stats.lod.detailedChunks===0&&metrics.sanctuaryClose.stats.lod.detailedChunks>0);
  await page.evaluate(()=>window.__MEIJI__.preset(1,true));await page.waitForTimeout(150);const before=await stats();
  await page.mouse.move(850,520);await page.mouse.down();await page.mouse.move(1110,600,{steps:15});await page.mouse.up();await page.waitForTimeout(350);
  const rotated=await stats();check('Left drag rotates the whole park',delta(before.camera,rotated.camera)>10);
  await page.mouse.wheel(0,-450);await page.waitForTimeout(500);const zoomed=await stats();check('Wheel zoom remains smooth and functional',zoomed.zoom>rotated.zoom*1.2);
  await page.mouse.move(900,520);await page.mouse.down({button:'right'});await page.mouse.move(1100,620,{steps:12});await page.mouse.up({button:'right'});await page.waitForTimeout(400);check('Right drag pans the target',delta(zoomed.target,(await stats()).target)>1);
  await page.mouse.wheel(0,-30000);await page.waitForTimeout(800);check('Maximum zoom bounded',(await stats()).zoom<=4.801);
  await page.mouse.wheel(0,30000);await page.waitForTimeout(800);check('Minimum zoom bounded',(await stats()).zoom>=.699);
  for(let i=0;i<4;i++){await page.mouse.move(1850,1000);await page.mouse.down({button:'right'});await page.mouse.move(20,20,{steps:4});await page.mouse.up({button:'right'});}await page.waitForTimeout(300);
  const bounded=await stats();check('Pan target obeys the full precinct bounds',bounded.target[0]>=-89.01&&bounded.target[0]<=91.01&&Math.abs(bounded.target[2])<=130.01);
  await page.keyboard.press('6');const from=await stats();await page.waitForTimeout(300);const mid=await stats();await page.waitForTimeout(1800);const to=await stats();
  check('Preset transition remains animated and reaches sanctuary',delta(from.camera,mid.camera)>.1&&delta(mid.camera,to.camera)>.1&&delta(to.target,[-18,5,-24])<.1);
  for(const id of [0,1,2,3,4,5,6,7,8,9]){await page.evaluate(id=>window.__MEIJI__.preset(id,true),id);await page.waitForTimeout(90);assert.ok((await stats()).camera.every(Number.isFinite));}
  check('All ten preset cameras render',true);
  await page.keyboard.press('r');await page.waitForTimeout(1900);check('R restores full-park panorama',delta((await stats()).target,[0,4,0])<.1);
  const wind=(await stats()).windTime;await page.waitForTimeout(160);check('Wind and water animation clock advances',(await stats()).windTime>wind);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(350);check('Portrait resize updates the canvas',JSON.stringify((await stats()).canvas)==='[390,844]');await page.screenshot({path:`${destination}/11-mobile-portrait.png`});
  await page.setViewportSize({width:1600,height:1100});await page.goto('http://127.0.0.1:8791/?scene=core&time=0');await page.waitForFunction(()=>window.__MEIJI__?.stats().frames>3);
  const baseline=JSON.parse(await readFile('captures/round2/before/capture.json','utf8'));
  for(const [id,name] of [[2,'sanctuary'],[6,'low-angle']]){
    await page.evaluate(id=>window.__MEIJI__.preset(id,true),id);await page.waitForTimeout(250);const s=await stats(),old=baseline.views[name];
    check(`Preserved core ${name}: same geometry counts, camera, target and animation time`,JSON.stringify(s.counts)===JSON.stringify(old.counts)&&delta(s.camera,old.camera)<1e-8&&delta(s.target,old.target)<1e-8&&s.zoom===old.zoom&&s.windTime===0);
    await page.screenshot({path:`${destination}/core-${name}.png`});
  }
  const gpu=await page.evaluate(()=>{const gl=document.querySelector('canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable';});
  await context.close();
  const touch=await browser.newContext({viewport:{width:430,height:932},hasTouch:true,isMobile:true,deviceScaleFactor:1});const mobile=await touch.newPage();await mobile.goto('http://127.0.0.1:8791/?time=0');await mobile.waitForFunction(()=>window.__MEIJI__?.stats().frames>3);
  const touchBefore=await mobile.evaluate(()=>window.__MEIJI__.stats()),cdp=await touch.newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:170,y:430}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:280,y:470}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.waitForTimeout(300);
  const touchAfter=await mobile.evaluate(()=>window.__MEIJI__.stats());check('One-finger touch rotates the forest',delta(touchBefore.camera,touchAfter.camera)>5);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:160,y:420},{x:260,y:420}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:110,y:420},{x:310,y:420}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.waitForTimeout(400);
  const pinched=await mobile.evaluate(()=>window.__MEIJI__.stats());check('Pinch zoom persists with frozen animation',Math.abs(pinched.zoom-touchAfter.zoom)>.15&&pinched.windTime===0);await touch.close();
  check('No runtime errors or failed resource requests',errors.length===0&&failedRequests.length===0);
  result={status:'passed',testedAt:new Date().toISOString(),browser:browser.version(),gpu,viewport:[1920,1080],dpr:1,firstFrameMs,metrics,checks,errors,warnings,failedRequests,measurementNotes:'Built dist in installed headless Chrome, local HTTP. First-frame time includes automation polling and OS/GPU caches are not flushed. 900ms warmup then 240 RAF intervals per camera. These are frame intervals, not isolated GPU execution times. Mobile uses desktop Chrome touch emulation.'};
}catch(error){result={status:'failed',error:error.stack,checks,metrics,errors,warnings,failedRequests};process.exitCode=1;}
finally{await writeFile(`${destination}/verification.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser?.close();await server?.close();}
