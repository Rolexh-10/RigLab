'use strict';
// Task 01: external GLB assets + GL resource lifecycle, checked in a real browser over local HTTP.
//  - the built page carries no GLB payload; only the models a scene needs are fetched, once
//  - rapid swaps / aborts / stale completions never show the wrong geometry; missing or corrupt files fall back to the placeholder
//  - one WebGL context for the whole session, bounded GL/CPU resources, context loss + restoration, park/resume on navigation
//  - relative URLs resolve under a non-root base path
// Real-phone behaviour is NOT covered here (see docs/3D-ASSETS.md manual checklist).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('./helpers/http');
const { chromium } = (() => { for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright']) { try { return require(p); } catch (e) { /* next */ } } throw new Error('playwright not found'); })();

const DIST = path.join(__dirname, '../../dist');
const BASE = { cpu: 'r5-7600', mobo: 'b650m', ram: 'ddr5-16-5600', storage: 'nvme-1tb', psu: 'psu-650', case: 'case-meshify-c' };
const GPU_MODEL = { rtx4060: 'gpu-giga4060', rtx4060ti: 'gpu-msi4060ti', rtx5070: 'gpu-trio' }; // catalog id -> mapped GLB
let browser, srv, hasGL = true;

test.before(async () => {
  const exe = process.env.CHROME_PATH || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
  browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  srv = await http.start();
});
test.after(async () => { if (browser) await browser.close(); if (srv) await srv.close(); });

// Opens the Builder with counters for requests and WebGL contexts. `route` may intercept model requests.
async function open(opts) {
  opts = opts || {};
  const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, hasTouch: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage(), errors = [], glb = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (/\.glb(\?|$)/.test(r.url())) glb.push(r.url().replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '')); });
  await page.addInitScript(() => {
    window.__gl = { created: 0, lost: 0 };
    const g = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (t) {
      const c = g.apply(this, arguments);
      if (c && /webgl/.test(t) && !this.__c) { this.__c = 1; window.__gl.created++; const e = c.getExtension('WEBGL_lose_context'); if (e) { const l = e.loseContext.bind(e); e.loseContext = function () { window.__gl.lost++; return l(); }; } }
      return c;
    };
  });
  const origin = opts.origin || srv.origin;
  await page.route('**/*', (r) => (r.request().url().startsWith(origin) ? r.continue() : r.abort()));
  if (opts.setup) await opts.setup(page);
  await page.goto((opts.url || srv.url) + '#builder');
  await page.waitForSelector('#app canvas');
  hasGL = await page.evaluate(() => !!(window.RigLabApp.state.v3 && window.RigLabApp.state.v3.gl));
  const api = {
    ctx, page, errors, glb,
    setBuild: (b) => page.evaluate((b) => { window.RigLabApp.state.build = b; window.RigLabApp.render(); }, b),
    settle: () => page.waitForFunction(() => { const v = window.RigLabApp.state.v3; return v && v.identity().every((x) => x.status !== 'loading'); }, null, { timeout: 25000 }),
    ident: (k) => page.evaluate((k) => window.RigLabApp.state.v3.identity().find((x) => x.key === k) || null, k),
    res: () => page.evaluate(() => window.RigLabApp.state.v3.resources()),
    label: () => page.evaluate(() => (document.getElementById('rig3d-id') || {}).textContent || ''),
    gl: () => page.evaluate(() => ({ ...window.__gl, canvases: document.querySelectorAll('canvas.rig3d').length })),
    close: () => ctx.close()
  };
  return api;
}

test('built page has no GLB payload; models are separate files under dist/assets/models', () => {
  const html = fs.readFileSync(path.join(DIST, 'riglab.html'), 'utf8'), art = fs.readFileSync(path.join(DIST, 'riglab.artifact.html'), 'utf8');
  for (const h of [html, art]) {
    assert.ok(h.length < 1.5 * 1024 * 1024, 'page is small: ' + h.length);
    assert.ok(!/"b64"/.test(h), 'no b64 manifest field');
    assert.ok(!/Z2xURg[A-Za-z0-9+/]{200}/.test(h), 'no base64 GLB header');
    assert.ok(!/[A-Za-z0-9+/]{4000,}={0,2}/.test(h), 'no long base64 run');
  }
  const man = JSON.parse(fs.readFileSync(path.join(__dirname, '../../models/manifest.json'), 'utf8')), files = fs.readdirSync(path.join(DIST, 'assets/models'));
  assert.equal(files.length, Object.keys(man).length);
  for (const k of Object.keys(man)) assert.ok(files.includes(path.basename(man[k].file)), k + ' emitted');
  assert.match(html, /"url":"assets\/models\/[a-z0-9._-]+\.glb\?v=[0-9a-f]{10}"/, 'relative, versioned URLs');
});

