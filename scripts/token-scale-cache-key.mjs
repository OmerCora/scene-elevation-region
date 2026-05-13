export function buildTokenScaleCacheKey({
  forceScale = false,
  tokenDocument = null,
  visualParamsVersion = 0,
  tokenScaleEnabled = false,
  tokenScalingMode = "",
  tokenScaleMax = 1.5,
  tokenScalePerElevation = 0,
  tokenTextureScale = 1,
  systemScalingElevation = null,
  movementPending = false
} = {}) {
  if (forceScale) return null;
  return [
    tokenDocument?.x ?? 0,
    tokenDocument?.y ?? 0,
    tokenDocument?.elevation ?? 0,
    tokenDocument?.width ?? 1,
    tokenDocument?.height ?? 1,
    visualParamsVersion,
    tokenScaleEnabled ? 1 : 0,
    tokenScalingMode,
    Number.isFinite(tokenScaleMax) ? tokenScaleMax : 1.5,
    tokenScalePerElevation,
    tokenTextureScale,
    systemScalingElevation ?? "",
    movementPending ? 1 : 0,
    tokenDocument?.movementAction ?? ""
  ].join("|");
}