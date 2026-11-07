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
import type { ReadingRequest, ReadingResult } from "@/domain/reading/types";
import { MAX_SPREAD_POSITIONS } from "@/domain/spread/types";
import { loadReadingPhrases } from "@/infrastructure/reading/content/contentLibrary";
import { PrewrittenReadingProvider } from "@/infrastructure/reading/prewrittenReadingProvider";

const provider = new PrewrittenReadingProvider(standardRegistry);

function requestOf(
  positions: readonly PositionSpec[],
  mainQuestion = "",
): ReadingRequest {
  const build = buildReadingRequest(
    spreadOf(positions, mainQuestion),
    standardRegistry,
  );
  if (!build.ok) throw new Error(JSON.stringify(build.issues));
  return build.request;
}

/** The classic three-card spread the owner tried, asking about an interview. */
const interview: readonly PositionSpec[] = [
  {
    question: "這件事的過去與起因是什麼？",
    draw: { card: "atelier-standard.wands.eight" },
  },
  {
    question: "現在的狀態是什麼？",
    draw: {
      card: "atelier-standard.cups.three",
      orientation: "reversed",
      jumper: { card: MAJOR(17) },
    },
  },
  {
    question: "接下來可能的走向是什麼？",
    draw: { card: "atelier-standard.swords.nine", orientation: "reversed" },
  },
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

async function read(positions: readonly PositionSpec[], mainQuestion = "") {
  return provider.interpret(requestOf(positions, mainQuestion));
}

describe("PrewrittenReadingProvider", () => {
  it("produces a valid reading labelled as pre-written", async () => {
    const request = requestOf(interview, "面試結果");
    const result = await provider.interpret(request);

    expect(readingResultSchema.safeParse(result).success).toBe(true);
    expect(result).toMatchObject({
      source: "prewritten",
      deckId: request.deckId,
    });
    expect(result.positions.map((p) => p.index)).toEqual([1, 2, 3]);
  });

  it("names each position's role instead of quoting its question", async () => {
    const result = await read(interview, "面試結果");
    const [past, present, future] = result.positions.map(
      (p) => p.primary.interpretation,
    );
    expect(past).toContain("在「過去與起因」這個位置");
    expect(present).toContain("在「現在的狀態」這個位置");
    expect(future).toContain("在「接下來的走向」這個位置");
    result.positions.forEach((position) => {
      expect(position.primary.interpretation).not.toContain(position.question);
    });
  });

  it("ties every card back to the main question", async () => {
    const result = await read(interview, "面試結果");
    result.positions.forEach((position) => {
      expect(position.primary.interpretation).toContain("對於「面試結果」");
    });
  });

  it("says a future position is possible, not decided", async () => {
    const result = await read(interview, "面試結果");
    expect(result.positions[2]?.primary.interpretation).toContain(
      "而不是已經決定的結果",
    );
  });

  it("leaves out the main-question sentence when there is none", async () => {
    const result = await read(interview);
    result.positions.forEach((position) => {
      expect(position.primary.interpretation).not.toContain("對於「");
    });
  });

  it("names a minor card once and never repeats the same angle", async () => {
    const result = await read(interview, "面試結果");
    for (const position of result.positions) {
      const { cardName, interpretation } = position.primary;
      expect(interpretation.split(cardName), cardName).toHaveLength(2);
    }
    const present = result.positions[1]?.primary.interpretation ?? "";
    expect(present).toContain("和朋友之間有些疏離");
    expect(present.split("和朋友之間有些疏離")).toHaveLength(2);
  });

  it("opens a major card with its written explanation", async () => {
    const result = await read(
      [{ question: "現在的狀態是什麼？", draw: { card: MAJOR(17) } }],
      "面試結果",
    );
    expect(result.positions[0]?.primary.interpretation).toMatch(
      /^星星正位的核心是「修復後的希望」/u,
    );
  });

  it("reads an unrecognised position plainly", async () => {
    const result = await read([
      { question: "今天的提醒？", draw: { card: MAJOR(0) } },
    ]);
    expect(result.positions[0]?.primary.interpretation).toContain(
      "在這個牌位，它指向的是",
    );
  });

  it("describes the past and present, and suggests action for advice", async () => {
    const result = await read(interview, "面試結果");
    expect(result.positions[0]?.primary.interpretation).not.toContain(
      "適合趁勢採取行動",
    );
    const advice = await read([
      {
        question: "我可以怎麼做？",
        draw: { card: "atelier-standard.wands.eight" },
      },
    ]);
    expect(advice.positions[0]?.primary.interpretation).toContain(
      "適合趁勢採取行動",
    );
  });

  it("is deterministic: the same request reads the same way", async () => {
    const request = requestOf(interview, "面試結果");
    expect(await provider.interpret(request)).toEqual(
      await provider.interpret(request),
    );
  });

  it("adds the jumper's message to its position without adding a position", async () => {
    const result = await read(interview);
    expect(result.positions).toHaveLength(3);
    expect(result.positions[1]?.jumper).toMatchObject({
      cardId: MAJOR(17),
      cardName: "星星",
    });
    expect(result.positions[1]?.jumper?.interpretation).toContain("跳牌");
    expect(result.synthesis).toContain("跳牌");
  });

  it("uses the reversed content for a reversed card", async () => {
    const result = await read(interview);
    expect(result.positions[1]?.primary).toMatchObject({
      meaningMode: "reversed",
      orientation: "reversed",
    });
    expect(result.positions[1]?.primary.symbolism).toContain("縫隙");
  });

  it("reads a single card", async () => {
    const result = await read([
      { question: "今天的提醒？", draw: { card: MAJOR(0) } },
    ]);
    expect(result.positions).toHaveLength(1);
    expect(result.synthesis).toContain("只有一個牌位");
    expect(result.reflectionQuestions).toHaveLength(1);
  });

  it("reads twelve cards and caps the reflections and suggestions", async () => {
    const twelve = Array.from({ length: MAX_SPREAD_POSITIONS }, (_, i) => ({
      question: `第 ${i + 1} 個問題？`,
      draw: { card: MAJOR(i) },
    }));
    const result = await read(twelve);
    expect(result.positions).toHaveLength(MAX_SPREAD_POSITIONS);
    expect(result.reflectionQuestions).toHaveLength(3);
    expect(result.suggestions).toHaveLength(3);
    expect(result.synthesis).toContain("12");
    expect(readingResultSchema.safeParse(result).success).toBe(true);
  });

  it("notes a leading suit and many reversed cards in the synthesis", async () => {
    const result = await read([
      {
        question: "一？",
        draw: { card: "atelier-standard.cups.two", orientation: "reversed" },
      },
      {
        question: "二？",
        draw: { card: "atelier-standard.cups.five", orientation: "reversed" },
      },
      { question: "三？", draw: { card: "atelier-standard.swords.ace" } },
    ]);
    expect(result.synthesis).toContain("聖杯");
    expect(result.synthesis).toContain("逆位");
  });

  it("never states certainty, across every card and orientation", async () => {
    const cards = atelierStandardDeck.cards.map((card) => card.id);
    const roleQuestions = [
      "這件事的過去與起因是什麼？",
      "現在的狀態是什麼？",
      "接下來可能的走向是什麼？",
      "阻礙在哪裡？",
      "我可以怎麼做？",
      "我的內心真正想要什麼？",
      "對方怎麼看？",
      "今天的提醒？",
    ];
    for (const orientation of ["upright", "reversed"] as const) {
      for (let start = 0; start < cards.length; start += MAX_SPREAD_POSITIONS) {
        const chunk = cards.slice(start, start + MAX_SPREAD_POSITIONS);
        const result = await read(
          chunk.map((card, i) => ({
            question: roleQuestions[i % roleQuestions.length] ?? "問題？",
            draw: { card, orientation },
          })),
          "整體方向",
        );
        const offending = allTexts(result).filter(
          (text) => findCertaintyPhrases(text).length > 0,
        );
        expect(offending).toEqual([]);
      }
    }
  });

  it("flags questions that need a professional", async () => {
    const result = await read([
      { question: "我該不該買這支股票？", draw: { card: MAJOR(10) } },
    ]);
    expect(result.sensitiveTopics).toEqual(["financial"]);
  });

  it("reads a deck without its own content from the deck's meanings, neutrally when reversed", async () => {
    const request: ReadingRequest = {
      schemaVersion: "1.0.0",
      deckId: phaseOneTestDeck.id,
      positions: [
        {
          index: 1,
          question: "現在的狀態是什麼？",
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
    expect(primary?.symbolism).toContain("沒有定義逆位");
    expect(primary?.symbolism).not.toContain("此牌組已關閉逆位");
    expect(primary?.interpretation).toContain("在「現在的狀態」這個位置");
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
        return loadReadingPhrases();
      },
    });
    await counting.interpret(requestOf(interview));
    expect(calls).toBe(2);
  });

  it("stops when cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      provider.interpret(requestOf(interview), { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });

  it("refuses a deck the registry does not know", async () => {
    await expect(
      provider.interpret({ ...requestOf(interview), deckId: "unknown" }),
    ).rejects.toThrow(/not registered/u);
  });
});
