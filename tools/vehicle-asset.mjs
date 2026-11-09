// Sketchfab-এর গাড়ির মডেল (CC-BY) খেলার উপযোগী করা → assets/vehicles/*.glb
// রিপোর বাইরে চালান: npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer sharp
//   node vehicle-asset.mjs raw.glb out.glb <ত্রিভুজ বাজেট> <টেক্সচার px> "<বাদ দেওয়ার নামের regex>"
//   পরিবেশ: MODE=regular (আকৃতি ঠিক রেখে), NOOUT=1 (বাইরের টুকরা ছাঁটাই বন্ধ), OPAQUE=1 (কাচ ছাড়া সব অস্বচ্ছ)
// যেমন: node vehicle-asset.mjs cng.glb cng.glb 7000 512 "battery|dash|switch|key|seat_support|steer|spring|bolt"
// বাংলাদেশি গাড়ির মডেল (Sketchfab, CC-BY) খেলার উপযোগী করা: আবর্জনা অংশ বাদ, উপাদান অনুযায়ী জোড়া, ত্রিভুজ বাজেট, ছোট টেক্সচার
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { compactPrimitive, meshopt, prune, dedup, weld, simplify, textureCompress, quantize, flatten, join, getBounds, resample } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
await MeshoptEncoder.ready; await MeshoptSimplifier.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const [src, dst, target, tex, removeRe, errArg] = process.argv.slice(2);
const doc = await io.read(src), root = doc.getRoot(), scene = root.listScenes()[0];
const rm = removeRe ? new RegExp(removeRe, 'i') : null;
const tris = n => { let t = 0; const m = n.getMesh(); if (m) for (const p of m.listPrimitives()) t += (p.getIndices()?.getCount() || p.getAttribute('POSITION').getCount()) / 3; return t; };
const meshNodes = () => root.listNodes().filter(n => n.getMesh());
// ১) নাম দিয়ে বাদ (ভেতরের জিনিস, গাছের পাতা ইত্যাদি)
for (const n of meshNodes()) { const nm = n.getName() + ' ' + n.getMesh().listPrimitives().map(p => p.getMaterial()?.getName() || '').join(' '); if ((rm && rm.test(nm)) || /leaves|leaf|tree_small/i.test(nm)) n.dispose(); }
// ২) আসল গাড়ির বাইরে পড়ে থাকা টুকরা বা ব্যাকড্রপ বাদ: সবচেয়ে বড় অংশগুলোর বাক্স = গাড়ির শরীর (NOOUT=1 দিলে বন্ধ)
if (!process.env.NOOUT) {
  const ns = meshNodes().map(n => ({ n, t: tris(n), b: getBounds(n) })).sort((a, b) => b.t - a.t), tot = ns.reduce((a, x) => a + x.t, 0);
  const core = { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] }; let acc = 0;
  for (const x of ns) { if (acc > tot * .6) break; acc += x.t; for (let i = 0; i < 3; i++) { core.min[i] = Math.min(core.min[i], x.b.min[i]); core.max[i] = Math.max(core.max[i], x.b.max[i]); } }
  const cs = core.max.map((v, i) => v - core.min[i]); let dropped = 0;
  for (const x of ns) {
    const c = x.b.min.map((v, i) => (v + x.b.max[i]) / 2), s = x.b.max.map((v, i) => v - x.b.min[i]);
    const out = c.some((v, i) => v < core.min[i] - cs[i] * .12 || v > core.max[i] + cs[i] * .12), huge = s.some((v, i) => v > cs[i] * 1.35);
    if (out || huge) { x.n.dispose(); dropped++; }
  }
  console.log('dropped outliers', dropped);
}
// ৩) কাচ ছাড়া সব উপাদান অস্বচ্ছ (কিছু মডেলে পুরো গাড়ির গা স্বচ্ছ হয়ে যায়)
for (const m of root.listMaterials()) { const nm = m.getName().toLowerCase(); if (process.env.OPAQUE && m.getAlphaMode() === 'BLEND' && !/glass|window|windo|kach|light|lamp|wind/.test(nm)) m.setAlphaMode('OPAQUE'); m.setDoubleSided(false); }
await doc.transform(prune(), dedup(), flatten(), join(), weld({}));
let total = 0; for (const n of meshNodes()) total += tris(n);
const ratio = Math.min(1, +target / total);
// sloppy সরলীকরণ: সেলাই (seam) উপেক্ষা করে নির্দিষ্ট সংখ্যক ত্রিভুজে নামায়; দূরের ট্রাফিকের জন্য যথেষ্ট
// MODE=regular: শুধু সাধারণ সরলীকরণ (আকৃতি ঠিক থাকে); না হলে আগে সাধারণ, তারপর দরকার হলে sloppy
await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: process.env.MODE === 'regular' ? .03 : .06, lockBorder: false }));
let mid = 0; for (const n of meshNodes()) mid += tris(n);
const ratio2 = process.env.MODE === 'regular' ? 1 : Math.min(1, +target / mid);
for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
  const idx = p.getIndices(), pos = p.getAttribute('POSITION'); if (!idx || ratio2 >= .85) continue;
  const n = idx.getCount(), want = Math.max(36, Math.floor(n * ratio2 / 3) * 3); if (want >= n) continue;
  const I = new Uint32Array(idx.getArray()), P = new Float32Array(pos.getCount() * 3), el = [];
  for (let i = 0; i < pos.getCount(); i++) { pos.getElement(i, el); P.set(el, i * 3); }
  const [out] = MeshoptSimplifier.simplifySloppy(I, P, 3, null, want, 1);
  idx.setArray(pos.getCount() > 65535 ? out : new Uint16Array(out)); compactPrimitive(p);
}
await doc.transform(
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [+tex, +tex], quality: 78 }),
  resample(), prune(), dedup(), quantize());
let after = 0; for (const n of meshNodes()) after += tris(n);
const B = getBounds(root.listScenes()[0]);
await io.write(dst, doc);
try { const d2 = await io.read(dst); await d2.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' })); await io.write(dst, d2); } catch (e) { console.log('meshopt বাদ (শুধু quantize)'); await io.write(dst, doc); }
console.log(dst.split('/').pop(), 'tris', Math.round(total), '→', Math.round(after), 'meshes', meshNodes().length, 'mats', root.listMaterials().length, 'size', B.max.map((v, i) => (v - B.min[i]).toFixed(2)).join('x'));
