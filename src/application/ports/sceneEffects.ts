export type SceneEffectsMode = "full" | "reduced";

export interface SceneEffectsPreference {
  read(): SceneEffectsMode;
}
