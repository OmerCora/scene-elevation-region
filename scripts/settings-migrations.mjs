import {
  MODULE_ID,
  SETTINGS,
  ELEVATION_DEFAULT_SETTINGS,
  ELEVATION_PRESET_SETTING_KEYS,
  parallaxHeightContrastKey,
  shadowLengthKey
} from "./config.mjs";

const MOUSE_DRIFT_WORLD_DEFAULTS_VERSION = "mouse-drift-defaults-v2";

export async function migrateSceneElevationSettings() {
  await _migrateParallaxHeightContrastSetting();
  await _migrateShadowLengthSetting();
  await _migrateMouseDriftWorldDefaults();
}

async function _migrateParallaxHeightContrastSetting() {
  if (!game.user?.isGM) return;
  const current = game.settings.get(MODULE_ID, SETTINGS.PARALLAX_HEIGHT_CONTRAST);
  const key = parallaxHeightContrastKey(current);
  if (current !== key) await game.settings.set(MODULE_ID, SETTINGS.PARALLAX_HEIGHT_CONTRAST, key);
}

async function _migrateShadowLengthSetting() {
  if (!game.user?.isGM) return;
  const current = game.settings.get(MODULE_ID, SETTINGS.SHADOW_LENGTH);
  const key = shadowLengthKey(current);
  if (current !== key) await game.settings.set(MODULE_ID, SETTINGS.SHADOW_LENGTH, key);
}

async function _migrateMouseDriftWorldDefaults() {
  if (!game.user?.isGM) return;
  if (game.settings.get(MODULE_ID, SETTINGS.WORLD_DEFAULTS_VERSION) === MOUSE_DRIFT_WORLD_DEFAULTS_VERSION) return;
  await Promise.all(ELEVATION_PRESET_SETTING_KEYS
    .filter(key => game.settings.get(MODULE_ID, key) !== ELEVATION_DEFAULT_SETTINGS[key])
    .map(key => game.settings.set(MODULE_ID, key, ELEVATION_DEFAULT_SETTINGS[key])));
  await game.settings.set(MODULE_ID, SETTINGS.WORLD_DEFAULTS_VERSION, MOUSE_DRIFT_WORLD_DEFAULTS_VERSION);
}