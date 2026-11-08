import { PONDS, PRECINCT } from '../data/precinct-layout.js';
import { pointInPolygon } from '../core/spatial.js';

export function heightAt(x,z) {
  const base=0.55+0.65*Math.exp(-((x+45)**2+(z+80)**2)/5000)+0.24*Math.sin(x*0.025)*Math.cos(z*0.018);
  // Flat foundation apron, blended into the surroundings over ten units.
  const outside=Math.max(Math.abs(x+11.5)-30.5,Math.abs(z+23.5)-23.5,0);
  const t=Math.min(1,outside/10),smooth=t*t*(3-2*t);
  let elevation=0.9*(1-smooth)+base*smooth;
  for(const pond of PONDS) {
    if(pointInPolygon(x,z,pond.polygon))return pond.level-.2;
    let distance=Infinity;
    pond.polygon.forEach((a,i)=>{
      const b=pond.polygon[(i+1)%pond.polygon.length],dx=b[0]-a[0],dz=b[1]-a[1];
      const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
      distance=Math.min(distance,Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t));
    });
    // Wide, smooth basin margin keeps triangulated terrain below the exact shore.
    const t=Math.max(0,Math.min(1,(distance-3)/6));
    elevation=(pond.level-.2)*(1-t*t*(3-2*t))+elevation*t*t*(3-2*t);
  }
  return elevation;
}
export function isInsidePrecinct(x,z){return pointInPolygon(x,z,PRECINCT.boundary);}
export const ELEVATION_METADATA={source:'artistic-approximation',range:'gentle sub-2-unit relief; no surveyed DEM',coreLevel:0.9};
