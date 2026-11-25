import { describe, expect, it } from "vitest";
import { MemoryTextStorage } from "@/application/testing/memoryTextStorage";
import {
  DEFAULT_SOUND_PREFERENCE,
  loadSoundPreference,
  saveSoundPreference,
} from "@/application/use-cases/soundPreference";

describe("sound preference", () => {
  it("is off when nothing is stored", () => {
    expect(loadSoundPreference(new MemoryTextStorage())).toEqual({
      pageSounds: false,
    });
  });

  it("keeps the reader's choice", () => {
    const storage = new MemoryTextStorage();
    expect(saveSoundPreference(storage, { pageSounds: true })).toEqual({
      ok: true,
    });
    expect(loadSoundPreference(storage)).toEqual({ pageSounds: true });
    expect(JSON.parse(storage.read() ?? "")).toEqual({
      schemaVersion: 1,
      pageSounds: true,
    });
  });

  it("falls back to off for anything it cannot read", () => {
    for (const text of [
      "nope",
      '{"pageSounds":true}',
      '{"schemaVersion":9,"pageSounds":true}',
    ]) {
      const storage = new MemoryTextStorage();
      storage.write(text);
      expect(loadSoundPreference(storage)).toBe(DEFAULT_SOUND_PREFERENCE);
    }
  });

  it("reports a write the browser refused", () => {
    const storage = new MemoryTextStorage();
    storage.write = () => {
      throw new Error("quota");
    };
    expect(saveSoundPreference(storage, { pageSounds: true })).toEqual({
      ok: false,
    });
  });
});
