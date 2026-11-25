import { describe, expect, it } from "vitest";
import {
  BUILT_IN_TEMPLATES,
  type SpreadTemplate,
} from "@/domain/spread/templates";
import {
  chapter,
  CODEX,
  RECORDS,
} from "@/presentation/components/book/bookPlace";
import {
  BUILT_IN_CHAPTER_TITLES,
  chapterTitle,
  contentsFor,
  runningHeadFor,
  titleLanguageOf,
  toRoman,
} from "@/presentation/components/book/contents";

const saved: SpreadTemplate = {
  id: "my-own",
  name: "斜放三張",
  builtIn: false,
  positions: [{ question: "?", x: 0.5, y: 0.5, rotation: 0 }],
};

describe("chapterTitle", () => {
  it("gives every built-in spread an English title", () => {
    for (const template of BUILT_IN_TEMPLATES) {
      expect(BUILT_IN_CHAPTER_TITLES[template.id]).toBeTruthy();
    }
    expect(chapterTitle(BUILT_IN_TEMPLATES[0]!)).toBe("The Three Cards");
  });

  it("keeps the name the reader gave a saved spread", () => {
    expect(chapterTitle(saved)).toBe("斜放三張");
  });
});

describe("contentsFor", () => {
  it("lists one chapter per spread, in library order, then the appendix", () => {
    const entries = contentsFor([...BUILT_IN_TEMPLATES, saved]);
    expect(entries.map((entry) => entry.title)).toEqual([
      "The Three Cards",
      "The Single Card",
      "The Cross",
      "The Circle",
      "斜放三張",
      "The Codex",
      "The Records",
    ]);
    expect(entries[4]!.place).toEqual(chapter("my-own"));
    expect(entries[4]!.titleLanguage).toBe("zh-Hant");
    expect(entries[0]!.titleLanguage).toBe("en");
    expect(entries.at(-2)!.place).toEqual(CODEX);
    expect(entries.at(-1)!.place).toEqual(RECORDS);
  });

  it("numbers entries in roman numerals and counts pages in order", () => {
    const entries = contentsFor(BUILT_IN_TEMPLATES);
    expect(entries.map((entry) => entry.numeral)).toEqual([
      "I.",
      "II.",
      "III.",
      "IV.",
      "V.",
      "VI.",
    ]);
    expect(entries.map((entry) => entry.page)).toEqual([3, 5, 7, 9, 11, 91]);
    expect(entries.map((entry) => entry.section)).toEqual([
      "spreads",
      "spreads",
      "spreads",
      "spreads",
      "appendix",
      "appendix",
    ]);
  });

  it("still has an appendix when every spread was deleted", () => {
    expect(contentsFor([]).map((entry) => entry.title)).toEqual([
      "The Codex",
      "The Records",
    ]);
  });
});

describe("toRoman", () => {
  it("writes the numerals a contents page needs", () => {
    expect([1, 4, 9, 14, 30, 40].map(toRoman)).toEqual([
      "I",
      "IV",
      "IX",
      "XIV",
      "XXX",
      "XL",
    ]);
  });
});

describe("titleLanguageOf", () => {
  it("sets latin titles in the script face", () => {
    expect(titleLanguageOf("The Three Cards")).toBe("en");
    expect(titleLanguageOf("Love & Work: 2026")).toBe("en");
  });

  it("keeps any other title in the page's own face", () => {
    expect(titleLanguageOf("斜放三張")).toBe("zh-Hant");
    expect(titleLanguageOf("My 三張")).toBe("zh-Hant");
  });
});

describe("runningHeadFor", () => {
  it("pairs the numeral and the title above a chapter", () => {
    const [first] = contentsFor(BUILT_IN_TEMPLATES);
    expect(runningHeadFor(first!)).toBe("I · The Three Cards");
  });
});
