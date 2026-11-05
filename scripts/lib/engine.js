'use strict';
// Compiles the TypeScript engine (src/data + src/core) into one browser IIFE with esbuild.
// Replaces the Phase 1 hand-written CommonJS bundler.
const path = require('path');
const esbuild = require('esbuild');

function buildEngine(entry) {
  const r = esbuild.buildSync({
    entryPoints: [entry || path.join(__dirname, '../../src/engine.ts')],
    bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2019', legalComments: 'none'
  });
  return r.outputFiles[0].text;
}

// React layer (src/app, TSX). esbuild strips types only; type checking of TSX needs @types/react (see docs/ARCHITECTURE.md).
function buildApp(entry) {
  const r = esbuild.buildSync({
    entryPoints: [entry || path.join(__dirname, '../../src/app/index.tsx')],
    bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2019', legalComments: 'none',
    jsx: 'automatic', minify: true, define: { 'process.env.NODE_ENV': '"production"' }
  });
  return r.outputFiles[0].text;
}
module.exports = { buildEngine, buildApp };
