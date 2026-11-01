"use client";

import { useState } from "react";
import type { CardDefinition, Orientation } from "@/domain/deck/types";
import { ProceduralBack } from "@/presentation/components/cards/ProceduralBack";
import { ProceduralFace } from "@/presentation/components/cards/ProceduralFace";

interface CardArtworkProps {
  readonly card: CardDefinition;
  readonly side: "face" | "back";
  readonly orientation: Orientation;
  readonly compact?: boolean;
}

export function CardArtwork({
  card,
  side,
  orientation,
  compact = false,
}: CardArtworkProps) {
  const asset = side === "face" ? card.artwork.face : card.artwork.back;
  const [failedAsset, setFailedAsset] = useState<string | null>(null);
  const hasLoadError = failedAsset === asset;
  const isProcedural = asset.startsWith("procedural://");
  const isDeclaredMissing = asset.startsWith("missing://");
  const showFallback = isDeclaredMissing || hasLoadError;

  return (
    <div
      className={`card-artwork ${compact ? "card-artwork--compact" : ""} ${orientation === "reversed" && side === "face" ? "card-artwork--reversed" : ""}`}
      data-artwork-state={showFallback ? "fallback" : "ready"}
    >
      {showFallback ? (
        <div
          className="card-artwork__fallback"
          role="img"
          aria-label="卡圖素材缺失"
        >
          <span aria-hidden="true">◇</span>
          <strong>素材待補</strong>
          {!compact && <small>已保留卡片身份與資料</small>}
        </div>
      ) : isProcedural ? (
        side === "back" ? (
          <ProceduralBack />
        ) : (
          <ProceduralFace card={card} compact={compact} />
        )
      ) : (
        // Deck assets can be user-provided HTTPS URLs, so next/image's static
        // remote allowlist is intentionally not used at this trust boundary.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="card-artwork__image"
          src={asset}
          alt={
            side === "face"
              ? `${card.name.zhHant}牌面`
              : `${card.name.zhHant}牌背`
          }
          onError={() => setFailedAsset(asset)}
        />
      )}
    </div>
  );
}
