// বাংলাদেশের রাস্তার গাড়ি (Sketchfab, CC-BY; ক্রেডিট assets/vehicles/CREDITS.txt)
// প্রতিটা মডেল: সামনে -Z, চাকা y=0, আসল মাপে। একরঙা অংশগুলো এক ড্র-কলে জোড়া, তারপর InstancedMesh।
import { mergeGeometries } from '/js/vendor/addons/BufferGeometryUtils.js';

// len = আসল দৈর্ঘ্য (মিটার), flip = মডেলের সামনে +Z হলে ঘোরানো, tail = পেছনের বাতির উচ্চতা (মিটার)
export const FLEET = {
  corolla:    { name: 'টয়োটা করোলা', len: 4.63, flip: true, kind: 'car', tail: .82, w: 1.78 },
  noah:       { name: 'টয়োটা নোয়া', len: 4.7, flip: true, kind: 'car', tail: .9, w: 1.7 },
  hiace:      { name: 'হায়েস মাইক্রোবাস', len: 4.84, flip: false, kind: 'van', tail: .95, w: 1.7 },
  hilux:      { name: 'হাইলাক্স পিকআপ', len: 5.3, flip: false, kind: 'car', tail: .95, w: 1.85 },
  bus_hino:   { name: 'হিনো বাস', len: 11.5, flip: true, kind: 'bus', tail: 1.1, w: 2.5 },
  bus_coach:  { name: 'দূরপাল্লার এসি কোচ', len: 12.2, flip: true, kind: 'bus', tail: 1.1, w: 2.5, livery: true },
  bus_aero:   { name: 'হুন্দাই এসি কোচ', len: 12, flip: true, kind: 'bus', tail: 1.1, w: 2.5 },
  bus_mini:   { name: 'লোকাল মিনিবাস', len: 7.2, flip: true, kind: 'bus', tail: 1, w: 2.2 },
  truck_al:   { name: 'অশোক লেল্যান্ড ট্রাক', len: 7.2, flip: true, kind: 'truck', tail: .95, w: 2.35 },
  truck_tata: { name: 'টাটা ট্রাক', len: 7.6, flip: true, kind: 'truck', tail: .95, w: 2.35 },
  cng:        { name: 'সিএনজি', len: 2.65, flip: false, kind: 'cng', tail: .55, w: 1.3 },
  moto:       { name: 'মোটরসাইকেল', len: 2.05, flip: true, kind: 'moto', tail: .8, w: .8 },
  rickshaw:   { name: 'রিকশা', len: 2.6, flip: true, kind: 'rickshaw', tail: 0, w: 1.15 },
  easybike:   { name: 'ইজিবাইক', len: 2.75, flip: false, kind: 'easy', tail: .6, w: 1.1, tint: '#2f7d5b' }
};
export const HIGHWAY = ['corolla', 'noah', 'hiace', 'hilux', 'bus_hino', 'bus_coach', 'bus_aero', 'bus_mini', 'truck_al', 'truck_tata', 'cng', 'moto'];
export const HIGHWAY_LITE = ['corolla', 'noah', 'hiace', 'bus_mini', 'truck_tata', 'cng']; // দুর্বল ফোনে কম ডাউনলোড
export const CREDIT_HTML = 'গাড়ি, বাস, ট্রাক, সিএনজি: Sketchfab-এর শিল্পীরা (ItsDiyor, Nieve5677, DisneyCars, BHP3D, taeemtasbi, agungkuncoro13021986, ImperialBlue3D, 119100, asrafullislamsiam, eriklys, Shivang Jindal), <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC-BY 4.0</a>, বিস্তারিত <a href="/assets/vehicles/CREDITS.txt" target="_blank" rel="noopener">এখানে</a>';