test('only the models a scene needs are fetched, each exactly once; one WebGL context', async () => {
  const t = await open(); if (!hasGL) return t.close();
  assert.deepEqual(t.glb, [], 'empty builder fetches no models');
  await t.setBuild({ ...BASE, gpu: 'rtx4060' }); await t.settle();
  const total = fs.readdirSync(path.join(DIST, 'assets/models')).length;
  assert.ok(t.glb.length > 0 && t.glb.length < total / 2, 'fetched ' + t.glb.length + ' of ' + total);
  assert.equal(new Set(t.glb).size, t.glb.length, 'no duplicate fetch');
  assert.ok(t.glb.some((u) => u.endsWith('gpu-giga4060.glb')));
  assert.ok(!t.glb.some((u) => u.endsWith('gpu-msi4060ti.glb')), 'unselected GPU not fetched');
  const n = t.glb.length;
  for (let i = 0; i < 5; i++) { await t.setBuild((i % 2 ? { ...BASE, gpu: 'rtx4060' } : { ...BASE, gpu: 'rtx4060', ram: 'ddr5-32-6000' })); await t.page.waitForTimeout(60); }
  await t.settle(); assert.equal(t.glb.filter((u) => u.endsWith('gpu-giga4060.glb')).length, 1, 'cached model is not fetched again');
  assert.ok(t.glb.length <= n + 1);
  const g = await t.gl(); assert.equal(g.created, 1, 'one WebGL context'); assert.equal(g.canvases, 1);
  assert.deepEqual(t.errors, []); await t.close();
});

test('rapid GPU swaps end on the right model, bounded resources, no stale geometry, one context', async () => {
  const t = await open(); if (!hasGL) return t.close();
  const seq = ['rtx4060', 'rtx4060ti', 'rx7800xt', 'rtx5070', 'rtx4060ti', 'rtx4060', 'rtx5070', 'rtx4060ti'];
  for (let i = 0; i < 40; i++) await t.setBuild({ ...BASE, gpu: seq[i % seq.length] }); // no waiting between swaps
  await t.setBuild({ ...BASE, gpu: 'rtx4060ti' }); await t.settle();
  const g = await t.ident('gpu'); assert.equal(g.model, GPU_MODEL.rtx4060ti); assert.equal(g.status, 'ready'); assert.equal(g.level, 'representative');
  const r = await t.res(); assert.ok(r.models.ready <= r.wanted + 2, JSON.stringify(r)); assert.equal(r.cpuBytes, 0, 'no parse buffers retained'); assert.equal(r.fetches, 0);
  assert.equal((await t.gl()).created, 1);
  // a Radeon never inherits an NVIDIA model
  await t.setBuild({ ...BASE, gpu: 'rx7800xt' }); await t.settle();
  const a = await t.ident('gpu'); assert.equal(a.level, 'generic'); assert.equal(a.model, null);
  assert.deepEqual(t.errors, []); await t.close();
});

test('abort and stale completion: a slow model replaced mid-flight is aborted and never shown', async () => {
  const t = await open({ setup: (p) => p.route('**/gpu-giga4060.glb*', async (r) => { await new Promise((s) => setTimeout(s, 2500)); try { await r.continue(); } catch (e) { /* page already aborted it */ } }) });
  if (!hasGL) return t.close();
  await t.setBuild({ ...BASE, gpu: 'rtx4060' });
  await t.page.waitForTimeout(300);
  const mid = await t.ident('gpu'); assert.equal(mid.status, 'loading');
  await t.setBuild({ ...BASE, gpu: 'rtx4060ti' }); await t.settle();
  const g = await t.ident('gpu'); assert.equal(g.model, GPU_MODEL.rtx4060ti);
  const s = await t.page.evaluate(() => ({ stats: window.RigLabAssets.stats(), has: Object.keys(window.RigLabApp.state.v3.models) }));
  assert.ok(s.stats.aborted >= 1, 'in-flight fetch aborted: ' + JSON.stringify(s.stats));
  assert.ok(!s.has.includes('gpu-giga4060'), 'aborted model was not kept');
  await t.page.waitForTimeout(2600); // the slow response (if any) arrives late: must be ignored
  assert.ok(!(await t.page.evaluate(() => Object.keys(window.RigLabApp.state.v3.models))).includes('gpu-giga4060'));
  assert.equal((await t.ident('gpu')).model, GPU_MODEL.rtx4060ti);
  assert.deepEqual(t.errors, []); await t.close();
});

