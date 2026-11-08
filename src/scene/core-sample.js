import * as THREE from 'three';
import { VIEWS } from '../config.js';
import { createTerrain } from './terrain.js';
import { createArchitecture, createTorii } from './architecture.js';
import { createProps } from './props.js';
import { createForest } from './forest.js';

export function createCoreSample(scene,m,time) {
  createTerrain(scene,m);createArchitecture(scene,m);createTorii(scene,m);createProps(scene,m);
  const counts=createForest(scene,m,time);
  return {bounds:new THREE.Box3(new THREE.Vector3(-40,-3.8,-40),new THREE.Vector3(40,17,40)),views:VIEWS,cameraDistance:180,counts,update(){},dispose(){}};
}
