import * as THREE from 'three';
import { Builder, surfaceGeometry } from '../core/geometry.js';
import { randomGenerator } from '../core/random.js';
import { distanceToPath, isClearing, isPond } from './terrain.js';
import { CONFIG } from '../config.js';

function installWind(material,time) {
  material.onBeforeCompile=shader=>{
    shader.uniforms.uWindTime=time;
    shader.vertexShader='uniform float uWindTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 origin = instanceMatrix[3].xyz;
        float phase = origin.x * 0.49 + origin.z * 0.37;
        float amp = smoothstep(0.0, 12.0, origin.y) * 0.07 + 0.015;
        transformed.x += sin(uWindTime * 0.65 + phase) * amp;
        transformed.z += cos(uWindTime * 0.47 + phase * 1.31) * amp * 0.7;
      #endif`);
  };
  material.customProgramCacheKey=()=> 'meiji-wind-v1';
}
function instance(parent,geometry,material,items,name,time) {
  const mesh=new THREE.InstancedMesh(geometry,material,items.length),obj=new THREE.Object3D();
  for(let i=0;i<items.length;i++) {
    const a=items[i];obj.position.set(...a.p);obj.rotation.set(...(a.r||[0,0,0]));obj.scale.set(...a.s);obj.updateMatrix();
    mesh.setMatrixAt(i,obj.matrix);mesh.setColorAt(i,a.c);
  }
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;
  if(time) { const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});installWind(depth,time);mesh.customDepthMaterial=depth; }
  mesh.computeBoundingSphere();parent.add(mesh);return mesh;
}

