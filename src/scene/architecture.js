import * as THREE from 'three';
import { Builder } from '../core/geometry.js';
import { roof, frontGable } from './roofs.js';

function stairs(b,m,x,z,w,top=1.1,count=5) {
  for(let i=0;i<count;i++) b.box(x,(i+1)*top/count/2,z-i*0.43,w,(i+1)*top/count,0.55,m.paleStone,undefined,0.035);
}
function foundation(b,m,x,z,w,d,y=0.7) {
  b.box(x,y/2,z,w+0.7,y,d+0.7,m.stone,undefined,0.08);
  b.box(x,y+0.12,z,w+1,0.24,d+1,m.paleStone,undefined,0.04);
  // Regular cut-stone joints stay fine enough to read as masonry, not blocks.
  for(let xx=-w/2;xx<=w/2;xx+=1.3) b.box(x+xx,y/2,z+d/2+0.357,0.025,y*0.8,0.012,m.darkStone);
}
function column(b,m,x,z,y,h,r=0.22) {
  b.cylinder(x,y+0.12,z,r*1.45,r*1.55,0.24,m.stone);
  b.cylinder(x,y+h/2+0.18,z,r*0.91,r,h,m.wood);
  b.box(x,y+h-0.12,z,r*3,0.18,r*3,m.darkWood);
  b.box(x,y+h+0.07,z,r*2.5,0.2,r*4.2,m.lightWood);
  for(const sign of [-1,1]) b.beam([x,y+h-0.55,z],[x+sign*0.52,y+h-0.03,z],0.075,m.wood);
}
function railing(b,m,x,z,width,y=1.2,axis='x') {
  const pos = t => axis==='x'?[x+t,z]:[x,z+t];
  for(let t=-width/2;t<=width/2+0.01;t+=0.8) {
    const [xx,zz]=pos(t); b.box(xx,y+0.48,zz,0.09,0.95,0.09,m.lightWood);
  }
  for(const yy of [y+0.2,y+0.78,y+1]) {
    b.box(x,yy,z,axis==='x'?width:0.13,0.1,axis==='x'?0.13:width,m.lightWood);
  }
}
function facade(b,m,x,z,w,height,y=1) {
  b.box(x,y+height/2,z,w,height,0.24,m.darkWood);
  for(let xx=-w/2+0.4;xx<w/2;xx+=0.32) {
    b.box(x+xx,y+height*0.5,z+0.17,0.055,height*0.85,0.08,m.lightWood);
  }
  for(let yy=0.35;yy<height;yy+=0.55) b.box(x,y+yy,z+0.2,w,0.075,0.07,m.wood);
}
function hall(b,m,{x,z,w,d,h=4.6,main=false}) {
  foundation(b,m,x,z,w,d,0.75);
  b.box(x,1.03,z,w,0.28,d,m.darkWood);
  b.box(x,1.2,z,w-0.4,0.08,d-0.4,m.lightWood);
  b.box(x,2.5,z-d*0.32,w-1.2,2.5,0.3,m.plaster);
  facade(b,m,x,z+d*0.18,w-1.1,3,1.25);
  for(const zz of [-d/2+0.4,d/2-0.5]) {
    for(let xx=-w/2+0.6;xx<=w/2;xx+=2.4) column(b,m,x+xx,z+zz,1.1,h-0.7,0.23);
    for(const yy of [h,h+0.34]) b.box(x,yy,z+zz,w+0.3,0.28,0.38,m.wood);
  }
  for(const side of [-1,1]) {
    b.box(x+side*(w/2-0.4),2.5,z,0.24,2.8,d-1,m.plaster);
    for(let zz=-d/2;zz<d/2;zz+=1.2) b.box(x+side*(w/2-0.2),2.6,z+zz,0.3,3,0.15,m.wood);
  }
  for(let xx=-w/2-0.6;xx<w/2+0.8;xx+=0.45) {
    b.box(x+xx,h-0.1,z,0.1,0.14,d+1.9,m.lightWood);
    for(const sign of [-1,1]) b.box(x+xx,h-0.3,z+sign*(d/2+0.4),0.12,0.16,1.15,m.darkWood);
  }
  roof(b,m,{x,z,y:h+0.15,w:w+3,d:d+3.2,h:main?4.1:2.5});
  stairs(b,m,x,z+d/2+2.1,main?7:4,1.12);
  if(main) {
    // Projecting worship porch, extended front slope, ceremonial gable.
    for(const xx of [-3.9,3.9]) column(b,m,x+xx,z+d/2+1.6,1.1,4.6,0.29);
    frontGable(b,m,x,z+d/2+3,5.7,10,5.5,3.9);
    b.box(x,5.33,z+d/2+1.65,8.3,0.4,0.5,m.wood);
    for(let xx=-3.5;xx<=3.5;xx+=0.82) {
      b.box(x+xx,4.75,z+d/2+1.67,0.78,0.9,0.045,m.curtain);
      b.cylinder(x+xx,4.78,z+d/2+1.705,0.12,0.12,0.025,m.white,[Math.PI/2,0,0],16);
    }
    for(const xx of [-3,0,3]) {
      b.tube([[x+xx,5.1,z+d/2+1.9],[x+xx+0.05,3.6,z+d/2+1.9],[x+xx,1.8,z+d/2+1.9]],0.06,m.rope,16);
      b.cylinder(x+xx,1.7,z+d/2+1.9,0.13,0.22,0.3,m.rope);
    }
    b.box(x,1.8,z+d/2+0.6,5.8,0.85,0.8,m.wood,undefined,0.035);
    for(let xx=-2.7;xx<2.8;xx+=0.22) b.box(x+xx,2.24,z+d/2+0.6,0.11,0.05,0.75,m.darkWood);
    for(const side of [-1,1]) railing(b,m,x+side*(w/4+2),z+d/2+0.1,w/2-4,1.2);
    // Small gilded crest under the gable.
    b.cylinder(x,6.15,z+d/2+3.12,0.34,0.34,0.06,m.gold,[Math.PI/2,0,0],16);
    for(let i=0;i<16;i++) {
      const a=i*Math.PI/8;
      b.cylinder(x+Math.cos(a)*0.25,6.15+Math.sin(a)*0.25,z+d/2+3.17,0.075,0.075,0.05,m.gold,[Math.PI/2,0,0],6);
    }
  }
}
function corridor(b,m,x,z,length,rotate=0) {
  const group = new THREE.Group(), local = new Builder();
  foundation(local,m,0,0,length,2.5,0.45);
  local.box(0,1.8,-0.85,length,2.4,0.19,m.plaster);
  for(let xx=-length/2+0.25;xx<=length/2;xx+=1.7) {
    column(local,m,xx,1,0.5,2.85,0.14);
    local.box(xx,1.9,-0.78,0.16,2.7,0.26,m.wood);
  }
  local.box(0,3.3,0.7,length+0.2,0.22,0.3,m.wood);
  local.box(0,1.5,-0.65,length,0.16,0.22,m.wood);
  roof(local,m,{y:3.5,w:length+1,d:4.6,h:1.35});
  local.finish(group); group.updateMatrixWorld(true);
  group.rotation.y=rotate; group.position.set(x,0,z); group.updateMatrixWorld(true);
  group.traverse(o=>{ if(o.isMesh) b.add(o.geometry.clone().applyMatrix4(o.matrixWorld),o.material); });
  group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
}
function southGate(b,m) {
  const z=3.2;
  foundation(b,m,0,z,11.3,4.3,0.42);
  stairs(b,m,0,z+3.4,7.4,0.65,3);
  for(const x of [-4.6,-2.45,2.45,4.6]) for(const zz of [-1.4,1.4]) column(b,m,x,z+zz,0.65,4.7,0.3);
  for(const x of [-3.5,3.5]) facade(b,m,x,z-0.5,1.9,3.6,0.8);
  b.box(0,4.8,z,11.1,0.44,4.4,m.darkWood);
  for(let x=-5;x<=5;x+=0.4) b.box(x,4.6,z,0.12,0.18,5.4,m.lightWood);
  b.box(0,6.1,z,8.5,2.1,2.7,m.plaster);
  for(const x of [-4,-2,0,2,4]) {
    for(const side of [-1,1]) { column(b,m,x,z+side*1.5,5.1,2.2,0.17); }
  }
  facade(b,m,0,z+1.39,5.2,1.6,5.3);
  railing(b,m,0,z+2.1,10,4.95);
  railing(b,m,0,z-2.1,10,4.95);
  railing(b,m,-5,z,4.2,4.95,'z'); railing(b,m,5,z,4.2,4.95,'z');
  roof(b,m,{z,y:7.35,w:14.5,d:7.8,h:3.35});
  for(const x of [-2.45,2.45]) {
    b.box(x,1.1,z+1.5,0.64,0.7,0.64,m.darkWood);
    b.box(x,1.22,z+1.84,0.46,0.24,0.05,m.gold);
  }
}

