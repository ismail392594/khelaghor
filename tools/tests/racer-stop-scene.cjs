const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['Pixel 7 landscape'], deviceScaleFactor: 1 }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { try { localStorage.setItem('kh-racer-cfg', JSON.stringify({ gfx: 'mid', v2: 1, cam: 'cockpit' })); localStorage.setItem('kh-racer-mode', '"sim"'); localStorage.setItem('kh-racer-ride', '"bus_hino"'); } catch (e) {} });
  await p.goto('http://localhost:8811/games/racer/');
  await p.waitForFunction(() => window.KHRacer && KHRacer.ready, null, { timeout: 300000 });
  await p.evaluate(() => { KHRacer.start(0); const K = KHRacer.keys; K.n = 1; KHRacer.tick(300); K.n = 0; });
  await p.waitForTimeout(2000); await p.screenshot({ path: process.env.OUT + '/c_cock.png' });
  const r = await p.evaluate(() => { const S = KHRacer.S; S.cars.length = 0; for (let i = 0; i < 4; i++) S.paxList.push({ dest: 0, fare: 60 }); S.v = 0; S.x = -7.6; S.z = S.stop.z + 2; KHRacer.keys.b = 1; KHRacer.tick(150); return { cine: S.cine, seq: S.stop.seq && S.stop.seq.onN + '/' + S.stop.seq.offN, hint: document.getElementById('stopHint').textContent }; });
  console.log('mid', JSON.stringify(r));
  await p.waitForTimeout(6000); console.log('cam', await p.evaluate(() => { const c = KHRacer._scene.children.find(o => o.isPerspectiveCamera); const S = KHRacer.S; return JSON.stringify({ cam: c && c.position.toArray().map(v => v.toFixed(1)), Sx: S.x, Sz: S.z.toFixed(1), stopZ: S.stop.z.toFixed(1) }); })); await p.screenshot({ path: process.env.OUT + '/c_cine.png' });
  const r2 = await p.evaluate(() => { const S = KHRacer.S; KHRacer.tick(600); KHRacer.keys.b = 0; return { served: S.stop.served, pax: S.paxList.length, carried: S.carried, money: S.money, cine: S.cine, hint: document.getElementById('stopHint').textContent }; });
  console.log('end', JSON.stringify(r2), 'errors', JSON.stringify(errs));
  await b.close();
})();
