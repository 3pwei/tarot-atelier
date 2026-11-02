import { describe, expect, it } from "vitest";
import {
  atelierStandardDeck,
  phaseOneTestDeck,
} from "@/domain/deck/builtinDecks";
import { createSpreadFromPreset } from "@/domain/spread/presets";
import {
  assignDraw,
  movePosition,
  rotatePosition,
} from "@/domain/spread/spread";
import {
  parseSpreadSnapshot,
  serializeSpreadSession,
  SPREAD_SNAPSHOT_VERSION,
  SpreadSnapshotError,
  verifySessionDeck,
  type SnapshotMigrations,
  type SpreadSession,
} from "@/domain/spread/spreadSnapshot";
import type { Spread } from "@/domain/spread/types";

const SAVED_AT = new Date("2026-11-02T08:00:00.000Z");
const DECK_ID = atelierStandardDeck.id;

function counter() {
  let next = 0;
  return () => `id-${(next += 1)}`;
}

function drawnSession(): SpreadSession {
  let spread: Spread = createSpreadFromPreset({
    presetId: "three-card",
    createId: counter(),
    mainQuestion: "這個月的方向？",
  });
  const [first, second] = spread.positions;
  const cards = atelierStandardDeck.cards;
  const update = assignDraw(spread, first?.id ?? "", {
    primary: {
      instanceId: `${DECK_ID}:draw-1:primary`,
      deckId: DECK_ID,
      cardId: cards[0]?.id ?? "",
      orientation: "reversed",
    },
    jumper: {
      instanceId: `${DECK_ID}:draw-1:jumper`,
      deckId: DECK_ID,
      cardId: cards[1]?.id ?? "",
      orientation: "upright",
    },
    drawnAt: SAVED_AT.toISOString(),
  });
  if (!update.ok) throw new Error(update.code);
  spread = update.spread;
  const moved = movePosition(spread, second?.id ?? "", { x: 0.1, y: 0.9 });
  if (!moved.ok) throw new Error(moved.code);
  const rotated = rotatePosition(moved.spread, second?.id ?? "", 30);
  if (!rotated.ok) throw new Error(rotated.code);

  return {
    deckId: DECK_ID,
    spread: rotated.spread,
    revealedInstanceIds: [`${DECK_ID}:draw-1:primary`],
  };
}

function storedJson(): Record<string, unknown> {
  return JSON.parse(serializeSpreadSession(drawnSession(), SAVED_AT)) as Record<
    string,
    unknown
  >;
}

describe("spread snapshot serialisation", () => {
  it("round-trips layout, questions, rotation, draws and reveals", () => {
    const session = drawnSession();
    const json = serializeSpreadSession(session, SAVED_AT);
    const parsed = parseSpreadSnapshot(JSON.parse(json));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.savedAt).toBe(SAVED_AT.toISOString());
    expect(parsed.migratedFrom).toBeUndefined();
    expect(parsed.session).toEqual(session);
    expect(JSON.parse(json)).toMatchObject({
      schemaVersion: SPREAD_SNAPSHOT_VERSION,
    });
  });

  it("refuses to serialise a session that would not load again", () => {
    const session = drawnSession();
    const broken = {
      ...session,
      spread: {
        ...session.spread,
        positions: session.spread.positions.map((position) => ({
          ...position,
          index: 1,
        })),
      },
    };
    expect(() => serializeSpreadSession(broken, SAVED_AT)).toThrow(
      SpreadSnapshotError,
    );
  });

  it("drops revealed IDs that no longer match a drawn card", () => {
    const raw = storedJson();
    const session = raw.session as Record<string, unknown>;
    session.revealedInstanceIds = ["ghost-card", `${DECK_ID}:draw-1:primary`];
    const parsed = parseSpreadSnapshot(raw);
    expect(parsed.ok && parsed.session.revealedInstanceIds).toEqual([
      `${DECK_ID}:draw-1:primary`,
    ]);
  });
});

