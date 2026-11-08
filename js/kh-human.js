// খেলাঘরের মানুষ (সংস্করণ ২): এক টুকরো মসৃণ শরীর, ভেতরে হাড় (skeleton), তাই হাঁটু-কনুই ভাঁজ হলে চামড়া জোড়া ছাড়া বাঁকে।
// ব্যবহার: const h = makeHuman(THREE, { skin, shirt, shorts, trim, number, hair, hairStyle, mustache, look });
//          scene.add(h.root); প্রতি ফ্রেমে h.set({ run, crouch, ... }); h.update(dt, speed);
// চরিত্রটা +z দিকে মুখ করে থাকে।

const texCache = new Map();
function canvasTex(THREE, key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache.set(key, t); return t;
}
const hexRGB = hex => { const n = parseInt(hex.slice(1), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
const shade = (hex, k) => { const [r, g, b] = hexRGB(hex); const f = v => Math.max(0, Math.min(255, Math.round(v * 255 * k))).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b); };

// মুখ: গোলকের u = .২৫ হলো সামনের দিক (+z)
function faceTex(THREE, skin, look) {
  return canvasTex(THREE, 'face' + skin + look, 512, 256, (x, w, h) => {
    x.fillStyle = skin; x.fillRect(0, 0, w, h);
    const cx = w * .25, ey = h * .5, dx = 21;
    for (const s of [-1, 1]) { const g = x.createRadialGradient(cx + s * 30, ey + 30, 2, cx + s * 30, ey + 30, 26); g.addColorStop(0, 'rgba(200,90,70,.16)'); g.addColorStop(1, 'rgba(200,90,70,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
    for (const s of [-1, 1]) {
      x.fillStyle = shade(skin, .82); x.beginPath(); x.ellipse(cx + s * dx, ey - 1, 13, 10, 0, 0, 7); x.fill(); // চোখের কোটর
      x.fillStyle = '#fbf8f2'; x.beginPath(); x.ellipse(cx + s * dx, ey, 10.5, 7.5, 0, 0, 7); x.fill();
      x.fillStyle = '#3a2314'; x.beginPath(); x.arc(cx + s * dx + s, ey + .5, 5.6, 0, 7); x.fill();
      x.fillStyle = '#070403'; x.beginPath(); x.arc(cx + s * dx + s, ey + .5, 2.8, 0, 7); x.fill();
      x.fillStyle = 'rgba(255,255,255,.95)'; x.beginPath(); x.arc(cx + s * dx - 2, ey - 2, 1.6, 0, 7); x.fill();
      x.strokeStyle = '#1b100a'; x.lineWidth = 2.6; x.beginPath(); x.ellipse(cx + s * dx, ey, 11, 8, 0, Math.PI * 1.08, Math.PI * 1.92); x.stroke();
      x.strokeStyle = '#140b06'; x.lineCap = 'round'; x.lineWidth = look === 'angry' ? 5.5 : 4.5; x.beginPath();
      if (look === 'angry') { x.moveTo(cx + s * (dx + 13), ey - 18); x.lineTo(cx + s * (dx - 9), ey - 11); } else { x.moveTo(cx + s * (dx + 13), ey - 14); x.quadraticCurveTo(cx + s * dx, ey - 21, cx + s * (dx - 10), ey - 15); }
      x.stroke();
    }
    x.strokeStyle = shade(skin, .6); x.lineWidth = 2.6; x.beginPath(); x.moveTo(cx - 6, ey + 24); x.quadraticCurveTo(cx, ey + 29, cx + 6, ey + 24); x.stroke();
    x.strokeStyle = '#4a1d14'; x.lineWidth = 3.4; x.beginPath(); x.moveTo(cx - 13, ey + 41); x.quadraticCurveTo(cx, ey + 47, cx + 13, ey + 41); x.stroke();
  });
}
function mouthTex(THREE) { return canvasTex(THREE, 'mouth', 64, 64, (x, w, h) => { x.fillStyle = '#2e0a08'; x.beginPath(); x.ellipse(w / 2, h / 2, w * .44, h * .36, 0, 0, 7); x.fill(); x.fillStyle = '#f2efe8'; x.fillRect(w * .2, h * .2, w * .6, h * .12); x.fillStyle = '#b5413f'; x.beginPath(); x.ellipse(w / 2, h * .72, w * .26, h * .12, 0, 0, 7); x.fill(); }); }
function numTex(THREE, num) { return canvasTex(THREE, 'num' + num, 128, 128, (x, w, h) => { x.clearRect(0, 0, w, h); x.font = "900 104px 'Baloo Da 2',Arial,sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 8; x.strokeStyle = 'rgba(0,0,0,.35)'; x.strokeText(String(num), w / 2, h / 2 + 6); x.fillStyle = '#ffffff'; x.fillText(String(num), w / 2, h / 2 + 6); }); }

export function makeHuman(THREE, o = {}) {
  const skinHex = o.skin || '#9a6a4f', shirtHex = o.shirt || '#16a34a', shortsHex = o.shorts || '#1f2937', trimHex = o.trim || '#facc15';
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(o.scale || 1);
  // ---------- হাড় ----------
  const B = (name, parent, x, y, z) => { const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); if (parent) parent.add(b); return b; };
  const hips = B('hips', null, 0, .93, 0), spine = B('spine', hips, 0, .07, 0), neckB = B('neck', spine, 0, .53, 0), head = B('head', neckB, 0, .1, 0);
  const bones = { hips, spine, neck: neckB, head };
  for (const [k, s] of [['L', -1], ['R', 1]]) {
    bones['sh' + k] = B('sh' + k, spine, s * .215, .46, 0); bones['el' + k] = B('el' + k, bones['sh' + k], 0, -.28, 0); bones['wr' + k] = B('wr' + k, bones['el' + k], 0, -.25, 0);
    bones['hp' + k] = B('hp' + k, hips, s * .095, -.06, 0); bones['kn' + k] = B('kn' + k, bones['hp' + k], 0, -.42, 0); bones['an' + k] = B('an' + k, bones['kn' + k], 0, -.43, 0); bones['toe' + k] = B('toe' + k, bones['an' + k], 0, -.06, .14);
  }
  body.add(hips); body.updateMatrixWorld(true);
  const wp = b => { const v = new THREE.Vector3(); b.getWorldPosition(v); body.worldToLocal(v); return v; };
  const segOf = { hips: ['hips', 'spine'], spine: ['spine', 'neck'], neck: ['neck', 'head'], head: ['head', 'head'] };
  for (const k of ['L', 'R']) Object.assign(segOf, { ['sh' + k]: ['sh' + k, 'el' + k], ['el' + k]: ['el' + k, 'wr' + k], ['wr' + k]: ['wr' + k, 'wr' + k], ['hp' + k]: ['hp' + k, 'kn' + k], ['kn' + k]: ['kn' + k, 'an' + k], ['an' + k]: ['an' + k, 'toe' + k] });
  const boneList = Object.values(bones).filter(b => b.name.slice(0, 3) !== 'toe');
  const bIndex = new Map(boneList.map((b, i) => [b.name, i]));
  const segs = {}; for (const n of bIndex.keys()) segs[n] = [wp(bones[segOf[n][0]]), wp(bones[segOf[n][1]])];
  const tA = new THREE.Vector3(), tB = new THREE.Vector3();
  const segDist = (p, [a, b]) => { tA.copy(b).sub(a); const l2 = tA.lengthSq(); let t = l2 ? tB.copy(p).sub(a).dot(tA) / l2 : 0; t = Math.max(0, Math.min(1, t)); return tB.copy(a).addScaledVector(tA, t).distanceTo(p); };
  // ---------- শরীরের টুকরো (বিশ্রাম ভঙ্গিতে), রঙ আর কোন কোন হাড়ে বাঁধা যাবে ----------
  const parts = [];
  const add = (geo, m4, color, allow, colorFn) => parts.push({ geo: geo.applyMatrix4(m4), color, allow, colorFn });
  const at = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const tp = [[0, -.14], [.175, -.14], [.188, -.05], [.188, -.026], [.186, -.014], [.182, .02], [.18, .08], [.19, .22], [.215, .36], [.222, .44], [.19, .5], [.1, .545], [0, .55]].map(([a, b]) => new THREE.Vector2(a, b));
  const waist = 1.0; // spine-এর উচ্চতা
  add(new THREE.LatheGeometry(tp, 18), at(0, waist, 0, 0, 0, 0, 1, 1, .7), shirtHex, ['hips', 'spine'], p => p.y < waist - .02 ? shortsHex : shirtHex);
  add(new THREE.CylinderGeometry(.05, .06, .14, 8), at(0, waist + .58, 0), skinHex, ['spine', 'neck']);
  for (const k of ['L', 'R']) {
    const sh = wp(bones['sh' + k]), el = wp(bones['el' + k]), wr = wp(bones['wr' + k]), hp = wp(bones['hp' + k]), kn = wp(bones['kn' + k]), an = wp(bones['an' + k]);
    add(new THREE.SphereGeometry(.072, 10, 8), at(sh.x * .96, sh.y - .005, sh.z, 0, 0, 0, 1, .9, .95), shirtHex, ['spine', 'sh' + k]);
    add(new THREE.CapsuleGeometry(.063, .26, 3, 10), at(sh.x, (sh.y + el.y) / 2, 0, 0, 0, 0, 1, 1, .92), skinHex, ['spine', 'sh' + k, 'el' + k]);
    const sleeve = new THREE.LatheGeometry([[0, -.104], [.072, -.104], [.078, -.1], [.08, -.04], [.074, .03], [0, .06]].map(([a, b]) => new THREE.Vector2(a, b)), 10);
    add(sleeve, at(sh.x, sh.y, 0), shirtHex, ['spine', 'sh' + k]);
    add(new THREE.CapsuleGeometry(.053, .22, 3, 10), at(el.x, (el.y + wr.y) / 2, 0), skinHex, ['sh' + k, 'el' + k]);
    add(new THREE.SphereGeometry(.052, 8, 6), at(wr.x, wr.y - .05, .005, 0, 0, 0, .85, 1.3, .62), skinHex, ['wr' + k]);
    add(new THREE.CapsuleGeometry(.1, .32, 3, 12), at(hp.x, (hp.y + kn.y) / 2, 0), skinHex, ['hips', 'hp' + k, 'kn' + k]);
    const leg = new THREE.LatheGeometry([[0, -.215], [.118, -.215], [.128, -.2], [.13, -.06], [.125, .06], [0, .07]].map(([a, b]) => new THREE.Vector2(a, b)), 12);
    add(leg, at(hp.x, hp.y, 0), shortsHex, ['hips', 'hp' + k]);
    add(new THREE.CapsuleGeometry(.072, .33, 3, 10), at(kn.x, (kn.y + an.y) / 2, 0), skinHex, ['hp' + k, 'kn' + k, 'an' + k]);
    add(new THREE.SphereGeometry(.074, 8, 6), at(kn.x, kn.y - .14, -.02, 0, 0, 0, .95, 1.7, .9), skinHex, ['kn' + k]); // পায়ের ডিম
    add(new THREE.CapsuleGeometry(.05, .14, 3, 8), at(an.x, an.y - .045, .06, Math.PI / 2, 0, 0, 1.15, 1, .72), skinHex, ['kn' + k, 'an' + k]);
  }
  // ---------- জোড়া লাগানো + হাড়ের ওজন ----------
  let nV = 0; parts.forEach(p => { if (p.geo.index) p.geo = p.geo.toNonIndexed(); nV += p.geo.attributes.position.count; });
  const pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), col = new Float32Array(nV * 3), si = new Uint16Array(nV * 4), sw = new Float32Array(nV * 4);
  let o3 = 0; const pv = new THREE.Vector3();
  for (const p of parts) {
    const Pa = p.geo.attributes.position, Nn = p.geo.attributes.normal, ids = p.allow.map(n => bIndex.get(n));
    for (let i = 0; i < Pa.count; i++, o3++) {
      pv.fromBufferAttribute(Pa, i); pos[o3 * 3] = pv.x; pos[o3 * 3 + 1] = pv.y; pos[o3 * 3 + 2] = pv.z;
      nor[o3 * 3] = Nn.getX(i); nor[o3 * 3 + 1] = Nn.getY(i); nor[o3 * 3 + 2] = Nn.getZ(i);
      const cc = new THREE.Color(p.colorFn ? p.colorFn(pv) : p.color), c = [cc.r, cc.g, cc.b], ao = .8 + .2 * Math.min(1, Math.max(0, Nn.getY(i) * .5 + .6));
      col[o3 * 3] = c[0] * ao; col[o3 * 3 + 1] = c[1] * ao; col[o3 * 3 + 2] = c[2] * ao;
      const ws = p.allow.map((n, j) => [ids[j], 1 / Math.pow(segDist(pv, segs[n]) + .02, 5)]).sort((a, b) => b[1] - a[1]).slice(0, 4);
      const tot = ws.reduce((a, w) => a + w[1], 0);
      for (let j = 0; j < 4; j++) { si[o3 * 4 + j] = ws[j] ? ws[j][0] : 0; sw[o3 * 4 + j] = ws[j] ? ws[j][1] / tot : 0; }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  const mesh = new THREE.SkinnedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .74, metalness: 0 }));
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  body.add(mesh); mesh.bind(new THREE.Skeleton(boneList));
  // ---------- মাথা (শক্ত টুকরো, head হাড়ে বাঁধা) ----------
  const cast = m => { m.castShadow = true; return m; };
  const hg = new THREE.Group(); hg.scale.setScalar(1.25); head.add(hg);
  const skinM = new THREE.MeshStandardMaterial({ color: skinHex, roughness: .7 }), hairM = new THREE.MeshStandardMaterial({ color: o.hair || '#120c08', roughness: .75 });
  const skull = cast(new THREE.Mesh(new THREE.SphereGeometry(.112, 24, 16), new THREE.MeshStandardMaterial({ map: faceTex(THREE, skinHex, o.look || 'calm'), roughness: .66 }))); skull.scale.set(1, 1.16, 1.05); skull.position.y = .06; hg.add(skull);
  const jaw = cast(new THREE.Mesh(new THREE.SphereGeometry(.088, 14, 10), skinM)); jaw.scale.set(1, .78, 1); jaw.position.set(0, -.005, .024); hg.add(jaw);
  const nose = cast(new THREE.Mesh(new THREE.SphereGeometry(.02, 12, 10), skinM)); nose.scale.set(1.1, 1.25, 1.2); nose.position.set(0, .045, .118); hg.add(nose);
  for (const s of [-1, 1]) { const ear = cast(new THREE.Mesh(new THREE.SphereGeometry(.028, 12, 10), skinM)); ear.scale.set(.45, 1, .75); ear.position.set(s * .11, .055, -.005); hg.add(ear); }
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(.028, 18), new THREE.MeshBasicMaterial({ map: mouthTex(THREE), transparent: true, depthWrite: false })); mouth.position.set(0, .004, .123); mouth.rotation.x = -.12; mouth.scale.set(1, .1, 1); hg.add(mouth);
  const hs = o.hairStyle ?? 0;
  const capM = cast(new THREE.Mesh(new THREE.SphereGeometry(.12, 18, 10, 0, Math.PI * 2, 0, Math.PI * (hs === 2 ? .36 : .5)), hairM)); capM.scale.set(1.02, 1.15, 1.08); capM.position.set(0, .07, -.014); capM.rotation.x = -.45; hg.add(capM);
  if (hs === 1) { const tuft = cast(new THREE.Mesh(new THREE.SphereGeometry(.07, 14, 10), hairM)); tuft.scale.set(1.5, .55, 1.05); tuft.position.set(.025, .18, .045); tuft.rotation.z = -.2; hg.add(tuft); }
  if (hs === 2) { const band = new THREE.Mesh(new THREE.TorusGeometry(.116, .016, 8, 28), new THREE.MeshStandardMaterial({ color: trimHex, roughness: .6 })); band.rotation.x = Math.PI / 2 - .3; band.position.set(0, .11, -.01); hg.add(band); }
  if (o.mustache) { const mu = new THREE.Mesh(new THREE.CapsuleGeometry(.008, .045, 3, 6), hairM); mu.rotation.z = Math.PI / 2; mu.position.set(0, .024, .12); hg.add(mu); }
  // জার্সির নম্বর (পিঠে আর বুকে)
  const nm = new THREE.MeshBasicMaterial({ map: numTex(THREE, o.number ?? 1), transparent: true, depthWrite: false });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(.2, .2), nm); back.position.set(0, .32, -.158); back.rotation.y = Math.PI; spine.add(back);
  const chest = new THREE.Mesh(new THREE.PlaneGeometry(.1, .1), nm); chest.position.set(.08, .37, .154); spine.add(chest);
  // ---------- ভঙ্গি ----------
  const P = { run: 0, crouch: 0, wide: 0, reach: 0, dive: 0, fall: 0, kick: 0, cheer: 0, sit: 0, hold: 0, struggle: 0, lean: 0, shout: 0 };
  const T = Object.assign({}, P);
  let ph = Math.random() * 6, t = Math.random() * 10;
  const L = bones;
  const h = {
    root, body, bones, head, spine, hips, mouth, P, T, look: null, mesh,
    set(o2) { Object.assign(T, o2); },
    snap(o2) { Object.assign(T, o2); Object.assign(P, o2); },
    update(dt, speed = 0) {
      t += dt; const k = Math.min(1, dt * 10), k2 = Math.min(1, dt * 5.5);
      for (const key in T) P[key] += (T[key] - P[key]) * (key === 'dive' || key === 'fall' || key === 'kick' || key === 'hold' ? k : k2);
      const run = P.run, cr = P.crouch;
      ph += dt * (4 + speed * 2.4);
      const s = Math.sin(ph), c = Math.cos(ph), breathe = Math.sin(t * 2.2) * .012;
      hips.position.y = .93 - cr * .2 - P.sit * .5 - Math.abs(s) * .05 * run + Math.max(0, -c) * .02 * run;
      hips.rotation.set(0, s * .18 * run, 0);
      spine.rotation.set(.1 * run + cr * .42 + P.reach * .25 + P.hold * .5 - P.kick * .35 + P.lean - P.cheer * .1 + P.struggle * .3 + breathe, -s * .26 * run, Math.sin(t * 17) * .08 * P.struggle);
      for (const [sd, sg] of [['L', 1], ['R', -1]]) {
        const ss = s * sg, cc = c * sg;
        let thigh = -ss * .85 * run - cr * .78 - P.sit * 1.5, knee = Math.max(0, cc) * 1.4 * run + .2 * run + cr * 1.2 + P.sit * 1.6, ankle = -.3 * run * Math.max(0, -cc) - cr * .38;
        if (sd === 'R') { thigh = thigh * (1 - P.kick) - 1.4 * P.kick; knee = knee * (1 - P.kick) + .05 * P.kick; ankle += .5 * P.kick; }
        L['hp' + sd].rotation.set(thigh, 0, -sg * (cr * .2 + P.sit * .45) + Math.sin(t * 20 + sg) * .1 * P.struggle);
        L['kn' + sd].rotation.x = knee; L['an' + sd].rotation.x = ankle;
      }
      for (const [sd, sg] of [['L', -1], ['R', 1]]) {
        const ss = s * (sd === 'L' ? -1 : 1);
        let ax = ss * .75 * run - P.wide * .45 - P.reach * 1.35 - P.hold * 1.3 - P.cheer * 2.9 - P.kick * .2;
        const az = sg * (.1 + P.wide * 1.0 + P.cheer * .25 + P.kick * .55), ex = -1.2 * run - P.wide * .6 - P.reach * .25 - P.hold * .75 - P.cheer * .2 - .08;
        if (P.cheer > .01) ax += Math.sin(t * 9 + sg) * .25 * P.cheer;
        L['sh' + sd].rotation.set(ax, 0, az); L['el' + sd].rotation.x = ex;
      }
      body.rotation.x = P.dive * 1.42 - P.fall * 1.5; body.position.y = P.dive * .1 + P.fall * .12; body.position.z = -P.dive * .3 + P.fall * .25;
      if (h.look) { const v = h.look; const a = Math.atan2(v.x - root.position.x, v.z - root.position.z) - root.rotation.y; const d = Math.atan2(Math.sin(a), Math.cos(a)); head.rotation.y += (Math.max(-1.1, Math.min(1.1, d)) - head.rotation.y) * k2; } else head.rotation.y *= 1 - k2;
      head.rotation.x = -spine.rotation.x * .55 - P.dive * .6 + P.fall * .3;
      const mo = Math.max(P.shout, P.cheer * .8); mouth.scale.y = .1 + mo * (.6 + Math.sin(t * 22) * .25);
    }
  };
  return h;
}
