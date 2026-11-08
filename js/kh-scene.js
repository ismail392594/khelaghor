// খেলাঘরের মাঠের সাজ: ঘাসের গোছা, ৩ডি দর্শক, আর হালকা গ্লো (bloom)। সব গেমে একই মানের পরিবেশের জন্য।
import { EffectComposer } from '/js/vendor/addons/EffectComposer.js';
import { RenderPass } from '/js/vendor/addons/RenderPass.js';
import { UnrealBloomPass } from '/js/vendor/addons/UnrealBloomPass.js';
import { OutputPass } from '/js/vendor/addons/OutputPass.js';

const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
export const isLow = () => (navigator.hardwareConcurrency || 4) <= 4 && /Android|iPhone/i.test(navigator.userAgent) && (navigator.deviceMemory || 4) <= 3;

// ঘাসের গোছা: skip(x, z) true হলে সেখানে ঘাস হবে না (যেমন মাঠের ভেতর)
export function grassTufts(THREE, scene, { n = 1500, range = 24, skip = () => false, hue = [.2, .28] } = {}) {
  const g = new THREE.ConeGeometry(.06, .28, 4); g.translate(0, .14, 0);
  const im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); let k = 0, guard = 0;
  while (k < n && guard++ < n * 20) { const x = rnd(-range, range), z = rnd(-range, range); if (skip(x, z)) continue; q.setFromEuler(new THREE.Euler(rnd(-.3, .3), rnd(0, 6), rnd(-.3, .3))); const s = rnd(.6, 1.5); m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * rnd(.7, 1.4), s)); im.setMatrixAt(k, m4); im.setColorAt(k, c.setHSL(rnd(hue[0], hue[1]), .5, rnd(.22, .36))); k++; }
  im.count = k; im.receiveShadow = true; scene.add(im); return im;
}

// দর্শক: spots = [{x, z, ry, sit}] ; ফেরত দেয় update(T0, excite)
export function crowd(THREE, scene, spots, { colors } = {}) {
  const n = spots.length, bodyG = new THREE.CapsuleGeometry(.17, .42, 4, 8), headG = new THREE.SphereGeometry(.13, 10, 8), hairG = new THREE.SphereGeometry(.137, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const armG = new THREE.CapsuleGeometry(.05, .32, 3, 6);
  const M = (c, r) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const bodies = new THREE.InstancedMesh(bodyG, M('#ffffff', .85), n), heads = new THREE.InstancedMesh(headG, M('#ffffff', .7), n), hairs = new THREE.InstancedMesh(hairG, M('#120c08', .8), n), arms = new THREE.InstancedMesh(armG, M('#ffffff', .75), n * 2);
  const cl = colors || ['#e74c3c', '#2563eb', '#16a34a', '#f59e0b', '#9333ea', '#f5f5f5', '#0ea5e9', '#ec4899', '#facc15', '#1f2937'], sk = ['#9a6a4f', '#6e4532', '#b58467', '#83563d'], c = new THREE.Color();
  spots.forEach((s, i) => { s.ph = s.ph ?? Math.random() * 6; s.fan = Math.random() < .35; bodies.setColorAt(i, c.set(pick(cl))); const skc = pick(sk); heads.setColorAt(i, c.set(skc)); arms.setColorAt(i * 2, c.set(skc)); arms.setColorAt(i * 2 + 1, c.set(skc)); });
  bodies.castShadow = true; [bodies, heads, hairs, arms].forEach(m => { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qa = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), e = new THREE.Euler(), off = new THREE.Vector3();
  return function update(T0, excite = 0) {
    spots.forEach((s, i) => {
      const jump = Math.max(0, Math.sin(T0 * (5 + excite * 4) + s.ph)) * (.03 + excite * .25) * (s.sit ? .4 : 1), base = s.sit ? .32 : .55;
      e.set(0, s.ry, Math.sin(T0 * 2 + s.ph) * .05); q.setFromEuler(e); v.set(s.x, base + jump, s.z); sc.set(1, s.sit ? .7 : 1, 1); m4.compose(v, q, sc); bodies.setMatrixAt(i, m4);
      v.set(s.x, base + jump + (s.sit ? .48 : .58), s.z); sc.set(1, 1, 1); m4.compose(v, q, sc); heads.setMatrixAt(i, m4); v.y += .02; m4.compose(v, q, sc); hairs.setMatrixAt(i, m4);
      const up = (s.fan || excite > .5) ? (excite > .3 ? 1 : .5 + Math.sin(T0 * 3 + s.ph) * .5) : 0;
      for (const sd of [-1, 1]) { const wave = up ? Math.sin(T0 * 9 + s.ph + sd) * .3 : 0; e.set(0, s.ry, sd * (.25 + up * 2.4 + wave)); qa.setFromEuler(e); off.set(sd * .22, s.sit ? .15 : .22, 0).applyQuaternion(q); v.set(s.x + off.x, base + jump + off.y + (up ? .12 : -.05), s.z + off.z); m4.compose(v, qa, sc); arms.setMatrixAt(i * 2 + (sd > 0 ? 1 : 0), m4); }
    });
    bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = hairs.instanceMatrix.needsUpdate = arms.instanceMatrix.needsUpdate = true;
  };
}
// আয়তাকার মাঠের চারপাশে দর্শকের জায়গা
export function ringSpots(w, l, rows, perSide, gap = 1.5) {
  const out = [];
  rows.forEach((dist, ri) => { for (const side of [0, 1, 2, 3]) { const n = perSide[side % 2] - ri; for (let i = 0; i < n; i++) { const t = (i + .5) / n - .5; let x, z, ry; if (side === 0) { x = t * (w + 2); z = -l / 2 - dist; ry = 0; } else if (side === 1) { x = t * (w + 2); z = l / 2 + dist; ry = Math.PI; } else if (side === 2) { x = -w / 2 - dist; z = t * (l + 2); ry = Math.PI / 2; } else { x = w / 2 + dist; z = t * (l + 2); ry = -Math.PI / 2; } out.push({ x: x + rnd(-.15, .15), z: z + rnd(-.15, .15), ry, sit: ri === 0, side }); } } });
  return out;
}
// হালকা গ্লো: দুর্বল ফোনে বন্ধ
export function composerFor(THREE, renderer, scene, cam, { strength = .35, radius = .55, threshold = .86 } = {}) {
  if (!renderer || isLow()) return null;
  const c = new EffectComposer(renderer); c.addPass(new RenderPass(scene, cam)); c.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), strength, radius, threshold)); c.addPass(new OutputPass()); return c;
}
