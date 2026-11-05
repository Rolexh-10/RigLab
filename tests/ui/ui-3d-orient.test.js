'use strict';
// Regression for "parts drawn mirrored / inside-out": every GLB placement must be a proper rotation (det +1),
// and mirrored node matrices must be drawn with reversed winding (checked through the renderer's own orient() diagnostic).
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { chromium } = (() => { for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright']) { try { return require(p); } catch (e) { /* next */ } } throw new Error('playwright not found'); })();

test('3D: every embedded model is placed with det +1 (no mirrored parts)', async () => {
  const exe = process.env.CHROME_PATH || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined);
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 520, height: 900 }, reducedMotion: 'reduce' });
  await page.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  await page.goto('file://' + path.join(__dirname, '../../dist/riglab.html#builder'));
  await page.waitForSelector('#app canvas');
  const hasGL = await page.evaluate(() => !!(window.RigLabApp.state.v3 && window.RigLabApp.state.v3.gl));
  if (!hasGL) { await browser.close(); return; } // no WebGL2 here: nothing to check
  await page.evaluate(() => { const S = window.RigLabApp.state; S.build = { cpu: 'r5-7600', mobo: 'b650m', ram: 'ddr5-16-5600', gpu: 'rtx5070', storage: 'nvme-1tb', psu: 'psu-650', case: 'case-meshify-c' }; window.RigLabApp.render(); });
  await page.waitForTimeout(1000);
  const r = await page.evaluate(async () => {
    const v = window.RigLabApp.state.v3, reg = window.RIGLAB_MODELS, items = window.RigLab3D.layout(window.RigLabCore.resolve(window.RigLabApp.state.build)), out = {};
    const key = (c) => (c === 'coolerpump' ? 'cooler' : c);
    Object.keys(reg).forEach((id) => v.force(key(reg[id].cat), id));
    await new Promise((res) => setTimeout(res, 3000));
    Object.keys(reg).forEach((id) => { const it = items.find((i) => i.key === key(reg[id].cat)); out[id] = it ? v.orient(id, reg[id].cat === 'cooler' && it.boxes.length > 1 ? it.boxes[1] : it.boxes[0]) : 'nobox'; });
    return out;
  });
  await browser.close();
  const ids = Object.keys(r);
  assert.ok(ids.length >= 20, 'models registered');
  for (const id of ids) { assert.ok(r[id] && r[id] !== 'nobox', id + ' loaded'); assert.equal(r[id].det, 1, id + ' is mirrored (det ' + r[id].det + ')'); }
});
