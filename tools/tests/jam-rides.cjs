const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await (await b.newContext({ ...devices['Pixel 7'], deviceScaleFactor: 1 })).newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Firestore|firestore|TUNNEL|404/.test(m.text())) errs.push(m.text().slice(0, 200)); });
  await p.goto('http://localhost:8811/games/jam/');
  await p.waitForFunction(() => !document.querySelector('#rides button[data-r="rickshaw"]').disabled, null, { timeout: 300000 });
  await p.waitForTimeout(3000); await p.screenshot({ path: process.env.OUT + '/jam_menu.png' });
  for (const ride of ['rickshaw', 'bus_mini']) {
    await p.evaluate(r => { document.getElementById('endO').hidden = true; document.getElementById('startO').hidden = false; document.querySelector(`#rides [data-r="${r}"]`).click(); }, ride);
    await p.click('#startBtn');
    const r = await p.evaluate(async () => { const out = { crash: 0 }; for (let i = 0; i < 60 * 40; i++) { KHJam.frame(1 / 60); if (KHJam.S.over) break; if (i % 300 === 0) await new Promise(r => setTimeout(r, 0)); } const S = KHJam.S; return { dist: Math.round(S.dist), over: S.over, clock: Math.round(S.clock), lives: S.lives, real: S.obs.filter(o => o.real).length + '/' + S.obs.filter(o => !o.static).length, crashes: (S.crashLog || []).join(',') }; });
    console.log(ride, JSON.stringify(r));
    await p.waitForTimeout(2000); await p.screenshot({ path: `${process.env.OUT}/jam_${ride}.png` });
  }
  console.log('errors', JSON.stringify(errs.slice(0, 5))); await b.close();
})();
