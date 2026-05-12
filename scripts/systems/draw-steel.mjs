const DRAW_STEEL_SYSTEM_ID = "draw-steel";
const MOVEMENT_MODES = Object.freeze({ FLY: "fly", BURROW: "burrow" });
const ELEVATION_EPSILON = 0.001;

export const DrawSteelSystemAdapter = Object.freeze({
  systemId: DRAW_STEEL_SYSTEM_ID,

  adjustTokenElevationTarget({ tokenDocument, current, target }) {
    const mode = _drawSteelMovementMode(tokenDocument);
    if (mode === MOVEMENT_MODES.FLY && target < current - ELEVATION_EPSILON) return current;
    if (mode === MOVEMENT_MODES.BURROW && target > current + ELEVATION_EPSILON) return current;
    return target;
  },

  getTokenVisualState(tokenDocument) {
    const mode = _drawSteelMovementMode(tokenDocument);
    const elevation = Number(tokenDocument?.elevation ?? 0);
    return {
      flying: mode === MOVEMENT_MODES.FLY,
      burrowing: mode === MOVEMENT_MODES.BURROW && Number.isFinite(elevation) && elevation < -ELEVATION_EPSILON,
      forceSurfaceVisibility: mode === MOVEMENT_MODES.BURROW && Number.isFinite(elevation) && elevation < -ELEVATION_EPSILON
    };
  },

  getTokenScalingElevation(tokenDocument) {
    if (_drawSteelMovementMode(tokenDocument) !== MOVEMENT_MODES.FLY) return null;
    const elevation = Number(tokenDocument?.elevation ?? 0);
    return Number.isFinite(elevation) ? elevation : null;
  }
});

function _drawSteelMovementMode(tokenDocument) {
  const action = String(tokenDocument?.movementAction ?? "");
  if (action === MOVEMENT_MODES.FLY) return MOVEMENT_MODES.FLY;
  if (action === MOVEMENT_MODES.BURROW) return MOVEMENT_MODES.BURROW;
  return "";
}
