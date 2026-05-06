import { BLEND_MODES, PARALLAX_MODES, SHADOW_MODES, SHADOW_STRENGTH_LIMITS } from "./config.mjs";

const fields = foundry.data.fields;
const USE_SCENE_SETTING = "";

const PARALLAX_MODE_CHOICES = Object.freeze({
  [USE_SCENE_SETTING]: "SCENE_ELEVATION.RegionBehavior.Choices.UseSceneSetting",
  [PARALLAX_MODES.CARD]: "SCENE_ELEVATION.Settings.ParallaxModeCard",
  [PARALLAX_MODES.ANCHORED_CARD]: "SCENE_ELEVATION.Settings.ParallaxModeAnchoredCard",
  [PARALLAX_MODES.VELOCITY_CARD]: "SCENE_ELEVATION.Settings.ParallaxModeVelocityCard",
  [PARALLAX_MODES.ANCHORED_VELOCITY_CARD]: "SCENE_ELEVATION.Settings.ParallaxModeAnchoredVelocityCard",
  [PARALLAX_MODES.SHADOW]: "SCENE_ELEVATION.Settings.ParallaxModeShadow"
});

const SHADOW_MODE_CHOICES = Object.freeze({
  [USE_SCENE_SETTING]: "SCENE_ELEVATION.RegionBehavior.Choices.UseSceneSetting",
  [SHADOW_MODES.OFF]: "SCENE_ELEVATION.Settings.ShadowModeOff",
  [SHADOW_MODES.RESPONSIVE]: "SCENE_ELEVATION.Settings.ShadowModeResponsive",
  [SHADOW_MODES.REVERSED_RESPONSIVE]: "SCENE_ELEVATION.Settings.ShadowModeReversedResponsive",
  [SHADOW_MODES.TEXTURE_MELD]: "SCENE_ELEVATION.Settings.ShadowModeTextureMeld",
  [SHADOW_MODES.FULL_TEXTURE_MELD]: "SCENE_ELEVATION.Settings.ShadowModeFullTextureMeld",
  [SHADOW_MODES.TOP_DOWN]: "SCENE_ELEVATION.Settings.ShadowModeTopDown",
  [SHADOW_MODES.TOP_DOWN_STRONG]: "SCENE_ELEVATION.Settings.ShadowModeTopDownStrong",
  [SHADOW_MODES.SMALL_TIME_SUN]: "SCENE_ELEVATION.Settings.ShadowModeSmallTimeSun",
  [SHADOW_MODES.SUN_AT_EDGE]: "SCENE_ELEVATION.Settings.ShadowModeSunAtEdge"
});

const BLEND_MODE_CHOICES = Object.freeze({
  [USE_SCENE_SETTING]: "SCENE_ELEVATION.RegionBehavior.Choices.UseSceneSetting",
  [BLEND_MODES.OFF]: "SCENE_ELEVATION.Settings.BlendModeOff",
  [BLEND_MODES.SOFT]: "SCENE_ELEVATION.Settings.BlendModeSoft",
  [BLEND_MODES.WIDE]: "SCENE_ELEVATION.Settings.BlendModeWide",
  [BLEND_MODES.CLIFF_WARP]: "SCENE_ELEVATION.Settings.BlendModeCliffWarp"
});

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
      parallaxModeOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: PARALLAX_MODE_CHOICES,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.parallaxModeOverride.label",
        hint: "SCENE_ELEVATION.RegionBehavior.FIELDS.parallaxModeOverride.hint"
      }),
      shadowModeOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: SHADOW_MODE_CHOICES,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.shadowModeOverride.label",
        hint: "SCENE_ELEVATION.RegionBehavior.FIELDS.shadowModeOverride.hint"
      }),
      blendModeOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: BLEND_MODE_CHOICES,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.blendModeOverride.label",
        hint: "SCENE_ELEVATION.RegionBehavior.FIELDS.blendModeOverride.hint"
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
