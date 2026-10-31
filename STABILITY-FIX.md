# GhOstOP Studio 1.3 — Stability patch

- Location mode reads only up to 4 MiB from each photo for EXIF and small ranges from videos for GPS; it no longer loads entire videos.
- Content mode skips video frame decoding and classifies videos by lightweight heuristics; full video AI classification is not supported.
- Duplicate signature uses bounded file-range reads.
- Heavy processing concurrency reduced to one for AI/location and two for non-AI content.
- Sorting progress yields to the UI every ten files.
- Desktop ZIP export still reads full media, so large exports may require substantial disk/memory; prefer native Move Files.

Known limitations: AI image inference still runs in Electron renderer and can briefly stall on slower hardware. The first AI model load can take time. GPS metadata from some video formats may not be recognized. No Windows end-to-end test was performed here.

Test with a 20-file folder, then 100 files, then the full folder. Run `npm install`, `npm start`, and `npm run build` once satisfied.