export function createArchitecture(scene,m) {
  const b=new Builder();
  hall(b,m,{x:0,z:-18.4,w:21,d:8.8,h:5.2,main:true});
  hall(b,m,{x:0,z:-29,w:12,d:6.2,h:5.2});
  // Prayer recital hall connecting the outer and inner shrine.
  hall(b,m,{x:0,z:-24,w:9,d:5,h:4.2});
  corridor(b,m,-16.7,-7.2,23.5,Math.PI/2);
  corridor(b,m,16.7,-7.2,23.5,Math.PI/2);
  corridor(b,m,-10.5,3.2,10.8);
  corridor(b,m,10.5,3.2,10.8);
  corridor(b,m,-12,-20.2,6.8); corridor(b,m,12,-20.2,6.8);
  southGate(b,m);
  hall(b,m,{x:26,z:-19,w:10,d:8,h:4.3});
  b.finish(scene,'shrine-complex');
}

export function createTorii(scene,m,x=13,z=27,scale=1) {
  const b=new Builder(),group=new THREE.Group(); group.name='great-myojin-torii';
  for(const side of [-1,1]) {
    const xx=side*5.5;
    b.cylinder(xx,0.18,0,0.82,0.91,0.36,m.paleStone);
    b.cylinder(xx,5.65,0,0.57,0.68,10.9,m.lightWood,[0,0,side*0.026],24);
    b.cylinder(xx,0.47,0,0.72,0.73,0.25,m.darkWood,undefined,24);
  }
  b.box(0,8.25,0,15.2,0.7,0.7,m.lightWood,undefined,0.05);
  b.box(0,9.65,0,0.73,2.1,0.76,m.wood,undefined,0.04);
  // Curved double lintel; continuous solid sections, with raised outer tips.
  for(let i=0;i<40;i++) {
    const xx=-8.3+(i+0.5)*16.6/40,t=xx/8.3;
    const yy=10.8+0.5*Math.pow(Math.abs(t),3),slope=1.5*t*Math.abs(t)/8.3;
    b.box(xx,yy,0,0.46,0.72,1.02,m.lightWood,[0,0,Math.atan(slope)],0.035);
    b.box(xx,yy+0.47,0,0.47,0.22,1.2,m.darkWood,[0,0,Math.atan(slope)],0.025);
  }
  for(const xx of [-5.4,0,5.4]) {
    b.cylinder(xx,10.8+0.5*Math.pow(Math.abs(xx/8.3),3),0.54,0.22,0.22,0.045,m.gold,[Math.PI/2,0,0],16);
    for(let i=0;i<12;i++) {
      const a=i*Math.PI/6;
      b.cylinder(xx+Math.cos(a)*0.14,10.8+0.5*Math.pow(Math.abs(xx/8.3),3)+Math.sin(a)*0.14,0.57,0.055,0.055,0.03,m.gold,[Math.PI/2,0,0],5);
    }
  }
  b.finish(group,'torii-timbers'); group.position.set(x,0,z); group.scale.setScalar(scale); scene.add(group);
  return group;
}