export function createForest(scene,m,time) {
  const r=randomGenerator(CONFIG.seed),b=new Builder(),crowns=[],leaves=[],conifers=[],bushes=[],ferns=[];
  const colors=['#385f40','#4a7046','#63834c','#52764a','#72884d','#3e6952','#70854b'].map(c=>new THREE.Color(c));
  const positions=[];
  const crownGeo=new THREE.IcosahedronGeometry(1,1);
  // An irregular shared leaf mass, with a fine leaf silhouette layered over it.
  const attr=crownGeo.attributes.position;
  for(let i=0;i<attr.count;i++) {
    const x=attr.getX(i),y=attr.getY(i),z=attr.getZ(i);
    const s=1+0.13*Math.sin(x*11+y*7)*Math.cos(z*9-x*3);
    attr.setXYZ(i,x*s,y*s,z*s);
  }
  crownGeo.computeVertexNormals();
  function tree(x,z,h,width,type=0) {
    const base=colors[Math.floor(r()*colors.length)],phase=r()*6,lean=(r()-0.5)*0.6;
    const trunkH=type===2?h*0.9:h*0.71;
    b.beam([x,0.02,z],[x+lean,trunkH,z+lean*0.4],0.18+h*0.016,m.bark,0.09);
    for(let k=0;k<5;k++) {
      const a=phase+k*Math.PI*2/5;
      b.beam([x,0.3,z],[x+Math.cos(a)*0.95,0.07,z+Math.sin(a)*0.95],0.16,m.bark,0.035);
    }
    if(type===2) {
      for(let k=0;k<8;k++) {
        const t=k/8,s=width*(1-t)*0.72+0.2;
        const cy=h*0.36+t*h*0.6;
        conifers.push({p:[x+lean*t,cy,z],s:[s*0.55,h*0.23,s*0.55],r:[0,phase+k,0],c:base.clone().multiplyScalar(0.78+t*0.2)});
        for(let j=0;j<7;j++) {
          const a=j*Math.PI*2/7+k*0.7,dx=Math.cos(a)*s*0.6,dz=Math.sin(a)*s*0.6;
          crowns.push({p:[x+dx,cy-0.2,z+dz],s:[s*0.49,0.28+h*0.016,s*0.39],r:[0,a,0.12],c:base.clone().multiplyScalar(0.8+r()*0.23)});
          if(k%3===0)b.beam([x,cy,z],[x+dx,cy-0.25,z+dz],0.045,m.bark,0.015);
        }
      }
      return;
    }
    const lobes=type===1?22:17;
    for(let k=0;k<lobes;k++) {
      const a=k*2.399+phase,t=Math.sqrt((k+0.5)/lobes),dx=Math.cos(a)*width*t*0.77,dz=Math.sin(a)*width*t*0.77;
      const cy=h-2.8*Math.pow(t,1.2)+(r()-0.5)*1.5,sy=type===1?1.0:1.4;
      const radius=width*(0.34+r()*0.16);
      const col=base.clone().multiplyScalar(0.86+r()*0.3);
      crowns.push({p:[x+dx,cy,z+dz],s:[radius,radius*sy*0.7,radius*(0.8+r()*0.35)],r:[r()*0.4,a,r()*0.4],c:col});
      if(k%4===0)b.beam([x+lean,trunkH*0.65,z],[x+dx,cy-0.4,z+dz],0.12,m.bark,0.035);
      // Leaf-sized protrusions break up geometric lobes without alpha cards.
      for(let j=0;j<10;j++) {
        const aa=r()*Math.PI*2,el=r()*1.7-0.3,rr=radius*(0.85+r()*0.22);
        leaves.push({p:[x+dx+Math.cos(aa)*Math.cos(el)*rr,cy+Math.sin(el)*rr*0.7,z+dz+Math.sin(aa)*Math.cos(el)*rr],
          s:[0.27+r()*0.23,0.13+r()*0.12,0.35+r()*0.23],r:[r(),aa,r()],c:col.clone().multiplyScalar(0.95+r()*0.12)});
      }
    }
  }
  for(let attempt=0;positions.length<CONFIG.treeCount&&attempt<16000;attempt++) {
    const x=(r()-0.5)*70.2,z=(r()-0.5)*70.2;
    if(isClearing(x,z,2)||distanceToPath(x,z)<(z>21?10.5:7.3)||isPond(x,z,2))continue;
    if(positions.some(p=>Math.hypot(x-p[0],z-p[1])<2.25))continue;
    positions.push([x,z]);
    // Foreground canopy is lower; north edge forms a mature forest skyline.
    const foreground=z>26, h=(foreground?5.7:7.8)+r()*(foreground?3.5:5.5),width=2.1+r()*1.4;
    const type=r()<0.1?2:(r()<0.5?1:0);tree(x,z,h,width,type);
  }
  // Northern evergreen fringe closes the forest behind the inner sanctuary.
  const rearTrees=[];
  for(let attempt=0;attempt<2000&&rearTrees.length<29;attempt++) {
    const x=(r()-0.5)*38,z=-28-r()*9.2;
    if(Math.abs(x)<10&&z>-36)continue;
    if(rearTrees.some(p=>Math.hypot(x-p[0],z-p[1])<2.1))continue;
    rearTrees.push([x,z]);tree(x,z,7.4+r()*3.7,1.65+r()*0.3,r()<0.12?2:1);
  }
  // Courtyard camphors, carefully scaled to keep the main facade visible.
  tree(-10,-7.7,8.2,2.8,1);tree(-13,-7,7.8,2.4,0);tree(11,-6.8,8,2.8,1);
  b.tube([[-13,2.3,-7],[-11.5,1.8,-7.4],[-10,2.3,-7.7]],0.055,m.rope,20);
  for(let i=0;i<5;i++) {
    const x=-12.7+i*0.55;
    b.box(x,1.85,-7.4,0.13,0.4,0.025,m.white,[0,0,0.2]);
  }
  for(let i=0;i<1500;i++) {
    const x=(r()-0.5)*77,z=(r()-0.5)*77;
    if(isClearing(x,z,0.7)||distanceToPath(x,z)<4.5||isPond(x,z,0.8))continue;
    const s=0.3+r()*0.75;
    bushes.push({p:[x,0.2+s*0.35,z],s:[s,s*0.58,s*0.8],r:[0,r()*6,0],c:colors[Math.floor(r()*colors.length)].clone().multiplyScalar(1.04)});
    if(i%3===0)ferns.push({p:[x,0.02,z],s:[0.5+r()*0.5,0.6+r()*0.6,0.5+r()*0.5],r:[0,r()*6,0],c:new THREE.Color('#6a8044')});
    if(i%8===0)b.add(new THREE.DodecahedronGeometry(0.3+r()*0.4),i%16?m.moss:m.darkStone,[x,0.15,z],[r(),r(),r()],[1,0.5,0.8]);
  }
  // Iris leaves occupy a modest garden-side patch by the pond.
  for(let i=0;i<110;i++) {
    const x=-18.2+r()*2,z=14+r()*9;
    ferns.push({p:[x,0,z],s:[0.45,0.85,0.45],r:[0,r()*6,0],c:new THREE.Color('#526c43')});
  }
  const vertices=[],indices=[];
  for(let i=0;i<9;i++) {
    const a=i*2.4,k=vertices.length/3;
    vertices.push(0,0,0,Math.cos(a+0.22)*0.44,0.43,Math.sin(a+0.22)*0.44,Math.cos(a)*0.85,0.65+0.2*Math.sin(i),Math.sin(a)*0.85,Math.cos(a-0.22)*0.44,0.43,Math.sin(a-0.22)*0.44);
    indices.push(k,k+1,k+2,k,k+2,k+3,k+2,k+1,k,k+3,k+2,k);
  }
  const fernGeo=surfaceGeometry(vertices,indices);
  installWind(m.foliage,time);installWind(m.understory,time);
  instance(scene,crownGeo,m.foliage,crowns,'broadleaf-canopy',time);
  instance(scene,new THREE.IcosahedronGeometry(1,0),m.foliage,leaves,'leaf-silhouettes',time);
  instance(scene,new THREE.ConeGeometry(1,1,9,1),m.foliage,conifers,'evergreen-conifers',time);
  instance(scene,crownGeo.clone(),m.understory,bushes,'understory-shrubs',time);
  instance(scene,fernGeo,m.understory,ferns,'ferns-and-irises',time);
  b.finish(scene,'forest-wood-and-stones');
  return {trees:positions.length+rearTrees.length+3,canopyLobes:crowns.length,leafClusters:leaves.length,shrubs:bushes.length};
}
