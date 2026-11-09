const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 400 } });
  p.on('pageerror', e => console.log('PAGEERR', e.message));
  if (process.env.GFX) await p.addInitScript(g => { try { localStorage.setItem('kh-racer-cfg', JSON.stringify({ gfx: g })); } catch (e) {} }, process.env.GFX);
  await p.goto('http://localhost:8811/games/racer/');
  await p.waitForFunction(() => window.KHRacer && KHRacer.ready, null, { timeout: 120000 });
  await p.evaluate(() => KHRacer.start(2)); await p.evaluate(() => KHRacer.tick(600));
  await p.waitForTimeout(1500);
  console.log(await p.evaluate(() => { const rows = []; KHRacer._scene.traverse(o => { if (!o.isMesh || !o.visible) return; const t = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; const n = o.isInstancedMesh ? o.count : 1; rows.push([o.material.name || o.material.type, Math.round(t * n), o.castShadow ? "S" : ""]); }); rows.sort((a, b) => b[1] - a[1]); return rows.slice(0, 14).map(r => r.join(" ")).join("\n") + "\nmeshes " + rows.length; }));
  console.log(await p.evaluate(() => { const r = KHRacer._r; r.info.autoReset = false; r.info.reset(); return new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(() => ok(JSON.stringify({ calls: r.info.render.calls, tris: r.info.render.triangles, geos: r.info.memory.geometries, tex: r.info.memory.textures, cars: KHRacer.S.cars.length, opp: KHRacer.S.opp.length, km: KHRacer.S.dist }))))); }));
  await b.close();
})();
