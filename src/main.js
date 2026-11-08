import './style.css';
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { createRenderer } from './core/renderer.js';
import { createCamera } from './core/camera.js';
import { createEnvironment } from './core/environment.js';
import { makeMaterials } from './core/materials.js';
import { refineSunnyMaterials } from './core/sunny-materials.js';
import { disposeScene } from './core/dispose.js';

const started=performance.now(),params=new URLSearchParams(location.search);
const mode=params.get('scene')==='core'?'core':'precinct';
const fixedTime=params.has('time')?Math.max(0,Number(params.get('time'))||0):null;
const canvas=document.querySelector('#world'),renderer=createRenderer(canvas),scene=new THREE.Scene();
const materials=makeMaterials(),windTime={value:0};
// Full precinct and the retained v1 core sample load independently.
const module=await (mode==='core'?import('./scene/core-sample.js'):import('./scene/precinct.js'));
const world=mode==='core'?module.createCoreSample(scene,materials,windTime):module.createPrecinct(scene,materials,windTime);
refineSunnyMaterials(materials);
const view=createCamera(canvas,{views:world.views,bounds:world.bounds,distance:world.cameraDistance});
if(params.has('view'))view.preset(params.get('view'),true);
const environment=createEnvironment(scene,{bounds:world.bounds,mode,renderer});
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let elapsed=0,last=performance.now(),frames=0,disposed=false;
function resize(){renderer.setSize(innerWidth,innerHeight,false);view.resize();}
window.addEventListener('resize',resize);resize();
function frame(now){
  if(disposed)return;const dt=Math.min(Math.max(0,(now-last)/1000),.05);last=now;
  if(document.hidden)return;
  elapsed+=dt;view.update(dt);
  const animationTime=fixedTime??(reduceMotion?0:elapsed);
  if(CONFIG.wind)windTime.value=animationTime;
  materials.water.roughness=.26+Math.sin(animationTime*.45)*.025;
  world.update(dt,view.camera);environment.update(view.camera,view.controls.target);
  renderer.render(scene,view.camera);frames++;
}
const geometryInventory=()=>{
  const items=[];scene.traverse(o=>{if(o.isMesh&&!o.name.includes('shadow')&&!o.name.includes('map-label'))items.push({name:o.name,vertices:o.geometry.attributes.position.count,instances:o.isInstancedMesh?o.count:1,matrix:o.matrixWorld.toArray()});});return items;
};
window.__MEIJI__={ready:true,preset:(id,instant=false)=>view.preset(id,instant),layout:()=>world.layout??null,inventory:geometryInventory,
  stats:()=>({mode,frames,counts:world.counts,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,
    camera:view.camera.position.toArray(),target:view.controls.target.toArray(),zoom:view.camera.zoom,projection:view.camera.projectionMatrix.toArray(),windTime:windTime.value,
    bounds:{min:world.bounds.min.toArray(),max:world.bounds.max.toArray()},lod:world.diagnostics?.(),sun:environment.metadata,buildMs:Math.round(constructed-started),canvas:[canvas.width,canvas.height],webgl:renderer.getContext().getParameter(renderer.getContext().VERSION)}),
};
const constructed=performance.now();renderer.setAnimationLoop(frame);
function dispose(){if(disposed)return;disposed=true;renderer.setAnimationLoop(null);window.removeEventListener('resize',resize);view.dispose();world.dispose();environment.dispose();disposeScene(scene);renderer.dispose();delete window.__MEIJI__;}
if(import.meta.hot)import.meta.hot.dispose(dispose);
window.addEventListener('pagehide',e=>{if(!e.persisted)dispose();},{once:true});
