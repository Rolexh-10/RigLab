'use strict';
// Browser check of the 3D identity guardrails: what the viewer REALLY resolves for the current build, the honest label,
// and that touch rotation still works after model swaps (add / replace / remove / saved-build reload / language switch).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { chromium } = (() => { for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright']) { try { return require(p); } catch (e) { /* next */ } } throw new Error('playwright not found'); })();

test('3D identity: selection, swap, removal, reload, language, touch', async () => {
  const exe = process.env.CHROME_PATH || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, hasTouch: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  await page.goto('file://' + path.join(__dirname, '../../dist/riglab.html#builder'));
  await page.waitForSelector('#app canvas');
  if (!(await page.evaluate(() => !!(window.RigLabApp.state.v3 && window.RigLabApp.state.v3.gl)))) { await browser.close(); return; }
  const setBuild = (b) => page.evaluate((b) => { window.RigLabApp.state.build = b; window.RigLabApp.render(); }, b);
  const ident = async () => { await page.waitForTimeout(600); return page.evaluate(() => ({ id: window.RigLabApp.state.v3.identity(), label: (document.getElementById('rig3d-id') || {}).textContent || '' })); };
  const by = (r, k) => r.id.find((x) => x.key === k);
  const base = { cpu: 'r5-7600', mobo: 'b550m', ram: 'ddr5-16-5600', storage: 'nvme-1tb', psu: 'psu-650', case: 'case-meshify-c' };

  // Radeon: generic, never an NVIDIA model
  await setBuild({ ...base, gpu: 'rx7800xt' });
  let r = await ident();
  assert.equal(by(r, 'gpu').level, 'generic'); assert.equal(by(r, 'gpu').model, null);
  assert.match(r.label, /شكل عام|Generic/);
  // GeForce 5070: disclosed look-alike
  await setBuild({ ...base, gpu: 'rtx5070' });
  r = await ident(); assert.equal(by(r, 'gpu').level, 'representative'); assert.match(by(r, 'gpu').actual, /MSI/); assert.match(r.label, /MSI/);
  // replace with an AMD GPU again, then remove it: no stale model
  await setBuild({ ...base, gpu: 'rx7600' }); r = await ident(); assert.equal(by(r, 'gpu').level, 'generic');
  await setBuild({ ...base }); r = await ident(); assert.equal(by(r, 'gpu'), undefined);
  // Intel CPU / B650 board: generic
  await setBuild({ ...base, cpu: 'i5-13400f', mobo: 'b650m', gpu: 'rtx4060' });
  r = await ident(); assert.equal(by(r, 'cpu').level, 'generic'); assert.equal(by(r, 'mobo').level, 'generic'); assert.equal(by(r, 'gpu').level, 'generic');
  // exact where it is truly exact
  await setBuild({ ...base, cpu: 'r7-7800x3d' }); r = await ident(); assert.equal(by(r, 'cpu').level, 'exact'); assert.equal(by(r, 'case').level, 'exact');
  // saved-build reload via share code
  const code = await page.evaluate(() => window.RigLabCore.encodeBuild({ cpu: 'i7-14700k', mobo: 'z790-ddr5', ram: 'ddr5-32-6000', gpu: 'rx7700xt', storage: 'nvme-1tb', psu: 'psu-750', case: 'case-meshify-c' }));
  await page.evaluate((c) => { const S = window.RigLabApp.state; S.build = window.RigLabCore.decodeBuild(c); window.RigLabApp.render(); }, code);
  r = await ident(); assert.equal(by(r, 'cpu').level, 'generic'); assert.equal(by(r, 'gpu').level, 'generic'); assert.equal(by(r, 'mobo').level, 'representative');
  // language switch re-renders the label, identity unchanged
  await page.evaluate(() => document.querySelector('[data-act="lang"]').click());
  r = await ident(); assert.match(r.label, /Generic|look-alike/); assert.equal(by(r, 'gpu').level, 'generic');
  // touch drag still rotates after all the swaps
  const box = await page.evaluate(() => { const c = document.querySelector('canvas.rig3d'); c.scrollIntoView(); const b = c.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  const y0 = await page.evaluate(() => window.RigLabApp.state.v3.state.yaw);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y }] });
  for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x + i * 12, y: box.y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.ok(Math.abs((await page.evaluate(() => window.RigLabApp.state.v3.state.yaw)) - y0) > 0.2, 'touch rotation after swaps');
  await browser.close();
});
