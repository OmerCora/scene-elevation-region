export class TokenVisualStateKey {
  static ORDER = Object.freeze([
    "x",
    "y",
    "elevation",
    "width",
    "height",
    "visualParamsVersion",
    "tokenScaleEnabled",
    "tokenScalingMode",
    "tokenScaleMax",
    "tokenScalePerElevation",
    "tokenTextureScale",
    "systemScalingElevation",
    "movementPending",
    "movementAction"
  ]);

  static from({
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
    return new this({
      x: tokenDocument?.x ?? 0,
      y: tokenDocument?.y ?? 0,
      elevation: tokenDocument?.elevation ?? 0,
      width: tokenDocument?.width ?? 1,
      height: tokenDocument?.height ?? 1,
      visualParamsVersion,
      tokenScaleEnabled: tokenScaleEnabled ? 1 : 0,
      tokenScalingMode,
      tokenScaleMax: Number.isFinite(tokenScaleMax) ? tokenScaleMax : 1.5,
      tokenScalePerElevation,
      tokenTextureScale,
      systemScalingElevation: systemScalingElevation ?? "",
      movementPending: movementPending ? 1 : 0,
      movementAction: tokenDocument?.movementAction ?? ""
    });
  }

  constructor(fields = {}) {
    this.fields = Object.freeze({ ...fields });
  }

  toString() {
    return TokenVisualStateKey.ORDER.map(key => this.fields[key] ?? "").join("|");
  }

  diagnostic() {
    return { ...this.fields };
  }
}

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
  return TokenVisualStateKey.from({
    tokenDocument,
    visualParamsVersion,
    tokenScaleEnabled,
    tokenScalingMode,
    tokenScaleMax,
    tokenScalePerElevation,
    tokenTextureScale,
    systemScalingElevation,
    movementPending
  }).toString();
}