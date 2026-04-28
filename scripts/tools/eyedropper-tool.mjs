import { ElevationData } from "../elevation-data.mjs";
import { BrushTool } from "./brush-tool.mjs";

/**
 * Eyedropper tool — sample composite elevation at a point and load it
 * into the brush palette as the active height.
 */
export class EyedropperTool {
  static _instance = null;
  static get instance() {
    if (!this._instance) this._instance = new EyedropperTool();
    return this._instance;
  }

  /** @returns {number|null} sampled elevation (composite) or null on failure. */
  pick(scene, wx, wy) {
    const data = ElevationData.get(scene);
    if (!data) return null;
    const elev = data.sampleAt(wx, wy);
    BrushTool.instance.setProperty("height", Math.abs(elev));
    return elev;
  }
}
