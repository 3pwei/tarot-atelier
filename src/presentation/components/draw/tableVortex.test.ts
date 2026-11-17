import { describe, expect, it } from "vitest";
import {
  HEAP_CENTER,
  HEAP_SCATTER,
  PILE_CENTER,
  seededRandom,
  VORTEX_LIFT_SPAN_MS,
  VORTEX_SCATTER,
  VORTEX_SPARK_COUNT,
  VORTEX_TIERS,
  vortexCards,
  vortexSparks,
} from "@/presentation/components/draw/tableVortex";

const cards = vortexCards(seededRandom(1));

describe("the vortex", () => {
  it("is a funnel: each ring lower, narrower and quicker than the one above", () => {
    VORTEX_TIERS.slice(1).forEach((tier, index) => {
      const above = VORTEX_TIERS[index]!;
      expect(tier.y).toBeGreaterThan(above.y);
      expect(tier.radius).toBeLessThan(above.radius);
      expect(tier.turnMs).toBeLessThan(above.turnMs);
      expect(tier.cardShare).toBeLessThan(above.cardShare);
    });
  });

  it("sends its widest ring past the table's edges, where cards vanish", () => {
    const top = VORTEX_TIERS[0]!;
    expect(PILE_CENTER.x + top.radius).toBeGreaterThan(100);
    expect(PILE_CENTER.x - top.radius).toBeLessThan(0);
  });

  it("keeps every ring's centre on the table, around the pile", () => {
    for (const tier of VORTEX_TIERS) {
      expect(tier.y).toBeGreaterThan(0);
      expect(tier.y).toBeLessThan(100);
    }
  });

  it("holds twenty cards once every card is in the air", () => {
    expect(cards).toHaveLength(20);
    VORTEX_TIERS.forEach((tier, index) => {
      expect(cards.filter((card) => card.tier === index)).toHaveLength(
        tier.cards,
      );
    });
  });

  it("launches cards one after another, more and more, over a second and a half", () => {
    const launches = cards.map((card) => card.launchMs);
    expect(launches[0]).toBe(0);
    expect(launches.at(-1)).toBe(VORTEX_LIFT_SPAN_MS);
    launches.slice(1).forEach((launch, index) => {
      expect(launch).toBeGreaterThan(launches[index]!);
    });
  });

  it("fills the rings together rather than one ring after another", () => {
    const firstHalf = cards.slice(0, cards.length / 2);
    VORTEX_TIERS.forEach((tier, index) => {
      const early = firstHalf.filter((card) => card.tier === index).length;
      expect(Math.abs(early - tier.cards / 2)).toBeLessThanOrEqual(1);
    });
  });

  it("keeps cards in the air close to the pack's size", () => {
    for (const card of cards) {
      const share = VORTEX_TIERS[card.tier]!.cardShare;
      expect(Math.abs(card.airScale / share - 1)).toBeLessThanOrEqual(
        VORTEX_SCATTER.size,
      );
      expect(card.airScale).toBeGreaterThan(0.5);
      expect(card.airScale).toBeLessThan(1.15);
    }
  });

  it("scatters each card off its ring's path, within bounds", () => {
    for (const card of cards) {
      expect(Math.abs(card.radiusScale - 1)).toBeLessThanOrEqual(
        VORTEX_SCATTER.radius,
      );
      expect(Math.abs(card.shiftX)).toBeLessThanOrEqual(VORTEX_SCATTER.shiftX);
      expect(Math.abs(card.shiftY)).toBeLessThanOrEqual(VORTEX_SCATTER.shiftY);
    }
  });

  it("turns and tips every card at angles of its own, and flips them out of step", () => {
    for (const card of cards) {
      expect(Math.abs(card.roll)).toBeLessThanOrEqual(VORTEX_SCATTER.rollDeg);
      expect(card.tip).toBeGreaterThanOrEqual(VORTEX_SCATTER.shortest);
      expect(card.tip).toBeLessThanOrEqual(1);
      expect(card.flipPhase).toBeGreaterThanOrEqual(0);
      expect(card.flipPhase).toBeLessThanOrEqual(1);
    }
    expect(new Set(cards.map((card) => card.flipPhase)).size).toBeGreaterThan(
      cards.length / 2,
    );
  });

  it("drops every card in a loose heap low on the table, askew", () => {
    for (const card of cards) {
      expect(Math.abs(card.heapX - HEAP_CENTER.x)).toBeLessThanOrEqual(
        HEAP_SCATTER.x,
      );
      expect(Math.abs(card.heapY - HEAP_CENTER.y)).toBeLessThanOrEqual(
        HEAP_SCATTER.y,
      );
      expect(Math.abs(card.heapRoll)).toBeLessThanOrEqual(HEAP_SCATTER.rollDeg);
    }
    expect(HEAP_CENTER.y).toBeGreaterThan(PILE_CENTER.y);
  });

  it("looks the same for the same seed", () => {
    expect(vortexCards(seededRandom(7))).toEqual(vortexCards(seededRandom(7)));
    expect(vortexSparks(seededRandom(7))).toEqual(
      vortexSparks(seededRandom(7)),
    );
  });

  it("keeps every spark on the table", () => {
    const sparks = vortexSparks(seededRandom(3));
    expect(sparks).toHaveLength(VORTEX_SPARK_COUNT);
    for (const spark of sparks) {
      expect(spark.x).toBeGreaterThan(0);
      expect(spark.x).toBeLessThan(100);
      expect(spark.y).toBeGreaterThan(0);
      expect(spark.y).toBeLessThan(100);
      expect(spark.phase).toBeGreaterThanOrEqual(0);
      expect(spark.phase).toBeLessThanOrEqual(1);
    }
  });
});