for (const [name, fulfill] of [
  ['missing file (404)', { status: 404, body: 'nope' }],
  ['truncated file', { status: 200, contentType: 'model/gltf-binary', body: 'glTF-truncated' }],
  ['corrupt file with the right size', null]
]) {
  test('absent/corrupt GLB: ' + name + ' falls back to the generic placeholder without breaking the page', async () => {
    const size = fs.statSync(path.join(DIST, 'assets/models/gpu-giga4060.glb')).size;
    const body = fulfill || { status: 200, contentType: 'model/gltf-binary', body: Buffer.alloc(size, 7) };
    const t = await open({ setup: (p) => p.route('**/gpu-giga4060.glb*', (r) => r.fulfill(body)) });
    if (!hasGL) return t.close();
    await t.setBuild({ ...BASE, gpu: 'rtx4060' }); await t.settle();
    const g = await t.ident('gpu');
    assert.equal(g.status, 'error'); assert.equal(g.level, 'generic'); assert.equal(g.model, null);
    assert.match(await t.label(), /شكل عام|Generic/);
    assert.equal((await t.ident('case')).status, 'ready', 'other parts still load');
    // the viewer keeps working: swap to another GPU, rotate
    await t.setBuild({ ...BASE, gpu: 'rtx4060ti' }); await t.settle();
    assert.equal((await t.ident('gpu')).model, GPU_MODEL.rtx4060ti);
    assert.equal((await t.res()).cpuBytes, 0);
    assert.deepEqual(t.errors, []); await t.close();
  });
}

test('loading state: an exact asset is "loading", never reported as permanently generic; indicator is announced', async () => {
  const t = await open({ setup: (p) => p.route('**/case-meshify.glb*', async (r) => { await new Promise((s) => setTimeout(s, 1500)); try { await r.continue(); } catch (e) { /* aborted */ } }) });
  if (!hasGL) return t.close();
  await t.setBuild({ ...BASE, gpu: 'rtx4060' });
  await t.page.waitForTimeout(250);
  const c = await t.ident('case'); assert.equal(c.status, 'loading'); assert.equal(c.level, 'exact', 'level stays what the mapping promises'); assert.equal(c.model, null);
  const lab = await t.page.evaluate(() => { const el = document.getElementById('rig3d-id'); return { live: el.getAttribute('aria-live'), status: !!el.querySelector('[role="status"]'), text: el.textContent }; });
  assert.equal(lab.live, 'polite'); assert.ok(lab.status, 'loading indicator present'); assert.match(lab.text, /جاري تحميل|Loading 3D/);
  await t.settle(); await t.page.waitForTimeout(100);
  assert.equal((await t.ident('case')).status, 'ready');
  assert.ok(!(await t.page.evaluate(() => !!document.querySelector('#rig3d-id [role="status"]'))), 'indicator removed when done');
  await t.close();
});

test('touch rotation and pinch work after swaps and navigation', async () => {
  const t = await open(); if (!hasGL) return t.close();
  for (const g of ['rtx4060', 'rtx5070', 'rx7800xt', 'rtx4060ti']) await t.setBuild({ ...BASE, gpu: g });
  await t.settle();
  await t.page.evaluate(() => { location.hash = '#parts'; }); await t.page.waitForTimeout(200);
  await t.page.evaluate(() => { location.hash = '#builder'; }); await t.page.waitForSelector('#app canvas'); await t.settle();
  const box = await t.page.evaluate(() => { const c = document.querySelector('canvas.rig3d'); c.scrollIntoView(); const b = c.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  const cdp = await t.ctx.newCDPSession(t.page), st = () => t.page.evaluate(() => ({ yaw: window.RigLabApp.state.v3.state.yaw, zoom: window.RigLabApp.state.v3.state.zoom }));
  const s0 = await st();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y }] });
  for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + i * 12, y: box.y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const s1 = await st(); assert.ok(Math.abs(s1.yaw - s0.yaw) > 0.2, 'drag rotates');
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x - 30, y: box.y, id: 1 }, { x: box.x + 30, y: box.y, id: 2 }] });
  for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x - 30 - i * 8, y: box.y, id: 1 }, { x: box.x + 30 + i * 8, y: box.y, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const s2 = await st(); assert.ok(s2.zoom > s1.zoom * 1.2, 'pinch zooms in: ' + s1.zoom + ' -> ' + s2.zoom);
  assert.deepEqual(t.errors, []); await t.close();
});

