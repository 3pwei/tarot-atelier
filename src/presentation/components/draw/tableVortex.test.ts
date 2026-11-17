import { describe, expect, it } from "vitest";
import {
  LARGEST_SLOT_WIDTH_CQW,
  STANDARD_SLOT_WIDTH_CQW,
} from "@/presentation/components/spread/boardGeometry";
import {
  PILE_CENTER,
  seededRandom,
  VORTEX_LIFT_SPAN_MS,
  VORTEX_SPARK_COUNT,
  VORTEX_TIERS,
  vortexCards,
  vortexSparks,
} from "@/presentation/components/draw/tableVortex";

const cards = vortexCards(seededRandom(1), STANDARD_SLOT_WIDTH_CQW);

describe("the vortex", () => {
  it("is a funnel: each ring lower, narrower and quicker than the one above", () => {
    VORTEX_TIERS.slice(1).forEach((tier, index) => {
      const above = VORTEX_TIERS[index]!;
      expect(tier.y).toBeGreaterThan(above.y);
      expect(tier.radius).toBeLessThan(above.radius);
      expect(tier.turnMs).toBeLessThan(above.turnMs);
      expect(tier.cardWidth).toBeLessThan(above.cardWidth);
    });
  });

  it("keeps the whole funnel on the table, around the pile", () => {
    for (const tier of VORTEX_TIERS) {
      expect(PILE_CENTER.x - tier.radius).toBeGreaterThan(0);
      expect(PILE_CENTER.x + tier.radius).toBeLessThan(100);
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

  it("shrinks cards in the air to their ring's size, whatever their size on the table", () => {
    for (const tableWidth of [
      STANDARD_SLOT_WIDTH_CQW,
      LARGEST_SLOT_WIDTH_CQW,
    ]) {
      for (const card of vortexCards(seededRandom(2), tableWidth)) {
        const ring = VORTEX_TIERS[card.tier]!;
        expect(card.airScale * tableWidth).toBeCloseTo(ring.cardWidth);
        expect(card.airScale).toBeLessThan(1);
      }
    }
  });

  it("tilts cards only slightly", () => {
    for (const card of cards) {
      expect(Math.abs(card.tilt)).toBeLessThanOrEqual(24);
    }
  });

  it("looks the same for the same seed", () => {
    expect(vortexCards(seededRandom(7), 14)).toEqual(
      vortexCards(seededRandom(7), 14),
    );
    expect(vortexSparks(seededRandom(7))).toEqual(
      vortexSparks(seededRandom(7)),
    );
  });

  it("keeps every spark within the funnel and on the table", () => {
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
