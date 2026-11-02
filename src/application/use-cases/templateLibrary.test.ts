import { describe, expect, it } from "vitest";
import type { SpreadTemplateStorage } from "@/application/ports/textStorage";
import {
  loadTemplateLibrary,
  saveTemplateLibrary,
} from "@/application/use-cases/templateLibrary";
import { BUILT_IN_TEMPLATES } from "@/domain/spread/templates";

class MemoryStorage implements SpreadTemplateStorage {
  value: string | null = null;
  failWrites = false;
  read() {
    return this.value;
  }
  write(value: string) {
    if (this.failWrites) throw new Error("quota");
    this.value = value;
  }
  clear() {
    this.value = null;
  }
}

describe("template library persistence", () => {
  it("starts from the built-ins when nothing is stored", () => {
    expect(loadTemplateLibrary(new MemoryStorage())).toEqual({
      status: "default",
      library: BUILT_IN_TEMPLATES,
    });
  });

  it("keeps deletions, including an emptied library", () => {
    const storage = new MemoryStorage();
    const trimmed = BUILT_IN_TEMPLATES.slice(1);
    expect(saveTemplateLibrary(storage, trimmed)).toEqual({ ok: true });
    expect(loadTemplateLibrary(storage)).toEqual({
      status: "restored",
      library: trimmed,
    });

    saveTemplateLibrary(storage, []);
    expect(loadTemplateLibrary(storage)).toEqual({
      status: "restored",
      library: [],
    });
  });

  it("discards unreadable data and reports storage failures", () => {
    const storage = new MemoryStorage();
    storage.value = "{broken";
    expect(loadTemplateLibrary(storage)).toEqual({
      status: "discarded",
      library: BUILT_IN_TEMPLATES,
    });
    expect(storage.value).toBeNull();

    storage.failWrites = true;
    expect(saveTemplateLibrary(storage, BUILT_IN_TEMPLATES)).toEqual({
      ok: false,
    });
  });
});
