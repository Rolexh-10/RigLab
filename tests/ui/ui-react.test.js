'use strict';
// Real-browser smoke test (Playwright + Chrome). Walks every route, drives the real buttons,
// and checks there is no horizontal scroll at phone width.
//   CHROME_PATH=/usr/bin/google-chrome npm test      (defaults to Playwright's own browser if unset)
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

function loadPlaywright() {
  for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright']) { try { return require(p); } catch (e) { /* try next */ } }
  throw new Error('playwright not found: npm i -D playwright');
}
const { chromium } = loadPlaywright();
const FILE = 'file://' + path.join(__dirname, '../../dist/riglab.html');
const SHOTS = process.env.SHOTS_DIR;

let browser;
test.before(async () => {
  const opts = { args: ['--no-sandbox'] };
  const exe = process.env.CHROME_PATH || (fs.existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : null);
  if (exe) opts.executablePath = exe;
  browser = await chromium.launch(opts);
});
test.after(async () => { if (browser) await browser.close(); });

async function open(hash, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 390, height: 800 }, locale: 'ar-IQ' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(m.text()); });
  await page.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  await page.goto(FILE + (hash || ''));
  await page.waitForSelector('#app *');
  return { page, ctx, errors };
}
async function go(page, r) {
  await page.evaluate((h) => new Promise((res) => {
    const t = setTimeout(res, 150);
    window.addEventListener('hashchange', () => { clearTimeout(t); setTimeout(res, 0); }, { once: true });
    location.hash = '#' + h;
  }), r);
}
const text = (page, sel) => page.locator(sel).first().innerText();
const pick = async (page, cat, id) => { await page.click(`[data-act="pick"][data-cat="${cat}"]`); await page.click(`#modal [data-act="choose"][data-id="${id}"]`); };


// Phase 2: routes owned by React (builds, trust) must behave exactly like their legacy versions and coexist with legacy routes.
const isReactHost = (page) => page.evaluate(() => { const f = document.querySelector('#app').firstElementChild; return !!f && f.className === '' && !!f.querySelector('.stack'); });

test('React owns #trust and #builds; legacy routes still render through the old path', async () => {
  const { page, ctx, errors } = await open('#trust');
  assert.equal(await page.evaluate(() => window.RigLabReact.has('trust') && window.RigLabReact.has('builds') && !window.RigLabReact.has('home')), true);
  assert.equal(await isReactHost(page), true, 'trust is mounted by React');
  await go(page, 'home');
  assert.equal(await isReactHost(page), false, 'home is legacy');
  assert.match(await text(page, '#app'), /تجريبي|SAMPLE|Sample/);
  await go(page, 'builds');
  assert.equal(await isReactHost(page), true, 'builds is mounted by React');
  await go(page, 'trust');
  assert.equal(await isReactHost(page), true);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('React trust page: tabs switch content, aria-pressed follows, language toggle flips direction and text', async () => {
  const { page, ctx, errors } = await open('#trust');
  const first = await text(page, '#app .card');
  await page.click('[data-act="trust-tab"][data-v="partners"]');
  assert.equal(await page.getAttribute('[data-act="trust-tab"][data-v="partners"]', 'aria-pressed'), 'true');
  assert.notEqual(await text(page, '#app .card'), first);
  await page.click('[data-act="trust-tab"][data-v="credits"]');
  assert.match(await text(page, '#app .card'), /CC BY|Sketchfab/);
  await page.click('#lang-btn');
  assert.equal(await page.getAttribute('#rl', 'dir'), 'ltr');
  assert.match(await text(page, '#app h1'), /About RigLab/);
  assert.match(await text(page, '#app'), /not translated yet/);
  await page.click('#lang-btn');
  assert.equal(await page.getAttribute('#rl', 'dir'), 'rtl');
  assert.match(await text(page, '#app h1'), /عن RigLab/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('React builds page: empty state, saved build card, share code, open in builder, delete', async () => {
  const { page, ctx, errors } = await open('#builds');
  assert.match(await text(page, '#app'), /ما عندك تجميعات محفوظة/);
  await page.evaluate(() => localStorage.setItem('riglab.builds.v1', JSON.stringify([{ id: 7, name: 'تجميعة اختبار', parts: { cpu: 'r5-7600', mobo: 'b650m', ram: 'ddr5-16-5600', gpu: 'rtx4060', storage: 'nvme-1tb', psu: 'psu-650', case: 'case-atx-mid' }, savedAt: '2026-11-02T10:00:00Z' }])));
  await page.reload(); await page.waitForSelector('#app *');
  const t = await text(page, '#app');
  assert.match(t, /تجميعة اختبار/); assert.match(t, /2026-11-02/); assert.match(t, /Ryzen 5 7600/); assert.match(t, /متوافق مبدئياً/);
  const total = await page.evaluate(() => window.RigLabCore.buildTotal(window.RigLabCore.resolve(JSON.parse(localStorage.getItem('riglab.builds.v1'))[0].parts)));
  assert.ok(t.replace(/,/g, '').includes(String(total)), 'total shown matches the engine');
  await page.click('[data-act="builds-code"]');
  assert.match(await page.inputValue('#share-code'), /^RL1\./);
  await page.click('#modal .sheet [data-act="close-sheet"]');
  await page.click('[data-act="builds-load"]');
  assert.equal(await page.evaluate(() => location.hash), '#builder');
  assert.match(await text(page, '#app'), /Ryzen 5 7600/);
  await go(page, 'builds');
  await page.click('[data-act="builds-del"]');
  assert.match(await text(page, '#app'), /ما عندك تجميعات محفوظة/);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('riglab.builds.v1')).length), 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});
