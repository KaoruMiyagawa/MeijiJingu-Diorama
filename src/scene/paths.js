import * as THREE from 'three';
import { Builder, surfaceGeometry } from '../core/geometry.js';
import { PATH_NODES, PATH_EDGES } from '../data/precinct-layout.js';
import { heightAt } from './heightfield.js';

export function pathCurve(edge) {
  return new THREE.CatmullRomCurve3([PATH_NODES[edge.from],...edge.via,PATH_NODES[edge.to]].map(([x,z])=>new THREE.Vector3(x,0,z)),false,'centripetal');
}
export function createPaths(parent,materials) {
  const b=new Builder();const samples=[];
  for(const edge of PATH_EDGES) {
    const curve=pathCurve(edge),steps=Math.max(12,Math.ceil(curve.getLength()*1.5)),verts=[],indices=[];
    for(let i=0;i<=steps;i++) {
      const p=curve.getPointAt(i/steps),t=curve.getTangentAt(i/steps);
      for(const side of [-1,1]) {
        const x=p.x+side*t.z*edge.width/2,z=p.z-side*t.x*edge.width/2;
        verts.push(x,heightAt(x,z)+0.09,z);
      }
      samples.push({x:p.x,z:p.z,width:edge.width,id:edge.id});
      if(i<steps){const k=i*2;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
    }
    b.add(surfaceGeometry(verts,indices),edge.type==='garden'?materials.gardenPath:materials.road);
  }
  // Filled, co-planar node joins prevent cracks where route ribbons meet.
  for(const [id,[x,z]] of Object.entries(PATH_NODES)) {
    const connected=PATH_EDGES.filter(e=>e.from===id||e.to===id);
    const radius=Math.max(...connected.map(e=>e.width))/2;
    const geo=new THREE.CircleGeometry(radius,24);geo.rotateX(-Math.PI/2);
    const pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++)pos.setY(i,heightAt(x+pos.getX(i),z+pos.getZ(i))+0.091);
    b.add(geo,connected.every(e=>e.type==='garden')?materials.gardenPath:materials.road,[x,0,z]);
  }
  b.finish(parent,'verified-approach-network');return samples;
}
