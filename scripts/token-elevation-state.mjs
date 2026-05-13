import {
  MODULE_ID,
  SCENE_SETTING_KEYS,
  TOKEN_ELEVATION_MODES,
  TOKEN_SCALING_MODES,
  getSceneElevationSettingsSnapshot,
  tokenScalePerElevationValue,
  tokenScalingModeValue
} from "./config.mjs";
import {
  getActiveElevationRegions,
  getRegionElevationStateAtPoint,
  regionContainsPoint
} from "./region-elevation-renderer.mjs";
import { tokenBoundsIntersectEntries, tokenElevationSamplePoints } from "./token-spatial-utils.mjs";

export function tokenElevationState(tokenDocument, options = {}, position = {}, entries = null) {
  const activeEntries = entries ?? getActiveElevationRegions(canvas.scene);
  if (!activeEntries.length || !tokenBoundsIntersectEntries(tokenDocument, position, activeEntries)) return { found: false, elevation: 0, entry: null };
  const points = tokenElevationSamplePoints(tokenDocument, position);
  let best = getRegionElevationStateAtPoint(points[0], canvas.scene, activeEntries, options);
  if (best.found && !options.preferHighest) return best;
  for (const point of points.slice(1)) {
    const state = getRegionElevationStateAtPoint(point, canvas.scene, activeEntries, options);
    if (!state.found) continue;
    if (!best.found || tokenElevationStatePreferred(state, best, options)) best = state;
  }
  return best;
}

export function tokenElevationStatePreferred(state, best, options = {}) {
  if (options.preferHighest) return state.elevation > best.elevation;
  const stateArea = state.entry?.area ?? Infinity;
  const bestArea = best.entry?.area ?? Infinity;
  return stateArea < bestArea || (stateArea === bestArea && state.elevation > best.elevation);
}

export function highestTokenElevationState(tokenDocument, position = {}, { enabled = true, settings = null } = {}) {
  if (!enabled) return { skip: true, found: false, elevation: 0, entry: null };
  const sceneSettings = settings ?? getSceneElevationSettingsSnapshot(canvas?.scene);
  const mode = sceneSettings[SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE] ?? TOKEN_ELEVATION_MODES.PER_REGION;
  switch (mode) {
    case TOKEN_ELEVATION_MODES.NEVER:
      return { skip: true, found: false, elevation: 0, entry: null };
    case TOKEN_ELEVATION_MODES.ALWAYS:
      return tokenElevationState(tokenDocument, { preferHighest: true, allowOverheadSupport: true }, position);
    case TOKEN_ELEVATION_MODES.PER_REGION:
    default:
      return tokenElevationState(tokenDocument, { requireTokenElevation: true, preferHighest: true, allowOverheadSupport: true }, position);
  }
}

export function tokenStillWithinMovementStartRegion(tokenDocument, position, startState) {
  const region = startState?.entry?.region;
  if (!region) return false;
  return tokenElevationSamplePoints(tokenDocument, position).some(point => regionContainsPoint(region, point, startState.elevation));
}

export function tokenScaleFactor(token, baseTokenScale = 1, { entries = null, systemScalingElevation = null, settings = null } = {}) {
  if (!game.modules.get(MODULE_ID)?.active) return 1;
  if (!canvas?.scene || !token?.document) return 1;
  const sceneSettings = settings ?? getSceneElevationSettingsSnapshot(canvas.scene);
  if (!sceneSettings[SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED]) return 1;
  const activeEntries = entries ?? getActiveElevationRegions(canvas.scene);
  const state = tokenScaleElevationState(token, activeEntries, systemScalingElevation);
  if (!state.found) return 1;
  const mode = tokenScalingModeValue(sceneSettings[SCENE_SETTING_KEYS.TOKEN_SCALING_MODE]);
  if (mode === TOKEN_SCALING_MODES.SCALE_PER_ELEVATION) {
    const elevation = Number(state.elevation ?? 0);
    if (!Number.isFinite(elevation)) return 1;
    const perElevation = tokenScalePerElevationValue(sceneSettings[SCENE_SETTING_KEYS.TOKEN_SCALE_PER_ELEVATION]);
    const base = Math.max(0.001, Math.abs(Number(baseTokenScale ?? 1)) || 1);
    const targetScale = Math.max(0.05, base + elevation * perElevation);
    return targetScale / base;
  }
  const maxSetting = Number(sceneSettings[SCENE_SETTING_KEYS.TOKEN_SCALE_MAX] ?? 1.5);
  const max = Math.max(1, Number.isFinite(maxSetting) ? maxSetting : 1.5);
  const range = tokenScalingElevationRange(activeEntries);
  if (state.entry?.overhead) {
    range.lowest = Math.min(range.lowest, Number(state.elevation ?? 0));
    range.highest = Math.max(range.highest, Number(state.elevation ?? 0));
  }
  if (state.systemScaling) {
    range.lowest = Math.min(range.lowest, Number(state.elevation ?? 0));
    range.highest = Math.max(range.highest, Number(state.elevation ?? 0));
  }
  const normalized = normalizedTokenScaleElevation(state.elevation, range);
  const factor = normalized >= 0
    ? 1 + normalized * (max - 1)
    : 1 + normalized * (1 - (1 / max));
  return Math.clamp(factor, 1 / max, max);
}

export function tokenScaleElevationState(token, entries, systemScalingElevation = null) {
  const state = tokenElevationState(token.document, { requireTokenScaling: true, allowOverheadSupport: true }, {}, entries);
  const elevation = Number(systemScalingElevation);
  if (!Number.isFinite(elevation) || Math.abs(elevation) <= 0.001) return state;
  const systemState = { found: true, elevation, entry: state.entry ?? null, systemScaling: true };
  if (!state.found) return systemState;
  return elevation > Number(state.elevation ?? 0) ? systemState : state;
}

export function normalizedTokenScaleElevation(elevation, range) {
  const value = Number(elevation ?? 0);
  if (!Number.isFinite(value) || Math.abs(value) <= 0.001) return 0;
  if (value > 0) {
    const highest = Math.max(0, Number(range?.highest ?? 0));
    return highest > 0 ? Math.clamp(value / highest, 0, 1) : 0;
  }
  const lowest = Math.min(0, Number(range?.lowest ?? 0));
  return lowest < 0 ? -Math.clamp(Math.abs(value) / Math.abs(lowest), 0, 1) : 0;
}

export function tokenScalingElevationRange(sceneOrEntries = canvas?.scene) {
  const entries = (Array.isArray(sceneOrEntries) ? sceneOrEntries : getActiveElevationRegions(sceneOrEntries))
    .filter(entry => entry.modifyTokenScaling !== false);
  let lowest = 0;
  let highest = 0;
  for (const entry of entries) {
    lowest = Math.min(lowest, Number(entry.lowestElevation ?? entry.elevation ?? 0));
    highest = Math.max(highest, Number(entry.highestElevation ?? entry.elevation ?? 0));
  }
  return { lowest, highest };
}
