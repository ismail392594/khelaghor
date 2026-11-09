// পশুর মডেল (Sketchfab, CC-BY) ছোট করা: অ্যানিমেশন রেখে পলিগন কমানো, টেক্সচার webp, quantize + meshopt।
//   node tools/animal-asset.mjs raw/cow.glb games/haat/assets/cow.glb 0.5 512 [রাখার অ্যানিমেশনের নাম, কমা দিয়ে]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, prune, dedup, weld, simplify, textureCompress, quantize, resample } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const [src, dst, ratio, tex, keep] = process.argv.slice(2);
const doc = await io.read(src), root = doc.getRoot();
const K = keep ? keep.split(',') : null;
for (const a of root.listAnimations()) { if (K && !K.some(k => a.getName().includes(k))) { a.dispose(); continue; } for (const ch of a.listChannels()) if (ch.getTargetPath() === 'scale') ch.dispose(); }
for (const m of root.listMaterials()) { m.setMetallicFactor(0); m.setMetallicRoughnessTexture(null); }
await doc.transform(resample({ tolerance: 2e-3 }), prune(), dedup(), weld({}),
  simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: .002 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [+tex, +tex], quality: 78 }),
  quantize(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
let t = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) t += (p.getIndices()?.getCount() || 0) / 3;
await io.write(dst, doc); console.log(dst, t, 'tris', root.listAnimations().map(a => a.getName()).join(' | '));
