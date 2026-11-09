// Poly Haven-এর মডেল (CC0) ছোট করা, যেমন concrete_road_barrier_02 → games/racer/assets/barrier.glb
//   node racer-prop-asset.mjs concrete_road_barrier_02.gltf barrier.glb 0.06 0.01 512
//   KEEP=1 দিলে নোড আলাদা থাকে (যেমন পাখার ব্লেড, ঘড়ির কাঁটা আলাদা ঘোরানোর জন্য)
// গাছগুলো (island_tree_01/02) মডেল না, ব্রাউজারে রেন্ডার করা ছবি (tree1.webp, tree2.webp), দূর থেকে মুখোমুখি দেখায়।
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, prune, dedup, weld, simplify, textureCompress, quantize, flatten, join } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const [src, dst, ratio, err, tex] = process.argv.slice(2);
const doc = await io.read(src);
await doc.transform(prune(), dedup(), ...(process.env.KEEP ? [] : [flatten(), join()]), weld({}),
  simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: +err }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [+tex, +tex], quality: 80 }),
  quantize(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
let v=0,t=0; for(const m of doc.getRoot().listMeshes())for(const p of m.listPrimitives()){v+=p.getAttribute('POSITION').getCount();t+=(p.getIndices()?.getCount()||0)/3}
await io.write(dst, doc); console.log(dst, v, 'verts', t, 'tris');
