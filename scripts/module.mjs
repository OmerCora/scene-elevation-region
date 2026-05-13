import { MODULE_ID, SETTINGS, SCENE_SETTINGS_FLAG, SCENE_SETTING_KEYS, ELEVATION_DEFAULT_SETTINGS, TOKEN_SCALING_MODES, REGION_BEHAVIOR_TYPE, getSceneElevationClientEnabled, getSceneElevationSettingsSnapshot, invalidateSceneElevationSettingsCache, setSceneElevationClientEnabled, tokenScalePerElevationValue, tokenScalingModeValue } from "./config.mjs";
import { ElevationAuthoringLayer, registerElevationControls } from "./elevation-controls.mjs";
import { createElevatedGridController } from "./elevated-grid-controller.mjs";
import { ElevationRegionBehavior, registerRegionHooks } from "./region-behavior.mjs";
import { enhanceRegionBehaviorConfigForm } from "./region-behavior-form.mjs";
import { migrateSceneElevationSettings } from "./settings-migrations.mjs";
import { registerModuleSettings } from "./settings-registration.mjs";
import { debugLog, setDebugLogging } from "./debug.mjs";
import { tokenElevationState, tokenScaleFactor } from "./token-elevation-state.mjs";
import { createTokenElevationSyncController, TOKEN_MOVEMENT_DELTA_OPTION } from "./token-elevation-sync.mjs";
import { createTokenHudRulerPatches } from "./token-hud-ruler-patches.mjs";
import { createTokenParallaxController } from "./token-parallax.mjs";
import { captureTokenBaseScale, systemTokenScalingElevation, tokenDocumentTextureScale } from "./token-scale.mjs";
import { buildTokenScaleCacheKey } from "./token-scale-cache-key.mjs";
import { canvasGridSize, finitePositionValue, isCanonicalSceneToken, safeTokenLivePoint, tokenBoundsIntersectEntries } from "./token-spatial-utils.mjs";
import { applyAnimatedSystemTokenVisuals, applySystemTokenVisualState, clearSystemTokenVisualState, restoreSystemTokenMotion } from "./system-token-visuals.mjs";
import {
  RegionElevationRenderer,
  getRegionElevationAtPoint,
  getRegionElevationStateAtPoint,
  getActiveElevationRegions,
  isTemporaryParallaxDisabled,
  setTemporaryParallaxDisabled
} from "./region-elevation-renderer.mjs";
import { getSystemTokenVisualState } from "./systems/index.mjs";

const _tokenOverheadRefreshStates = new WeakMap();
let _tokenVisualRefreshFrame = null;
let _regionOverheadRefreshFrame = null;
let _systemTokenVisualAnimationFrame = null;

const _elevatedGrid = createElevatedGridController({
  isEnabled: _sceneElevationClientEnabled,
  renderer: () => RegionElevationRenderer.instance
});
const _tokenElevationSync = createTokenElevationSyncController({
  isEnabled: _sceneElevationClientEnabled,
  applyTokenScale: (...args) => _applyTokenScale(...args),
  queueOverheadRefreshForToken: (...args) => _queueOverheadRefreshForToken(...args),
  elevatedGrid: _elevatedGrid
});
const _tokenHudRulerPatches = createTokenHudRulerPatches({
  isEnabled: _sceneElevationClientEnabled,
  elevatedGrid: _elevatedGrid,
  tokenElevationSync: _tokenElevationSync
});
const _tokenParallax = createTokenParallaxController({
  isEnabled: _sceneElevationClientEnabled,
  refreshTokenHudOffset: (...args) => _tokenHudRulerPatches.refreshTokenHudOffset(...args)
});

function _sceneElevationClientEnabled() {
  return getSceneElevationClientEnabled();
}

function _refreshSceneElevationClientState(enabled = _sceneElevationClientEnabled()) {
  setSceneElevationClientEnabled(enabled);
  _clearPendingTokenVisualRefresh();
  _clearPendingRegionOverheadRefresh();
  try { globalThis.ui?.controls?.render?.({ force: true }); }
  catch (err) { globalThis.ui?.controls?.render?.(true); }
  if (!enabled) {
    _tokenElevationSync.clearPendingTokenElevationUpdates();
    _tokenParallax.clearPendingTokenParallaxRefresh();
    _elevatedGrid.clearPendingRefresh();
    _clearPendingSystemTokenVisualAnimation();
    RegionElevationRenderer.instance.detach();
    _resetAllTokenVisuals();
    canvas?.[ElevationAuthoringLayer.LAYER_NAME]?.activateTool(null);
    canvas?.[ElevationAuthoringLayer.LAYER_NAME]?.refreshElevationRegionVisibility(false);
    return;
  }
  if (canvas?.scene) {
    RegionElevationRenderer.instance.attach(canvas.scene);
    void _tokenElevationSync.refreshAllTokenElevations();
    _refreshAllTokenScales();
    requestAnimationFrame(_refreshAllTokenScales);
  }
  canvas?.[ElevationAuthoringLayer.LAYER_NAME]?.refreshElevationRegionVisibility();
}

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
  void _tokenElevationSync.refreshAllTokenElevations();
  _refreshAllTokenScales();
}

