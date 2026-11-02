import type { Deck } from "@/domain/deck/deck";
import type { DrawResult } from "@/domain/deck/draw";
import type { CardInstance, Orientation } from "@/domain/deck/types";
import { countCharacters, normalizeRotation } from "@/domain/spread/spread";
import {
  MAX_MAIN_QUESTION_LENGTH,
  MAX_QUESTION_LENGTH,
  MAX_SPREAD_POSITIONS,
  type Spread,
  type SpreadPosition,
  type SpreadPresetId,
} from "@/domain/spread/types";

/**
 * Version of the persisted spread session. Bump it whenever the stored shape
 * changes and register a migration from the previous version.
 */
export const SPREAD_SNAPSHOT_VERSION = 1;

/** Everything needed to restore a reading after a reload. */
export interface SpreadSession {
  readonly deckId: string;
  readonly spread: Spread;
  /** Drawn cards the person has already burned open. */
  readonly revealedInstanceIds: readonly string[];
}

type UnknownRecord = Readonly<Record<string, unknown>>;

/**
 * Upgrades a raw snapshot of version `n` (the key) to version `n + 1`.
 * Migrations receive untrusted data; the result is still fully validated.
 */
export type SnapshotMigration = (snapshot: UnknownRecord) => UnknownRecord;
export type SnapshotMigrations = Readonly<Record<number, SnapshotMigration>>;

/** Version 1 is the first persisted shape, so nothing needs upgrading yet. */
export const SPREAD_SNAPSHOT_MIGRATIONS: SnapshotMigrations = Object.freeze({});

export type SnapshotParseResult =
  | {
      readonly ok: true;
      readonly session: SpreadSession;
      readonly savedAt: string;
      readonly migratedFrom?: number;
    }
  | {
      readonly ok: false;
      readonly reason: "unsupported-version" | "invalid";
      readonly issues: readonly string[];
    };

