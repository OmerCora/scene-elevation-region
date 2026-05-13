import {
  BLEND_MODES,
  DEPTH_SCALES,
  ELEVATED_GRID_MODES,
  ELEVATION_PRESETS,
  ELEVATION_SCALE_LIMITS,
  OVERHEAD_MODES,
  PARALLAX_MODES,
  PERSPECTIVE_POINTS,
  SCENE_SETTING_KEYS,
  SHADOW_MODES,
  TOKEN_ELEVATION_MODES,
  TOKEN_SCALING_MODES
} from "./config.mjs";

export const USE_SCENE_SETTING = "";
const USE_SCENE_SETTING_LABEL = "SCENE_ELEVATION.RegionBehavior.Choices.UseSceneSetting";

export const ELEVATED_GRID_CHOICES = Object.freeze({
  [ELEVATED_GRID_MODES.OVERRIDE_SCENE_GRID]: "SCENE_ELEVATION.Settings.ShowElevatedGridOverrideSceneGrid",
  [ELEVATED_GRID_MODES.INTERACTION]: "SCENE_ELEVATION.Settings.ShowElevatedGridInteraction",
  [ELEVATED_GRID_MODES.OFF]: "SCENE_ELEVATION.Settings.ShowElevatedGridOff"
});

export const SCENE_SETTING_SELECT_GROUPS = Object.freeze({
  [SCENE_SETTING_KEYS.PRESET]: Object.freeze([
    [ELEVATION_PRESETS.CUSTOM, "SCENE_ELEVATION.Settings.PresetCustom"],
    [ELEVATION_PRESETS.DEFAULT, "SCENE_ELEVATION.Settings.PresetDefault"],
    [ELEVATION_PRESETS.MOUSE_DRIFT_SHADOW, "SCENE_ELEVATION.Settings.PresetMouseDriftShadow"],
    [ELEVATION_PRESETS.TWO_POINT_FIVE_D_PARALLAX, "SCENE_ELEVATION.Settings.PresetTwoPointFiveDParallax"],
    [ELEVATION_PRESETS.CAMERA_LIFT_DRIFT_SHADOW, "SCENE_ELEVATION.Settings.PresetCameraLiftDriftShadow"],
    [ELEVATION_PRESETS.CAMERA_LIFT_TEXTURE_MELD, "SCENE_ELEVATION.Settings.PresetCameraLiftTextureMeld"],
    [ELEVATION_PRESETS.MULTI_LAYER_DRIFT_SHADOW, "SCENE_ELEVATION.Settings.PresetMultiLayerDriftShadow"],
    [ELEVATION_PRESETS.MULTI_LAYER_DRIFT_SHADOWLESS, "SCENE_ELEVATION.Settings.PresetMultiLayerDriftShadowless"],
    [ELEVATION_PRESETS.RESPONSIVE_SHADOW_ONLY, "SCENE_ELEVATION.Settings.PresetResponsiveShadowOnly"]
  ]),
  [SCENE_SETTING_KEYS.PARALLAX]: Object.freeze([
    ["off", "SCENE_ELEVATION.Settings.ParallaxOff"],
    ["trace", "SCENE_ELEVATION.Settings.ParallaxTrace"],
    ["minimal", "SCENE_ELEVATION.Settings.ParallaxMinimal"],
    ["verySubtle", "SCENE_ELEVATION.Settings.ParallaxVerySubtle"],
    ["subtle", "SCENE_ELEVATION.Settings.ParallaxSubtle"],
    ["medium", "SCENE_ELEVATION.Settings.ParallaxMedium"],
    ["strong", "SCENE_ELEVATION.Settings.ParallaxStrong"],
    ["extreme", "SCENE_ELEVATION.Settings.ParallaxExtreme"]
  ]),
  [SCENE_SETTING_KEYS.PARALLAX_MODE]: Object.freeze([
    [PARALLAX_MODES.ANCHORED_CARD, "SCENE_ELEVATION.Settings.ParallaxModeAnchoredCard"],
    [PARALLAX_MODES.VELOCITY_CARD, "SCENE_ELEVATION.Settings.ParallaxModeVelocityCard"],
    [PARALLAX_MODES.ANCHORED_VELOCITY_CARD, "SCENE_ELEVATION.Settings.ParallaxModeAnchoredVelocityCard"],
    [PARALLAX_MODES.ORTHOGRAPHIC_TOP_DOWN, "SCENE_ELEVATION.Settings.ParallaxModeOrthographicTopDown"],
    [PARALLAX_MODES.ORTHOGRAPHIC_ANGLE, "SCENE_ELEVATION.Settings.ParallaxModeOrthographicAngle"],
    [PARALLAX_MODES.LAYERED, "SCENE_ELEVATION.Settings.ParallaxModeLayered"],
    [PARALLAX_MODES.HORIZONTAL_SCROLL, "SCENE_ELEVATION.Settings.ParallaxModeHorizontalScroll"],
    [PARALLAX_MODES.VERTICAL_SCROLL, "SCENE_ELEVATION.Settings.ParallaxModeVerticalScroll"],
    [PARALLAX_MODES.MOUSE, "SCENE_ELEVATION.Settings.ParallaxModeMouse"],
    [PARALLAX_MODES.SHADOW, "SCENE_ELEVATION.Settings.ParallaxModeShadow"],
    [PARALLAX_MODES.TOP_DOWN_HEIGHT, "SCENE_ELEVATION.Settings.ParallaxModeTopDownHeight"]
  ]),
  [SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST]: Object.freeze([
    ["reduced", "SCENE_ELEVATION.Settings.ParallaxHeightContrastReduced"],
    ["normal", "SCENE_ELEVATION.Settings.ParallaxHeightContrastNormal"],
    ["noticeable", "SCENE_ELEVATION.Settings.ParallaxHeightContrastNoticeable"],
    ["strong", "SCENE_ELEVATION.Settings.ParallaxHeightContrastStrong"],
    ["dramatic", "SCENE_ELEVATION.Settings.ParallaxHeightContrastDramatic"],
    ["extreme", "SCENE_ELEVATION.Settings.ParallaxHeightContrastExtreme"]
  ]),
  [SCENE_SETTING_KEYS.PERSPECTIVE_POINT]: Object.freeze([
    [PERSPECTIVE_POINTS.CENTER, "SCENE_ELEVATION.Settings.PerspectivePointCenter"],
    [PERSPECTIVE_POINTS.TOP_LEFT, "SCENE_ELEVATION.Settings.PerspectivePointTopLeft"],
    [PERSPECTIVE_POINTS.TOP_RIGHT, "SCENE_ELEVATION.Settings.PerspectivePointTopRight"],
    [PERSPECTIVE_POINTS.BOTTOM_LEFT, "SCENE_ELEVATION.Settings.PerspectivePointBottomLeft"],
    [PERSPECTIVE_POINTS.BOTTOM_RIGHT, "SCENE_ELEVATION.Settings.PerspectivePointBottomRight"],
    [PERSPECTIVE_POINTS.FAR_TOP, "SCENE_ELEVATION.Settings.PerspectivePointFarTop"],
    [PERSPECTIVE_POINTS.FAR_LEFT, "SCENE_ELEVATION.Settings.PerspectivePointFarLeft"],
    [PERSPECTIVE_POINTS.FAR_RIGHT, "SCENE_ELEVATION.Settings.PerspectivePointFarRight"],
    [PERSPECTIVE_POINTS.FAR_BOTTOM, "SCENE_ELEVATION.Settings.PerspectivePointFarBottom"],
    [PERSPECTIVE_POINTS.REGION_CENTER, "SCENE_ELEVATION.Settings.PerspectivePointRegionCenter"],
    [PERSPECTIVE_POINTS.REGION_TOP_LEFT, "SCENE_ELEVATION.Settings.PerspectivePointRegionTopLeft"],
    [PERSPECTIVE_POINTS.REGION_TOP_RIGHT, "SCENE_ELEVATION.Settings.PerspectivePointRegionTopRight"],
    [PERSPECTIVE_POINTS.REGION_BOTTOM_LEFT, "SCENE_ELEVATION.Settings.PerspectivePointRegionBottomLeft"],
    [PERSPECTIVE_POINTS.REGION_BOTTOM_RIGHT, "SCENE_ELEVATION.Settings.PerspectivePointRegionBottomRight"],
    [PERSPECTIVE_POINTS.POINT_ON_SCENE_EDGE, "SCENE_ELEVATION.Settings.PerspectivePointSceneEdge"],
    [PERSPECTIVE_POINTS.CAMERA_CENTER, "SCENE_ELEVATION.Settings.PerspectivePointCameraCenter"],
    [PERSPECTIVE_POINTS.FURTHEST_EDGE, "SCENE_ELEVATION.Settings.PerspectivePointFurthestEdge"],
    [PERSPECTIVE_POINTS.NEAREST_EDGE, "SCENE_ELEVATION.Settings.PerspectivePointNearestEdge"],
    [PERSPECTIVE_POINTS.NEAREST_EDGE_PER_REGION, "SCENE_ELEVATION.Settings.PerspectivePointNearestEdgePerRegion"],
    [PERSPECTIVE_POINTS.SCENE_CAMERA_OFFSET, "SCENE_ELEVATION.Settings.PerspectivePointSceneCameraOffset"]
  ]),
  [SCENE_SETTING_KEYS.BLEND_MODE]: Object.freeze([
    [BLEND_MODES.OFF, "SCENE_ELEVATION.Settings.BlendModeOff"],
    [BLEND_MODES.SOFT, "SCENE_ELEVATION.Settings.BlendModeSoft"],
    [BLEND_MODES.WIDE, "SCENE_ELEVATION.Settings.BlendModeWide"],
    [BLEND_MODES.EDGE_STRETCH, "SCENE_ELEVATION.Settings.BlendModeEdgeStretch"],
    [BLEND_MODES.CLIFF_WARP, "SCENE_ELEVATION.Settings.BlendModeCliffWarp"],
    [BLEND_MODES.EXTRUDED_WALLS, "SCENE_ELEVATION.Settings.BlendModeExtrudedWalls"]
  ]),
  [SCENE_SETTING_KEYS.OVERLAY_SCALE]: Object.freeze([
    ["shrinkMedium", "SCENE_ELEVATION.Settings.OverlayScaleShrinkMedium"],
    ["shrinkSubtle", "SCENE_ELEVATION.Settings.OverlayScaleShrinkSubtle"],
    ["off", "SCENE_ELEVATION.Settings.OverlayScaleOff"],
    ["subtle", "SCENE_ELEVATION.Settings.OverlayScaleSubtle"],
    ["medium", "SCENE_ELEVATION.Settings.OverlayScaleMedium"],
    ["strong", "SCENE_ELEVATION.Settings.OverlayScaleStrong"]
  ]),
  [SCENE_SETTING_KEYS.SHADOW_MODE]: Object.freeze([
    [SHADOW_MODES.OFF, "SCENE_ELEVATION.Settings.ShadowModeOff"],
    [SHADOW_MODES.RESPONSIVE, "SCENE_ELEVATION.Settings.ShadowModeResponsive"],
    [SHADOW_MODES.RESPONSIVE_ALL_AROUND, "SCENE_ELEVATION.Settings.ShadowModeResponsiveAllAround"],
    [SHADOW_MODES.REVERSED_RESPONSIVE, "SCENE_ELEVATION.Settings.ShadowModeReversedResponsive"],
    [SHADOW_MODES.TEXTURE_MELD, "SCENE_ELEVATION.Settings.ShadowModeTextureMeld"],
    [SHADOW_MODES.FULL_TEXTURE_MELD, "SCENE_ELEVATION.Settings.ShadowModeFullTextureMeld"],
    [SHADOW_MODES.TOP_DOWN, "SCENE_ELEVATION.Settings.ShadowModeTopDown"],
    [SHADOW_MODES.TOP_DOWN_STRONG, "SCENE_ELEVATION.Settings.ShadowModeTopDownStrong"],
    [SHADOW_MODES.SUN_AT_EDGE, "SCENE_ELEVATION.Settings.ShadowModeSunAtEdge"]
  ]),
  [SCENE_SETTING_KEYS.SHADOW_LENGTH]: Object.freeze([
    ["off", "SCENE_ELEVATION.Settings.ShadowLengthOff"],
    ["short", "SCENE_ELEVATION.Settings.ShadowLengthShort"],
    ["normal", "SCENE_ELEVATION.Settings.ShadowLengthNormal"],
    ["long", "SCENE_ELEVATION.Settings.ShadowLengthLong"],
    ["extreme", "SCENE_ELEVATION.Settings.ShadowLengthExtreme"]
  ]),
  [SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE]: Object.freeze([
    [TOKEN_ELEVATION_MODES.ALWAYS, "SCENE_ELEVATION.Settings.TokenElevationModeAlways"],
    [TOKEN_ELEVATION_MODES.NEVER, "SCENE_ELEVATION.Settings.TokenElevationModeNever"],
    [TOKEN_ELEVATION_MODES.PER_REGION, "SCENE_ELEVATION.Settings.TokenElevationModePerRegion"]
  ]),
  [SCENE_SETTING_KEYS.TOKEN_SCALING_MODE]: Object.freeze([
    [TOKEN_SCALING_MODES.MAX_TOKEN_SCALE, "SCENE_ELEVATION.Settings.TokenScalingModeMaxTokenScale"],
    [TOKEN_SCALING_MODES.SCALE_PER_ELEVATION, "SCENE_ELEVATION.Settings.TokenScalingModeScalePerElevation"]
  ]),
  [SCENE_SETTING_KEYS.DEPTH_SCALE]: Object.freeze([
    [DEPTH_SCALES.COMPRESSED, "SCENE_ELEVATION.Settings.DepthScaleCompressed"],
    [DEPTH_SCALES.LINEAR, "SCENE_ELEVATION.Settings.DepthScaleLinear"],
    [DEPTH_SCALES.DRAMATIC, "SCENE_ELEVATION.Settings.DepthScaleDramatic"]
  ])
});

