// বাংলাদেশের মানুষ: পাঞ্জাবি-পায়জামা, ধুতি, সালোয়ার-কামিজ পরা পুরুষ; শাড়ি, হিজাব, বোরকা পরা মহিলা (Sketchfab, CC-BY;
// ক্রেডিট /assets/people/CREDITS.txt)। পুরুষদের হাঁটা আর দাঁড়ানোর নড়াচড়া আসে Renderpeople-এর হাঁটা থেকে (CC-BY, /games/racer/assets/CREDITS.txt),
// প্রতি ফ্রেমে হাড় থেকে হাড়ে বসানো (retarget)। শাড়ি-বোরকায় পা ঢাকা, তাই মহিলাদের হাঁটা হালকা দোলা আর ওঠানামা দিয়ে দেখানো।
// ব্যবহার আগের মতোই: const P = await loadPeople(THREE, GLTFLoader, MeshoptDecoder, cloneSkinned);
//   const h = P.make(i, { scale: .8 }); scene.add(h.root); প্রতি ফ্রেমে h.update(dt, চলছে কিনা 0-1, দৌড় গতি);
// খেলার পোশাক: loadPeople(..., { kits: ['cricket'] }) আর make(i, { kit: 'cricket' }) = সবুজ-লাল জার্সির ক্রিকেটার।
// i % 5 অনুযায়ী লিঙ্গ আগের মতোই: ০ পুরুষ, ১ মহিলা, ২ মহিলা, ৩ পুরুষ, ৪ মহিলা। মানুষ +z দিকে মুখ করে থাকে। scale .78-.85 = কিশোর।
const RA = '/games/racer/assets/', PA = '/assets/people/';
const MEN = [['bd_pj_blue', 1.72], ['bd_pj_red', 1.74], ['bd_oldman', 1.66], ['bd_shalwar_sit', 1.75]];
const WOMEN = [['bd_saree', 1.56], ['bd_w_saree_red', 1.57], ['bd_w_abaya', 1.6], ['bd_w_saree_blue', 1.55]];
const SEX = 'MFFMF';
const SRC = { hip: 'Hips', neck: 'Neck', head: 'Head', shoulder_l: 'LeftShoulder', upperarm_l: 'LeftArm', lowerarm_l: 'LeftForeArm', hand_l: 'LeftHand', shoulder_r: 'RightShoulder', upperarm_r: 'RightArm', lowerarm_r: 'RightForeArm', hand_r: 'RightHand',
  upperleg_l: 'LeftUpLeg', lowerleg_l: 'LeftLeg', foot_l: 'LeftFoot', ball_l: 'LeftToeBase', upperleg_r: 'RightUpLeg', lowerleg_r: 'RightLeg', foot_r: 'RightFoot', ball_r: 'RightToeBase' };
const CHILD = { hip: null, spine_01: 'spine_02', spine_02: 'spine_03', spine_03: 'neck', neck: 'head', head: null, shoulder_l: 'upperarm_l', upperarm_l: 'lowerarm_l', lowerarm_l: 'hand_l', hand_l: null, shoulder_r: 'upperarm_r', upperarm_r: 'lowerarm_r', lowerarm_r: 'hand_r', hand_r: null,
  upperleg_l: 'lowerleg_l', lowerleg_l: 'foot_l', foot_l: 'ball_l', ball_l: null, upperleg_r: 'lowerleg_r', lowerleg_r: 'foot_r', foot_r: 'ball_r', ball_r: null };
const ORDER = ['hip', 'spine_01', 'spine_02', 'spine_03', 'neck', 'head', 'shoulder_l', 'upperarm_l', 'lowerarm_l', 'hand_l', 'shoulder_r', 'upperarm_r', 'lowerarm_r', 'hand_r', 'upperleg_l', 'lowerleg_l', 'foot_l', 'ball_l', 'upperleg_r', 'lowerleg_r', 'foot_r', 'ball_r'];
const norm = n => n.replace(/^mixamorig:?/, '').replace(/_\d+$/, '');

