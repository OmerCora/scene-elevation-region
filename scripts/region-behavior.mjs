import { ELEVATION_PRESETS, ELEVATION_SCALE_LIMITS, OVERHEAD_MODES, REGION_BEHAVIOR_TYPE, SHADOW_MODES, SHADOW_STRENGTH_LIMITS, edgeStretchPercentValue, shadowLengthKey } from "./config.mjs";
import { REGION_BEHAVIOR_CHOICES, USE_SCENE_SETTING } from "./choices.mjs";

const fields = foundry.data.fields;

function _shadowLengthChoice(value) {
  const override = String(value ?? USE_SCENE_SETTING);
  if (!override) return USE_SCENE_SETTING;
  if (Object.prototype.hasOwnProperty.call(REGION_BEHAVIOR_CHOICES.SHADOW_LENGTH, override)) return override;
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

function _edgeStretchPercentOverrideChoice(value) {
  const override = String(value ?? USE_SCENE_SETTING).trim();
  if (!override) return USE_SCENE_SETTING;
  return String(edgeStretchPercentValue(override));
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

function _underOverheadMode(value) {
  const mode = String(value ?? OVERHEAD_MODES.FADE);
  return Object.values(OVERHEAD_MODES).includes(mode) ? mode : OVERHEAD_MODES.FADE;
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
    data.edgeStretchPercentOverride = _edgeStretchPercentOverrideChoice(data.edgeStretchPercentOverride);
    if (data.shadowModeOverride && !Object.values(SHADOW_MODES).includes(String(data.shadowModeOverride))) data.shadowModeOverride = SHADOW_MODES.TOP_DOWN;
    data.shadowLengthOverride = _shadowLengthChoice(data.shadowLengthOverride);
    data.slope = _booleanValue(data.slope, false);
    const elevation = _numberValue(data.elevation, 1);
    if (data.slopeHeight === undefined) data.slopeHeight = _legacySlopeHeight(data, elevation);
    data.slopeHeight = data.slope ? _numberValue(data.slopeHeight, 0) : 0;
    data.slopeDirection = _slopeDirection(data.slopeDirection);
    data.overhead = _booleanValue(data.overhead, false);
    data.underOverheadMode = _underOverheadMode(data.underOverheadMode);
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
      overhead: new fields.BooleanField({
        required: true,
        initial: false,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.overhead.label",
        hint: "SCENE_ELEVATION.RegionBehavior.FIELDS.overhead.hint"
      }),
      underOverheadMode: new fields.StringField({
        required: true,
        initial: OVERHEAD_MODES.FADE,
        choices: REGION_BEHAVIOR_CHOICES.UNDER_OVERHEAD,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.underOverheadMode.label",
        hint: "SCENE_ELEVATION.RegionBehavior.FIELDS.underOverheadMode.hint"
      }),
      presetOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: REGION_BEHAVIOR_CHOICES.PRESET,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.presetOverride.label"
      }),
      parallaxStrengthOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: REGION_BEHAVIOR_CHOICES.PARALLAX_STRENGTH,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.parallaxStrengthOverride.label"
      }),
      parallaxHeightContrastOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: REGION_BEHAVIOR_CHOICES.PARALLAX_HEIGHT_CONTRAST,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.parallaxHeightContrastOverride.label"
      }),
      parallaxModeOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: REGION_BEHAVIOR_CHOICES.PARALLAX_MODE,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.parallaxModeOverride.label"
      }),
      perspectivePointOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: REGION_BEHAVIOR_CHOICES.PERSPECTIVE_POINT,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.perspectivePointOverride.label"
      }),
      blendModeOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: REGION_BEHAVIOR_CHOICES.BLEND_MODE,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.blendModeOverride.label"
      }),
      edgeStretchPercentOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.edgeStretchPercentOverride.label",
        hint: "SCENE_ELEVATION.RegionBehavior.FIELDS.edgeStretchPercentOverride.hint"
      }),
      overlayScaleOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: REGION_BEHAVIOR_CHOICES.OVERLAY_SCALE,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.overlayScaleOverride.label"
      }),
      shadowModeOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: REGION_BEHAVIOR_CHOICES.SHADOW_MODE,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.shadowModeOverride.label"
      }),
      shadowLengthOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: REGION_BEHAVIOR_CHOICES.SHADOW_LENGTH,
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
      depthScaleOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: REGION_BEHAVIOR_CHOICES.DEPTH_SCALE,
        label: "SCENE_ELEVATION.RegionBehavior.FIELDS.depthScaleOverride.label"
      }),
      elevationScaleOverride: new fields.StringField({
        required: true,
        blank: true,
        initial: USE_SCENE_SETTING,
        choices: REGION_BEHAVIOR_CHOICES.ELEVATION_SCALE,
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
    const underOverheadChanged = foundry.utils.hasProperty(changes, "system.underOverheadMode");
    const previousSlope = document.system?.slope === true;
    const nextSlope = slopeChanged ? _booleanValue(foundry.utils.getProperty(changes, "system.slope"), previousSlope) : previousSlope;
    const slopeActuallyChanged = slopeChanged && nextSlope !== previousSlope;
    if (slopeActuallyChanged || (!nextSlope && elevationChanged)) {
      foundry.utils.setProperty(changes, "system.slopeHeight", 0);
    }
    if (directionChanged) foundry.utils.setProperty(changes, "system.slopeDirection", _slopeDirection(foundry.utils.getProperty(changes, "system.slopeDirection")));
    if (underOverheadChanged) foundry.utils.setProperty(changes, "system.underOverheadMode", _underOverheadMode(foundry.utils.getProperty(changes, "system.underOverheadMode")));
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
