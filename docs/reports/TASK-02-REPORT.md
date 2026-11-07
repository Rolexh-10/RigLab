# TASK-02 report: 3D library expansion & accuracy QA

Date: 2026-11-07 · Base commit: `b16a333` (Task 01) · Branch: `main` · Environment for all measurements: headless Chromium (Chrome, SwiftShader software GL), local HTTP, 412×860 viewport. Nothing here was run on a physical phone.

## 1. Executive summary — status: **PARTIAL**
Preflight passed; two real mapping/asset defects were found and fixed; a validator, a regenerated coverage report and a checklist were delivered; **one** new model was added (target was up to five). The rest could not be done because no further lawful assets were available: nothing was sourced from the web or invented. Physical Android touch/GPU behaviour is **UNVERIFIED**.

## 2. Work completed
**Preflight (Task 01 re-verified, before any change):** `npm run build` ok; `npm run typecheck` ok; unit 76/76; UI 39/39 (includes the 13 Task 01 tests: requested-only fetches, no duplicate fetch, rapid swaps, abort/stale, 404/truncated/corrupt GLB, loading state, one-finger drag + pinch after swaps and navigation, park/resume, bounded resources, context loss/restore, `/RigLab/` base path). No blocking regression. Base64 is not back in the normal build.
**Findings and fixes**
1. *Misleading mapping:* the ATX ASUS B550-F model was mapped to the mATX `b550m` product (scaled into an mATX box → distorted slots). `identity.js` now has `compatible()` (motherboard form factor, CPU socket, RAM generation must agree, on top of the vendor rule); the manifest mapping was removed. `b550m` is now generic.
2. *Broken "exact" asset:* `cpu-7950x3d.glb` is a ~1,950-cube assembly (bounds 0.77×0.57×0.56, not a flat package) and rendered as a tall dark sliver. Verified it is **not** a Task 01 regression (renderer with and without the zero-copy accessor path is pixel-identical). Now unmapped (`r9-7950x3d` generic); root cause in the manifest `note`.
3. *Known, not fixed:* `mobo-h510m` renders with chaotic silver streak shading (material needs re-authoring); recorded as `qaNote`. Proportion warnings (validator) on `gpu-aero4090` 32%, `ram-corsair5` 41%, `ram-crucial4` 26%, `ram-aorus4` 24%, `gpu-msi4060ti` 28%, `cpu-7950x3d` (unmapped): uniform scaling, models do not fill the scene box exactly; not distorted.
**New files:** `scripts/validate-models.ts`, `scripts/lib/glb.js`, `scripts/tools/glb-strip-textures.py`, `scripts/tools/glb-drop-below.py`, `scripts/perf/contact-sheet.js`, `tests/unit/model-validate.test.js`, `models/glb/cpu-3600.glb`, `docs/3D-ORIENTATION-CHECKLIST.md`, this report.
**Modified:** `src/render3d/identity.js`, `models/manifest.json`, `scripts/gen-3d-report.ts` (rewritten; regenerates `docs/3D-MODEL-MAPPING.md`), `tests/unit/model-identity.test.js`, `tests/ui/ui-3d-identity.test.js`, `package.json` (`models:check`, `models:report`), `.github/workflows/pages.yml` (runs `models:check`), `docs/3D-ASSETS.md`.
**Decisions:** physical agreement rules live in the runtime resolver (not only in tests) so a bad manifest can never draw a wrong-form part; the validator reuses the renderer's own `layout()` boxes as the "nominal size"; orientation is per-model `flip`/`basis` metadata.

