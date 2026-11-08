import { surfaceGeometry } from '../core/geometry.js';

// Four curved, thick copper roof planes. Ridge runs along local X.
export function roof(b, m, {x=0,z=0,y=5,w=12,d=7,h=3,rotate=0,seams=true}) {
  const transform = (p) => [x+p[0]*Math.cos(rotate)+p[2]*Math.sin(rotate),p[1],z-p[0]*Math.sin(rotate)+p[2]*Math.cos(rotate)];
  const ridge = Math.max(0.3,w/2-d*0.42);
  const ring = (t,corner) => {
    const xx=w/2*(1-t)+ridge*t, zz=d/2*(1-t);
    return [[-xx,-zz],[xx,-zz],[xx,zz],[-xx,zz]][corner];
  };
  const height = t => y+h*Math.pow(t,1.6)+0.23*Math.exp(-t*18);
  for(let face=0;face<4;face++) {
    const vertices=[],indices=[];
    for(let i=0;i<=18;i++) {
      const t=i/18;
      const a=ring(t,face),q=ring(t,(face+1)%4);
      for(let j=0;j<=20;j++) vertices.push(...transform([a[0]+(q[0]-a[0])*j/20,height(t),a[1]+(q[1]-a[1])*j/20]));
    }
    for(let i=0;i<18;i++) for(let j=0;j<20;j++) {
      const k=i*21+j; indices.push(k,k+21,k+1,k+1,k+21,k+22);
    }
    b.add(surfaceGeometry(vertices,indices),m.roof);
    const a=ring(0,face),q=ring(0,(face+1)%4);
    b.beam(transform([a[0],y+0.2,a[1]]),transform([q[0],y+0.2,q[1]]),0.16,m.darkWood);
    b.beam(transform([a[0],y+0.29,a[1]]),transform([q[0],y+0.29,q[1]]),0.055,m.gold);
    const hip=[];
    for(let i=0;i<=18;i++) { const t=i/18,p=ring(t,face); hip.push(transform([p[0],height(t)+0.06,p[1]])); }
    b.tube(hip,0.07,m.roofEdge,24);
    if(seams) {
      const count=Math.ceil((face%2===0?w:d)/0.65);
      for(let j=1;j<count;j++) {
        const pts=[];
        for(let i=0;i<=12;i++) {
          const t=i/12,a=ring(t,face),q=ring(t,(face+1)%4);
          pts.push(transform([a[0]+(q[0]-a[0])*j/count,height(t)+0.023,a[1]+(q[1]-a[1])*j/count]));
        }
        b.tube(pts,0.024,m.roofEdge,12);
      }
    }
  }
  b.beam(transform([-ridge-0.25,y+h+0.17,0]),transform([ridge+0.25,y+h+0.17,0]),0.19,m.roofEdge);
  b.beam(transform([-ridge-0.25,y+h+0.31,0]),transform([ridge+0.25,y+h+0.31,0]),0.055,m.gold);
  for(const side of [-1,1]) {
    const end=side*(ridge+0.15);
    b.tube([transform([end-side*0.5,y+h+0.3,0]),transform([end,y+h+0.5,0]),transform([end+side*0.12,y+h+0.94,0])],0.13,m.roofEdge,10);
    b.cylinder(...transform([end+side*0.12,y+h+0.96,0]),0.12,0.12,0.16,m.gold);
  }
}

export function frontGable(b,m,x,z,y,width,depth,rise) {
  const vertices=[],indices=[],front=[];
  const profile = t => y+rise*Math.pow(1-Math.abs(t),1.65)+0.22*Math.pow(Math.abs(t),8);
  for(let i=0;i<=60;i++) {
    const t=i/30-1, xx=x+t*width/2, yy=profile(t);
    vertices.push(xx,yy,z,xx,yy,z-depth); front.push([xx,yy,z+0.04]);
    if(i<60) {const k=i*2;indices.push(k,k+2,k+1,k+2,k+3,k+1);}
  }
  b.add(surfaceGeometry(vertices,indices),m.roof);
  b.tube(front,0.21,m.darkWood,80);
  b.tube(front.map(p=>[p[0],p[1]+0.04,p[2]+0.17]),0.067,m.gold,80);
  b.tube(front.map(p=>[p[0]*1+(x-p[0])*0.04,p[1]-0.23,p[2]-0.04]),0.11,m.lightWood,80);
  for(let i=0;i<=20;i++) {
    const t=i/10-1,xx=x+t*width/2,yy=profile(t);
    b.beam([xx,yy+0.03,z],[xx,yy+0.03,z-depth],0.026,m.roofEdge);
  }
  // Actual timber triangular gable, visible beneath the roof.
  for(let i=1;i<24;i++) {
    const t=i/12-1, yy=profile(t);
    if(yy>y+0.4) b.box(x+t*width*0.46,(yy+y)/2-0.18,z-0.18,0.18,yy-y,0.22,m.lightWood);
  }
  b.box(x,y-0.12,z-0.2,width,0.26,0.38,m.wood);
}
