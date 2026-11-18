import type { DrawResult } from "@/domain/deck/draw";
import type { SpreadSession } from "@/domain/spread/spreadSnapshot";
import type { SpreadPosition } from "@/domain/spread/types";

/**
 * What became of a saved session's unfinished round: the session with that
 * round's cards back in the deck, and how many positions were emptied.
 */
export interface RoundCheck {
  readonly session: SpreadSession;
  readonly returnedCount: number;
}

function instancesOf(result: DrawResult): readonly string[] {
  return result.jumper
    ? [result.primary.instanceId, result.jumper.instanceId]
    : [result.primary.instanceId];
}

/**
 * A round of choosing is all or nothing. A new round needs every drawn card
 * turned over, and choosing fills every empty position, so a saved session
 * with an empty position next to a card still face down was interrupted
 * mid-round (a reload while choosing). Its face-down cards go back to the
 * deck, so the table starts over from the shuffle; cards already turned over
 * belong to earlier, finished rounds and stay.
 */
export function returnUnfinishedRound(session: SpreadSession): RoundCheck {
  const revealed = new Set(session.revealedInstanceIds);
  const positions = session.spread.positions;
  const faceDown = (result: DrawResult) =>
    instancesOf(result).some((instanceId) => !revealed.has(instanceId));
  const interrupted =
    positions.some((position) => !position.drawResult) &&
    positions.some(
      (position) => position.drawResult && faceDown(position.drawResult),
    );
  if (!interrupted) return { session, returnedCount: 0 };

  let returnedCount = 0;
  const kept = positions.map((position): SpreadPosition => {
    const { drawResult, ...empty } = position;
    if (!drawResult || !faceDown(drawResult)) return position;
    returnedCount += 1;
    return Object.freeze(empty);
  });
  const stillDrawn = new Set(
    kept.flatMap((position) =>
      position.drawResult ? instancesOf(position.drawResult) : [],
    ),
  );
  return {
    session: Object.freeze({
      ...session,
      revealedInstanceIds: Object.freeze(
        session.revealedInstanceIds.filter((id) => stillDrawn.has(id)),
      ),
      spread: Object.freeze({
        ...session.spread,
        positions: Object.freeze(kept),
      }),
    }),
    returnedCount,
  };
}
