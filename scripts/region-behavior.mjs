import { BLEND_MODES, DEPTH_SCALES, ELEVATION_PRESETS, ELEVATION_SCALE_LIMITS, OVERLAY_SCALE_STRENGTHS, PARALLAX_MODES, PERSPECTIVE_POINTS, REGION_BEHAVIOR_TYPE, SHADOW_MODES, SHADOW_STRENGTH_LIMITS, shadowLengthKey } from "./config.mjs";

const fields = foundry.data.fields;
const USE_SCENE_SETTING = "";

const PRESET_CHOICES = Object.freeze({
  [USE_SCENE_SETTING]: "SCENE_ELEVATION.RegionBehavior.Choices.UseSceneSetting",
  [ELEVATION_PRESETS.CUSTOM]: "SCENE_ELEVATION.Settings.PresetCustom",
  [ELEVATION_PRESETS.DEFAULT]: "SCENE_ELEVATION.Settings.PresetDefault",
  [ELEVATION_PRESETS.CAMERA_LIFT_DRIFT_SHADOW]: "SCENE_ELEVATION.Settings.PresetCameraLiftDriftShadow",
  [ELEVATION_PRESETS.MULTI_LAYER_DRIFT_SHADOW]: "SCENE_ELEVATION.Settings.PresetMultiLayerDriftShadow",
  [ELEVATION_PRESETS.MOUSE_DRIFT_SHADOW]: "SCENE_ELEVATION.Settings.PresetMouseDriftShadow",
  [ELEVATION_PRESETS.RESPONSIVE_SHADOW_ONLY]: "SCENE_ELEVATION.Settings.PresetResponsiveShadowOnly",
  [ELEVATION_PRESETS.CAMERA_LIFT_TEXTURE_MELD]: "SCENE_ELEVATION.Settings.PresetCameraLiftTextureMeld"
});

const PARALLAX_STRENGTH_CHOICES = Object.freeze({
  [USE_SCENE_SETTING]: "SCENE_ELEVATION.RegionBehavior.Choices.UseSceneSetting",
  off: "SCENE_ELEVATION.Settings.ParallaxOff",
  minimal: "SCENE_ELEVATION.Settings.ParallaxMinimal",
  verySubtle: "SCENE_ELEVATION.Settings.ParallaxVerySubtle",
  subtle: "SCENE_ELEVATION.Settings.ParallaxSubtle",
  medium: "SCENE_ELEVATION.Settings.ParallaxMedium",
  strong: "SCENE_ELEVATION.Settings.ParallaxStrong",
  extreme: "SCENE_ELEVATION.Settings.ParallaxExtreme"
});

const PARALLAX_MODE_CHOICES = Object.freeze({
  [USE_SCENE_SETTING]: "SCENE_ELEVATION.RegionBehavior.Choices.UseSceneSetting",
  [PARALLAX_MODES.ANCHORED_CARD]: "SCENE_ELEVATION.Settings.ParallaxModeAnchoredCard",
  [PARALLAX_MODES.VELOCITY_CARD]: "SCENE_ELEVATION.Settings.ParallaxModeVelocityCard",
  [PARALLAX_MODES.ANCHORED_VELOCITY_CARD]: "SCENE_ELEVATION.Settings.ParallaxModeAnchoredVelocityCard",
  [PARALLAX_MODES.LAYERED]: "SCENE_ELEVATION.Settings.ParallaxModeLayered",
  [PARALLAX_MODES.HORIZONTAL_SCROLL]: "SCENE_ELEVATION.Settings.ParallaxModeHorizontalScroll",
  [PARALLAX_MODES.VERTICAL_SCROLL]: "SCENE_ELEVATION.Settings.ParallaxModeVerticalScroll",
  [PARALLAX_MODES.MOUSE]: "SCENE_ELEVATION.Settings.ParallaxModeMouse",
  [PARALLAX_MODES.SHADOW]: "SCENE_ELEVATION.Settings.ParallaxModeShadow"
});

