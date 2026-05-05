import { MODULE_ID, SETTINGS, PARALLAX_STRENGTHS, PARALLAX_MODES, PERSPECTIVE_POINTS, SHADOW_MODES, BLEND_MODES, REGION_BEHAVIOR_TYPE } from "./config.mjs";
import { ElevationAuthoringLayer, registerElevationControls } from "./elevation-controls.mjs";
import { ElevationRegionBehavior, registerRegionHooks } from "./region-behavior.mjs";
import {
  RegionElevationRenderer,
  getRegionElevationAtPoint,
  getRegionElevationStateAtPoint,
  getActiveElevationRegions
} from "./region-elevation-renderer.mjs";

const TOKEN_SCALE_FALLBACK_STRENGTH = 0.055;
const _syncingTokenElevation = new Set();

/* -------------------------------------------- */
/*  Init                                         */
/* -------------------------------------------- */

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, SETTINGS.PARALLAX, {
    name: "SCENE_ELEVATION.Settings.Parallax",
    hint: "SCENE_ELEVATION.Settings.ParallaxHint",
    scope: "world", config: true, type: String, default: "off",
    choices: {
      off: "SCENE_ELEVATION.Settings.ParallaxOff",
      verySubtle: "SCENE_ELEVATION.Settings.ParallaxVerySubtle",
      subtle: "SCENE_ELEVATION.Settings.ParallaxSubtle",
      medium: "SCENE_ELEVATION.Settings.ParallaxMedium",
      strong: "SCENE_ELEVATION.Settings.ParallaxStrong"
    },
    onChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.PARALLAX_MODE, {
    name: "SCENE_ELEVATION.Settings.ParallaxMode",
    hint: "SCENE_ELEVATION.Settings.ParallaxModeHint",
    scope: "world", config: true, type: String, default: PARALLAX_MODES.CARD,
    choices: {
      [PARALLAX_MODES.SLOPE_ONLY]: "SCENE_ELEVATION.Settings.ParallaxModeSlopeOnly",
      [PARALLAX_MODES.HYBRID]: "SCENE_ELEVATION.Settings.ParallaxModeHybrid",
      [PARALLAX_MODES.ANCHORED]: "SCENE_ELEVATION.Settings.ParallaxModeAnchored",
      [PARALLAX_MODES.EDGE_BLEND]: "SCENE_ELEVATION.Settings.ParallaxModeEdgeBlend",
      [PARALLAX_MODES.CARD]: "SCENE_ELEVATION.Settings.ParallaxModeCard",
      [PARALLAX_MODES.SHADOW]: "SCENE_ELEVATION.Settings.ParallaxModeShadow"
    },
    onChange: () => RegionElevationRenderer.instance.update()
  });
  game.settings.register(MODULE_ID, SETTINGS.PERSPECTIVE_POINT, {
    name: "SCENE_ELEVATION.Settings.PerspectivePoint",
    hint: "SCENE_ELEVATION.Settings.PerspectivePointHint",
    scope: "world", config: true, type: String, default: PERSPECTIVE_POINTS.CENTER,
    choices: {
      [PERSPECTIVE_POINTS.CENTER]: "SCENE_ELEVATION.Settings.PerspectivePointCenter",
      [PERSPECTIVE_POINTS.TOP_LEFT]: "SCENE_ELEVATION.Settings.PerspectivePointTopLeft",
      [PERSPECTIVE_POINTS.TOP_RIGHT]: "SCENE_ELEVATION.Settings.PerspectivePointTopRight",
      [PERSPECTIVE_POINTS.BOTTOM_LEFT]: "SCENE_ELEVATION.Settings.PerspectivePointBottomLeft",
      [PERSPECTIVE_POINTS.BOTTOM_RIGHT]: "SCENE_ELEVATION.Settings.PerspectivePointBottomRight",
      [PERSPECTIVE_POINTS.REGION_CENTER]: "SCENE_ELEVATION.Settings.PerspectivePointRegionCenter",
      [PERSPECTIVE_POINTS.REGION_TOP_LEFT]: "SCENE_ELEVATION.Settings.PerspectivePointRegionTopLeft",
      [PERSPECTIVE_POINTS.REGION_TOP_RIGHT]: "SCENE_ELEVATION.Settings.PerspectivePointRegionTopRight",
      [PERSPECTIVE_POINTS.REGION_BOTTOM_LEFT]: "SCENE_ELEVATION.Settings.PerspectivePointRegionBottomLeft",
      [PERSPECTIVE_POINTS.REGION_BOTTOM_RIGHT]: "SCENE_ELEVATION.Settings.PerspectivePointRegionBottomRight"
    },
    onChange: () => RegionElevationRenderer.instance.update()
  });
  game.settings.register(MODULE_ID, SETTINGS.BLEND_MODE, {
    name: "SCENE_ELEVATION.Settings.TransitionMode",
    hint: "SCENE_ELEVATION.Settings.TransitionModeHint",
    scope: "world", config: true, type: String, default: BLEND_MODES.SLOPE,
    choices: {
      [BLEND_MODES.OFF]: "SCENE_ELEVATION.Settings.BlendModeOff",
      [BLEND_MODES.SOFT]: "SCENE_ELEVATION.Settings.BlendModeSoft",
      [BLEND_MODES.WIDE]: "SCENE_ELEVATION.Settings.BlendModeWide",
      [BLEND_MODES.DEPTH_LIP]: "SCENE_ELEVATION.Settings.BlendModeDepthLip",
      [BLEND_MODES.SLOPE]: "SCENE_ELEVATION.Settings.BlendModeSlope",
      [BLEND_MODES.Z_BRIDGE]: "SCENE_ELEVATION.Settings.BlendModeZBridge"
    },
    onChange: () => RegionElevationRenderer.instance.update()
  });
  game.settings.register(MODULE_ID, SETTINGS.OVERLAY_SCALE, {
    name: "SCENE_ELEVATION.Settings.OverlayScale",
    hint: "SCENE_ELEVATION.Settings.OverlayScaleHint",
    scope: "world", config: true, type: String, default: "off",
    choices: {
      off: "SCENE_ELEVATION.Settings.OverlayScaleOff",
      subtle: "SCENE_ELEVATION.Settings.OverlayScaleSubtle",
      medium: "SCENE_ELEVATION.Settings.OverlayScaleMedium",
      strong: "SCENE_ELEVATION.Settings.OverlayScaleStrong"
    },
    onChange: () => RegionElevationRenderer.instance.update()
  });
  game.settings.register(MODULE_ID, SETTINGS.SHADOW_MODE, {
    name: "SCENE_ELEVATION.Settings.ShadowMode",
    hint: "SCENE_ELEVATION.Settings.ShadowModeHint",
    scope: "world", config: true, type: String, default: SHADOW_MODES.TOP_DOWN,
    choices: {
      [SHADOW_MODES.RESPONSIVE]: "SCENE_ELEVATION.Settings.ShadowModeResponsive",
      [SHADOW_MODES.FIXED_VISIBLE]: "SCENE_ELEVATION.Settings.ShadowModeFixedVisible",
      [SHADOW_MODES.TOP_DOWN]: "SCENE_ELEVATION.Settings.ShadowModeTopDown"
    },
    onChange: () => RegionElevationRenderer.instance.update()
  });
  game.settings.register(MODULE_ID, SETTINGS.TOKEN_SCALE_ENABLED, {
    name: "SCENE_ELEVATION.Settings.TokenScale",
    hint: "SCENE_ELEVATION.Settings.TokenScaleHint",
    scope: "world", config: true, type: Boolean, default: true,
    onChange: () => _refreshAllTokenScales()
  });
  game.settings.register(MODULE_ID, SETTINGS.TOKEN_SCALE_MAX, {
    name: "SCENE_ELEVATION.Settings.TokenScaleMax",
    hint: "SCENE_ELEVATION.Settings.TokenScaleMaxHint",
    scope: "world", config: true, type: Number, default: 1.5,
    onChange: () => _refreshAllTokenScales()
  });
  game.settings.register(MODULE_ID, SETTINGS.SHOW_ELEVATION_REGIONS, {
    scope: "client", config: false, type: Boolean, default: false,
    onChange: () => canvas?.[ElevationAuthoringLayer.LAYER_NAME]?.refreshElevationRegionVisibility()
  });

  CONFIG.Canvas.layers[ElevationAuthoringLayer.LAYER_NAME] = {
    layerClass: ElevationAuthoringLayer,
    group: "interface"
  };

  Object.assign(CONFIG.RegionBehavior.dataModels, {
    [REGION_BEHAVIOR_TYPE]: ElevationRegionBehavior
  });
  CONFIG.RegionBehavior.typeIcons[REGION_BEHAVIOR_TYPE] = "fa-solid fa-mountain";

  const invalidate = () => {
    if (!canvas?.scene) return;
    RegionElevationRenderer.instance.update();
    void _refreshAllTokenElevations();
    _refreshAllTokenScales();
  };
  registerRegionHooks(invalidate);
  registerElevationControls();

  const mod = game.modules.get(MODULE_ID);
  if (mod) mod.api = {
    ElevationAuthoringLayer,
    ElevationRegionBehavior,
    RegionElevationRenderer,
    getRegionElevationAtPoint,
    getRegionElevationStateAtPoint,
    getActiveElevationRegions
  };
  else console.error(`[${MODULE_ID}] Module not registered — manifest id likely doesn't match install folder.`);
});

