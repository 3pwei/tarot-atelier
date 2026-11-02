import type { DrawResult } from "@/domain/deck/draw";
import {
  MAX_MAIN_QUESTION_LENGTH,
  MAX_QUESTION_LENGTH,
  MAX_SPREAD_POSITIONS,
  MIN_QUESTION_LENGTH,
  type Spread,
  type SpreadPosition,
  type TablePoint,
} from "@/domain/spread/types";

export type SpreadRuleCode =
  "position-limit" | "unknown-position" | "position-drawn" | "invalid-index";

export type SpreadUpdate =
  | { readonly ok: true; readonly spread: Spread }
  | { readonly ok: false; readonly code: SpreadRuleCode };

export interface Renumbering {
  readonly from: number;
  readonly to: number;
}

export type SpreadRemoval =
  | {
      readonly ok: true;
      readonly spread: Spread;
      readonly removedIndex: number;
      /** Positions whose number changed, in their new order. */
      readonly renumbered: readonly Renumbering[];
    }
  | { readonly ok: false; readonly code: SpreadRuleCode };

export type SpreadIssue =
  | { readonly code: "no-positions" }
  | { readonly code: "too-many-positions" }
  | { readonly code: "missing-question"; readonly index: number }
  | { readonly code: "question-too-long"; readonly index: number }
  | { readonly code: "main-question-too-long" };

export interface PositionDraft {
  readonly id: string;
  readonly question: string;
  readonly x: number;
  readonly y: number;
  readonly rotation?: number;
}

/** Counts user-perceived characters closely enough for CJK and emoji. */
export function countCharacters(text: string): number {
  return Array.from(text).length;
}

function truncateCharacters(text: string, limit: number): string {
  const characters = Array.from(text);
  return characters.length > limit ? characters.slice(0, limit).join("") : text;
}

export function clampCoordinate(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

export function normalizeRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  const normalized = ((Math.round(degrees) % 360) + 360) % 360;
  return normalized;
}

function sortByIndex(
  positions: readonly SpreadPosition[],
): readonly SpreadPosition[] {
  return [...positions].sort((a, b) => a.index - b.index);
}

/** Re-assigns 1..n following the given order. */
function renumber(
  positions: readonly SpreadPosition[],
): readonly SpreadPosition[] {
  return Object.freeze(
    positions.map((position, order) =>
      position.index === order + 1
        ? position
        : Object.freeze({ ...position, index: order + 1 }),
    ),
  );
}

function withPositions(
  spread: Spread,
  positions: readonly SpreadPosition[],
): Spread {
  return Object.freeze({ ...spread, positions: renumber(positions) });
}

function findPosition(
  spread: Spread,
  positionId: string,
): SpreadPosition | undefined {
  return spread.positions.find((position) => position.id === positionId);
}

function updatePosition(
  spread: Spread,
  positionId: string,
  change: (position: SpreadPosition) => SpreadPosition,
): SpreadUpdate {
  if (!findPosition(spread, positionId)) {
    return { ok: false, code: "unknown-position" };
  }
  return {
    ok: true,
    spread: withPositions(
      spread,
      spread.positions.map((position) =>
        position.id === positionId ? Object.freeze(change(position)) : position,
      ),
    ),
  };
}

function createPosition(draft: PositionDraft, index: number): SpreadPosition {
  return Object.freeze({
    id: draft.id,
    index,
    question: truncateCharacters(draft.question, MAX_QUESTION_LENGTH),
    x: clampCoordinate(draft.x),
    y: clampCoordinate(draft.y),
    rotation: normalizeRotation(draft.rotation ?? 0),
  });
}

/** Adding or removing positions makes the layout the person's own. */
function detachTemplate(spread: Spread): Spread {
  if (spread.templateId === undefined) return spread;
  const detached: { -readonly [K in keyof Spread]: Spread[K] } = { ...spread };
  delete detached.templateId;
  return detached;
}

