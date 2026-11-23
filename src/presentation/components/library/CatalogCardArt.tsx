import type { CardDefinition, Orientation } from "@/domain/deck/types";
import { CardArtwork } from "@/presentation/components/CardArtwork";
import {
  catalogThumbnailUrl,
  prerenderedFaceSize,
} from "@/presentation/components/library/prerenderedArt";

/**
 * A small card face, as in the library grid or the reading history. Uses the
 * pre-rendered image when one exists, loaded only as it scrolls near; any
 * other deck draws its own art.
 */
export function CatalogCardArt({
  deckId,
  card,
  orientation = "upright",
}: Readonly<{
  deckId: string;
  card: CardDefinition;
  orientation?: Orientation;
}>) {
  const thumbnail = catalogThumbnailUrl(deckId, card.id);
  if (!thumbnail) {
    return (
      <CardArtwork card={card} side="face" orientation={orientation} compact />
    );
  }
  const reversed = orientation === "reversed" ? "card-artwork--reversed" : "";
  return (
    <div
      className={`card-artwork card-artwork--compact card-artwork--thumbnail ${reversed}`}
    >
      {/* A static export serves files as they are; next/image adds nothing here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="card-artwork__image"
        src={thumbnail}
        alt={`${card.name.zhHant}牌面`}
        width={prerenderedFaceSize.width}
        height={prerenderedFaceSize.height}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
