export function disposeScene(scene) {
  const geometries=new Set(),materials=new Set(),textures=new Set();
  scene.traverse(o=>{
    if(o.geometry)geometries.add(o.geometry);
    if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);
    if(o.customDepthMaterial)materials.add(o.customDepthMaterial);
    if(o.isInstancedMesh)o.dispose();
  });
  for(const m of materials){for(const value of Object.values(m))if(value?.isTexture)textures.add(value);m.dispose();}
  geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());scene.clear();
}
