import * as THREE from 'three';
import { Builder } from '../core/geometry.js';

// Subtract a doorway from the derived park mesh only. V1 source and core sample stay intact.
// Each outside polygon is retained; only the portion inside all six planes is discarded.
function subtractBox(geometry,min,max){
  const source=geometry.index?geometry.toNonIndexed():geometry;
  const attributes=Object.entries(source.attributes),stride=attributes.reduce((n,[,a])=>n+a.itemSize,0);
  const offsets=[];let offset=0;for(const [,a] of attributes){offsets.push(offset);offset+=a.itemSize;}
  const positionOffset=offsets[attributes.findIndex(([key])=>key==='position')],output=[];
  function clip(polygon,axis,bound,keepGreater){
    const result=[];if(!polygon.length)return result;
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length],av=a[positionOffset+axis],bv=b[positionOffset+axis];
      const ain=keepGreater?av>=bound:av<=bound,bin=keepGreater?bv>=bound:bv<=bound;
      if(ain)result.push(a);
      if(ain!==bin){const t=(bound-av)/(bv-av);result.push(a.map((v,j)=>v+(b[j]-v)*t));}
    }return result;
  }
  const emit=polygon=>{for(let i=1;i+1<polygon.length;i++)for(const v of [polygon[0],polygon[i],polygon[i+1]])output.push(...v);};
  for(let i=0;i<source.attributes.position.count;i+=3){
    const triangle=[];for(let j=0;j<3;j++){const v=[];for(const [,a] of attributes)for(let c=0;c<a.itemSize;c++)v.push(a.array[(i+j)*a.itemSize+c]);triangle.push(v);}
    if([0,1,2].some(axis=>triangle.every(v=>v[positionOffset+axis]<min[axis])||triangle.every(v=>v[positionOffset+axis]>max[axis]))){emit(triangle);continue;}
    let inside=triangle;
    for(const [axis,bound,greater] of [[0,min[0],true],[0,max[0],false],[1,min[1],true],[1,max[1],false],[2,min[2],true],[2,max[2],false]]){
      emit(clip(inside,axis,bound,!greater));inside=clip(inside,axis,bound,greater);if(!inside.length)break;
    }
  }
  const result=new THREE.BufferGeometry(),count=output.length/stride;
  attributes.forEach(([key,a],index)=>{const values=new Float32Array(count*a.itemSize);for(let i=0;i<count;i++)for(let c=0;c<a.itemSize;c++)values[i*a.itemSize+c]=output[i*stride+offsets[index]+c];result.setAttribute(key,new THREE.BufferAttribute(values,a.itemSize));});
  result.computeBoundingSphere();result.computeBoundingBox();if(source!==geometry)source.dispose();return result;
}
export function openWestGate(core,m){
  core.traverse(mesh=>{if(!mesh.isMesh)return;const old=mesh.geometry;mesh.geometry=subtractBox(old,[-18.5,.7,-10],[-14.9,3.3,-5.6]);old.dispose();});
  const b=new Builder();
  for(const z of [-10.05,-5.55]){b.box(-17.55,1.98,z,.28,2.6,.24,m.wood);b.box(-17.55,.78,z,.46,.22,.42,m.stone);}
  b.box(-17.55,3.25,-7.8,.31,.24,4.65,m.darkWood);
  for(let i=0;i<4;i++){
    const h=(i+1)*.17;b.box(-20.15+i*.55,h/2,-7.8,.6,h,4.15,m.paleStone,undefined,.025);
    b.box(-13.25-i*.55,h/2,-7.8,.6,h,4.15,m.paleStone,undefined,.025);
  }
  b.finish(core,'west-gate-jambs-and-steps');
}
