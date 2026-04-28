import { MODULE_ID, BRUSH } from "./config.mjs";

const fields = foundry.data.fields;

/**
 * RegionBehavior subtype: scene-elevation.elevation
 *
 * Adds a region-driven elevation contribution that composites on top of the
 * painted half-grid. Useful for plateaus, ramps, or quickly raising/lowering
 * a defined area without painting it manually.
 *
 * Modes:
 *   set     — assign `height` to all points inside the region (with edge fade)
 *   add     — add `height` on top of existing composite
 *   plateau — alias of `add` with sharp edges (kept for clarity)
 *   ramp    — interpolate 0..height across `rampLength` along `rampDirection`
 */
export class ElevationRegionBehavior extends foundry.data.regionBehaviors.RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["SCENE_ELEVATION.RegionBehavior"];

  static defineSchema() {
    return {
      height: new fields.NumberField({
        required: true, initial: 1,
        min: BRUSH.HEIGHT_MIN, max: BRUSH.HEIGHT_MAX, step: 0.1,
        label: "SCENE_ELEVATION.RegionBehavior.Height"
      }),
      mode: new fields.StringField({
        required: true, initial: "set",
        choices: {
          set: "SCENE_ELEVATION.RegionBehavior.ModeSet",
          add: "SCENE_ELEVATION.RegionBehavior.ModeAdd",
          plateau: "SCENE_ELEVATION.RegionBehavior.ModePlateau",
          ramp: "SCENE_ELEVATION.RegionBehavior.ModeRamp"
        },
        label: "SCENE_ELEVATION.RegionBehavior.Mode"
      }),
      fade: new fields.NumberField({
        required: true, initial: 0, min: 0, max: 100, step: 1,
        label: "SCENE_ELEVATION.RegionBehavior.Fade"
      }),
      rampDirection: new fields.AngleField({
        required: true, initial: 0,
        label: "SCENE_ELEVATION.RegionBehavior.RampDirection"
      }),
      rampLength: new fields.NumberField({
        required: true, initial: 5, min: 1, step: 1,
        label: "SCENE_ELEVATION.RegionBehavior.RampLength"
      })
    };
  }

  /** No event-driven hooks; rebuild composite when the behavior changes. */
  static events = {};
}

/** Hook handler — invalidates composite + refreshes mesh whenever a relevant
 *  region or behavior changes on the active scene. */
export function registerRegionHooks(invalidate) {
  const triggers = [
    "createRegion", "updateRegion", "deleteRegion",
    "createRegionBehavior", "updateRegionBehavior", "deleteRegionBehavior"
  ];
  for (const hook of triggers) {
    Hooks.on(hook, (doc) => {
      const scene = doc?.parent?.parent ?? doc?.parent ?? doc?.scene;
      if (!scene || scene !== canvas?.scene) return;
      invalidate();
    });
  }
}
