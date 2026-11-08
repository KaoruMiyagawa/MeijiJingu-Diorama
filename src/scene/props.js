import * as THREE from 'three';
import { Builder } from '../core/geometry.js';
import { roof } from './roofs.js';
import { sakeLabel } from '../core/materials.js';

function lantern(b,m,x,z,s=1) {
  b.box(x,0.14,z,0.95*s,0.28,0.95*s,m.stone,undefined,0.045);
  b.cylinder(x,0.43*s,z,0.38*s,0.52*s,0.36*s,m.stone,undefined,8);
  b.cylinder(x,1.4*s,z,0.18*s,0.26*s,1.7*s,m.paleStone,undefined,8);
  b.box(x,2.36*s,z,0.9*s,0.2*s,0.9*s,m.darkWood);
  b.box(x,2.8*s,z,0.64*s,0.72*s,0.64*s,m.curtain);
  for(const dx of [-0.35,0.35]) for(const dz of [-0.35,0.35]) b.box(x+dx*s,2.8*s,z+dz*s,0.065*s,0.85*s,0.065*s,m.black);
  for(let i=-1;i<=1;i++) {
    b.box(x+i*0.19*s,2.8*s,z+0.34*s,0.025*s,0.7*s,0.03*s,m.black);
    b.box(x+0.34*s,2.8*s,z+i*0.19*s,0.03*s,0.7*s,0.025*s,m.black);
  }
  roof(b,m,{x,z,y:3.21*s,w:1.35*s,d:1.35*s,h:0.5*s,seams:false});
}
function temizusha(b,m) {
  const x=-9.5,z=11;
  b.box(x,0.19,z,7,0.38,4.7,m.stone,undefined,0.07);
  for(const dx of [-2.65,2.65]) for(const dz of [-1.65,1.65]) {
    b.cylinder(x+dx,2.3,z+dz,0.17,0.2,4.3,m.lightWood);
    b.box(x+dx,4.2,z+dz,0.7,0.2,0.6,m.wood);
  }
  for(const dz of [-1.65,1.65]) b.box(x,4.3,z+dz,6.6,0.32,0.35,m.wood);
  roof(b,m,{x,z,y:4.55,w:8,d:5.9,h:1.8});
  b.box(x,0.75,z,4.5,1,1.9,m.darkStone,undefined,0.15);
  for(const dx of [-2.18,2.18]) b.box(x+dx,1.35,z,0.28,0.32,2,m.paleStone,undefined,0.05);
  for(const dz of [-0.88,0.88]) b.box(x,1.35,z+dz,4.5,0.32,0.26,m.paleStone,undefined,0.05);
  b.box(x,1.37,z,4.05,0.03,1.5,m.water);
  for(const dx of [-1.4,-0.5,0.4,1.3]) {
    b.beam([x+dx,1.56,z-0.3],[x+dx+0.1,1.57,z+0.85],0.035,m.lightWood);
    b.cylinder(x+dx,1.57,z-0.35,0.12,0.1,0.13,m.lightWood,undefined,12);
  }
  b.beam([x-2.2,1.6,z-0.1],[x+2.2,1.6,z-0.1],0.05,m.rope);
}
function barrels(b,m) {
  const x=21,z=20;
  const labels=Array.from({length:12},(_,i)=>sakeLabel(i));
  b.box(x,0.18,z,2.5,0.36,10.8,m.stone,undefined,0.05);
  for(const zz of [-5.1,-2.55,0,2.55,5.1]) b.box(x+0.9,2.6,z+zz,0.18,5.2,0.18,m.darkWood);
  for(let row=0;row<3;row++) {
    b.box(x,0.5+row*1.47,z,2.1,0.13,10.5,m.wood);
    for(let col=0;col<7;col++) {
      const zz=z+(col-3)*1.43,yy=1.19+row*1.47;
      b.cylinder(x,yy,zz,0.65,0.65,1.23,m.rope,undefined,20);
      for(const dy of [-0.47,0.47]) b.cylinder(x,yy+dy,zz,0.672,0.672,0.065,m.lightWood,undefined,20);
      // Label planes sit on curved barrel faces, individually designed and varied.
      const mat=labels[(row*7+col)%12];
      b.add(new THREE.PlaneGeometry(1.08,1.02),mat,[x-0.657,yy,zz],[0,-Math.PI/2,0]);
      for(const dz of [-0.5,0.5]) b.beam([x-0.5,yy-0.55,zz+dz],[x-0.5,yy+0.55,zz+dz],0.025,m.rope);
    }
  }
  roof(b,m,{x,z,y:5.02,w:11.7,d:3.1,h:0.65,rotate:Math.PI/2,seams:false});
  // Western wine offerings stand opposite the sake display.
  for(const zz of [17.2,19.1,21,22.9]) for(const yy of [0.85,2.35]) {
    b.cylinder(5,yy,zz,0.65,0.65,1.3,m.lightWood,[0,0,Math.PI/2],20);
    for(const dx of [-0.51,0.51]) b.cylinder(5+dx,yy,zz,0.68,0.68,0.07,m.darkWood,[0,0,Math.PI/2],20);
    b.cylinder(5.68,yy,zz,0.55,0.55,0.045,m.edgeWood,[0,0,Math.PI/2],20);
  }
  b.box(5,0.15,20,1.9,0.3,8.4,m.darkWood);
}
function ema(b,m) {
  const x=11,z=-8.7;
  for(const dx of [-2,2]) b.box(x+dx,1.5,z,0.17,3,0.17,m.lightWood);
  for(const yy of [1,1.7,2.4]) {
    b.box(x,yy,z,4.3,0.09,0.12,m.darkWood);
    for(let i=0;i<10;i++) {
      const xx=x-1.85+i*0.41;
      b.box(xx,yy-0.21,z+0.06,0.32,0.33,0.055,m.lightWood,[0,0,Math.sin(i*3)*0.07]);
      b.box(xx,yy-0.19,z+0.1,0.11,0.13,0.02,i%3?m.wood:m.darkWood);
      b.beam([xx,yy+0.05,z],[xx,yy-0.07,z+0.06],0.015,m.rope);
    }
  }
  roof(b,m,{x,z,y:2.95,w:4.9,d:1.5,h:0.65,seams:false});
}
export function createProps(scene,m) {
  const b=new Builder(); temizusha(b,m); barrels(b,m); ema(b,m);
  for(const [x,z,s] of [[5.9,29.5,1],[20.1,29.5,1],[-5.3,7.5,0.95],[5.3,7.5,0.95],[-12,-12,0.9],[12,-12,0.9],[18,12,0.85]]) lantern(b,m,x,z,s);
  // Low forest fences with discrete posts, never crossing the approach.
  for(const side of [-1,1]) {
    const x=13+side*5;
    for(let z=32;z<39;z+=1.5) b.cylinder(x,0.65,z,0.085,0.1,1.3,m.wood);
    for(const y of [0.5,1]) b.beam([x,y,32],[x,y,39],0.045,m.darkWood);
  }
  // A small, physical wayfinding board, not a screen overlay.
  b.box(8,0.9,11,0.12,1.8,0.12,m.wood);
  b.box(8,1.65,11,1.3,0.55,0.1,m.darkWood);
  for(let i=0;i<4;i++) b.box(7.6+i*0.26,1.65,11.06,0.12,0.025,0.012,m.paleStone);
  b.finish(scene,'landscape-props');
}
