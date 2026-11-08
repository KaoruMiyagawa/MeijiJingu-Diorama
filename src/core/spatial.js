export function pointInPolygon(x,z,polygon) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const [xi,zi]=polygon[i],[xj,zj]=polygon[j];
    if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi)+xi))inside=!inside;
  }
  return inside;
}
export function polygonBounds(polygon,minY=0,maxY=10) {
  const xs=polygon.map(p=>p[0]),zs=polygon.map(p=>p[1]);
  return {min:[Math.min(...xs),minY,Math.min(...zs)],max:[Math.max(...xs),maxY,Math.max(...zs)]};
}

// Minimal reusable chunk registry. This batch uses low-poly volume proxies only.
export class RegionRegistry {
  constructor(){this.regions=new Map();}
  register(id,bounds,group,metadata={}){this.regions.set(id,{id,bounds,group,metadata});}
  snapshot(){return [...this.regions.values()].map(({id,bounds,metadata})=>({id,bounds,...metadata}));}
}
export function projectedPixels(diameter,camera,viewportHeight) {
  return diameter*viewportHeight*camera.zoom/(camera.top-camera.bottom);
}
export function selectVegetationLOD(pixels,previous=3) {
  const thresholds=[140,50,12];let next=thresholds.findIndex(t=>pixels>=t);if(next<0)next=3;
  if(next<previous&&pixels<thresholds[next]*1.15)return previous;
  if(next>previous&&pixels>thresholds[previous]*0.85)return previous;
  return next;
}
