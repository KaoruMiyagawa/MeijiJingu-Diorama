import * as THREE from 'three';
import { Builder, surfaceGeometry } from '../core/geometry.js';
import { roof } from './roofs.js';
import { heightAt } from './heightfield.js';
import { sakeLabel } from '../core/materials.js';

function steps(b,m,x,z,w,top,count=6){for(let i=0;i<count;i++)b.box(x,(i+1)*top/count/2,z-i*.38,w,(i+1)*top/count,.47,m.paleStone,undefined,.025);}
function windows(b,m,x,z,width,height,bottom=1.2){
  b.box(x,bottom+height/2,z,width,height,.13,m.window);
  for(let t=-width/2;t<=width/2+.01;t+=.72){b.box(x+t,bottom+height/2,z+.1,.065,height+.15,.13,m.wood);}
  for(const y of [bottom,bottom+height*.5,bottom+height])b.box(x,y,z+.12,width+.1,.07,.1,m.lightWood);
}
function timberHall(b,m,{x=0,z=0,w=13,d=7,h=3.5,raised=.6,roofMaterial}){
  const rm=roofMaterial?{...m,roof:roofMaterial}:m;
  b.box(x,raised/2,z,w+.5,raised,d+.5,m.stone,undefined,.08);
  b.box(x,raised+.1,z,w+.8,.2,d+.9,m.darkWood);
  b.box(x,raised+h/2,z,w-.4,h,d-.6,m.plaster);
  for(const side of [-1,1]){
    for(let xx=-w/2;xx<=w/2;xx+=1.65){b.box(x+xx,raised+h/2,z+side*d/2,.16,h,.2,m.wood);}
    b.box(x,raised+h,z+side*d/2,w+.3,.25,.3,m.darkWood);
  }
  windows(b,m,x,z+d/2+.03,w-.65,h*.72,raised+.25);
  for(let xx=-w/2;xx<=w/2;xx+=.4)b.box(x+xx,raised+h-.1,z,.09,.14,d+1.2,m.lightWood);
  roof(b,rm,{x,z,y:raised+h+.1,w:w+2.2,d:d+2.1,h:Math.min(2.4,d*.32)});
  steps(b,m,x,z+d/2+1.4,3.3,raised+.16,4);
}
function pitched(b,m,{x=0,z=0,w=12,d=6,y=4,rise=1.5}){
  for(const sign of [-1,1]){
    const vertices=[x-w/2,y+rise,z,x+w/2,y+rise,z,x-w/2,y,z+sign*d/2,x+w/2,y,z+sign*d/2];
    b.add(surfaceGeometry(vertices,sign>0?[0,2,1,1,2,3]:[0,1,2,1,3,2]),m.roof);
    b.box(x,y-.05,z+sign*d/2,w,.18,.22,m.roofEdge);
    for(let xx=-w/2;xx<w/2;xx+=.38)b.beam([x+xx,y+rise+.025,z],[x+xx,y+.025,z+sign*d/2],.021,m.roofEdge);
  }
  b.box(x,y+rise+.04,z,w+.15,.12,.16,m.roofEdge);
}
export function addLantern(b,m,x,y,z,s=1){
  b.box(x,y+.13*s,z,.9*s,.26*s,.9*s,m.stone,undefined,.04);
  b.cylinder(x,y+1.02*s,z,.14*s,.23*s,1.6*s,m.paleStone,undefined,8);
  b.box(x,y+2.1*s,z,.64*s,.75*s,.64*s,m.curtain);
  for(const dx of [-.33,.33])for(const dz of [-.33,.33])b.box(x+dx*s,y+2.1*s,z+dz*s,.065*s,.84*s,.065*s,m.black);
  b.cylinder(x,y+2.62*s,z,0,.82*s,.4*s,m.roof,undefined,4);
  b.cylinder(x,y+2.91*s,z,.07*s,.15*s,.25*s,m.gold,undefined,8);
}
function barrelDisplay(b,m,x,z,wine=false){
  const labels=wine?[]:Array.from({length:6},(_,i)=>sakeLabel(i));
  b.box(x,.2,z,2.6,.4,12.1,m.stone,undefined,.05);
  for(let row=0;row<3;row++){
    b.box(x,.47+row*1.35,z,2.1,.14,11.6,m.darkWood);
    for(let col=0;col<8;col++){
      const zz=z+(col-3.5)*1.4,yy=1.1+row*1.35;
      b.cylinder(x,yy,zz,.6,.6,1.18,wine?m.lightWood:m.rope,wine?[0,0,Math.PI/2]:undefined,16);
      if(wine){for(const dx of [-.45,.45])b.cylinder(x+dx,yy,zz,.62,.62,.065,m.darkWood,[0,0,Math.PI/2],16);}
      else {for(const dy of [-.44,.44])b.cylinder(x,yy+dy,zz,.615,.615,.07,m.lightWood,undefined,16);b.add(new THREE.PlaneGeometry(1.02,.94),labels[(row*8+col)%6],[x-.61,yy,zz],[0,-Math.PI/2,0]);}
    }
  }
  roof(b,m,{x,z,y:4.65,w:12.8,d:3.2,h:.65,rotate:Math.PI/2,seams:false});
  for(const zz of [-5.9,5.9])b.box(x+.9,2.4,z+zz,.16,4.8,.16,m.darkWood);
}
export function createParkBuildings(parent,m){
  const window=m.plaster.clone();window.name='soft-sky-glazing';window.color.set('#8faaa0');window.roughness=.32;window.metalness=.22;
  const tile=m.roof.clone();tile.color.set('#686d65');tile.metalness=.06;
  const copper=m.roof.clone();copper.color.set('#a57c60');copper.metalness=.06;
  const darkRoof=m.roof.clone();darkRoof.color.set('#4f6261');darkRoof.metalness=.12;
  const mat={...m,window};
  function groupAt(name,x,z,build){const group=new THREE.Group(),b=new Builder();group.name=name;build(b);b.finish(group,name);group.position.set(x,heightAt(x,z),z);parent.add(group);return group;}
  groupAt('treasure-museum-detailed',-30,-109,b=>{
    const tm={...mat,roof:copper,roofEdge:m.darkWood};
    // Elevated central hall and low side wings: official exterior photo reference.
    b.box(0,.85,0,19,1.7,9.2,m.stone,undefined,.08);
    for(let x=-8.4;x<9;x+=2.1){b.box(x,.85,4.64,.75,1.3,.04,m.darkWood);b.box(x,.85,-4.64,.75,1.3,.04,m.darkWood);}
    b.box(0,3.55,0,18.5,3.7,8.7,m.plaster);
    for(let x=-8.5;x<=8.5;x+=2.12){b.box(x,3.65,4.4,.28,3.9,.25,m.paleStone);b.box(x,3.65,-4.4,.28,3.9,.25,m.paleStone);}
    for(let x=-6.5;x<=6.5;x+=2.6){windows(b,tm,x,4.43,1.45,2.25,2.25);windows(b,tm,x,-4.47,1.45,2.25,2.25);}
    roof(b,tm,{y:5.75,w:22,d:12,h:3});
    for(const side of [-1,1]){timberHall(b,tm,{x:side*13,z:1.4,w:6.5,d:6,h:2.7,raised:.45});}
    steps(b,m,0,8,4,1.8,8);
    for(const side of [-1,1]){b.beam([side*2.3,.2,8.5],[side*2.3,1.9,4.7],.17,m.paleStone);b.beam([side*2.3,1.1,8.5],[side*2.3,2.8,4.7],.09,m.paleStone);}
  });
  groupAt('shiseikan-timber-dojo',-59,-105,b=>{timberHall(b,{...mat,roof:tile},{w:14,d:9,h:3.8});});
  groupAt('kakuuntei-garden-house',-9,67,b=>{
    timberHall(b,{...mat,roof:tile},{w:11,d:6,h:2.9,raised:.45});
    pitched(b,{...mat,roof:tile},{w:10.2,d:4.6,y:4.6,rise:1.05});
    b.box(0,.4,4.4,10,.25,2,m.darkWood);for(let x=-4.7;x<5;x+=.28)b.box(x,.54,4.4,.22,.035,1.9,m.lightWood);
  });
  groupAt('meiji-jingu-museum-timber-and-glass',66,86,b=>{
    const mm={...mat,roof:darkRoof};
    b.box(0,.25,0,19,.5,11,m.stone,undefined,.09);
    for(const [x,z,w,d,y,rise] of [[-3,-1.4,15,7,5,1.8],[2,2.7,17,6,2.8,1.2]]){
      b.box(x,y*.43,z,w-2,y*.8,d-1,m.darkWood);
      b.box(x,y*.43,z+d/2-.44,w-2,y*.7,.05,window);
      for(let xx=-w/2+1;xx<w/2;xx+=.65)b.box(x+xx,y*.46,z+d/2-.35,.065,y*.83,.15,m.lightWood);
      pitched(b,mm,{x,z,w,d,y,rise});
      for(const side of [-1,1])for(let xx=-w/2+.7;xx<=w/2;xx+=3)b.box(x+xx,y/2,z+side*(d/2-.3),.12,y,.12,m.darkWood);
    }
    b.box(0,.32,6.2,13,.16,2,m.lightWood);steps(b,m,-3,7.8,4,.4,3);
  });
  groupAt('forest-terrace-pavilions',67,16,b=>{
    const mm={...mat,roof:darkRoof};timberHall(b,mm,{x:-4,z:0,w:9,d:9,h:3.4});timberHall(b,mm,{x:5,z:1,w:8,d:7,h:3});
    b.box(0,.18,7,16,.36,4,m.lightWood);
    for(const x of [-5,0,5]){b.cylinder(x,.9,7,.7,.7,.12,m.wood);b.cylinder(x,.5,7,.08,.1,.8,m.darkWood);for(const dx of [-1.2,1.2])b.box(x+dx,.55,7,.6,.12,.7,m.wood);}
  });
  groupAt('sake-offerings',51,46,b=>barrelDisplay(b,mat,0,0));
  groupAt('wine-offerings',39,46,b=>barrelDisplay(b,mat,0,0,true));
  groupAt('purification-pavilion',-30,9,b=>{
    b.box(0,.15,0,6.2,.3,4.3,m.stone,undefined,.06);
    for(const x of [-2.3,2.3])for(const z of [-1.5,1.5])b.cylinder(x,1.85,z,.14,.18,3.6,m.lightWood);
    roof(b,m,{y:3.7,w:7.2,d:5.5,h:1.5});
    b.box(0,.8,0,3.8,1.1,1.6,m.darkStone,undefined,.1);b.box(0,1.36,0,3.4,.04,1.25,m.water);
    for(const z of [-.8,.8])b.box(0,1.4,z,3.8,.18,.15,m.paleStone);
    for(const x of [-1.2,-.4,.4,1.2]){b.beam([x,1.55,-.3],[x,1.55,.7],.03,m.lightWood);b.cylinder(x,1.55,-.3,.11,.09,.1,m.lightWood);}
  });
  groupAt('garden-well',-31,32,b=>{
    b.cylinder(0,.15,0,1.15,1.25,.3,m.stone,undefined,24);b.cylinder(0,.32,0,.83,.83,.04,m.water,undefined,24);
    b.box(0,.13,2.2,3.2,.26,2.6,m.darkWood);for(let x=-1.4;x<1.6;x+=.3)b.box(x,.28,2.2,.25,.04,2.5,m.lightWood);
  });
  const b=new Builder();
  for(const [x,z,s] of [[-24,1,1],[-12,1,1],[-30,-21,.85],[-6,-21,.85],[24,3,.85],[24,13,.85],[50,120,1],[60,120,1],[50,-92,.85],[60,-92,.85]])addLantern(b,m,x,heightAt(x,z),z,s);
  b.finish(parent,'stone-lanterns');
  return {detailedFacilities:8};
}
