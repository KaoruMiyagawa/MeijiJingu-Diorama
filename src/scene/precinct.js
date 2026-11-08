import * as THREE from 'three';
import { Builder } from '../core/geometry.js';
import { RegionRegistry, polygonBounds } from '../core/spatial.js';
import { PRECINCT, REGIONS, LANDMARKS, PATH_NODES, PATH_EDGES } from '../data/precinct-layout.js';
import { heightAt, ELEVATION_METADATA } from './heightfield.js';
import { createArchitecture, createTorii } from './architecture.js';
import { createParkSpatial } from './park-spatial.js';
import { createWoodland } from './woodland.js';
import { createParkLandscape } from './park-landscape.js';
import { createParkBuildings } from './park-buildings.js';
import { openWestGate } from './west-gate.js';

export const PARK_VIEWS={
  1:{position:[285,320,170],target:[0,4,0],span:260},
  2:{position:[0,400,.1],target:[0,2,0],span:293},
  3:{position:[104,65,170],target:[48,5,91],span:91},
  4:{position:[125,125,-160],target:[22,3,-86],span:100},
  5:{position:[-155,115,-110],target:[-62,3,-58],span:88},
  6:{position:[12,43,46],target:[-18,5,-24],span:63},
  7:{position:[66,83,128],target:[-6,3,66],span:85},
  8:{position:[-2,42,-55],target:[-29,4,-105],span:62},
  9:{position:[70,62,75],target:[45,5,47],span:45},
  0:{position:[-180,220,-280],target:[0,4,0],span:295},
  'west-detail':{position:[-70,68,-6],target:[-34,2,-16],span:27},
};
function preservedCore(parent,m){
  const group=new THREE.Group();group.name='preserved-v1-shrine-core';createArchitecture(group,m);openWestGate(group,m);
  const b=new Builder();b.box(0,.045,-7.4,32.5,.09,27.2,m.gravel);
  for(let z=6.9;z>-13;z-=1.2)for(let x=-1.95;x<=2;x+=1.3)b.box(x,.105,z,1.27,.12,1.17,m.paleStone,undefined,.015);
  for(let x=-15.8;x<16;x+=1.2)b.box(x,.09,-6.8,1.17,.1,1.7,m.paleStone);
  for(const x of [-10,11]){b.box(x,.16,-7.6,5.5,.32,5.2,m.paleStone,undefined,.1);b.box(x,.34,-7.6,5,.12,4.7,m.earth);}
  b.tube([[-13,2.3,-7],[-11.5,1.8,-7.4],[-10,2.3,-7.7]],.055,m.rope,20);
  for(let i=0;i<5;i++)b.box(-12.7+i*.55,1.85,-7.4,.13,.4,.025,m.white,[0,0,.2]);
  b.finish(group,'preserved-courtyard');group.position.set(...PRECINCT.coreOrigin);parent.add(group);return group;
}
export function createPrecinct(scene,m,time){
  const root=new THREE.Group();root.name='meiji-jingu-complete-forest';scene.add(root);
  const spatial=createParkSpatial(),registry=new RegionRegistry();
  createParkLandscape(root,m,time,spatial);
  const core=preservedCore(root,m),facilities=createParkBuildings(root,m);
  for(const item of LANDMARKS){if(item.kind!=='entrance'&&item.kind!=='torii')continue;
    const [x,,z]=item.position,s=item.kind==='entrance'?.74:(item.scale??1),torii=createTorii(root,m,0,0,s);torii.position.set(x,heightAt(x,z),z);torii.rotation.y=item.rotation??(item.id==='sangubashi-entry'?Math.PI/2:0);
  }
  const forest=createWoodland(root,m,time,spatial);
  for(const region of REGIONS)registry.register(region.id,polygonBounds(region.polygon,0,20),region.kind==='sanctuary'?core:root,{kind:region.kind,representation:region.kind==='forest'?'instanced-living-woodland':'detailed-landscape',source:region.source,confidence:region.confidence});
  const bounds=new THREE.Box3(new THREE.Vector3(-99,-5,-140),new THREE.Vector3(101,22,140));
  return {root,bounds,views:PARK_VIEWS,cameraDistance:560,counts:{...forest.counts,...facilities,forestProxies:0,landmarks:LANDMARKS.length,pathEdges:PATH_EDGES.length},
    layout:{precinct:PRECINCT,landmarks:LANDMARKS.map(p=>({...p,position:[p.position[0],heightAt(p.position[0],p.position[2]),p.position[2]]})),regions:registry.snapshot(),elevation:ELEVATION_METADATA,pathNodes:PATH_NODES,pathEdges:PATH_EDGES,treePositions:forest.treePositions},
    diagnostics:()=>forest.diagnostics(),update(dt,camera){forest.update(camera);},dispose(){forest.dispose();}};
}
