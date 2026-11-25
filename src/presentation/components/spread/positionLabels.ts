/** How a position is named in words, wherever it is listed or read aloud. */

interface NamedPosition {
  readonly index: number;
  readonly name: string;
  readonly question: string;
}

export const MISSING_QUESTION_LABEL = "尚未設定問題";

/**
 * "牌位 1：過去，這件事的過去與起因是什麼？" — the number first, so a
 * screen reader can jump between positions, then the short name if any.
 */
export function positionSummary(position: NamedPosition): string {
  const name = position.name.trim();
  const question = position.question.trim() || MISSING_QUESTION_LABEL;
  return `牌位 ${position.index}：${name ? `${name}，` : ""}${question}`;
}
