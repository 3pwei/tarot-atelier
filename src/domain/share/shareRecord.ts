import type { ReadingRecord } from "@/domain/history/readingHistory";
import { countCharacters } from "@/domain/spread/spread";

/** Who sees the player's own words when a round is shared. */
export type QuestionVisibility = "shown" | "hidden";

/**
 * The round as it may leave the device. With questions hidden, the main
 * question and every position's question are removed, the reading's copies
 * of them included.
 */
export function shareableRecord(
  record: ReadingRecord,
  questions: QuestionVisibility,
): ReadingRecord {
  if (questions === "shown") return record;
  const { reading } = record;
  return {
    ...record,
    mainQuestion: "",
    positions: record.positions.map((position) => ({
      ...position,
      question: "",
    })),
    ...(reading
      ? {
          reading: {
            ...reading,
            positions: reading.positions.map((position) => ({
              ...position,
              question: "",
            })),
          },
        }
      : {}),
  };
}

const SENTENCE_END = /[。！？!?]/u;

/**
 * Shortens `text` to at most `maxCharacters` user-perceived characters. It
 * ends on the last full sentence that fits, or adds an ellipsis when even
 * the first sentence is too long.
 */
export function summarizeText(text: string, maxCharacters: number): string {
  const trimmed = text.trim();
  if (countCharacters(trimmed) <= maxCharacters) return trimmed;
  const characters = Array.from(trimmed).slice(0, maxCharacters);
  for (let end = characters.length - 1; end > 0; end -= 1) {
    if (SENTENCE_END.test(characters[end] ?? "")) {
      return characters.slice(0, end + 1).join("");
    }
  }
  return `${characters.slice(0, maxCharacters - 1).join("")}…`;
}
