import {
  MODULE_ID, SETTINGS, LOD_THRESHOLD_DEFAULT, PARALLAX_STRENGTHS, REGION_BEHAVIOR_TYPE
} from "./config.mjs";
import { ElevationData } from "./elevation-data.mjs";
import { ElevationLayer } from "./elevation-layer.mjs";
import { ElevationMesh } from "./elevation-mesh.mjs";
import { BrushTool } from "./tools/brush-tool.mjs";
import { EyedropperTool } from "./tools/eyedropper-tool.mjs";
import { BrushPalette } from "./ui/brush-palette.mjs";
import { ElevationRegionBehavior, registerRegionHooks } from "./region-behavior.mjs";
import { registerWallConfigInjection } from "./wall-config.mjs";

/* -------------------------------------------- */
/*  Init                                         */
/* -------------------------------------------- */

Hooks.once("init", () => {
  // Handlebars helpers (namespaced check so we don't redefine globally).
  if (!Handlebars.helpers.eq) Handlebars.registerHelper("eq", (a, b) => a === b);

  // Settings
  game.settings.register(MODULE_ID, SETTINGS.PARALLAX, {
    name: "SCENE_ELEVATION.Settings.Parallax",
    hint: "SCENE_ELEVATION.Settings.ParallaxHint",
    scope: "world", config: true, type: String, default: "medium",
    choices: {
      subtle: "SCENE_ELEVATION.Settings.ParallaxSubtle",
      medium: "SCENE_ELEVATION.Settings.ParallaxMedium",
      strong: "SCENE_ELEVATION.Settings.ParallaxStrong"
    },
    onChange: () => ElevationMesh.instance.update()
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
  game.settings.register(MODULE_ID, SETTINGS.SHOW_OVERLAY, {
    scope: "client", config: false, type: Boolean, default: true
  });
  game.settings.register(MODULE_ID, SETTINGS.LOD_THRESHOLD, {
    scope: "client", config: false, type: Number, default: LOD_THRESHOLD_DEFAULT
  });

  // Custom canvas layer
  CONFIG.Canvas.layers[ElevationLayer.LAYER_NAME] = {
    layerClass: ElevationLayer,
    group: "interface"
  };

  // Region behavior subtype
  Object.assign(CONFIG.RegionBehavior.dataModels, {
    [REGION_BEHAVIOR_TYPE]: ElevationRegionBehavior
  });
  CONFIG.RegionBehavior.typeIcons[REGION_BEHAVIOR_TYPE] = "fa-solid fa-mountain";

  // Composite invalidation hooks (regions + walls)
  const invalidate = () => {
    if (!canvas?.scene) return;
    ElevationData.get(canvas.scene)?.invalidateComposite();
    ElevationMesh.instance.update();
    canvas[ElevationLayer.LAYER_NAME]?._renderOverlay?.();
    _refreshAllTokenScales();
  };
  registerRegionHooks(invalidate);
  registerWallConfigInjection(invalidate);

  // Module API
  game.modules.get(MODULE_ID).api = {
    ElevationData, ElevationLayer, ElevationMesh,
    BrushTool, EyedropperTool, BrushPalette,
    ElevationRegionBehavior
  };
});

/* -------------------------------------------- */
/*  Canvas lifecycle                             */
/* -------------------------------------------- */

Hooks.on("canvasReady", async () => {
  await ElevationMesh.instance.attach(canvas.scene);
  _refreshAllTokenScales();
});

Hooks.on("canvasTearDown", async () => {
  await ElevationMesh.instance.detach();
});

Hooks.on("canvasPan", () => {
  ElevationMesh.instance.update();
  canvas[ElevationLayer.LAYER_NAME]?.onPan?.();
});

Hooks.on("updateScene", (scene, change) => {
  if (scene !== canvas.scene) return;
  if (!foundry.utils.hasProperty(change, `flags.${MODULE_ID}`)) return;
  ElevationData.get(scene)?.invalidateComposite();
  ElevationMesh.instance.syncElevations();
  canvas[ElevationLayer.LAYER_NAME]?._renderOverlay?.();
  _refreshAllTokenScales();
});

/* -------------------------------------------- */
/*  Scene controls                               */
/* -------------------------------------------- */

Hooks.on("getSceneControlButtons", (controls) => {
  controls.elevation = {
    name: "elevation",
    title: "SCENE_ELEVATION.Control.Group",
    icon: "fa-solid fa-mountain",
    layer: ElevationLayer.LAYER_NAME,
    visible: game.user.isGM,
    activeTool: "brush",
    tools: {
      brush: {
        name: "brush",
        title: "SCENE_ELEVATION.Control.Brush",
        icon: "fa-solid fa-paintbrush",
        onChange: (event, active) => {
          if (active) BrushPalette.show();
          else BrushPalette.hide();
        }
      },
      eyedropper: {
        name: "eyedropper",
        title: "SCENE_ELEVATION.Control.Eyedropper",
        icon: "fa-solid fa-eye-dropper"
      },
      reset: {
        name: "reset",
        title: "SCENE_ELEVATION.Control.ResetScene",
        icon: "fa-solid fa-trash",
        button: true,
        onChange: async () => {
          const ok = await foundry.applications.api.DialogV2.confirm({
            window: { title: game.i18n.localize("SCENE_ELEVATION.Notify.ResetConfirmTitle") },
            content: `<p>${game.i18n.localize("SCENE_ELEVATION.Notify.ResetConfirm")}</p>`
          });
          if (!ok || !canvas.scene) return;
          await ElevationData.get(canvas.scene).clear();
          ui.notifications.info(game.i18n.localize("SCENE_ELEVATION.Notify.Reset"));
        }
      }
    }
  };
});

Hooks.on("renderSceneControls", (controls) => {
  const layer = canvas?.[ElevationLayer.LAYER_NAME];
  if (!layer) return;
  const isActive = controls.control?.name === "elevation";
  if (isActive) layer.activateTool(controls.tool?.name ?? null);
  else layer.deactivate();
});

/* -------------------------------------------- */
/*  Token elevation scaling                      */
/* -------------------------------------------- */

function _tokenScaleFactor(token) {
  if (!game.settings.get(MODULE_ID, SETTINGS.TOKEN_SCALE_ENABLED)) return 1;
  if (!canvas?.scene || !token?.document) return 1;
  const data = ElevationData.get(canvas.scene);
  const cx = token.document.x + (token.document.width * canvas.grid.size) / 2;
  const cy = token.document.y + (token.document.height * canvas.grid.size) / 2;
  const elev = data.sampleAt(cx, cy);
  const strengthKey = game.settings.get(MODULE_ID, SETTINGS.PARALLAX) ?? "medium";
  const parallax = PARALLAX_STRENGTHS[strengthKey] ?? PARALLAX_STRENGTHS.medium;
  const max = game.settings.get(MODULE_ID, SETTINGS.TOKEN_SCALE_MAX) ?? 1.5;
  const factor = 1 + elev * parallax;
  return Math.clamp(factor, 1 / max, max);
}

function _applyTokenScale(token) {
  if (!token?.mesh) return;
  const factor = _tokenScaleFactor(token);
  token.mesh.scale.set(factor, factor);
}

function _refreshAllTokenScales() {
  if (!canvas?.tokens) return;
  for (const t of canvas.tokens.placeables) _applyTokenScale(t);
}

Hooks.on("drawToken", _applyTokenScale);
Hooks.on("refreshToken", _applyTokenScale);
