import { MODULE_ID, SETTINGS, LOD_THRESHOLD_DEFAULT } from "./config.mjs";
import { ElevationData } from "./elevation-data.mjs";
import { BrushTool } from "./tools/brush-tool.mjs";
import { EyedropperTool } from "./tools/eyedropper-tool.mjs";
import { BrushPalette } from "./ui/brush-palette.mjs";

/**
 * Custom canvas layer that:
 *   - Renders the elevation overlay (green dots + numeric labels) when an
 *     elevation scene control tool is active.
 *   - Hosts pointer interaction for the active tool (brush, eyedropper).
 *   - Switches between dense (9-point) and sparse (1-point/cell) overlay
 *     based on canvas zoom (LOD).
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
    this.overlay = null;
    this.dots = null;
    this.labels = null;
    this.cursor = null;
    this._activeTool = null;
    this._painting = false;
    this._dense = true;
  }

  async _draw(options) {
    await super._draw?.(options);
    this.eventMode = "static";
    this.overlay = this.addChild(new PIXI.Container());
    this.overlay.eventMode = "none";
    this.dots = this.overlay.addChild(new PIXI.Graphics());
    this.labels = this.overlay.addChild(new PIXI.Container());
    this.cursor = this.addChild(new PIXI.Graphics());
    this.cursor.eventMode = "none";
    this.overlay.visible = false;
    this.cursor.visible = false;
    this._renderOverlay();
  }

  async _tearDown(options) {
    this.overlay?.destroy({ children: true });
    this.cursor?.destroy();
    this.overlay = this.dots = this.labels = this.cursor = null;
    return super._tearDown?.(options);
  }

  /* -------------------------------------- */
  /*  Tool activation                        */
  /* -------------------------------------- */

  activateTool(toolName) {
    this._activeTool = toolName;
    const visible = !!toolName;
    if (this.overlay) this.overlay.visible = visible;
    if (this.cursor) this.cursor.visible = visible;
    if (visible) this._renderOverlay();
  }

  deactivate() {
    this._activeTool = null;
    if (this.overlay) this.overlay.visible = false;
    if (this.cursor) this.cursor.visible = false;
  }

  /* -------------------------------------- */
  /*  Overlay rendering (LOD-aware)          */
  /* -------------------------------------- */

  _renderOverlay() {
    if (!this.overlay || !canvas?.scene) return;
    const data = ElevationData.get(canvas.scene);
    if (!data) return;
    const threshold = game.settings.get(MODULE_ID, SETTINGS.LOD_THRESHOLD) ?? LOD_THRESHOLD_DEFAULT;
    const scale = canvas.stage.scale.x;
    const dense = scale >= threshold;
    this._dense = dense;

    const g = this.dots;
    g.clear();
    this.labels.removeChildren().forEach(c => c.destroy());

    const halfGs = canvas.grid.size / 2;
    const dotR = Math.max(2, 3 / scale);

    if (dense) {
      for (let hy = 0; hy < data.hRows; hy++) {
        for (let hx = 0; hx < data.hCols; hx++) {
          const v = data.getH(hx, hy);
          const { x, y } = data.hToWorld(hx, hy);
          this._drawDot(g, x, y, dotR, v);
          this._drawLabel(x, y, v, scale);
        }
      }
    } else {
      for (let cy = 0; cy < data.rows; cy++) {
        for (let cx = 0; cx < data.cols; cx++) {
          const avg = data.cellAverage(cx, cy);
          const x = (cx * 2 + 1) * halfGs;
          const y = (cy * 2 + 1) * halfGs;
          this._drawDot(g, x, y, dotR, avg);
          this._drawLabel(x, y, avg, scale);
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

  _drawLabel(x, y, value, scale) {
    if (scale < 0.8) return;
    const txt = new PIXI.Text(value.toFixed(1), {
      fontFamily: "Arial", fontSize: 10, fill: 0xffffff, stroke: 0x000000, strokeThickness: 2
    });
    txt.scale.set(1 / scale);
    txt.anchor.set(0, 1);
    txt.position.set(x + 3 / scale, y - 3 / scale);
    this.labels.addChild(txt);
  }

  /* -------------------------------------- */
  /*  Pointer interaction                    */
  /* -------------------------------------- */

  _onClickLeft(event) {
    if (!this._activeTool) return super._onClickLeft?.(event);
    const { x, y } = event.interactionData.origin;

    if (this._activeTool === "eyedropper") {
      const v = EyedropperTool.instance.pick(canvas.scene, x, y);
      if (v !== null) {
        BrushPalette._instance?.refreshHeight?.();
        ui.notifications.info(game.i18n.format("SCENE_ELEVATION.Notify.Picked", { value: v.toFixed(2) }));
      }
      return;
    }

    if (this._activeTool === "brush") {
      this._painting = true;
      BrushTool.instance.beginStroke();
      if (BrushTool.instance.stamp(canvas.scene, x, y)) this._renderOverlay();
    }
  }

  _onMouseMove(event) {
    if (!this._activeTool) return super._onMouseMove?.(event);
    const pos = event.interactionData?.destination ?? event.data?.getLocalPosition(this);
    if (pos) this._drawCursor(pos.x, pos.y);
    if (this._painting && this._activeTool === "brush" && pos) {
      if (BrushTool.instance.stamp(canvas.scene, pos.x, pos.y)) this._renderOverlay();
    }
  }

  async _onMouseUp(event) {
    if (!this._painting) return;
    this._painting = false;
    if (this._activeTool === "brush") {
      await BrushTool.instance.endStroke(canvas.scene);
      this._renderOverlay();
    }
  }

  _drawCursor(x, y) {
    const c = this.cursor;
    if (!c) return;
    c.clear();
    if (this._activeTool === "brush") {
      const radius = BrushTool.instance.size * canvas.grid.size;
      c.lineStyle(2 / canvas.stage.scale.x, 0x33ff66, 0.9);
      c.drawCircle(x, y, radius);
      const inner = radius * (1 - BrushTool.instance.fade / 100);
      if (inner > 1) {
        c.lineStyle(1 / canvas.stage.scale.x, 0x33ff66, 0.5);
        c.drawCircle(x, y, inner);
      }
    } else if (this._activeTool === "eyedropper") {
      const r = canvas.grid.size / 2;
      c.lineStyle(2 / canvas.stage.scale.x, 0x33ccff, 0.9);
      c.drawCircle(x, y, r);
      c.moveTo(x - r, y); c.lineTo(x + r, y);
      c.moveTo(x, y - r); c.lineTo(x, y + r);
    }
  }

  onPan() {
    if (!this.overlay?.visible) return;
    this._renderOverlay();
  }
}