function _registerKeybindings() {
  game.keybindings.register(MODULE_ID, "toggleParallaxOverlay", {
    name: "SCENE_ELEVATION.Keybindings.ToggleParallaxOverlay",
    hint: "SCENE_ELEVATION.Keybindings.ToggleParallaxOverlayHint",
    editable: [{ key: "KeyO" }],
    restricted: false,
    onDown: () => _toggleTemporaryParallaxOverlay()
  });
}

function _toggleTemporaryParallaxOverlay() {
  const disabled = !isTemporaryParallaxDisabled();
  setTemporaryParallaxDisabled(disabled);
  RegionElevationRenderer.instance.update();
  _refreshAllTokenScales();
  _tokenParallax.refreshAllTokenParallax();
  _elevatedGrid.queueRefresh();
  const message = disabled
    ? "SCENE_ELEVATION.Notify.ParallaxTemporarilyOff"
    : "SCENE_ELEVATION.Notify.ParallaxRestored";
  ui.notifications.info(game.i18n.localize(message));
  return true;
}

/* -------------------------------------------- */
/*  Init                                         */
/* -------------------------------------------- */

Hooks.once("init", () => {
  _registerKeybindings();
  registerModuleSettings({
    resetDefaultsDialogClass: ResetElevationDefaultsDialog,
    onClientEnabledChange: enabled => _refreshSceneElevationClientState(enabled),
    onElevatedGridChange: () => _elevatedGrid.queueRefresh(),
    onVisualSettingsChange: () => {
      RegionElevationRenderer.instance.update();
      _refreshAllTokenScales();
    },
    onRendererSettingsChange: () => RegionElevationRenderer.instance.update(),
    onTokenScaleSettingsChange: () => _refreshAllTokenScales(),
    onTokenElevationSettingsChange: () => void _tokenElevationSync.refreshAllTokenElevations(),
    onDrawSteelMovementTypeAnimationsChange: () => {
      _clearPendingSystemTokenVisualAnimation();
      _refreshAllTokenScales();
    },
    onDrawSteelHandleMovementModesChange: () => {
      _refreshAllTokenScales();
      void _tokenElevationSync.refreshAllTokenElevations();
    },
    onShowElevationRegionsChange: () => canvas?.[ElevationAuthoringLayer.LAYER_NAME]?.refreshElevationRegionVisibility()
  });

  CONFIG.Canvas.layers[ElevationAuthoringLayer.LAYER_NAME] = {
    layerClass: ElevationAuthoringLayer,
    group: "interface"
  };

  Object.assign(CONFIG.RegionBehavior.dataModels, {
    [REGION_BEHAVIOR_TYPE]: ElevationRegionBehavior
  });
  CONFIG.RegionBehavior.typeIcons[REGION_BEHAVIOR_TYPE] = "fa-solid fa-arrows-up-to-line";

  const invalidate = () => {
    if (!canvas?.scene || !_sceneElevationClientEnabled()) return;
    RegionElevationRenderer.instance.update();
    void _tokenElevationSync.refreshAllTokenElevations();
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
    getActiveElevationRegions,
    isEnabled: _sceneElevationClientEnabled,
    setDebug: setDebugLogging
  };
  else console.error(`[${MODULE_ID}] Module not registered — manifest id likely doesn't match install folder.`);
});

Hooks.once("setup", () => {
  _tokenHudRulerPatches.patchTokenHudPositioning();
  _tokenHudRulerPatches.patchTokenRulerParallaxGuide();
});
Hooks.once("ready", async () => {
  _tokenHudRulerPatches.patchTokenHudPositioning();
  _tokenHudRulerPatches.patchTokenRulerParallaxGuide();
  await migrateSceneElevationSettings();
});

/* -------------------------------------------- */
/*  Canvas lifecycle                             */
/* -------------------------------------------- */

