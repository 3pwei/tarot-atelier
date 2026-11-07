import { z } from "zod";
import { READING_TONES, type ReadingTone } from "@/domain/reading/types";

/**
 * Pre-written reading content: per-card text written ahead of time and
 * shipped as static data, so readings cost nothing to produce. Formats are
 * versioned and validated when loaded.
 */
export const READING_CONTENT_SCHEMA_VERSION = "1.0.0" as const;

/** Ceilings that keep content readable on a phone; checked when loaded. */
export const CONTENT_LIMITS = Object.freeze({
  symbolism: 120,
  angle: 40,
  reflection: 60,
  suggestion: 80,
  voice: 160,
});

const bounded = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .refine((value) => Array.from(value).length <= max, {
      message: `Must be at most ${max} characters`,
    });

const voices = z.strictObject(
  Object.fromEntries(
    READING_TONES.map((tone) => [tone, bounded(CONTENT_LIMITS.voice)]),
  ) as Record<ReadingTone, ReturnType<typeof bounded>>,
);

const cardEntry = z.strictObject({
  symbolism: bounded(CONTENT_LIMITS.symbolism),
  angles: z.array(bounded(CONTENT_LIMITS.angle)).min(2).max(3),
  reflection: bounded(CONTENT_LIMITS.reflection),
  suggestion: bounded(CONTENT_LIMITS.suggestion),
  /** Fully written text per tone; cards without it use tone templates. */
  voices: voices.optional(),
});

const cardContent = z.strictObject({
  upright: cardEntry,
  reversed: cardEntry,
});

export const cardContentMapSchema = z.record(z.string().min(1), cardContent);

export type CardContentEntry = z.infer<typeof cardEntry>;
export type CardContentMap = z.infer<typeof cardContentMapSchema>;

export interface ContentAuthorship {
  readonly writtenBy: string;
  readonly review: "pending-owner-review" | "reviewed";
  readonly license: string;
}

export interface DeckReadingContent {
  readonly schemaVersion: typeof READING_CONTENT_SCHEMA_VERSION;
  readonly deckId: string;
  readonly locale: "zh-Hant";
  readonly authorship: ContentAuthorship;
  readonly cards: CardContentMap;
}

const template = z.string().min(1);
const templates = z.array(template).min(1);

const toneTemplates = z.strictObject({
  link: templates,
  minorVoice: templates,
  jumper: templates,
  synthesis: z.strictObject({
    openingWithMain: template,
    openingPlain: template,
    single: template,
    majorHeavy: template,
    suitLead: template,
    reversedHeavy: template,
    balanced: template,
    jumperPresent: template,
  }),
});

const suitRecord = z.strictObject({
  wands: z.string().min(1),
  cups: z.string().min(1),
  swords: z.string().min(1),
  pentacles: z.string().min(1),
});

export const tonePhrasesSchema = z.strictObject({
  schemaVersion: z.literal(READING_CONTENT_SCHEMA_VERSION),
  locale: z.literal("zh-Hant"),
  orientationLabels: z.strictObject({
    upright: z.string().min(1),
    reversed: z.string().min(1),
    neutral: z.string().min(1),
  }),
  neutralNote: z.string().min(1),
  suitThemes: suitRecord,
  suitNames: suitRecord,
  fallback: z.strictObject({
    symbolism: template,
    angle: template,
    reflection: template,
    suggestion: template,
  }),
  tones: z.strictObject(
    Object.fromEntries(
      READING_TONES.map((tone) => [tone, toneTemplates]),
    ) as Record<ReadingTone, typeof toneTemplates>,
  ),
});

export type TonePhrases = z.infer<typeof tonePhrasesSchema>;
export type ToneTemplates = z.infer<typeof toneTemplates>;

/** Placeholders each template may use; anything else is a content bug. */
export const TEMPLATE_PLACEHOLDERS = Object.freeze({
  link: ["question", "angle"],
  minorVoice: ["card", "orientation", "meaning"],
  jumper: ["jumper", "jumperOrientation", "jumperAngle"],
  synthesis: ["mainQuestion", "count", "majorCount", "suit", "suitTheme"],
  fallback: ["card", "meaning", "keyword"],
} as const);

export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateError";
  }
}

/**
 * Fills `{name}` placeholders. Values are inserted as-is and never scanned
 * again, so a player's question cannot inject a placeholder.
 */
export function fillTemplate(
  text: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return text.replace(/\{(\w+)\}/gu, (_, name: string) => {
    const value = values[name];
    if (value === undefined) {
      throw new TemplateError(`Template is missing a value for {${name}}.`);
    }
    return String(value);
  });
}

export function placeholdersOf(text: string): readonly string[] {
  return [...text.matchAll(/\{(\w+)\}/gu)].map((match) => match[1] ?? "");
}
