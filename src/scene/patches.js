import * as THREE from 'three';
import { surfaceGeometry } from '../core/geometry.js';

// Triangulate polygon and subdivide so rendered terrain follows the height query.
export function polygonSurface(polygon,elevation,maxEdge=6) {
  const points=polygon.map(([x,z])=>new THREE.Vector2(x,z));
  const faces=THREE.ShapeUtils.triangulateShape(points,[]),vertices=[],indices=[];
  const emit=(a,b,c,depth=0)=>{
    const ab=a.clone().add(b).multiplyScalar(.5),bc=b.clone().add(c).multiplyScalar(.5),ca=c.clone().add(a).multiplyScalar(.5);
    const error=Math.max(...[[a,b,ab],[b,c,bc],[c,a,ca]].map(([u,v,m])=>Math.abs(elevation(m.x,m.y)-(elevation(u.x,u.y)+elevation(v.x,v.y))/2)));
    if(depth<10&&(Math.max(a.distanceTo(b),b.distanceTo(c),c.distanceTo(a))>maxEdge||error>.009)) {
      emit(a,ab,ca,depth+1);emit(ab,b,bc,depth+1);emit(ca,bc,c,depth+1);emit(ab,bc,ca,depth+1);return;
    }
    const k=vertices.length/3;
    for(const p of [a,b,c])vertices.push(p.x,elevation(p.x,p.y),p.y);
    const cross=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    indices.push(...(cross>0?[k,k+2,k+1]:[k,k+1,k+2]));
  };
  faces.forEach(f=>emit(...f.map(i=>points[i])));
  return surfaceGeometry(vertices,indices);
}
export function addPolygonVolume(builder,polygon,baseAt,height,material) {
  builder.add(polygonSurface(polygon,(x,z)=>baseAt(x,z)+height),material);
  const vertices=[],indices=[];
  const area=polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
  polygon.forEach((start,i)=>{
    const end=polygon[(i+1)%polygon.length],steps=Math.ceil(Math.hypot(end[0]-start[0],end[1]-start[1])/2);
    for(let n=0;n<steps;n++){
    const p=start.map((v,j)=>v+(end[j]-v)*n/steps),q=start.map((v,j)=>v+(end[j]-v)*(n+1)/steps),k=vertices.length/3;
    vertices.push(p[0],baseAt(...p),p[1],q[0],baseAt(...q),q[1],p[0],baseAt(...p)+height,p[1],q[0],baseAt(...q)+height,q[1]);
    indices.push(...(area>0?[k,k+2,k+1,k+1,k+2,k+3]:[k,k+1,k+2,k+1,k+3,k+2]));
    }
  });builder.add(surfaceGeometry(vertices,indices),material);
}