Hooks.on("canvasReady", async () => {
  if (!_sceneElevationClientEnabled()) {
    RegionElevationRenderer.instance.detach();
    _resetAllTokenVisuals();
    return;
  }
  RegionElevationRenderer.instance.attach(canvas.scene);
  void _tokenElevationSync.refreshAllTokenElevations();
  _refreshAllTokenScales();
  // Defer a second pass to catch any post-ready Foundry canvas refresh that resets mesh scales
  requestAnimationFrame(_refreshAllTokenScales);
  _elevatedGrid.queueRefresh();
});

Hooks.on("canvasTearDown", () => {
  _tokenElevationSync.clearPendingTokenElevationUpdates();
  _tokenParallax.clearPendingTokenParallaxRefresh();
  _clearPendingTokenVisualRefresh();
  _clearPendingRegionOverheadRefresh();
  _elevatedGrid.clearPendingRefresh();
  RegionElevationRenderer.instance.detach();
});

Hooks.on("canvasPan", () => {
  if (!_sceneElevationClientEnabled()) return;
  RegionElevationRenderer.instance.onPan();
  _elevatedGrid.queueRefresh();
});

Hooks.on("refreshTile", (tile) => {
  const mesh = tile?.mesh;
  if (!mesh) return;
  // Foundry just reset the mesh transform back to its base position. Clear
  // our recorded offset so the next apply pass treats it as a fresh state,
  // then re-apply the current parallax offset on top.
  mesh._sceneElevationParallaxOffset = null;
  RegionElevationRenderer.instance.applyTileParallaxForTile(tile);
});

Hooks.on(`${MODULE_ID}.visualRefresh`, () => _queueTokenVisualRefresh());
Hooks.on(`${MODULE_ID}.parallaxRefresh`, () => _tokenParallax.queueTokenParallaxRefresh());

Hooks.on("renderSettingsConfig", (_app, html) => {
  requestAnimationFrame(() => _syncTokenScalingModeSettingsConfig(html));
});

Hooks.on("updateScene", (scene, change) => {
  if (scene !== canvas.scene) return;
  const geometryChanged = foundry.utils.hasProperty(change, "dimensions") || foundry.utils.hasProperty(change, "grid");
  const sceneSettingsChanged = foundry.utils.hasProperty(change, `flags.${MODULE_ID}.${SCENE_SETTINGS_FLAG}`);
  if (!geometryChanged && !sceneSettingsChanged) return;
  if (!_sceneElevationClientEnabled()) return;
  if (sceneSettingsChanged) invalidateSceneElevationSettingsCache(scene);
  RegionElevationRenderer.instance.update();
  if (geometryChanged || sceneSettingsChanged) void _tokenElevationSync.refreshAllTokenElevations();
  _refreshAllTokenScales();
  _elevatedGrid.queueRefresh();
});

Hooks.on("renderRegionConfig", enhanceRegionBehaviorConfigForm);
Hooks.on("renderRegionBehaviorConfig", enhanceRegionBehaviorConfigForm);

/* -------------------------------------------- */
/*  Token elevation scaling                      */
/* -------------------------------------------- */

function _syncTokenScalingModeSettingsConfig(html) {
  const root = _settingsConfigRoot(html);
  if (!root) return;
  const modeField = _settingsConfigField(root, SETTINGS.TOKEN_SCALING_MODE);
  const maxField = _settingsConfigField(root, SETTINGS.TOKEN_SCALE_MAX);
  const perElevationField = _settingsConfigField(root, SETTINGS.TOKEN_SCALE_PER_ELEVATION);
  if (!modeField) return;
  const maxGroup = maxField?.closest?.(".form-group") ?? maxField?.parentElement ?? null;
  const perElevationGroup = perElevationField?.closest?.(".form-group") ?? perElevationField?.parentElement ?? null;
  const sync = () => {
    const mode = tokenScalingModeValue(modeField.value);
    if (maxGroup) maxGroup.hidden = mode !== TOKEN_SCALING_MODES.MAX_TOKEN_SCALE;
    if (perElevationGroup) perElevationGroup.hidden = mode !== TOKEN_SCALING_MODES.SCALE_PER_ELEVATION;
  };
  modeField.addEventListener("change", sync);
  sync();
}

function _settingsConfigRoot(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  if (html?.element instanceof HTMLElement) return html.element;
  if (html?.element?.[0] instanceof HTMLElement) return html.element[0];
  return null;
}

function _settingsConfigField(root, key) {
  const names = new Set([`${MODULE_ID}.${key}`, key]);
  return Array.from(root.querySelectorAll("input, select")).find(field => names.has(field.name));
}

