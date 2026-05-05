import { SHADOW_STRENGTH_LIMITS } from "./config.mjs";

const fields = foundry.data.fields;

/**
 * RegionBehavior subtype: scene-elevation.elevation
 *
 * Defines a flat contour elevation for its parent Region. Visual depth is
 * derived from elevation differences at region edges; token elevation and
 * token scaling can be enabled per region.
 */
export class ElevationRegionBehavior extends foundry.data.regionBehaviors.RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["SCENE_ELEVATION.RegionBehavior"];

  static defineSchema() {
    return {
      elevation: new fields.NumberField({
        required: true, initial: 1,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.elevation.label",
        hint: "SCENE_ELEVATION.RegionBehavior.FIELDS.elevation.hint"
      }),
      shadowStrength: new fields.NumberField({
        required: true,
        initial: SHADOW_STRENGTH_LIMITS.DEFAULT,
        min: SHADOW_STRENGTH_LIMITS.MIN,
        max: SHADOW_STRENGTH_LIMITS.MAX,
        step: SHADOW_STRENGTH_LIMITS.STEP,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.shadowStrength.label",
        hint: "SCENE_ELEVATION.RegionBehavior.FIELDS.shadowStrength.hint"
      }),
      modifyTokenElevation: new fields.BooleanField({
        required: true,
        initial: true,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.modifyTokenElevation.label",
        hint: "SCENE_ELEVATION.RegionBehavior.FIELDS.modifyTokenElevation.hint"
      }),
      modifyTokenScaling: new fields.BooleanField({
        required: true,
        initial: true,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.modifyTokenScaling.label",
        hint: "SCENE_ELEVATION.RegionBehavior.FIELDS.modifyTokenScaling.hint"
      })
    };
  }

  static events = {};
}

/** Hook handler — refreshes the renderer whenever a relevant region or behavior changes. */
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
