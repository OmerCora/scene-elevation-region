# Scene Elevation

[![Downloads](https://img.shields.io/github/downloads/OmerCora/scene-elevation-region/total?label=Downloads&color=4aa94a)](https://github.com/OmerCora/scene-elevation-region/releases)
[![Latest Version Downloads](https://img.shields.io/github/downloads/OmerCora/scene-elevation-region/latest/total?label=Latest%20Version&color=4aa94a)](https://github.com/OmerCora/scene-elevation-region/releases/latest)

System-agnostic visual scene elevation for Foundry VTT v14 using native Foundry Regions.

Add the custom **Elevation** behavior to a Region, set its elevation and shadow strength, and choose whether it modifies token elevation and token scaling. The module duplicates the map art inside each elevated Region as a clipped overlay, draws shadows around and adds optional transition texture at Region edges. Adds parallax with various settings. Module settings act as scene defaults; each scene can override the preset-managed visual and token settings from the Elevation controls. I added some presets to play around

## Features

- **Region-only workflow**: Scene Elevation Controls, quickly create regions with the Elevation behaviour setup. You can draw polygon, rectangle, and circle elevation Regions within this menu.
- **Per-scene elevation settings**: the control-group settings button opens a scene palette for presets, parallax, parallax height contrast, transition, perspective, shadow, overlay scale, token elevation policy, and token scaling overrides.
- **Elevation Region behavior**: `Elevation`, `Shadow strength`, per-Region preset, parallax strength/type, perspective point, overlay scale, shadow type/length, transition, depth scale, and elevation scale overrides, `Modify token elevation`, and `Modify token scaling`.
- **Region behavior - Slope**: You can define a delta elevation and a direction for a region by enabling the "Slope" option. This will create a 2D linear slope, setting scene elevation from one edge to another in the given direction. Parallax behaviour will occur at different rate for each edge simulating the slope effect.
- **Overhead Regions**: You can enable overhead option in the elevation behaviour. causing the token moving to render "under" these regions if their elevation is lower than the overhead's elevation. Walking over them from a higher elevation will cause token to land over these regions. 

## Support

If you find this module useful, consider supporting development:

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/G2G263V03)

---

*Scene Elevation is released under the [MIT License](LICENSE).*