/* -------------------------------------------- */
/*  Canvas lifecycle                             */
/* -------------------------------------------- */

Hooks.on("canvasReady", async () => {
  RegionElevationRenderer.instance.attach(canvas.scene);
  await _refreshAllTokenElevations();
  _refreshAllTokenScales();
});

Hooks.on("canvasTearDown", () => {
  RegionElevationRenderer.instance.detach();
});

Hooks.on("canvasPan", () => {
  RegionElevationRenderer.instance.onPan();
});

Hooks.on("updateScene", (scene, change) => {
  if (scene !== canvas.scene) return;
  if (!foundry.utils.hasProperty(change, "dimensions") && !foundry.utils.hasProperty(change, "grid")) return;
  RegionElevationRenderer.instance.update();
  void _refreshAllTokenElevations();
  _refreshAllTokenScales();
});

/* -------------------------------------------- */
/*  Token elevation scaling                      */
/* -------------------------------------------- */

function _tokenScaleFactor(token) {
  if (!game.modules.get(MODULE_ID)?.active) return 1;
  if (!game.settings.get(MODULE_ID, SETTINGS.TOKEN_SCALE_ENABLED)) return 1;
  if (!canvas?.scene || !token?.document) return 1;
  const state = _tokenElevationState(token.document, { requireTokenScaling: true });
  if (!state.found) return 1;
  const strengthKey = game.settings.get(MODULE_ID, SETTINGS.PARALLAX) ?? "off";
  const parallax = PARALLAX_STRENGTHS[strengthKey] ?? PARALLAX_STRENGTHS.off;
  const max = game.settings.get(MODULE_ID, SETTINGS.TOKEN_SCALE_MAX) ?? 1.5;
  const tokenScaleStrength = parallax > 0 ? parallax * 0.65 : TOKEN_SCALE_FALLBACK_STRENGTH;
  const factor = 1 + state.elevation * tokenScaleStrength;
  return Math.clamp(factor, 1 / max, max);
}

