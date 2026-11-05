# web/ — Next.js scaffold (UNVERIFIED)

Phase 2 target stack skeleton. **It has never been installed, built or run**: the build sandbox could not reach the npm registry,
so `next` could not be downloaded. Treat everything here as a starting point to verify on a machine with npm access:

```bash
cd web && npm install && npm run typecheck && npm run dev
```

What it demonstrates: the TypeScript engine (`../src/core`, `../src/data`) is importable from a Next server component through the
`@riglab/*` path aliases and `experimental.externalDir`. What it does not do yet: the React views in `../src/app` still talk to the
legacy runtime (`window.RigLabBridge`), so porting them to Next needs the store/actions move planned for Phase 3.
