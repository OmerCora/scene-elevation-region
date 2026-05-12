import { MODULE_ID, SETTINGS } from "../config.mjs";
import { DrawSteelSystemAdapter } from "./draw-steel.mjs";

const SYSTEM_ADAPTERS = Object.freeze([
  DrawSteelSystemAdapter
]);

function _activeSystemAdapter() {
  const systemId = game?.system?.id;
  return SYSTEM_ADAPTERS.find(adapter => adapter.systemId === systemId) ?? null;
}

export function adjustSystemTokenElevationTarget(context) {
  const adapter = _activeSystemAdapter();
  if (adapter?.systemId === "draw-steel" && !_settingEnabled(SETTINGS.DRAW_STEEL_HANDLE_MOVEMENT_MODES)) return context.target;
  return adapter?.adjustTokenElevationTarget?.(context) ?? context.target;
}

export function getSystemTokenVisualState(tokenDocument) {
  const adapter = _activeSystemAdapter();
  if (adapter?.systemId === "draw-steel" && !_settingEnabled(SETTINGS.DRAW_STEEL_MOVEMENT_TYPE_ANIMATIONS)) return null;
  return adapter?.getTokenVisualState?.(tokenDocument) ?? null;
}

export function getSystemTokenScalingElevation(tokenDocument) {
  const adapter = _activeSystemAdapter();
  if (adapter?.systemId === "draw-steel" && !_settingEnabled(SETTINGS.DRAW_STEEL_HANDLE_MOVEMENT_MODES)) return null;
  const elevation = Number(adapter?.getTokenScalingElevation?.(tokenDocument));
  return Number.isFinite(elevation) ? elevation : null;
}

function _settingEnabled(key) {
  try { return game.settings.get(MODULE_ID, key) !== false; }
  catch (err) { return true; }
}
