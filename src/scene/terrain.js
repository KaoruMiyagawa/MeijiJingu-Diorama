import * as THREE from 'three';
import { Builder, surfaceGeometry } from '../core/geometry.js';
import { randomGenerator } from '../core/random.js';

export const approach = new THREE.CatmullRomCurve3([
  new THREE.Vector3(13,0,39.65),new THREE.Vector3(13,0,29),new THREE.Vector3(14,0,19),
  new THREE.Vector3(12,0,12),new THREE.Vector3(3,0,8),new THREE.Vector3(0,0,4),
]);
const pathSamples = approach.getPoints(150);
export function distanceToPath(x,z) {
  let d=Infinity;
  for(const p of pathSamples) d=Math.min(d,Math.hypot(x-p.x,z-p.z));
  return d;
}
export function isPond(x,z,pad=0) { return ((x+25)/(7.6+pad))**2+((z-18)/(10.2+pad))**2<1; }
export function isClearing(x,z,pad=0) {
  return (Math.abs(x)<19+pad&&z<7+pad&&z>-34-pad)||
    (x>18-pad&&x<33+pad&&z>-26-pad&&z<-11+pad)||
    (x>-14-pad&&x<-5+pad&&z>7-pad&&z<15+pad)||
    (x>19-pad&&x<24+pad&&z>14-pad&&z<26+pad)||
    (x>2-pad&&x<7+pad&&z>15-pad&&z<26+pad);
}

function ribbon(b,m,curve,width,y) {
  const vertices=[],indices=[];
  for(let i=0;i<=150;i++) {
    const t=i/150,p=curve.getPoint(t),n=curve.getTangent(t); const dx=n.z*width/2,dz=-n.x*width/2;
    vertices.push(p.x-dx,y,p.z-dz,p.x+dx,y,p.z+dz);
    if(i<150) {const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
  }
  const geo=surfaceGeometry(vertices,indices); geo.scale(1,1,1);
  // Texture uses world coordinates so the curved path has consistent gravel scale.
  b.add(geo,m.gravel);
}
export function createTerrain(scene,m) {
  const b=new Builder(),r=randomGenerator(522);
  b.box(0,-2.2,0,80,3.2,80,m.base,undefined,0.38);
  b.box(0,-0.79,0,79.8,0.55,79.8,m.soil,undefined,0.12);
  b.box(0,-0.29,0,79.6,0.58,79.6,m.earth,undefined,0.12);
  // Fine inset edges on the actual model base.
  for(const side of [-1,1]) {
    b.box(0,-2.92,side*39.91,79.1,0.065,0.04,m.gold);
    b.box(side*39.91,-2.92,0,0.04,0.065,79.1,m.gold);
  }
  ribbon(b,m,approach,7.2,0.045);
  for(let i=2;i<148;i++) {
    const t=i/150,p=approach.getPoint(t),n=approach.getTangent(t);
    for(const side of [-1,1]) {
      b.box(p.x+side*n.z*3.68,0.09,p.z-side*n.x*3.68,0.28,0.18,0.69,m.stone,[0,Math.atan2(n.x,n.z),0],0.035);
    }
  }
  b.box(0,0.045,-7.4,32.5,0.09,27.2,m.gravel);
  // Pale central paving leads continuously through the gate to the prayer hall.
  for(let z=6.9;z>-13;z-=1.2) for(let x=-1.95;x<=2;x+=1.3) {
    b.box(x,0.105,z,1.27,0.12,1.17,m.paleStone,undefined,0.015);
  }
  for(let x=-15.8;x<16;x+=1.2) b.box(x,0.09,-6.8,1.17,0.1,1.7,m.paleStone);
  // Compressed Inner Garden pond: irregular shore rather than a perfect ellipse.
  const shape=new THREE.Shape();
  for(let i=0;i<=70;i++) {
    const a=i/70*Math.PI*2,k=1+0.07*Math.sin(a*5)+0.04*Math.cos(a*9);
    const x=-25+7.2*Math.cos(a)*k,z=18+9.6*Math.sin(a)*k;
    if(i===0)shape.moveTo(x,-z);else shape.lineTo(x,-z);
  }
  const waterGeo=new THREE.ShapeGeometry(shape,70); waterGeo.rotateX(-Math.PI/2); waterGeo.translate(0,0.07,0);
  const water = new THREE.Mesh(waterGeo,m.water); water.name='south-pond'; water.receiveShadow=true; scene.add(water);
  for(let i=0;i<100;i++) {
    const a=i/100*Math.PI*2,k=1+0.07*Math.sin(a*5)+0.04*Math.cos(a*9);
    const x=-25+7.5*Math.cos(a)*k,z=18+10*Math.sin(a)*k;
    b.add(new THREE.DodecahedronGeometry(0.45+r()*0.5,0),i%3?m.darkStone:m.moss,[x,0.18,z],[r(),r()*6,r()],[1.1,0.55,0.9]);
  }
  const gardenPath = new THREE.CatmullRomCurve3([[-32,0,31],[-15,0,31],[-12,0,22],[-15,0,12],[-18,0,9],[-24,0,5],[-34,0,8]].map(p=>new THREE.Vector3(...p)));
  ribbon(b,m,gardenPath,1.9,0.035);
  // Fine earth strata, pebbles and moss along the visible cut edge.
  for(let i=0;i<260;i++) {
    const side=i%4,t=(r()-0.5)*78, x=side<2?t:(side===2?-39.75:39.75), z=side<2?(side===0?-39.75:39.75):t;
    b.add(new THREE.IcosahedronGeometry(0.1+r()*0.24,0),m.darkStone,[x,-0.6-r()*0.4,z],undefined,[1,0.5,1]);
  }
  b.finish(scene,'terrain');
  return {water};
}
