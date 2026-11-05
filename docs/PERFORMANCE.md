# Performance baseline (Phase 5, 2026-11-05)

Measured in headless Chrome with software GL (SwiftShader) — load numbers are indicative, FPS is NOT representative of a phone GPU.

| Metric | Value |
|---|---|
| dist/riglab.artifact.html | 13,362 KB (limit 16,384 KB, headroom ~3.0 MB) |
| GLB models (23) raw / base64 | 9,626 KB / ~12,835 KB (96% of the page) |
| Largest models | case-meshify 1,696 KB, mobo-x570 987 KB, cpu-7950x3d 855 KB, mobo-b550f 688 KB |
| DOMContentLoaded / load | 1.56 s / 1.60 s |
| JS heap with full build in 3D | ~32 MB |
| Rendering | on-demand (`invalidate()` → rAF), DPR capped at 1.5 |

## Budget rules
- Page must stay < 15.5 MB. Adding a model costs raw size × 1.33.
- Any new model > 600 KB needs texture recompression (JPEG q≈80, ≤1024px) first.

## Candidate savings (not applied — need approval, visual quality trade-off)
- Recompress textures inside the 5 biggest GLBs: est. −2 to −3 MB.
- Lazy-load models after first paint (needs fetch of side files; not possible in single-file artifact).