const PERSPECTIVE_POINT_CHOICES = Object.freeze({
  [USE_SCENE_SETTING]: "SCENE_ELEVATION.RegionBehavior.Choices.UseSceneSetting",
  [PERSPECTIVE_POINTS.CENTER]: "SCENE_ELEVATION.Settings.PerspectivePointCenter",
  [PERSPECTIVE_POINTS.TOP_LEFT]: "SCENE_ELEVATION.Settings.PerspectivePointTopLeft",
  [PERSPECTIVE_POINTS.TOP_RIGHT]: "SCENE_ELEVATION.Settings.PerspectivePointTopRight",
  [PERSPECTIVE_POINTS.BOTTOM_LEFT]: "SCENE_ELEVATION.Settings.PerspectivePointBottomLeft",
  [PERSPECTIVE_POINTS.BOTTOM_RIGHT]: "SCENE_ELEVATION.Settings.PerspectivePointBottomRight",
  [PERSPECTIVE_POINTS.FAR_TOP]: "SCENE_ELEVATION.Settings.PerspectivePointFarTop",
  [PERSPECTIVE_POINTS.FAR_LEFT]: "SCENE_ELEVATION.Settings.PerspectivePointFarLeft",
  [PERSPECTIVE_POINTS.FAR_RIGHT]: "SCENE_ELEVATION.Settings.PerspectivePointFarRight",
  [PERSPECTIVE_POINTS.FAR_BOTTOM]: "SCENE_ELEVATION.Settings.PerspectivePointFarBottom",
  [PERSPECTIVE_POINTS.REGION_CENTER]: "SCENE_ELEVATION.Settings.PerspectivePointRegionCenter",
  [PERSPECTIVE_POINTS.REGION_TOP_LEFT]: "SCENE_ELEVATION.Settings.PerspectivePointRegionTopLeft",
  [PERSPECTIVE_POINTS.REGION_TOP_RIGHT]: "SCENE_ELEVATION.Settings.PerspectivePointRegionTopRight",
  [PERSPECTIVE_POINTS.REGION_BOTTOM_LEFT]: "SCENE_ELEVATION.Settings.PerspectivePointRegionBottomLeft",
  [PERSPECTIVE_POINTS.REGION_BOTTOM_RIGHT]: "SCENE_ELEVATION.Settings.PerspectivePointRegionBottomRight",
  [PERSPECTIVE_POINTS.POINT_ON_SCENE_EDGE]: "SCENE_ELEVATION.Settings.PerspectivePointSceneEdge",
  [PERSPECTIVE_POINTS.CAMERA_CENTER]: "SCENE_ELEVATION.Settings.PerspectivePointCameraCenter",
  [PERSPECTIVE_POINTS.FURTHEST_EDGE]: "SCENE_ELEVATION.Settings.PerspectivePointFurthestEdge",
  [PERSPECTIVE_POINTS.NEAREST_EDGE]: "SCENE_ELEVATION.Settings.PerspectivePointNearestEdge"
});

const OVERLAY_SCALE_CHOICES = Object.freeze({
  [USE_SCENE_SETTING]: "SCENE_ELEVATION.RegionBehavior.Choices.UseSceneSetting",
  shrinkMedium: "SCENE_ELEVATION.Settings.OverlayScaleShrinkMedium",
  shrinkSubtle: "SCENE_ELEVATION.Settings.OverlayScaleShrinkSubtle",
  off: "SCENE_ELEVATION.Settings.OverlayScaleOff",
  subtle: "SCENE_ELEVATION.Settings.OverlayScaleSubtle",
  medium: "SCENE_ELEVATION.Settings.OverlayScaleMedium",
  strong: "SCENE_ELEVATION.Settings.OverlayScaleStrong"
});

const SHADOW_MODE_CHOICES = Object.freeze({
  [USE_SCENE_SETTING]: "SCENE_ELEVATION.RegionBehavior.Choices.UseSceneSetting",
  [SHADOW_MODES.OFF]: "SCENE_ELEVATION.Settings.ShadowModeOff",
  [SHADOW_MODES.RESPONSIVE]: "SCENE_ELEVATION.Settings.ShadowModeResponsive",
  [SHADOW_MODES.RESPONSIVE_ALL_AROUND]: "SCENE_ELEVATION.Settings.ShadowModeResponsiveAllAround",
  [SHADOW_MODES.REVERSED_RESPONSIVE]: "SCENE_ELEVATION.Settings.ShadowModeReversedResponsive",
  [SHADOW_MODES.TEXTURE_MELD]: "SCENE_ELEVATION.Settings.ShadowModeTextureMeld",
  [SHADOW_MODES.FULL_TEXTURE_MELD]: "SCENE_ELEVATION.Settings.ShadowModeFullTextureMeld",
  [SHADOW_MODES.TOP_DOWN]: "SCENE_ELEVATION.Settings.ShadowModeTopDown",
  [SHADOW_MODES.TOP_DOWN_STRONG]: "SCENE_ELEVATION.Settings.ShadowModeTopDownStrong",
  [SHADOW_MODES.SUN_AT_EDGE]: "SCENE_ELEVATION.Settings.ShadowModeSunAtEdge"
});

