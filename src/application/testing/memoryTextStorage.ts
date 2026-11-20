import type { TextStorage } from "@/application/ports/textStorage";

/** In-memory `TextStorage` for tests; `failWrites` simulates a full quota. */
export class MemoryTextStorage implements TextStorage {
  value: string | null;
  failWrites = false;

  constructor(value: string | null = null) {
    this.value = value;
  }

  read(): string | null {
    return this.value;
  }

  write(value: string): void {
    if (this.failWrites) throw new Error("Storage quota exceeded");
    this.value = value;
  }

  clear(): void {
    this.value = null;
  }
}
