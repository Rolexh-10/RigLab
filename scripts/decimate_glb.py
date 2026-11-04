#!/usr/bin/env python3
"""Reduce triangle count of a GLB by vertex clustering, then shrink textures.
usage: decimate_glb.py in.glb out.glb target_tris [max_tex_px=512]"""
import sys, json, struct, io, numpy as np
from PIL import Image
CT={5120:np.int8,5121:np.uint8,5122:np.int16,5123:np.uint16,5125:np.uint32,5126:np.float32}
NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
src,dst,target=sys.argv[1],sys.argv[2],int(sys.argv[3]); MAXTEX=int(sys.argv[4]) if len(sys.argv)>4 else 512
d=open(src,'rb').read(); jl=struct.unpack('<I',d[12:16])[0]; j=json.loads(d[20:20+jl])
bo=20+jl+(4-jl%4)%4; bl=struct.unpack('<I',d[bo:bo+4])[0]; B=d[bo+8:bo+8+bl]
def acc(i):
    a=j['accessors'][i]; bv=j['bufferViews'][a['bufferView']]; dt=np.dtype(CT[a['componentType']]); n=NC[a['type']]
    off=bv.get('byteOffset',0)+a.get('byteOffset',0); st=bv.get('byteStride') or dt.itemsize*n
    if st==dt.itemsize*n: arr=np.frombuffer(B,dt,a['count']*n,off).reshape(a['count'],n)
    else: arr=np.stack([np.frombuffer(B,dt,n,off+k*st) for k in range(a['count'])])
    if a.get('normalized') and dt!=np.float32: arr=np.maximum(arr/np.iinfo(dt).max,-1)
    return arr.astype(np.float32 if arr.dtype!=np.uint32 and a['type']!='SCALAR' else arr.dtype)
prims=[]
for mi,m in enumerate(j['meshes']):
    for p in m['primitives']:
        if p.get('mode',4)!=4 or 'POSITION' not in p['attributes']: continue
        P=acc(p['attributes']['POSITION']).astype(np.float64)
        idx=acc(p['indices']).reshape(-1).astype(np.int64) if 'indices' in p else np.arange(len(P))
        prims.append((p,P,idx))
import os
DS=float(os.environ.get('DROPSMALL','0'))
if DS>0:
    allP=np.concatenate([P for _,P,_ in prims]); g=(allP.max(0)-allP.min(0)).max(); keep=[]
    for p,P,i in prims:
        if (P.max(0)-P.min(0)).max()<DS*g: p['_drop']=True
        else: keep.append((p,P,i))
    prims=keep
total=sum(len(i)//3 for _,_,i in prims); ratio=min(1.0,target/max(1,total))
print(src.split('/')[-1][:40],'tris',total,'->',int(total*ratio))
out=bytearray(); bvs=[]; accs=[]
def add(arr,target_):
    while len(out)%4: out.append(0)
    off=len(out); out.extend(arr.tobytes()); bvs.append({'buffer':0,'byteOffset':off,'byteLength':arr.nbytes,**({'target':target_} if target_ else {})}); return len(bvs)-1
def addacc(arr,ctype,typ,target_,mn=None,mx=None):
    bv=add(arr,target_); a={'bufferView':bv,'componentType':ctype,'count':len(arr),'type':typ}
    if mn is not None: a['min']=mn; a['max']=mx
    accs.append(a); return len(accs)-1
for p,P,idx in prims:
    tris=len(idx)//3; want=max(12,int(tris*ratio)); T=idx.reshape(-1,3)
    A={k:acc(v) for k,v in p['attributes'].items() if k in('NORMAL','TEXCOORD_0')}
    if want<tris:
        lo=P.min(0); ext=(P.max(0)-lo).max()+1e-9; cell=ext/200.0
        for _ in range(40):
            q=np.floor((P-lo)/cell).astype(np.int64); key=(q[:,0]*73856093)^(q[:,1]*19349663)^(q[:,2]*83492791)
            u,inv=np.unique(key,return_inverse=True); Tn=inv[T]; ok=(Tn[:,0]!=Tn[:,1])&(Tn[:,1]!=Tn[:,2])&(Tn[:,0]!=Tn[:,2]); cnt=ok.sum()
            if cnt<=want: break
            cell*=1.18
        # reverse once if we overshot too low (keep it simple: accept)
        Tn=Tn[ok]; used=np.unique(Tn); remap=-np.ones(len(u),np.int64); remap[used]=np.arange(len(used))
        cent=np.zeros((len(u),3)); np.add.at(cent,inv,P); cnts=np.bincount(inv,minlength=len(u)); cent/=np.maximum(cnts,1)[:,None]
        rep=np.zeros(len(u),np.int64); dist=np.full(len(u),1e30)
        dd=((P-cent[inv])**2).sum(1); order=np.argsort(-dd); rep[inv[order]]=order  # last write = closest
        newP=cent[used]; sel=rep[used]; newT=remap[Tn]
        newA={k:v[sel] for k,v in A.items()}
        if 'NORMAL' in newA: n=newA['NORMAL']; newA['NORMAL']=n/np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-9)
    else:
        newP=P; newT=T; newA=A
    if len(newT)==0:
        p['_drop']=True; continue
    pa={}
    pa['POSITION']=addacc(newP.astype(np.float32),5126,'VEC3',34962,newP.min(0).tolist(),newP.max(0).tolist())
    if 'NORMAL' in newA: pa['NORMAL']=addacc(newA['NORMAL'].astype(np.float32),5126,'VEC3',34962)
    if 'TEXCOORD_0' in newA: pa['TEXCOORD_0']=addacc(newA['TEXCOORD_0'].astype(np.float32),5126,'VEC2',34962)
    p['attributes']=pa; small=len(newP)<65535; p['indices']=addacc(newT.reshape(-1).astype(np.uint16 if small else np.uint32),5123 if small else 5125,'SCALAR',34963)
for m in j['meshes']:
    m['primitives']=[p for p in m['primitives'] if not p.get('_drop')]
    for p in m['primitives']:
        for k in list(p['attributes']):
            if k not in('POSITION','NORMAL','TEXCOORD_0'): del p['attributes'][k]
        p.pop('targets',None)
for im in j.get('images',[]):
    bv=j['bufferViews'][im['bufferView']]; raw=B[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']]
    img=Image.open(io.BytesIO(raw)); img.load()
    if max(img.size)>MAXTEX: k=MAXTEX/max(img.size); img=img.resize((max(1,round(img.size[0]*k)),max(1,round(img.size[1]*k))),Image.LANCZOS)
    o=io.BytesIO()
    if img.mode in('RGBA','LA') and img.getchannel('A').getextrema()[0]<255: img.convert('RGBA').save(o,'PNG',optimize=True); im['mimeType']='image/png'
    else: img.convert('RGB').save(o,'JPEG',quality=72,optimize=True); im['mimeType']='image/jpeg'
    b=np.frombuffer(o.getvalue(),np.uint8); im['bufferView']=add(b,None)
j['accessors']=accs; j['bufferViews']=bvs; j['buffers']=[{'byteLength':len(out)}]
for k in('skins','animations'): j.pop(k,None)
for n in j['nodes']: n.pop('skin',None)
while len(out)%4: out.append(0)
js=json.dumps(j,separators=(',',':')).encode(); js+=b' '*((4-len(js)%4)%4)
res=struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(out))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(out),0x004E4942)+bytes(out)
open(dst,'wb').write(res); print('  ->',len(res)//1024,'KB')
