import { ROLE_LABELS } from "@/presentation/components/cards/cardLabels";
import {
  cardLabel,
  positionCaption,
  type ShareCard,
  type SharedCard,
} from "@/presentation/components/share/shareCard";
import {
  cardGrid,
  SHARE_IMAGE_SIZE,
  wrapText,
  type Box,
} from "@/presentation/components/share/shareImageLayout";
import { SHARE_COPY } from "@/presentation/components/share/shareLabels";

/** Turns a share card into a PNG; injected so tests need no canvas. */
export type ShareImageRenderer = (card: ShareCard) => Promise<Blob>;

/** The book's paper and ink: the image is a page of it. */
const PAPER = "#efe0bd";
const PAPER_DEEP = "#e4cf9f";
const INK = "#3d2a18";
const INK_SOFT = "#6b5238";
const KRAFT = "#c9a777";
const KRAFT_EDGE = "#8a6b42";
const KRAFT_INK = "#3b2a1a";
const DIVIDER = "rgba(61, 42, 24, 0.28)";
const SANS = '"Iansui", "Noto Serif TC", "PingFang TC", serif';
const SERIF = '"IM Fell English", "Iansui", "Noto Serif TC", serif';

const PADDING = 80;
const CONTENT_WIDTH = SHARE_IMAGE_SIZE.width - PADDING * 2;
const CAPTION_HEIGHT = 76;
const CARD_GAP = 28;
/** The jumper is tucked over its main card's lower right, as on the table. */
const JUMPER_SCALE = 0.42;

function font(size: number, family = SANS, weight = 400): string {
  return `${weight} ${size}px ${family}`;
}

function loadImage(url: string): Promise<HTMLImageElement | undefined> {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    // A missing face is drawn as plain kraft paper with the card's name.
    image.onerror = () => resolve(undefined);
    image.src = url;
  });
}

async function loadFaces(
  card: ShareCard,
): Promise<ReadonlyMap<string, HTMLImageElement>> {
  const urls = new Set(
    card.positions
      .flatMap((position) => [position.primary, position.jumper])
      .flatMap((face) => (face?.faceUrl ? [face.faceUrl] : [])),
  );
  const loaded = await Promise.all(
    [...urls].map(async (url) => [url, await loadImage(url)] as const),
  );
  return new Map(
    loaded.flatMap(([url, image]) => (image ? [[url, image] as const] : [])),
  );
}

function roundedRect(
  context: CanvasRenderingContext2D,
  box: Box,
  radius: number,
): void {
  context.beginPath();
  context.roundRect(box.x, box.y, box.width, box.height, radius);
}

function drawFace(
  context: CanvasRenderingContext2D,
  face: SharedCard,
  box: Box,
  images: ReadonlyMap<string, HTMLImageElement>,
): void {
  const radius = Math.max(6, box.width * 0.05);
  const image = face.faceUrl ? images.get(face.faceUrl) : undefined;
  context.save();
  context.shadowColor = "rgba(40, 20, 4, 0.4)";
  context.shadowBlur = 18;
  context.shadowOffsetY = 10;
  roundedRect(context, box, radius);
  context.fillStyle = KRAFT;
  context.fill();
  context.restore();

  context.save();
  roundedRect(context, box, radius);
  context.clip();
  if (face.orientation === "reversed") {
    context.translate(box.x + box.width / 2, box.y + box.height / 2);
    context.rotate(Math.PI);
    context.translate(-(box.x + box.width / 2), -(box.y + box.height / 2));
  }
  if (image) {
    context.drawImage(image, box.x, box.y, box.width, box.height);
  } else {
    context.fillStyle = KRAFT_INK;
    context.font = font(Math.round(box.width * 0.13), SERIF);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      face.name,
      box.x + box.width / 2,
      box.y + box.height / 2,
      box.width * 0.85,
    );
  }
  context.restore();

  roundedRect(context, box, radius);
  context.strokeStyle = KRAFT_EDGE;
  context.lineWidth = 2;
  context.stroke();
}

