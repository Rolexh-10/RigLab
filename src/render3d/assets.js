/* RigLab external GLB asset fetcher.
 * - resolves manifest URLs against document.baseURI (or window.RIGLAB_ASSET_BASE), so the site works at "/" and under "/RigLab/"
 * - refuses cross-origin URLs
 * - de-duplicates concurrent requests per model id and aborts a fetch when its last interested owner releases it
 * - rejects truncated or non-GLB payloads (size from the manifest + "glTF" magic) so a corrupt file falls back to the placeholder
 * It only moves bytes; GL upload and caching live in glview.js. */
(function (root) {
  'use strict';
  var TIMEOUT_MS = 20000;
  var inflight = {};
  var stats = { fetches: 0, completed: 0, failed: 0, aborted: 0, log: [] };

  function base() { return new URL(root.RIGLAB_ASSET_BASE || (root.document && root.document.baseURI) || root.location.href, root.location.href); }
  function resolve(rel) {
    var b = base(), u = new URL(String(rel), b);
    if (u.origin !== b.origin) throw new Error('cross-origin asset refused');
    return u.href;
  }
  function fail(msg, name) { var e = new Error(msg); if (name) e.name = name; return e; }

  // owner: any string identifying who wants the bytes (one viewer instance). Resolves with an ArrayBuffer.
  function request(id, cfg, owner) {
    if (cfg.b64) { // self-contained preview build only (npm run build:preview); the normal build never has b64
      try { var bin = root.atob(cfg.b64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); stats.embedded = (stats.embedded || 0) + 1; return Promise.resolve(u.buffer); } catch (er) { return Promise.reject(er); }
    }
    var e = inflight[id];
    if (!e) {
      e = inflight[id] = { owners: {}, n: 0, ctl: new AbortController(), timedOut: false };
      var self = e, url;
      try { url = resolve(cfg.url); } catch (er) { delete inflight[id]; stats.failed++; return Promise.reject(er); }
      stats.fetches++; stats.log.push(id);
      var timer = setTimeout(function () { self.timedOut = true; self.ctl.abort(); }, TIMEOUT_MS);
      self.promise = fetch(url, { signal: self.ctl.signal, credentials: 'same-origin' }).then(function (res) {
        if (!res.ok) throw fail('HTTP ' + res.status);
        return res.arrayBuffer();
      }).then(function (buf) {
        if (cfg.bytes && buf.byteLength !== cfg.bytes) throw fail('size mismatch: got ' + buf.byteLength + ', expected ' + cfg.bytes);
        if (buf.byteLength < 20 || new DataView(buf).getUint32(0, true) !== 0x46546c67) throw fail('not a GLB');
        return buf;
      }).then(function (buf) {
        clearTimeout(timer); if (inflight[id] === self) delete inflight[id]; stats.completed++; return buf;
      }, function (er) {
        clearTimeout(timer); if (inflight[id] === self) delete inflight[id];
        if (self.timedOut) er = fail('timeout', 'TimeoutError');
        if (er && er.name === 'AbortError') stats.aborted++; else stats.failed++;
        throw er;
      });
    }
    if (!e.owners[owner]) { e.owners[owner] = 1; e.n++; }
    return e.promise;
  }
  // The owner no longer needs this model; the network request is aborted when nobody else wants it.
  function release(id, owner) {
    var e = inflight[id]; if (!e || !e.owners[owner]) return;
    delete e.owners[owner];
    if (--e.n <= 0) { delete inflight[id]; e.ctl.abort(); }
  }
  function releaseAll(owner) { Object.keys(inflight).forEach(function (id) { release(id, owner); }); }

  root.RigLabAssets = {
    request: request, release: release, releaseAll: releaseAll, resolve: resolve,
    pending: function () { return Object.keys(inflight).length; },
    stats: function () { return { fetches: stats.fetches, completed: stats.completed, failed: stats.failed, aborted: stats.aborted, inflight: Object.keys(inflight).length, log: stats.log.slice() }; },
    resetStats: function () { stats.fetches = stats.completed = stats.failed = stats.aborted = 0; stats.log = []; }
  };
})(typeof window !== 'undefined' ? window : this);
