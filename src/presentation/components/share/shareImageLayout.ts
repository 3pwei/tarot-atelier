/** The share image is 4:5, the shape feeds and chats show whole. */
export const SHARE_IMAGE_SIZE = { width: 1080, height: 1350 } as const;

/** Card faces are 2:3. */
export const CARD_ASPECT = 1.5;

export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CardGrid {
  readonly columns: number;
  readonly rows: number;
  readonly cardWidth: number;
  readonly cardHeight: number;
  /** Each card's face, in position order; captions go below. */
  readonly faces: readonly Box[];
  /** Where the last row's captions end. */
  readonly bottom: number;
}

const MAX_COLUMNS = 4;
const MAX_CARD_WIDTH = 260;

/** Up to four in a row; three per row for five or six, so rows stay even. */
export function columnsFor(count: number): number {
  if (count <= MAX_COLUMNS) return Math.max(1, count);
  if (count <= 6) return 3;
  return MAX_COLUMNS;
}

/**
 * Lays `count` cards out from the top of `area`, each row centred, each card
 * with `captionHeight` of room beneath it, as large as fits.
 */
export function cardGrid(options: {
  readonly count: number;
  readonly area: Box;
  readonly gap: number;
  readonly captionHeight: number;
}): CardGrid {
  const { count, area, gap, captionHeight } = options;
  const columns = columnsFor(count);
  const rows = Math.ceil(count / columns);
  const byWidth = (area.width - gap * (columns - 1)) / columns;
  const rowHeight = (area.height - gap * (rows - 1)) / rows;
  const byHeight = (rowHeight - captionHeight) / CARD_ASPECT;
  const cardWidth = Math.floor(Math.min(MAX_CARD_WIDTH, byWidth, byHeight));
  const cardHeight = Math.floor(cardWidth * CARD_ASPECT);
  const usedHeight = rows * (cardHeight + captionHeight) + gap * (rows - 1);

  const faces = Array.from({ length: count }, (_, order) => {
    const row = Math.floor(order / columns);
    const inRow = Math.min(columns, count - row * columns);
    const rowWidth = inRow * cardWidth + gap * (inRow - 1);
    const left = area.x + (area.width - rowWidth) / 2;
    return {
      x: left + (order % columns) * (cardWidth + gap),
      y: area.y + row * (cardHeight + captionHeight + gap),
      width: cardWidth,
      height: cardHeight,
    };
  });
  return {
    columns,
    rows,
    cardWidth,
    cardHeight,
    faces,
    bottom: area.y + usedHeight,
  };
}

/**
 * Breaks `text` into lines no wider than `maxWidth`, character by character
 * (Chinese has no spaces to break at). Past `maxLines`, the last line ends
 * with an ellipsis.
 */
export function wrapText(options: {
  readonly text: string;
  readonly maxWidth: number;
  readonly maxLines: number;
  readonly measure: (text: string) => number;
}): readonly string[] {
  const { maxWidth, maxLines, measure } = options;
  const lines: string[] = [];
  let line = "";
  for (const character of Array.from(options.text)) {
    if (character === "\n") {
      lines.push(line);
      line = "";
      continue;
    }
    if (line && measure(line + character) > maxWidth) {
      lines.push(line);
      line = character.trim() ? character : "";
    } else {
      line += character;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;

  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1] ?? "";
  while (last && measure(`${last}…`) > maxWidth) {
    last = Array.from(last).slice(0, -1).join("");
  }
  kept[maxLines - 1] = `${last}…`;
  return kept;
}
