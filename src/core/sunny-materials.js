import * as THREE from 'three';
import { randomGenerator } from './random.js';

function gravelHeight(){
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d'),r=randomGenerator(661);
  ctx.fillStyle='#878787';ctx.fillRect(0,0,512,512);
  for(let i=0;i<18000;i++) {
    const x=r()*512,y=r()*512,s=.6+r()*2.3,v=Math.floor(105+r()*120);
    ctx.fillStyle=`rgb(${v},${v},${v})`;ctx.beginPath();ctx.ellipse(x,y,s,s*.7,r()*6,0,Math.PI*2);ctx.fill();
  }
  const map=new THREE.CanvasTexture(c);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(3,3);map.anisotropy=8;return map;
}
export function refineSunnyMaterials(m) {
  m.gravel.color.set('#e8e0c9');m.gravel.bumpMap=gravelHeight();m.gravel.bumpScale=.035;m.gravel.roughness=.96;
  m.earth.bumpMap=m.earth.map.clone();m.earth.bumpMap.colorSpace=THREE.NoColorSpace;m.earth.bumpScale=.045;
  m.bark.bumpMap=m.bark.map.clone();m.bark.bumpMap.colorSpace=THREE.NoColorSpace;m.bark.bumpScale=.018;
  m.wood.roughness=.86;m.lightWood.roughness=.87;m.darkWood.roughness=.91;
  m.roof.roughness=.8;m.roof.metalness=.09;
  const data=m.foliage.gradientMap.image.data;data.set([90,145,193,230,255]);m.foliage.gradientMap.needsUpdate=true;
  // Compose with the existing wind shader; all source geometry remains unchanged.
  const previous=m.foliage.onBeforeCompile,key=m.foliage.customProgramCacheKey();
  m.foliage.onBeforeCompile=shader=>{
    previous(shader);
    shader.vertexShader='varying float vCrownShade;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCrownShade = smoothstep(-0.7, 0.85, position.y);');
    shader.fragmentShader='varying float vCrownShade;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb *= mix(vec3(0.88, 0.92, 0.94), vec3(1.03, 1.025, 0.97), vCrownShade);');
  };
  m.foliage.customProgramCacheKey=()=>`${key}:crown-self-shade-v2`;
  for(const material of Object.values(m))if(material.isMaterial)material.needsUpdate=true;
}