const PRESET_IDS = new Set<SpreadPresetId>([
  "three-card",
  "five-card",
  "circle",
  "custom",
]);
const ORIENTATIONS = new Set<Orientation>(["upright", "reversed"]);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isId(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

function isUnit(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

class Issues {
  readonly list: string[] = [];
  add(path: string, message: string): void {
    this.list.push(`${path}: ${message}`);
  }
}

function readInstance(
  value: unknown,
  path: string,
  deckId: string,
  issues: Issues,
): CardInstance | undefined {
  if (!isRecord(value)) {
    issues.add(path, "must be an object");
    return undefined;
  }
  const { instanceId, deckId: instanceDeck, cardId, orientation } = value;
  if (!isId(instanceId)) issues.add(`${path}.instanceId`, "invalid ID");
  if (instanceDeck !== deckId) issues.add(`${path}.deckId`, "deck mismatch");
  if (!isId(cardId)) issues.add(`${path}.cardId`, "invalid ID");
  if (!ORIENTATIONS.has(orientation as Orientation)) {
    issues.add(`${path}.orientation`, "must be upright or reversed");
  }
  if (!isId(instanceId) || !isId(cardId) || instanceDeck !== deckId) {
    return undefined;
  }
  return Object.freeze({
    instanceId,
    deckId,
    cardId,
    orientation: orientation as Orientation,
  });
}

function readDrawResult(
  value: unknown,
  path: string,
  deckId: string,
  issues: Issues,
): DrawResult | undefined {
  if (!isRecord(value)) {
    issues.add(path, "must be an object");
    return undefined;
  }
  const primary = readInstance(
    value.primary,
    `${path}.primary`,
    deckId,
    issues,
  );
  const jumper =
    value.jumper === undefined
      ? undefined
      : readInstance(value.jumper, `${path}.jumper`, deckId, issues);
  if (!isIsoDate(value.drawnAt)) issues.add(`${path}.drawnAt`, "invalid date");
  if (!primary || !isIsoDate(value.drawnAt)) return undefined;
  return Object.freeze({
    primary,
    ...(jumper ? { jumper } : {}),
    drawnAt: value.drawnAt,
  });
}

function readPosition(
  value: unknown,
  path: string,
  deckId: string,
  issues: Issues,
): SpreadPosition | undefined {
  if (!isRecord(value)) {
    issues.add(path, "must be an object");
    return undefined;
  }
  const { id, index, question, x, y, rotation } = value;
  const before = issues.list.length;
  if (!isId(id)) issues.add(`${path}.id`, "invalid ID");
  if (typeof index !== "number" || !Number.isInteger(index) || index < 1) {
    issues.add(`${path}.index`, "must be a positive integer");
  }
  if (
    typeof question !== "string" ||
    countCharacters(question) > MAX_QUESTION_LENGTH
  ) {
    issues.add(
      `${path}.question`,
      `must be text up to ${MAX_QUESTION_LENGTH} characters`,
    );
  }
  if (!isUnit(x)) issues.add(`${path}.x`, "must be within 0–1");
  if (!isUnit(y)) issues.add(`${path}.y`, "must be within 0–1");
  if (typeof rotation !== "number" || !Number.isFinite(rotation)) {
    issues.add(`${path}.rotation`, "must be a finite number");
  }
  const drawResult =
    value.drawResult === undefined
      ? undefined
      : readDrawResult(value.drawResult, `${path}.drawResult`, deckId, issues);
  if (issues.list.length !== before) return undefined;

  return Object.freeze({
    id: id as string,
    index: index as number,
    question: question as string,
    x: x as number,
    y: y as number,
    rotation: normalizeRotation(rotation as number),
    ...(drawResult ? { drawResult } : {}),
  });
}

function readSpread(
  value: unknown,
  deckId: string,
  issues: Issues,
): Spread | undefined {
  if (!isRecord(value)) {
    issues.add("spread", "must be an object");
    return undefined;
  }
  const { id, presetId, mainQuestion, positions } = value;
  if (!isId(id)) issues.add("spread.id", "invalid ID");
  if (!PRESET_IDS.has(presetId as SpreadPresetId)) {
    issues.add("spread.presetId", "unknown preset");
  }
  if (
    typeof mainQuestion !== "string" ||
    countCharacters(mainQuestion) > MAX_MAIN_QUESTION_LENGTH
  ) {
    issues.add("spread.mainQuestion", "must be text within the length limit");
  }
  if (!Array.isArray(positions)) {
    issues.add("spread.positions", "must be an array");
    return undefined;
  }
  if (positions.length > MAX_SPREAD_POSITIONS) {
    issues.add("spread.positions", `at most ${MAX_SPREAD_POSITIONS} positions`);
  }

  const parsed = positions.flatMap((position, order) => {
    const read = readPosition(
      position,
      `spread.positions[${order}]`,
      deckId,
      issues,
    );
    return read ? [read] : [];
  });
  const sorted = [...parsed].sort((a, b) => a.index - b.index);
  if (sorted.some((position, order) => position.index !== order + 1)) {
    issues.add("spread.positions", "indexes must be unique and run 1..n");
  }
  if (new Set(parsed.map((position) => position.id)).size !== parsed.length) {
    issues.add("spread.positions", "position IDs must be unique");
  }

  const instances = parsed.flatMap((position) =>
    position.drawResult
      ? [position.drawResult.primary, position.drawResult.jumper].filter(
          (instance): instance is CardInstance => Boolean(instance),
        )
      : [],
  );
  if (new Set(instances.map((card) => card.cardId)).size !== instances.length) {
    issues.add("spread.positions", "a card cannot be drawn twice");
  }
  if (
    new Set(instances.map((card) => card.instanceId)).size !== instances.length
  ) {
    issues.add("spread.positions", "card instance IDs must be unique");
  }

  if (issues.list.length > 0) return undefined;
  return Object.freeze({
    id: id as string,
    presetId: presetId as SpreadPresetId,
    mainQuestion: mainQuestion as string,
    positions: Object.freeze(sorted),
  });
}

export function collectDrawnInstances(spread: Spread): readonly CardInstance[] {
  return spread.positions.flatMap((position) => {
    const result = position.drawResult;
    if (!result) return [];
    return result.jumper ? [result.primary, result.jumper] : [result.primary];
  });
}

function readSession(
  value: unknown,
  issues: Issues,
): SpreadSession | undefined {
  if (!isRecord(value)) {
    issues.add("session", "must be an object");
    return undefined;
  }
  const { deckId, spread, revealedInstanceIds } = value;
  if (!isId(deckId)) {
    issues.add("session.deckId", "invalid ID");
    return undefined;
  }
  const parsedSpread = readSpread(spread, deckId, issues);
  if (
    !Array.isArray(revealedInstanceIds) ||
    !revealedInstanceIds.every((instanceId) => isId(instanceId))
  ) {
    issues.add("session.revealedInstanceIds", "must be a list of IDs");
  }
  if (!parsedSpread || issues.list.length > 0) return undefined;

  const drawn = new Set(
    collectDrawnInstances(parsedSpread).map((card) => card.instanceId),
  );
  const revealed = (revealedInstanceIds as string[]).filter((instanceId) =>
    drawn.has(instanceId),
  );
  return Object.freeze({
    deckId,
    spread: parsedSpread,
    revealedInstanceIds: Object.freeze([...new Set(revealed)]),
  });
}

/**
 * Parses untrusted stored data. Older versions are migrated step by step;
 * anything newer, unversioned or malformed is rejected rather than guessed at.
 */
export function parseSpreadSnapshot(
  raw: unknown,
  migrations: SnapshotMigrations = SPREAD_SNAPSHOT_MIGRATIONS,
  currentVersion: number = SPREAD_SNAPSHOT_VERSION,
): SnapshotParseResult {
  if (!isRecord(raw)) {
    return {
      ok: false,
      reason: "invalid",
      issues: ["snapshot must be an object"],
    };
  }
  const version = raw.schemaVersion;
  if (
    typeof version !== "number" ||
    !Number.isInteger(version) ||
    version < 1
  ) {
    return {
      ok: false,
      reason: "invalid",
      issues: ["schemaVersion is missing"],
    };
  }
  if (version > currentVersion) {
    return {
      ok: false,
      reason: "unsupported-version",
      issues: [`schemaVersion ${version} is newer than ${currentVersion}`],
    };
  }

  let snapshot: UnknownRecord = raw;
  for (let from = version; from < currentVersion; from += 1) {
    const migrate = migrations[from];
    if (!migrate) {
      return {
        ok: false,
        reason: "unsupported-version",
        issues: [`no migration from schemaVersion ${from}`],
      };
    }
    try {
      snapshot = { ...migrate(snapshot), schemaVersion: from + 1 };
    } catch {
      return {
        ok: false,
        reason: "invalid",
        issues: [`migration from schemaVersion ${from} failed`],
      };
    }
  }

  const issues = new Issues();
  if (!isIsoDate(snapshot.savedAt)) issues.add("savedAt", "invalid date");
  const session = readSession(snapshot.session, issues);
  if (!session || issues.list.length > 0) {
    return { ok: false, reason: "invalid", issues: issues.list };
  }
  return {
    ok: true,
    session,
    savedAt: snapshot.savedAt as string,
    ...(version < currentVersion ? { migratedFrom: version } : {}),
  };
}

export class SpreadSnapshotError extends Error {
  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Spread snapshot is invalid: ${issues.join("; ")}`);
    this.name = "SpreadSnapshotError";
    this.issues = issues;
  }
}

/**
 * Produces the stored form. The output is parsed back before it is returned,
 * so a malformed session can never be written and break the next load.
 */
export function serializeSpreadSession(
  session: SpreadSession,
  savedAt: Date,
): string {
  const snapshot = {
    schemaVersion: SPREAD_SNAPSHOT_VERSION,
    savedAt: savedAt.toISOString(),
    session,
  };
  const json = JSON.stringify(snapshot);
  const check = parseSpreadSnapshot(JSON.parse(json));
  if (!check.ok) throw new SpreadSnapshotError(check.issues);
  return json;
}

/** Cross-checks a parsed session against the deck it claims to use. */
export function verifySessionDeck(
  session: SpreadSession,
  deck: Deck,
): readonly string[] {
  if (session.deckId !== deck.id) return ["session uses a different deck"];
  return collectDrawnInstances(session.spread).flatMap((card) => {
    if (!deck.hasCard(card.cardId)) return [`unknown card ${card.cardId}`];
    if (card.orientation === "reversed" && !deck.manifest.supportsReversals) {
      return [`deck does not allow reversed ${card.cardId}`];
    }
    return [];
  });
}