const BLEND_MODE_CHOICES = Object.freeze({
  [USE_SCENE_SETTING]: "SCENE_ELEVATION.RegionBehavior.Choices.UseSceneSetting",
  [BLEND_MODES.OFF]: "SCENE_ELEVATION.Settings.BlendModeOff",
  [BLEND_MODES.SOFT]: "SCENE_ELEVATION.Settings.BlendModeSoft",
  [BLEND_MODES.WIDE]: "SCENE_ELEVATION.Settings.BlendModeWide",
  [BLEND_MODES.CLIFF_WARP]: "SCENE_ELEVATION.Settings.BlendModeCliffWarp"
});

const DEPTH_SCALE_CHOICES = Object.freeze({
  [USE_SCENE_SETTING]: "SCENE_ELEVATION.RegionBehavior.Choices.UseSceneSetting",
  [DEPTH_SCALES.COMPRESSED]: "SCENE_ELEVATION.Settings.DepthScaleCompressed",
  [DEPTH_SCALES.LINEAR]: "SCENE_ELEVATION.Settings.DepthScaleLinear",
  [DEPTH_SCALES.DRAMATIC]: "SCENE_ELEVATION.Settings.DepthScaleDramatic"
});

const ELEVATION_SCALE_CHOICES = Object.freeze(Object.fromEntries([
  [USE_SCENE_SETTING, "SCENE_ELEVATION.RegionBehavior.Choices.UseSceneSetting"],
  ...Array.from({ length: ELEVATION_SCALE_LIMITS.MAX - ELEVATION_SCALE_LIMITS.MIN + 1 }, (_, index) => {
    const value = String(ELEVATION_SCALE_LIMITS.MIN + index);
    return [value, value];
  })
]));

const PARALLAX_HEIGHT_CONTRAST_CHOICES = Object.freeze({
  [USE_SCENE_SETTING]: "SCENE_ELEVATION.RegionBehavior.Choices.UseSceneSetting",
  normal: "SCENE_ELEVATION.Settings.ParallaxHeightContrastNormal",
  noticeable: "SCENE_ELEVATION.Settings.ParallaxHeightContrastNoticeable",
  strong: "SCENE_ELEVATION.Settings.ParallaxHeightContrastStrong",
  dramatic: "SCENE_ELEVATION.Settings.ParallaxHeightContrastDramatic",
  extreme: "SCENE_ELEVATION.Settings.ParallaxHeightContrastExtreme"
});

const SHADOW_LENGTH_CHOICES = Object.freeze({
  [USE_SCENE_SETTING]: "SCENE_ELEVATION.RegionBehavior.Choices.UseSceneSetting",
  off: "SCENE_ELEVATION.Settings.ShadowLengthOff",
  short: "SCENE_ELEVATION.Settings.ShadowLengthShort",
  normal: "SCENE_ELEVATION.Settings.ShadowLengthNormal",
  long: "SCENE_ELEVATION.Settings.ShadowLengthLong",
  extreme: "SCENE_ELEVATION.Settings.ShadowLengthExtreme"
});

function _shadowLengthChoice(value) {
  const override = String(value ?? USE_SCENE_SETTING);
  if (!override) return USE_SCENE_SETTING;
  if (Object.prototype.hasOwnProperty.call(SHADOW_LENGTH_CHOICES, override)) return override;
  return Number.isFinite(Number(override)) ? shadowLengthKey(value) : USE_SCENE_SETTING;
}

function _presetOverrideChoice(value) {
  const preset = String(value ?? USE_SCENE_SETTING);
  if (!preset) return USE_SCENE_SETTING;
  return Object.values(ELEVATION_PRESETS).includes(preset) ? preset : ELEVATION_PRESETS.CUSTOM;
}

function _elevationScaleOverrideChoice(value) {
  const override = String(value ?? USE_SCENE_SETTING).trim();
  if (!override) return USE_SCENE_SETTING;
  const number = Number(override);
  if (!Number.isInteger(number)) return USE_SCENE_SETTING;
  return number >= ELEVATION_SCALE_LIMITS.MIN && number <= ELEVATION_SCALE_LIMITS.MAX ? String(number) : USE_SCENE_SETTING;
}

function _numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function _booleanValue(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "on", "yes"].includes(text)) return true;
  if (["false", "0", "off", "no", ""].includes(text)) return false;
  return fallback;
}

function _slopeDirection(value) {
  const number = _numberValue(value, 0);
  return ((number % 360) + 360) % 360;
}

function _legacySlopeHeight(data, elevation) {
  const lowest = _numberValue(data.slopeLowestElevation, elevation);
  const highest = _numberValue(data.slopeHighestElevation, elevation);
  const lowDelta = lowest - elevation;
  const highDelta = highest - elevation;
  return Math.abs(highDelta) >= Math.abs(lowDelta) ? highDelta : lowDelta;
}

