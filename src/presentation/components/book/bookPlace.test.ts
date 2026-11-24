import { describe, expect, it } from "vitest";
import {
  chapter,
  CODEX,
  CONTENTS,
  COVER,
  FRONTISPIECE,
  hashFor,
  placeBefore,
  placeFromHash,
  RECORDS,
  samePlace,
} from "@/presentation/components/book/bookPlace";

describe("placeFromHash", () => {
  it("opens at the cover without a hash", () => {
    expect(placeFromHash("")).toEqual(COVER);
    expect(placeFromHash("#")).toEqual(COVER);
  });

  it("opens the contents and the appendix by name", () => {
    expect(placeFromHash("#contents")).toEqual(CONTENTS);
    expect(placeFromHash("#codex")).toEqual(CODEX);
    expect(placeFromHash("#records")).toEqual(RECORDS);
  });

  it("opens a spread's chapter by its template id", () => {
    expect(placeFromHash("#spread-three-card")).toEqual(chapter("three-card"));
  });

  it("falls back to the cover for anything it does not recognise", () => {
    expect(placeFromHash("#spread-")).toEqual(COVER);
    expect(placeFromHash("#spread-<script>")).toEqual(COVER);
    expect(placeFromHash("#settings")).toEqual(COVER);
  });
});

describe("hashFor", () => {
  it("round-trips every linkable place", () => {
    for (const place of [CONTENTS, CODEX, RECORDS, chapter("circle")]) {
      expect(placeFromHash(hashFor(place))).toEqual(place);
    }
  });

  it("gives the cover and the frontispiece no hash", () => {
    expect(hashFor(COVER)).toBe("");
    expect(hashFor(FRONTISPIECE)).toBe("");
  });
});

describe("placeBefore", () => {
  it("returns every chapter and appendix to the contents", () => {
    expect(placeBefore(chapter("circle"))).toEqual(CONTENTS);
    expect(placeBefore(CODEX)).toEqual(CONTENTS);
    expect(placeBefore(RECORDS)).toEqual(CONTENTS);
  });

  it("walks the front matter back to the cover", () => {
    expect(placeBefore(CONTENTS)).toEqual(FRONTISPIECE);
    expect(placeBefore(FRONTISPIECE)).toEqual(COVER);
    expect(placeBefore(COVER)).toEqual(COVER);
  });
});

describe("samePlace", () => {
  it("tells chapters apart by template", () => {
    expect(samePlace(chapter("a"), chapter("a"))).toBe(true);
    expect(samePlace(chapter("a"), chapter("b"))).toBe(false);
    expect(samePlace(CODEX, CODEX)).toBe(true);
    expect(samePlace(CODEX, RECORDS)).toBe(false);
  });
});
