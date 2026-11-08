import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const up = new THREE.Vector3(0, 1, 0);
export class Builder {
  constructor() { this.batches = new Map(); this.parts = 0; }
  add(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale));
    geometry.applyMatrix4(matrix);
    if (!geometry.attributes.uv) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geometry.attributes.position.count * 2), 2));
    const normalized = geometry.index ? geometry.toNonIndexed() : geometry;
    if (normalized !== geometry) geometry.dispose();
    if (!this.batches.has(material)) this.batches.set(material, []);
    this.batches.get(material).push(normalized);
    this.parts++;
  }
  box(x, y, z, w, h, d, material, rotation = [0, 0, 0], bevel = 0) {
    const geo = bevel ? new RoundedBoxGeometry(w, h, d, 1, bevel) : new THREE.BoxGeometry(w, h, d);
    this.add(geo, material, [x, y, z], rotation);
  }
  cylinder(x, y, z, rt, rb, h, material, rotation = [0, 0, 0], segments = 12) {
    this.add(new THREE.CylinderGeometry(rt, rb, h, segments), material, [x, y, z], rotation);
  }
  beam(a, b, radius, material, endRadius = radius) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b), delta = to.clone().sub(from);
    const geometry = new THREE.CylinderGeometry(endRadius, radius, delta.length(), 8);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, delta.normalize()));
    this.add(geometry, material, from.add(to).multiplyScalar(0.5).toArray());
  }
  tube(points, radius, material, segments = 40) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    this.add(new THREE.TubeGeometry(curve, segments, radius, 5, false), material);
  }
  finish(parent, name = 'static') {
    const group = new THREE.Group(); group.name = name;
    for (const [material, parts] of this.batches) {
      const geometry = mergeGeometries(parts, false);
      if (!geometry) throw new Error(`Cannot merge ${name}`);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.name = `${name}:${material.name || material.type}`;
      group.add(mesh); parts.forEach(p => p.dispose());
    }
    this.batches.clear(); parent.add(group); return group;
  }
}

export function surfaceGeometry(vertices, indices) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices); g.computeVertexNormals();
  const uv = [];
  for (let i = 0; i < vertices.length; i += 3) uv.push(vertices[i] * 0.13, vertices[i + 2] * 0.13);
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}