function _applyTokenScale(token, { forceScale = false } = {}) {
  if (!token?.mesh) return;
  restoreSystemTokenMotion(token);
  if (!_sceneElevationClientEnabled()) {
    _resetTokenVisuals(token);
    return;
  }
  // Drag preview clones share a document id with a real scene token but get
  // their mesh scale copied from that token's already-elevated mesh. If we
  // treat that as a fresh natural base and multiply by the elevation factor
  // again the ghost balloons; restoring on bounds exit and re-entering then
  // grows it further. Leave preview clone mesh scale alone — Foundry's ghost
  // already reflects the original token's display size — but DO still apply
  // the parallax offset so the ghost shows where the token will actually
  // land in the elevated region instead of where the cursor is.
  if (!isCanonicalSceneToken(token)) {
    try { _tokenParallax.applyTokenParallaxOffset(token); } catch (_) { /* ignore */ }
    return;
  }
  const activeEntries = getActiveElevationRegions(canvas?.scene);
  const m = token.mesh;
  const doc = token.document;
  const sceneSettings = getSceneElevationSettingsSnapshot(canvas?.scene);
  const systemScalingElevation = systemTokenScalingElevation(doc);
  const hasSystemScalingElevation = systemScalingElevation !== null;
  const tokenScaleEnabled = sceneSettings[SCENE_SETTING_KEYS.TOKEN_SCALE_ENABLED];
  // Fast bail: scenes with no active elevation regions can't change scale,
  // visibility floor, parallax offsets, or negative-parallax clips.
  if (!activeEntries.length && !(tokenScaleEnabled && hasSystemScalingElevation)) {
    if (m._seBaseScaleX !== undefined && m._seLastFactor && m._seLastFactor !== 1) {
      const sgnX = Math.sign(m._seBaseScaleX) || 1;
      const sgnY = Math.sign(m._seBaseScaleY) || 1;
      m.scale.set(Math.abs(m._seBaseScaleX) * sgnX, Math.abs(m._seBaseScaleY) * sgnY);
      m._seLastFactor = 1;
    }
    _applyNegativeRegionTokenVisibilityFloor(token);
    if (_tokenParallax.tokenNeedsParallaxCleanup(token)) _tokenParallax.applyTokenParallaxOffset(token);
    RegionElevationRenderer.instance.clearNegativeParallaxClipForToken(token);
    _applySystemTokenVisualState(token);
    return;
  }
  if (!forceScale && doc && !tokenBoundsIntersectEntries(doc, {}, activeEntries) && !(tokenScaleEnabled && hasSystemScalingElevation)) {
    if (m._seBaseScaleX !== undefined && m._seLastFactor && m._seLastFactor !== 1) {
      const sgnX = Math.sign(m._seBaseScaleX) || 1;
      const sgnY = Math.sign(m._seBaseScaleY) || 1;
      m.scale.set(Math.abs(m._seBaseScaleX) * sgnX, Math.abs(m._seBaseScaleY) * sgnY);
      m._seLastFactor = 1;
    }
    _applyNegativeRegionTokenVisibilityFloor(token);
    if (_tokenParallax.tokenNeedsParallaxCleanup(token)) _tokenParallax.applyTokenParallaxOffset(token);
    RegionElevationRenderer.instance.clearNegativeParallaxClipForToken(token);
    _applySystemTokenVisualState(token);
    return;
  }
  // Per-token cache: when the *inputs* to the heavy elevation/scaling/clip
  // computation are unchanged we skip the recompute and only re-apply the
  // already-known parallax offset to the mesh position. Foundry resets
  // mesh.position to the live preview position every refreshToken, so we MUST
  // always re-apply the offset (cheap), even on cache hit. Cache key covers
  // doc state + visualParams version (which bumps when parallax/perspective
  // change) + per-mesh visual flags.
  const renderer = RegionElevationRenderer.instance;
  const tokenScalingMode = tokenScalingModeValue(sceneSettings[SCENE_SETTING_KEYS.TOKEN_SCALING_MODE]);
  const tokenScaleMax = Number(sceneSettings[SCENE_SETTING_KEYS.TOKEN_SCALE_MAX] ?? 1.5);
  const tokenScalePerElevation = tokenScalePerElevationValue(sceneSettings[SCENE_SETTING_KEYS.TOKEN_SCALE_PER_ELEVATION]);
  const tokenTextureScale = tokenDocumentTextureScale(doc);
  const cacheKey = buildTokenScaleCacheKey({
    forceScale,
    tokenDocument: doc,
    visualParamsVersion: renderer?._visualParamsVersion ?? 0,
    tokenScaleEnabled,
    tokenScalingMode,
    tokenScaleMax,
    tokenScalePerElevation,
    tokenTextureScale,
    systemScalingElevation,
    movementPending: _tokenElevationSync.isMovementPending(doc)
  });
  if (cacheKey && m._seScaleCacheKey === cacheKey) {
    // Cheap path: re-apply cached parallax offset only. Mesh position is
    // overwritten by Foundry's drag/move animation between refreshes.
    _tokenParallax.reapplyCachedTokenParallaxOffset(token);
    _applySystemTokenVisualState(token);
    return;
  }
  const uuid = token.document?.uuid ?? token.document?.id;
  try {
    const m = token.mesh;
    const skipScale = !forceScale && uuid && _tokenElevationSync.isMovementPending(uuid);
    if (!skipScale) {
      // Cache Foundry's finalized PIXI mesh scale once, then drive absolute
      // scale = base * factor. Do not use token.document.texture.scaleX here:
      // that value is a token texture setting, not the actual mesh scale, and
      // forcing it onto the mesh can inflate normal tokens several times over.
      const factor = tokenScaleEnabled ? tokenScaleFactor(token, tokenTextureScale, { entries: activeEntries, systemScalingElevation, settings: sceneSettings }) : 1;
      if (!tokenScaleEnabled) {
        if (m._seBaseScaleX !== undefined) m.scale.set(m._seBaseScaleX, m._seBaseScaleY);
        m._seLastFactor = 1;
      } else if (m._seBaseScaleX === undefined) {
        if (!captureTokenBaseScale(token, factor, { gridSize: canvasGridSize() })) _queueTokenVisualRefresh();
      } else if (m._seLastFactor && Math.abs(m.scale.x - m._seBaseScaleX * m._seLastFactor) > 1e-4) {
        // If Foundry just rewrote the scale (e.g. token resize / mirror toggle),
        // re-cache by comparing to the previously applied product.
        if (!captureTokenBaseScale(token, m._seLastFactor, { gridSize: canvasGridSize() })) _queueTokenVisualRefresh();
      }
      if (tokenScaleEnabled && m._seBaseScaleX !== undefined && m._seBaseScaleY !== undefined) {
        m._seLastFactor = factor;
        const sgnX = Math.sign(m._seBaseScaleX) || 1;
        const sgnY = Math.sign(m._seBaseScaleY) || 1;
        m.scale.set(
          Math.abs(m._seBaseScaleX) * factor * sgnX,
          Math.abs(m._seBaseScaleY) * factor * sgnY
        );
      }
    }
    _applyNegativeRegionTokenVisibilityFloor(token);
    _tokenParallax.applyTokenParallaxOffset(token);
    RegionElevationRenderer.instance.applyNegativeParallaxClipForToken(token);
    _applySystemTokenVisualState(token);
    if (cacheKey) m._seScaleCacheKey = cacheKey;
  } catch (err) {
    // Silent — drawToken can fire before our module/canvas is fully initialised.
  }
}

