import { MODULE_ID, SETTINGS, LOD_THRESHOLD_DEFAULT, sceneGeometry } from "./config.mjs";
import { ElevationData } from "./elevation-data.mjs";
import { ElevationMesh } from "./elevation-mesh.mjs";
import { BrushTool } from "./tools/brush-tool.mjs";
import { EyedropperTool } from "./tools/eyedropper-tool.mjs";
import { BrushPalette } from "./ui/brush-palette.mjs";

/**
 * Custom canvas layer for the elevation overlay + tool interaction.
 *
 * The layer extends InteractionLayer so it can be registered via
 * CONFIG.Canvas.layers and have a scene control button bound to it. Foundry
 * automatically activates the layer when the elevation scene control group is
 * selected.
 *
 * Implementation notes:
 *  - Overlay drawing uses the same parent-local coordinate space as
 *    canvas.primary.background. Each half-grid point is positioned at
 *    (backgroundX + hx*halfGs, backgroundY + hy*halfGs), which avoids double
 *    applying Foundry's scene padding.
 *  - All pointer events are bound directly to canvas.stage while the layer
 *    is active. This bypasses Foundry's InteractionLayer drag-state machine
 *    and avoids issues where painting drags don't fire move events.
 *  - The mesh is told to refresh whenever paint changes anything.
 */
export class ElevationLayer extends foundry.canvas.layers.InteractionLayer {
  static LAYER_NAME = "elevation";

  static get layerOptions() {
    return foundry.utils.mergeObject(super.layerOptions, {
      name: this.LAYER_NAME,
      baseClass: foundry.canvas.layers.InteractionLayer,
      zIndex: 700
    });
  }

  constructor() {
    super();
    /** @type {PIXI.Container|null} */ this.overlay = null;
    /** @type {PIXI.Graphics|null} */  this.dots = null;
    /** @type {PIXI.Container|null} */ this.labels = null;
    /** @type {PIXI.Graphics|null} */  this.cursor = null;
    /** @type {string|null} */         this._activeTool = null;
    this._painting = false;
    this._listeners = null;
    this._lastRenderKey = null;
    this._panRaf = null;
  }

  /* -------------------------------------- */
  /*  Scene origin helper                    */
  /* -------------------------------------- */

  /** Top-left of the scene image in world coords (handles padding). */
  _sceneGeometry() {
    return sceneGeometry(canvas.scene);
  }

  /* -------------------------------------- */
  /*  Lifecycle                              */
  /* -------------------------------------- */

  async _draw(options) {
    await super._draw?.(options);
    this.eventMode = "none"; // we use stage events instead of layer hit testing

    const parent = canvas.primary ?? this;
    parent.sortableChildren = true;
    this.overlay = parent.addChild(new PIXI.Container());
    this.overlay.eventMode = "none";
    this.overlay.zIndex = 10_000;
    this.dots = this.overlay.addChild(new PIXI.Graphics());
    this.labels = this.overlay.addChild(new PIXI.Container());

    this.cursor = parent.addChild(new PIXI.Graphics());
    this.cursor.eventMode = "none";
    this.cursor.zIndex = 10_001;

    this.overlay.visible = false;
    this.cursor.visible = false;
    this._lastRenderKey = null;
  }

  async _tearDown(options) {
    this._unbindStageListeners();
    this.overlay?.parent?.removeChild(this.overlay);
    this.cursor?.parent?.removeChild(this.cursor);
    this.overlay?.destroy({ children: true });
    this.cursor?.destroy();
    this.overlay = this.dots = this.labels = this.cursor = null;
    return super._tearDown?.(options);
  }

  /* -------------------------------------- */
  /*  Tool activation (called from module)   */
  /* -------------------------------------- */

  activateTool(toolName) {
    this._activeTool = toolName;
    const visible = !!toolName;
    if (this.overlay) this.overlay.visible = visible;
    if (this.cursor) this.cursor.visible = visible;
    if (visible) {
      this._bindStageListeners();
      this._renderOverlay(true);
    } else {
      this._unbindStageListeners();
      this.cursor?.clear();
    }
  }

  deactivate() {
    this.activateTool(null);
    return super.deactivate?.();
  }

  /* -------------------------------------- */
  /*  Stage event binding                    */
  /* -------------------------------------- */

  _bindStageListeners() {
    if (this._listeners) return;
    const stage = canvas.stage;
    if (!stage) return;
    const onMove = (event) => this._onStagePointerMove(event);
    const onDown = (event) => this._onStagePointerDown(event);
    const onUp   = (event) => this._onStagePointerUp(event);
    stage.on("pointermove", onMove);
    stage.on("pointerdown", onDown);
    stage.on("pointerup", onUp);
    stage.on("pointerupoutside", onUp);
    this._listeners = { onMove, onDown, onUp };
  }

