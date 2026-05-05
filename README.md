# Scene Elevation

System-agnostic visual scene elevation for Foundry VTT v14 using native Foundry Regions.

Add the custom **Elevation** behavior to a Region, set its elevation and shadow strength, and choose whether it modifies token elevation and token scaling. The module duplicates the map art inside each elevated Region as a clipped overlay, draws raised or inward shadows, and adds optional transition texture at Region edges. Viewer parallax is optional and off by default, with separate comparison modes for parallax strength, scene-wide or per-region perspective point, overlay movement, overlay scaling, boundary treatment, and shadow direction.

## V1 Features

- **Region-only workflow** — no brush, no custom scene-control mode, no stored elevation grid.
- **Elevation scene controls** — draw polygonal elevation Regions from a dedicated left-side control group, with existing elevation Region outlines hidden unless toggled on.
- **Elevation Region behavior** — `Elevation`, `Shadow strength`, `Modify token elevation`, and `Modify token scaling`.
- **Lifted map overlays and holes** — positive Regions read as raised map pieces; negative Regions read as depressions with inward rim shadows.
- **Single-piece gradient shadows** — raised overlays get whole-Region contact/drop shadows, with responsive, fixed-angle, or top-down even shadow modes.
- **Stacked regions** — overlapping/nested regions work like isohypses; the innermost containing region applies.
- **Optional viewer parallax** — off by default; the default parallax type is raised card lift, with perspective anchors selectable from scene center/corners or per-Region center/corners. Region center restores the older camera-relative local direction.
- **Independent elevation transitions** — apply no transition, soft edge, wide transition, depth lip, contour stretch, or Z bridge for a stronger 3D texture patch between nested isohypse layers.
- **Overlay scaling** — optional elevation-based overlay scale so high Regions feel closer to the viewport.
- **Token elevation updates** — optional per behavior, enabled by default.
- **Token elevation scaling** — optional globally and per behavior, enabled by default, capped by setting.

## Planned

- Region ramp mode: a checkbox that adds a top elevation and creates an incremental slope from the edge toward the center, or toward the edge of a linked inner region.
- More explicit controls for region precedence when overlapping elevations are not simple nested contours.

## Status

Ground-up region-based rewrite in progress.
