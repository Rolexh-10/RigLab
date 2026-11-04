#!/usr/bin/env python3
"""Shrink a GLB: downscale + re-encode embedded textures. usage: optimize_glb.py in.glb out.glb [maxpx=512] [quality=78]"""
import sys, json, struct, io
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
MAX = int(sys.argv[3]) if len(sys.argv) > 3 else 512
Q = int(sys.argv[4]) if len(sys.argv) > 4 else 78
d = open(src, 'rb').read()
jl = struct.unpack('<I', d[12:16])[0]
j = json.loads(d[20:20 + jl])
bo = 20 + jl + (4 - jl % 4) % 4
bl = struct.unpack('<I', d[bo:bo + 4])[0]
bin_ = d[bo + 8:bo + 8 + bl]
newimg = {}
for i, im in enumerate(j.get('images', [])):
    bv = j['bufferViews'][im['bufferView']]
    raw = bin_[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
    img = Image.open(io.BytesIO(raw)); img.load()
    if max(img.size) > MAX:
        k = MAX / max(img.size); img = img.resize((max(1, round(img.size[0] * k)), max(1, round(img.size[1] * k))), Image.LANCZOS)
    out = io.BytesIO()
    if img.mode in ('RGBA', 'LA', 'P') and img.getchannel('A').getextrema()[0] < 255 if img.mode in ('RGBA', 'LA') else False:
        img.convert('RGBA').save(out, 'PNG', optimize=True); im['mimeType'] = 'image/png'
    else:
        img.convert('RGB').save(out, 'JPEG', quality=Q, optimize=True); im['mimeType'] = 'image/jpeg'
    newimg[im['bufferView']] = out.getvalue()
chunks, off = [], 0
for k, bv in enumerate(j['bufferViews']):
    data = newimg.get(k) or bin_[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
    bv['byteOffset'] = off; bv['byteLength'] = len(data)
    pad = (4 - len(data) % 4) % 4
    chunks.append(data + b'\0' * pad); off += len(data) + pad
nb = b''.join(chunks); j['buffers'][0]['byteLength'] = len(nb); j['buffers'][0].pop('uri', None)
js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(nb)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(nb), 0x004E4942) + nb
open(dst, 'wb').write(out)
print(src.split('/')[-1], len(d) // 1024, 'KB ->', len(out) // 1024, 'KB', 'tris~', sum(j['accessors'][p['indices']]['count'] // 3 for m in j['meshes'] for p in m['primitives'] if 'indices' in p))
