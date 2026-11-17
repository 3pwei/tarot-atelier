import { describe, expect, it } from "vitest";
import {
  PILE_CENTER,
  seededRandom,
  VORTEX_SPARK_COUNT,
  VORTEX_TIERS,
  vortexCards,
  vortexSparks,
} from "@/presentation/components/draw/tableVortex";

describe("the vortex", () => {
  it("is a funnel: each ring lower, narrower and quicker than the one above", () => {
    VORTEX_TIERS.slice(1).forEach((tier, index) => {
      const above = VORTEX_TIERS[index]!;
      expect(tier.y).toBeGreaterThan(above.y);
      expect(tier.radius).toBeLessThan(above.radius);
      expect(tier.turnMs).toBeLessThan(above.turnMs);
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

  it("spaces the cards on each ring evenly around it", () => {
    const cards = vortexCards(seededRandom(1));
    VORTEX_TIERS.forEach((tier, index) => {
      const ring = cards.filter((card) => card.tier === index);
      expect(ring).toHaveLength(tier.cards);
      expect(ring.map((card) => card.offsetMs)).toEqual(
        ring.map((_, place) => Math.round((tier.turnMs * place) / tier.cards)),
      );
    });
  });

  it("tilts cards only slightly", () => {
    for (const card of vortexCards(seededRandom(2))) {
      expect(Math.abs(card.tilt)).toBeLessThanOrEqual(24);
    }
  });

  it("looks the same for the same seed", () => {
    expect(vortexCards(seededRandom(7))).toEqual(vortexCards(seededRandom(7)));
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
