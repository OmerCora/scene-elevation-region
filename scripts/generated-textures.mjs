import { debugWarn } from "./debug.mjs";

export class GeneratedTextureCache {
  #textures = new Map();

  get(key) {
    const texture = this.#textures.get(key);
    if (texture && !validTexture(texture)) this.#textures.delete(key);
    return validTexture(texture) ? texture : null;
  }

  set(key, texture) {
    if (!validTexture(texture)) return false;
    this.#textures.set(key, texture);
    return true;
  }

  delete(key) {
    return this.#textures.delete(key);
  }

  clear() {
    for (const texture of this.#textures.values()) texture?.destroy?.(true);
    this.#textures.clear();
  }

  generate(displayObject, width, height) {
    const renderer = canvas.app?.renderer;
    if (!renderer) return null;
    const region = new PIXI.Rectangle(0, 0, width, height);
    try {
      return renderer.generateTexture(displayObject, { region, resolution: 1 });
    } catch (err) { debugWarn("renderer.generateTexture.modern", err, { width, height }); }
    try {
      return renderer.generateTexture(displayObject, PIXI.SCALE_MODES.LINEAR, 1, region);
    } catch (err) { debugWarn("renderer.generateTexture.legacy", err, { width, height }); }
    return null;
  }
}

export function validTexture(texture) {
  return !!texture && texture !== PIXI.Texture.EMPTY && texture.valid !== false && texture.baseTexture?.valid !== false;
}