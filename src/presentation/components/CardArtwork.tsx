"use client";

import { useState } from "react";
import type { CardDefinition, Orientation } from "@/domain/deck/types";

interface CardArtworkProps {
  readonly card: CardDefinition;
  readonly side: "face" | "back";
  readonly orientation: Orientation;
  readonly compact?: boolean;
}

function cardSymbol(card: CardDefinition): string {
  const symbol = card.metadata?.symbol;
  return typeof symbol === "string" ? symbol : "✦";
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
          <div className="card-back-pattern" role="img" aria-label="星盤牌背">
            <span aria-hidden="true">✦</span>
          </div>
        ) : (
          <div
            className="procedural-card"
            role="img"
            aria-label={`${card.name.zhHant}程序式牌面`}
          >
            <span className="procedural-card__index">
              {card.category === "major"
                ? String(card.metadata?.numeral ?? card.sequence).padStart(
                    2,
                    "0",
                  )
                : card.rank?.toUpperCase()}
            </span>
            <span className="procedural-card__orbit" aria-hidden="true" />
            <span className="procedural-card__symbol" aria-hidden="true">
              {cardSymbol(card)}
            </span>
            <span className="procedural-card__name">{card.name.zhHant}</span>
            {!compact && (
              <span className="procedural-card__english">{card.name.en}</span>
            )}
          </div>
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
