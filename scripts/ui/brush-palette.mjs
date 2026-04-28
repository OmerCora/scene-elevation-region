import { MODULE_ID, BRUSH } from "../config.mjs";
import { BrushTool } from "../tools/brush-tool.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/** Floating tool palette for the elevation brush. */
export class BrushPalette extends HandlebarsApplicationMixin(ApplicationV2) {
  static _instance = null;

  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-brush-palette`,
    classes: ["scene-elevation"],
    tag: "div",
    window: {
      title: "SCENE_ELEVATION.Brush.PaletteTitle",
      icon: "fa-solid fa-paintbrush",
      minimizable: false,
      resizable: false
    },
    position: { width: 280, height: "auto" },
    actions: { setOp: BrushPalette.#onSetOp }
  };

  static PARTS = {
    body: { template: `modules/${MODULE_ID}/templates/brush-palette.hbs` }
  };

  static toggle() { this._instance?.rendered ? this._instance.close() : this.show(); }
  static show() { if (!this._instance) this._instance = new this(); this._instance.render({ force: true }); }
  static hide() { this._instance?.close(); }

  /** @inheritDoc */
  async _prepareContext(_options) {
    const t = BrushTool.instance;
    return { size: t.size, height: t.height, fade: t.fade, op: t.op, bounds: BRUSH };
  }

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender?.(context, options);
    const root = this.element;
    root.querySelectorAll("input[data-key]").forEach(input => {
      input.addEventListener("input", (ev) => {
        const key = ev.currentTarget.dataset.key;
        const val = ev.currentTarget.value;
        BrushTool.instance.setProperty(key, val);
        const valEl = root.querySelector(`.value[data-for="${key}"]`);
        if (valEl) valEl.textContent = Number(val).toFixed(key === "fade" ? 0 : 1);
      });
    });
  }

  static #onSetOp(event, target) {
    BrushTool.instance.setProperty("op", target.dataset.op);
    this.render();
  }

  /** External callers (eyedropper) refresh the height field after a pick. */
  refreshHeight() {
    if (!this.rendered) return;
    const root = this.element;
    const input = root.querySelector('input[data-key="height"]');
    const label = root.querySelector('.value[data-for="height"]');
    if (input) input.value = BrushTool.instance.height;
    if (label) label.textContent = Number(BrushTool.instance.height).toFixed(1);
  }
}
