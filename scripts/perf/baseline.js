'use strict';
// Measures initial load of the Builder view over HTTP.  node scripts/perf/baseline.js <url> [runs]
// Everything reported is MEASURED in headless Chromium with software GL; absolute times are not phone times.
const { chromium } = require(require.resolve('playwright'));
const url = process.argv[2] || 'http://localhost:8080/';
const runs = +process.argv[3] || 3;
const GPU_CYCLE = ['rtx4060', 'rtx4060ti', 'rx7800xt', 'rtx5070', 'rtx4090'];
(async () => {
  const exe = process.env.CHROME_BIN || '/usr/bin/google-chrome';
  const b = await chromium.launch({ executablePath: require('fs').existsSync(exe) ? exe : undefined, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const res = [];
  for (let i = 0; i < runs; i++) {
    const p = await b.newPage({ viewport: { width: 412, height: 860 } });
    await p.addInitScript(() => {
      window.__gl = { created: 0, lost: 0 };
      const g = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (t) { const c = g.apply(this, arguments); if (c && /webgl/.test(t) && !this.__c) { this.__c = 1; window.__gl.created++; const e = c.getExtension('WEBGL_lose_context'); if (e) { const l = e.loseContext.bind(e); e.loseContext = function () { window.__gl.lost++; return l(); }; } } return c; };
    });
    const reqs = []; let bytes = 0;
    p.on('requestfinished', async (rq) => { try { const z = await rq.sizes(); const n = z.responseBodySize + z.responseHeadersSize; bytes += n; reqs.push({ url: rq.url().replace(/^https?:\/\/[^/]+/, ''), bytes: z.responseBodySize }); } catch (e) { reqs.push({ url: rq.url(), bytes: 0 }); } });
    const t0 = Date.now();
    await p.goto(url + '#builder', { waitUntil: 'load' });
    const tLoad = Date.now() - t0;
    await p.evaluate((b) => { const S = RigLabApp.state; S.build = b; RigLabApp.render(); }, { cpu: 'r5-7600', mobo: 'b650m', ram: 'ddr5-16-5600', gpu: 'rtx4060', cooler: 'cool-aio-360', storage: 'nvme-1tb', psu: 'psu-650', case: 'case-meshify-c' });
    await p.waitForFunction(() => { const v = RigLabApp.state.v3; if (!v) return false; const i = v.identity && v.identity(); return i.length > 0 && i.every(r => r.status !== "loading"); }, null, { timeout: 30000 });
    const tUsable = Date.now() - t0;
    await p.waitForTimeout(500);
    const html = reqs.find((r) => /riglab\.html$|\/$|index\.html$/.test(r.url.split('?')[0]));
    const mid = { reqs: reqs.length, bytes };
    // lifecycle: repeated builder re-renders with GPU swaps
    for (let k = 0; k < 20; k++) { await p.evaluate((g) => { RigLabApp.state.build.gpu = g; RigLabApp.render(); }, GPU_CYCLE[k % 5]); await p.waitForTimeout(120); }
    await p.waitForTimeout(800);
    const gl = await p.evaluate(() => ({ created: window.__gl.created, lost: window.__gl.lost, canvases: document.querySelectorAll('canvas.rig3d').length }));
    res.push({ htmlBytes: html && html.bytes, initialRequests: mid.reqs, initialTransferBytes: mid.bytes, glbRequests: reqs.filter((r) => /\.glb/.test(r.url)).length, loadEventMs: tLoad, timeToUsableBuilderMs: tUsable, afterSwaps: { requests: reqs.length, bytes, webglContextsCreated: gl.created, loseContextCalls: gl.lost, liveCanvases: gl.canvases } });
    await p.close();
  }
  console.log(JSON.stringify(res, null, 1));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
