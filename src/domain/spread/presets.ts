import { createSpread, type PositionDraft } from "@/domain/spread/spread";
import type { Spread, SpreadPresetId } from "@/domain/spread/types";

interface PresetPosition {
  readonly question: string;
  readonly x: number;
  readonly y: number;
  readonly rotation?: number;
}

export interface SpreadPreset {
  readonly id: SpreadPresetId;
  readonly name: string;
  readonly description: string;
  readonly positions: readonly PresetPosition[];
}

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

/** Centre and radii of the circle preset, in table-relative units. */
const CIRCLE_CENTER = { x: 0.5, y: 0.5 } as const;
const CIRCLE_RADIUS = { x: 0.4, y: 0.48 } as const;

function circlePositions(): readonly PresetPosition[] {
  return CIRCLE_QUESTIONS.map((question, order) => {
    // Start at twelve o'clock and go clockwise.
    const angle = (order / CIRCLE_QUESTIONS.length) * Math.PI * 2 - Math.PI / 2;
    return {
      question,
      x: Number(
        (CIRCLE_CENTER.x + Math.cos(angle) * CIRCLE_RADIUS.x).toFixed(4),
      ),
      y: Number(
        (CIRCLE_CENTER.y + Math.sin(angle) * CIRCLE_RADIUS.y).toFixed(4),
      ),
    };
  });
}

export const SPREAD_PRESETS: readonly SpreadPreset[] = Object.freeze([
  {
    id: "three-card",
    name: "經典三張",
    description: "過去、現在、未來，一條清楚的時間線。",
    positions: [
      { question: "這件事的過去與起因是什麼？", x: 0.22, y: 0.5 },
      { question: "現在的狀態是什麼？", x: 0.5, y: 0.5 },
      { question: "接下來可能的走向是什麼？", x: 0.78, y: 0.5 },
    ],
  },
  {
    id: "five-card",
    name: "五張十字",
    description: "以現況為中心，向四方展開阻礙、根源、目標與走向。",
    positions: [
      { question: "我現在真正的處境是什麼？", x: 0.5, y: 0.5 },
      { question: "什麼正在阻礙我？", x: 0.24, y: 0.5 },
      { question: "接下來的發展會是什麼？", x: 0.76, y: 0.5 },
      { question: "我意識到的目標是什麼？", x: 0.5, y: 0 },
      { question: "藏在底下的根源是什麼？", x: 0.5, y: 1 },
    ],
  },
  {
    id: "circle",
    name: "圓環",
    description: "八個面向環繞同一個主題，從十二點鐘方向順時針解讀。",
    positions: circlePositions(),
  },
  {
    id: "custom",
    name: "完全自訂",
    description: "從空白牌桌開始，自行新增 1–12 個牌位並各自設題。",
    positions: [],
  },
] satisfies readonly SpreadPreset[]);

export function getSpreadPreset(presetId: SpreadPresetId): SpreadPreset {
  const preset = SPREAD_PRESETS.find((candidate) => candidate.id === presetId);
  if (!preset) throw new Error(`Unknown spread preset: ${presetId}`);
  return preset;
}

export const DEFAULT_SPREAD_PRESET: SpreadPresetId = "three-card";

/** Builds a fresh spread from a preset with caller-supplied stable IDs. */
export function createSpreadFromPreset(options: {
  readonly presetId: SpreadPresetId;
  readonly createId: () => string;
  readonly mainQuestion?: string;
}): Spread {
  const preset = getSpreadPreset(options.presetId);
  const positions: PositionDraft[] = preset.positions.map((position) => ({
    id: options.createId(),
    ...position,
  }));
  return createSpread({
    id: options.createId(),
    presetId: preset.id,
    positions,
    mainQuestion: options.mainQuestion,
  });
}