/**
 * RegionBehavior subtype: scene-elevation.elevation
 *
 * Defines a flat contour elevation for its parent Region. Visual depth is
 * derived from elevation differences at region edges; token elevation and
 * token scaling can be enabled per region.
 */
export class ElevationRegionBehavior extends foundry.data.regionBehaviors.RegionBehaviorType {
  static LOCALIZATION_PREFIXES = ["SCENE_ELEVATION.RegionBehavior"];

  static migrateData(data) {
    data.presetOverride = _presetOverrideChoice(data.presetOverride);
    data.elevationScaleOverride = _elevationScaleOverrideChoice(data.elevationScaleOverride);
    if (data.shadowModeOverride && !Object.values(SHADOW_MODES).includes(String(data.shadowModeOverride))) data.shadowModeOverride = SHADOW_MODES.TOP_DOWN;
    data.shadowLengthOverride = _shadowLengthChoice(data.shadowLengthOverride);
    data.slope = _booleanValue(data.slope, false);
    const elevation = _numberValue(data.elevation, 1);
    if (data.slopeHeight === undefined) data.slopeHeight = _legacySlopeHeight(data, elevation);
    data.slopeHeight = data.slope ? _numberValue(data.slopeHeight, 0) : 0;
    data.slopeDirection = _slopeDirection(data.slopeDirection);
    delete data.slopeLowestElevation;
    delete data.slopeHighestElevation;
    return super.migrateData(data);
  }

  static defineSchema() {
    return {
      elevation: new fields.NumberField({
        required: true, initial: 1,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.elevation.label",
        hint: "SCENE_ELEVATION.RegionBehavior.FIELDS.elevation.hint"
      }),
      slope: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.slope.label",
        hint: "SCENE_ELEVATION.RegionBehavior.FIELDS.slope.hint"
      }),
      slopeHeight: new fields.NumberField({
        required: true,
        initial: 0,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.slopeHeight.label",
        hint: "SCENE_ELEVATION.RegionBehavior.FIELDS.slopeHeight.hint"
      }),
      slopeDirection: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 359,
        step: 1,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.slopeDirection.label",
        hint: "SCENE_ELEVATION.RegionBehavior.FIELDS.slopeDirection.hint"
      }),
      presetOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: PRESET_CHOICES,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.presetOverride.label"
      }),
      parallaxStrengthOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: PARALLAX_STRENGTH_CHOICES,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.parallaxStrengthOverride.label"
      }),
      parallaxModeOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: PARALLAX_MODE_CHOICES,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.parallaxModeOverride.label"
      }),
      perspectivePointOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: PERSPECTIVE_POINT_CHOICES,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.perspectivePointOverride.label"
      }),
      overlayScaleOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: OVERLAY_SCALE_CHOICES,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.overlayScaleOverride.label"
      }),
      shadowModeOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: SHADOW_MODE_CHOICES,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.shadowModeOverride.label"
      }),
      shadowLengthOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: SHADOW_LENGTH_CHOICES,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.shadowLengthOverride.label"
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
      parallaxHeightContrastOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: PARALLAX_HEIGHT_CONTRAST_CHOICES,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.parallaxHeightContrastOverride.label"
      }),
      blendModeOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: BLEND_MODE_CHOICES,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.blendModeOverride.label"
      }),
      depthScaleOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: DEPTH_SCALE_CHOICES,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.depthScaleOverride.label"
      }),
      elevationScaleOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: ELEVATION_SCALE_CHOICES,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.elevationScaleOverride.label"
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
  Hooks.on("preUpdateRegionBehavior", (document, changes) => {
    if (document?.type !== REGION_BEHAVIOR_TYPE) return;
    const slopeChanged = foundry.utils.hasProperty(changes, "system.slope");
    const elevationChanged = foundry.utils.hasProperty(changes, "system.elevation");
    const directionChanged = foundry.utils.hasProperty(changes, "system.slopeDirection");
    const previousSlope = document.system?.slope === true;
    const nextSlope = slopeChanged ? _booleanValue(foundry.utils.getProperty(changes, "system.slope"), previousSlope) : previousSlope;
    const slopeActuallyChanged = slopeChanged && nextSlope !== previousSlope;
    if (slopeActuallyChanged || (!nextSlope && elevationChanged)) {
      foundry.utils.setProperty(changes, "system.slopeHeight", 0);
    }
    if (directionChanged) foundry.utils.setProperty(changes, "system.slopeDirection", _slopeDirection(foundry.utils.getProperty(changes, "system.slopeDirection")));
  });

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