test('navigation parks the viewer (same context, models freed after the grace period) and resumes it', async () => {
  const t = await open(); if (!hasGL) return t.close();
  await t.page.evaluate(() => { window.RigLab3D.glConfig.parkTtlMs = 400; });
  await t.setBuild({ ...BASE, gpu: 'rtx4060' }); await t.settle();
  const before = await t.res(); assert.ok(before.buffers > 0 && before.models.ready > 0);
  const same = await t.page.evaluate(() => { window.__v = window.RigLabApp.state.v3; location.hash = '#parts'; return true; });
  await t.page.waitForTimeout(900);
  const parked = await t.res(); assert.equal(parked.models.ready, 0); assert.equal(parked.buffers, 0); assert.equal(parked.vaos, 0); assert.equal(parked.textures, 0, 'unused models do not occupy GPU memory');
  await t.page.evaluate(() => { location.hash = '#builder'; }); await t.page.waitForSelector('#app canvas'); await t.settle();
  assert.ok(same && await t.page.evaluate(() => window.__v === window.RigLabApp.state.v3), 'same viewer instance');
  assert.equal((await t.ident('gpu')).model, GPU_MODEL.rtx4060);
  const g = await t.gl(); assert.equal(g.created, 1); assert.equal(g.lost, 0); assert.equal(g.canvases, 1);
  assert.deepEqual(t.errors, []); await t.close();
});

test('bounded GL/CPU resources over repeated add/remove cycles', async () => {
  const t = await open(); if (!hasGL) return t.close();
  const full = { ...BASE, gpu: 'rtx4060', cooler: 'cool-aio-360' };
  const gpus = ['rtx4060', 'rtx4060ti', 'rtx5070'], seen = [];
  for (let i = 0; i < 24; i++) {
    await t.setBuild(i % 2 ? { ...BASE } : { ...full, gpu: gpus[(i >> 1) % 3] }); await t.settle(); await t.page.waitForTimeout(40);
    if (i % 2) seen.push(await t.res());
  }
  const peak = Math.max(...seen.map((r) => r.buffers)), first = seen[0].buffers;
  assert.ok(peak <= first + 40, 'buffer count does not grow with cycles: first ' + first + ', peak ' + peak);
  assert.ok(seen.every((r) => r.models.ready <= r.wanted + 2 && r.cpuBytes === 0 && r.fetches === 0), JSON.stringify(seen[seen.length - 1]));
  assert.equal((await t.gl()).created, 1);
  assert.deepEqual(t.errors, []); await t.close();
});

test('context loss and restoration: no errors, scene comes back', async () => {
  const t = await open(); if (!hasGL) return t.close();
  await t.setBuild({ ...BASE, gpu: 'rtx4060' }); await t.settle();
  const ok = await t.page.evaluate(async () => {
    const v = window.RigLabApp.state.v3, ext = v.canvas.getContext('webgl2').getExtension('WEBGL_lose_context'); if (!ext) return 'no-ext';
    ext.loseContext(); await new Promise((r) => setTimeout(r, 300));
    const wasLost = v.lost(), during = v.resources();
    window.RigLabApp.state.build.gpu = 'rtx4060ti'; window.RigLabApp.render(); // mutate while lost: must not throw
    ext.restoreContext(); return { wasLost, during };
  });
  if (ok === 'no-ext') return t.close();
  assert.ok(ok.wasLost); assert.equal(ok.during.buffers, 0);
  await t.page.waitForFunction(() => !window.RigLabApp.state.v3.lost(), null, { timeout: 10000 }); await t.settle();
  assert.equal((await t.ident('gpu')).model, GPU_MODEL.rtx4060ti);
  assert.equal((await t.gl()).canvases, 1); assert.deepEqual(t.errors, []); await t.close();
});

test('non-root base path: relative model URLs resolve under /RigLab/', async () => {
  const sub = await http.start({ base: '/RigLab/' });
  try {
    const t = await open({ url: sub.url, origin: sub.origin }); if (!hasGL) return t.close();
    await t.setBuild({ ...BASE, gpu: 'rtx4060' }); await t.settle();
    assert.ok(t.glb.length > 0 && t.glb.every((u) => u.startsWith('/RigLab/assets/models/')), JSON.stringify(t.glb));
    assert.equal((await t.ident('gpu')).model, GPU_MODEL.rtx4060); assert.equal((await t.ident('case')).status, 'ready');
    assert.deepEqual(t.errors, []); await t.close();
  } finally { await sub.close(); }
});
