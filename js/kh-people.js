// আসল মানুষ (Renderpeople-এর 3D স্ক্যান, CC-BY; ক্রেডিট /games/racer/assets/CREDITS.txt): হাঁটা আর দাঁড়ানো, যেকোনো গেমে।
// ব্যবহার: const P = await loadPeople(THREE, GLTFLoader, MeshoptDecoder, cloneSkinned);
//          const h = P.make(i, { scale: .8 }); scene.add(h.root); প্রতি ফ্রেমে h.update(dt, চলছে কিনা 0-1, দৌড় গতি);
// মানুষ +z দিকে মুখ করে থাকে। scale .78-.85 দিলে কিশোর-কিশোরীর মাপ।
const A = '/games/racer/assets/', KEYS = ['nathan', 'carla', 'claudia', 'eric', 'sophia'];
export async function loadPeople(THREE, GLTFLoader, MeshoptDecoder, cloneSkinned) {
  const L = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gs = await Promise.all(KEYS.map(k => L.loadAsync(A + 'p_' + k + '.glb'))), walk = gs[0].animations[0], idle = gs[4].animations[0];
  return {
    count: KEYS.length,
    make(i, { scale = 1, shadow = true } = {}) {
      const o = cloneSkinned(gs[i % KEYS.length].scene); o.scale.setScalar(.01 * scale);
      o.traverse(m => { if (m.isMesh) { m.castShadow = shadow; m.frustumCulled = false; } });
      const root = new THREE.Group(); root.add(o);
      const mx = new THREE.AnimationMixer(o), w = mx.clipAction(walk), id = mx.clipAction(idle); w.play(); id.play(); w.time = Math.random() * 2; id.time = Math.random() * 3; w.weight = 0;
      let b = 0;
      return { root, update(dt, moving, speed = 1) { b += ((moving ? 1 : 0) - b) * Math.min(1, dt * 6); w.weight = b; id.weight = 1 - b; w.timeScale = speed; mx.update(dt); } };
    }
  };
}