function _applyNegativeRegionTokenVisibilityFloor(token) {
  const mesh = token?.mesh;
  if (!mesh || !token?.document || !canvas?.scene) return;
  const systemVisualState = getSystemTokenVisualState(token.document);
  const state = tokenElevationState(token.document);
  const tokenElevation = Number(token.document.elevation ?? 0);
  const regionElevation = Number(state.elevation ?? 0);
  const uuid = token.document?.uuid ?? token.document?.id;
  const movingFromNegativeIntoVisibleElevation = !!uuid
    && _tokenElevationSync.isMovementPending(uuid)
    && Number.isFinite(tokenElevation)
    && tokenElevation < -0.001
    && (!state.found || regionElevation >= -0.001);
  const standingOnNegativeRegion = state.found
    && regionElevation < 0
    && Number.isFinite(tokenElevation)
    && tokenElevation >= regionElevation - 0.1;
  const systemSurfaceVisibility = systemVisualState?.forceSurfaceVisibility === true;
  if (!standingOnNegativeRegion && !movingFromNegativeIntoVisibleElevation && !systemSurfaceVisibility) {
    _clearNegativeRegionTokenVisibilityFloor(token);
    return;
  }
  const documentElevation = Number(token.document.elevation ?? mesh._seVisibilityFloorElevation ?? 0);
  const visibleElevation = Math.max(0, Number.isFinite(documentElevation) ? documentElevation : 0);
  if (mesh._seVisibilityFloorElevation === undefined) {
    mesh._seVisibilityFloorHadElevation = "elevation" in mesh;
    mesh._seVisibilityFloorElevation = mesh.elevation;
    mesh._seVisibilityFloorZIndex = mesh.zIndex;
    mesh._seVisibilityFloorTokenHadElevation = "elevation" in token;
    mesh._seVisibilityFloorTokenElevation = token.elevation;
    mesh._seVisibilityFloorTokenZIndex = token.zIndex;
  }
  _setWritableObjectProperty(token, "elevation", visibleElevation);
  mesh.elevation = visibleElevation;
  const zIndex = Number(mesh.zIndex ?? 0);
  _setWritableObjectProperty(token, "zIndex", Math.max(0, Number(token.zIndex ?? 0) || 0));
  mesh.zIndex = Math.max(0, Number.isFinite(zIndex) ? zIndex : 0);
  _setWritableObjectProperty(token, "sortDirty", true);
  mesh.parent?.sortableChildren && (mesh.parent.sortDirty = true);
  if (canvas.primary) canvas.primary.sortDirty = true;
}

