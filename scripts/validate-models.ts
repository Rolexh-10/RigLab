// Model onboarding validator:  npx tsx scripts/validate-models.ts [--json]
// Checks models/manifest.json against the files on disk, the GLB structure, the product catalog and the identity rules.
// Exit code 1 on any ERROR. WARNINGs are advisory (reported, never silent).
import * as fs from 'fs';
import * as path from 'path';
import * as vm from 'vm';
const glb = require('./lib/glb.js');
const C = require('../src/core/index.ts');
const ID = require('../src/render3d/identity.js');
const root = path.join(__dirname, '..');

const CATS = ['gpu', 'cpu', 'mobo', 'ram', 'ssd', 'psu', 'case', 'cooler', 'coolerpump'];
const VENDORS = ['amd', 'nvidia', 'intel', 'neutral'];
const LEVELS = ['exact', 'representative'];
const REQUIRED_IDENTITY: Record<string, string[]> = { gpu: ['vendor', 'chip'], cpu: ['vendor', 'socket'], mobo: ['vendor', 'chipset', 'form'], ram: ['ddr'] };
const SIZE_WARN = 2 * 1024 * 1024, SIZE_ERR = 6 * 1024 * 1024;

export interface Finding { level: 'ERROR' | 'WARN'; model: string; msg: string }
export interface ModelInfo { id: string; file: string; bytes: number; triangles: number; textures: number; extents: number[]; fit?: any }

// Real scene boxes come from the renderer's own layout(), so "nominal size" is exactly what the viewer fits the model into.
function layoutFn() {
  const sb: any = { window: {}, Math, Object, Array, Number, parseInt, String };
  sb.window = sb; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(root, 'src/render3d/viewer3d.js'), 'utf8'), sb);
  return sb.RigLab3D.layout as (parts: any) => any[];
}
const part = (cat: string, id: string) => C.partsOf(cat).find((p: any) => p.id === id);
const sortedDesc = (a: number[]) => a.slice().sort((x, y) => y - x);

