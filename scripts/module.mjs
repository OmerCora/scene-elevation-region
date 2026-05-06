import { MODULE_ID, SETTINGS, SCENE_SETTINGS_FLAG, SCENE_SETTING_KEYS, ELEVATION_DEFAULT_SETTINGS, PARALLAX_STRENGTHS, PARALLAX_MODES, PERSPECTIVE_POINTS, SHADOW_MODES, BLEND_MODES, TOKEN_ELEVATION_MODES, DEPTH_SCALES, EXTRUSION_STRENGTHS, REGION_BEHAVIOR_TYPE, getSceneElevationSetting } from "./config.mjs";
import { ElevationAuthoringLayer, registerElevationControls } from "./elevation-controls.mjs";
import { ElevationRegionBehavior, registerRegionHooks } from "./region-behavior.mjs";
import {
  RegionElevationRenderer,
  getRegionElevationAtPoint,
  getRegionElevationStateAtPoint,
  getActiveElevationRegions
} from "./region-elevation-renderer.mjs";

const TOKEN_SCALE_FALLBACK_STRENGTH = 0.055;
const TOKEN_ELEVATION_MIN_MOVEMENT_DELAY_MS = 250;
const TOKEN_ELEVATION_SETTLE_TIMEOUT_MS = 900;
const _syncingTokenElevation = new Set();
const _pendingTokenElevationUpdates = new Map();
const _tokensWithPendingMovement = new Set();
let _tokenVisualRefreshFrame = null;

class ResetElevationDefaultsDialog extends foundry.applications.api.DialogV2 {
  constructor() {
    super({
      window: { title: game.i18n.localize("SCENE_ELEVATION.Settings.ResetDefaults") },
      content: `<p>${game.i18n.localize("SCENE_ELEVATION.Settings.ResetDefaultsConfirm")}</p>`,
      buttons: [
        {
          action: "reset",
          label: game.i18n.localize("SCENE_ELEVATION.Settings.ResetDefaultsLabel"),
          icon: "fa-solid fa-rotate-left",
          default: true,
          callback: async () => {
            await _resetWorldElevationDefaults();
            ui.notifications.info(game.i18n.localize("SCENE_ELEVATION.Settings.ResetDefaultsDone"));
          }
        },
        {
          action: "cancel",
          label: game.i18n.localize("Cancel"),
          icon: "fa-solid fa-xmark"
        }
      ]
    });
  }
}

async function _resetWorldElevationDefaults() {
  await Promise.all(Object.entries(ELEVATION_DEFAULT_SETTINGS)
    .filter(([key]) => key !== SCENE_SETTING_KEYS.PERSPECTIVE_EDGE_POINT)
    .map(([key, value]) => game.settings.set(MODULE_ID, key, value)));
  RegionElevationRenderer.instance.update();
  void _refreshAllTokenElevations();
  _refreshAllTokenScales();
}

/* -------------------------------------------- */
/*  Init                                         */
/* -------------------------------------------- */

