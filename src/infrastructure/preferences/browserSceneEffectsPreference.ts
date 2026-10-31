import type {
  SceneEffectsMode,
  SceneEffectsPreference,
} from "@/application/ports/sceneEffects";

export class BrowserSceneEffectsPreference implements SceneEffectsPreference {
  read(): SceneEffectsMode {
    if (typeof window === "undefined") {
      return "reduced";
    }

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "reduced"
      : "full";
  }
}
