import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BOOK_ART, BOOK_ART_FONTS, outputPath, sourcePath } from "./bookArt.ts";

const REGENERATE = "Run `pnpm book-art` and commit the result.";

describe("book art", () => {
  it("has an SVG source and a published WebP for every piece", () => {
    for (const piece of BOOK_ART) {
      expect(existsSync(sourcePath(piece)), sourcePath(piece)).toBe(true);
      expect(existsSync(outputPath(piece)), REGENERATE).toBe(true);
    }
  });

  it("draws each source at the size the script captures", () => {
    for (const piece of BOOK_ART) {
      const svg = readFileSync(sourcePath(piece), "utf8");
      expect(svg).toContain(`width="${piece.width}"`);
      expect(svg).toContain(`height="${piece.height}"`);
    }
  });

  it("finds every lettering font in node_modules", () => {
    for (const [, file] of BOOK_ART_FONTS) {
      expect(existsSync(`node_modules/${file}`), file).toBe(true);
    }
  });
});
