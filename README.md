# Scene Elevation

System-agnostic visual scene elevation for Foundry VTT v14 using native Foundry Regions.

Add the custom **Elevation** behavior to a Region, set its elevation and shadow strength, and choose whether it modifies token elevation and token scaling. The module duplicates the map art inside each elevated Region as a clipped overlay, draws raised or inward shadows, and adds optional transition texture at Region edges. Viewer parallax is optional and off by default, with separate comparison modes for parallax strength, scene-wide or per-region perspective point, overlay movement, overlay scaling, boundary treatment, and shadow direction. Module settings act as scene defaults; each scene can override them from the Elevation controls.

## V1 Features

- **Region-only workflow** — no brush, no custom scene-control mode, no stored elevation grid.
- **Elevation scene controls** — select/move/resize elevation Regions via Foundry's Region layer, or draw polygon, rectangle, and circle elevation Regions from a dedicated left-side control group. Existing elevation Region outlines are hidden unless toggled on. Ctrl+Z removes the last Region created by the Elevation tools when that creation is still the latest operation.
- **Elevation Region defaults** — Regions created from the Elevation tools use random colors, Region-layer-only visibility, and true-shape highlighting when supported by the active Foundry build.
- **Per-scene elevation settings** — the control-group settings button opens a scene palette for parallax, parallax height contrast, transition, perspective, shadow, overlay scale, token elevation policy, and token scaling overrides.
- **Elevation Region behavior** — `Elevation`, `Shadow strength`, per-Region parallax strength/type, perspective point, overlay scale, shadow type/length, transition, and depth scale overrides, `Modify token elevation`, and `Modify token scaling`.
- **Lifted map overlays and holes** — positive Regions read as raised map pieces; negative Regions read as depressions with inward rim shadows.
- **Single-piece gradient shadows** — raised overlays get whole-Region contact/drop shadows, with Off, responsive, responsive + all-around, texture-melded, full texture-melded, top-down, Small Time sun, or draggable sun-edge shadow modes and adjustable shadow length.
- **Stacked regions** — overlapping/nested regions work like isohypses; the innermost containing region applies.
- **Optional viewer parallax** — off by default; strength now ranges from Minimal, capped to a few pixels, through Extreme, which boosts distant perspective anchors. Parallax height contrast offers Normal, Noticeable, Strong, Dramatic, and Extreme levels to exaggerate the drift difference between low and high elevations. The default parallax type is raised card lift, with perspective anchors selectable from scene center/corners, far points outside the map edges, per-Region center/corners, a draggable point on the scene edge in Elevation select mode, or the camera-relative furthest scene edge. Region center restores the older camera-relative local direction, with camera-origin and velocity parallax types for reducing center-crossing snap.
- **Independent elevation transitions** — apply no transition, soft edge, wide transition, or 3D cliff warp between nested isohypse layers.
- **Overlay scaling** — optional elevation-based overlay scale so high Regions feel closer to the viewport.
- **Token elevation updates** — choose Always, Never, or Per Region as a module default and per-scene override; Per Region uses each Elevation behavior's token elevation checkbox.
- **Token elevation scaling** — optional globally and per behavior, enabled by default, capped by setting.

## Planned

- Region ramp mode: a checkbox that adds a top elevation and creates an incremental slope from the edge toward the center, or toward the edge of a linked inner region.
- More explicit controls for region precedence when overlapping elevations are not simple nested contours.

## Status

Ground-up region-based rewrite in progress.
