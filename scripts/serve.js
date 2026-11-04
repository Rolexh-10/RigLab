'use strict';
// Zero-dependency static server for dist/:  node scripts/serve.js [port]
const http = require('http');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'dist');
const port = +process.argv[2] || 8080;
http.createServer((req, res) => {
  const f = path.join(dir, req.url === '/' ? 'riglab.html' : path.normalize(req.url.split('?')[0]).replace(/^(\.\.[/\\])+/, ''));
  if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log('RigLab on http://localhost:' + port));
