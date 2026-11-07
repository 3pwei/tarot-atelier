// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readingResultSchema } from "@/application/reading/readingSchemas";
import {
  atelierStandardDeck,
  phaseOneTestDeck,
} from "@/domain/deck/builtinDecks";
import { buildReadingRequest } from "@/domain/reading/buildReadingRequest";
import { findCertaintyPhrases } from "@/domain/reading/readingSafety";
import {
  MAJOR,
  spreadOf,
  standardRegistry,
  type PositionSpec,
} from "@/domain/reading/testing/readingFixtures";
import {
  READING_TONES,
  type ReadingRequest,
  type ReadingResult,
  type ReadingTone,
} from "@/domain/reading/types";
import { MAX_SPREAD_POSITIONS } from "@/domain/spread/types";
import { loadTonePhrases } from "@/infrastructure/reading/content/contentLibrary";
import { PrewrittenReadingProvider } from "@/infrastructure/reading/prewrittenReadingProvider";

const provider = new PrewrittenReadingProvider(standardRegistry);

function requestOf(
  positions: readonly PositionSpec[],
  tone: ReadingTone = "analytical",
  mainQuestion = "",
): ReadingRequest {
  const build = buildReadingRequest(
    spreadOf(positions, mainQuestion),
    standardRegistry,
    tone,
  );
  if (!build.ok) throw new Error(JSON.stringify(build.issues));
  return build.request;
}

const threeCards: readonly PositionSpec[] = [
  { question: "現況是什麼？", draw: { card: MAJOR(17) } },
  {
    question: "阻礙在哪裡？",
    draw: {
      card: MAJOR(16),
      orientation: "reversed",
      jumper: { card: "atelier-standard.cups.three" },
    },
  },
  { question: "可以怎麼做？", draw: { card: "atelier-standard.wands.two" } },
];

function allTexts(result: ReadingResult): readonly string[] {
  return [
    result.synthesis,
    ...result.reflectionQuestions,
    ...result.suggestions,
    ...result.positions.flatMap((position) =>
      [position.primary, position.jumper].flatMap((card) =>
        card ? [card.symbolism, card.interpretation] : [],
      ),
    ),
  ];
}

