// Renderpeople-এর হাড়ওয়ালা মানুষ (Sketchfab, CC-BY) ছোট করা: হাড়ের নাম এক রকম করা (যাতে একজনের হাঁটা সবার গায়ে লাগে),
// হাঁটা জায়গায় দাঁড়িয়ে (সামনে সরে না), নরমাল ম্যাপ বাদ, টেক্সচার webp, পলিগন কমানো।
//   node tools/people-asset.mjs raw/nathan.glb games/racer/assets/p_nathan.glb 0.35 512 [সর্বোচ্চ সেকেন্ড]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, prune, dedup, weld, simplify, textureCompress, quantize, resample } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const [src, dst, ratio, tex, maxT] = process.argv.slice(2);
const doc = await io.read(src), root = doc.getRoot();
for (const n of root.listNodes()) n.setName(n.getName().replace(/^rp_[a-z]+_(animated|rigged)_\d+_(walking_|idling_)?/, ''));
for (const m of root.listMaterials()) { m.setNormalTexture(null); m.setMetallicRoughnessTexture(null); m.setMetallicFactor(0); m.setRoughnessFactor(.9); }
for (const a of root.listAnimations()) {
  a.setName('anim');
  for (const ch of a.listChannels()) {
    const node = ch.getTargetNode(), path = ch.getTargetPath(), s = ch.getSampler(), inp = s.getInput(), out = s.getOutput();
    if (path === 'translation' && !/^hip_/.test(node.getName())) { ch.dispose(); continue; } // শুধু কোমর নড়ে
    if (path === 'scale') { ch.dispose(); continue; }
    if (path === 'translation') { // জায়গায় দাঁড়িয়ে হাঁটা: সামনে-পাশে সরা বাদ, শুধু ওঠানামা
      const a0 = out.getElement(0, []); for (let i = 0; i < out.getCount(); i++) { const v = out.getElement(i, []); out.setElement(i, [a0[0], v[1], a0[2]]); }
    }
    if (maxT) { const n = inp.getCount(); let k = n; for (let i = 0; i < n; i++) if (inp.getElement(i, [])[0] > +maxT) { k = i; break; }
      if (k < n) { const w = out.getElementSize(); inp.setArray(inp.getArray().slice(0, k)); out.setArray(out.getArray().slice(0, k * w)); } }
  }
}
await doc.transform(resample({ tolerance: 2e-3 }), prune(), dedup(), weld({}),
  simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: .002 }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [+tex, +tex], quality: 78 }),
  quantize(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
let v = 0, t = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) { v += p.getAttribute('POSITION').getCount(); t += (p.getIndices()?.getCount() || 0) / 3; }
await io.write(dst, doc); console.log(dst, v, 'verts', t, 'tris');