function toFloat(THREE, g, withColor) {
  const out = new THREE.BufferGeometry(), n = g.attributes.position.count;
  for (const [k, s] of [['position', 3], ['normal', 3], ['uv', 2], ['uv1', 2], ['uv2', 2], ['uv3', 2]]) {
    const a = g.attributes[k] || (k.startsWith('uv') ? g.attributes.uv : null), f = new Float32Array(n * s);
    if (a) for (let i = 0; i < n; i++) { f[i * s] = a.getX(i); f[i * s + 1] = a.getY(i); if (s > 2) f[i * s + 2] = a.getZ(i); }
    out.setAttribute(k, new THREE.BufferAttribute(f, s));
  }
  if (withColor) { const f = new Float32Array(n * 3); for (let i = 0; i < n; i++) { f[i * 3] = withColor.r; f[i * 3 + 1] = withColor.g; f[i * 3 + 2] = withColor.b; } out.setAttribute('color', new THREE.BufferAttribute(f, 3)); }
  out.setIndex(g.index ? Array.from(g.index.array) : [...Array(n).keys()]);
  if (!g.attributes.normal) out.computeVertexNormals();
  return out;
}

// একটা গাড়ি লোড করে অংশে ভাগ: [{geo, mat}], আর মাপ
async function loadOne(THREE, loader, key, base, glass) {
  const conf = FLEET[key], g = await loader.loadAsync(base + key + '.glb'), root = g.scene;
  const wrap = new THREE.Group(); wrap.add(root); wrap.updateMatrixWorld(true);
  let b = new THREE.Box3().setFromObject(root, true), s = b.getSize(new THREE.Vector3());
  if (s.x > s.z) root.rotation.y = Math.PI / 2;
  if (conf.flip) root.rotation.y += Math.PI;
  wrap.updateMatrixWorld(true); b = new THREE.Box3().setFromObject(root, true); s = b.getSize(new THREE.Vector3());
  const k = conf.len / s.z; root.scale.multiplyScalar(k); wrap.updateMatrixWorld(true);
  b = new THREE.Box3().setFromObject(root, true); const c = b.getCenter(new THREE.Vector3());
  root.position.x -= c.x; root.position.z -= c.z; root.position.y -= b.min.y; wrap.updateMatrixWorld(true);
  b = new THREE.Box3().setFromObject(root, true); s = b.getSize(new THREE.Vector3());
  const groups = new Map(); let solidR = 0, solidM = 0, solidN = 0;
  root.traverse(o => {
    if (!o.isMesh) return; const m = o.material, tex = m.map || m.normalMap;
    const isGlass = m.transparent && m.opacity < .95 || /glass|window|kach/i.test(m.name || '');
    let gk, geo;
    if (isGlass) { gk = 'glass'; geo = toFloat(THREE, o.geometry); }
    else if (tex) { gk = m.uuid; geo = toFloat(THREE, o.geometry); }
    else { gk = 'solid'; const col = conf.tint ? new THREE.Color(conf.tint) : m.color.clone(); geo = toFloat(THREE, o.geometry, col); solidR += m.roughness ?? .6; solidM += m.metalness ?? 0; solidN++; }
    geo.applyMatrix4(o.matrixWorld);
    if (!groups.has(gk)) groups.set(gk, { mat: m, geos: [] }); groups.get(gk).geos.push(geo);
  });
  const parts = [];
  for (const [gk, G] of groups) {
    const geo = mergeGeometries(G.geos, false); if (!geo) continue; geo.computeBoundingSphere();
    let mat;
    if (gk === 'glass') mat = glass;
    else if (gk === 'solid') mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: Math.min(.9, solidR / solidN), metalness: Math.min(.6, solidM / solidN), envMapIntensity: 1.1 });
    // অনেক মডেলের পেছনের প্যানেল এক-পাশি, তাই দুই পাশ আঁকা
    else { mat = G.mat.clone(); mat.side = THREE.DoubleSide; mat.vertexColors = false; if (conf.tint && mat.color) mat.color.set(conf.tint); if (mat.transparent && mat.opacity > .95) { mat.transparent = false; mat.alphaTest = mat.alphaTest || .5; } }
    parts.push({ geo, mat, glass: gk === 'glass' });
  }
  return { key, conf, parts, size: s };
}

export async function loadFleet(THREE, loader, keys, { base = '/assets/vehicles/', onEach } = {}) {
  const glass = new THREE.MeshPhysicalMaterial({ color: '#0b1016', roughness: .05, metalness: 0, transparent: true, opacity: .6, envMapIntensity: 1.5, clearcoat: 1 });
  const out = {};
  await Promise.all(keys.map(k => loadOne(THREE, loader, k, base, glass).then(v => { out[k] = v; if (onEach) onEach(k); }).catch(e => console.warn('vehicle', k, e))));
  return out;
}

