'use strict';
// Zero-dependency static server for dist/.
//   node scripts/serve.js [port] [--base /RigLab/] [--dir path]
// --base serves the site under a sub-path (like GitHub Pages project sites) to test relative asset URLs.
// Exported as createServer() for tests.
const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8'
};

function createServer(opts) {
  opts = opts || {};
  const dir = path.resolve(opts.dir || path.join(__dirname, '..', 'dist'));
  let base = opts.base || '/';
  if (!base.startsWith('/')) base = '/' + base;
  if (!base.endsWith('/')) base += '/';
  return http.createServer((req, res) => {
    let rel;
    try { rel = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end('Bad request'); }
    if (rel === base.slice(0, -1) && base !== '/') { res.writeHead(301, { Location: base }); return res.end(); }
    if (!rel.startsWith(base)) { res.writeHead(404); return res.end('Not found'); }
    rel = rel.slice(base.length);
    if (rel === '' || rel === 'index.html') rel = 'riglab.html';
    const f = path.resolve(dir, rel);
    if (f !== dir && !f.startsWith(dir + path.sep)) { res.writeHead(403); return res.end('Forbidden'); }
    fs.stat(f, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
      fs.createReadStream(f).pipe(res);
    });
  });
}
module.exports = { createServer, MIME };

if (require.main === module) {
  const a = process.argv.slice(2);
  const opt = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined; };
  const port = +(a.find((x) => /^\d+$/.test(x)) || 8080), base = opt('--base') || '/';
  createServer({ base, dir: opt('--dir') }).listen(port, () => console.log('RigLab on http://localhost:' + port + base));
}
