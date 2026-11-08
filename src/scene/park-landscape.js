import * as THREE from 'three';
import { Builder, surfaceGeometry } from '../core/geometry.js';
import { randomGenerator } from '../core/random.js';
import { PRECINCT, PONDS, PATH_EDGES, PATH_NODES } from '../data/precinct-layout.js';
import { pointInPolygon } from '../core/spatial.js';
import { heightAt } from './heightfield.js';
import { polygonSurface } from './patches.js';
import { pathCurve } from './paths.js';

function outline(points,expand=1){const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x*expand,0,z*expand)),true,'centripetal');return curve.getSpacedPoints(160).slice(0,-1).map(p=>[p.x,p.z]);}
function extrudedOutline(points,depth,y,bevel){const shape=new THREE.Shape(points.map(([x,z])=>new THREE.Vector2(x,-z)));const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,curveSegments:1});g.rotateX(-Math.PI/2);g.translate(0,y,0);return g;}
function ribbon(curve,width,yOffset){const length=curve.getLength(),steps=Math.ceil(length*2),vertices=[],indices=[];
  for(let i=0;i<=steps;i++){const p=curve.getPointAt(i/steps),t=curve.getTangentAt(i/steps);for(const sign of [-1,1]){const x=p.x+sign*t.z*width/2,z=p.z-sign*t.x*width/2;vertices.push(x,heightAt(x,z)+yOffset,z);}if(i<steps){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}}
  return surfaceGeometry(vertices,indices);
}
export function createParkLandscape(parent,m,time,spatial){
  const b=new Builder(),r=randomGenerator(20261106),boundary=outline(PRECINCT.boundary,1.025);
  b.add(extrudedOutline(boundary,3.6,-4.5,.5),m.base);
  b.add(extrudedOutline(boundary,.75,-.9,.13),m.soil);
  for(const y of [-3.7,-1.25]){const edge=boundary.map(([x,z])=>[x,y,z]);edge.push(edge[0]);b.tube(edge,.045,y===-3.7?m.gold:m.darkWood,260);}
  const skirtVertices=[],skirtIndices=[];
  boundary.forEach(([x,z],i)=>{const [xx,zz]=boundary[(i+1)%boundary.length],k=skirtVertices.length/3;skirtVertices.push(x,-.2,z,xx,-.2,zz,x,heightAt(x,z),z,xx,heightAt(xx,zz),zz);skirtIndices.push(k,k+2,k+1,k+1,k+2,k+3);});
  const soil=m.soil.clone();soil.side=THREE.DoubleSide;b.add(surfaceGeometry(skirtVertices,skirtIndices),soil);
  const ground=m.earth.clone();ground.color.set('#ffffff');ground.vertexColors=true;
  const groundCanvas=document.createElement('canvas');groundCanvas.width=groundCanvas.height=256;const ctx=groundCanvas.getContext('2d');
  ctx.fillStyle='#b4b6aa';ctx.fillRect(0,0,256,256);
  for(let i=0;i<12000;i++){const v=140+Math.floor(r()*75);ctx.fillStyle=`rgba(${v},${v},${v},.3)`;ctx.fillRect(r()*256,r()*256,.3+r()*1.4,.3+r()*1.4);}
  const groundMap=new THREE.CanvasTexture(groundCanvas);groundMap.colorSpace=THREE.SRGBColorSpace;groundMap.wrapS=groundMap.wrapT=THREE.RepeatWrapping;groundMap.repeat.set(2,2);groundMap.anisotropy=8;ground.map=groundMap;ground.bumpMap=groundMap;ground.bumpScale=.025;
  const terrain=polygonSurface(boundary,heightAt,4),position=terrain.attributes.position,colors=[];
  for(let i=0;i<position.count;i++){
    const x=position.getX(i),z=position.getZ(i),zone=spatial.zone(x,z),noise=.94+.055*Math.sin(x*.23)*Math.cos(z*.18)+.03*Math.sin(x*1.15+z*.7);
    const col=new THREE.Color(zone==='garden'?'#a8b783':zone==='lawn'?'#b4c58b':'#819362').multiplyScalar(noise);colors.push(col.r,col.g,col.b);
  }terrain.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));b.add(terrain,ground);
  const pathEdge=m.earth.clone();pathEdge.color.set('#d1c299');const gravel=m.gravel.clone();gravel.color.set('#f0e5cb');
  const trail=m.gravel.clone();trail.color.set('#d4c498');
  for(const path of PATH_EDGES){const curve=pathCurve(path);b.add(ribbon(curve,path.width+.85,.055),pathEdge);b.add(ribbon(curve,path.width,.105),path.type==='garden'?trail:gravel);}
  for(const [id,[x,z]] of Object.entries(PATH_NODES)){
    const connected=PATH_EDGES.filter(e=>e.from===id||e.to===id),radius=Math.max(...connected.map(e=>e.width))/2;
    const circle=new THREE.CircleGeometry(radius,24);circle.rotateX(-Math.PI/2);const p=circle.attributes.position;
    for(let i=0;i<p.count;i++)p.setY(i,heightAt(x+p.getX(i),z+p.getZ(i))+.107);
    b.add(circle,connected.every(e=>e.type==='garden')?trail:gravel,[x,0,z]);
  }
  b.finish(parent,'sculpted-precinct-and-gravel-approaches');
  const detail=new Builder();
  // Low timber rail follows the approach; discontinuous sections leave junctions open.
  for(const edge of PATH_EDGES.filter(e=>['south-entry','south-main','north-main','west-main'].includes(e.id))){
    const curve=pathCurve(edge),length=curve.getLength(),steps=Math.floor(length/2.8);
    for(const side of [-1,1]){let previous=null;for(let i=1;i<steps-1;i++){
      const p=curve.getPointAt(i/steps),t=curve.getTangentAt(i/steps),x=p.x+side*t.z*(edge.width/2+.65),z=p.z-side*t.x*(edge.width/2+.65),y=heightAt(x,z);
      if(spatial.buildingDistance(x,z)<.6){previous=null;continue;}
      detail.cylinder(x,y+.48,z,.07,.09,.96,m.darkWood,undefined,6);
      if(previous)for(const h of [.36,.76])detail.beam([previous.x,previous.y+h,previous.z],[x,y+h,z],.045,m.lightWood);
      previous={x,y,z};
    }}
  }
  // Actual stones and moss clumps soften the ribbons, rather than flat colored borders.
  for(let i=0;i<spatial.samples.length;i+=2){const p=spatial.samples[i];if(r()>.55)continue;const side=r()>.5?1:-1,x=p.x+side*p.tz*(p.width/2+.3+r()*.5),z=p.z-side*p.tx*(p.width/2+.3+r()*.5);
    if(spatial.zone(x,z)==='outside'||spatial.buildingDistance(x,z)<.2)continue;
    const s=.08+r()*.16;detail.add(new THREE.DodecahedronGeometry(1),i%3?m.stone:m.moss,[x,heightAt(x,z)+s*.2,z],[r(),r()*6,r()],[s*1.4,s*.55,s]);
  }
  const waterMaterials=[];
  for(const pond of PONDS){
    const water=new THREE.MeshPhysicalMaterial({color:'#3b7772',roughness:.31,metalness:.28,clearcoat:.12,clearcoatRoughness:.3,envMapIntensity:.55});water.name=`living-water:${pond.id}`;
    water.onBeforeCompile=shader=>{
      shader.uniforms.uWaterTime=time;shader.vertexShader='varying vec3 vPondPosition;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPondPosition=position;');
      shader.fragmentShader='varying vec3 vPondPosition; uniform float uWaterTime;\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal=normalize(normal+vec3(sin(vPondPosition.x*2.6+vPondPosition.z*.7+uWaterTime*.7)*.035,0.,cos(vPondPosition.z*2.2+uWaterTime*.5)*.035));');
    };water.customProgramCacheKey=()=> 'gentle-pond-ripples-1';waterMaterials.push(water);
    const mesh=new THREE.Mesh(polygonSurface(pond.polygon,()=>pond.level+.045,3),water);mesh.name=pond.id;mesh.receiveShadow=true;parent.add(mesh);
    const shore=new THREE.CatmullRomCurve3(pond.polygon.map(([x,z])=>new THREE.Vector3(x,0,z)),true,'centripetal');
    const steps=Math.ceil(shore.getLength()*1.7);
    for(let i=0;i<steps;i++){
      const p=shore.getPointAt(i/steps),s=.35+r()*.6;
      detail.add(new THREE.DodecahedronGeometry(1),i%4?m.darkStone:m.moss,[p.x+(r()-.5)*.5,pond.level-.01+s*.27,p.z+(r()-.5)*.5],[r(),r()*6,r()],[s,s*.5,s*.75]);
      if(i%3===0)for(let n=0;n<4;n++){const x=p.x+(r()-.5)*1.5,z=p.z+(r()-.5)*1.5;if(pointInPolygon(x,z,pond.polygon))continue;detail.beam([x,heightAt(x,z),z],[x+.15,heightAt(x,z)+.6+r()*.5,z-.15],.025,m.moss,.012);}
    }
    const minX=Math.min(...pond.polygon.map(p=>p[0])),maxX=Math.max(...pond.polygon.map(p=>p[0])),minZ=Math.min(...pond.polygon.map(p=>p[1])),maxZ=Math.max(...pond.polygon.map(p=>p[1]));
    const glint=new THREE.MeshBasicMaterial({color:'#c3e0cc',transparent:true,opacity:.36,depthWrite:false});
    for(let i=0;i<150;i++){const x=minX+r()*(maxX-minX),z=minZ+r()*(maxZ-minZ);if(!pointInPolygon(x,z,pond.polygon))continue;
      if(pond.id==='south-pond'&&i%3===0){const lily=new THREE.CircleGeometry(.2+r()*.3,10);lily.rotateX(-Math.PI/2);detail.add(lily,m.moss,[x,pond.level+.085,z]);if(i%9===0)detail.add(new THREE.IcosahedronGeometry(.12,0),m.white,[x,pond.level+.19,z]);}
      else detail.box(x,pond.level+.075,z,.25+r()*.8,.009,.025,glint,[0,.1,0]);
    }
  }
  // June irises: alternating beds, individual leaves, stems and six-petal blossoms.
  const irisColors=['#7165a0','#b2a8c8','#645ba2','#d7d2dc'].map(color=>new THREE.MeshLambertMaterial({color}));
  for(let i=0;i<560;i++){
    const z=42+r()*19,row=i%4,x=-28+row*3.5+Math.sin(z*.21)*1.2+(r()-.5)*1.3,y=heightAt(x,z),h=.45+r()*.45;
    for(let k=0;k<3;k++){const a=r()*6;detail.add(surfaceGeometry([x,y,z,x+Math.cos(a)*.16,y+h*.55,z+Math.sin(a)*.16,x+Math.cos(a)*.2,y+h+.15,z+Math.sin(a)*.2],[0,1,2]),m.moss);}
    if(i%2===0){detail.beam([x,y,z],[x,y+h,z],.012,m.moss);for(let k=0;k<5;k++){const a=k*1.257;detail.add(new THREE.IcosahedronGeometry(1,0),irisColors[i%4],[x+Math.cos(a)*.12,y+h+(k%2)*.07,z+Math.sin(a)*.12],[.3,a,.2],[.18,.065,.1]);}}
  }
  for(const [x,z] of [[-28,62],[-23,66],[-17,72],[0,72],[7,66],[11,57],[-35,36]]){
    const y=heightAt(x,z);for(let k=0;k<4;k++){detail.add(new THREE.IcosahedronGeometry(1,1),m.moss,[x+Math.cos(k*2.4)*.8,y+.65,z+Math.sin(k*2.4)*.8],[0,k,0],[1.4,.8,1.3]);}
  }
  detail.finish(parent,'garden-stones-irises-and-approach-detail');
  return {boundary,waterMaterials};
}
