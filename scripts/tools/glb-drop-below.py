#!/usr/bin/env python3
"""Drop every triangle that has a vertex below a local-Z/Y threshold in a single-mesh GLB (e.g. the hidden pin grid of a CPU).
usage: glb-drop-below.py in.glb out.glb --axis 2 --below -0.3
Rewrites POSITION/NORMAL/TEXCOORD_0 + uint16/uint32 indices; drops TANGENT (the viewer does not use normal maps)."""
import json, struct, sys
import numpy as np

def arg(n, d=None): return sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
src, dst, axis, below = sys.argv[1], sys.argv[2], int(arg('--axis', 2)), float(arg('--below'))
b = open(src, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]; j = json.loads(b[20:20 + n]); off = 20 + n
bl = struct.unpack('<I', b[off:off + 4])[0]; bn = b[off + 8:off + 8 + bl]
CT = {5126: '<f4', 5123: '<u2', 5125: '<u4', 5121: 'u1'}; NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
def acc(i):
    a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; nc = NC[a['type']]; dt = np.dtype(CT[a['componentType']])
    stride = bv.get('byteStride') or dt.itemsize * nc; base = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    raw = np.frombuffer(bn, dtype=np.uint8, count=stride * (a['count'] - 1) + dt.itemsize * nc, offset=base)
    return np.ndarray((a['count'], nc), dtype=dt, buffer=raw, strides=(stride, dt.itemsize)).copy()
assert len(j['meshes']) == 1 and len(j['meshes'][0]['primitives']) == 1, 'single primitive only'
p = j['meshes'][0]['primitives'][0]
pos = acc(p['attributes']['POSITION']); nor = acc(p['attributes']['NORMAL']); uv = acc(p['attributes']['TEXCOORD_0']); idx = acc(p['indices']).reshape(-1, 3).astype(np.int64)
keep_v = pos[:, axis] >= below; keep_t = keep_v[idx].all(axis=1); idx = idx[keep_t]
used = np.unique(idx.ravel()); remap = np.full(len(pos), -1, np.int64); remap[used] = np.arange(len(used)); idx = remap[idx]
pos, nor, uv = pos[used], nor[used], uv[used]
print('triangles', int(keep_t.size), '->', len(idx), '| vertices', int(keep_v.size), '->', len(used))
out = bytearray(); bvs = []; accs = []
def add(arr, target, comp, typ, minmax=False):
    while len(out) % 4: out.append(0)
    data = np.ascontiguousarray(arr).tobytes(); bvs.append({'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data), 'target': target}); out.extend(data)
    a = {'bufferView': len(bvs) - 1, 'componentType': comp, 'count': int(arr.shape[0]), 'type': typ}
    if minmax: a['min'] = [float(x) for x in arr.min(axis=0)]; a['max'] = [float(x) for x in arr.max(axis=0)]
    accs.append(a); return len(accs) - 1
ap = add(pos.astype('<f4'), 34962, 5126, 'VEC3', True); an = add(nor.astype('<f4'), 34962, 5126, 'VEC3'); au = add(uv.astype('<f4'), 34962, 5126, 'VEC2')
ai = add(idx.reshape(-1).astype('<u2' if len(used) < 65536 else '<u4'), 34963, 5123 if len(used) < 65536 else 5125, 'SCALAR')
# keep image bufferViews (textures) by copying them after the geometry
for im in j.get('images', []):
    bv = j['bufferViews'][im['bufferView']]; data = bn[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
    while len(out) % 4: out.append(0)
    bvs.append({'buffer': 0, 'byteOffset': len(out), 'byteLength': len(data)}); out.extend(data); im['bufferView'] = len(bvs) - 1
p['attributes'] = {'POSITION': ap, 'NORMAL': an, 'TEXCOORD_0': au}; p['indices'] = ai
j['accessors'] = accs; j['bufferViews'] = bvs
while len(out) % 4: out.append(0)
j['buffers'] = [{'byteLength': len(out)}]
js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
res = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(out), 0x004E4942) + bytes(out)
open(dst, 'wb').write(res); print(dst, len(res), 'bytes')