export function createSpread(options: {
  readonly id: string;
  readonly templateId?: string;
  readonly positions: readonly PositionDraft[];
  readonly mainQuestion?: string;
}): Spread {
  if (options.positions.length > MAX_SPREAD_POSITIONS) {
    throw new RangeError(
      `A spread holds at most ${MAX_SPREAD_POSITIONS} positions`,
    );
  }
  if (
    new Set(options.positions.map((p) => p.id)).size !==
    options.positions.length
  ) {
    throw new Error("Spread position IDs must be unique");
  }

  return Object.freeze({
    id: options.id,
    ...(options.templateId ? { templateId: options.templateId } : {}),
    mainQuestion: truncateCharacters(
      options.mainQuestion ?? "",
      MAX_MAIN_QUESTION_LENGTH,
    ),
    positions: Object.freeze(
      options.positions.map((draft, order) => createPosition(draft, order + 1)),
    ),
  });
}

export function canAddPosition(spread: Spread): boolean {
  return spread.positions.length < MAX_SPREAD_POSITIONS;
}

/** New positions are numbered after the current last one. */
export function addPosition(
  spread: Spread,
  draft: PositionDraft,
): SpreadUpdate {
  if (!canAddPosition(spread)) return { ok: false, code: "position-limit" };
  if (findPosition(spread, draft.id)) {
    throw new Error("Spread position IDs must be unique");
  }
  return {
    ok: true,
    spread: Object.freeze({
      ...detachTemplate(spread),
      positions: Object.freeze([
        ...spread.positions,
        createPosition(draft, spread.positions.length + 1),
      ]),
    }),
  };
}

/**
 * Removes an empty position and closes the gap, keeping everyone else in their
 * current order. Drawn cards are never discarded silently, so a position that
 * already holds cards cannot be removed; clear the whole spread instead.
 */
export function removePosition(
  spread: Spread,
  positionId: string,
): SpreadRemoval {
  const target = findPosition(spread, positionId);
  if (!target) return { ok: false, code: "unknown-position" };
  if (target.drawResult) return { ok: false, code: "position-drawn" };

  const remaining = sortByIndex(spread.positions).filter(
    (position) => position.id !== positionId,
  );
  const next = withPositions(spread, remaining);
  const renumbered = next.positions.flatMap((position, order) => {
    const before = remaining[order]?.index ?? position.index;
    return before === position.index
      ? []
      : [{ from: before, to: position.index }];
  });

  return {
    ok: true,
    spread: Object.freeze(detachTemplate(next)),
    removedIndex: target.index,
    renumbered,
  };
}

/** Moving never touches `drawResult`: a drawn card travels with its place. */
export function movePosition(
  spread: Spread,
  positionId: string,
  point: TablePoint,
): SpreadUpdate {
  return updatePosition(spread, positionId, (position) => ({
    ...position,
    x: clampCoordinate(point.x),
    y: clampCoordinate(point.y),
  }));
}

export function nudgePosition(
  spread: Spread,
  positionId: string,
  delta: TablePoint,
): SpreadUpdate {
  const position = findPosition(spread, positionId);
  if (!position) return { ok: false, code: "unknown-position" };
  return movePosition(spread, positionId, {
    x: position.x + delta.x,
    y: position.y + delta.y,
  });
}

export function rotatePosition(
  spread: Spread,
  positionId: string,
  degrees: number,
): SpreadUpdate {
  return updatePosition(spread, positionId, (position) => ({
    ...position,
    rotation: normalizeRotation(degrees),
  }));
}

/** Stores the text as typed (capped at the limit); validation trims. */
export function setPositionQuestion(
  spread: Spread,
  positionId: string,
  question: string,
): SpreadUpdate {
  return updatePosition(spread, positionId, (position) => ({
    ...position,
    question: truncateCharacters(question, MAX_QUESTION_LENGTH),
  }));
}

export function setMainQuestion(spread: Spread, question: string): Spread {
  return Object.freeze({
    ...spread,
    mainQuestion: truncateCharacters(question, MAX_MAIN_QUESTION_LENGTH),
  });
}