function _clearNegativeRegionTokenVisibilityFloor(token) {
  const mesh = token?.mesh;
  if (!mesh || mesh._seVisibilityFloorElevation === undefined) return;
  if (mesh._seVisibilityFloorHadElevation) {
    const documentElevation = Number(token?.document?.elevation ?? mesh._seVisibilityFloorElevation ?? 0);
    mesh.elevation = Number.isFinite(documentElevation) ? documentElevation : 0;
  }
  else delete mesh.elevation;
  if (mesh._seVisibilityFloorTokenHadElevation) {
    const documentElevation = Number(token?.document?.elevation ?? mesh._seVisibilityFloorTokenElevation ?? 0);
    _setWritableObjectProperty(token, "elevation", Number.isFinite(documentElevation) ? documentElevation : 0);
  }
  else if (token && mesh._seVisibilityFloorTokenElevation !== undefined) delete token.elevation;
  if (mesh._seVisibilityFloorZIndex !== undefined) mesh.zIndex = mesh._seVisibilityFloorZIndex;
  if (mesh._seVisibilityFloorTokenZIndex !== undefined && token) _setWritableObjectProperty(token, "zIndex", mesh._seVisibilityFloorTokenZIndex);
  delete mesh._seVisibilityFloorZIndex;
  delete mesh._seVisibilityFloorTokenZIndex;
  delete mesh._seVisibilityFloorTokenHadElevation;
  delete mesh._seVisibilityFloorTokenElevation;
  delete mesh._seVisibilityFloorHadElevation;
  delete mesh._seVisibilityFloorElevation;
  _setWritableObjectProperty(token, "sortDirty", true);
  mesh.parent?.sortableChildren && (mesh.parent.sortDirty = true);
  if (canvas?.primary) canvas.primary.sortDirty = true;
}

function _setWritableObjectProperty(object, key, value) {
  if (!object || !(key in object)) return false;
  try {
    object[key] = value;
    return true;
  } catch (err) {
    return false;
  }
}

function _applySystemTokenVisualState(token) {
  applySystemTokenVisualState(token, { gridSize: canvasGridSize(), queueAnimation: _queueSystemTokenVisualAnimation });
}

function _clearSystemTokenVisualState(token) {
  clearSystemTokenVisualState(token);
}

function _queueSystemTokenVisualAnimation() {
  if (!_sceneElevationClientEnabled() || _systemTokenVisualAnimationFrame) return;
  _systemTokenVisualAnimationFrame = requestAnimationFrame(_animateSystemTokenVisuals);
}

function _animateSystemTokenVisuals(now) {
  _systemTokenVisualAnimationFrame = null;
  if (!_sceneElevationClientEnabled() || !canvas?.tokens) return;
  const anyFlying = applyAnimatedSystemTokenVisuals(canvas.tokens.placeables, now, { gridSize: canvasGridSize() });
  if (anyFlying) _queueSystemTokenVisualAnimation();
}

function _clearPendingSystemTokenVisualAnimation() {
  if (_systemTokenVisualAnimationFrame) cancelAnimationFrame(_systemTokenVisualAnimationFrame);
  _systemTokenVisualAnimationFrame = null;
}

function _refreshAllTokenScales() {
  if (!canvas?.tokens) return;
  if (!_sceneElevationClientEnabled()) {
    _resetAllTokenVisuals();
    return;
  }
  for (const t of canvas.tokens.placeables) _applyTokenScale(t);
}

