'use strict';
// Starts the dist/ static server on a random port. `base` serves the site under a sub-path (e.g. '/RigLab/').
const { createServer } = require('../../../scripts/serve.js');
function start(opts) {
  const base = (opts && opts.base) || '/';
  return new Promise((resolve) => {
    const server = createServer({ base });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ url: 'http://127.0.0.1:' + port + base, origin: 'http://127.0.0.1:' + port, close: () => new Promise((r) => server.close(r)) });
    });
  });
}
// Only the local origin may be reached; everything else is aborted so tests never depend on the network.
const localOnly = (origin) => (r) => (r.request().url().startsWith(origin) ? r.continue() : r.abort());
module.exports = { start, localOnly };
