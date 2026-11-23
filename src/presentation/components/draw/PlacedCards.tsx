import type { Deck } from "@/domain/deck/deck";
import { placedCardsOf } from "@/domain/spread/round";
import type { SpreadPosition } from "@/domain/spread/types";
import { DrawnCard } from "@/presentation/components/draw/DrawnCard";
import type { MotionMode } from "@/presentation/components/draw/useMotionMode";
import type { Flight } from "@/presentation/components/spread/useDealFlights";

interface PlacedCardsProps {
  readonly position: SpreadPosition;
  readonly deck: Deck;
  /** Cards still on their way from the deck are not touchable yet. */
  readonly flights: readonly Flight[];
  readonly playable: boolean;
  readonly revealedInstanceIds: ReadonlySet<string>;
  readonly motionMode: MotionMode;
  readonly onRevealed: (instanceId: string) => void;
  readonly onInspect: (instanceId: string) => void;
}

/** The cards dealt to one position: its primary and, rarely, a jumper. */
export function PlacedCards({
  position,
  deck,
  flights,
  playable,
  revealedInstanceIds,
  motionMode,
  onRevealed,
  onInspect,
}: PlacedCardsProps) {
  return placedCardsOf(position).map(({ role, instance }) => {
    const card = deck.getCard(instance.cardId);
    if (!card) return null;
    const inFlight = flights.some(
      (flight) => flight.positionId === position.id && flight.role === role,
    );
    return (
      <DrawnCard
        key={instance.instanceId}
        card={card}
        instance={instance}
        role={role}
        positionIndex={position.index}
        interactive={!inFlight && playable}
        inFlight={inFlight}
        initiallyRevealed={revealedInstanceIds.has(instance.instanceId)}
        motionMode={motionMode}
        onRevealed={onRevealed}
        onInspect={onInspect}
      />
    );
  });
}
