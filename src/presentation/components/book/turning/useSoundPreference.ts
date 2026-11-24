"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_SOUND_PREFERENCE,
  loadSoundPreference,
  saveSoundPreference,
} from "@/application/use-cases/soundPreference";
import { useAtelierServices } from "@/presentation/services/atelierServices";

export interface SoundPreferenceHandle {
  readonly pageSounds: boolean;
  readonly toggle: () => void;
}

/** Whether pages make a sound, kept on this device. Off until turned on. */
export function useSoundPreference(): SoundPreferenceHandle {
  const { soundPreferenceStorage } = useAtelierServices();
  const [pageSounds, setPageSounds] = useState(
    DEFAULT_SOUND_PREFERENCE.pageSounds,
  );

  // Storage exists only in the browser; read it once mounted.
  useEffect(() => {
    const stored = loadSoundPreference(soundPreferenceStorage).pageSounds;
    const frame = requestAnimationFrame(() => setPageSounds(stored));
    return () => cancelAnimationFrame(frame);
  }, [soundPreferenceStorage]);

  const toggle = useCallback(() => {
    const next = !pageSounds;
    setPageSounds(next);
    saveSoundPreference(soundPreferenceStorage, { pageSounds: next });
  }, [pageSounds, soundPreferenceStorage]);

  return { pageSounds, toggle };
}
