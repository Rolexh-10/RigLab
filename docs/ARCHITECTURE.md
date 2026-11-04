# RigLab architecture (Phase 1, v0.2.0)

Status: working prototype, refactored into modules. Behaviour and look are unchanged from `v0.1-prototype`
(git tag). Everything below is **sample data**; no real prices, stores or merchant integrations exist.

## 1. Inventory (what existed before Phase 1)

| File (v0.1) | Lines | Role | Problem |
|---|---|---|---|
| `src/app.js` | 1057 | whole UI: state, routing, views, tools, actions, init | one closure, hard to navigate |
| `src/engine.js` | 485 | compat rules, power/UPS, budget, offers, cart, specs | one file, UMD wrapper, logic + labels mixed |
| `src/data.js` | 119 | sample catalog (57 parts), stores, markets | 120-char lines, hand-edited rows |
| `src/style.css` | 324 | all CSS | one file |
| `src/glview.js`, `src/viewer3d.js` | 393 / 239 | WebGL2 renderer + canvas fallback | flat in `src/` |
| `scripts/build.js` | 36 | inlines everything into one HTML | no module system |
| `tests/` | 2 files | 22 engine tests + 21 UI smoke tests | engine tests only; no saved-builds, data or bundle tests |

Runtime constraints that shaped the design: the product ships as ONE self-contained HTML file (≤ 16 MB for the
artifact host), GLB models are embedded as base64, no network calls, no server yet.

## 2. New structure

```
src/
  data/                     catalog + stores as plain CommonJS modules (Node + browser)
    catalog/{cpu,mobo,ram,gpu,storage,psu,case,cooler}.js    raw spec rows, one object per line
    index.js                derives cat / priceSource='sample' / price{IQ}; same shape as before
    markets.js stores.js notice.js
  core/                     business logic, NO DOM, independently testable (require('src/core'))
    shared.js  build.js  power.js  compat.js  budget.js  offers.js  cart.js  specs.js
    saved-builds.js         NEW: pure logic of "My builds" (was inline in UI actions)
    index.js                public API = exactly the old RigLabCore surface + saved-builds functions
  ui/                       presentation, concatenated in file-name order into ONE closure
    00-head … 99-tail       state, routing, components, picker, one file per view, actions, init
  styles/00-… 90-…css       CSS split by concern, concatenated in order
  render3d/                 viewer3d.js (canvas fallback + layout) and glview.js (WebGL2 + GLB)
  vendor/particles.js       MIT, banner background
  index.template.html
models/                     GLB files + manifest.json (ids, orientation, credits)
scripts/build.js            assembles dist/*.html;  scripts/lib/bundle.js = 60-line CommonJS bundler
tests/unit/*.test.js        pure Node tests (no browser)       tests/ui/ui-smoke.test.js  Playwright
```

### Decisions and trade-offs
1. **core + data are real modules, ui is not (yet).** `core`/`data` use CommonJS so the *same files* run in Node tests
   and in the browser (via `scripts/lib/bundle.js`, no dependency). `ui/` is split into files but still concatenated into
   one closure: converting ~1000 lines of closure-coupled UI into ES modules is a rewrite-level risk and is exactly what
   Phase 2 (React/TypeScript components) replaces anyway. Splitting by file now gives navigability with zero behaviour risk;
   the build verified the concatenated UI is byte-equivalent (ignoring whitespace) to the old `app.js`.
2. **Bundler instead of webpack/Vite.** Avoids new dependencies (rule 4). It is intentionally throwaway: Next.js replaces it.
3. **Business logic stays free of presentation.** Labels in `core` are `{ar,en}` data, never HTML. The saved-builds
   logic moved out of the UI actions so it can later run server-side (Supabase) unchanged.
4. **Catalog rows stay minimal** (`price` is a number; `data/index.js` derives the IQD price object and the `sample` flag), which
   makes the future Postgres import a straight mapping and keeps "sample" impossible to forget.
5. **Rollback:** `git tag v0.1-prototype` (original), plus `git log` per step. `dist/` is no longer committed (generated).

## 3. Dependency rules
`data` ← `core` ← `ui` ← (none). `render3d` reads `window.RigLab3D` + `window.RIGLAB_MODELS`; it never imports `core`.
`core` must not touch `window`, `document`, `localStorage` (a unit test fails the bundle if Node-only globals leak).

## 4. Where to change things
| I want to… | Edit |
|---|---|
| add/modify a part | `src/data/catalog/<cat>.js` (+ `models/manifest.json` ids if it has a 3D model) |
| change a compatibility rule | `src/core/compat.js` + a test in `tests/unit/engine.test.js` |
| change budget logic | `src/core/budget.js` |
| change a screen | `src/ui/3x-view-*.js` / `4x-view-*.js` |
| add a 3D model | `models/glb/` + `models/manifest.json` (see `docs/3D-MODELS.md`) |
