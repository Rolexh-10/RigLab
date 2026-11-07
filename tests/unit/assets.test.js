'use strict';
// RigLabAssets (src/render3d/assets.js): URL resolution, de-duplication, abort-on-release, payload validation. No browser needed.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const code = fs.readFileSync(path.join(__dirname, '../../src/render3d/assets.js'), 'utf8');

function glb(n) { const b = Buffer.alloc(n); b.writeUInt32LE(0x46546c67, 0); return b; }
function load(baseURI, fetchImpl) {
  const sb = { URL, AbortController, setTimeout, clearTimeout, DataView, Promise, Object, Error, fetch: fetchImpl, location: { href: baseURI }, document: { baseURI } };
  sb.window = sb; vm.createContext(sb); vm.runInContext(code, sb); return sb.RigLabAssets;
}
const abortable = (data) => (url, o) => new Promise((resolve, reject) => {
  const t = setTimeout(() => resolve({ ok: true, status: 200, arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.length) }), 30);
  o.signal.addEventListener('abort', () => { clearTimeout(t); const e = new Error('aborted'); e.name = 'AbortError'; reject(e); });
});

test('relative URLs resolve under a non-root base and at the root; cross-origin is refused', () => {
  assert.equal(load('https://u.github.io/RigLab/', abortable(glb(40))).resolve('assets/models/a.glb?v=1'), 'https://u.github.io/RigLab/assets/models/a.glb?v=1');
  assert.equal(load('http://localhost:8080/', abortable(glb(40))).resolve('assets/models/a.glb'), 'http://localhost:8080/assets/models/a.glb');
  assert.throws(() => load('https://u.github.io/RigLab/', abortable(glb(40))).resolve('https://evil.example/a.glb'), /cross-origin/);
});

test('concurrent requests for one model share a single fetch', async () => {
  const urls = [], A = load('http://h/', (u, o) => { urls.push(u); return abortable(glb(40))(u, o); });
  const [a, b] = await Promise.all([A.request('m', { url: 'a.glb', bytes: 40 }, 'v1'), A.request('m', { url: 'a.glb', bytes: 40 }, 'v2')]);
  assert.equal(urls.length, 1); assert.equal(a.byteLength, 40); assert.strictEqual(a, b);
  assert.equal(A.stats().fetches, 1); assert.equal(A.pending(), 0);
});

test('the fetch is aborted only when the last interested owner releases it', async () => {
  const A = load('http://h/', abortable(glb(40)));
  const p1 = A.request('m', { url: 'a.glb', bytes: 40 }, 'v1'), p2 = A.request('m', { url: 'a.glb', bytes: 40 }, 'v2');
  A.release('m', 'v1'); assert.equal(A.pending(), 1, 'still wanted by v2');
  assert.equal((await p2).byteLength, 40); await p1;
  const p3 = A.request('n', { url: 'b.glb', bytes: 40 }, 'v1'); p3.catch(() => {});
  A.release('n', 'v1');
  await assert.rejects(p3, (e) => e.name === 'AbortError'); assert.equal(A.stats().aborted, 1); assert.equal(A.pending(), 0);
});

test('truncated, wrong-size and non-GLB payloads are rejected', async () => {
  const bad = { size: abortable(glb(30)), magic: abortable(Buffer.alloc(40, 1)), http: async () => ({ ok: false, status: 404 }) };
  await assert.rejects(load('http://h/', bad.size).request('m', { url: 'a.glb', bytes: 40 }, 'v'), /size mismatch/);
  await assert.rejects(load('http://h/', bad.magic).request('m', { url: 'a.glb', bytes: 40 }, 'v'), /not a GLB/);
  await assert.rejects(load('http://h/', bad.http).request('m', { url: 'a.glb', bytes: 40 }, 'v'), /HTTP 404/);
});

test('a failed request is not cached: the next request fetches again', async () => {
  let n = 0; const A = load('http://h/', async () => { n++; return n === 1 ? { ok: false, status: 500 } : { ok: true, arrayBuffer: async () => glb(40).buffer.slice(0, 40) }; });
  await assert.rejects(A.request('m', { url: 'a.glb', bytes: 40 }, 'v'));
  assert.equal((await A.request('m', { url: 'a.glb', bytes: 40 }, 'v')).byteLength, 40); assert.equal(n, 2);
});
