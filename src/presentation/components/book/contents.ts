import type {
  SpreadTemplate,
  TemplateLibrary,
} from "@/domain/spread/templates";
import {
  chapter,
  CODEX,
  RECORDS,
  type BookPlace,
} from "@/presentation/components/book/bookPlace";

/**
 * The book's English chapter titles for the built-in spreads, by template id.
 * A spread the reader saved keeps the name they gave it.
 */
export const BUILT_IN_CHAPTER_TITLES: Readonly<Record<string, string>> =
  Object.freeze({
    "single-card": "The Single Card",
    "three-card": "The Three Cards",
    "five-card": "The Cross",
    circle: "The Circle",
  });

export const APPENDIX_TITLES = Object.freeze({
  codex: "The Codex",
  records: "The Records",
});

export type ContentsSection = "spreads" | "appendix";
export type TitleLanguage = "en" | "zh-Hant";

export interface ContentsEntry {
  readonly place: BookPlace;
  /** Roman numeral shown before the title, e.g. `III.` */
  readonly numeral: string;
  readonly title: string;
  /** `en` when the title can be set in the script face; else the page's own. */
  readonly titleLanguage: TitleLanguage;
  readonly page: number;
  readonly section: ContentsSection;
}

/** The frontispiece is page 1 and the contents page 2; chapters follow. */
const FIRST_CHAPTER_PAGE = 3;
/** Each chapter is a spread of two pages: the question, then the table. */
const PAGES_PER_CHAPTER = 2;
/** Leaves of the codex before the records, one per card plus its title page. */
const CODEX_PAGES = 80;

/** The line above a chapter's page, e.g. `III · The Cross`. */
export function runningHeadFor(entry: ContentsEntry): string {
  return `${entry.numeral.replace(/\.$/u, "")} · ${entry.title}`;
}

export function chapterTitle(template: SpreadTemplate): string {
  return BUILT_IN_CHAPTER_TITLES[template.id] ?? template.name;
}

/**
 * Every entry of the contents, in reading order: one chapter per spread in
 * the library, then the appendix. Page numbers follow from that order.
 */
export function contentsFor(
  library: TemplateLibrary,
): readonly ContentsEntry[] {
  const chapters: ContentsEntry[] = library.map((template, index) => ({
    place: chapter(template.id),
    numeral: `${toRoman(index + 1)}.`,
    title: chapterTitle(template),
    titleLanguage: titleLanguageOf(chapterTitle(template)),
    page: FIRST_CHAPTER_PAGE + index * PAGES_PER_CHAPTER,
    section: "spreads",
  }));
  const codexPage = FIRST_CHAPTER_PAGE + library.length * PAGES_PER_CHAPTER;
  const appendix: ContentsEntry[] = [
    {
      place: CODEX,
      numeral: `${toRoman(library.length + 1)}.`,
      title: APPENDIX_TITLES.codex,
      titleLanguage: "en",
      page: codexPage,
      section: "appendix",
    },
    {
      place: RECORDS,
      numeral: `${toRoman(library.length + 2)}.`,
      title: APPENDIX_TITLES.records,
      titleLanguage: "en",
      page: codexPage + CODEX_PAGES,
      section: "appendix",
    },
  ];
  return [...chapters, ...appendix];
}

/** Latin letters, digits, spaces and plain punctuation fit the script face. */
const LATIN_TITLE = /^[\p{Script=Latin}\d\s'’.,&!?:;()-]+$/u;

export function titleLanguageOf(title: string): TitleLanguage {
  return LATIN_TITLE.test(title) ? "en" : "zh-Hant";
}

const ROMAN_STEPS: readonly (readonly [number, string])[] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
];

/** Roman numerals for chapter numbers; a library holds at most a few dozen. */
export function toRoman(value: number): string {
  let rest = Math.max(0, Math.floor(value));
  let out = "";
  for (const [size, glyph] of ROMAN_STEPS) {
    while (rest >= size) {
      out += glyph;
      rest -= size;
    }
  }
  return out;
}
