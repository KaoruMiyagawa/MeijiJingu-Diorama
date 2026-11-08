import * as THREE from 'three';
import { randomGenerator } from '../core/random.js';
import { surfaceGeometry } from '../core/geometry.js';
import { heightAt } from './heightfield.js';

// Same solid, faceted leaf masses as v1. Shared geometry, spatial instance batches.
function wind(material,time){
  material.onBeforeCompile=shader=>{
    shader.uniforms.uWindTime=time;
    shader.vertexShader='uniform float uWindTime;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
      vec3 o=instanceMatrix[3].xyz;
      float phase=o.x*.32+o.z*.27;
      float strength=smoothstep(0.,10.,o.y)*.075+.012;
      transformed.x+=sin(uWindTime*.65+phase)*strength;
      transformed.z+=cos(uWindTime*.47+phase*1.31)*strength*.7;
      #endif`);
  };material.customProgramCacheKey=()=> 'meiji-park-wind-1';
}
function makeInstances(parent,geometry,material,items,name,depth){
  if(!items.length)return null;
  const mesh=new THREE.InstancedMesh(geometry,material,items.length),obj=new THREE.Object3D();
  items.forEach((a,i)=>{obj.position.set(...a.p);obj.scale.set(...a.s);obj.rotation.set(...(a.r??[0,0,0]));if(a.q)obj.quaternion.copy(a.q);obj.updateMatrix();mesh.setMatrixAt(i,obj.matrix);if(a.c)mesh.setColorAt(i,a.c);});
  mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;if(depth)mesh.customDepthMaterial=depth;
  mesh.computeBoundingBox();mesh.computeBoundingSphere();parent.add(mesh);return mesh;
}
export function createWoodland(parent,m,time,spatial){
  const random=randomGenerator(20261105),chunks=new Map(),treePositions=[],occupied=new Map(),up=new THREE.Vector3(0,1,0);
  const greens=['#507541','#638547','#426e46','#739250','#366a4d','#5b8047','#7b9354'].map(c=>new THREE.Color(c));
  const crownGeometry=new THREE.IcosahedronGeometry(1,1),a=crownGeometry.attributes.position;
  for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),s=1+.13*Math.sin(x*11+y*7)*Math.cos(z*9-x*3);a.setXYZ(i,x*s,y*s,z*s);}crownGeometry.computeVertexNormals();
  const lowGeometry=new THREE.IcosahedronGeometry(1,0),leafGeometry=new THREE.IcosahedronGeometry(1,0),trunkGeometry=new THREE.CylinderGeometry(.64,1,1,7),stoneGeometry=new THREE.DodecahedronGeometry(1,0);
  const vertices=[],indices=[];
  for(let i=0;i<7;i++){const angle=i*2.4,k=vertices.length/3;vertices.push(0,0,0,Math.cos(angle+.2)*.3,.35,Math.sin(angle+.2)*.3,Math.cos(angle)*.68,.6,Math.sin(angle)*.68,Math.cos(angle-.2)*.3,.35,Math.sin(angle-.2)*.3);indices.push(k,k+1,k+2,k,k+2,k+3);}
  const fernGeometry=surfaceGeometry(vertices,indices),understory=m.understory;understory.side=THREE.DoubleSide;
  const chunkFor=(x,z)=>{const key=`${Math.floor((x+100)/48)},${Math.floor((z+140)/48)}`;if(!chunks.has(key))chunks.set(key,{key,crowns:[],leaves:[],wood:[],shrubs:[],ferns:[],stones:[]});return chunks.get(key);};
  function beam(chunk,from,to,radius){const v=new THREE.Vector3(...to).sub(new THREE.Vector3(...from));chunk.wood.push({p:from.map((n,i)=>(n+to[i])/2),s:[radius,v.length(),radius],q:new THREE.Quaternion().setFromUnitVectors(up,v.normalize()),c:new THREE.Color('#b7a381').multiplyScalar(.8+random()*.3)});}
  function tree(x,z,h,width,type=0,hero=false){
    const chunk=chunkFor(x,z),y=heightAt(x,z),phase=random()*Math.PI*2;
    const forestTone=Math.floor((Math.sin(x*.047)+Math.cos(z*.031)+2)*1.6)%greens.length;
    const base=greens[random()<.72?forestTone:Math.floor(random()*greens.length)].clone();
    const lean=(random()-.5)*.65,trunk=h*.64;
    beam(chunk,[x,y,z],[x+lean,y+trunk,z],.15+h*.017);
    for(let k=0;k<4;k++){const aa=k*Math.PI/2+phase;beam(chunk,[x,y+.55,z],[x+Math.cos(aa)*.85,y+.08,z+Math.sin(aa)*.85],.14);}
    const lobes=type===2?13:(hero?20:14);
    for(let k=0;k<lobes;k++){
      const t=Math.sqrt((k+.5)/lobes),angle=k*2.399+phase;
      let dx=Math.cos(angle)*width*t*.77,dz=Math.sin(angle)*width*t*.77,cy=y+h-2.4*t**1.2+(random()-.5)*1.1,radius=width*(.33+random()*.15),sy=.78;
      if(type===2){const v=k/lobes;dx=Math.cos(angle)*width*(1-v)*.35;dz=Math.sin(angle)*width*(1-v)*.35;cy=y+h*(.3+v*.67);radius=width*(1-v)*.82+.18;sy=.72;}
      const color=base.clone().multiplyScalar(.86+random()*.22);
      chunk.crowns.push({p:[x+dx,cy,z+dz],s:[radius,radius*sy,radius*(.82+random()*.3)],r:[random()*.3,angle,random()*.3],c:color});
      if(k%4===0)beam(chunk,[x+lean,y+trunk*.8,z],[x+dx,cy-.4,z+dz],.1);
      for(let j=0;j<(hero?10:6);j++){
        const aa=random()*6.283,el=random()*1.9-.4,rr=radius*(.86+random()*.2);
        chunk.leaves.push({p:[x+dx+Math.cos(aa)*Math.cos(el)*rr,cy+Math.sin(el)*rr*.72,z+dz+Math.sin(aa)*Math.cos(el)*rr],s:[.24+random()*.22,.15+random()*.12,.3+random()*.24],r:[random(),aa,random()],c:color.clone().multiplyScalar(1.04)});
      }
    }treePositions.push({x,z,height:h,width,zone:hero?'courtyard':spatial.zone(x,z)});
  }
  // Poisson-like spacing is enforced in a local grid; no O(n²) tree-pair scan.
  for(let attempt=0;attempt<44000;attempt++){
    const x=-91+random()*182,z=-132+random()*262,zone=spatial.zone(x,z);
    if(!spatial.plantable(x,z,2.7))continue;
    if(zone==='garden'&&random()>.12||zone==='lawn'&&random()>.012)continue;
    // Museum forecourt remains an open view across the north pond.
    if(x>-50&&x<-10&&z>-104&&z<-91)continue;
    if(zone==='garden'&&((x+21)**2/75+(z-51)**2/125)<1)continue;
    const gridSize=4.4,ix=Math.floor(x/gridSize),iz=Math.floor(z/gridSize),spacing=zone==='forest'?3.6:8.2;
    let close=false;for(let dx=-2;dx<=2&&!close;dx++)for(let dz=-2;dz<=2&&!close;dz++)for(const p of occupied.get(`${ix+dx},${iz+dz}`)??[])if(Math.hypot(x-p[0],z-p[1])<spacing){close=true;break;}
    if(close)continue;
    const nearRoad=spatial.pathDistance(x,z)<7;
    const width=zone==='forest'?2.7+random()*1.4:2+random()*.9;
    const h=zone==='forest'?7.7+random()*5.5+1.8*Math.sin(z*.021)**2:4.5+random()*3.4;
    tree(x,z,nearRoad?h*.92:h,width,random()<(zone==='forest'?.12:.03)?2:0);
    const key=`${ix},${iz}`;if(!occupied.has(key))occupied.set(key,[]);occupied.get(key).push([x,z]);
  }
  // The original camphor composition, translated with the retained sanctuary.
  tree(-28,-15.7,8.2,2.8,0,true);tree(-31,-15,7.8,2.4,0,true);tree(-7,-14.8,8,2.8,0,true);
  for(let i=0;i<14500;i++){
    const x=-91+random()*182,z=-132+random()*262;if(!spatial.plantable(x,z,.65))continue;
    const zone=spatial.zone(x,z),nearPath=spatial.pathDistance(x,z)<4;
    if(zone==='lawn'&&random()>.018||zone==='garden'&&random()>.12)continue;
    const chunk=chunkFor(x,z),y=heightAt(x,z),s=.35+random()*.85,c=new THREE.Color('#52774a').multiplyScalar(.88+random()*.25);
    chunk.shrubs.push({p:[x,y+s*.3,z],s:[s,s*.55,s*.8],r:[0,random()*6,0],c:c.multiplyScalar(1.04)});
    if(i%2===0||nearPath)chunk.ferns.push({p:[x+.3,y+.04,z],s:[.7,.5+random()*.6,.7],r:[0,random()*6,0],c:new THREE.Color('#6b8847')});
    if(i%7===0)chunk.stones.push({p:[x,y+.18,z],s:[.35+random()*.4,.22+random()*.25,.3+random()*.3],r:[random(),random()*6,random()],c:new THREE.Color('#8d9276')});
  }
  wind(m.foliage,time);wind(understory,time);
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});wind(depth,time);
  let canopyCount=0,leafCount=0,shrubCount=0;
  for(const chunk of chunks.values()){
    const group=new THREE.Group();group.name=`woodland-chunk:${chunk.key}`;parent.add(group);chunk.group=group;
    chunk.canopy=makeInstances(group,crownGeometry,m.foliage,chunk.crowns,'living-canopy',depth);
    chunk.detail=makeInstances(group,leafGeometry,m.foliage,chunk.leaves,'leaf-silhouette-detail',depth);
    makeInstances(group,trunkGeometry,m.bark,chunk.wood,'roots-trunks-branches');
    chunk.bushMesh=makeInstances(group,crownGeometry,understory,chunk.shrubs,'layered-understory',depth);
    chunk.fernMesh=makeInstances(group,fernGeometry,understory,chunk.ferns,'forest-ferns',depth);
    makeInstances(group,stoneGeometry,m.stone,chunk.stones,'mossy-ground-stones');
    chunk.box=new THREE.Box3().setFromObject(group);chunk.detailed=false;if(chunk.detail)chunk.detail.visible=false;
    canopyCount+=chunk.crowns.length;leafCount+=chunk.leaves.length;shrubCount+=chunk.shrubs.length;
    // Instance arrays have been uploaded; retain only compact tree inventory and bounds.
    for(const key of ['crowns','leaves','wood','shrubs','ferns','stones'])delete chunk[key];
  }
  const frustum=new THREE.Frustum(),matrix=new THREE.Matrix4();let frame=0,visibleChunks=0,detailedChunks=0;
  return {counts:{trees:treePositions.length,canopyLobes:canopyCount,leafClusters:leafCount,shrubs:shrubCount,chunks:chunks.size},treePositions,
    diagnostics:()=>({visibleChunks,detailedChunks}),
    update(camera){if(frame++%5)return;camera.updateMatrixWorld();matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);
      const span=(camera.top-camera.bottom)/camera.zoom;visibleChunks=0;detailedChunks=0;
      for(const chunk of chunks.values()){
        const visible=frustum.intersectsBox(chunk.box);if(visible)visibleChunks++;
        chunk.detailed=span<(chunk.detailed?145:125)&&visible;
        if(chunk.detail)chunk.detail.visible=chunk.detailed;
        if(chunk.fernMesh)chunk.fernMesh.visible=span<210&&visible;
        if(chunk.detailed)detailedChunks++;
        // Keep main crowns casting shadows outside the camera frustum.
        if(chunk.canopy)chunk.canopy.geometry=span>390?lowGeometry:crownGeometry;
      }
    },dispose(){lowGeometry.dispose();crownGeometry.dispose();}};
}
