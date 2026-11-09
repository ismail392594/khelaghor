// হাইওয়ে রাজার গাড়ির মডেল বানানো (Khronos CarConcept, CC-BY 4.0) → games/racer/assets/car.glb আর car_lo.glb
// এটা রিপোতে চলে না, আলাদা ফোল্ডারে চালান:
//   npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer sharp
//   node racer-car-asset.mjs CarConcept.glb car.glb 0.4 0.002            (খেলোয়াড়ের গাড়ি)
//   node racer-car-asset.mjs CarConcept.glb car_lo.glb 0.06 0.02 traffic (ট্রাফিক: ভেতর, ব্রেক বাদ)
// ভেতরের বেশিরভাগ অংশ বাদ, Khronos লোগো সরানো (লাইসেন্সে লোগো নেই), টেক্সচার ৫১২ webp, meshopt কম্প্রেশন।
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, prune, dedup, weld, simplify, textureCompress, quantize, resample, flatten, join } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const [src, dst, ratio, err, mode] = process.argv.slice(2); // mode 'traffic' = ভেতরের সব আর ব্রেক বাদ
const doc = await io.read(src);
const root = doc.getRoot();
const keepInterior = mode === 'traffic' ? /^$/ : /^Interior(Seats|Steering|DashMid|DashSides)/;
for (const n of root.listNodes()) {
  const nm = n.getName();
  if ((nm.startsWith('Interior') && !keepInterior.test(nm)) || nm === 'Engine' || nm === 'BodyWindshieldWipers' || nm==='BodyHoodInterior01' || nm==='BodyHoodUnder' || nm==='InteriorRearHatch' || (mode === 'traffic' && /Brake(Pad|Disc)|Gasket|Handle|HoodInterior|Axles/.test(nm)))
    n.dispose();
}
// Khronos লোগো বাদ (CC-BY লাইসেন্সে লোগো নেই): নম্বরপ্লেট/ইমিসিভ টেক্সচার, টায়ারের লেখা, স্টিয়ারিং প্রতীক
const t3 = root.listMaterials().find(m => m.getName() === 'License').getBaseColorTexture();
for (const m of root.listMaterials()) {
  if (m.getEmissiveTexture() === t3) { m.setEmissiveTexture(null); m.setEmissiveFactor([0, 0, 0]); }
  if (m.getBaseColorTexture() === t3) { // নম্বরপ্লেটের UV রাখতে সাদা খালি ছবি; আসল প্লেট খেলায় আঁকা হয়
    const blank = doc.createTexture('plate').setMimeType('image/png').setImage(await sharp({ create: { width: 64, height: 16, channels: 3, background: '#ffffff' } }).composite([{ input: { create: { width: 60, height: 12, channels: 3, background: '#f4f4f0' } }, left: 2, top: 2 }]).png().toBuffer());
    m.setBaseColorTexture(blank);
  }
  if (m.getName() === 'Tireside') { m.setBaseColorTexture(null); m.setNormalTexture(null); m.setBaseColorFactor([0.03, 0.03, 0.03, 1]); m.setRoughnessFactor(0.85); }
}
for (const n of root.listNodes()) if (n.getName() === 'InteriorSteeringEmblem') n.dispose();
// drop variants / iridescence
for (const e of root.listExtensionsUsed()) if (['KHR_materials_variants','KHR_materials_iridescence'].includes(e.extensionName)) e.dispose();
await MeshoptSimplifier.ready;
await doc.transform(
  prune(), dedup(), weld({}),
  simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: +err, lockBorder: false }),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 82 }),
  quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 12 }), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(dst, doc);
