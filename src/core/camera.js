import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VIEWS } from '../config.js';

export function createCamera(canvas,{views=VIEWS,bounds,distance=180}={}) {
  const diagonal=bounds?bounds.getSize(new THREE.Vector3()).length():115;
  const camera=new THREE.OrthographicCamera(-70,70,50,-50,0.2,Math.max(450,distance+diagonal*2));
  const limits=bounds?{minX:bounds.min.x+10,maxX:bounds.max.x-10,minZ:bounds.min.z+10,maxZ:bounds.max.z-10}:{minX:-30,maxX:30,minZ:-30,maxZ:30};
  let span=views[1].span,transition=null,zoomTarget=1;
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const onWheel=e=>{
    e.preventDefault();e.stopImmediatePropagation();transition=null;
    zoomTarget=THREE.MathUtils.clamp(zoomTarget*Math.exp(-e.deltaY*0.0011),0.7,4.8);
  };
  canvas.addEventListener('wheel',onWheel,{passive:false});
  const controls=new OrbitControls(camera,canvas);
  controls.enableDamping=true;controls.dampingFactor=0.065;
  controls.rotateSpeed=0.58;controls.panSpeed=0.75;controls.zoomSpeed=0.7;
  controls.minPolarAngle=0.025;controls.maxPolarAngle=Math.PI*0.46;
  controls.minZoom=0.7;controls.maxZoom=4.8;controls.screenSpacePanning=false;
  controls.addEventListener('start',()=>{transition=null;zoomTarget=camera.zoom;});
  function resize(width=innerWidth,height=innerHeight) {
    const aspect=width/height;
    // Preserve room for the diagonal of the square even on a portrait display.
    const vertical=span*Math.max(1,1.2/aspect);
    camera.left=-vertical*aspect/2;camera.right=vertical*aspect/2;
    camera.top=vertical/2;camera.bottom=-vertical/2;camera.updateProjectionMatrix();
  }
  function preset(id,instant=false) {
    const view=views[id];if(!view)return;
    controls.update();
    // Orthographic framing is independent of distance. Keep the camera outside
    // the entire forest so close presets never slice foreground geometry.
    const destination=new THREE.Vector3(...view.position).sub(new THREE.Vector3(...view.target)).normalize().multiplyScalar(distance).add(new THREE.Vector3(...view.target));
    if(instant||reduceMotion) {
      camera.position.copy(destination);controls.target.set(...view.target);span=view.span;camera.zoom=zoomTarget=1;resize();controls.update();transition=null;
    } else transition={time:0,from:camera.position.clone(),to:destination,targetFrom:controls.target.clone(),targetTo:new THREE.Vector3(...view.target),spanFrom:span,spanTo:view.span,zoomFrom:camera.zoom};
  }
  function update(dt) {
    if(transition) {
      const t=transition;t.time=Math.min(1,t.time+dt/1.65);
      const ease=t.time*t.time*(3-2*t.time);
      camera.position.lerpVectors(t.from,t.to,ease);controls.target.lerpVectors(t.targetFrom,t.targetTo,ease);
      span=THREE.MathUtils.lerp(t.spanFrom,t.spanTo,ease);camera.zoom=THREE.MathUtils.lerp(t.zoomFrom,1,ease);zoomTarget=camera.zoom;
      resize();if(t.time===1){transition=null;zoomTarget=1;}
    } else if(Math.abs(camera.zoom-zoomTarget)>0.0001) {
      camera.zoom=THREE.MathUtils.lerp(camera.zoom,zoomTarget,1-Math.exp(-dt*12));camera.updateProjectionMatrix();
    }
    controls.update();
    const before=controls.target.clone();
    controls.target.x=THREE.MathUtils.clamp(controls.target.x,limits.minX,limits.maxX);
    controls.target.z=THREE.MathUtils.clamp(controls.target.z,limits.minZ,limits.maxZ);
    controls.target.y=THREE.MathUtils.clamp(controls.target.y,0,12);
    camera.position.add(controls.target.clone().sub(before));
  }
  const onKey=e=>{
    if(e.altKey||e.ctrlKey||e.metaKey)return;
    if(views[e.key])preset(e.key);
    if(e.key.toLowerCase()==='r'||e.key==='Home')preset(1);
  };
  window.addEventListener('keydown',onKey);preset(1,true);
  return {camera,controls,resize,update,preset,dispose(){controls.dispose();canvas.removeEventListener('wheel',onWheel);window.removeEventListener('keydown',onKey);}};
}
