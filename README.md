# Scene Elevation

System-agnostic visual scene elevation for Foundry VTT v14. Paint elevation onto a half-grid overlay (corners, edge midpoints, and centers of every grid square — 9 points per cell). Elevated regions are warped outward and parallax with camera movement to simulate 3D relief on 2D top-down maps. Inspired by CodexVTT.

## V1 Features

- **Elevation mode** in the left scene controls.
- **Brush tool** with size / height / fade properties (Foundry v14 tool palette).
- **Half-grid storage** — 9 elevation points per square grid cell.
- **LOD overlay** — dense (9-point) when zoomed in, sparse (1-point/cell average) when zoomed out.
- **Parallax warp** of the scene background (subtle / medium / strong).
- **Token elevation scaling** — optional, capped.
- Square grid only.

## V2 (planned)

- Elevation Region behavior (per-region profiles, ramps, plateaus).
- Elevated walls with thickness that wrap surrounding terrain.
- Smoothing / raise-lower / set-height / eyedropper tools.
- Hex grid support.
- Multi-user collaborative painting.

## Status

Early scaffold. Not yet feature complete.
