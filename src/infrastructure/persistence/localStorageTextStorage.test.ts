import { afterEach, describe, expect, it } from "vitest";
import {
  LocalStorageTextStorage,
  SPREAD_SESSION_STORAGE_KEY,
} from "@/infrastructure/persistence/localStorageTextStorage";

afterEach(() => window.localStorage.clear());

describe("LocalStorageTextStorage", () => {
  it("reads, writes and clears one stable key", () => {
    const storage = new LocalStorageTextStorage(SPREAD_SESSION_STORAGE_KEY);
    expect(storage.read()).toBeNull();

    storage.write('{"schemaVersion":1}');
    expect(window.localStorage.getItem(SPREAD_SESSION_STORAGE_KEY)).toBe(
      '{"schemaVersion":1}',
    );
    expect(storage.read()).toBe('{"schemaVersion":1}');

    storage.clear();
    expect(storage.read()).toBeNull();
  });

  it("treats blocked storage as empty and refuses writes", () => {
    const blocked = new LocalStorageTextStorage("key", () => {
      throw new Error("SecurityError");
    });
    expect(blocked.read()).toBeNull();

    const missing = new LocalStorageTextStorage("key", () => undefined);
    expect(() => missing.write("x")).toThrow(/unavailable/u);
  });
});
