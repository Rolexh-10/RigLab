# 3D assets: external GLBs and GL resource lifecycle (Task 01)

## What changed
- `npm run build` no longer embeds models. `dist/riglab.html` (≈553 KB) carries only metadata; each GLB is a separate file in `dist/assets/models/` and `window.RIGLAB_MODELS[id].url` is a **relative** URL (`assets/models/<file>.glb?v=<sha1-10>`) resolved against `document.baseURI` (override: `window.RIGLAB_ASSET_BASE`). Works at `/` and under `/RigLab/`.
- `src/render3d/assets.js` (`RigLabAssets`): fetch, de-duplicate concurrent requests per model, abort when the last owner releases, 20 s timeout, same-origin only, rejects wrong size (manifest `bytes`) or non-GLB payloads.
- `src/render3d/glview.js`:
  - `setParts` computes the models the scene needs (same identity resolver as before) and fetches only those; models no longer needed are aborted/evicted.
  - GLB parsing + GPU upload is time-sliced (~6 ms per slice); float/index accessors are zero-copy views.
  - Model states: `loading` (placeholder shown) → `ready` | `error` (placeholder kept, retry after 30 s). `identity()` now returns `status` (`ready|loading|error|none`); `level` stays what the mapping promises while loading, and is `generic` only for unmapped parts or failed loads. The label shows a small accessible "Loading 3D model…" indicator (`role=status` inside the `aria-live` region).
  - One persistent canvas/WebGL context (`RigLab3D.acquireGL`): each builder re-render moves it into the new placeholder instead of creating a context. Pointer handlers are attached once.
  - Every buffer/VAO/texture a model owns is tracked and deleted on eviction; late texture decodes after eviction/teardown are dropped. Cache: all needed models + at most `glConfig.maxUnused` (2) recent ones. Leaving the Builder parks the viewer (RAF stops); models are freed after `glConfig.parkTtlMs` (45 s). `webglcontextlost` / `restored` handled (scene is rebuilt, models refetched). `viewer.resources()` exposes counts for tests.
- `scripts/serve.js`: correct MIME (`model/gltf-binary` …), `--base /RigLab/` to emulate Pages, path-traversal guard.
- Not changed: manifest mappings, attribution, transforms, identity rules, UI layout.

## Commands
```
npm run build                              # dist/riglab.html + dist/assets/models/*.glb
node scripts/serve.js 8080                 # http://localhost:8080/
node scripts/serve.js 8080 --base /RigLab/ # http://localhost:8080/RigLab/
npm run typecheck && npm run test:unit
npm run build && node --import tsx --test tests/ui/*.test.js   # UI tests start their own HTTP server
node scripts/perf/baseline.js http://localhost:8080/ 5          # load + lifecycle measurements
```
`file://` no longer works for the 3D models (browsers block `fetch` there); the app still opens and shows generic placeholders. The Claude artifact viewer cannot serve `.glb` supporting files (checked: publish refused), so `npm run build:preview` writes a separate self-contained `dist/riglab.preview.html` (≈14.75 MB, models Base64-embedded) used only for the artifact. The normal build never embeds anything. Preview renders pixel-identically to the normal build (checked on 2 builds).

## Measurements (headless Chromium, software GL, local HTTP; times are NOT phone times)
| | Before (embedded Base64) | After (external) |
|---|---|---|
| HTML bytes | 15,452,835 | 566,534 |
| Initial requests, full 8-part build | 1 | 7 (HTML + 6 GLB) |
| Initial transfer | 15,453,006 B | 3,522,896 B |
| Time to usable Builder (3 / 5 runs) | 2.16–2.89 s | 0.63–1.47 s |
| WebGL contexts created / lost over 20 GPU swaps | 22 / 21 | 1 / 0 |
| Builder image vs before (4 builds) | – | 0 pixels differ (>8/255) |
Estimated (not measured): phone GPU behaviour and mobile network times.

## Tests
`tests/unit/assets.test.js`, `tests/ui/ui-3d-assets.test.js` (requested-only fetches, no duplicates, rapid swaps, abort/stale, 404/truncated/corrupt GLB, loading state, touch drag + pinch, park/resume, bounded resources, context loss/restore, `/RigLab/` base path), plus the updated identity/orient tests (all 25 models det +1).

## Manual Android checklist (UNVERIFIED until run on a real phone)
1. Open the site, go to Builder, add case/CPU/GPU: placeholder → model appears, "Loading 3D model…" disappears.
2. Swap GPUs quickly 10×: no wrong-brand model, no freeze.
3. One-finger drag rotates; two-finger pinch zooms; page still scrolls when the finger starts outside the canvas.
4. Switch to Parts and back: viewer returns, rotation kept.
5. Lock/unlock the screen, rotate the phone, switch apps and come back: scene still draws.
6. Airplane mode, then add a part with an uncached model: generic box, no crash.

## Model onboarding (Task 02)
`npm run models:check` (scripts/validate-models.ts) validates the manifest schema, unique/safe file refs, GLB structure (via scripts/lib/glb.js), mandatory licence/author/source, product ids against the catalog, vendor / form-factor / socket / DDR agreement, `exact` name match, transform metadata (flip/basis/scale), optional `realMm` proportions and the fit of each model into the scene box the renderer uses. `npm run models:report` regenerates `docs/3D-MODEL-MAPPING.md`. See `docs/3D-ORIENTATION-CHECKLIST.md`.
