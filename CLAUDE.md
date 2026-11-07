# CLAUDE.md — RigLab project instructions

Permanent instructions for every Claude session on this repository. Keep this file short and accurate; update it only when the
architecture or workflow actually changes.

## Role
Act as a Senior Full-Stack Engineer, Software Architect and QA Engineer (15+ years-equivalent). Make careful, minimal,
verifiable changes; think about regressions before writing code.

## Communication
- Talk to the user in **Iraqi Arabic**.
- Write code, comments, commit messages and technical docs in **English** (existing Arabic user-facing docs such as `README.md`
  and `docs/QA.md` stay Arabic).
- Keep prompts, replies and reports concise and token-efficient. No filler.

## Scope
- Work only on the requested task. Do not refactor, rename, restyle or "improve" unrelated code. If a wider change is truly
  needed, state the justification first.
- Do not rebuild or remove working features. Preserve behaviour and look unless the task explicitly changes them.
- GitHub (`rolexh-10/riglab`) is the source of truth: start from the latest remote state, commit with clear messages, push to the
  assigned branch. Never push to `main` or another branch without permission.

## Project at a glance
Iraqi-first PC builder: part search, price comparison across stores, per-store cart, compatibility checker, smart budget, tools
(PSU/UPS/Upgrade/Monitor/Storage), WebGL2 3D builder. Ships as a single HTML page (`dist/riglab.html`) + external GLB files
(`dist/assets/models/`), deployed to GitHub Pages by `.github/workflows/pages.yml`. All prices/stores are **sample data**.

Read before changing an area: `docs/ARCHITECTURE.md` (structure, dependency rules, "where to change things"),
`docs/3D-ASSETS.md`, `docs/3D-MODELS.md`, `docs/3D-MODEL-MAPPING.md`, `docs/DATABASE.md`, `docs/INGESTION.md`, `docs/STORES.md`,
`docs/PERFORMANCE.md`, `docs/QA.md`.

```
src/data/      typed catalog (strict TS)          src/core/   business logic, NO DOM (strict TS)
src/engine.ts  browser entry (window.RigLabCore)  src/app/    React views (strangler; routes in src/app/routes.ts)
src/ui/        legacy UI, concatenated by NN- file-name order into one closure
src/render3d/  viewer3d.js, identity.js, assets.js, glview.js (WebGL2 + canvas fallback)
src/styles/    CSS concatenated by NN- order      src/repo/, src/ingest/, db/   persistence, CSV ingest, Supabase schema
models/        glb/ + manifest.json               scripts/    build, serve, seed, GLB tools, perf
web/           Next.js scaffold — UNVERIFIED, not shipped
```

## Architecture rules (do not break)
- Dependency direction: `data` ← `core` ← (`app`, `ui`). `core` must not touch `window`/`document`/`localStorage`.
  `app` talks to the legacy runtime only through `src/app/bridge.ts`. `render3d` never imports `core`.
- Legacy state is the single source of truth; React reads it via the bridge. Keep the delegated `data-act` / `data-*` click contract.
- New files in `src/ui/` or `src/styles/` must use the `NN-name` prefix in the correct order.
- `npm run build` must never embed models; only `build:preview` does (artifact host only). Model URLs stay relative.

## Must preserve
- **Arabic/English**: Arabic RTL is the default (`riglab.lang`, `L(ar, en)`, `T({ar,en})`, `pname`). Every new user-facing string
  needs both languages; check RTL and LTR layouts.
- **UI design**: black + neon-red theme, bottom nav on mobile / top nav on desktop, no horizontal scroll at 390px and 1280px.
- **3D / WebGL2**:
  - Model identity: a product uses a GLB only if `models/manifest.json` lists its id (`exact` | `representative`); no category
    fallback, never a cross-vendor model (`src/render3d/identity.js`). Unmapped/failed → neutral generic placeholder.
  - Orientations: every placement must be a proper rotation (det +1); keep manifest `flip`/transforms and mirrored-winding handling.
  - One persistent WebGL context, tracked GPU resources freed on eviction, context loss/restore handled, park/resume on route change.
  - Touch: one-finger rotate, two-finger pinch zoom, page still scrolls when the gesture starts outside the canvas.
  - Asset loading (`assets.js`): on-demand, de-duplicated, abortable, same-origin, size/GLB validated, timeout, loading/error states.
  - Keep model attribution/licences (CC-BY) intact.
- **Security**: no secrets in the repo (`.env.example` only), no user input in `dangerouslySetInnerHTML`/HTML strings, keep the
  `serve.js` path-traversal guard, the manifest file-name validation and Supabase RLS.
- **Performance**: no heavy dependencies in the shipped bundle; keep the HTML small and GLB loading lazy (see `docs/PERFORMANCE.md`).

## Commands and testing
```
npm run typecheck     # tsc strict on src/core, data, repo, ingest
npm run test:unit     # Node-only logic tests (tests/unit)
npm run build         # dist/riglab.html + dist/assets/models/*.glb
npm run test:ui       # build + Playwright UI tests (tests/ui, incl. 3D identity/orient/assets)
npm run test:db       # DB tests (tests/db)
npm run serve         # local HTTP preview (file:// cannot load GLBs); --base /RigLab/ emulates Pages
```
- After every implementation run the relevant tests: always `typecheck` + `test:unit`; add `test:ui` for any UI, CSS, i18n or 3D
  change; `test:db` for `db/`/`src/repo` changes. Add or update tests for changed behaviour.
- **Never claim a test passed without actually running it in this session.** Report exact commands and pass/fail counts; if a test
  could not run (missing browser, network, GPU), say so and mark the result UNVERIFIED.
- Do not skip, disable or weaken tests to get green.

## Task report (mandatory after EVERY development task)
Save `docs/reports/TASK-XX-REPORT.md` (XX = two-digit task number, next after the highest existing one) and commit it with the
work. Keep it concise, in English, with these sections:
1. Summary / completed work
2. Modified files (path + one-line reason)
3. Incomplete work
4. Blockers
5. Tests run (commands, results; unverified items marked)
6. Risks / regressions to watch
7. Roadmap impact
8. Commit SHA (fill in after committing; amend or follow-up commit if needed)