/** Moves a position to `targetIndex`; the others shift to stay 1..n. */
export function reorderPosition(
  spread: Spread,
  positionId: string,
  targetIndex: number,
): SpreadUpdate {
  const target = findPosition(spread, positionId);
  if (!target) return { ok: false, code: "unknown-position" };
  if (
    !Number.isInteger(targetIndex) ||
    targetIndex < 1 ||
    targetIndex > spread.positions.length
  ) {
    return { ok: false, code: "invalid-index" };
  }

  const ordered = sortByIndex(spread.positions).filter(
    (position) => position.id !== positionId,
  );
  ordered.splice(targetIndex - 1, 0, target);
  return { ok: true, spread: withPositions(spread, ordered) };
}

/** Binds a draw (primary plus optional jumper) to one empty position. */
export function assignDraw(
  spread: Spread,
  positionId: string,
  result: DrawResult,
): SpreadUpdate {
  const target = findPosition(spread, positionId);
  if (!target) return { ok: false, code: "unknown-position" };
  if (target.drawResult) return { ok: false, code: "position-drawn" };
  return updatePosition(spread, positionId, (position) => ({
    ...position,
    drawResult: result,
  }));
}

export function hasDraws(spread: Spread): boolean {
  return spread.positions.some((position) => position.drawResult);
}

/** Cards are dealt in number order to the first position without a draw. */
export function nextPositionToDraw(spread: Spread): SpreadPosition | undefined {
  return sortByIndex(spread.positions).find((position) => !position.drawResult);
}

export function isQuestionValid(question: string): boolean {
  const length = countCharacters(question.trim());
  return length >= MIN_QUESTION_LENGTH && length <= MAX_QUESTION_LENGTH;
}

/** Every reason the spread is not ready to draw or interpret. */
export function validateSpread(spread: Spread): readonly SpreadIssue[] {
  const issues: SpreadIssue[] = [];
  if (spread.positions.length === 0) issues.push({ code: "no-positions" });
  if (spread.positions.length > MAX_SPREAD_POSITIONS) {
    issues.push({ code: "too-many-positions" });
  }
  if (countCharacters(spread.mainQuestion) > MAX_MAIN_QUESTION_LENGTH) {
    issues.push({ code: "main-question-too-long" });
  }
  for (const position of sortByIndex(spread.positions)) {
    const length = countCharacters(position.question.trim());
    if (length < MIN_QUESTION_LENGTH) {
      issues.push({ code: "missing-question", index: position.index });
    } else if (length > MAX_QUESTION_LENGTH) {
      issues.push({ code: "question-too-long", index: position.index });
    }
  }
  return issues;
}

export function isSpreadReady(spread: Spread): boolean {
  return validateSpread(spread).length === 0;
}

/**
 * Clearance between position centres, in table-relative units, roughly one
 * card footprint on the standard 3:2 table (cards are narrow and tall there).
 */
export const DEFAULT_PLACEMENT_CLEARANCE: TablePoint = Object.freeze({
  x: 0.14,
  y: 0.36,
});

function gridSteps(clearance: number): readonly number[] {
  const count = Math.max(2, Math.floor(1 / clearance) + 1);
  return Array.from({ length: count }, (_, step) => step / (count - 1));
}

/**
 * Finds the free spot closest to `preferred`, so a new place never lands on
 * top of an old one. Falls back to `preferred` when the table is full.
 */
export function suggestPlacement(
  spread: Spread,
  preferred: TablePoint,
  clearance: TablePoint = DEFAULT_PLACEMENT_CLEARANCE,
): TablePoint {
  const isFree = (point: TablePoint) =>
    spread.positions.every(
      (position) =>
        Math.abs(position.x - point.x) >= clearance.x - 1e-9 ||
        Math.abs(position.y - point.y) >= clearance.y - 1e-9,
    );
  const start = {
    x: clampCoordinate(preferred.x),
    y: clampCoordinate(preferred.y),
  };
  if (isFree(start)) return start;

  const distance = (point: TablePoint) =>
    ((point.x - start.x) / clearance.x) ** 2 +
    ((point.y - start.y) / clearance.y) ** 2;
  const candidates = gridSteps(clearance.y)
    .flatMap((y) => gridSteps(clearance.x).map((x) => ({ x, y })))
    .sort((a, b) => distance(a) - distance(b));
  return candidates.find(isFree) ?? start;
}
