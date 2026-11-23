import { describe, expect, it } from "vitest";
import { registerBuiltInDecks } from "@/application/use-cases/createDeckLibrary";
import {
  attachReading,
  recordRound,
  type ReadingRecord,
} from "@/domain/history/readingHistory";
import {
  FIXTURE_DECK_ID,
  fixtureDraw,
  fixtureReading,
  fixtureSpread,
} from "@/domain/history/testing/historyFixtures";
import { shareableRecord } from "@/domain/share/shareRecord";
import { InMemoryDeckRegistry } from "@/infrastructure/decks/inMemoryDeckRegistry";
import {
  buildShareCard,
  SHARE_SUMMARY_CHARACTERS,
  shareFileName,
  shareText,
} from "@/presentation/components/share/shareCard";

const deck = registerBuiltInDecks(new InMemoryDeckRegistry()).get(
  FIXTURE_DECK_ID,
);
const SITE = "https://games.milespapa.com/tarot/";

function record(synthesis?: string): ReadingRecord {
  const created = recordRound({
    id: "r1",
    spread: fixtureSpread({
      questions: ["現在的我", "阻礙"],
      mainQuestion: "這份新工作適合我嗎？",
      draws: [
        fixtureDraw({ drawNumber: 1, cardId: "atelier-standard.major.17" }),
        fixtureDraw({
          drawNumber: 2,
          cardId: "atelier-standard.swords.seven",
          reversed: true,
          jumperCardId: "atelier-standard.cups.two",
        }),
      ],
    }),
    deckId: FIXTURE_DECK_ID,
    spreadName: "經典三張",
    recordedAt: new Date(2026, 10, 20, 2, 10),
  });
  if (!created) throw new Error("Expected a record");
  if (!synthesis) return created;
  const [withReading] = attachReading([created], created.roundKey, {
    mainQuestion: created.mainQuestion,
    reading: fixtureReading(synthesis),
  });
  return withReading ?? created;
}

describe("share card", () => {
  it("names each card with the deck's own face", () => {
    const card = buildShareCard({ record: record(), deck, siteUrl: SITE });
    expect(card.positions[0]?.primary).toMatchObject({
      name: "星星",
      orientation: "upright",
    });
    expect(card.positions[0]?.primary.faceUrl).toMatch(/major\.17\.webp$/u);
    expect(card.positions[1]?.jumper?.name).toBe("聖杯二");
    expect(card.summary).toBeUndefined();
  });

  it("keeps the whole reading for the text and a short one for the image", () => {
    const long = `${"希望感仍在。".repeat(30)}`;
    const card = buildShareCard({ record: record(long), deck, siteUrl: SITE });
    expect(card.synthesis).toBe(long);
    expect(Array.from(card.summary ?? "").length).toBeLessThanOrEqual(
      SHARE_SUMMARY_CHARACTERS,
    );
  });

  it("writes the text with questions, cards, the reading and the disclaimer", () => {
    const text = shareText(
      buildShareCard({ record: record("整體提醒。"), deck, siteUrl: SITE }),
    );
    expect(text).toBe(
      [
        "Tarot Atelier・經典三張",
        "主問題：這份新工作適合我嗎？",
        "",
        "1. 現在的我",
        "   星星（正位）",
        "2. 阻礙",
        "   寶劍七（逆位）＋跳牌 聖杯二（逆位）",
        "",
        "全局關聯",
        "整體提醒。",
        "",
        "僅供娛樂與自我反思",
        SITE,
      ].join("\n"),
    );
  });

  it("leaves every question out when they are hidden", () => {
    const text = shareText(
      buildShareCard({
        record: shareableRecord(record("整體提醒。"), "hidden"),
        deck,
        siteUrl: SITE,
      }),
    );
    expect(text).not.toContain("主問題");
    expect(text).not.toContain("現在的我");
    expect(text).toContain("1. 星星（正位）");
  });

  it("names the image file by the local time of the round", () => {
    expect(shareFileName(new Date(2026, 10, 20, 2, 10).toISOString())).toBe(
      "tarot-atelier-20261120-0210.png",
    );
  });
});
