"use client";

import { create } from "zustand";

type ExperienceState = {
  effectsEnabled: boolean;
  setEffectsEnabled: (enabled: boolean) => void;
};

export const useExperienceStore = create<ExperienceState>((set) => ({
  effectsEnabled: true,
  setEffectsEnabled: (effectsEnabled) => set({ effectsEnabled }),
}));