export async function loadPeople(THREE, GLTFLoader, MeshoptDecoder, cloneSkinned, { kits = [] } = {}) {
  const L = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const [nathan, sophia] = await Promise.all(['nathan', 'sophia'].map(k => L.loadAsync(RA + 'p_' + k + '.glb')));
  const walk = nathan.animations[0], idle = sophia.animations[0];
  const load = list => Promise.all(list.map(([k, h]) => L.loadAsync(PA + k + '.glb').then(g => ({ k, h, g })).catch(e => { console.warn('people', k, e); return null; })));
  const [men, women, kitL] = await Promise.all([load(MEN), load(WOMEN), load(kits.map(k => ['bd_' + k, 1.76]))]);
  const KIT = Object.fromEntries(kitL.filter(Boolean).map(r => [r.k.slice(3), r]));
  if (window.KH_PEOPLE_DEBUG) console.log('men', men.map(x => x && x.k).join(','), 'women', women.map(x => x && x.k).join(','));
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), v4 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), q3 = new THREE.Quaternion();
  const bonesOf = o => { const m = {}; o.traverse(b => { if (b.isBone) m[norm(b.name)] = b; }); return m; };
  // উৎস (Renderpeople) হাড়ের নাম -> লক্ষ্য হাড়
  function mapBones(src, tgt) {
    const S = {}, T = {}; for (const k of ORDER) { if (src[k]) S[k] = src[k]; }
    for (const k in SRC) if (tgt[SRC[k]]) T[k] = tgt[SRC[k]];
    const hips = tgt.Hips, neck = tgt.Neck || tgt.neck; if (neck) T.neck = neck;
    if (hips && neck) { const chain = []; let b = neck.parent; while (b && b !== hips) { chain.unshift(b); b = b.parent; } ['spine_01', 'spine_02', 'spine_03'].forEach((k, i) => { const t = chain[Math.round(i * (chain.length - 1) / 2)]; if (t && !Object.values(T).includes(t)) T[k] = t; }); }
    return ORDER.filter(k => S[k] && T[k]).map(k => ({ k, s: S[k], t: T[k] }));
  }
  function makeRigged(R, scale, shadow) {
    const ghost = cloneSkinned(nathan.scene); ghost.scale.setScalar(.01); ghost.traverse(m => { if (m.isMesh) m.visible = false; });
    const o = cloneSkinned(R.g.scene); o.traverse(m => { if (m.isMesh) { m.castShadow = shadow; m.frustumCulled = false; } });
    const root = new THREE.Group(), fit = new THREE.Group(); fit.add(o); root.add(fit);
    fit.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o, true), s = R.h * scale / Math.max(.01, bb.max.y - bb.min.y); const cc = bb.getCenter(new THREE.Vector3()); fit.scale.setScalar(s); fit.position.set(-cc.x * s, -bb.min.y * s, -cc.z * s);
    ghost.updateMatrixWorld(true); root.updateMatrixWorld(true);
    const pairs = mapBones(bonesOf(ghost), bonesOf(o)), byK = Object.fromEntries(pairs.map(p => [p.k, p]));
    // বিশ্রামের ভঙ্গি মেলানো: প্রতিটা হাড় উৎসের মতো একই দিকে তাক করা (A-পোজ বনাম T-পোজ)
    for (const p of pairs) { const c = byK[CHILD[p.k]]; if (!c) continue;
      p.s.getWorldPosition(v1); c.s.getWorldPosition(v2); v2.sub(v1).normalize(); p.t.getWorldPosition(v3); c.t.getWorldPosition(v4); v4.sub(v3).normalize(); if (v4.lengthSq() < 1e-6) continue;
      q1.setFromUnitVectors(v4, v2); p.t.getWorldQuaternion(q2); q2.premultiply(q1); p.t.parent.getWorldQuaternion(q3); p.t.quaternion.copy(q3.invert().multiply(q2)); p.t.updateMatrixWorld(true); }
    for (const p of pairs) { p.sRestInv = p.s.getWorldQuaternion(new THREE.Quaternion()).invert(); p.tRest = p.t.getWorldQuaternion(new THREE.Quaternion()); }
    const ghip = byK.hip && byK.hip.s, hipY0 = ghip ? ghip.getWorldPosition(new THREE.Vector3()).y : 0, fitY = fit.position.y;
    const mx = new THREE.AnimationMixer(ghost), w = mx.clipAction(walk), id = mx.clipAction(idle); w.play(); id.play(); w.time = Math.random() * 2; id.time = Math.random() * 3; w.weight = 0;
    let b = 0; const top = new THREE.Quaternion(), topInv = new THREE.Quaternion();
    return { root, update(dt, moving, speed = 1) {
      b += ((moving ? 1 : 0) - b) * Math.min(1, dt * 6); w.weight = b; id.weight = 1 - b; w.timeScale = speed; mx.update(dt); ghost.updateMatrixWorld(true);
      root.updateWorldMatrix(true, false); root.getWorldQuaternion(top); topInv.copy(top).invert();
      for (const p of pairs) { p.s.getWorldQuaternion(q1); q1.multiply(p.sRestInv).multiply(p.tRest); q1.premultiply(top); p.t.parent.getWorldQuaternion(q2); p.t.quaternion.copy(q2.invert().multiply(q1)); p.t.updateMatrixWorld(true); }
      if (ghip) fit.position.y = fitY + (ghip.getWorldPosition(v1).y - hipY0) * R.h * scale / 1.75; } };
  }
  function makeStatic(R, scale, shadow) {
    const o = R.g.scene.clone(true); o.traverse(m => { if (m.isMesh) { m.castShadow = shadow; m.frustumCulled = false; } });
    const root = new THREE.Group(), fit = new THREE.Group(), sway = new THREE.Group(); sway.add(fit); fit.add(o); root.add(sway);
    fit.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o), c = bb.getCenter(new THREE.Vector3()), s = R.h * scale / Math.max(.01, bb.max.y - bb.min.y); fit.scale.setScalar(s); fit.position.set(-c.x * s, -bb.min.y * s, -c.z * s);
    let t = Math.random() * 10, b = 0;
    return { root, update(dt, moving, speed = 1) { b += ((moving ? 1 : 0) - b) * Math.min(1, dt * 6); t += dt * (1 + b * (speed * 1.8 - 1)); const ph = t * 5.2;
      sway.position.y = b * Math.abs(Math.sin(ph)) * .028 * scale; sway.rotation.z = b * Math.sin(ph) * .035; sway.rotation.y = b * Math.sin(ph) * .06; sway.rotation.x = b * .04;
      sway.scale.y = 1 + (1 - b) * Math.sin(t * 1.6) * .004; } };
  }
  const M = men.filter(Boolean), F = women.filter(Boolean);
  // কিছু লোড না হলে পুরনো Renderpeople মানুষ
  if (!M.length || !F.length) { const KEYS = ['nathan', 'carla', 'claudia', 'eric', 'sophia']; const gs = await Promise.all(KEYS.map(k => L.loadAsync(RA + 'p_' + k + '.glb')));
    return { count: 5, make(i, { scale = 1, shadow = true } = {}) { const o = cloneSkinned(gs[i % 5].scene); o.scale.setScalar(.01 * scale); o.traverse(m => { if (m.isMesh) { m.castShadow = shadow; m.frustumCulled = false; } }); const root = new THREE.Group(); root.add(o); const mx = new THREE.AnimationMixer(o), w = mx.clipAction(walk), id = mx.clipAction(idle); w.play(); id.play(); w.weight = 0; let b = 0; return { root, update(dt, moving, speed = 1) { b += ((moving ? 1 : 0) - b) * Math.min(1, dt * 6); w.weight = b; id.weight = 1 - b; w.timeScale = speed; mx.update(dt); } }; } }; }
  return {
    count: 5,
    make(i, { scale = 1, shadow = true, kit } = {}) { if (kit && KIT[kit]) return makeRigged(KIT[kit], scale, shadow); const male = SEX[((i % 5) + 5) % 5] === 'M', k = Math.floor(i / 5) + (i % 5);
      if (male) { const R = M[k % M.length]; return R.g.animations !== undefined && R.g.scene.getObjectByProperty('isSkinnedMesh', true) ? makeRigged(R, scale, shadow) : makeStatic(R, scale, shadow); }
      return makeStatic(F[k % F.length], scale, shadow); }
  };
}
