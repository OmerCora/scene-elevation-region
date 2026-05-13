# Performance Watchlist

Scene Elevation Region has several canvas hot paths that should stay small. Use this as a checklist before adding features or refactoring renderer/token code.

## Token Refresh

- `refreshToken` can run every drag or animation frame. Keep full region scans, polygon tests, target-tree walks, HUD refits, and negative-clip rebuilds behind cache and bounds checks.
- Token scaling owns `token.mesh.scale`; system movement visuals should use pivot/alpha/tint only.
- Preview/drag clone tokens should not recapture natural mesh scale. They may receive parallax offsets, but canonical scene tokens own scale state.

## Region Queries

- `getActiveElevationRegions` normalizes region paths, bounds, slope ranges, and override data. Invalidate narrowly when regions, region behaviors, scene geometry, or scene settings change.
- Prefer bounds broadphase before `region.testPoint`, `pointInPolygon`, token sample-point generation, parallax lookup, negative clip lookup, or overhead checks.
- Shared polygon helpers live in `scripts/region-geometry.mjs`; keep geometry fixes there instead of copying helpers into renderer or controls.

## Settings

- `getSceneElevationSettings` is cached per scene. Invalidate through `invalidateSceneElevationSettingsCache` when world defaults, scene flags, or transient authoring previews change.
- Prefer passing a settings snapshot into repeated work instead of calling single-key settings helpers inside per-token or per-region loops.

## Renderer

- `RegionElevationRenderer.update()` clears generated textures and redraws regions. Avoid calling it from per-frame token movement unless region visuals truly changed.
- Generated texture handling lives in `scripts/generated-textures.mjs`. Future optimization can retain cache entries across non-geometry setting changes, but only after profiling memory and stale-texture behavior.
- Camera pan may redraw parallax, but should not force all-token elevation/scale refresh unless visual parameters changed.

## Overhead And Clips

- Overhead visibility can become `overhead regions x tokens x sample points`. Keep it queued/coalesced and prefer state comparisons before redraw.
- Negative parallax clips should be cleaned for tokens outside active bounds, but avoid rebuilding masks when cached clip inputs match.

## Debugging

- Enable debug logging with `game.modules.get("scene-elevation-region").api.setDebug(true)`.
- Renderer catch blocks stay quiet during normal play and emit gated debug warnings when debug logging is enabled.