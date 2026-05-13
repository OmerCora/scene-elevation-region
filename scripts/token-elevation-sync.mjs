import { SCENE_SETTING_KEYS, getSceneElevationSettingsSnapshot } from "./config.mjs";
import { debugLog } from "./debug.mjs";
import { getActiveElevationRegions } from "./region-elevation-renderer.mjs";
import { adjustSystemTokenElevationTarget } from "./systems/index.mjs";
import { highestTokenElevationState, tokenStillWithinMovementStartRegion } from "./token-elevation-state.mjs";
import { finitePositionValue, quantizeLivePosition, safeTokenLivePoint } from "./token-spatial-utils.mjs";

const TOKEN_ELEVATION_MIN_MOVEMENT_DELAY_MS = 250;
const TOKEN_ELEVATION_SETTLE_TIMEOUT_MS = 900;
const TOKEN_MOVEMENT_POSITION_EPSILON = 0.5;
const TOKEN_MOVEMENT_SIZE_EPSILON = 0.001;
export const TOKEN_MOVEMENT_DELTA_OPTION = "sceneElevationRegionHasMovementDelta";

export function createTokenElevationSyncController({
  isEnabled,
  applyTokenScale,
  queueOverheadRefreshForToken,
  elevatedGrid
} = {}) {
  const syncingTokenElevation = new Set();
  const pendingTokenElevationUpdates = new Map();
  const tokensWithPendingMovement = new Set();
  const tokenMovementStartStates = new Map();
  const tokenUpdateMovementDeltas = new Map();

  function enabled() {
    return isEnabled?.() === true;
  }

  function tokenUuid(tokenDocument) {
    return tokenDocument?.uuid ?? tokenDocument?.id;
  }

  function isMovementPending(tokenDocumentOrUuid) {
    const uuid = typeof tokenDocumentOrUuid === "string" ? tokenDocumentOrUuid : tokenUuid(tokenDocumentOrUuid);
    return !!uuid && tokensWithPendingMovement.has(uuid);
  }

  function movementStartState(tokenDocument) {
    return tokenMovementStartStates.get(tokenUuid(tokenDocument));
  }

  function highestState(tokenDocument, position = {}, options = {}) {
    return highestTokenElevationState(tokenDocument, position, { enabled: enabled(), ...options });
  }

  async function syncTokenElevation(tokenDocument, position = {}, options = {}) {
    if (!enabled()) return;
    if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return;
    if (!canUserModifyToken(tokenDocument)) return;
    const uuid = tokenUuid(tokenDocument);
    if (syncingTokenElevation.has(uuid)) return;

    const rawState = highestState(tokenDocument, position);
    if (rawState.skip) return;
    const current = Number(tokenDocument.elevation ?? 0);
    const state = stabilizeMovementElevationState(rawState, options.movementStart, tokenDocument, position);
    const target = adjustedTokenElevationTarget(tokenDocument, current, state, { rawState, position, movementStart: options.movementStart });
    debugLog("sync", tokenDocument, {
      pos: { x: tokenDocument.x, y: tokenDocument.y },
      samplePos: position,
      current,
      target,
      rawFound: rawState.found,
      rawElev: rawState.elevation,
      stabilizedFound: state.found,
      stabilizedElev: state.elevation,
      targetBeforeSystem: state.found ? state.elevation : 0,
      movementStart: options.movementStart?.state ? { found: options.movementStart.state.found, elevation: options.movementStart.state.elevation } : null
    });
    if (Math.abs(current - target) <= 0.001) return;
    syncingTokenElevation.add(uuid);
    try {
      const duration = tokenElevationAnimationDuration();
      debugLog("sync:write", tokenDocument, { from: current, to: target, duration });
      await tokenDocument.update({ elevation: target }, { animate: duration > 0, animation: { duration } });
      applyTokenScale?.(tokenDocument.object);
    } finally {
      syncingTokenElevation.delete(uuid);
    }
  }

  function adjustedTokenElevationTarget(tokenDocument, current, state, context = {}) {
    const target = state?.found ? Number(state.elevation ?? 0) : 0;
    const currentElevation = Number(current ?? tokenDocument?.elevation ?? 0);
    if (!Number.isFinite(target) || !Number.isFinite(currentElevation)) return target;
    return adjustSystemTokenElevationTarget({
      tokenDocument,
      current: currentElevation,
      target,
      state,
      ...context
    });
  }

  function queueTokenElevationAfterMovement(tokenDocument, change = {}, options = {}) {
    if (!enabled()) return;
    if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return;
    const uuid = tokenUuid(tokenDocument);
    const pending = pendingTokenElevationUpdates.get(uuid);
    if (pending) cancelAnimationFrame(pending.frame);
    tokensWithPendingMovement.add(uuid);
    const finalPosition = tokenMovementPosition(tokenDocument, change);
    void promoteNegativeTokenElevationForVisibleMovement(tokenDocument, finalPosition);

    const immediateToken = tokenDocument.object;
    queueOverheadRefreshForToken?.(immediateToken);
    if (immediateToken && !movementChangesTokenElevation(tokenDocument, finalPosition)) {
      applyTokenScale?.(immediateToken, { forceScale: true });
    }

    const started = performance.now();
    const sceneId = canvas.scene.id;
    const animationDuration = tokenMovementAnimationDuration(options);
    const waitForMovement = () => {
      if (!canvas?.scene || canvas.scene.id !== sceneId || tokenDocument.parent !== canvas.scene) {
        pendingTokenElevationUpdates.delete(uuid);
        tokensWithPendingMovement.delete(uuid);
        tokenMovementStartStates.delete(uuid);
        elevatedGrid?.clearDragTokenForDocument?.(tokenDocument);
        return;
      }
      const elapsed = performance.now() - started;
      const waitingForAnimation = elapsed < animationDuration;
      const waitingForPosition = !tokenMovementSettled(tokenDocument) && elapsed < TOKEN_ELEVATION_SETTLE_TIMEOUT_MS;
      if (waitingForAnimation || waitingForPosition) {
        const frame = requestAnimationFrame(waitForMovement);
        pendingTokenElevationUpdates.set(uuid, { frame });
        return;
      }
      pendingTokenElevationUpdates.delete(uuid);
      tokensWithPendingMovement.delete(uuid);
      elevatedGrid?.clearDragTokenForDocument?.(tokenDocument);
      queueOverheadRefreshForToken?.(tokenDocument.object);
      const movementStart = tokenMovementStartStates.get(uuid);
      void syncTokenElevation(tokenDocument, finalPosition, { movementStart }).finally(() => {
        if (tokenMovementStartStates.get(uuid) === movementStart) tokenMovementStartStates.delete(uuid);
      });
    };
    const frame = requestAnimationFrame(waitForMovement);
    pendingTokenElevationUpdates.set(uuid, { frame });
  }

  function stabilizeMovementElevationState(state, movementStart, tokenDocument, position = {}) {
    const startState = movementStart?.state;
    if (!startState?.found || state.found) return state;
    return tokenStillWithinMovementStartRegion(tokenDocument, position, startState) ? startState : state;
  }

  function movementChangesTokenElevation(tokenDocument, position = {}) {
    const rawState = highestState(tokenDocument, position);
    if (rawState.skip) return false;
    const state = stabilizeMovementElevationState(rawState, tokenMovementStartStates.get(tokenUuid(tokenDocument)), tokenDocument, position);
    const current = Number(tokenDocument.elevation ?? 0);
    const target = adjustedTokenElevationTarget(tokenDocument, current, state, { rawState, position });
    return Number.isFinite(current) && Number.isFinite(target) && Math.abs(current - target) > 0.001;
  }

  async function promoteNegativeTokenElevationForVisibleMovement(tokenDocument, position = {}) {
    if (!enabled()) return;
    const uuid = tokenUuid(tokenDocument);
    if (!uuid || syncingTokenElevation.has(uuid)) return;
    if (!canUserModifyToken(tokenDocument)) return;
    const current = Number(tokenDocument.elevation ?? 0);
    if (!Number.isFinite(current) || current >= -0.001) return;
    const state = highestState(tokenDocument, position);
    if (state.skip) return;
    const target = adjustedTokenElevationTarget(tokenDocument, current, state, { rawState: state, position, movementStart: tokenMovementStartStates.get(uuid) });
    if (!Number.isFinite(target) || target < -0.001) return;
    syncingTokenElevation.add(uuid);
    try {
      await tokenDocument.update({ elevation: target }, { animation: { duration: 0 } });
      applyTokenScale?.(tokenDocument.object, { forceScale: true });
    } finally {
      syncingTokenElevation.delete(uuid);
    }
  }

  function stripMovementElevationChange(tokenDocument, change = {}) {
    if (!enabled()) return null;
    if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return null;
    if (!hasTokenMovementDelta(tokenDocument, change) || !foundry.utils.hasProperty(change, "elevation")) return null;
    const uuid = tokenUuid(tokenDocument);
    if (!uuid || syncingTokenElevation.has(uuid)) return null;
    const requested = Number(change.elevation ?? 0);
    if (!Number.isFinite(requested) || Math.abs(requested) > 0.001) return null;
    const stripped = {
      requested,
      current: Number(tokenDocument.elevation ?? 0),
      changeKeys: Object.keys(change ?? {})
    };
    delete change.elevation;
    debugLog("movementElevationStripped", tokenDocument, stripped);
    return stripped;
  }

  function correctMovementElevationChange(tokenDocument, change = {}) {
    if (!enabled()) return null;
    if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return null;
    if (!foundry.utils.hasProperty(change, "elevation")) return null;
    const uuid = tokenUuid(tokenDocument);
    if (!uuid || syncingTokenElevation.has(uuid)) return null;
    const hasMove = hasTokenMovementChange(change);
    if (hasMove || !tokensWithPendingMovement.has(uuid)) return null;
    const requested = Number(change.elevation ?? 0);
    const current = Number(tokenDocument.elevation ?? 0);
    if (!Number.isFinite(requested) || !Number.isFinite(current)) return null;
    const startState = tokenMovementStartStates.get(uuid)?.state ?? highestState(tokenDocument);
    const position = tokenMovementPosition(tokenDocument, change);
    const rawState = highestState(tokenDocument, position);
    if (rawState.skip) return null;
    const state = stabilizeMovementElevationState(rawState, { state: startState }, tokenDocument, position);
    const expected = adjustedTokenElevationTarget(tokenDocument, current, state, { rawState, position, movementStart: { state: startState } });
    if (!Number.isFinite(expected) || Math.abs(requested - expected) <= 0.001) return null;
    change.elevation = expected;
    const correction = {
      requested,
      expected,
      current,
      hasMove,
      position,
      startFound: startState?.found ?? false,
      startElevation: startState?.elevation ?? 0,
      rawFound: rawState.found,
      rawElevation: rawState.elevation,
      stabilizedFound: state.found,
      stabilizedElevation: state.elevation
    };
    debugLog("movementElevationCorrected", tokenDocument, correction);
    return correction;
  }

  function markTokenMovementStarting(tokenDocument) {
    if (!enabled()) return;
    if (!canvas?.scene || tokenDocument?.parent !== canvas.scene) return;
    const uuid = tokenUuid(tokenDocument);
    if (!uuid) return;
    const startState = highestState(tokenDocument);
    debugLog("moveStart", tokenDocument, { pos: { x: tokenDocument.x, y: tokenDocument.y }, currentElev: tokenDocument.elevation, startStateFound: startState.found, startStateElev: startState.elevation });
    tokenMovementStartStates.set(uuid, { state: startState });
    tokensWithPendingMovement.add(uuid);
    requestAnimationFrame(() => {
      if (pendingTokenElevationUpdates.has(uuid)) return;
      requestAnimationFrame(() => {
        if (pendingTokenElevationUpdates.has(uuid)) return;
        tokensWithPendingMovement.delete(uuid);
        tokenMovementStartStates.delete(uuid);
        elevatedGrid?.clearDragTokenForDocument?.(tokenDocument);
      });
    });
  }

  function hasTokenMovementChange(change = {}) {
    return foundry.utils.hasProperty(change, "x")
      || foundry.utils.hasProperty(change, "y")
      || foundry.utils.hasProperty(change, "width")
      || foundry.utils.hasProperty(change, "height");
  }

  function hasTokenMovementDelta(tokenDocument, change = {}) {
    if (!tokenDocument || !hasTokenMovementChange(change)) return false;
    return movementPropertyChanged(change, "x", tokenDocument.x, TOKEN_MOVEMENT_POSITION_EPSILON)
      || movementPropertyChanged(change, "y", tokenDocument.y, TOKEN_MOVEMENT_POSITION_EPSILON)
      || movementPropertyChanged(change, "width", tokenDocument.width, TOKEN_MOVEMENT_SIZE_EPSILON)
      || movementPropertyChanged(change, "height", tokenDocument.height, TOKEN_MOVEMENT_SIZE_EPSILON);
  }

  function movementPropertyChanged(change, key, current, epsilon) {
    if (!foundry.utils.hasProperty(change, key)) return false;
    const next = finitePositionValue(change[key], current ?? 0);
    const previous = finitePositionValue(current, 0);
    return Math.abs(next - previous) > epsilon;
  }

  function tokenMovementPosition(tokenDocument, change = {}) {
    return {
      x: foundry.utils.hasProperty(change, "x") ? finitePositionValue(change.x, tokenDocument.x ?? 0) : finitePositionValue(tokenDocument.x, 0),
      y: foundry.utils.hasProperty(change, "y") ? finitePositionValue(change.y, tokenDocument.y ?? 0) : finitePositionValue(tokenDocument.y, 0),
      width: foundry.utils.hasProperty(change, "width") ? finitePositionValue(change.width, tokenDocument.width ?? 1) : finitePositionValue(tokenDocument.width, 1),
      height: foundry.utils.hasProperty(change, "height") ? finitePositionValue(change.height, tokenDocument.height ?? 1) : finitePositionValue(tokenDocument.height, 1)
    };
  }

  function tokenMovementAnimationDuration(options = {}) {
    const duration = Number(options.animation?.duration ?? options.animate?.duration ?? 0);
    return Number.isFinite(duration) && duration > 0 ? Math.min(duration, TOKEN_ELEVATION_SETTLE_TIMEOUT_MS) : TOKEN_ELEVATION_MIN_MOVEMENT_DELAY_MS;
  }

  function tokenElevationAnimationDuration() {
    const sceneSettings = getSceneElevationSettingsSnapshot(canvas?.scene);
    return Math.clamp(Number(sceneSettings[SCENE_SETTING_KEYS.TOKEN_ELEVATION_ANIMATION_MS] ?? 120), 0, 600);
  }

  function tokenMovementSettled(tokenDocument) {
    const token = tokenDocument.object;
    if (!token) return true;
    return !tokenObjectOutOfSyncWithDocument(token);
  }

  function tokenObjectOutOfSyncWithDocument(token) {
    const tokenDocument = token?.document;
    if (!tokenDocument) return false;
    if (token.destroyed) return false;
    const live = safeTokenLivePoint(token, tokenDocument);
    return Math.abs(live.x - Number(tokenDocument.x ?? 0)) >= 0.5 || Math.abs(live.y - Number(tokenDocument.y ?? 0)) >= 0.5;
  }

  function clearPendingTokenElevationUpdates() {
    for (const pending of pendingTokenElevationUpdates.values()) cancelAnimationFrame(pending.frame);
    pendingTokenElevationUpdates.clear();
    tokensWithPendingMovement.clear();
    tokenMovementStartStates.clear();
    tokenUpdateMovementDeltas.clear();
    elevatedGrid?.clearDragToken?.();
    elevatedGrid?.queueRefresh?.();
  }

  function cancelPendingTokenElevationUpdate(tokenDocument) {
    const uuid = tokenUuid(tokenDocument);
    if (!uuid) return;
    const pending = pendingTokenElevationUpdates.get(uuid);
    if (pending) cancelAnimationFrame(pending.frame);
    pendingTokenElevationUpdates.delete(uuid);
    tokensWithPendingMovement.delete(uuid);
    tokenMovementStartStates.delete(uuid);
    elevatedGrid?.clearDragTokenForDocument?.(tokenDocument);
  }

  async function refreshAllTokenElevations() {
    if (!enabled()) return;
    if (!canvas?.tokens) return;
    await Promise.all(canvas.tokens.placeables.map(token => syncTokenElevation(token.document)));
  }

  function applyLiveTokenElevationOverride(token) {
    if (!enabled()) {
      clearLiveTokenElevationOverride(token);
      return;
    }
    const mesh = token?.mesh;
    const tokenDocument = token?.document;
    if (!mesh || mesh.destroyed || !tokenDocument || !canvas?.scene || tokenDocument.parent !== canvas.scene) return;
    if (token.destroyed) return;
    const live = safeTokenLivePoint(token, tokenDocument);
    const gridSize = canvas?.grid?.size ?? canvas?.scene?.grid?.size ?? 100;
    const liveX = quantizeLivePosition(live.x, gridSize);
    const liveY = quantizeLivePosition(live.y, gridSize);
    const documentElevation = Number(tokenDocument.elevation ?? 0);
    const activeEntries = getActiveElevationRegions(canvas.scene);
    if (!activeEntries.length) {
      if (mesh._seElevationOverride !== undefined) clearLiveTokenElevationOverride(token);
      mesh._seLiveOverrideX = liveX;
      mesh._seLiveOverrideY = liveY;
      mesh._seLiveOverrideDocElev = documentElevation;
      mesh._seLiveOverrideEntriesRef = activeEntries;
      return;
    }
    if (
      mesh._seLiveOverrideEntriesRef === activeEntries
      && mesh._seLiveOverrideX === liveX
      && mesh._seLiveOverrideY === liveY
      && mesh._seLiveOverrideDocElev === documentElevation
      && mesh._seElevationOverrideHoldUntil === undefined
    ) return;
    mesh._seLiveOverrideX = liveX;
    mesh._seLiveOverrideY = liveY;
    mesh._seLiveOverrideDocElev = documentElevation;
    mesh._seLiveOverrideEntriesRef = activeEntries;
    const state = highestState(tokenDocument, { x: liveX, y: liveY });
    if (state.skip) {
      clearLiveTokenElevationOverride(token);
      return;
    }
    const liveRegionElevation = state.found ? Number(state.elevation ?? 0) : 0;
    const target = Math.max(
      Number.isFinite(documentElevation) ? documentElevation : 0,
      Number.isFinite(liveRegionElevation) ? liveRegionElevation : 0
    );
    if (target <= documentElevation + 0.001) {
      if (mesh._seElevationOverride !== undefined) {
        const now = performance.now();
        const holdUntil = mesh._seElevationOverrideHoldUntil
          ?? now + Math.max(tokenElevationAnimationDuration(), 0) + 80;
        mesh._seElevationOverrideHoldUntil = holdUntil;
        if (now < holdUntil) {
          setLiveTokenElevationOverride(token, tokenCurrentSortElevation(token), { preserveHold: true });
          scheduleLiveTokenElevationOverrideHold(token);
          return;
        }
      }
      clearLiveTokenElevationOverride(token);
      return;
    }
    setLiveTokenElevationOverride(token, target);
  }

  function setLiveTokenElevationOverride(token, target, { preserveHold = false } = {}) {
    const mesh = token?.mesh;
    if (!mesh) return;
    if (!preserveHold && mesh._seElevationOverrideHoldUntil !== undefined) delete mesh._seElevationOverrideHoldUntil;
    if (mesh._seElevationOverride !== undefined && Math.abs((mesh._seElevationOverride ?? 0) - target) <= 0.001 && Math.abs(Number(mesh.elevation ?? 0) - target) <= 0.001) return;
    mesh._seElevationOverride = target;
    mesh.elevation = target;
    if (canvas.primary) canvas.primary.sortDirty = true;
  }

  function scheduleLiveTokenElevationOverrideHold(token) {
    const mesh = token?.mesh;
    if (!mesh || mesh._seElevationOverrideFrame) return;
    mesh._seElevationOverrideFrame = requestAnimationFrame(() => {
      mesh._seElevationOverrideFrame = null;
      applyLiveTokenElevationOverride(token);
    });
  }

  function clearLiveTokenElevationOverride(token) {
    const mesh = token?.mesh;
    if (!mesh || mesh._seElevationOverride === undefined) return;
    if (mesh._seElevationOverrideFrame) cancelAnimationFrame(mesh._seElevationOverrideFrame);
    mesh.elevation = tokenCurrentSortElevation(token);
    delete mesh._seElevationOverride;
    delete mesh._seElevationOverrideHoldUntil;
    delete mesh._seElevationOverrideFrame;
    if (canvas.primary) canvas.primary.sortDirty = true;
  }

  function tokenCurrentSortElevation(token) {
    const documentElevation = Number(token?.document?.elevation);
    const tokenElevation = Number(token?.elevation);
    if (Number.isFinite(documentElevation) && Number.isFinite(tokenElevation)) return Math.max(documentElevation, tokenElevation);
    if (Number.isFinite(documentElevation)) return documentElevation;
    if (Number.isFinite(tokenElevation)) return tokenElevation;
    return 0;
  }

  function canUserModifyToken(tokenDocument) {
    const user = game.user;
    if (!user || !tokenDocument) return false;
    try {
      return tokenDocument.canUserModify(user, "update");
    } catch (err) {
      return user.isGM === true;
    }
  }

  function rememberUpdateMovementDelta(tokenDocument, hasMove) {
    const uuid = tokenUuid(tokenDocument);
    if (uuid) tokenUpdateMovementDeltas.set(uuid, hasMove);
  }

  function updateMovementDelta(tokenDocument, change, options) {
    const uuid = tokenUuid(tokenDocument);
    const hasTrackedMovementDelta = uuid && tokenUpdateMovementDeltas.has(uuid);
    const hasMove = hasTrackedMovementDelta ? tokenUpdateMovementDeltas.get(uuid) : (options?.[TOKEN_MOVEMENT_DELTA_OPTION] ?? hasTokenMovementChange(change));
    if (hasTrackedMovementDelta) tokenUpdateMovementDeltas.delete(uuid);
    return hasMove;
  }

  return {
    adjustedTokenElevationTarget,
    applyLiveTokenElevationOverride,
    cancelPendingTokenElevationUpdate,
    clearLiveTokenElevationOverride,
    clearPendingTokenElevationUpdates,
    correctMovementElevationChange,
    hasTokenMovementChange,
    hasTokenMovementDelta,
    highestState,
    isMovementPending,
    isSyncing: tokenDocument => syncingTokenElevation.has(tokenUuid(tokenDocument)),
    markTokenMovementStarting,
    movementStartState,
    queueTokenElevationAfterMovement,
    refreshAllTokenElevations,
    rememberUpdateMovementDelta,
    stabilizeMovementElevationState,
    stripMovementElevationChange,
    syncTokenElevation,
    tokenMovementPosition,
    updateMovementDelta
  };
}