function drawIndex(
  context: CanvasRenderingContext2D,
  index: number,
  box: Box,
): void {
  const radius = Math.max(16, box.width * 0.09);
  context.beginPath();
  context.arc(box.x + 4, box.y + 4, radius, 0, Math.PI * 2);
  context.fillStyle = INK;
  context.fill();
  context.fillStyle = PAPER;
  context.font = font(Math.round(radius * 1.1), SERIF);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(index), box.x + 4, box.y + 5);
}

function drawCentred(
  context: CanvasRenderingContext2D,
  text: string,
  options: { readonly x: number; readonly y: number; readonly width: number },
): void {
  const [line] = wrapText({
    text,
    maxWidth: options.width,
    maxLines: 1,
    measure: (value) => context.measureText(value).width,
  });
  context.fillText(line ?? "", options.x, options.y);
}

/** Draws the cards from the top of `area` and returns where they end. */
function drawPositions(
  context: CanvasRenderingContext2D,
  card: ShareCard,
  area: Box,
  images: ReadonlyMap<string, HTMLImageElement>,
): number {
  const grid = cardGrid({
    count: card.positions.length,
    area,
    gap: CARD_GAP,
    captionHeight: CAPTION_HEIGHT,
  });
  const captionWidth = grid.cardWidth + CARD_GAP - 4;
  card.positions.forEach((position, order) => {
    const box = grid.faces[order];
    if (!box) return;
    drawFace(context, position.primary, box, images);
    if (position.jumper) {
      const width = box.width * JUMPER_SCALE;
      const height = width * 1.5;
      drawFace(
        context,
        position.jumper,
        {
          x: box.x + box.width - width * 0.7,
          y: box.y + box.height - height * 0.85,
          width,
          height,
        },
        images,
      );
    }
    drawIndex(context, position.index, box);

    const centre = box.x + box.width / 2;
    context.textAlign = "center";
    context.textBaseline = "top";
    context.fillStyle = INK;
    context.font = font(26);
    const name = position.jumper
      ? `${cardLabel(position.primary)}＋${ROLE_LABELS.jumper}`
      : cardLabel(position.primary);
    drawCentred(context, name, {
      x: centre,
      y: box.y + box.height + 14,
      width: captionWidth,
    });
    const caption = positionCaption(position);
    if (caption) {
      context.fillStyle = INK_SOFT;
      context.font = font(21);
      drawCentred(context, caption, {
        x: centre,
        y: box.y + box.height + 48,
        width: captionWidth,
      });
    }
  });
  return grid.bottom;
}

function drawBackground(context: CanvasRenderingContext2D): void {
  const { width, height } = SHARE_IMAGE_SIZE;
  const paper = context.createLinearGradient(0, 0, 0, height);
  paper.addColorStop(0, PAPER);
  paper.addColorStop(1, PAPER_DEEP);
  context.fillStyle = paper;
  context.fillRect(0, 0, width, height);
  // The page's edges darken, as the book's paper does.
  const edge = context.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.35,
    width / 2,
    height / 2,
    height * 0.75,
  );
  edge.addColorStop(0, "rgba(70, 30, 4, 0)");
  edge.addColorStop(1, "rgba(70, 30, 4, 0.35)");
  context.fillStyle = edge;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "rgba(61, 42, 24, 0.4)";
  context.lineWidth = 2;
  context.strokeRect(28, 28, width - 56, height - 56);
}

function drawBrand(context: CanvasRenderingContext2D, card: ShareCard): void {
  context.beginPath();
  context.arc(PADDING + 18, PADDING + 22, 18, 0, Math.PI * 2);
  context.strokeStyle = INK;
  context.lineWidth = 2.5;
  context.stroke();
  context.fillStyle = INK;
  context.font = font(30, SERIF);
  context.textAlign = "left";
  context.textBaseline = "middle";
  context.letterSpacing = "6px";
  context.fillText(SHARE_COPY.imageBrand, PADDING + 52, PADDING + 23);
  context.letterSpacing = "0px";
  context.fillStyle = INK_SOFT;
  context.font = font(24);
  context.textAlign = "right";
  context.fillText(card.spreadName, PADDING + CONTENT_WIDTH, PADDING + 23);
}