export const WORLD_SETTING_CHOICES = Object.freeze(Object.fromEntries(
  Object.entries(SCENE_SETTING_SELECT_GROUPS).map(([key, choices]) => [key, choiceArrayToObject(choices)])
));

export const REGION_BEHAVIOR_CHOICES = Object.freeze({
  PRESET: withUseSceneSetting(SCENE_SETTING_SELECT_GROUPS[SCENE_SETTING_KEYS.PRESET]),
  PARALLAX_STRENGTH: withUseSceneSetting(SCENE_SETTING_SELECT_GROUPS[SCENE_SETTING_KEYS.PARALLAX]),
  PARALLAX_HEIGHT_CONTRAST: withUseSceneSetting(SCENE_SETTING_SELECT_GROUPS[SCENE_SETTING_KEYS.PARALLAX_HEIGHT_CONTRAST]),
  PARALLAX_MODE: withUseSceneSetting(SCENE_SETTING_SELECT_GROUPS[SCENE_SETTING_KEYS.PARALLAX_MODE]),
  PERSPECTIVE_POINT: withUseSceneSetting(SCENE_SETTING_SELECT_GROUPS[SCENE_SETTING_KEYS.PERSPECTIVE_POINT]),
  BLEND_MODE: withUseSceneSetting(SCENE_SETTING_SELECT_GROUPS[SCENE_SETTING_KEYS.BLEND_MODE]),
  OVERLAY_SCALE: withUseSceneSetting(SCENE_SETTING_SELECT_GROUPS[SCENE_SETTING_KEYS.OVERLAY_SCALE]),
  SHADOW_MODE: withUseSceneSetting(SCENE_SETTING_SELECT_GROUPS[SCENE_SETTING_KEYS.SHADOW_MODE]),
  SHADOW_LENGTH: withUseSceneSetting(SCENE_SETTING_SELECT_GROUPS[SCENE_SETTING_KEYS.SHADOW_LENGTH]),
  DEPTH_SCALE: withUseSceneSetting(SCENE_SETTING_SELECT_GROUPS[SCENE_SETTING_KEYS.DEPTH_SCALE]),
  ELEVATION_SCALE: Object.freeze(Object.fromEntries([
    [USE_SCENE_SETTING, USE_SCENE_SETTING_LABEL],
    ...Array.from({ length: ELEVATION_SCALE_LIMITS.MAX - ELEVATION_SCALE_LIMITS.MIN + 1 }, (_, index) => {
      const value = String(ELEVATION_SCALE_LIMITS.MIN + index);
      return [value, value];
    })
  ])),
  UNDER_OVERHEAD: Object.freeze({
    [OVERHEAD_MODES.HIDE]: "SCENE_ELEVATION.RegionBehavior.Choices.UnderOverheadHide",
    [OVERHEAD_MODES.FADE]: "SCENE_ELEVATION.RegionBehavior.Choices.UnderOverheadFade",
    [OVERHEAD_MODES.KEEP]: "SCENE_ELEVATION.RegionBehavior.Choices.UnderOverheadKeep"
  })
});

export function choiceArrayToObject(choices) {
  return Object.freeze(Object.fromEntries(choices ?? []));
}

export function withUseSceneSetting(choices) {
  return Object.freeze({
    [USE_SCENE_SETTING]: USE_SCENE_SETTING_LABEL,
    ...choiceArrayToObject(choices)
  });
}