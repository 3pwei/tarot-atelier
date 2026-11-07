import { z } from "zod";
import {
  POSITION_ROLES,
  type PositionRole,
} from "@/domain/reading/positionRole";

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
  core: 160,
});

const bounded = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .refine((value) => Array.from(value).length <= max, {
      message: `Must be at most ${max} characters`,
    });

const cardEntry = z.strictObject({
  symbolism: bounded(CONTENT_LIMITS.symbolism),
  /** A fully written explanation; cards without it are voiced by `minorCore`. */
  core: bounded(CONTENT_LIMITS.core).optional(),
  angles: z.array(bounded(CONTENT_LIMITS.angle)).min(2).max(3),
  reflection: bounded(CONTENT_LIMITS.reflection),
  suggestion: bounded(CONTENT_LIMITS.suggestion),
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

const roleTemplates = z.strictObject({
  /** Says what the card means in this position. */
  position: template,
  /** Ties it back to the main question; omitted without one. */
  anchor: template,
});

const suitRecord = z.strictObject({
  wands: z.string().min(1),
  cups: z.string().min(1),
  swords: z.string().min(1),
  pentacles: z.string().min(1),
});

export const readingPhrasesSchema = z.strictObject({
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
  minorCore: templates,
  /** Angles starting with these suggest an action rather than describe a state. */
  actionAnglePrefixes: z.array(z.string().min(1)).min(1),
  roles: z.strictObject(
    Object.fromEntries(
      POSITION_ROLES.map((role) => [role, roleTemplates]),
    ) as Record<PositionRole, typeof roleTemplates>,
  ),
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

export type ReadingPhrases = z.infer<typeof readingPhrasesSchema>;

/** Placeholders each template may use; anything else is a content bug. */
export const TEMPLATE_PLACEHOLDERS = Object.freeze({
  minorCore: ["card", "orientation", "theme"],
  rolePosition: ["angle"],
  roleAnchor: ["mainQuestion"],
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
