'use strict';
// Visual QA helper: renders every mapped model installed in a reference build and writes PNGs + a contact sheet script input.
//   node scripts/perf/contact-sheet.js <base-url> <out-dir> [zoom] [yaw] [pitch]
const { chromium } = require(require.resolve('playwright'));
const fs = require('fs'), path = require('path');
const [url, out, zoom, yaw, pitch] = [process.argv[2], process.argv[3], +process.argv[4] || 1.8, process.argv[5] != null ? +process.argv[5] : -1.1, process.argv[6] != null ? +process.argv[6] : 0.18];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const man = JSON.parse(fs.readFileSync(path.join(__dirname, '../../models/manifest.json'), 'utf8'));
  const key = { gpu: 'gpu', cpu: 'cpu', mobo: 'mobo', ram: 'ram', case: 'case', cooler: 'cooler', coolerpump: 'cooler' };
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 560, height: 900 } });
  await p.goto(url + '#builder'); await p.waitForSelector('#app canvas');
  const list = [];
  for (const [id, m] of Object.entries(man)) {
    const pid = Object.keys(m.products || {})[0]; if (!pid) continue;
    // isolate the part under test: the generic ATX board (plain boxes) is the installation reference for GPU / CPU / RAM
    const board = { mobo: 'b650-atx' }, build = m.cat === 'mobo' ? { mobo: pid } : m.cat === 'case' ? { case: pid } : m.cat === 'cooler' || m.cat === 'coolerpump' ? Object.assign({}, board, { cpu: 'r7-7800x3d', cooler: pid }) : Object.assign({}, board, { [key[m.cat]]: pid });
    await p.evaluate((x) => { RigLabApp.state.build = x; RigLabApp.render(); }, build);
    await p.waitForFunction(() => RigLabApp.state.v3.identity().every((r) => r.status !== 'loading'), null, { timeout: 30000 });
    await p.evaluate(([z, y, pt]) => { const v = RigLabApp.state.v3; v.state.zoom = z; v.state.yaw = y; v.state.pitch = pt; v.rotate(0); }, [m.cat === 'case' ? 1 : zoom, yaw, pitch]);
    await p.waitForTimeout(900);
    const shown = await p.evaluate((k) => (RigLabApp.state.v3.identity().find((r) => r.key === k) || {}).model, key[m.cat]);
    await (await p.$('#rig3d')).screenshot({ path: path.join(out, id + '.png') });
    list.push({ id, pid, cat: m.cat, shown });
  }
  fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(list, null, 1));
  console.log(list.map((x) => x.id + ' <- ' + x.pid + (x.shown === x.id || x.cat === 'coolerpump' ? '' : '  (!shown ' + x.shown + ')')).join('\n'));
  await b.close();
})();