// ট্রাফিক আঁকা: প্রতি ধরনের গাড়ি প্রতি অংশে একটা InstancedMesh; নিচে নরম ছায়া; ব্রেক আর ইন্ডিকেটরের আলো
export function createTraffic(THREE, scene, fleet, { per = 8, shadows = false } = {}) {
  const sets = {}, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), sc = new THREE.Vector3();
  for (const k in fleet) {
    const F = fleet[k], n = /bus|truck/.test(F.conf.kind) ? Math.ceil(per * .7) : per;
    sets[k] = { n, used: 0, meshes: F.parts.map(p => { const im = new THREE.InstancedMesh(p.geo, p.mat, n); im.count = 0; im.frustumCulled = false; im.castShadow = shadows && !p.glass; im.receiveShadow = !p.glass; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(im); return im; }) };
  }
  const MAXL = 200;
  // নিচের নরম ছায়া (blob): সব ফোনে সস্তা
  const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 4, 32, 32, 32); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const bg = new THREE.PlaneGeometry(1, 1); bg.rotateX(-Math.PI / 2);
  const blobs = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), 120);
  blobs.count = 0; blobs.frustumCulled = false; blobs.renderOrder = 1; scene.add(blobs);
  // আলো: ছোট উজ্জ্বল চারকোনা, additive
  const lg = new THREE.PlaneGeometry(.26, .12);
  const lights = new THREE.InstancedMesh(lg, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }), MAXL);
  lights.count = 0; lights.frustumCulled = false; lights.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAXL * 3), 3); scene.add(lights);
  const BR = new THREE.Color(3.2, .2, .1), TL = new THREE.Color(.16, .01, .005), AM = new THREE.Color(3, 1.3, .1), lp = new THREE.Vector3(), lq = new THREE.Quaternion();
  return {
    sets,
    // list: [{type, x, z, yaw, brake, sig (-1/0/1), hit}]; blink = ইন্ডিকেটর জ্বলছে কিনা
    update(list, blink) {
      for (const k in sets) sets[k].used = 0; let nb = 0, nl = 0;
      for (const c of list) {
        const S = sets[c.type]; if (!S || S.used >= S.n) continue; const i = S.used++, F = fleet[c.type];
        e.set(0, c.ry ?? c.yaw ?? 0, c.roll || 0); q.setFromEuler(e); v.set(c.x, 0, c.z); m4.compose(v, q, one);
        for (const im of S.meshes) im.setMatrixAt(i, m4);
        if (nb < 120) { sc.set(F.size.x * 1.25, 1, F.size.z * 1.12); v.set(c.x, .02, c.z); m4.compose(v, q, sc); blobs.setMatrixAt(nb++, m4); }
        if (F.conf.tail && nl < MAXL - 4) {
          const hw = Math.min(F.size.x, F.conf.w) / 2 - .2, rz = F.size.z / 2 + .02;
          for (const sd of [-1, 1]) {
            const on = c.brake || c.hit, sig = (c.sig === sd || c.hit) && blink;
            lp.set(sd * hw, F.conf.tail, rz).applyQuaternion(q).add(v.set(c.x, 0, c.z)); m4.compose(lp, q, one); lights.setMatrixAt(nl, m4); lights.setColorAt(nl++, on ? BR : TL);
            if (sig) { lp.set(sd * (hw + .02), F.conf.tail + .2, rz).applyQuaternion(q).add(v.set(c.x, 0, c.z)); m4.compose(lp, q, one); lights.setMatrixAt(nl, m4); lights.setColorAt(nl++, AM); }
          }
        }
      }
      for (const k in sets) for (const im of sets[k].meshes) { im.count = sets[k].used; im.instanceMatrix.needsUpdate = true; }
      blobs.count = nb; blobs.instanceMatrix.needsUpdate = true; lights.count = nl; lights.instanceMatrix.needsUpdate = true; lights.instanceColor.needsUpdate = true;
    },
    setShadows(on) { for (const k in sets) sets[k].meshes.forEach(im => { im.castShadow = on && !im.material.transparent; }); },
    drawCalls() { let n = 0; for (const k in sets) n += sets[k].meshes.length; return n; }
  };
}