function _tokenElevationState(tokenDocument, options = {}, position = {}) {
  const gridSize = canvas.grid.size ?? 100;
  const x = Number(position.x ?? tokenDocument.x ?? 0);
  const y = Number(position.y ?? tokenDocument.y ?? 0);
  const width = Number(position.width ?? tokenDocument.width ?? 1);
  const height = Number(position.height ?? tokenDocument.height ?? 1);
  const cx = x + (width * gridSize) / 2;
  const cy = y + (height * gridSize) / 2;
  return getRegionElevationStateAtPoint({ x: cx, y: cy }, canvas.scene, null, options);
}

function _applyTokenScale(token) {
  if (!token?.mesh) return;
  try {
    // Cache the engine-set base scale once, then drive absolute scale =
    // base * factor. This avoids the previous bug where successive refreshes
    // multiplied the scale unboundedly.
    const m = token.mesh;
    if (!game.settings.get(MODULE_ID, SETTINGS.TOKEN_SCALE_ENABLED)) {
      if (m._seBaseScaleX !== undefined) m.scale.set(m._seBaseScaleX, m._seBaseScaleY);
      m._seLastFactor = 1;
      return;
    }
    if (m._seBaseScaleX === undefined) {
      m._seBaseScaleX = m.scale.x;
      m._seBaseScaleY = m.scale.y;
    } else {
      // If Foundry just rewrote the scale (e.g. token resize / mirror toggle),
      // re-cache by comparing to the previously applied product.
      if (m._seLastFactor && Math.abs(m.scale.x - m._seBaseScaleX * m._seLastFactor) > 1e-4) {
        m._seBaseScaleX = m.scale.x;
        m._seBaseScaleY = m.scale.y;
      }
    }
    const factor = _tokenScaleFactor(token);
    m._seLastFactor = factor;
    const sgnX = Math.sign(m._seBaseScaleX) || 1;
    const sgnY = Math.sign(m._seBaseScaleY) || 1;
    m.scale.set(
      Math.abs(m._seBaseScaleX) * factor * sgnX,
      Math.abs(m._seBaseScaleY) * factor * sgnY
    );
  } catch (err) {
    // Silent — drawToken can fire before our module/canvas is fully initialised.
  }
}

