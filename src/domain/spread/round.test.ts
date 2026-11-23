import { describe, expect, it } from "vitest";
import {
  fixtureDraw,
  fixtureSpread,
} from "@/domain/history/testing/historyFixtures";
import {
  collectDrawnInstances,
  findPlacedCard,
  placedCardsOf,
} from "@/domain/spread/round";

const spread = fixtureSpread({
  questions: ["現在", "接下來", "還沒抽"],
  draws: [
    fixtureDraw({ drawNumber: 1, cardId: "a", jumperCardId: "b" }),
    fixtureDraw({ drawNumber: 2, cardId: "c" }),
  ],
});
const [withJumper, single, empty] = spread.positions;

describe("placed cards", () => {
  it("lists a position's primary before its jumper", () => {
    expect(
      placedCardsOf(withJumper!).map(({ role, instance }) => [
        role,
        instance.cardId,
      ]),
    ).toEqual([
      ["primary", "a"],
      ["jumper", "b"],
    ]);
  });

  it("lists only the primary when there is no jumper, and nothing when undrawn", () => {
    expect(placedCardsOf(single!).map((card) => card.role)).toEqual([
      "primary",
    ]);
    expect(placedCardsOf(empty!)).toEqual([]);
  });

  it("finds a jumper with its position", () => {
    const jumperId = withJumper!.drawResult!.jumper!.instanceId;
    const found = findPlacedCard(spread, jumperId);
    expect(found?.role).toBe("jumper");
    expect(found?.position.id).toBe(withJumper!.id);
  });

  it("finds nothing for a card that is not on the table", () => {
    expect(findPlacedCard(spread, "missing")).toBeUndefined();
  });

  it("collects every card on the table in order", () => {
    expect(
      collectDrawnInstances(spread).map((instance) => instance.cardId),
    ).toEqual(["a", "b", "c"]);
  });
});