  _unbindStageListeners() {
    const stage = canvas.stage;
    if (!stage || !this._listeners) {
      this._listeners = null;
      return;
    }
    const { onMove, onDown, onUp } = this._listeners;
    stage.off("pointermove", onMove);
    stage.off("pointerdown", onDown);
    stage.off("pointerup", onUp);
    stage.off("pointerupoutside", onUp);
    this._listeners = null;
    this._painting = false;
  }

  /** Pointer position in the same local coordinate space as overlay/cursor. */
  _worldPos(event) {
    const parent = this.overlay?.parent ?? canvas.stage;
    // PIXI v7 FederatedPointerEvent has getLocalPosition directly.
    // Older event objects keep it under .data.
    if (typeof event.getLocalPosition === "function") {
      return event.getLocalPosition(parent);
    }
    return event.data.getLocalPosition(parent);
  }

  _pointerButton(event) {
    return event.button ?? event.data?.button ?? 0;
  }

  /* -------------------------------------- */
  /*  Pointer handlers                       */
  /* -------------------------------------- */

  _onStagePointerMove(event) {
    if (!this._activeTool || !canvas?.scene) return;
    const wp = this._worldPos(event);
    this._drawCursor(wp.x, wp.y);
    if (this._painting && this._activeTool === "brush") {
      const geo = this._sceneGeometry();
      if (BrushTool.instance.stamp(canvas.scene, wp.x - geo.x, wp.y - geo.y)) {
        this._afterPaint();
      }
    }
  }

  _onStagePointerDown(event) {
    if (!this._activeTool || !canvas?.scene) return;
    if (this._pointerButton(event) !== 0) return; // left only
    const wp = this._worldPos(event);
    const geo = this._sceneGeometry();
    const lx = wp.x - geo.x, ly = wp.y - geo.y;
    if (this._activeTool === "eyedropper") {
      const v = EyedropperTool.instance.pick(canvas.scene, lx, ly);
      if (v !== null) {
        BrushPalette._instance?.refreshHeight?.();
        ui.notifications.info(game.i18n.format("SCENE_ELEVATION.Notify.Picked", { value: v.toFixed(2) }));
      }
      return;
    }
    if (this._activeTool === "brush") {
      this._painting = true;
      BrushTool.instance.beginStroke();
      if (BrushTool.instance.stamp(canvas.scene, lx, ly)) this._afterPaint();
    }
  }

  async _onStagePointerUp(event) {
    if (!this._painting) return;
    this._painting = false;
    if (this._activeTool === "brush") {
      await BrushTool.instance.endStroke(canvas.scene);
      this._afterPaint();
    }
  }

  _afterPaint() {
    ElevationData.get(canvas.scene)?.invalidateComposite();
    ElevationMesh.instance?.update();
    this._renderOverlay(true);
  }

  /* -------------------------------------- */
  /*  Overlay rendering (LOD + culling)      */
  /* -------------------------------------- */

  _lodTier(scale) {
    const threshold = game.settings.get(MODULE_ID, SETTINGS.LOD_THRESHOLD) ?? LOD_THRESHOLD_DEFAULT;
    if (scale >= threshold) return 2;
    if (scale >= threshold * 0.4) return 1;
    return 0;
  }

  _sparseStep(scale) {
    if (scale < 0.1) return 8;
    if (scale < 0.2) return 4;
    return 2;
  }

