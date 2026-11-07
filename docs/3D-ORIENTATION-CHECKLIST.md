# Manual 3D orientation checklist (run for every new or re-transformed model)

A positive determinant (`orient().det === 1`, checked automatically) only proves the placement is not mirrored. It does **not** prove the part is installed the right way up or facing the right direction. Check each item by eye in the Builder (`#builder`, default camera, glass side towards you), or render `node scripts/perf/contact-sheet.js http://localhost:8080/ out/ 1.9` and inspect the PNGs.

Scene axes: glass side **−x** (towards the viewer), motherboard tray **+x**, front **+z**, rear **−z**, y up.

| Part | Must be true |
|---|---|
| CPU | IHS print faces the viewer (−x), pins/PCB underside faces the tray; print text reads left-to-right, not mirrored, not rotated 90° |
| GPU | PCIe edge connector at the top-rear towards the board slot; fans face down (−y); backplate/branding readable from the glass side; I/O bracket towards the rear (−z… rear wall) |
| RAM | Gold contacts at the bottom edge towards the slot; label/heat-spreader branding readable; sticks parallel to the DIMM slots |
| Motherboard | Rear I/O ports towards the rear wall, PCIe slots at the lower half, CPU socket upper-middle, board print readable (not mirrored); form factor equals the product (ATX board only for ATX products) |
| Cooler (AIO) | Pump block on the CPU, radiator at the top/front, tubes join pump and radiator |
| Case | Glass panel at −x, front intake at +z, PSU shroud at the bottom, rear exhaust at −z |
| Any | Branding that is visible matches the label shown under the viewer (`Generic` / `look-alike: …`); no stray logos of another vendor; no geometry poking outside the scene box |

Record the result (who, device, date) in the PR / report. Physical Android phone behaviour (touch, GPU) is a separate checklist in `docs/3D-ASSETS.md` and stays UNVERIFIED until run on a device.

## Adding a model (reproducible)
1. Put the GLB in `models/glb/`, add the manifest entry (`file, cat, license, author, title, source, identity, products, priority`, plus `flip`/`basis`/`fit`/`plane`/`anchor`/`scale` as needed and optional `realMm`).
2. Optimise if needed: `python3 scripts/tools/glb-strip-textures.py in.glb out.glb` (keeps base-colour/emissive textures only, JPEG ≤1024 px) and `python3 scripts/tools/glb-drop-below.py in.glb out.glb --axis 2 --below -0.3` (removes hidden geometry such as a CPU pin grid).
3. `npm run models:check` must report 0 errors; read every WARN.
4. Find orientation: temporarily vary `RIGLAB_MODELS[id].flip` in the console, then fix the winner in the manifest (per-model, never a global rotation).
5. Run the checklist above, `npm run models:report`, `npm run build`, tests.
