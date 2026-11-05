# RigLab architecture (Phase 3, v0.4.0)

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

## 2. Structure (after Phase 2)

```
src/
  data/                     catalog + stores as strict TypeScript modules (Node + browser)
    catalog/{cpu,mobo,ram,gpu,storage,psu,case,cooler}.ts    typed raw rows (RawRow<Cpu> ...), one object per line
    index.ts                derives cat / priceSource='sample' / price{IQ}; same shape as before
    markets.ts stores.ts notice.ts
  core/                     business logic, NO DOM, strict TS, independently testable
    types.ts                the data model: Cat, Part (discriminated union on `cat`), PartMap, CompatResult, Offer, Store ...
    shared.ts build.ts power.ts compat.ts budget.ts offers.ts cart.ts specs.ts saved-builds.ts
    index.ts                public API = the old RigLabCore surface + saved-builds + all types
  engine.ts                 browser entry: window.RigLabData / window.RigLabCore (esbuild IIFE)
  app/                      NEW: React (TSX) layer
    index.tsx               registers window.RigLabReact {has, mount, unmount}
    routes.ts               the routes React owns (builds, trust). Delete a line = instant per-view rollback
    bridge.ts               typed access to window.RigLabBridge + hooks useBridgeVersion / useI18n (useSyncExternalStore)
    components/             Html, PartsList, VerdictBadge, Money, AdSlot
    views/                  Builds.tsx, Trust.tsx
  ui/                       legacy presentation, concatenated in file-name order into ONE closure
    58-react-bridge.js      NEW: exposes state/lang/subscribe/trust content to React
    60-render-init.js       render(): if React owns the route -> RigLabReact.mount, else legacy VIEWS[route].html()
  styles/  render3d/  vendor/  index.template.html   unchanged
  repo/                     NEW (Phase 3): BuildRepo interface, LocalBuildRepo, SupabaseBuildRepo (see docs/DATABASE.md)
db/                         NEW (Phase 3): migrations, generated seed, local-test shim
web/                        Next.js scaffold, UNVERIFIED (see web/README.md)
scripts/build.js            assembles dist/*.html;  scripts/lib/engine.js = esbuild wrappers (engine + React app)
tests/unit/*.test.js        pure Node tests via tsx (no browser)
tests/ui/*.test.js          Playwright: ui-smoke (legacy + whole app) and ui-react (React-owned routes)
```

### Decisions and trade-offs (Phase 2)
1. **Strangler, not rewrite.** The legacy UI keeps owning the shell (header, nav, modals, 3D, particles) and every route not listed in
   `src/app/routes.ts`. React mounts inside `#app` for the listed routes only. A port is reverted by deleting one line.
2. **Legacy state stays the single source of truth for now.** React reads it through `useSyncExternalStore` (version counter bumped on every
   legacy `render()`), so there is exactly one copy of the state and no sync bugs. Moving state + actions into a TS store is Phase 3,
   after more views are ported (doing it earlier would mean porting the picker modal and 3D builder at the same time).
3. **Click handling stays delegated** (`data-act` attributes + the legacy `ACT` table). React elements keep the same `data-act`/`data-*`
   contract, which keeps every existing UI test valid and avoids double-firing handlers.
4. **TypeScript strict on core/data** (`npm run typecheck`, clean). Types caught real looseness: `Mobo.needsBios` and `Store.deliveryIQD`
   are legitimately optional/nullable in the data. Inside `rule()` callbacks of `compat.ts` the parts named in `needs` are cast to non-optional
   (guarded by `rule()` itself); this is the one intentional cast and is commented.
5. **esbuild replaces the home-made CommonJS bundler** (compiles TS, bundles React, same single-file output). It is a devDependency, not a runtime one.
6. **Next.js was NOT adopted yet.** The npm registry is unreachable in the build sandbox, so `next` could not be installed. `web/` holds an
   unverified skeleton importing the same engine; the single-file build is still the shipped artifact.
7. **Trust page body text is still HTML strings** (rendered with `dangerouslySetInnerHTML`, repo-authored content only, never user input).

## 3. Dependency rules
`data` ← `core` ← (`app`, `ui`). `render3d` reads `window.RigLab3D` + `window.RIGLAB_MODELS`; it never imports `core`.
`core` must not touch `window`, `document`, `localStorage` (a unit test fails the bundle if Node-only globals leak).
`app` may only talk to the legacy runtime through `bridge.ts`.

## 4. Where to change things
| I want to… | Edit |
|---|---|
| add/modify a part | `src/data/catalog/<cat>.ts` (+ `models/manifest.json` ids if it has a 3D model) |
| change a compatibility rule | `src/core/compat.ts` + a test in `tests/unit/engine.test.js` |
| change budget logic | `src/core/budget.ts` |
| change a legacy screen | `src/ui/3x-view-*.js` / `4x-view-*.js` |
| change a React screen | `src/app/views/*.tsx`; register new ones in `src/app/routes.ts` |
| add a 3D model | `models/glb/` + `models/manifest.json` (see `docs/3D-MODELS.md`) |

## 5. Known limits
- `tsc` checks only `src/core` and `src/data`. TSX in `src/app` is compiled by esbuild (types stripped, not checked) because `@types/react`
  is not installed in the sandbox; run `npm i` then extend `tsconfig.json` `include` with `src/app/**/*.tsx` and `"jsx": "react-jsx"`.
