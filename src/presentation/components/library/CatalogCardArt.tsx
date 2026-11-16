import type { CardDefinition } from "@/domain/deck/types";
import { CardArtwork } from "@/presentation/components/CardArtwork";
import manifest from "./catalogThumbnails.json";

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** The pre-rendered face for a card, when `pnpm thumbnails` made one. */
export function catalogThumbnailUrl(
  deckId: string,
  cardId: string,
): string | undefined {
  if (deckId !== manifest.deckId) return undefined;
  const file = (manifest.cards as Readonly<Record<string, string>>)[cardId];
  return file ? `${publicBasePath}/${manifest.directory}/${file}` : undefined;
}

/**
 * A card face in the library grid. Uses the pre-rendered image when one
 * exists, loaded only as it scrolls near; any other deck draws its own art.
 */
export function CatalogCardArt({
  deckId,
  card,
}: Readonly<{ deckId: string; card: CardDefinition }>) {
  const thumbnail = catalogThumbnailUrl(deckId, card.id);
  if (!thumbnail) {
    return (
      <CardArtwork card={card} side="face" orientation="upright" compact />
    );
  }
  return (
    <div className="card-artwork card-artwork--compact card-artwork--thumbnail">
      {/* A static export serves files as they are; next/image adds nothing here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="card-artwork__image"
        src={thumbnail}
        alt={`${card.name.zhHant}牌面`}
        width={manifest.width}
        height={manifest.height}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