describe("spread snapshot validation", () => {
  const corruptions: ReadonlyArray<
    readonly [string, (raw: Record<string, unknown>) => void]
  > = [
    ["missing version", (raw) => delete raw.schemaVersion],
    ["non-object session", (raw) => (raw.session = "oops")],
    [
      "coordinates outside 0–1",
      (raw) => {
        const positions = (
          (raw.session as Record<string, unknown>).spread as Record<
            string,
            unknown
          >
        ).positions as Record<string, unknown>[];
        (positions[0] as Record<string, unknown>).x = 4;
      },
    ],
    [
      "duplicate indexes",
      (raw) => {
        const positions = (
          (raw.session as Record<string, unknown>).spread as Record<
            string,
            unknown
          >
        ).positions as Record<string, unknown>[];
        (positions[1] as Record<string, unknown>).index = 1;
      },
    ],
    [
      "indexes not starting at 1",
      (raw) => {
        const positions = (
          (raw.session as Record<string, unknown>).spread as Record<
            string,
            unknown
          >
        ).positions as Record<string, unknown>[];
        positions.forEach((position, order) => (position.index = order + 2));
      },
    ],
    [
      "question over 300 characters",
      (raw) => {
        const positions = (
          (raw.session as Record<string, unknown>).spread as Record<
            string,
            unknown
          >
        ).positions as Record<string, unknown>[];
        (positions[0] as Record<string, unknown>).question = "字".repeat(301);
      },
    ],
    [
      "more than 12 positions",
      (raw) => {
        const spread = (raw.session as Record<string, unknown>)
          .spread as Record<string, unknown>;
        spread.positions = Array.from({ length: 13 }, (_, order) => ({
          id: `p${order}`,
          index: order + 1,
          question: "q",
          x: 0.5,
          y: 0.5,
          rotation: 0,
        }));
      },
    ],
    [
      "the same card drawn twice",
      (raw) => {
        const positions = (
          (raw.session as Record<string, unknown>).spread as Record<
            string,
            unknown
          >
        ).positions as Record<string, unknown>[];
        const result = (positions[0] as Record<string, unknown>)
          .drawResult as Record<string, Record<string, unknown>>;
        (result.jumper as Record<string, unknown>).cardId =
          result.primary?.cardId;
      },
    ],
    [
      "a card from another deck",
      (raw) => {
        const positions = (
          (raw.session as Record<string, unknown>).spread as Record<
            string,
            unknown
          >
        ).positions as Record<string, unknown>[];
        const result = (positions[0] as Record<string, unknown>)
          .drawResult as Record<string, Record<string, unknown>>;
        (result.primary as Record<string, unknown>).deckId = "other-deck";
      },
    ],
  ];

  it.each(corruptions)("rejects %s without throwing", (_, corrupt) => {
    const raw = storedJson();
    corrupt(raw);
    const parsed = parseSpreadSnapshot(raw);
    expect(parsed.ok).toBe(false);
    expect(parsed.ok || parsed.issues.length).toBeGreaterThan(0);
  });

  it.each([null, 42, "text", [], {}])("rejects %j", (raw) => {
    expect(parseSpreadSnapshot(raw)).toMatchObject({ ok: false });
  });

  it("rejects snapshots from a newer app version", () => {
    const raw = { ...storedJson(), schemaVersion: SPREAD_SNAPSHOT_VERSION + 1 };
    expect(parseSpreadSnapshot(raw)).toMatchObject({
      ok: false,
      reason: "unsupported-version",
    });
  });
});

describe("spread snapshot migration", () => {
  /**
   * A hypothetical v2 that renamed `question` to `prompt`, used to prove the
   * migration path end to end without inventing a production schema.
   */
  function toV2(raw: Record<string, unknown>) {
    const session = raw.session as Record<string, unknown>;
    const spread = session.spread as Record<string, unknown>;
    return {
      ...raw,
      schemaVersion: 2,
      session: {
        ...session,
        spread: {
          ...spread,
          positions: (spread.positions as Record<string, unknown>[]).map(
            ({ question, ...rest }) => ({ ...rest, prompt: question }),
          ),
        },
      },
    };
  }

  const v2Migrations: SnapshotMigrations = {
    1: (raw) => toV2({ ...raw }),
    2: (raw) => {
      const session = raw.session as Record<string, unknown>;
      const spread = session.spread as Record<string, unknown>;
      return {
        ...raw,
        session: {
          ...session,
          spread: {
            ...spread,
            positions: (spread.positions as Record<string, unknown>[]).map(
              ({ prompt, ...rest }) => ({ ...rest, question: prompt }),
            ),
          },
        },
      };
    },
  };

  it("upgrades older snapshots step by step and reports the source version", () => {
    const parsed = parseSpreadSnapshot(storedJson(), v2Migrations, 3);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.migratedFrom).toBe(1);
    expect(parsed.session).toEqual(drawnSession());
  });

  it("fails safely when a migration step is missing or throws", () => {
    expect(parseSpreadSnapshot(storedJson(), {}, 2)).toMatchObject({
      ok: false,
      reason: "unsupported-version",
    });
    expect(
      parseSpreadSnapshot(
        storedJson(),
        {
          1: () => {
            throw new Error("bad");
          },
        },
        2,
      ),
    ).toMatchObject({ ok: false, reason: "invalid" });
  });
});

describe("verifySessionDeck", () => {
  it("accepts cards that exist in the session deck", () => {
    expect(verifySessionDeck(drawnSession(), atelierStandardDeck)).toEqual([]);
  });

  it("flags a different deck or unknown cards", () => {
    expect(verifySessionDeck(drawnSession(), phaseOneTestDeck)).toHaveLength(1);
    const session = drawnSession();
    const [first, ...rest] = session.spread.positions;
    const result = first?.drawResult;
    if (!first || !result) throw new Error("missing draw");
    const forged: SpreadSession = {
      ...session,
      spread: {
        ...session.spread,
        positions: [
          {
            ...first,
            drawResult: {
              ...result,
              primary: { ...result.primary, cardId: "no-such-card" },
            },
          },
          ...rest,
        ],
      },
    };
    expect(verifySessionDeck(forged, atelierStandardDeck)).toEqual([
      "unknown card no-such-card",
    ]);
  });
});
