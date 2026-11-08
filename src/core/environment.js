import * as THREE from 'three';
import { CONFIG } from '../config.js';

// Fractional-year solar approximation. Tokyo, 1 June, 10:00 JST; north is -Z.
export function morningSun() {
  const day=152,hour=10,latitude=35.676*Math.PI/180,longitude=139.699,zoneMeridian=135;
  const g=2*Math.PI/365*(day-1+(hour-12)/24);
  const equation=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
  const decl=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
  const angle=((hour*60+equation+4*(longitude-zoneMeridian))/4-180)*Math.PI/180;
  const east=-Math.cos(decl)*Math.sin(angle),north=Math.cos(latitude)*Math.sin(decl)-Math.sin(latitude)*Math.cos(decl)*Math.cos(angle);
  const up=Math.sin(latitude)*Math.sin(decl)+Math.cos(latitude)*Math.cos(decl)*Math.cos(angle);
  return new THREE.Vector3(east,up,-north).normalize();
}
function gradientSky(){
  const c=document.createElement('canvas');c.width=16;c.height=512;const ctx=c.getContext('2d');
  const gradient=ctx.createLinearGradient(0,0,0,512);
  gradient.addColorStop(0,'#79b9e4');gradient.addColorStop(.53,'#a6d5ec');gradient.addColorStop(1,'#d3eaf1');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,16,512);
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function createEnvironment(scene,{bounds,mode='core',renderer}={}) {
  const skyTexture=gradientSky();scene.background=skyTexture;
  const sky=new THREE.HemisphereLight('#d5e9ff','#a9a084',1.85);scene.add(sky);
  const direction=morningSun(),sun=new THREE.DirectionalLight('#fff1d5',3.4);
  sun.castShadow=true;sun.shadow.mapSize.set(CONFIG.shadowSize,CONFIG.shadowSize);
  sun.shadow.normalBias=.035;sun.shadow.bias=-.000045;sun.shadow.radius=3.5;
  scene.add(sun,sun.target);
  const fill=new THREE.DirectionalLight('#d0e5f5',.48);fill.position.set(-45,30,48);scene.add(fill);
  // Low-frequency sky radiance gives copper, water and timber a natural ambient response.
  let skyEnvironment;
  if(renderer){
    const canvas=document.createElement('canvas');canvas.width=256;canvas.height=128;const ctx=canvas.getContext('2d'),g=ctx.createLinearGradient(0,0,0,128);
    g.addColorStop(0,'#a5cce5');g.addColorStop(.47,'#e1eaf0');g.addColorStop(.53,'#c1c1a5');g.addColorStop(1,'#7c8469');ctx.fillStyle=g;ctx.fillRect(0,0,256,128);
    const texture=new THREE.CanvasTexture(canvas);texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;
    const pmrem=new THREE.PMREMGenerator(renderer);skyEnvironment=pmrem.fromEquirectangular(texture);scene.environment=skyEnvironment.texture;scene.environmentIntensity=.38;texture.dispose();pmrem.dispose();
  }
  const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),groundY=bounds.min.y-.15;
  // Transparent receiver preserves the blue backdrop instead of an opaque studio floor.
  const stage=new THREE.Mesh(new THREE.PlaneGeometry(2500,2500),new THREE.ShadowMaterial({color:'#35596e',opacity:.23,depthWrite:false}));
  stage.rotation.x=-Math.PI/2;stage.position.y=groundY;stage.receiveShadow=true;stage.name='transparent-shadow-receiver';scene.add(stage);
  const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');
  const grad=ctx.createRadialGradient(64,64,15,64,64,64);grad.addColorStop(0,'rgba(36,65,69,.28)');grad.addColorStop(.65,'rgba(36,65,69,.12)');grad.addColorStop(1,'rgba(36,65,69,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,128,128);
  const contact=new THREE.Mesh(new THREE.PlaneGeometry(size.x*1.42,size.z*1.42),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));
  contact.rotation.x=-Math.PI/2;contact.position.set(center.x,groundY+.02,center.z);scene.add(contact);
  const right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),lightUp=new THREE.Vector3().crossVectors(direction,right).normalize();
  const fullWidth=Math.max(size.x,size.z)*1.5,shadowCenter=new THREE.Vector3(),offset=new THREE.Vector3();let lastWidth=0;
  function update(camera,target) {
    const visibleWidth=Math.max(camera.right-camera.left,camera.top-camera.bottom)/camera.zoom;
    const width=mode==='core'?122:Math.min(fullWidth,Math.max(100,Math.ceil((visibleWidth*1.35+50)/8)*8));
    shadowCenter.copy(width>=fullWidth?center:target);shadowCenter.y=0;
    const texel=width/CONFIG.shadowSize,rx=shadowCenter.dot(right),uy=shadowCenter.dot(lightUp);
    shadowCenter.addScaledVector(right,Math.round(rx/texel)*texel-rx).addScaledVector(lightUp,Math.round(uy/texel)*texel-uy);
    if(mode==='core')shadowCenter.set(0,0,0);
    sun.target.position.copy(shadowCenter);sun.position.copy(shadowCenter).add(offset.copy(direction).multiplyScalar(mode==='core'?115:600));
    if(width!==lastWidth){Object.assign(sun.shadow.camera,{left:-width/2,right:width/2,bottom:-width/2,top:width/2,near:1,far:mode==='core'?240:1200});sun.shadow.camera.updateProjectionMatrix();lastWidth=width;}
  }
  return {sun,update,metadata:{date:'2026-06-01',localTime:'10:00 JST',location:[35.676,139.699],solarModel:'fractional-year approximation',direction:direction.toArray(),sky:'procedural gradient with diffuse sky radiance'},dispose(){skyTexture.dispose();skyEnvironment?.dispose();}};
}
