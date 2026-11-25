import { z } from "zod";
import type { SoundPreferenceStorage } from "@/application/ports/textStorage";

/** Version of the stored sound setting; bump it with a migration. */
export const SOUND_PREFERENCE_VERSION = 1;

export interface SoundPreference {
  /** Off until the reader turns it on: a phone should never start talking. */
  readonly pageSounds: boolean;
}

export const DEFAULT_SOUND_PREFERENCE: SoundPreference = Object.freeze({
  pageSounds: false,
});

const stored = z.strictObject({
  schemaVersion: z.literal(SOUND_PREFERENCE_VERSION),
  pageSounds: z.boolean(),
});

/** The stored setting, or the default when there is none or it is unreadable. */
export function loadSoundPreference(
  storage: SoundPreferenceStorage,
): SoundPreference {
  let text: string | null;
  try {
    text = storage.read();
  } catch {
    return DEFAULT_SOUND_PREFERENCE;
  }
  if (text === null) return DEFAULT_SOUND_PREFERENCE;
  try {
    const parsed = stored.safeParse(JSON.parse(text));
    return parsed.success
      ? { pageSounds: parsed.data.pageSounds }
      : DEFAULT_SOUND_PREFERENCE;
  } catch {
    return DEFAULT_SOUND_PREFERENCE;
  }
}

export function saveSoundPreference(
  storage: SoundPreferenceStorage,
  preference: SoundPreference,
): { readonly ok: boolean } {
  try {
    storage.write(
      JSON.stringify({
        schemaVersion: SOUND_PREFERENCE_VERSION,
        pageSounds: preference.pageSounds,
      }),
    );
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