function _queueTokenVisualRefresh() {
  if (!_sceneElevationClientEnabled()) {
    _resetAllTokenVisuals();
    return;
  }
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

function _queueRegionOverheadRefresh() {
  if (!_sceneElevationClientEnabled()) return;
  if (_regionOverheadRefreshFrame) return;
  if (!RegionElevationRenderer.instance.hasOverheadRegions()) return;
  _regionOverheadRefreshFrame = requestAnimationFrame(() => {
    _regionOverheadRefreshFrame = null;
    RegionElevationRenderer.instance.refreshOverheadVisibility();
  });
}

function _clearPendingRegionOverheadRefresh() {
  if (_regionOverheadRefreshFrame) cancelAnimationFrame(_regionOverheadRefreshFrame);
  _regionOverheadRefreshFrame = null;
}

function _queueOverheadRefreshForToken(token) {
  if (!_sceneElevationClientEnabled()) return;
  if (!token || !RegionElevationRenderer.instance.hasOverheadRegions()) return;
  const state = _tokenOverheadRefreshState(token);
  if (_tokenOverheadRefreshStates.get(token) === state) return;
  _tokenOverheadRefreshStates.set(token, state);
  _queueRegionOverheadRefresh();
}

function _tokenOverheadRefreshState(token) {
  const document = token.document;
  const live = safeTokenLivePoint(token, document);
  const x = finitePositionValue(live.x, 0);
  const y = finitePositionValue(live.y, 0);
  const width = finitePositionValue(document?.width, 1);
  const height = finitePositionValue(document?.height, 1);
  const documentElevation = Number(document?.elevation);
  const tokenElevation = Number(token.elevation);
  const elevation = Number.isFinite(documentElevation) && Number.isFinite(tokenElevation)
    ? Math.max(documentElevation, tokenElevation)
    : Number.isFinite(documentElevation) ? documentElevation : tokenElevation;
  return [document?.uuid ?? document?.id ?? "", _roundOverheadRefreshValue(x), _roundOverheadRefreshValue(y), width, height, elevation].join("|");
}

function _roundOverheadRefreshValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 2) / 2 : 0;
}

function _resetAllTokenVisuals() {
  if (!canvas?.tokens) return;
  for (const token of canvas.tokens.placeables) _resetTokenVisuals(token);
}

function _resetTokenVisuals(token) {
  _clearSystemTokenVisualState(token);
  const mesh = token?.mesh;
  if (mesh?._seBaseScaleX !== undefined && mesh?._seBaseScaleY !== undefined) mesh.scale?.set?.(mesh._seBaseScaleX, mesh._seBaseScaleY);
  if (mesh) {
    delete mesh._seBaseScaleX;
    delete mesh._seBaseScaleY;
    delete mesh._seLastFactor;
    delete mesh._seScaleCacheKey;
    delete mesh._seCachedParallaxOffset;
  }
  _clearNegativeRegionTokenVisibilityFloor(token);
  _tokenElevationSync.clearLiveTokenElevationOverride(token);
  _tokenParallax.clearTokenParallaxCaches(token);
}