export function validate(opts?: { manifestPath?: string; glbRoot?: string }) {
  const findings: Finding[] = [], infos: Record<string, ModelInfo> = {};
  const E = (model: string, msg: string) => findings.push({ level: 'ERROR', model, msg });
  const W = (model: string, msg: string) => findings.push({ level: 'WARN', model, msg });
  const manPath = opts && opts.manifestPath || path.join(root, 'models/manifest.json'), glbRoot = opts && opts.glbRoot || path.join(root, 'models');
  let man: any;
  try { man = JSON.parse(fs.readFileSync(manPath, 'utf8')); } catch (e: any) { E('(manifest)', 'cannot read/parse manifest: ' + e.message); return { findings, infos }; }
  const noReal: string[] = [], layout = layoutFn(), seenFiles: Record<string, string> = {};
  const companions: any = { case: part('case', 'case-meshify-c'), mobo: part('mobo', 'b650-atx'), cpu: part('cpu', 'r7-7800x3d'), gpu: part('gpu', 'rtx4060'), ram: part('ram', 'ddr5-16-5600'), cooler: part('cooler', 'cool-aio-360') };
  const onDisk = new Set(fs.existsSync(path.join(glbRoot, 'glb')) ? fs.readdirSync(path.join(glbRoot, 'glb')).filter((f) => f.endsWith('.glb')) : []);

  for (const id of Object.keys(man)) {
    const m = man[id];
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) E(id, 'model id must be lowercase letters, digits and dashes');
    if (!CATS.includes(m.cat)) E(id, 'unknown cat "' + m.cat + '" (allowed: ' + CATS.join(', ') + ')');
    // ---- licence / provenance (mandatory) ----
    if (!/^(CC-BY-4\.0|CC-BY-3\.0|CC0-1\.0|CC0)\b/.test(String(m.license || ''))) E(id, 'license missing or not an accepted redistributable licence (CC-BY-4.0 / CC-BY-3.0 / CC0): ' + m.license);
    if (!String(m.author || '').trim()) E(id, 'author (attribution) missing');
    if (!String(m.title || '').trim()) E(id, 'title (original work title) missing');
    if (!/^https:\/\/\S+$/.test(String(m.source || ''))) E(id, 'source URL missing or not https');
    // ---- file ----
    const file = String(m.file || '');
    if (!/^glb\/[a-z0-9][a-z0-9._-]*\.glb$/i.test(file)) { E(id, 'file must be glb/<safe-name>.glb, got "' + file + '"'); continue; }
    if (seenFiles[file]) E(id, 'asset ' + file + ' already used by ' + seenFiles[file]); else seenFiles[file] = id;
    onDisk.delete(path.basename(file));
    const fp = path.join(glbRoot, file);
    if (!fs.existsSync(fp)) { E(id, 'file missing on disk: ' + file); continue; }
    const buf = fs.readFileSync(fp);
    if (buf.length > SIZE_ERR) E(id, 'file is ' + (buf.length / 1048576).toFixed(1) + ' MB (> ' + SIZE_ERR / 1048576 + ' MB): decimate/compress textures first'); else if (buf.length > SIZE_WARN) W(id, 'file is ' + (buf.length / 1048576).toFixed(1) + ' MB (> ' + SIZE_WARN / 1048576 + ' MB budget); consider recompressing textures');
    let info: any;
    try { info = glb.inspect(buf); } catch (e: any) { E(id, 'invalid GLB: ' + e.message); continue; }
    infos[id] = { id, file, bytes: buf.length, triangles: info.triangles, textures: info.textures, extents: info.extents };
    // ---- identity schema ----
    const idn = m.identity || {};
    if (!String(idn.manufacturer || '').trim() || !String(idn.product || '').trim()) E(id, 'identity.manufacturer and identity.product are required');
    if (!VENDORS.includes(idn.vendor)) E(id, 'identity.vendor must be one of ' + VENDORS.join('/'));
    if (Object.keys(m.products || {}).length) for (const k of REQUIRED_IDENTITY[m.cat] || []) if (!idn[k]) E(id, 'identity.' + k + ' is required for cat ' + m.cat + ' (mapped models must say what they are)');
    if (m.cat === 'cpu' && idn.vendor === 'neutral') E(id, 'a CPU model needs a real vendor (amd/intel)');
    // ---- transform metadata sanity ----
    if (m.flip && !(Array.isArray(m.flip) && m.flip.length === 3 && m.flip.every((v: number) => v === 1 || v === -1))) E(id, 'flip must be [±1,±1,±1]');
    if (m.basis) {
      const b = m.basis; const ok = Array.isArray(b) && b.length === 3 && b.every((r: number[]) => Array.isArray(r) && r.length === 3 && r.every((v) => isFinite(v)));
      if (!ok) E(id, 'basis must be 3 rows of 3 numbers'); else {
        const dot = (x: number[], y: number[]) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
        for (let i = 0; i < 3; i++) { if (Math.abs(dot(b[i], b[i]) - 1) > 1e-3) E(id, 'basis row ' + i + ' is not unit length'); for (let j = i + 1; j < 3; j++) if (Math.abs(dot(b[i], b[j])) > 1e-3) E(id, 'basis rows ' + i + '/' + j + ' are not orthogonal'); }
      }
    }
    if (m.scale != null && !(m.scale > 0.2 && m.scale < 5)) E(id, 'scale out of sane range (0.2..5)');
    if (m.realMm) { // optional declared real-world size (mm) of the original product: compared by proportion with the GLB bounds
      if (!(Array.isArray(m.realMm) && m.realMm.length === 3 && m.realMm.every((v: number) => v > 0))) E(id, 'realMm must be [x,y,z] in mm'); else {
        const a = sortedDesc(m.realMm), b = sortedDesc(info.extents);
        a.forEach((v, i) => { const r = (v / a[0]) / (b[i] / b[0]); if (r > 1.15 || r < 1 / 1.15) W(id, 'realMm proportion differs from the GLB bounds on axis rank ' + i + ' by ' + ((Math.max(r, 1 / r) - 1) * 100).toFixed(0) + '%'); });
      }
    } else if (Object.keys(m.products || {}).length) noReal.push(id);
    // ---- product mapping ----
    const cat = m.cat === 'ssd' ? 'storage' : m.cat === 'coolerpump' ? 'cooler' : m.cat;
    for (const pid of Object.keys(m.products || {})) {
      const lvl = m.products[pid], p = part(cat, pid);
      if (!LEVELS.includes(lvl)) E(id, 'products.' + pid + ' level must be exact|representative, got "' + lvl + '"');
      if (!p) { E(id, 'products.' + pid + ' is not a catalog ' + cat + ' id'); continue; }
      const pv = (m.cat === 'gpu' || m.cat === 'cpu' || m.cat === 'mobo') ? String(p.brand || '').toLowerCase() : '';
      if (pv && idn.vendor && idn.vendor !== 'neutral' && idn.vendor !== pv) E(id, 'cross-vendor mapping: ' + pid + ' is ' + pv + ' but the model is ' + idn.vendor);
      if (!ID.compatible(m.cat, p, idn)) E(id, 'physical mismatch for ' + pid + ' (form/socket/DDR generation differ from the model)');
      if (m.cat === 'gpu' && idn.chip && lvl === 'exact' && !String(p.name).toLowerCase().replace(/[^a-z0-9]/g, '').includes(String(idn.chip).replace(/^(rtx|rx)/, ''))) E(id, 'exact GPU mapping ' + pid + ' does not match chip ' + idn.chip);
      if (lvl === 'exact') {
        const n = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!(n(p.name).includes(n(idn.product)) || n(idn.product).includes(n(p.name)))) E(id, 'exact mapping ' + pid + ' ("' + p.name + '") does not match the model product "' + idn.product + '"; use representative');
      }
      // ---- fit against the box the renderer actually uses ----
      const build: any = Object.assign({}, companions); build[cat === 'storage' ? 'storage' : cat] = p;
      const items = layout(build), it = items.find((x: any) => x.key === (cat === 'storage' ? 'storage' : cat));
      if (!it || !it.boxes.length) continue;
      const box = it.boxes[m.cat === 'cooler' && it.boxes.length > 1 ? 1 : 0], ext = sortedDesc(info.extents), bs = sortedDesc(box.s);
      const top = (m.cat === 'case' || m.fit) ? 3 : 2;
      const ratios: number[] = []; for (let i = 0; i < top; i++) ratios.push((bs[i] / bs[0]) / (ext[i] / ext[0]));
      const dev = Math.max.apply(null, ratios) / Math.min.apply(null, ratios);
      if (m.fit) { // non-uniform stretch is applied by the renderer
        if (dev > 1.6) E(id, 'fit:true stretches the model ' + dev.toFixed(2) + 'x between axes for ' + pid + ' (> 1.6x)'); else if (dev > 1.25) W(id, 'fit:true stretches the model ' + dev.toFixed(2) + 'x between axes for ' + pid);
        infos[id].fit = Object.assign(infos[id].fit || {}, { [pid]: +dev.toFixed(2) });
      } else if (dev > 1.2) {
        W(id, 'proportions differ from the ' + pid + ' scene box by ' + ((dev - 1) * 100).toFixed(0) + '% (uniform scaling: model will not fill the box)');
        infos[id].fit = Object.assign(infos[id].fit || {}, { [pid]: +dev.toFixed(2) });
      }
    }
  }
  if (noReal.length) W('(manifest)', noReal.length + ' mapped model(s) have no realMm (real product size in mm), so proportions are only checked against the scene box: ' + noReal.join(', '));
  onDisk.forEach((f) => W('(files)', 'models/glb/' + f + ' is not referenced by the manifest'));
  // catalog-level sanity: every product resolves to at most one model per key (priority ties are ambiguous)
  for (const cat of ['gpu', 'cpu', 'mobo', 'ram', 'storage', 'psu', 'case', 'cooler']) for (const p of C.partsOf(cat)) {
    const key = cat === 'storage' ? 'ssd' : cat, cands = Object.keys(man).filter((k) => man[k].cat === key && man[k].products && LEVELS.includes(man[k].products[p.id]) && ID.compatible(key, p, man[k].identity || {}));
    const top = Math.max.apply(null, cands.map((k) => man[k].priority || 0)); const tie = cands.filter((k) => (man[k].priority || 0) === top);
    if (cands.length > 1 && tie.length > 1) W(p.id, 'ambiguous mapping: ' + tie.join(', ') + ' share priority ' + top);
  }
  return { findings, infos };
}

if (require.main === module) {
  const r = validate();
  const errs = r.findings.filter((f) => f.level === 'ERROR'), warns = r.findings.filter((f) => f.level === 'WARN');
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 1));
  else {
    r.findings.forEach((f) => console.log(f.level.padEnd(5) + ' ' + f.model + ': ' + f.msg));
    console.log('\n' + Object.keys(r.infos).length + ' models checked · ' + errs.length + ' error(s) · ' + warns.length + ' warning(s)');
  }
  process.exit(errs.length ? 1 : 0);
}
