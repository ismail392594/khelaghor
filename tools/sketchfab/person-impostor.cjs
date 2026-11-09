const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 256, height: 512 } });
  for (const job of process.argv.slice(2)) { // name|yaw|arms
    const [name, yaw, arms] = job.split('|');
    await p.addInitScript(a => { window.ARMS = a; }, +arms || 0);
    await p.goto('http://localhost:8765/render/person.html#' + encodeURIComponent(name + '|' + yaw)); await p.reload();
    await p.waitForFunction(() => window.DONE, null, { timeout: 300000 });
    const d = await p.evaluate(() => window.DONE); if (d.err) { console.log(name, d.err); continue; }
    fs.writeFileSync(`${process.env.OUT}/${name}_${yaw}.png`, Buffer.from(d.url.split(',')[1], 'base64'));
    console.log(name, yaw, d.size.map(v => v.toFixed(2)).join('x'), 'bones:', d.bones.filter(x => /arm/i.test(x)).join(','));
  }
  await b.close();
})();