/** Draws the question and returns where the cards may start. */
function drawQuestion(
  context: CanvasRenderingContext2D,
  card: ShareCard,
): number {
  const top = PADDING + 92;
  if (!card.mainQuestion) return top;
  context.fillStyle = INK;
  context.font = font(44);
  context.textAlign = "left";
  context.textBaseline = "top";
  const lines = wrapText({
    text: card.mainQuestion,
    maxWidth: CONTENT_WIDTH,
    maxLines: 2,
    measure: (value) => context.measureText(value).width,
  });
  lines.forEach((line, order) =>
    context.fillText(line, PADDING, top + order * 62),
  );
  return top + lines.length * 62 + 24;
}

const SUMMARY_FONT_SIZE = 30;
const SUMMARY_LINE_HEIGHT = 50;
const SUMMARY_MAX_LINES = 4;
/** Room between the cards and the summary, the divider in the middle. */
const SUMMARY_SPACING = 88;
const FOOTER_TOP = SHARE_IMAGE_SIZE.height - PADDING - 64;

function summaryLines(
  context: CanvasRenderingContext2D,
  card: ShareCard,
): readonly string[] {
  if (!card.summary) return [];
  context.font = font(SUMMARY_FONT_SIZE);
  return wrapText({
    text: card.summary,
    maxWidth: CONTENT_WIDTH,
    maxLines: SUMMARY_MAX_LINES,
    measure: (value) => context.measureText(value).width,
  });
}

/** The summary under the cards, with a divider above it. */
function drawSummary(
  context: CanvasRenderingContext2D,
  lines: readonly string[],
  cardsBottom: number,
): void {
  if (lines.length === 0) return;
  const divider = cardsBottom + SUMMARY_SPACING / 2;
  context.strokeStyle = DIVIDER;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(PADDING, divider);
  context.lineTo(PADDING + CONTENT_WIDTH, divider);
  context.stroke();
  context.font = font(SUMMARY_FONT_SIZE);
  context.fillStyle = INK_SOFT;
  context.textAlign = "left";
  context.textBaseline = "top";
  lines.forEach((line, order) =>
    context.fillText(
      line,
      PADDING,
      cardsBottom + SUMMARY_SPACING + order * SUMMARY_LINE_HEIGHT,
    ),
  );
}

function drawFooter(context: CanvasRenderingContext2D, card: ShareCard): void {
  const y = SHARE_IMAGE_SIZE.height - PADDING;
  context.font = font(24);
  context.fillStyle = INK_SOFT;
  context.textBaseline = "bottom";
  context.textAlign = "left";
  context.fillText(card.siteUrl.replace(/^https?:\/\//u, ""), PADDING, y);
  context.textAlign = "right";
  context.fillText(SHARE_COPY.disclaimer, PADDING + CONTENT_WIDTH, y);
}

/** Paints the 1080×1350 share image with the deck's own card faces. */
export const renderShareImage: ShareImageRenderer = async (card) => {
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_IMAGE_SIZE.width;
  canvas.height = SHARE_IMAGE_SIZE.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot draw the share image.");
  const [images] = await Promise.all([loadFaces(card), document.fonts?.ready]);

  drawBackground(context);
  drawBrand(context, card);
  const cardsTop = drawQuestion(context, card) + 20;
  const summary = summaryLines(context, card);
  const summaryHeight =
    summary.length > 0
      ? SUMMARY_SPACING + summary.length * SUMMARY_LINE_HEIGHT
      : 0;
  const cardsBottom = drawPositions(
    context,
    card,
    {
      x: PADDING,
      y: cardsTop,
      width: CONTENT_WIDTH,
      height: FOOTER_TOP - summaryHeight - cardsTop,
    },
    images,
  );
  drawSummary(context, summary, cardsBottom);
  drawFooter(context, card);

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("The share image could not be encoded.")),
      "image/png",
    ),
  );
};