## 3. Coverage (57 catalog products)
| | exact | representative | generic |
|---|---|---|---|
| Before | 3 | 20 | 34 |
| After | 3 | 21 | 33 |
Changes: `r5-3600` generic→exact; `r5-5600`, `r7-5700x` generic→representative; `r9-7950x3d` exact→generic; `b550m` representative→generic.
**New model `cpu-3600`:** AMD Ryzen 5 3600, CC-BY-4.0, author Fochdog (https://sketchfab.com/bazyaev08), source https://sketchfab.com/3d-models/cpu-ryzen-5-3600-249fb5e8c1e94686a2c2b1cd6df72bc5 (user-supplied file; attribution kept in the manifest and Credits tab). Modified: pin grid (41k vertices, hidden when seated) and unused normal/occlusion/MR textures removed; base colour kept at 1024 px JPEG. 4,860,224 B → 328,192 B (130 triangles). Orientation: IHS faces the glass side, print reads "RYZEN" upright and unmirrored (flip `[-1,-1,-1]`, det +1), chosen by rendering all eight sign variants. Size impact: `dist/assets` 11,175,484 → 11,503,676 B (+328 KB); the HTML stays small.

## 4. Not done / blockers
- Radeon RX 7600/7700 XT/7800 XT, Intel LGA1700 CPUs, B650/B760 boards, PSU, SSD, air cooler, remaining GPUs/cases/coolers: **no lawful asset supplied**; web sourcing was not attempted (licence/login/allowlist). Exact missing list with specifications: `docs/3D-MODEL-MAPPING.md` → "Still missing".
- The two unmapped RTX 5070 alternatives (`gpu-rog`, `gpu-ventus`) and the second RTX 4060 Ti you supplied are not reachable (one model per product; a variant picker is not built).
- Per-model `realMm` is not declared for 22 mapped models (I did not invent real dimensions); the validator reports this.
- No automated proof of connector direction/branding; a manual checklist is provided instead.

## 5. Tests executed (this tree)
| Command | Result |
|---|---|
| `npm run build` | ok |
| `npm run typecheck` | ok |
| `node --import tsx --test tests/unit/*.test.js` | 85 pass / 0 fail / 0 skipped |
| `node --import tsx --test tests/ui/*.test.js` | 39 pass / 0 fail / 0 skipped |
| `npm run models:check` | 26 models, 0 errors, 7 warnings |
DB tests (11, need local Postgres) were **not** run. New coverage: validator rejections (licence/author/source, unsafe path, missing/duplicate/corrupt/truncated GLB, cross-vendor, wrong form/socket, unknown product, bad level, false exact, bad flip/basis/scale, realMm), identity physical rules, whole-catalog cross-brand guard, AM4/B550M/7950X3D UI identity assertions. **Still required on a real Android phone (UNVERIFIED):** touch rotate/pinch, GPU/lag, lock/unlock, offline; see `docs/3D-ASSETS.md` and `docs/3D-ORIENTATION-CHECKLIST.md`.

## 6. Measurements (5 runs, software GL, not phone times)
HTML 568,842 B; initial requests 7; initial transfer 3,525,204 B; time to usable Builder 0.71–1.66 s (Task 01: 0.63–1.47 s, within noise); 1 WebGL context over 20 GPU swaps, 0 lost. No performance regression observed from Task 02.

## 7. Risks, regressions, rollback
- B550M and 7950X3D lost their 3D model (intentional; honest placeholder).
- `compatible()` could hide a future model whose `identity.form/socket/ddr` is wrong; the validator surfaces this.
- `cpu-3600` removes pins: a close inspection from below shows a flat underside.
- Rollback: `git revert` the Task 02 commit; assets/manifest are self-contained.

## 8. Roadmap impact / next tasks
1. Source lawful Radeon (7600/7700 XT/7800 XT) and B650/B760 assets (highest coverage gain). 2. Re-extract a flat 7950X3D; fix H510M material. 3. Variant picker for products with several models. 4. Declare `realMm` from vendor datasheets. 5. Real-phone verification; texture recompression only if the budget requires it.

## 9. Git and acceptance
Base `b16a333`, branch `main`; the Task 02 commit SHA is the commit that contains this file (reported in the chat reply; pushed status stated there). Acceptance: build/tests pass ✔ · interactions and orientations intact (orient det test over all 26 models, UI 39/39) ✔ · new model licensed/described ✔ · mapping report matches reality (regenerated) ✔ · no physical-phone claim ✔ · first-batch target (5 models) ✘ not reachable without assets.
