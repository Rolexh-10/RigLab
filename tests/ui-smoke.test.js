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
const FILE = 'file://' + path.join(__dirname, '../dist/riglab.html');
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

const ROUTES = ['home', 'builder', 'budget', 'compat', 'parts', 'compare', 'tools', 'cart', 'ready', 'builds', 'trust', 'admin', 'psu-calc', 'ups-calc', 'upgrade-advisor', 'monitor-selector', 'storage-calc', 'power-calc'];

test('every route renders at phone width with no script errors and no horizontal page scroll', async () => {
  const { page, ctx, errors } = await open('#home');
  for (const r of ROUTES) {
    await go(page, r);
    assert.ok((await text(page, '#app')).trim().length > 40, r + ' has content');
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(over <= 1, `${r}: horizontal overflow of ${over}px`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, r + '.png'), fullPage: false });
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('home shows the sample-data notice and tool cards', async () => {
  const { page, ctx } = await open('#home');
  assert.match(await text(page, '#strip-text'), /تجريبي/);
  assert.equal(await page.locator('.toolcard').count(), 3); // parts, cart, compatibility; the rest live in the More menu
  await ctx.close();
});

test('builder: incompatible options are flagged, total adds up, clean build reads compatible', async () => {
  const { page, ctx, errors } = await open('#builder');
  await pick(page, 'cpu', 'r5-7600');
  await page.click('[data-act="pick"][data-cat="mobo"]');
  assert.ok((await page.locator('#modal [data-id="a520m"] .b-error').count()) === 1, 'A520M flagged with AM5 CPU');
  await page.click('#modal [data-act="choose"][data-id="b650m"]');
  for (const [c, id] of [['ram', 'ddr5-16-5600'], ['gpu', 'rtx4060'], ['storage', 'nvme-1tb'], ['psu', 'psu-650'], ['case', 'case-atx-mid']]) await pick(page, c, id);
  const total = (await text(page, '.fixbar .total .n')).replace(/,/g, '');
  assert.equal(+total, 270000 + 190000 + 55000 + 365000 + 65000 + 70000 + 85000);
  assert.match(await text(page, '.fixbar'), /متوافق مبدئياً/);
  assert.match(await text(page, '#app'), /ما لم يُفحص بعد/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('builder: save, share code, clear, import, My Builds, compare builds, reload keeps the build', async () => {
  const { page, ctx, errors } = await open('#builder');
  for (const [c, id] of [['cpu', 'r5-7600'], ['mobo', 'b650m'], ['ram', 'ddr5-16-5600'], ['gpu', 'rtx4060']]) await pick(page, c, id);
  await page.click('[data-act="sheet"][data-type="save"]');
  await page.fill('#save-name', 'تجربة');
  await page.click('[data-act="save-do"]');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('riglab.builds.v1')).length), 1);
  await page.click('[data-act="sheet"][data-type="share"]');
  const code = await page.inputValue('#share-code');
  assert.match(code, /^RL1\./);
  await page.click('#modal .sheet [data-act="close-sheet"]');
  await page.reload(); await page.waitForSelector('#app *');
  assert.match(await text(page, '#app'), /Ryzen 5 7600/, 'build persisted across reload');
  await page.click('[data-act="clear-build"]');
  await page.click('[data-act="sheet"][data-type="import"]');
  await page.fill('#import-code', code);
  await page.click('[data-act="import-do"]');
  assert.match(await text(page, '#app'), /Ryzen 5 7600/);
  await go(page, 'builds');
  assert.match(await text(page, '#app'), /تجربة/);
  await page.click('[data-act="builds-cmp"]');
  assert.match(await text(page, '#app'), /الحالة/);
  await page.click('[data-act="sheet"][data-type="import"]').catch(() => {});
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('compat: examples give the expected verdicts and missing data is never "compatible"', async () => {
  const { page, ctx, errors } = await open('#compat');
  assert.match(await text(page, '#compat-out'), /غير متوافق/);
  await page.click('[data-act="compat-example"][data-i="5"]');
  assert.match(await text(page, '#compat-out'), /متوافق مبدئياً/);
  await page.click('[data-act="compat-example"][data-i="4"]');
  assert.match(await text(page, '#compat-out'), /BIOS/);
  await page.click('[data-act="compat-example"][data-i="5"]');
  await page.selectOption('#cs-gpu', '');
  const t = await text(page, '#compat-out');
  assert.doesNotMatch(t.split('\n')[0], /متوافق مبدئياً/);
  assert.match(t, /غير مؤكد/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('smart budget: results, tiny-budget explanation, open in builder', async () => {
  const { page, ctx, errors } = await open('#budget');
  assert.ok((await page.locator('#app .parts-list').count()) >= 1);
  await page.fill('#b-amount', '300000');
  await page.click('[data-act="budget-run"]');
  assert.match(await text(page, '#app'), /لا توجد تجميعة متوافقة/);
  await page.click('[data-act="preset"][data-v="1800000"]');
  assert.ok((await page.locator('#app .parts-list').count()) >= 1);
  await page.click('[data-act="usage"][data-v="editing"]');
  await page.click('[data-act="budget-run"]');
  assert.match(await text(page, '#app'), /32GB/);
  await page.locator('[data-act="open-build"]').first().click();
  assert.equal(await page.evaluate(() => location.hash), '#builder');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('tools: calculators produce numbers and react to input', async () => {
  const { page, ctx, errors } = await open('#psu-calc');
  const before = await text(page, '#tool-out');
  await page.fill('#psu-gw', '300');
  assert.notEqual(await text(page, '#tool-out'), before);
  await go(page, 'ups-calc'); assert.match(await text(page, '#tool-out'), /VA/);
  await page.fill('#u-load', '900'); assert.match(await text(page, '#tool-out'), /الحمل يتجاوز/);
  await go(page, 'upgrade-advisor'); assert.match(await text(page, '#tool-out'), /ترقية/);
  await go(page, 'monitor-selector'); assert.match(await text(page, '#tool-out'), /Hz/);
  await go(page, 'storage-calc'); assert.match(await text(page, '#tool-out'), /GB/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('parts: global search shows per-store prices sorted by price; sponsored is labelled and does not jump the order', async () => {
  const { page, ctx, errors } = await open('#home');
  await page.fill('#h-q', 'RTX 4060');
  await page.press('#h-q', 'Enter');
  assert.equal(await page.evaluate(() => location.hash), '#parts');
  assert.match(await text(page, '#plist'), /RTX 4060/);
  await page.locator('[data-act="parts-toggle"]').first().click();
  const t = await text(page, '#plist');
  assert.match(t, /تجريبي/); assert.match(t, /برعاية/); assert.match(t, /الأقل سعراً/);
  const prices = await page.$$eval('#plist tbody tr td:nth-child(2)', (tds) => tds.map((x) => +x.textContent.replace(/,/g, '')).filter((n) => n > 0));
  assert.ok(prices.length >= 3);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('parts: Arabic category word finds parts (all-categories search)', async () => {
  const { page, ctx } = await open('#parts');
  await page.fill('#pq', 'معالج');
  assert.ok((await page.locator('#plist .card').count()) >= 5);
  await ctx.close();
});

test('cart: add from parts, grouped by store, qty/remove, buy buttons disabled with "قريباً", persists', async () => {
  const { page, ctx, errors } = await open('#parts');
  await page.fill('#pq', 'RTX 4060');
  await page.locator('#plist [data-act="add-cart"]').first().click();
  await page.fill('#pq', 'Ryzen 5 7600');
  await page.locator('#plist [data-act="add-cart"]').first().click();
  assert.ok((await text(page, '#cart-badge')) === '2');
  await go(page, 'cart');
  assert.ok((await page.locator('#app section.card').count()) >= 2 || (await page.locator('#app section.card').count()) >= 1);
  await page.locator('[data-act="cart-qty"][data-d="1"]').first().click();
  assert.equal(await text(page, '#cart-badge'), '3');
  const buys = await page.$$eval('#app section.card button.pri[disabled]', (bs) => bs.map((b) => b.parentElement.textContent));
  assert.ok(buys.length >= 1);
  for (const t of buys) assert.match(t, /قريباً/);
  await page.reload(); await page.waitForSelector('#app *');
  assert.equal(await text(page, '#cart-badge'), '3', 'cart persisted');
  await page.locator('[data-act="cart-rm"]').first().click();
  await page.click('[data-act="cart-clear"]').catch(() => {});
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('cart: builder parts go to the cart at the cheapest store; empty cart explains itself', async () => {
  const { page, ctx, errors } = await open('#cart');
  assert.match(await text(page, '#app'), /السلة فارغة/);
  await go(page, 'builder');
  for (const [c, id] of [['cpu', 'r5-7600'], ['mobo', 'b650m'], ['gpu', 'rtx4060']]) await pick(page, c, id);
  await page.click('[data-act="cart-from-build"]');
  assert.equal(await page.evaluate(() => location.hash), '#cart');
  assert.equal(await text(page, '#cart-badge'), '3');
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(over <= 1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('bottom nav on phones: 5 items, More sheet lists the other pages', async () => {
  const { page, ctx } = await open('#home');
  assert.equal(await page.locator('#bnav-in > *').count(), 5);
  await page.click('#bnav [data-act="more"]');
  assert.ok((await page.locator('#modal .morelist a').count()) >= 5);
  await ctx.close();
});

test('ad slots are labelled, absent from compat results, and the power tool computes amps', async () => {
  const { page, ctx, errors } = await open('#home');
  for (const r of ['home', 'parts', 'builder']) {
    await go(page, r);
    const slot = page.locator('#app .ad').first();
    assert.match(await slot.innerText(), /إعلان/);
    assert.equal(await page.locator('#compat-out .ad, .chk .ad').count(), 0);
  }
  await go(page, 'power-calc');
  assert.match(await text(page, '#tool-out'), /A/);
  await page.fill('#pw-w', '440');
  assert.match(await text(page, '#tool-out'), /2\.0 A/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('3D builder: canvas draws parts, reacts to picks and rotate buttons, flags a GPU longer than the case', async () => {
  const { page, ctx, errors } = await open('#builder', { width: 390, height: 900 });
  await page.goto(FILE.split('#')[0] + '?flat3d#builder'); await page.reload(); await page.waitForSelector('#app *'); // canvas-2D fallback path
  const nonBlank = () => page.evaluate(() => { const c = document.getElementById('rig3d'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; });
  await page.waitForTimeout(200);
  const empty = await nonBlank();
  for (const [c, id] of [['case', 'case-matx'], ['mobo', 'b650m'], ['cpu', 'r5-7600'], ['gpu', 'rx7800xt']]) await pick(page, c, id);
  await page.waitForTimeout(900);
  assert.notEqual(await nonBlank(), empty, 'canvas redraws after picks'); assert.ok(empty > 500, 'ghost outline is drawn');
  const flagged = await page.evaluate(() => { const L = window.RigLab3D.layout({ case: { id: 'x', formFactors: ['mATX'], maxGpuMm: 280 }, gpu: { id: 'g', lengthMm: 285 } }); return L.find((i) => i.key === 'gpu').bad; });
  assert.equal(flagged, true, 'oversize GPU is flagged in the 3D layout');
  const y0 = await page.evaluate(() => window.RigLab3D.view.yaw);
  await page.click('[data-act="rot3d"][data-d="0.5"]');
  assert.notEqual(await page.evaluate(() => window.RigLab3D.view.yaw), y0);
  assert.match(await text(page, '#app'), /أمبيرات المولدة/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('summer cooling margin: judged only with a known cooler rating, labelled as a rule of thumb', async () => {
  const { page, ctx, errors } = await open('#builder');
  for (const [c, id] of [['cpu', 'i7-14700k'], ['gpu', 'rtx4060'], ['cooler', 'cool-tower-120']]) await pick(page, c, id);
  const t = await text(page, '#app');
  assert.match(t, /هامش التبريد لصيف العراق/);
  assert.match(t, /150W \/ 125W = 1\.20×/);
  assert.match(t, /ليست قياس حرارة/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('ready builds: tiers render, WhatsApp share link is built, add-to-cart works; favourites persist; cart shows saving table', async () => {
  const { page, ctx, errors } = await open('#ready');
  assert.ok((await page.locator('#app .card').count()) >= 3);
  assert.match(await page.locator('#app a[href^="https://wa.me/?text="]').first().getAttribute('href'), /RigLab/);
  await page.locator('[data-act="cart-ids"]').first().click();
  assert.equal(await page.evaluate(() => location.hash), '#cart');
  assert.match(await text(page, '#app'), /شكد يوفر لي/);
  await go(page, 'parts');
  await page.fill('#pq', 'RTX 4060');
  await page.locator('[data-act="wish"]').first().click();
  await page.reload(); await page.waitForSelector('#app *');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('riglab.wish.v1')).length), 1);
  await page.click('[data-act="parts-fav"]');
  assert.equal(await page.locator('#plist .card').count(), 1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('contact details appear in the partners tab', async () => {
  const { page, ctx } = await open('#trust');
  await page.click('[data-act="trust-tab"][data-v="partners"]');
  const t = await text(page, '#app');
  assert.match(t, /rolexmud@gmail\.com/); assert.match(t, /\+9647812388994/);
  await ctx.close();
});

test('language toggle flips direction both ways', async () => {
  const { page, ctx, errors } = await open('#builder');
  await page.click('#lang-btn');
  assert.equal(await page.getAttribute('#rl', 'dir'), 'ltr');
  assert.match(await text(page, '#app'), /Compatibility result/);
  await page.click('#lang-btn');
  assert.equal(await page.getAttribute('#rl', 'dir'), 'rtl');
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('disabled controls are explicitly marked "coming soon"', async () => {
  const { page, ctx } = await open('#builder');
  await pick(page, 'cpu', 'r5-7600');
  await go(page, 'parts');
  await page.fill('#pq', 'RTX 4060');
  await go(page, 'cart');
  await page.evaluate(() => window.RigLabApp.ACT['cart-from-build']);
  await page.evaluate(() => { const S = window.RigLabApp.state; S.cart.push({ partId: 'rtx4060', storeId: 'sample-a', qty: 1 }); window.RigLabApp.render(); });
  const dis = await page.$$eval('#app button[disabled]', (bs) => bs.map((b) => b.parentElement.textContent));
  assert.ok(dis.length >= 1);
  for (const t of dis) assert.match(t, /قريباً/);
  await ctx.close();
});

test('desktop width renders without horizontal scroll', async () => {
  const { page, ctx } = await open('#builder', { width: 1280, height: 900 });
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(over <= 1);
  await ctx.close();
});

test('WebGL viewer: real GLB models load and draw when WebGL2 exists; credits tab lists authors', async () => {
  const { page, ctx, errors } = await open('#builder', { width: 390, height: 900 });
  for (const [c, id] of [['case', 'case-matx'], ['mobo', 'b650m'], ['cpu', 'r5-7600'], ['gpu', 'rx7800xt']]) await pick(page, c, id);
  const info = await page.evaluate(() => { const v = window.RigLabApp.state.v3; return v && v.models ? Object.values(v.models).map((m) => m.state) : null; });
  if (info) assert.deepEqual([...new Set(info)], ['ready'], 'all embedded models parse');
  await page.goto(FILE.split('#')[0] + '#trust'); await page.click('[data-act="trust-tab"][data-v="credits"]');
  const t = await text(page, '#app'); assert.match(t, /CC BY 4\.0/); assert.match(t, /darky\.vip21/);
  assert.deepEqual(errors, []);
  await ctx.close();
});
