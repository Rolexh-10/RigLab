'use strict';
// Tiny CommonJS bundler (no dependencies): inlines every .js file under the given directories so the
// same modules that Node tests require() also run in the browser. Phase 2 replaces this with Next.js/webpack.
const fs = require('fs');
const path = require('path');

function walk(dir, out) {
  for (const f of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p, out); else if (f.endsWith('.js')) out.push(p);
  }
  return out;
}

// roots: [{ dir, name }] -> module ids "name/rel/path" (no .js). globals: { windowName: 'name/index' }
function bundle(srcRoot, roots, globals) {
  const defs = [];
  for (const r of roots) {
    for (const file of walk(path.join(srcRoot, r), [])) {
      const id = path.relative(srcRoot, file).replace(/\\/g, '/').replace(/\.js$/, '');
      defs.push('"' + id + '":function(module,exports,require){\n' + fs.readFileSync(file, 'utf8') + '\n}');
    }
  }
  const g = Object.keys(globals).map((k) => 'window.' + k + '=__req("' + globals[k] + '");').join('');
  return '(function(){var __defs={' + defs.join(',') + '},__cache={};\n' +
    'function __join(from,p){if(p.charAt(0)!==".")return p;var a=from.split("/");a.pop();p.split("/").forEach(function(s){if(s==="..")a.pop();else if(s!=="."&&s!=="")a.push(s)});return a.join("/")}\n' +
    'function __req(id){if(__cache[id])return __cache[id].exports;if(!__defs[id]&&__defs[id+"/index"])id=id+"/index";var m=__cache[id]={exports:{}};__defs[id](m,m.exports,function(p){return __req(__join(id,p))});return m.exports}\n' +
    g + '})();';
}
module.exports = { bundle };