Hooks.once("init", () => {
  game.settings.registerMenu(MODULE_ID, "resetDefaults", {
    name: "SCENE_ELEVATION.Settings.ResetDefaults",
    label: "SCENE_ELEVATION.Settings.ResetDefaultsLabel",
    hint: "SCENE_ELEVATION.Settings.ResetDefaultsHint",
    icon: "fa-solid fa-rotate-left",
    type: ResetElevationDefaultsDialog,
    restricted: true
  });

  game.settings.register(MODULE_ID, SETTINGS.PARALLAX, {
    name: "SCENE_ELEVATION.Settings.Parallax",
    hint: "SCENE_ELEVATION.Settings.ParallaxHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.PARALLAX],
    choices: {
      off: "SCENE_ELEVATION.Settings.ParallaxOff",
      minimal: "SCENE_ELEVATION.Settings.ParallaxMinimal",
      verySubtle: "SCENE_ELEVATION.Settings.ParallaxVerySubtle",
      subtle: "SCENE_ELEVATION.Settings.ParallaxSubtle",
      medium: "SCENE_ELEVATION.Settings.ParallaxMedium",
      strong: "SCENE_ELEVATION.Settings.ParallaxStrong",
      extreme: "SCENE_ELEVATION.Settings.ParallaxExtreme"
    },
    onChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.PARALLAX_MODE, {
    name: "SCENE_ELEVATION.Settings.ParallaxMode",
    hint: "SCENE_ELEVATION.Settings.ParallaxModeHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.PARALLAX_MODE],
    choices: {
      [PARALLAX_MODES.SLOPE_ONLY]: "SCENE_ELEVATION.Settings.ParallaxModeSlopeOnly",
      [PARALLAX_MODES.HYBRID]: "SCENE_ELEVATION.Settings.ParallaxModeHybrid",
      [PARALLAX_MODES.ANCHORED]: "SCENE_ELEVATION.Settings.ParallaxModeAnchored",
      [PARALLAX_MODES.EDGE_BLEND]: "SCENE_ELEVATION.Settings.ParallaxModeEdgeBlend",
      [PARALLAX_MODES.CARD]: "SCENE_ELEVATION.Settings.ParallaxModeCard",
      [PARALLAX_MODES.SMOOTH_CARD]: "SCENE_ELEVATION.Settings.ParallaxModeSmoothCard",
      [PARALLAX_MODES.ANCHORED_CARD]: "SCENE_ELEVATION.Settings.ParallaxModeAnchoredCard",
      [PARALLAX_MODES.VELOCITY_CARD]: "SCENE_ELEVATION.Settings.ParallaxModeVelocityCard",
      [PARALLAX_MODES.ANCHORED_VELOCITY_CARD]: "SCENE_ELEVATION.Settings.ParallaxModeAnchoredVelocityCard",
      [PARALLAX_MODES.HEIGHT_DEPTH_CARD]: "SCENE_ELEVATION.Settings.ParallaxModeHeightDepthCard",
      [PARALLAX_MODES.SHADOW]: "SCENE_ELEVATION.Settings.ParallaxModeShadow"
    },
    onChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.PERSPECTIVE_POINT, {
    name: "SCENE_ELEVATION.Settings.PerspectivePoint",
    hint: "SCENE_ELEVATION.Settings.PerspectivePointHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.PERSPECTIVE_POINT],
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
      [PERSPECTIVE_POINTS.REGION_BOTTOM_RIGHT]: "SCENE_ELEVATION.Settings.PerspectivePointRegionBottomRight",
      [PERSPECTIVE_POINTS.POINT_ON_SCENE_EDGE]: "SCENE_ELEVATION.Settings.PerspectivePointSceneEdge",
      [PERSPECTIVE_POINTS.CAMERA_CENTER]: "SCENE_ELEVATION.Settings.PerspectivePointCameraCenter",
      [PERSPECTIVE_POINTS.FURTHEST_EDGE]: "SCENE_ELEVATION.Settings.PerspectivePointFurthestEdge",
      [PERSPECTIVE_POINTS.NEAREST_EDGE]: "SCENE_ELEVATION.Settings.PerspectivePointNearestEdge"
    },
    onChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.BLEND_MODE, {
    name: "SCENE_ELEVATION.Settings.TransitionMode",
    hint: "SCENE_ELEVATION.Settings.TransitionModeHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.BLEND_MODE],
    choices: {
      [BLEND_MODES.OFF]: "SCENE_ELEVATION.Settings.BlendModeOff",
      [BLEND_MODES.SOFT]: "SCENE_ELEVATION.Settings.BlendModeSoft",
      [BLEND_MODES.WIDE]: "SCENE_ELEVATION.Settings.BlendModeWide",
      [BLEND_MODES.DEPTH_LIP]: "SCENE_ELEVATION.Settings.BlendModeDepthLip",
      [BLEND_MODES.PROJECTED_PATCH]: "SCENE_ELEVATION.Settings.BlendModeProjectedPatch",
      [BLEND_MODES.CLIFF_WARP]: "SCENE_ELEVATION.Settings.BlendModeCliffWarp",
      [BLEND_MODES.SLOPE]: "SCENE_ELEVATION.Settings.BlendModeSlope",
      [BLEND_MODES.Z_BRIDGE]: "SCENE_ELEVATION.Settings.BlendModeZBridge"
    },
    onChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.OVERLAY_SCALE, {
    name: "SCENE_ELEVATION.Settings.OverlayScale",
    hint: "SCENE_ELEVATION.Settings.OverlayScaleHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.OVERLAY_SCALE],
    choices: {
      shrinkMedium: "SCENE_ELEVATION.Settings.OverlayScaleShrinkMedium",
      shrinkSubtle: "SCENE_ELEVATION.Settings.OverlayScaleShrinkSubtle",
      off: "SCENE_ELEVATION.Settings.OverlayScaleOff",
      subtle: "SCENE_ELEVATION.Settings.OverlayScaleSubtle",
      medium: "SCENE_ELEVATION.Settings.OverlayScaleMedium",
      strong: "SCENE_ELEVATION.Settings.OverlayScaleStrong"
    },
    onChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.SHADOW_MODE, {
    name: "SCENE_ELEVATION.Settings.ShadowMode",
    hint: "SCENE_ELEVATION.Settings.ShadowModeHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.SHADOW_MODE],
    choices: {
      [SHADOW_MODES.RESPONSIVE]: "SCENE_ELEVATION.Settings.ShadowModeResponsive",
      [SHADOW_MODES.REVERSED_RESPONSIVE]: "SCENE_ELEVATION.Settings.ShadowModeReversedResponsive",
      [SHADOW_MODES.FIXED_VISIBLE]: "SCENE_ELEVATION.Settings.ShadowModeFixedVisible",
      [SHADOW_MODES.TOP_DOWN]: "SCENE_ELEVATION.Settings.ShadowModeTopDown",
      [SHADOW_MODES.TOP_DOWN_STRONG]: "SCENE_ELEVATION.Settings.ShadowModeTopDownStrong"
    },
    onChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.TOKEN_SCALE_ENABLED, {
    name: "SCENE_ELEVATION.Settings.TokenScale",
    hint: "SCENE_ELEVATION.Settings.TokenScaleHint",
    scope: "world", config: true, type: Boolean, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.TOKEN_SCALE_ENABLED],
    onChange: () => _refreshAllTokenScales()
  });
  game.settings.register(MODULE_ID, SETTINGS.TOKEN_ELEVATION_MODE, {
    name: "SCENE_ELEVATION.Settings.TokenElevationMode",
    hint: "SCENE_ELEVATION.Settings.TokenElevationModeHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.TOKEN_ELEVATION_MODE],
    choices: {
      [TOKEN_ELEVATION_MODES.ALWAYS]: "SCENE_ELEVATION.Settings.TokenElevationModeAlways",
      [TOKEN_ELEVATION_MODES.NEVER]: "SCENE_ELEVATION.Settings.TokenElevationModeNever",
      [TOKEN_ELEVATION_MODES.PER_REGION]: "SCENE_ELEVATION.Settings.TokenElevationModePerRegion"
    },
    onChange: () => void _refreshAllTokenElevations()
  });
  game.settings.register(MODULE_ID, SETTINGS.TOKEN_ELEVATION_ANIMATION_MS, {
    name: "SCENE_ELEVATION.Settings.TokenElevationAnimationMs",
    hint: "SCENE_ELEVATION.Settings.TokenElevationAnimationMsHint",
    scope: "world", config: true, type: Number, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.TOKEN_ELEVATION_ANIMATION_MS]
  });
  game.settings.register(MODULE_ID, SETTINGS.TOKEN_SCALE_MAX, {
    name: "SCENE_ELEVATION.Settings.TokenScaleMax",
    hint: "SCENE_ELEVATION.Settings.TokenScaleMaxHint",
    scope: "world", config: true, type: Number, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.TOKEN_SCALE_MAX],
    onChange: () => _refreshAllTokenScales()
  });
  game.settings.register(MODULE_ID, SETTINGS.SHOW_ELEVATION_REGIONS, {
    scope: "client", config: false, type: Boolean, default: false,
    onChange: () => canvas?.[ElevationAuthoringLayer.LAYER_NAME]?.refreshElevationRegionVisibility()
  });

  game.settings.register(MODULE_ID, SETTINGS.DEPTH_SCALE, {
    name: "SCENE_ELEVATION.Settings.DepthScale",
    hint: "SCENE_ELEVATION.Settings.DepthScaleHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.DEPTH_SCALE],
    choices: {
      [DEPTH_SCALES.COMPRESSED]: "SCENE_ELEVATION.Settings.DepthScaleCompressed",
      [DEPTH_SCALES.LINEAR]: "SCENE_ELEVATION.Settings.DepthScaleLinear",
      [DEPTH_SCALES.DRAMATIC]: "SCENE_ELEVATION.Settings.DepthScaleDramatic"
    },
    onChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    }
  });
  game.settings.register(MODULE_ID, SETTINGS.EXTRUSION, {
    name: "SCENE_ELEVATION.Settings.Extrusion",
    hint: "SCENE_ELEVATION.Settings.ExtrusionHint",
    scope: "world", config: true, type: String, default: ELEVATION_DEFAULT_SETTINGS[SETTINGS.EXTRUSION],
    choices: {
      [EXTRUSION_STRENGTHS.OFF]: "SCENE_ELEVATION.Settings.ExtrusionOff",
      [EXTRUSION_STRENGTHS.SUBTLE]: "SCENE_ELEVATION.Settings.ExtrusionSubtle",
      [EXTRUSION_STRENGTHS.BOLD]: "SCENE_ELEVATION.Settings.ExtrusionBold",
      [EXTRUSION_STRENGTHS.TOWER]: "SCENE_ELEVATION.Settings.ExtrusionTower",
      [EXTRUSION_STRENGTHS.EDGE_STRETCH]: "SCENE_ELEVATION.Settings.ExtrusionEdgeStretch"
    },
    onChange: () => RegionElevationRenderer.instance.update()
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
  _refreshAllTokenScales();
  // Defer a second pass to catch any post-ready Foundry canvas refresh that resets mesh scales
  requestAnimationFrame(_refreshAllTokenScales);
});

Hooks.on("canvasTearDown", () => {
  _clearPendingTokenElevationUpdates();
  _clearPendingTokenVisualRefresh();
  RegionElevationRenderer.instance.detach();
});

Hooks.on("canvasPan", () => {
  RegionElevationRenderer.instance.onPan();
});

Hooks.on(`${MODULE_ID}.visualRefresh`, () => _queueTokenVisualRefresh());

Hooks.on("updateScene", (scene, change) => {
  if (scene !== canvas.scene) return;
  const geometryChanged = foundry.utils.hasProperty(change, "dimensions") || foundry.utils.hasProperty(change, "grid");
  const sceneSettingsChanged = foundry.utils.hasProperty(change, `flags.${MODULE_ID}.${SCENE_SETTINGS_FLAG}`);
  if (!geometryChanged && !sceneSettingsChanged) return;
  RegionElevationRenderer.instance.update();
  if (geometryChanged || sceneSettingsChanged) void _refreshAllTokenElevations();
  _refreshAllTokenScales();
});

/* -------------------------------------------- */
/*  Token elevation scaling                      */
/* -------------------------------------------- */

function _tokenScaleFactor(token) {
  if (!game.modules.get(MODULE_ID)?.active) return 1;
  if (!getSceneElevationSetting(SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED)) return 1;
  if (!canvas?.scene || !token?.document) return 1;
  const state = _tokenElevationState(token.document, { requireTokenScaling: true });
  if (!state.found) return 1;
  const strengthKey = getSceneElevationSetting(SCENE_SETTING_KEYS.PARALLAX) ?? "off";
  const parallax = PARALLAX_STRENGTHS[strengthKey] ?? PARALLAX_STRENGTHS.off;
  const max = getSceneElevationSetting(SCENE_SETTING_KEYS.TOKEN_SCALE_MAX) ?? 1.5;
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

function _highestTokenElevationState(tokenDocument, position = {}) {
  const mode = getSceneElevationSetting(SCENE_SETTING_KEYS.TOKEN_ELEVATION_MODE) ?? TOKEN_ELEVATION_MODES.PER_REGION;
  switch (mode) {
    case TOKEN_ELEVATION_MODES.NEVER:
      return { skip: true, found: false, elevation: 0, entry: null };
    case TOKEN_ELEVATION_MODES.ALWAYS:
      return _tokenElevationState(tokenDocument, { preferHighest: true }, position);
    case TOKEN_ELEVATION_MODES.PER_REGION:
    default:
      return _tokenElevationState(tokenDocument, { requireTokenElevation: true, preferHighest: true }, position);
  }
}

function _applyTokenScale(token) {
  if (!token?.mesh) return;
  const uuid = token.document?.uuid ?? token.document?.id;
  try {
    const m = token.mesh;
    const skipScale = uuid && _tokensWithPendingMovement.has(uuid);
    if (!skipScale) {
      // Cache the engine-set base scale once, then drive absolute scale =
      // base * factor. This avoids the previous bug where successive refreshes
      // multiplied the scale unboundedly.
      if (!getSceneElevationSetting(SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED)) {
        if (m._seBaseScaleX !== undefined) m.scale.set(m._seBaseScaleX, m._seBaseScaleY);
        m._seLastFactor = 1;
      } else if (m._seBaseScaleX === undefined) {
        m._seBaseScaleX = m.scale.x;
        m._seBaseScaleY = m.scale.y;
      } else if (m._seLastFactor && Math.abs(m.scale.x - m._seBaseScaleX * m._seLastFactor) > 1e-4) {
        // If Foundry just rewrote the scale (e.g. token resize / mirror toggle),
        // re-cache by comparing to the previously applied product.
        m._seBaseScaleX = m.scale.x;
        m._seBaseScaleY = m.scale.y;
      }
      if (getSceneElevationSetting(SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED)) {
        const factor = _tokenScaleFactor(token);
        m._seLastFactor = factor;
        const sgnX = Math.sign(m._seBaseScaleX) || 1;
        const sgnY = Math.sign(m._seBaseScaleY) || 1;
        m.scale.set(
          Math.abs(m._seBaseScaleX) * factor * sgnX,
          Math.abs(m._seBaseScaleY) * factor * sgnY
        );
      }
    }
    _applyTokenParallaxOffset(token);
  } catch (err) {
    // Silent — drawToken can fire before our module/canvas is fully initialised.
  }
}

function _applyTokenParallaxOffset(token) {
  const m = token?.mesh;
  if (!m?.position) return;
  if (m._seBasePositionX === undefined) {
    m._seBasePositionX = m.position.x;
    m._seBasePositionY = m.position.y;
  } else if (m._seLastOffset) {
    const expectedX = m._seBasePositionX + m._seLastOffset.x;
    const expectedY = m._seBasePositionY + m._seLastOffset.y;
    if (Math.abs(m.position.x - expectedX) > 0.5 || Math.abs(m.position.y - expectedY) > 0.5) {
      m._seBasePositionX = m.position.x;
      m._seBasePositionY = m.position.y;
    }
  }
  const offset = RegionElevationRenderer.instance.tokenParallaxOffset(token.document);
  m._seLastOffset = offset;
  m.position.set(m._seBasePositionX + offset.x, m._seBasePositionY + offset.y);
}

function _refreshAllTokenScales() {
  if (!canvas?.tokens) return;
  for (const t of canvas.tokens.placeables) _applyTokenScale(t);
}

function _queueTokenVisualRefresh() {
  if (_tokenVisualRefreshFrame) return;
  _tokenVisualRefreshFrame = requestAnimationFrame(() => {
    _tokenVisualRefreshFrame = null;
    _refreshAllTokenScales();
  });
}

function _clearPendingTokenVisualRefresh() {
  if (_tokenVisualRefreshFrame) cancelAnimationFrame(_tokenVisualRefreshFrame);
  _tokenVisualRefreshFrame = null;
}

async function _syncTokenElevation(tokenDocument, position = {}) {
  if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return;
  const uuid = tokenDocument.uuid ?? tokenDocument.id;
  if (_syncingTokenElevation.has(uuid)) return;

  const state = _highestTokenElevationState(tokenDocument, position);
  if (state.skip) return;
  const current = Number(tokenDocument.elevation ?? 0);
  const target = state.found ? state.elevation : 0;
  if (Math.abs(current - target) <= 0.001) return;
  _syncingTokenElevation.add(uuid);
  try {
    await tokenDocument.update({ elevation: target }, { animation: { duration: _tokenElevationAnimationDuration() } });
    _applyTokenScale(tokenDocument.object);
  } finally {
    _syncingTokenElevation.delete(uuid);
  }
}

function _queueTokenElevationAfterMovement(tokenDocument, change = {}, options = {}) {
  if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return;
  const uuid = tokenDocument.uuid ?? tokenDocument.id;
  const pending = _pendingTokenElevationUpdates.get(uuid);
  if (pending) cancelAnimationFrame(pending.frame);
  _tokensWithPendingMovement.add(uuid);
  const finalPosition = _tokenMovementPosition(tokenDocument, change);

  // Immediately apply scale for the destination position so there is no
  // jarring snap after the elevation-sync delay.  Scale is computed from
  // tokenDocument.x/y which Foundry has already set to the new position.
  const _immediateToken = tokenDocument.object;
  if (_immediateToken) {
    _tokensWithPendingMovement.delete(uuid);
    _applyTokenScale(_immediateToken);
    _tokensWithPendingMovement.add(uuid);
  }

  const started = performance.now();
  const sceneId = canvas.scene.id;
  const animationDuration = _tokenMovementAnimationDuration(options);
  const waitForMovement = () => {
    if (!canvas?.scene || canvas.scene.id !== sceneId || tokenDocument.parent !== canvas.scene) {
      _pendingTokenElevationUpdates.delete(uuid);
      _tokensWithPendingMovement.delete(uuid);
      return;
    }
    const elapsed = performance.now() - started;
    const waitingForAnimation = elapsed < animationDuration;
    const waitingForPosition = !_tokenMovementSettled(tokenDocument) && elapsed < TOKEN_ELEVATION_SETTLE_TIMEOUT_MS;
    if (waitingForAnimation || waitingForPosition) {
      const frame = requestAnimationFrame(waitForMovement);
      _pendingTokenElevationUpdates.set(uuid, { frame });
      return;
    }
    _pendingTokenElevationUpdates.delete(uuid);
    _tokensWithPendingMovement.delete(uuid);
    void _syncTokenElevation(tokenDocument, finalPosition);
  };
  const frame = requestAnimationFrame(waitForMovement);
  _pendingTokenElevationUpdates.set(uuid, { frame });
}

function _markTokenMovementStarting(tokenDocument) {
  if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return;
  const uuid = tokenDocument.uuid ?? tokenDocument.id;
  if (!uuid) return;
  _tokensWithPendingMovement.add(uuid);
  requestAnimationFrame(() => {
    if (_pendingTokenElevationUpdates.has(uuid)) return;
    requestAnimationFrame(() => {
      if (!_pendingTokenElevationUpdates.has(uuid)) _tokensWithPendingMovement.delete(uuid);
    });
  });
}

function _hasTokenMovementChange(change = {}) {
  return foundry.utils.hasProperty(change, "x")
    || foundry.utils.hasProperty(change, "y")
    || foundry.utils.hasProperty(change, "width")
    || foundry.utils.hasProperty(change, "height");
}

function _tokenMovementPosition(tokenDocument, change = {}) {
  return {
    x: foundry.utils.hasProperty(change, "x") ? Number(change.x) : Number(tokenDocument.x ?? 0),
    y: foundry.utils.hasProperty(change, "y") ? Number(change.y) : Number(tokenDocument.y ?? 0),
    width: foundry.utils.hasProperty(change, "width") ? Number(change.width) : Number(tokenDocument.width ?? 1),
    height: foundry.utils.hasProperty(change, "height") ? Number(change.height) : Number(tokenDocument.height ?? 1)
  };
}

function _tokenMovementAnimationDuration(options = {}) {
  const duration = Number(options.animation?.duration ?? options.animate?.duration ?? 0);
  return Number.isFinite(duration) && duration > 0 ? Math.min(duration, TOKEN_ELEVATION_SETTLE_TIMEOUT_MS) : TOKEN_ELEVATION_MIN_MOVEMENT_DELAY_MS;
}

function _tokenElevationAnimationDuration() {
  return Math.clamp(Number(getSceneElevationSetting(SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS) ?? 120), 0, 600);
}

function _tokenMovementSettled(tokenDocument) {
  const token = tokenDocument.object;
  if (!token) return true;
  return !_tokenObjectOutOfSyncWithDocument(token);
}

function _tokenObjectOutOfSyncWithDocument(token) {
  const tokenDocument = token?.document;
  if (!tokenDocument) return false;
  const x = Number(token.x ?? token.position?.x ?? tokenDocument.x ?? 0);
  const y = Number(token.y ?? token.position?.y ?? tokenDocument.y ?? 0);
  return Math.abs(x - Number(tokenDocument.x ?? 0)) >= 0.5 || Math.abs(y - Number(tokenDocument.y ?? 0)) >= 0.5;
}

function _clearPendingTokenElevationUpdates() {
  for (const pending of _pendingTokenElevationUpdates.values()) cancelAnimationFrame(pending.frame);
  _pendingTokenElevationUpdates.clear();
  _tokensWithPendingMovement.clear();
}

async function _refreshAllTokenElevations() {
  if (!canvas?.tokens) return;
  await Promise.all(canvas.tokens.placeables.map(token => _syncTokenElevation(token.document)));
}

Hooks.on("drawToken", (token) => {
  // Clear stale mesh cache so the upcoming refreshToken re-caches from Foundry's finalized scale
  const m = token?.mesh;
  if (m) {
    delete m._seBaseScaleX;
    delete m._seBaseScaleY;
    delete m._seLastFactor;
    delete m._seBasePositionX;
    delete m._seBasePositionY;
    delete m._seLastOffset;
  }
  _applyTokenScale(token);
});
Hooks.on("refreshToken", _applyTokenScale);
Hooks.on("createToken", (document) => {
  if (document.parent !== canvas?.scene) return;
  void _syncTokenElevation(document);
});
Hooks.on("preUpdateToken", (document, change) => {
  if (!_hasTokenMovementChange(change)) return;
  _markTokenMovementStarting(document);
});
Hooks.on("updateToken", (document, change, options) => {
  if (document.parent !== canvas?.scene) return;
  if (_hasTokenMovementChange(change)) {
    _queueTokenElevationAfterMovement(document, change, options);
    return;
  }
  _applyTokenScale(document.object);
});
