#!/usr/bin/env python3
"""Repack a GLB keeping only the textures the RigLab renderer samples (base colour + emissive).
usage: glb-strip-textures.py in.glb out.glb [--jpeg-max 1024 --jpeg-quality 80]
Drops normal / occlusion / metallic-roughness textures (the viewer ignores them) and unused bufferViews, then rewrites the BIN chunk."""
import io, json, struct, sys
from PIL import Image

def read(path):
    b = open(path, 'rb').read(); n = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + n]); off = 20 + n; bl = struct.unpack('<I', b[off:off + 4])[0]
    return j, b[off + 8:off + 8 + bl]

def main():
    src, dst = sys.argv[1], sys.argv[2]
    mx = int(sys.argv[sys.argv.index('--jpeg-max') + 1]) if '--jpeg-max' in sys.argv else 1024
    q = int(sys.argv[sys.argv.index('--jpeg-quality') + 1]) if '--jpeg-quality' in sys.argv else 80
    j, bn = read(src)
    keep_tex = set()
    for m in j.get('materials', []):
        for k in ('normalTexture', 'occlusionTexture'): m.pop(k, None)
        pbr = m.get('pbrMetallicRoughness', {}); pbr.pop('metallicRoughnessTexture', None)
        for t in (pbr.get('baseColorTexture'), m.get('emissiveTexture')):
            if t: keep_tex.add(t['index'])
    # remap textures/images
    tex_map, img_map, new_tex, new_img = {}, {}, [], []
    for ti in sorted(keep_tex):
        t = dict(j['textures'][ti]); si = t['source']
        if si not in img_map: img_map[si] = len(new_img); new_img.append(dict(j['images'][si]))
        t['source'] = img_map[si]; tex_map[ti] = len(new_tex); new_tex.append(t)
    for m in j.get('materials', []):
        pbr = m.get('pbrMetallicRoughness', {})
        for t in (pbr.get('baseColorTexture'), m.get('emissiveTexture')):
            if t: t['index'] = tex_map[t['index']]
    old_img = j['images']; j['textures'] = new_tex; j['images'] = new_img
    if not new_tex: j.pop('textures'); j.pop('images')
    # collect bufferViews in use
    used, order = {}, []
    def need(bvi):
        if bvi not in used: used[bvi] = None; order.append(bvi)
    for a in j.get('accessors', []):
        if 'bufferView' in a: need(a['bufferView'])
    img_bytes = {}
    for si, ni in img_map.items():
        bv = j['bufferViews'][old_img[si]['bufferView']]; d = bn[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
        im = Image.open(io.BytesIO(d))
        if max(im.size) > mx: im = im.resize((max(1, im.width * mx // max(im.size)), max(1, im.height * mx // max(im.size))), Image.LANCZOS)
        out = io.BytesIO()
        if new_img[ni].get('mimeType') == 'image/png' and im.mode == 'RGBA' and im.getchannel('A').getextrema()[0] < 255: im.save(out, 'PNG', optimize=True)
        else: im.convert('RGB').save(out, 'JPEG', quality=q, optimize=True); new_img[ni]['mimeType'] = 'image/jpeg'
        img_bytes[ni] = out.getvalue()
    new_bin, new_bvs, remap = bytearray(), [], {}
    def add(data, tmpl):
        while len(new_bin) % 4: new_bin.append(0)
        bv = {k: v for k, v in tmpl.items() if k not in ('byteOffset', 'byteLength')}; bv['byteOffset'] = len(new_bin); bv['byteLength'] = len(data)
        new_bin.extend(data); new_bvs.append(bv); return len(new_bvs) - 1
    for bvi in order:
        bv = j['bufferViews'][bvi]; remap[bvi] = add(bn[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']], bv)
    for a in j.get('accessors', []):
        if 'bufferView' in a: a['bufferView'] = remap[a['bufferView']]
    for ni, d in img_bytes.items(): new_img[ni]['bufferView'] = add(d, {})
    j['bufferViews'] = new_bvs
    while len(new_bin) % 4: new_bin.append(0)
    j['buffers'] = [{'byteLength': len(new_bin)}]
    js = json.dumps(j, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(new_bin)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(new_bin), 0x004E4942) + bytes(new_bin)
    open(dst, 'wb').write(out); print(src, '->', dst, len(out), 'bytes')
main()
