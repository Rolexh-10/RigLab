'use strict';
// Minimal GLB inspector for tooling (no dependencies): structure checks, true vertex bounds, triangle/texture counts.
const CT = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16 };

function parse(buf) {
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB (bad magic)');
  if (buf.readUInt32LE(4) !== 2) throw new Error('GLB version must be 2');
  if (buf.readUInt32LE(8) !== buf.length) throw new Error('GLB length header does not match file size (truncated?)');
  let off = 12, json = null, bin = null;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4), data = buf.subarray(off + 8, off + 8 + len);
    if (data.length !== len) throw new Error('chunk exceeds file');
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8')); else if (type === 0x004e4942 && !bin) bin = data;
    off += 8 + len;
  }
  if (!json) throw new Error('missing JSON chunk');
  return { json, bin };
}
function nodeMatrix(n) {
  if (n.matrix) return n.matrix.slice();
  const t = n.translation || [0, 0, 0], r = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1], [x, y, z, w] = r;
  return [(1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0, 2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0, 2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0, t[0], t[1], t[2], 1];
}
const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
const pt = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];

function readPositions(g, accIdx) {
  const a = g.json.accessors[accIdx], bv = g.json.bufferViews[a.bufferView], [T, bs] = CT[a.componentType], n = NC[a.type];
  const base = (bv.byteOffset || 0) + (a.byteOffset || 0), stride = bv.byteStride || n * bs, dv = new DataView(g.bin.buffer, g.bin.byteOffset, g.bin.length), out = [];
  const norm = a.normalized ? { 5120: 127, 5121: 255, 5122: 32767, 5123: 65535 }[a.componentType] : 0;
  for (let i = 0; i < a.count; i++) {
    const v = [];
    for (let c = 0; c < 3; c++) {
      const p = base + i * stride + c * bs; let x;
      switch (a.componentType) { case 5126: x = dv.getFloat32(p, true); break; case 5123: x = dv.getUint16(p, true); break; case 5122: x = dv.getInt16(p, true); break; case 5121: x = dv.getUint8(p); break; case 5120: x = dv.getInt8(p); break; default: x = dv.getUint32(p, true); }
      v.push(norm ? Math.max(x / norm, -1) : x);
    }
    out.push(v);
  }
  return out;
}

// Structural validation + metrics. Throws on invalid files; returns { bbox, extents, triangles, prims, textures, textureBytes, binBytes, warnings }.
function inspect(buf) {
  const g = parse(buf), j = g.json, warnings = [];
  if (!j.asset || String(j.asset.version) !== '2.0') throw new Error('asset.version must be 2.0');
  if (!g.bin) throw new Error('missing BIN chunk');
  (j.buffers || []).forEach((b, i) => { if (b.uri) throw new Error('buffers[' + i + '] uses an external/embedded uri (GLB must be self-contained)'); if (b.byteLength > g.bin.length) throw new Error('buffers[' + i + '] longer than BIN chunk'); });
  (j.images || []).forEach((im, i) => { if (im.uri) throw new Error('images[' + i + '] uses a uri (must live in a bufferView)'); if (im.bufferView == null) throw new Error('images[' + i + '] has no bufferView'); });
  (j.bufferViews || []).forEach((bv, i) => { if ((bv.byteOffset || 0) + bv.byteLength > g.bin.length) throw new Error('bufferViews[' + i + '] out of range'); });
  (j.accessors || []).forEach((a, i) => {
    if (a.bufferView == null) return;
    const bv = j.bufferViews[a.bufferView]; if (!bv) throw new Error('accessors[' + i + '] bad bufferView');
    const ct = CT[a.componentType], n = NC[a.type]; if (!ct || !n) throw new Error('accessors[' + i + '] bad type');
    const need = (a.byteOffset || 0) + (bv.byteStride || ct[1] * n) * (a.count - 1) + ct[1] * n;
    if (need > bv.byteLength) throw new Error('accessors[' + i + '] reads past its bufferView');
  });
  const scene = j.scenes && j.scenes[j.scene || 0]; if (!scene) throw new Error('no scene');
  const min = [1e12, 1e12, 1e12], max = [-1e12, -1e12, -1e12]; let triangles = 0, prims = 0;
  const visit = (ni, parent) => {
    const n = j.nodes[ni]; if (!n) throw new Error('bad node index ' + ni);
    const w = mul(parent, nodeMatrix(n));
    if (n.mesh != null) for (const pr of j.meshes[n.mesh].primitives) {
      if ((pr.mode != null && pr.mode !== 4) || pr.attributes.POSITION == null) continue;
      prims++; triangles += (pr.indices != null ? j.accessors[pr.indices].count : j.accessors[pr.attributes.POSITION].count) / 3;
      for (const p of readPositions(g, pr.attributes.POSITION)) { const q = pt(w, p); for (let k = 0; k < 3; k++) { if (q[k] < min[k]) min[k] = q[k]; if (q[k] > max[k]) max[k] = q[k]; } }
    }
    (n.children || []).forEach((c) => visit(c, w));
  };
  scene.nodes.forEach((ni) => visit(ni, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
  if (!prims) throw new Error('no triangle geometry');
  let textureBytes = 0; (j.images || []).forEach((im) => { textureBytes += j.bufferViews[im.bufferView].byteLength; });
  const extents = [0, 1, 2].map((k) => max[k] - min[k]);
  if (extents.some((e) => !(e > 0) || !isFinite(e))) throw new Error('degenerate bounding box ' + extents.join(','));
  return { bbox: { min, max }, extents, triangles, prims, textures: (j.images || []).length, textureBytes, binBytes: g.bin.length, warnings };
}
module.exports = { parse, inspect };
