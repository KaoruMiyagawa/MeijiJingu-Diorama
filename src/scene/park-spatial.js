import { PATH_EDGES, PRECINCT, REGIONS, LANDMARKS, PONDS } from '../data/precinct-layout.js';
import { pathCurve } from './paths.js';
import { pointInPolygon } from '../core/spatial.js';

export function edgeDistance(x,z,polygon) {
  let distance=Infinity;
  for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=b[0]-a[0],dz=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
    distance=Math.min(distance,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t));
  }return distance;
}
export function createParkSpatial(){
  const cell=12,grid=new Map(),samples=[];
  for(const edge of PATH_EDGES){const curve=pathCurve(edge),steps=Math.ceil(curve.getLength());
    for(let i=0;i<=steps;i++){const p=curve.getPointAt(i/steps),t=curve.getTangentAt(i/steps),s={x:p.x,z:p.z,width:edge.width,id:edge.id,type:edge.type,tx:t.x,tz:t.z};
      samples.push(s);const key=`${Math.floor(p.x/cell)},${Math.floor(p.z/cell)}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(s);
    }
  }
  const garden=REGIONS.find(r=>r.kind==='garden').polygon,lawn=REGIONS.find(r=>r.kind==='lawn').polygon,core=REGIONS[0].polygon;
  function pathDistance(x,z){let nearest=99;const ix=Math.floor(x/cell),iz=Math.floor(z/cell);
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(const p of grid.get(`${ix+dx},${iz+dz}`)??[])nearest=Math.min(nearest,Math.hypot(p.x-x,p.z-z)-p.width/2);
    return nearest;
  }
  function zone(x,z){
    if(!pointInPolygon(x,z,PRECINCT.boundary))return 'outside';
    if(pointInPolygon(x,z,core)||x>-39&&x<0&&z>-4&&z<15)return 'sanctuary';
    if(pointInPolygon(x,z,garden))return 'garden';
    if(pointInPolygon(x,z,lawn))return 'lawn';return 'forest';
  }
  function buildingDistance(x,z){let distance=99;
    for(const item of LANDMARKS){if(item.size){const [w,,d]=item.size;distance=Math.min(distance,Math.hypot(Math.max(0,Math.abs(x-item.position[0])-w/2),Math.max(0,Math.abs(z-item.position[2])-d/2)));}
      if(item.kind==='entrance'||item.kind==='torii')distance=Math.min(distance,Math.hypot(x-item.position[0],z-item.position[2])-7);
    }return distance;
  }
  function waterDistance(x,z){let d=99;for(const pond of PONDS){if(pointInPolygon(x,z,pond.polygon))return -1;d=Math.min(d,edgeDistance(x,z,pond.polygon));}return d;}
  function plantable(x,z,margin=0){return zone(x,z)!=='outside'&&zone(x,z)!=='sanctuary'&&pathDistance(x,z)>margin&&buildingDistance(x,z)>margin&&waterDistance(x,z)>margin;}
  return {samples,zone,pathDistance,buildingDistance,waterDistance,plantable};
}
