const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 640, height: 400 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Firestore|firestore|TUNNEL|404/.test(m.text())) errs.push(m.text().slice(0, 160)); });
  const MODE = process.env.MODE || 'sim', RIDE = process.env.RIDE || 'bus_hino';
  await p.addInitScript(([m, r]) => { try { localStorage.setItem('kh-racer-cfg', JSON.stringify({ gfx: 'low', v2: 1, cam: 'far' })); localStorage.setItem('kh-racer-mode', JSON.stringify(m)); localStorage.setItem('kh-racer-ride', JSON.stringify(r)); } catch (e) {} }, [MODE, RIDE]);
  await p.goto('http://localhost:8811/games/racer/');
  await p.waitForFunction(() => window.KHRacer && KHRacer.ready, null, { timeout: 300000 });
  await p.evaluate(lv => KHRacer.start(lv), +(process.env.LV || 1));
  const res = await p.evaluate(async ([MODE, process_env_SECS]) => {
    const K = KHRacer.keys, log = { stops: 0, reversed: 0, hits: 0, fines: 0, wrongSeen: 0, maxKmh: 0, nan: 0, events: [] };
    let lastHp = 100, phase = 'drive', target = -1.8, lastServed = null;
    const seen = new Set();
    for (let sec = 0; sec < (+process_env_SECS || 1300) && !KHRacer.S.over; sec++) {
      for (let f = 0; f < 15; f++) { // সিদ্ধান্ত প্রতি ১/৪ সেকেন্ডে
        const S = KHRacer.S; if (S.over) break;
        if (!isFinite(S.x) || !isFinite(S.z) || !isFinite(S.v)) { log.nan++; break; }
        const st = S.stop, dz = st ? S.z - st.z : 1e9, sim = MODE === 'sim';
        // সামনের গাড়ি দেখে লেন বাছাই
        const ahead = l => S.cars.filter(c => !c.hit && Math.abs(c.x - l) < 2.2 && c.z < S.z + 3 && c.z > S.z - 45 - S.v * 1.2);
        const wantStop = sim && st && !st.served && dz < 170 && dz > -95;
        if (wantStop) target = -7.6;
        else if (ahead(target).length) { const opts = [-5.4, -1.8, 1.8, 5.4].sort((a, b2) => Math.abs(a - S.x) - Math.abs(b2 - S.x)); target = opts.find(l => !ahead(l).length && !S.cars.some(c => Math.abs(c.x - l) < 2.4 && Math.abs(c.z - S.z) < 12)) ?? target; }
        else if (target < -6 && !wantStop) target = -5.4;
        K.l = S.x > target + .4 ? 1 : 0; K.r = S.x < target - .4 ? 1 : 0;
        const blocked = ahead(S.x).some(c => c.z > S.z - 14 - S.v * .7);
        if (sim) {
          if (wantStop && dz > 6) { S.gear = 'D'; K.n = (dz > 30 + S.v * 2.2) || (S.v < 1.5 && dz > 7) ? 1 : 0; K.b = !K.n && (dz < 16 + S.v * 1.6) || blocked ? 1 : 0; }
          else if (wantStop && dz < -6) { if (S.gear !== 'R' && Math.abs(S.v) < .5) { S.gear = 'R'; log.reversed++; } K.n = S.gear === 'R' && dz < -5 ? 1 : 0; K.b = S.gear === 'D' || dz > -3 ? 1 : 0; }
          else if (wantStop) { K.n = 0; K.b = 1; }
          else { if (S.gear === 'R' && Math.abs(S.v) < .5) S.gear = 'D'; K.n = blocked || S.v * 3.6 > 82 ? 0 : 1; K.b = blocked ? 1 : 0; }
        } else { K.b = blocked && S.v > 8 ? 1 : 0; K.n = !blocked && S.nitro > .6 ? 1 : 0; }
        KHRacer.tick(1);
        if (S.hp < lastHp - .5 && !S.crashed) { log.hits++; log.events.push(`ধাক্কা ${Math.round(S.dist)}মি লাইফ ${Math.round(S.hp)}`); } lastHp = S.hp;
        if (st && st.served && lastServed !== st) { lastServed = st; log.stops++; log.events.push(`স্টপেজ ${Math.round(S.dist)}মি যাত্রী ${S.paxList.length}`); }
        S.cars.forEach(c => { if (c.wrong && !seen.has(c)) { seen.add(c); log.wrongSeen++; } });
        log.maxKmh = Math.max(log.maxKmh, Math.round(S.v * 3.6));
        if (S.hp < 40 && S.hp > 0) { document.getElementById('fixB').click(); log.events.push('মেরামত'); }
      }
      if (sec % 100 === 0) { log.events.push('t' + sec + ':' + Math.round(KHRacer.S.dist) + '/' + Math.round(KHRacer.S.v * 3.6) + '/x' + KHRacer.S.x.toFixed(1) + '/dz' + (KHRacer.S.stop ? Math.round(KHRacer.S.z - KHRacer.S.stop.z) : '-') + '/b' + K.b + 'n' + K.n); await new Promise(r => setTimeout(r, 0)); }
    }
    const S = KHRacer.S;
    return { ...log, km: +(S.dist / 1000).toFixed(2), hp: Math.round(S.hp), pax: S.paxList.length, carried: S.carried, money: Math.round(S.money), score: Math.round(S.score), fines: S.fines || 0, over: S.over, events: log.events.slice(0, 40) };
  }, [MODE, process.env.SECS]);
  console.log(MODE, RIDE, JSON.stringify(res, null, 0)); console.log('errors', JSON.stringify(errs.slice(0, 5)));
  await b.close();
})();
