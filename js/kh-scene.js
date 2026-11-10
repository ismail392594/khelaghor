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
// দর্শক: বাংলাদেশি মানুষের ছবি (games/racer/assets/people.webp, ৯ ঘর) instanced সমতলে; উত্তেজনায় লাফায়। বসা দর্শক একটু পেছনে আর ছোট।
export function crowd(THREE, scene, spots) {
  const n = spots.length, t = new THREE.TextureLoader().load('/games/racer/assets/people.webp'); t.colorSpace = THREE.SRGBColorSpace;
  const g = new THREE.PlaneGeometry(.9, 1.8); g.translate(0, .9, 0); g.setAttribute('cell', new THREE.InstancedBufferAttribute(new Float32Array(n).map(() => Math.floor(Math.random() * 9)), 1));
  const m = new THREE.MeshStandardMaterial({ map: t, alphaTest: .5, side: THREE.DoubleSide, roughness: .9 });
  m.onBeforeCompile = sh => { sh.vertexShader = 'attribute float cell;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = vec2((vMapUv.x + cell) / 9.0, vMapUv.y);\n#endif'); };
  const im = new THREE.InstancedMesh(g, m, n); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; scene.add(im);
  const camP = new THREE.Vector3(0, 10, 30); im.onBeforeRender = (r, sc, c) => camP.copy(c.position);
  spots.forEach(s => { s.ph = s.ph ?? Math.random() * 6; s.sc = (s.sit ? .86 : 1) * (.92 + Math.random() * .16); });
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), e = new THREE.Euler();
  return function update(T0, excite = 0) {
    spots.forEach((s, i) => { const jump = Math.max(0, Math.sin(T0 * (5 + excite * 4) + s.ph)) * (.015 + excite * .18) * (s.sit ? .4 : 1);
      e.set(0, Math.atan2(camP.x - s.x, camP.z - s.z), Math.sin(T0 * 1.6 + s.ph) * .02); q.setFromEuler(e); v.set(s.x, jump, s.z); sc.setScalar(s.sc); m4.compose(v, q, sc); im.setMatrixAt(i, m4); });
    im.instanceMatrix.needsUpdate = true;
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
