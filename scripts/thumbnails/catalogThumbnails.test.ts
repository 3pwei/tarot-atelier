import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { atelierStandardDeck } from "@/domain/deck/builtinDecks";
import {
  ARTWORK_SOURCES,
  artworkSourceHash,
  BACK_FILE_NAME,
  BACK_SMALL_FILE_NAME,
  MANIFEST_PATH,
  THUMBNAIL_DECK_ID,
  THUMBNAIL_PUBLIC_DIR,
  thumbnailFileName,
  type ThumbnailManifest,
} from "./catalogThumbnails.ts";

const REGENERATE = "Run `pnpm thumbnails` and commit the result.";

describe("artworkSourceHash", () => {
  it("is stable for the same sources", () => {
    const read = (file: string) => `contents of ${file}`;

    expect(artworkSourceHash(read)).toBe(artworkSourceHash(read));
  });

  it("changes when any artwork source changes", () => {
    const original = artworkSourceHash((file) => file);
    const edited = artworkSourceHash((file) =>
      file === ARTWORK_SOURCES.at(-1) ? `${file} edited` : file,
    );

    expect(edited).not.toBe(original);
  });
});

describe("thumbnailFileName", () => {
  it("keeps card ids readable and URL-safe", () => {
    expect(thumbnailFileName("atelier-standard.cups.three")).toBe(
      "atelier-standard.cups.three.webp",
    );
    expect(thumbnailFileName("a/b c")).toBe("a-b-c.webp");
  });
});

describe("committed catalog thumbnails", () => {
  const manifest = JSON.parse(
    readFileSync(MANIFEST_PATH, "utf8"),
  ) as ThumbnailManifest;

  it("match the current card art", () => {
    const current = artworkSourceHash((file) => readFileSync(file, "utf8"));

    expect(
      manifest.sourceHash,
      `The card art changed since the thumbnails were made. ${REGENERATE}`,
    ).toBe(current);
  });

  it("cover every card of the standard deck, and the files exist", () => {
    expect(manifest.deckId).toBe(THUMBNAIL_DECK_ID);
    expect(manifest.directory).toBe(THUMBNAIL_PUBLIC_DIR);
    const missing = atelierStandardDeck.cards
      .map((card) => card.id)
      .filter((id) => {
        const file = manifest.cards[id];
        return (
          !file || !existsSync(path.join("public", THUMBNAIL_PUBLIC_DIR, file))
        );
      });

    expect(missing, `Thumbnails are missing. ${REGENERATE}`).toEqual([]);
  });

  it("include the card back for the fanned deck", () => {
    expect(manifest.back, `The card back is missing. ${REGENERATE}`).toBe(
      BACK_FILE_NAME,
    );
    expect(
      existsSync(path.join("public", THUMBNAIL_PUBLIC_DIR, BACK_FILE_NAME)),
    ).toBe(true);
  });

  it("include the half-size back for the cards in the air", () => {
    expect(
      manifest.backSmall,
      `The small card back is missing. ${REGENERATE}`,
    ).toBe(BACK_SMALL_FILE_NAME);
    expect(
      existsSync(
        path.join("public", THUMBNAIL_PUBLIC_DIR, BACK_SMALL_FILE_NAME),
      ),
    ).toBe(true);
  });
});
