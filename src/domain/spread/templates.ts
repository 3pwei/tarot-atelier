import {
  clampCoordinate,
  countCharacters,
  createSpread,
  normalizeRotation,
} from "@/domain/spread/spread";
import {
  MAX_QUESTION_LENGTH,
  MAX_SAVED_TEMPLATES,
  MAX_SPREAD_POSITIONS,
  MAX_TEMPLATE_NAME_LENGTH,
  type Spread,
} from "@/domain/spread/types";

/** A layout of positions with their questions, ready to start a reading. */
export interface TemplatePosition {
  readonly question: string;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
}

export interface SpreadTemplate {
  readonly id: string;
  readonly name: string;
  /** Shipped with the app. Deletable, and restorable from the library. */
  readonly builtIn: boolean;
  readonly positions: readonly TemplatePosition[];
}

/** The library is an ordered list; the person decides what stays in it. */
export type TemplateLibrary = readonly SpreadTemplate[];

export type TemplateRuleCode =
  | "name-required"
  | "name-too-long"
  | "no-positions"
  | "library-full"
  | "unknown-template";

export type LibraryUpdate =
  | {
      readonly ok: true;
      readonly library: TemplateLibrary;
      readonly template: SpreadTemplate;
      /** True when a template with the same name was replaced. */
      readonly replaced: boolean;
    }
  | { readonly ok: false; readonly code: TemplateRuleCode };

const CIRCLE_QUESTIONS = [
  "此刻的核心能量是什麼？",
  "我正在追求什麼？",
  "我需要放下什麼？",
  "身邊的人如何影響這件事？",
  "我還沒看見的面向是什麼？",
  "我能依靠的資源是什麼？",
  "接下來需要留意什麼？",
  "這個循環會帶我走向哪裡？",
] as const;

/** Centre and radii of the circle template, in table-relative units. */
const CIRCLE_CENTER = { x: 0.5, y: 0.5 } as const;
const CIRCLE_RADIUS = { x: 0.4, y: 0.48 } as const;

function circlePositions(): readonly TemplatePosition[] {
  return CIRCLE_QUESTIONS.map((question, order) => {
    // Start at twelve o'clock and go clockwise.
    const angle = (order / CIRCLE_QUESTIONS.length) * Math.PI * 2 - Math.PI / 2;
    const round = (value: number) => Number(value.toFixed(4));
    return {
      question,
      x: round(CIRCLE_CENTER.x + Math.cos(angle) * CIRCLE_RADIUS.x),
      y: round(CIRCLE_CENTER.y + Math.sin(angle) * CIRCLE_RADIUS.y),
      rotation: 0,
    };
  });
}

export const BUILT_IN_TEMPLATES: TemplateLibrary = Object.freeze([
  {
    id: "three-card",
    name: "經典三張",
    builtIn: true,
    positions: [
      { question: "這件事的過去與起因是什麼？", x: 0.22, y: 0.5, rotation: 0 },
      { question: "現在的狀態是什麼？", x: 0.5, y: 0.5, rotation: 0 },
      { question: "接下來可能的走向是什麼？", x: 0.78, y: 0.5, rotation: 0 },
    ],
  },
  {
    id: "five-card",
    name: "五張十字",
    builtIn: true,
    positions: [
      { question: "我現在真正的處境是什麼？", x: 0.5, y: 0.5, rotation: 0 },
      { question: "什麼正在阻礙我？", x: 0.24, y: 0.5, rotation: 0 },
      { question: "接下來的發展會是什麼？", x: 0.76, y: 0.5, rotation: 0 },
      { question: "我意識到的目標是什麼？", x: 0.5, y: 0, rotation: 0 },
      { question: "藏在底下的根源是什麼？", x: 0.5, y: 1, rotation: 0 },
    ],
  },
  {
    id: "circle",
    name: "圓環",
    builtIn: true,
    positions: circlePositions(),
  },
] satisfies TemplateLibrary);

/** A fresh reading starts from the first template still in the library. */
export function defaultTemplate(
  library: TemplateLibrary,
): SpreadTemplate | undefined {
  return library[0];
}

export function createSpreadFromTemplate(options: {
  readonly template: SpreadTemplate;
  readonly createId: () => string;
  readonly mainQuestion?: string;
}): Spread {
  return createSpread({
    id: options.createId(),
    templateId: options.template.id,
    mainQuestion: options.mainQuestion,
    positions: options.template.positions.map((position) => ({
      id: options.createId(),
      ...position,
    })),
  });
}

export function createBlankSpread(options: {
  readonly createId: () => string;
  readonly mainQuestion?: string;
}): Spread {
  return createSpread({
    id: options.createId(),
    mainQuestion: options.mainQuestion,
    positions: [],
  });
}

/** Names are trimmed, single-line and 1–30 characters. */
export function normalizeTemplateName(name: string): string {
  return name.replace(/\s+/gu, " ").trim();
}

function validateName(name: string): TemplateRuleCode | undefined {
  const length = countCharacters(name);
  if (length === 0) return "name-required";
  if (length > MAX_TEMPLATE_NAME_LENGTH) return "name-too-long";
  return undefined;
}

/**
 * Saves the spread's layout and questions (not its cards or main question)
 * under `name`. A template with the same name is replaced in place, so
 * saving again updates it rather than piling up copies.
 */
