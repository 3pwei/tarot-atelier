import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BOARD_HEIGHT_CQW } from "@/presentation/components/spread/boardGeometry";
import {
  HEAP_CENTER,
  HEAP_SCATTER,
  PILE_CENTER,
  seededRandom,
  SETTLE,
  VORTEX_LIFT_SPAN_MS,
  VORTEX_JOIN_PHASE,
  VORTEX_RITUAL_MS,
  VORTEX_FIREFLY_COUNT,
  VORTEX_FIREFLY_DELAY_MS,
  VORTEX_SCATTER,
  VORTEX_TIERS,
  VORTEX_TILT,
  VORTEX_CLIMB_MS,
  VORTEX_OUTER_HOLD_MS,
  VORTEX_DRAW_OUT_SHARE,
  VORTEX_DRAW_OUT_SLOPE,
  launchAt,
  orbitStartMs,
  rotationOf,
  shortestTurn,
  vortexCards,
  vortexFireflies,
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

  it("launches cards one by one after the opening, then faster and faster, over a second and a half", () => {
    const launches = cards.map((card) => card.launchMs);
    expect(launches[0]).toBe(VORTEX_RITUAL_MS);
    expect(launches.at(-1)).toBe(VORTEX_RITUAL_MS + VORTEX_LIFT_SPAN_MS);
    const gaps = launches
      .slice(1)
      .map((launch, index) => launch - launches[index]!);
    for (const gap of gaps) expect(gap).toBeGreaterThan(0);
    gaps.slice(1).forEach((gap, index) => {
      expect(gap).toBeLessThanOrEqual(gaps[index]! + 1);
    });
    expect(gaps[0]!).toBeGreaterThan(4 * gaps.at(-1)!);
  });

  it("draws every card out up and to the right at about 45°, each at its own angle", () => {
    for (const card of cards) {
      expect(card.drawOutSlope).toBeGreaterThanOrEqual(
        VORTEX_DRAW_OUT_SLOPE.least,
      );
      expect(card.drawOutSlope).toBeLessThanOrEqual(VORTEX_DRAW_OUT_SLOPE.most);
    }
    expect(VORTEX_DRAW_OUT_SLOPE.least).toBeLessThan(1);
    expect(VORTEX_DRAW_OUT_SLOPE.most).toBeGreaterThan(1);
    expect(
      new Set(cards.map((card) => card.drawOutSlope)).size,
    ).toBeGreaterThan(cards.length / 2);
  });

  it("starts each card circling as soon as it is drawn out", () => {
    expect(orbitStartMs(300)).toBe(
      300 + Math.round(VORTEX_CLIMB_MS * VORTEX_DRAW_OUT_SHARE),
    );
    expect(VORTEX_DRAW_OUT_SHARE).toBeLessThanOrEqual(0.3);
  });

  it("spaces launches the same way for any number of cards", () => {
    expect(launchAt(0, 1)).toBe(VORTEX_RITUAL_MS);
    expect(launchAt(0, 5)).toBe(VORTEX_RITUAL_MS);
    expect(launchAt(4, 5)).toBe(VORTEX_RITUAL_MS + VORTEX_LIFT_SPAN_MS);
    expect(launchAt(2, 5) - VORTEX_RITUAL_MS).toBeGreaterThan(
      VORTEX_LIFT_SPAN_MS / 2,
    );
  });

  it("flings every card to the outer ring first, then draws it in to its own", () => {
    const outer = VORTEX_TIERS[0]!;
    for (const card of cards) {
      const ring = VORTEX_TIERS[card.tier]!;
      expect(card.drawInFrom).toBeCloseTo(outer.radius / ring.radius, 2);
      expect(card.drawInRise).toBe(outer.y - ring.y);
      expect(card.outerAirScale / card.airScale).toBeCloseTo(
        outer.cardShare / ring.cardShare,
        9,
      );
      expect(card.drawInMs).toBe(
        card.launchMs + VORTEX_CLIMB_MS + VORTEX_OUTER_HOLD_MS,
      );
    }
    const onOuter = cards.filter((card) => card.tier === 0);
    for (const card of onOuter) {
      expect(card.drawInFrom).toBe(1);
      expect(card.drawInRise).toBe(0);
    }
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

  it("lays every card flat near the table's middle, without swirling it", () => {
    for (const card of cards) {
      const reach = Math.hypot(card.spotX, card.spotY);
      expect(reach).toBeGreaterThanOrEqual(SETTLE.nearest - 1e-9);
      expect(reach).toBeLessThanOrEqual(SETTLE.furthest + 1e-9);
      expect(card).not.toHaveProperty("swirl");
    }
  });

  it("gathers every card in a loose heap where the wheel opens, askew", () => {
    const heightShare = BOARD_HEIGHT_CQW / 100;
    for (const card of cards) {
      const x = card.heapShiftX + card.spotX;
      const y = card.heapShiftY + card.spotY;
      expect(Math.abs(50 + x - HEAP_CENTER.x)).toBeLessThanOrEqual(
        HEAP_SCATTER.x + 1e-9,
      );
      expect(
        Math.abs(50 + y / heightShare - HEAP_CENTER.y),
      ).toBeLessThanOrEqual(HEAP_SCATTER.y + 1e-9);
      expect(Math.abs(card.spotRoll + card.heapTurn)).toBeLessThanOrEqual(
        HEAP_SCATTER.rollDeg,
      );
    }
    expect(HEAP_CENTER.y).toBeGreaterThan(PILE_CENTER.y);
  });

  it("brings the lights up only once every card has left the pile", () => {
    expect(VORTEX_FIREFLY_DELAY_MS).toBe(VORTEX_RITUAL_MS + 1_600);
    expect(VORTEX_FIREFLY_DELAY_MS).toBeGreaterThan(
      VORTEX_RITUAL_MS + VORTEX_LIFT_SPAN_MS,
    );
  });

  it("sends a handful of soft lights round the rings with the cards", () => {
    const lights = vortexFireflies(seededRandom(4));
    expect(lights).toHaveLength(VORTEX_FIREFLY_COUNT);
    expect(VORTEX_FIREFLY_COUNT).toBeGreaterThanOrEqual(5);
    expect(VORTEX_FIREFLY_COUNT).toBeLessThanOrEqual(10);
    for (const light of lights) {
      const tier = VORTEX_TIERS[light.tier]!;
      expect(light.offsetMs).toBeGreaterThanOrEqual(0);
      expect(light.offsetMs).toBeLessThanOrEqual(tier.turnMs);
      expect(light.radiusScale).toBeGreaterThanOrEqual(0.8);
      expect(light.radiusScale).toBeLessThanOrEqual(1.15);
    }
    expect(new Set(lights.map((light) => light.tier)).size).toBe(
      VORTEX_TIERS.length,
    );
  });

  it("looks the same for the same seed", () => {
    expect(vortexCards(seededRandom(7))).toEqual(vortexCards(seededRandom(7)));
    expect(vortexFireflies(seededRandom(7))).toEqual(
      vortexFireflies(seededRandom(7)),
    );
  });
});

describe("carrying a card's turn from the air to the table", () => {
  it("reads the rotation of a computed transform", () => {
    expect(rotationOf("none")).toBe(0);
    expect(rotationOf("matrix(1, 0, 0, 1, 0, 0)")).toBeCloseTo(0);
    expect(rotationOf("matrix(0, 1, -1, 0, 10, 20)")).toBeCloseTo(90);
    expect(rotationOf("matrix(0, -1, 1, 0, 0, 0)")).toBeCloseTo(-90);
    const turned = Math.cos(Math.PI / 6);
    expect(
      rotationOf(
        `matrix3d(${turned}, 0.5, 0, 0, -0.5, ${turned}, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)`,
      ),
    ).toBeCloseTo(30);
  });

  it("turns the short way round", () => {
    expect(shortestTurn(0)).toBe(0);
    expect(shortestTurn(190)).toBe(-170);
    expect(shortestTurn(-190)).toBe(170);
    expect(shortestTurn(-350)).toBe(10);
    expect(shortestTurn(720 + 45)).toBe(45);
  });
});

describe("the vortex-heading keyframes", () => {
  it("follow the slope of a ring as flat as VORTEX_TILT, from where cards join it", () => {
    const css = readFileSync(
      resolve(process.cwd(), "src/presentation/components/draw/vortex.css"),
      "utf8",
    );
    const block = /@keyframes vortex-heading \{([\s\S]*?)\n\}/u.exec(css)?.[1];
    expect(block).toBeDefined();
    const stops = [
      ...block!.matchAll(
        /([\d.]+)% \{\s*transform: rotate\((-?[\d.]+)deg\);/gu,
      ),
    ].map(([, at, degrees]) => ({
      at: Number(at) / 100,
      degrees: Number(degrees),
    }));
    expect(stops).toHaveLength(17);
    for (const { at, degrees } of stops) {
      const angle = 2 * Math.PI * (at + VORTEX_JOIN_PHASE);
      // Moving round x = r·sin θ, y = tilt·r·cos θ; one full turn a lap.
      const slope = Math.atan2(-VORTEX_TILT * Math.sin(angle), Math.cos(angle));
      const expected = (slope * 180) / Math.PI;
      expect(shortestTurn(degrees - expected)).toBeCloseTo(0, 0);
    }
    expect(stops[0]!.degrees).toBe(-360 * VORTEX_JOIN_PHASE);
    expect(stops.at(-1)!.degrees - stops[0]!.degrees).toBe(-360);
  });
});
