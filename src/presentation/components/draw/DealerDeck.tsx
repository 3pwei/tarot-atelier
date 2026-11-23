import { TableDeck } from "@/presentation/components/draw/TableDeck";
import type { HoldHandlers } from "@/presentation/components/draw/useHoldToShuffle";
import {
  cardBackSmallUrl,
  cardBackUrl,
} from "@/presentation/components/library/prerenderedArt";
import { DECK_CARD_WIDTH_CQW } from "@/presentation/components/spread/boardGeometry";
import type { useSpreadDealer } from "@/presentation/components/spread/useSpreadDealer";

type Dealer = ReturnType<typeof useSpreadDealer>;

/** The deck on the table, drawn from the dealer's state. */
export function DealerDeck({
  dealer,
  deckId,
  canShuffle,
  hold,
}: {
  readonly dealer: Dealer;
  readonly deckId: string;
  readonly canShuffle: boolean;
  readonly hold: HoldHandlers;
}) {
  return (
    <TableDeck
      cardWidth={DECK_CARD_WIDTH_CQW * dealer.zoom}
      shuffling={dealer.phase === "shuffling"}
      holding={dealer.holding}
      gathering={dealer.gathering}
      washSeed={dealer.washSeed}
      fan={dealer.fan}
      fanReady={dealer.fanReady}
      nextPositionIndex={dealer.next?.index}
      onTable={dealer.deckOnTable}
      remaining={dealer.remaining}
      total={dealer.total}
      canShuffle={canShuffle}
      label={canShuffle ? "按住牌堆洗牌" : `牌堆：${dealer.status}`}
      backUrl={cardBackUrl(deckId)}
      airBackUrl={cardBackSmallUrl(deckId)}
      hold={hold}
      onPick={dealer.pick}
    />
  );
}