  _renderOverlay(force = false) {
    if (!this.overlay || !canvas?.scene) return;
    const data = ElevationData.get(canvas.scene);
    if (!data) return;
    if (data._compositeDirty) data.rebuildComposite();

    const stage = canvas.stage;
    const scale = stage.scale.x;
    const tier = this._lodTier(scale);
    const sparseStep = tier === 0 ? this._sparseStep(scale) : 1;
    const showLabels = scale >= 0.35;

    // Visible camera rect in the overlay parent's local coordinates.
    const parent = this.overlay.parent ?? canvas.stage;
    const screen = canvas.app.renderer.screen;
    const topLeft = parent.toLocal(new PIXI.Point(screen.x ?? 0, screen.y ?? 0));
    const bottomRight = parent.toLocal(new PIXI.Point((screen.x ?? 0) + screen.width, (screen.y ?? 0) + screen.height));
    const viewMinX = Math.min(topLeft.x, bottomRight.x);
    const viewMinY = Math.min(topLeft.y, bottomRight.y);
    const viewMaxX = Math.max(topLeft.x, bottomRight.x);
    const viewMaxY = Math.max(topLeft.y, bottomRight.y);

    const geo = this._sceneGeometry();
    const ox = geo.x, oy = geo.y;

    // Cache key — skip rebuild on minor pans within the same view.
    const key = `${tier}|${sparseStep}|${showLabels ? 1 : 0}|` +
                `${Math.round(viewMinX)}|${Math.round(viewMinY)}|` +
                `${Math.round(viewMaxX)}|${Math.round(viewMaxY)}|${ox}|${oy}|${geo.cols}|${geo.rows}`;
    if (!force && key === this._lastRenderKey) return;
    this._lastRenderKey = key;

    const g = this.dots;
    g.clear();
    while (this.labels.children.length) this.labels.removeChildAt(0).destroy();

    const halfGs = geo.gridSize / 2;
    const dotR = Math.max(2, 3 / scale);
    const labelFontPx = 11;
    const labelInvScale = 1 / scale;

    const localMinX = viewMinX - ox;
    const localMinY = viewMinY - oy;
    const localMaxX = viewMaxX - ox;
    const localMaxY = viewMaxY - oy;

    if (tier === 2) {
      const minHx = Math.max(0, Math.floor(localMinX / halfGs) - 1);
      const maxHx = Math.min(data.hCols - 1, Math.ceil(localMaxX / halfGs) + 1);
      const minHy = Math.max(0, Math.floor(localMinY / halfGs) - 1);
      const maxHy = Math.min(data.hRows - 1, Math.ceil(localMaxY / halfGs) + 1);
      for (let hy = minHy; hy <= maxHy; hy++) {
        for (let hx = minHx; hx <= maxHx; hx++) {
          const v = data.getH(hx, hy);
          const x = ox + hx * halfGs;
          const y = oy + hy * halfGs;
          this._drawDot(g, x, y, dotR, v);
          if (showLabels) this._drawLabel(x, y, v, labelFontPx, labelInvScale);
        }
      }
    } else if (tier === 1) {
      const gs = geo.gridSize;
      const minCx = Math.max(0, Math.floor(localMinX / gs) - 1);
      const maxCx = Math.min(data.cols - 1, Math.ceil(localMaxX / gs) + 1);
      const minCy = Math.max(0, Math.floor(localMinY / gs) - 1);
      const maxCy = Math.min(data.rows - 1, Math.ceil(localMaxY / gs) + 1);
      for (let cy = minCy; cy <= maxCy; cy++) {
        for (let cx = minCx; cx <= maxCx; cx++) {
          const avg = data.cellAverage(cx, cy);
          const x = ox + (cx * 2 + 1) * halfGs;
          const y = oy + (cy * 2 + 1) * halfGs;
          this._drawDot(g, x, y, dotR, avg);
          if (showLabels) this._drawLabel(x, y, avg, labelFontPx, labelInvScale);
        }
      }
    } else {
      const gs = geo.gridSize;
      const step = sparseStep;
      const minCx = Math.max(0, Math.floor(localMinX / gs / step) * step);
      const maxCx = Math.min(data.cols - 1, Math.ceil(localMaxX / gs));
      const minCy = Math.max(0, Math.floor(localMinY / gs / step) * step);
      const maxCy = Math.min(data.rows - 1, Math.ceil(localMaxY / gs));
      for (let cy = minCy; cy <= maxCy; cy += step) {
        for (let cx = minCx; cx <= maxCx; cx += step) {
          const avg = data.cellAverage(cx, cy);
          const x = ox + (cx * 2 + 1) * halfGs;
          const y = oy + (cy * 2 + 1) * halfGs;
          this._drawDot(g, x, y, dotR, avg);
        }
      }
    }
  }

  _drawDot(g, x, y, r, value) {
    const color = value === 0 ? 0x33ff66 : (value > 0 ? 0x66ff33 : 0xff6633);
    g.beginFill(color, 0.9);
    g.lineStyle(1 / canvas.stage.scale.x, 0x003300, 0.6);
    g.drawCircle(x, y, r);
    g.endFill();
  }

  _drawLabel(x, y, value, fontPx, invScale) {
    const txt = new PIXI.Text(value.toFixed(1), {
      fontFamily: "Arial", fontSize: fontPx,
      fill: 0xffffff, stroke: 0x000000, strokeThickness: 3
    });
    txt.scale.set(invScale);
    txt.anchor.set(0, 0.5);
    txt.position.set(x + 5 * invScale, y);
    this.labels.addChild(txt);
  }

  _drawCursor(x, y) {
    const c = this.cursor;
    if (!c) return;
    c.clear();
    if (this._activeTool === "brush") {
      const radius = BrushTool.instance.size * this._sceneGeometry().gridSize;
      c.lineStyle(2 / canvas.stage.scale.x, 0x33ff66, 0.9);
      c.drawCircle(x, y, radius);
      const inner = radius * (1 - BrushTool.instance.fade / 100);
      if (inner > 1) {
        c.lineStyle(1 / canvas.stage.scale.x, 0x33ff66, 0.5);
        c.drawCircle(x, y, inner);
      }
    } else if (this._activeTool === "eyedropper") {
      const r = this._sceneGeometry().gridSize / 2;
      c.lineStyle(2 / canvas.stage.scale.x, 0x33ccff, 0.9);
      c.drawCircle(x, y, r);
      c.moveTo(x - r, y); c.lineTo(x + r, y);
      c.moveTo(x, y - r); c.lineTo(x, y + r);
    }
  }

  /** Throttled redraw on pan/zoom. */
  onPan() {
    if (!this.overlay?.visible) return;
    if (this._panRaf) return;
    this._panRaf = requestAnimationFrame(() => {
      this._panRaf = null;
      this._renderOverlay(false);
    });
  }
}