Hooks.on("drawToken", (token) => {
  if (!_sceneElevationClientEnabled()) {
    _resetTokenVisuals(token);
    return;
  }
  // Clear stale mesh cache so the upcoming refreshToken re-caches from Foundry's finalized scale
  const m = token?.mesh;
  if (m) {
    _clearSystemTokenVisualState(token);
    delete m._seBaseScaleX;
    delete m._seBaseScaleY;
    delete m._seLastFactor;
    delete m._seScaleCacheKey;
    delete m._seCachedParallaxOffset;
  }
  _tokenParallax.clearTokenParallaxCaches(token);
  // Do NOT call _applyTokenScale here. At drawToken time PIXI mesh.scale is
  // still the default (1) — capturing it as the base would produce a wrong
  // baseline that gets locked behind the scale cache key. Foundry fires
  // refreshToken right after drawToken with mesh.scale at its natural
  // image-fit value; that is the correct moment to capture the base.
  _queueOverheadRefreshForToken(token);
});
Hooks.on("refreshToken", (token) => {
  if (!token || token.destroyed) return;
  const isPreviewClone = !isCanonicalSceneToken(token);
  if (isPreviewClone) _elevatedGrid.setDragToken(token);
  const uuid = token?.document?.uuid ?? token?.document?.id;
  if (uuid && _tokenElevationSync.isMovementPending(uuid)) {
    _tokenElevationSync.applyLiveTokenElevationOverride(token);
    // Foundry overwrites mesh.position to the live preview position every
    // refresh during animation/drag. Re-apply parallax against the live
    // position so the token image stays locked to the cursor instead of
    // snapping to the un-offset doc position for one frame.
    _tokenParallax.applyTokenParallaxOffset(token);
    return;
  }
  if (!isPreviewClone) _elevatedGrid.clearDragToken(token);
  _applyTokenScale(token);
  _tokenElevationSync.applyLiveTokenElevationOverride(token);
  _queueOverheadRefreshForToken(token);
});
Hooks.on("targetToken", (_user, token) => {
  if (!token) return;
  requestAnimationFrame(() => {
    const offset = _tokenParallax.tokenLiveParallaxOffset(token);
    _tokenParallax.clearTokenParallaxCaches(token, { restorePositions: !_tokenParallax.offsetIsEffectivelyZero(offset) });
    _applyTokenScale(token, { forceScale: true });
  });
});
Hooks.on("createToken", (document) => {
  if (!_sceneElevationClientEnabled()) return;
  if (document.parent !== canvas?.scene) return;
  void _tokenElevationSync.syncTokenElevation(document);
  _queueRegionOverheadRefresh();
  _elevatedGrid.queueRefresh();
});
Hooks.on("deleteToken", (document) => {
  if (document.parent && document.parent !== canvas?.scene) return;
  _elevatedGrid.clearTokenDocument(document);
  _queueRegionOverheadRefresh();
});
Hooks.on("hoverToken", (token, hovered) => {
  _elevatedGrid.setHoveredToken(token, hovered);
});
Hooks.on("controlToken", () => {
  _queueRegionOverheadRefresh();
  _elevatedGrid.queueRefresh();
});
Hooks.on("preUpdateToken", (document, change, options, userId) => {
  if (!_sceneElevationClientEnabled()) return;
  const hasMove = _tokenElevationSync.hasTokenMovementDelta(document, change);
  if (options) options[TOKEN_MOVEMENT_DELTA_OPTION] = hasMove;
  _tokenElevationSync.rememberUpdateMovementDelta(document, hasMove);
  const syncing = _tokenElevationSync.isSyncing(document);
  const strippedMovementElevation = _tokenElevationSync.stripMovementElevationChange(document, change);
  const hasElev = foundry.utils.hasProperty(change, "elevation");
  if (hasElev && !hasMove && !syncing) _tokenElevationSync.cancelPendingTokenElevationUpdate(document);
  const correctedElevation = _tokenElevationSync.correctMovementElevationChange(document, change);
  const json = (() => { try { return JSON.stringify(change); } catch { return "<unstringifiable>"; } })();
  const optJson = (() => { try { return JSON.stringify(Object.keys(options ?? {})); } catch { return ""; } })();
  if (hasElev && !hasMove) {
    debugLog("hook:preUpdateToken:ELEVATION-ONLY", document, { change: json, options: optJson, userId, syncing, currentElev: document.elevation, correctedElevation });
  } else {
    debugLog("hook:preUpdateToken", document, { changeKeys: Object.keys(change ?? {}), changeJson: json, hasMove, hasElev, syncing, strippedMovementElevation, correctedElevation });
  }
  if (!hasMove) return;
  _tokenElevationSync.markTokenMovementStarting(document);
});
Hooks.on("updateToken", (document, change, options) => {
  if (!_sceneElevationClientEnabled()) {
    _resetTokenVisuals(document.object);
    return;
  }
  const json = (() => { try { return JSON.stringify(change); } catch { return "<unstringifiable>"; } })();
  const hasMove = _tokenElevationSync.updateMovementDelta(document, change, options);
  debugLog("hook:updateToken", document, { changeKeys: Object.keys(change ?? {}), changeJson: json, hasMove, optionsKeys: Object.keys(options ?? {}) });
  if (document.parent !== canvas?.scene) return;
  if (hasMove) {
    _elevatedGrid.clearDragTokenForDocument(document);
    _queueRegionOverheadRefresh();
    _tokenElevationSync.queueTokenElevationAfterMovement(document, change, options);
    return;
  }
  if (foundry.utils.hasProperty(change, "elevation")) {
    debugLog("elevationChanged", document, { newElevation: change.elevation, syncing: _tokenElevationSync.isSyncing(document) });
    _queueRegionOverheadRefresh();
  }
  _applyTokenScale(document.object);
});