function _refreshAllTokenScales() {
  if (!canvas?.tokens) return;
  for (const t of canvas.tokens.placeables) _applyTokenScale(t);
}

async function _syncTokenElevation(tokenDocument) {
  if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return;
  const uuid = tokenDocument.uuid ?? tokenDocument.id;
  if (_syncingTokenElevation.has(uuid)) return;

  const state = _tokenElevationState(tokenDocument, { requireTokenElevation: true });
  const current = Number(tokenDocument.elevation ?? 0);
  const target = state.found ? state.elevation : 0;

  const update = {};
  if (Math.abs(current - target) > 0.001) update.elevation = target;

  if (!Object.keys(update).length) return;
  _syncingTokenElevation.add(uuid);
  try {
    await tokenDocument.update(update, { animation: { duration: 0 } });
  } finally {
    _syncingTokenElevation.delete(uuid);
  }
}

async function _refreshAllTokenElevations() {
  if (!canvas?.tokens) return;
  await Promise.all(canvas.tokens.placeables.map(token => _syncTokenElevation(token.document)));
}

function _applyElevationToMovementUpdate(tokenDocument, change) {
  if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return;
  if (!foundry.utils.hasProperty(change, "x") && !foundry.utils.hasProperty(change, "y")) return;
  const uuid = tokenDocument.uuid ?? tokenDocument.id;
  if (_syncingTokenElevation.has(uuid)) return;

  const position = {
    x: foundry.utils.hasProperty(change, "x") ? change.x : tokenDocument.x,
    y: foundry.utils.hasProperty(change, "y") ? change.y : tokenDocument.y,
    width: foundry.utils.hasProperty(change, "width") ? change.width : tokenDocument.width,
    height: foundry.utils.hasProperty(change, "height") ? change.height : tokenDocument.height
  };
  const state = _tokenElevationState(tokenDocument, { requireTokenElevation: true }, position);
  const target = state.found ? state.elevation : 0;
  const current = Number(foundry.utils.getProperty(change, "elevation") ?? tokenDocument.elevation ?? 0);
  if (Math.abs(current - target) > 0.001) change.elevation = target;
}

Hooks.on("drawToken", (token) => {
  _applyTokenScale(token);
  void _syncTokenElevation(token.document);
});
Hooks.on("refreshToken", _applyTokenScale);
Hooks.on("createToken", (document) => {
  if (document.parent !== canvas?.scene) return;
  void _syncTokenElevation(document);
});
Hooks.on("preUpdateToken", (document, change) => {
  _applyElevationToMovementUpdate(document, change);
});
Hooks.on("updateToken", (document, change) => {
  if (document.parent !== canvas?.scene) return;
  _applyTokenScale(document.object);
});
