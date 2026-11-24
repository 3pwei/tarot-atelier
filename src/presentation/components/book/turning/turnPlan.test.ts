import { describe, expect, it } from "vitest";
import { BUILT_IN_TEMPLATES } from "@/domain/spread/templates";
import {
  chapter,
  CODEX,
  CONTENTS,
  COVER,
  FRONTISPIECE,
  RECORDS,
} from "@/presentation/components/book/bookPlace";
import { contentsFor } from "@/presentation/components/book/contents";
import {
  planTurn,
  readingOrder,
} from "@/presentation/components/book/turning/turnPlan";

const entries = contentsFor(BUILT_IN_TEMPLATES);
const phone = { entries, facingPages: false };
const desk = { entries, facingPages: true };

describe("readingOrder", () => {
  it("counts the cover, the front matter, then the contents in order", () => {
    expect(readingOrder(COVER, entries)).toBe(0);
    expect(readingOrder(CONTENTS, entries)).toBe(2);
    expect(readingOrder(chapter("three-card"), entries)).toBe(3);
    expect(readingOrder(RECORDS, entries)).toBe(8);
  });

  it("has no place for a spread that is not in the contents", () => {
    expect(readingOrder(chapter("gone"), entries)).toBeUndefined();
  });
});

describe("planTurn", () => {
  it("opens the cover with its own scene, and closes it", () => {
    expect(planTurn(COVER, FRONTISPIECE, phone)).toEqual({ kind: "open" });
    expect(planTurn(CONTENTS, COVER, phone)).toEqual({ kind: "close" });
  });

  it("turns one page between neighbours", () => {
    expect(planTurn(FRONTISPIECE, CONTENTS, phone)).toEqual({
      kind: "single",
      direction: "forward",
    });
    expect(planTurn(CONTENTS, chapter("three-card"), phone)).toEqual({
      kind: "single",
      direction: "forward",
    });
    expect(planTurn(chapter("three-card"), CONTENTS, phone)).toEqual({
      kind: "single",
      direction: "back",
    });
  });

  it("riffles past the pages in between", () => {
    expect(planTurn(CONTENTS, CODEX, phone)).toEqual({
      kind: "riffle",
      direction: "forward",
    });
    expect(planTurn(chapter("circle"), CONTENTS, phone)).toEqual({
      kind: "riffle",
      direction: "back",
    });
  });

  it("does not turn between facing pages on a wide screen", () => {
    expect(planTurn(FRONTISPIECE, CONTENTS, desk)).toEqual({ kind: "none" });
    expect(planTurn(CONTENTS, FRONTISPIECE, desk)).toEqual({ kind: "none" });
  });

  it("does not turn to the same place or to one it cannot find", () => {
    expect(planTurn(CONTENTS, CONTENTS, phone)).toEqual({ kind: "none" });
    expect(planTurn(CONTENTS, chapter("gone"), phone)).toEqual({
      kind: "none",
    });
  });
});
