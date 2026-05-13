import {
  EDGE_STRETCH_LIMITS,
  ELEVATED_GRID_MODES,
  ELEVATION_DEFAULT_SETTINGS,
  ELEVATION_SCALE_LIMITS,
  MODULE_ID,
  SETTINGS,
  TOKEN_SCALE_PER_ELEVATION_LIMITS,
  invalidateSceneElevationSettingsCache,
  setSceneElevationClientEnabled
} from "./config.mjs";
import { ELEVATED_GRID_CHOICES, WORLD_SETTING_CHOICES } from "./choices.mjs";

export function registerModuleSettings({
  resetDefaultsDialogClass,
  onClientEnabledChange,
  onElevatedGridChange,
  onVisualSettingsChange,
  onRendererSettingsChange,
  onTokenScaleSettingsChange,
  onTokenElevationSettingsChange,
  onDrawSteelMovementTypeAnimationsChange,
  onDrawSteelHandleMovementModesChange,
  onShowElevationRegionsChange
} = {}) {
  game.settings.register(MODULE_ID, SETTINGS.WORLD_DEFAULTS_VERSION, {
    scope: "world", config: false, type: String, default: ""
  });

  game.settings.register(MODULE_ID, SETTINGS.CLIENT_ENABLED, {
    name: "SCENE_ELEVATION.Settings.ClientEnabled",
    hint: "SCENE_ELEVATION.Settings.ClientEnabledHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: enabled => onClientEnabledChange?.(enabled)
  });
  try { setSceneElevationClientEnabled(game.settings.get(MODULE_ID, SETTINGS.CLIENT_ENABLED)); }
  catch (err) { setSceneElevationClientEnabled(true); }

  game.settings.register(MODULE_ID, SETTINGS.SHOW_ELEVATED_GRID, {
    name: "SCENE_ELEVATION.Settings.ShowElevatedGrid",
    hint: "SCENE_ELEVATION.Settings.ShowElevatedGridHint",
    scope: "client",
    config: true,
    type: String,
    default: ELEVATED_GRID_MODES.OVERRIDE_SCENE_GRID,
    choices: ELEVATED_GRID_CHOICES,
    onChange: () => onElevatedGridChange?.()
  });

  if (resetDefaultsDialogClass) {
    game.settings.registerMenu(MODULE_ID, "resetDefaults", {
      name: "SCENE_ELEVATION.Settings.ResetDefaults",
      label: "SCENE_ELEVATION.Settings.ResetDefaultsLabel",
      hint: "SCENE_ELEVATION.Settings.ResetDefaultsHint",
      icon: "fa-solid fa-rotate-left",
      type: resetDefaultsDialogClass,
      restricted: true
    });
  }

  _registerWorldChoice(SETTINGS.PARALLAX, "SCENE_ELEVATION.Settings.Parallax", "SCENE_ELEVATION.Settings.ParallaxHint", WORLD_SETTING_CHOICES[SETTINGS.PARALLAX], onVisualSettingsChange);
  _registerWorldChoice(SETTINGS.PARALLAX_HEIGHT_CONTRAST, "SCENE_ELEVATION.Settings.ParallaxHeightContrast", "SCENE_ELEVATION.Settings.ParallaxHeightContrastHint", WORLD_SETTING_CHOICES[SETTINGS.PARALLAX_HEIGHT_CONTRAST], onVisualSettingsChange);
  _registerWorldChoice(SETTINGS.PARALLAX_MODE, "SCENE_ELEVATION.Settings.ParallaxMode", "SCENE_ELEVATION.Settings.ParallaxModeHint", WORLD_SETTING_CHOICES[SETTINGS.PARALLAX_MODE], onVisualSettingsChange);
  _registerWorldChoice(SETTINGS.PERSPECTIVE_POINT, "SCENE_ELEVATION.Settings.PerspectivePoint", "SCENE_ELEVATION.Settings.PerspectivePointHint", WORLD_SETTING_CHOICES[SETTINGS.PERSPECTIVE_POINT], onVisualSettingsChange);
  _registerWorldChoice(SETTINGS.BLEND_MODE, "SCENE_ELEVATION.Settings.TransitionMode", "SCENE_ELEVATION.Settings.TransitionModeHint", WORLD_SETTING_CHOICES[SETTINGS.BLEND_MODE], onVisualSettingsChange);
  _registerWorldNumber(SETTINGS.EDGE_STRETCH_PERCENT, "SCENE_ELEVATION.Settings.EdgeStretchPercent", "SCENE_ELEVATION.Settings.EdgeStretchPercentHint", EDGE_STRETCH_LIMITS, onRendererSettingsChange);
  _registerWorldChoice(SETTINGS.OVERLAY_SCALE, "SCENE_ELEVATION.Settings.OverlayScale", "SCENE_ELEVATION.Settings.OverlayScaleHint", WORLD_SETTING_CHOICES[SETTINGS.OVERLAY_SCALE], onVisualSettingsChange);
  _registerWorldChoice(SETTINGS.SHADOW_MODE, "SCENE_ELEVATION.Settings.ShadowMode", "SCENE_ELEVATION.Settings.ShadowModeHint", WORLD_SETTING_CHOICES[SETTINGS.SHADOW_MODE], onVisualSettingsChange);
  _registerWorldChoice(SETTINGS.SHADOW_LENGTH, "SCENE_ELEVATION.Settings.ShadowLength", "SCENE_ELEVATION.Settings.ShadowLengthHint", WORLD_SETTING_CHOICES[SETTINGS.SHADOW_LENGTH], onRendererSettingsChange);
  _registerWorldChoice(SETTINGS.DEPTH_SCALE, "SCENE_ELEVATION.Settings.DepthScale", "SCENE_ELEVATION.Settings.DepthScaleHint", WORLD_SETTING_CHOICES[SETTINGS.DEPTH_SCALE], onVisualSettingsChange);
  _registerWorldNumber(SETTINGS.ELEVATION_SCALE, "SCENE_ELEVATION.Settings.ElevationScale", "SCENE_ELEVATION.Settings.ElevationScaleHint", ELEVATION_SCALE_LIMITS, onVisualSettingsChange);

  game.settings.register(MODULE_ID, SETTINGS.TOKEN_SCALE_ENABLED, {
    name: "SCENE_ELEVATION.Settings.TokenScale",
    hint: "SCENE_ELEVATION.Settings.TokenScaleHint",
    scope: "world", config: true, type: Boolean, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.TOKEN_SCALE_ENABLED],
    onChange: () => _handleSceneSettingsChange(onTokenScaleSettingsChange)
  });
  _registerWorldChoice(SETTINGS.TOKEN_SCALING_MODE, "SCENE_ELEVATION.Settings.TokenScalingMode", "SCENE_ELEVATION.Settings.TokenScalingModeHint", WORLD_SETTING_CHOICES[SETTINGS.TOKEN_SCALING_MODE], onTokenScaleSettingsChange);
  _registerWorldChoice(SETTINGS.TOKEN_ELEVATION_MODE, "SCENE_ELEVATION.Settings.TokenElevationMode", "SCENE_ELEVATION.Settings.TokenElevationModeHint", WORLD_SETTING_CHOICES[SETTINGS.TOKEN_ELEVATION_MODE], onTokenElevationSettingsChange);
  game.settings.register(MODULE_ID, SETTINGS.TOKEN_ELEVATION_ANIMATION_MS, {
    name: "SCENE_ELEVATION.Settings.TokenElevationAnimationMs",
    hint: "SCENE_ELEVATION.Settings.TokenElevationAnimationMsHint",
    scope: "world", config: true, type: Number, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.TOKEN_ELEVATION_ANIMATION_MS],
    onChange: () => _handleSceneSettingsChange()
  });
  game.settings.register(MODULE_ID, SETTINGS.TOKEN_SCALE_MAX, {
    name: "SCENE_ELEVATION.Settings.TokenScaleMax",
    hint: "SCENE_ELEVATION.Settings.TokenScaleMaxHint",
    scope: "world", config: true, type: Number, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.TOKEN_SCALE_MAX],
    onChange: () => _handleSceneSettingsChange(onTokenScaleSettingsChange)
  });
  game.settings.register(MODULE_ID, SETTINGS.TOKEN_SCALE_PER_ELEVATION, {
    name: "SCENE_ELEVATION.Settings.TokenScalePerElevation",
    hint: "SCENE_ELEVATION.Settings.TokenScalePerElevationHint",
    scope: "world", config: true, type: Number, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.TOKEN_SCALE_PER_ELEVATION],
    range: { min: TOKEN_SCALE_PER_ELEVATION_LIMITS.MIN, max: TOKEN_SCALE_PER_ELEVATION_LIMITS.MAX, step: TOKEN_SCALE_PER_ELEVATION_LIMITS.STEP },
    onChange: () => _handleSceneSettingsChange(onTokenScaleSettingsChange)
  });
  if (game.system?.id === "draw-steel") {
    game.settings.register(MODULE_ID, SETTINGS.DRAW_STEEL_MOVEMENT_TYPE_ANIMATIONS, {
      name: "SCENE_ELEVATION.Settings.DrawSteelMovementTypeAnimations",
      hint: "SCENE_ELEVATION.Settings.DrawSteelMovementTypeAnimationsHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: () => onDrawSteelMovementTypeAnimationsChange?.()
    });
    game.settings.register(MODULE_ID, SETTINGS.DRAW_STEEL_HANDLE_MOVEMENT_MODES, {
      name: "SCENE_ELEVATION.Settings.DrawSteelHandleMovementModes",
      hint: "SCENE_ELEVATION.Settings.DrawSteelHandleMovementModesHint",
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      onChange: () => onDrawSteelHandleMovementModesChange?.()
    });
  }
  game.settings.register(MODULE_ID, SETTINGS.SHOW_ELEVATION_REGIONS, {
    scope: "client", config: false, type: Boolean, default: false,
    onChange: () => onShowElevationRegionsChange?.()
  });
}

function _registerWorldChoice(key, name, hint, choices, onChange) {
  game.settings.register(MODULE_ID, key, {
    name,
    hint,
    scope: "world",
    config: true,
    type: String,
    default: ELEVATION_DEFAULT_SETTINGS[key],
    choices,
    onChange: () => _handleSceneSettingsChange(onChange)
  });
}

function _registerWorldNumber(key, name, hint, limits, onChange) {
  game.settings.register(MODULE_ID, key, {
    name,
    hint,
    scope: "world",
    config: true,
    type: Number,
    default: ELEVATION_DEFAULT_SETTINGS[key],
    range: { min: limits.MIN, max: limits.MAX, step: limits.STEP },
    onChange: () => _handleSceneSettingsChange(onChange)
  });
}

function _handleSceneSettingsChange(onChange = null) {
  invalidateSceneElevationSettingsCache();
  onChange?.();
}