describe("PrewrittenReadingProvider", () => {
  it.each(READING_TONES)(
    "produces a valid, labelled reading in the %s tone",
    async (tone) => {
      const request = requestOf(threeCards, tone, "我的工作方向");
      const result = await provider.interpret(request);

      expect(readingResultSchema.safeParse(result).success).toBe(true);
      expect(result).toMatchObject({
        source: "prewritten",
        tone,
        deckId: request.deckId,
      });
      expect(result.positions.map((p) => p.index)).toEqual([1, 2, 3]);
    },
  );

  it("reads each tone differently", async () => {
    const texts = await Promise.all(
      READING_TONES.map(async (tone) => {
        const result = await provider.interpret(requestOf(threeCards, tone));
        return result.positions[0]?.primary.interpretation;
      }),
    );
    expect(new Set(texts).size).toBe(READING_TONES.length);
  });

  it("is deterministic: the same request reads the same way", async () => {
    const request = requestOf(threeCards, "witty");
    expect(await provider.interpret(request)).toEqual(
      await provider.interpret(request),
    );
  });

  it("ties each card to its own position's question", async () => {
    const result = await provider.interpret(requestOf(threeCards));
    result.positions.forEach((position) => {
      expect(position.primary.interpretation).toContain(position.question);
    });
  });

  it("voices a minor card without repeating its name or the same angle", async () => {
    const result = await provider.interpret(requestOf(threeCards));
    const minor = result.positions[2]?.primary.interpretation ?? "";
    expect(minor.split("權杖二")).toHaveLength(2);
    expect(minor).toContain("站在選擇的起點，正在規劃方向");
    expect(minor.split("站在選擇的起點，正在規劃方向")).toHaveLength(2);
  });

  it("adds the jumper's message to its position without adding a position", async () => {
    const result = await provider.interpret(requestOf(threeCards));
    expect(result.positions).toHaveLength(3);
    expect(result.positions[1]?.jumper).toMatchObject({
      cardId: "atelier-standard.cups.three",
      cardName: "聖杯三",
    });
    expect(result.positions[1]?.jumper?.interpretation).toContain("跳牌");
    expect(result.synthesis).toContain("跳牌");
  });

  it("uses the reversed content for a reversed card", async () => {
    const result = await provider.interpret(requestOf(threeCards));
    expect(result.positions[1]?.primary).toMatchObject({
      meaningMode: "reversed",
      orientation: "reversed",
    });
    expect(result.positions[1]?.primary.symbolism).toContain("延後");
  });

  it("reads a single card", async () => {
    const result = await provider.interpret(
      requestOf(
        [{ question: "今天的提醒？", draw: { card: MAJOR(0) } }],
        "concise",
      ),
    );
    expect(result.positions).toHaveLength(1);
    expect(result.synthesis).toContain("單張牌");
    expect(result.reflectionQuestions).toHaveLength(1);
  });

  it("reads twelve cards and caps the reflections and suggestions", async () => {
    const twelve = Array.from({ length: MAX_SPREAD_POSITIONS }, (_, i) => ({
      question: `第 ${i + 1} 個問題？`,
      draw: { card: MAJOR(i) },
    }));
    const result = await provider.interpret(requestOf(twelve, "dramatic"));
    expect(result.positions).toHaveLength(MAX_SPREAD_POSITIONS);
    expect(result.reflectionQuestions).toHaveLength(3);
    expect(result.suggestions).toHaveLength(3);
    expect(result.synthesis).toContain("12");
    expect(readingResultSchema.safeParse(result).success).toBe(true);
  });

  it("notes a leading suit and many reversed cards in the synthesis", async () => {
    const result = await provider.interpret(
      requestOf([
        {
          question: "一？",
          draw: { card: "atelier-standard.cups.two", orientation: "reversed" },
        },
        {
          question: "二？",
          draw: { card: "atelier-standard.cups.five", orientation: "reversed" },
        },
        { question: "三？", draw: { card: "atelier-standard.swords.ace" } },
      ]),
    );
    expect(result.synthesis).toContain("聖杯");
    expect(result.synthesis).toContain("逆位");
  });

  it("never states certainty in any tone, across every card and orientation", async () => {
    const cards = atelierStandardDeck.cards.map((card) => card.id);
    for (const tone of READING_TONES) {
      for (const orientation of ["upright", "reversed"] as const) {
        for (
          let start = 0;
          start < cards.length;
          start += MAX_SPREAD_POSITIONS
        ) {
          const chunk = cards.slice(start, start + MAX_SPREAD_POSITIONS);
          const result = await provider.interpret(
            requestOf(
              chunk.map((card, i) => ({
                question: `問題 ${i + 1}？`,
                draw: { card, orientation },
              })),
              tone,
              "整體方向",
            ),
          );
          const offending = allTexts(result).filter(
            (text) => findCertaintyPhrases(text).length > 0,
          );
          expect(offending).toEqual([]);
        }
      }
    }
  });

  it("flags questions that need a professional", async () => {
    const result = await provider.interpret(
      requestOf([
        { question: "我該不該買這支股票？", draw: { card: MAJOR(10) } },
      ]),
    );
    expect(result.sensitiveTopics).toEqual(["financial"]);
  });

  it("reads a deck without its own content from the deck's meanings, neutrally when reversed", async () => {
    const request: ReadingRequest = {
      schemaVersion: "1.0.0",
      deckId: phaseOneTestDeck.id,
      tone: "gentle",
      positions: [
        {
          index: 1,
          question: "從哪裡開始？",
          x: 0.5,
          y: 0.5,
          primary: { id: "phase-one-test.tide", orientation: "reversed" },
        },
      ],
    };
    const result = await provider.interpret(request);
    const primary = result.positions[0]?.primary;

    expect(primary?.meaningMode).toBe("neutral");
    expect(primary?.symbolism).toContain("觀察往返的節奏");
    expect(primary?.interpretation).toContain("節奏");
    expect(primary?.symbolism).toContain("沒有定義逆位");
    expect(primary?.symbolism).not.toContain("此牌組已關閉逆位");
    expect(readingResultSchema.safeParse(result).success).toBe(true);
  });

  it("works offline: content and phrases come from bundled files", async () => {
    let calls = 0;
    const counting = new PrewrittenReadingProvider(standardRegistry, {
      loadContent: async () => {
        calls += 1;
        return undefined;
      },
      loadPhrases: async () => {
        calls += 1;
        return loadTonePhrases();
      },
    });
    await counting.interpret(requestOf(threeCards));
    expect(calls).toBe(2);
  });

  it("stops when cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      provider.interpret(requestOf(threeCards), { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("refuses a deck the registry does not know", async () => {
    await expect(
      provider.interpret({ ...requestOf(threeCards), deckId: "unknown" }),
    ).rejects.toThrow(/not registered/u);
  });
});
