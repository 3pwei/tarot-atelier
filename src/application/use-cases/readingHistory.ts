import { z } from "zod";
import type { ReadingHistoryStorage } from "@/application/ports/textStorage";
import { readingResultSchema } from "@/application/reading/readingSchemas";
import type { Orientation } from "@/domain/deck/types";
import {
  EMPTY_HISTORY,
  MAX_HISTORY_RECORDS,
  type ReadingHistory,
  type ReadingRecord,
  type RecordedPosition,
} from "@/domain/history/readingHistory";
import { countCharacters, normalizePositionName } from "@/domain/spread/spread";
import {
  MAX_MAIN_QUESTION_LENGTH,
  MAX_POSITION_NAME_LENGTH,
  MAX_QUESTION_LENGTH,
  MAX_SPREAD_POSITIONS,
  MAX_TEMPLATE_NAME_LENGTH,
} from "@/domain/spread/types";

/**
 * Version of the stored reading history. Bump it whenever the stored shape
 * changes and register a migration from the previous version.
 */
export const READING_HISTORY_VERSION = 2;

type UnknownRecord = Readonly<Record<string, unknown>>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * v1 → v2: positions gained short names. Rounds recorded before them keep
 * their questions and are known by number alone.
 */
function nameRecordedPositions(raw: UnknownRecord): UnknownRecord {
  // Anything unreadable is left for validation to reject.
  if (!Array.isArray(raw.records)) return { ...raw, version: 2 };
  const records: readonly unknown[] = raw.records;
  return {
    ...raw,
    version: 2,
    records: records.map((record) => {
      if (!isRecord(record) || !Array.isArray(record.positions)) return record;
      const positions: readonly unknown[] = record.positions;
      return {
        ...record,
        positions: positions.map((position) =>
          isRecord(position) && !("name" in position)
            ? { ...position, name: "" }
            : position,
        ),
      };
    }),
  };
}

/**
 * Upgrades a raw history of version `n` (the key) to version `n + 1`. The
 * result is still fully validated.
 */
type HistoryMigration = (raw: UnknownRecord) => UnknownRecord;
const HISTORY_MIGRATIONS: Readonly<Record<number, HistoryMigration>> =
  Object.freeze({ 1: nameRecordedPositions });

/** Applies every migration from the stored version up to the current one. */
function upgradeHistory(raw: UnknownRecord): UnknownRecord {
  let upgraded = raw;
  while (
    typeof upgraded.version === "number" &&
    upgraded.version < READING_HISTORY_VERSION
  ) {
    const migrate = HISTORY_MIGRATIONS[upgraded.version];
    if (!migrate) return upgraded;
    upgraded = migrate(upgraded);
  }
  return upgraded;
}

const MAX_ID_LENGTH = 512;

const text = (max: number) =>
  z.string().refine((value) => countCharacters(value) <= max, {
    message: `Must be at most ${max} characters`,
  });

const orientation = z.enum([
  "upright",
  "reversed",
]) satisfies z.ZodType<Orientation>;
const card = z.strictObject({
  cardId: z.string().min(1).max(MAX_ID_LENGTH),
  orientation,
});
const unit = z.number().min(0).max(1);

const position = z.strictObject({
  index: z.number().int().min(1).max(MAX_SPREAD_POSITIONS),
  name: text(MAX_POSITION_NAME_LENGTH).refine(
    (name) => name === normalizePositionName(name).trim(),
    { message: "Names are trimmed and on one line" },
  ),
  question: text(MAX_QUESTION_LENGTH),
  x: unit,
  y: unit,
  rotation: z.number().min(0).lt(360),
  primary: card,
  jumper: card.optional(),
}) satisfies z.ZodType<RecordedPosition>;

/** Everything but the reading, which is checked on its own. */
const recordWithoutReading = z.strictObject({
  id: z.string().min(1).max(MAX_ID_LENGTH),
  roundKey: z
    .string()
    .min(1)
    .max(MAX_ID_LENGTH * MAX_SPREAD_POSITIONS),
  recordedAt: z.iso.datetime(),
  deckId: z.string().min(1).max(MAX_ID_LENGTH),
  spreadName: text(MAX_TEMPLATE_NAME_LENGTH).optional(),
  mainQuestion: text(MAX_MAIN_QUESTION_LENGTH),
  positions: z
    .array(position)
    .min(1)
    .max(MAX_SPREAD_POSITIONS)
    .refine((items) => items.every((item, order) => item.index === order + 1), {
      message: "Position indexes must be 1..n",
    }),
});

const storedHistory = z.strictObject({
  version: z.literal(READING_HISTORY_VERSION),
  records: z.array(z.unknown()).max(MAX_HISTORY_RECORDS),
});

/**
 * One stored record. A reading the current format cannot read (for example
 * after a reading-format change without a migration) is left off rather
 * than losing the whole round.
 */
function readRecord(raw: unknown): ReadingRecord | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const { reading, ...rest } = raw as Readonly<Record<string, unknown>>;
  const parsed = recordWithoutReading.safeParse(rest);
  if (!parsed.success) return undefined;
  const result =
    reading === undefined ? undefined : readingResultSchema.safeParse(reading);
  return result?.success
    ? { ...parsed.data, reading: result.data }
    : parsed.data;
}

export type HistoryParse =
  | { readonly ok: true; readonly history: ReadingHistory }
  | { readonly ok: false };

/** Parses an untrusted stored history; unreadable records are dropped. */
export function parseReadingHistory(raw: unknown): HistoryParse {
  if (!isRecord(raw)) return { ok: false };
  const parsed = storedHistory.safeParse(upgradeHistory(raw));
  if (!parsed.success) return { ok: false };
  const history = parsed.data.records.flatMap((entry) => {
    const record = readRecord(entry);
    return record ? [record] : [];
  });
  return { ok: true, history };
}

export function serializeReadingHistory(history: ReadingHistory): string {
  return JSON.stringify({ version: READING_HISTORY_VERSION, records: history });
}

export type HistoryLoad =
  | { readonly status: "empty"; readonly history: ReadingHistory }
  | { readonly status: "restored"; readonly history: ReadingHistory }
  /** Stored data was unusable; it was removed. */
  | { readonly status: "discarded"; readonly history: ReadingHistory };

export function loadReadingHistory(
  storage: ReadingHistoryStorage,
): HistoryLoad {
  let text: string | null;
  try {
    text = storage.read();
  } catch {
    text = null;
  }
  if (text === null) return { status: "empty", history: EMPTY_HISTORY };

  let parsed: HistoryParse;
  try {
    parsed = parseReadingHistory(JSON.parse(text));
  } catch {
    parsed = { ok: false };
  }
  if (parsed.ok) return { status: "restored", history: parsed.history };

  try {
    storage.clear();
  } catch {
    // The next successful save overwrites it.
  }
  return { status: "discarded", history: EMPTY_HISTORY };
}

export function saveReadingHistory(
  storage: ReadingHistoryStorage,
  history: ReadingHistory,
): { readonly ok: boolean } {
  try {
    if (history.length === 0) {
      storage.clear();
    } else {
      storage.write(serializeReadingHistory(history));
    }
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