export function saveTemplate(
  library: TemplateLibrary,
  options: {
    readonly spread: Spread;
    readonly name: string;
    readonly createId: () => string;
  },
): LibraryUpdate {
  const name = normalizeTemplateName(options.name);
  const nameIssue = validateName(name);
  if (nameIssue) return { ok: false, code: nameIssue };
  if (options.spread.positions.length === 0) {
    return { ok: false, code: "no-positions" };
  }

  const existing = library.find((template) => template.name === name);
  if (!existing && library.length >= MAX_SAVED_TEMPLATES) {
    return { ok: false, code: "library-full" };
  }

  const template: SpreadTemplate = Object.freeze({
    id: existing?.id ?? options.createId(),
    name,
    builtIn: false,
    positions: Object.freeze(
      options.spread.positions.map((position) =>
        Object.freeze({
          question: position.question,
          x: position.x,
          y: position.y,
          rotation: position.rotation,
        }),
      ),
    ),
  });

  return {
    ok: true,
    template,
    replaced: Boolean(existing),
    library: Object.freeze(
      existing
        ? library.map((item) => (item.id === existing.id ? template : item))
        : [...library, template],
    ),
  };
}

export function deleteTemplate(
  library: TemplateLibrary,
  templateId: string,
):
  | { readonly ok: true; readonly library: TemplateLibrary }
  | { readonly ok: false; readonly code: "unknown-template" } {
  if (!library.some((template) => template.id === templateId)) {
    return { ok: false, code: "unknown-template" };
  }
  return {
    ok: true,
    library: Object.freeze(
      library.filter((template) => template.id !== templateId),
    ),
  };
}

export function missingBuiltIns(library: TemplateLibrary): TemplateLibrary {
  return BUILT_IN_TEMPLATES.filter(
    (builtIn) => !library.some((template) => template.id === builtIn.id),
  );
}

/** Puts deleted built-in templates back in their original order, first. */
export function restoreBuiltIns(library: TemplateLibrary): TemplateLibrary {
  const restored = BUILT_IN_TEMPLATES.map(
    (builtIn) =>
      library.find((template) => template.id === builtIn.id) ?? builtIn,
  );
  const custom = library.filter((template) => !template.builtIn);
  return Object.freeze([...restored, ...custom]);
}

/* ── Persistence ────────────────────────────────────────── */

export const TEMPLATE_LIBRARY_VERSION = 1;

type UnknownRecord = Readonly<Record<string, unknown>>;

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUnit(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function readTemplatePosition(value: unknown): TemplatePosition | undefined {
  if (!isRecord(value)) return undefined;
  const { question, x, y, rotation } = value;
  if (
    typeof question !== "string" ||
    countCharacters(question) > MAX_QUESTION_LENGTH ||
    !isUnit(x) ||
    !isUnit(y) ||
    typeof rotation !== "number" ||
    !Number.isFinite(rotation)
  ) {
    return undefined;
  }
  return Object.freeze({
    question,
    x: clampCoordinate(x),
    y: clampCoordinate(y),
    rotation: normalizeRotation(rotation),
  });
}

function readTemplate(value: unknown): SpreadTemplate | undefined {
  if (!isRecord(value)) return undefined;
  const { id, name, builtIn, positions } = value;
  if (typeof id !== "string" || !ID_PATTERN.test(id)) return undefined;
  if (typeof name !== "string" || validateName(name)) return undefined;
  if (typeof builtIn !== "boolean") return undefined;
  if (
    !Array.isArray(positions) ||
    positions.length === 0 ||
    positions.length > MAX_SPREAD_POSITIONS
  ) {
    return undefined;
  }
  const parsed = positions.map(readTemplatePosition);
  if (parsed.some((position) => !position)) return undefined;
  return Object.freeze({
    id,
    name,
    builtIn,
    positions: Object.freeze(parsed as TemplatePosition[]),
  });
}

/**
 * Parses an untrusted stored library. Any malformed template makes the whole
 * value unreadable, so a partly broken store never silently loses entries.
 */
export function parseTemplateLibrary(
  raw: unknown,
): TemplateLibrary | undefined {
  if (!isRecord(raw) || raw.schemaVersion !== TEMPLATE_LIBRARY_VERSION) {
    return undefined;
  }
  const { templates } = raw;
  if (!Array.isArray(templates) || templates.length > MAX_SAVED_TEMPLATES) {
    return undefined;
  }
  const parsed = templates.map(readTemplate);
  if (parsed.some((template) => !template)) return undefined;
  const library = parsed as SpreadTemplate[];
  const ids = new Set(library.map((template) => template.id));
  const names = new Set(library.map((template) => template.name));
  if (ids.size !== library.length || names.size !== library.length) {
    return undefined;
  }
  return Object.freeze(library);
}

/** Validates by parsing the output back; invalid libraries are never stored. */
export function serializeTemplateLibrary(library: TemplateLibrary): string {
  const json = JSON.stringify({
    schemaVersion: TEMPLATE_LIBRARY_VERSION,
    templates: library,
  });
  if (!parseTemplateLibrary(JSON.parse(json))) {
    throw new Error("Template library is invalid");
  }
  return json;
}
