'use strict';
// Inlines css + js into a single self-contained page.
//   dist/riglab.html           full document (open directly in a browser)
//   dist/riglab.artifact.html  fragment (no doctype/head) for hosts that add their own skeleton
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const { buildEngine, buildApp } = require('./lib/engine');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// "</script" inside inlined code would end the script block early.
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');
// Embedded CC-BY GLB models (see docs/3D-MODELS.md and the credits tab). cfg.up/basis are found empirically.
function models() {
  const man = JSON.parse(rd('models/manifest.json')), out = {};
  for (const k of Object.keys(man)) out[k] = Object.assign({}, man[k], { b64: fs.readFileSync(path.join(root, 'models', man[k].file)).toString('base64') });
  return 'window.RIGLAB_MODELS=' + JSON.stringify(out) + ';';
}
// Concatenates every file of a directory in name order (NN- prefixes define the order).
const cat = (dir, ext) => fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith(ext)).sort().map((f) => rd(dir + '/' + f)).join('\n');
const tpl = rd('src/index.template.html')
  .replace('/*__CSS__*/', () => cat('src/styles', '.css'))
  .replace('/*__DATA__*/', () => '')
  .replace('/*__ENGINE__*/', () => safe(buildEngine()))
  .replace('/*__APP__*/', () => safe(rd('src/vendor/particles.js') + '\n' + models() + '\n' + buildApp() + '\n' + rd('src/render3d/viewer3d.js') + '\n' + rd('src/render3d/identity.js') + '\n' + rd('src/render3d/glview.js') + '\n' + cat('src/ui', '.js')));

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/riglab.artifact.html'), tpl);

// The template puts markup after <style>; for the standalone file move it into <body>.
const idx = tpl.indexOf('<div id="rl"');
const headPart = tpl.slice(0, idx);
const bodyPart = tpl.slice(idx);
fs.writeFileSync(path.join(root, 'dist/riglab.html'),
  '<!doctype html>\n<html lang="ar">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  headPart + '</head>\n<body>\n' + bodyPart + '</body>\n</html>\n');

const kb = (f) => (fs.statSync(path.join(root, f)).size / 1024).toFixed(1) + ' KB';
console.log('built dist/riglab.html', kb('dist/riglab.html'), '| dist/riglab.artifact.html', kb('dist/riglab.artifact.html'));
