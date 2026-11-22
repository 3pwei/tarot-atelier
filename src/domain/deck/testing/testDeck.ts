import { CARD_BACK } from "@/domain/deck/builtinDecks";
import { parseDeckManifest } from "@/domain/deck/deckManifestParser";
import { DECK_SCHEMA_VERSION, type DeckManifest } from "@/domain/deck/types";

/**
 * A three-card deck for tests only: upright-only, with one card whose art is
 * deliberately missing so fallbacks can be exercised. Never registered on the
 * site.
 */
export const phaseOneTestManifest: DeckManifest = {
  schemaVersion: DECK_SCHEMA_VERSION,
  id: "phase-one-test-deck",
  name: { zhHant: "三張測試牌組", en: "Three-card Test Deck" },
  artist: "Tarot Atelier QA",
  license: "Original test content",
  supportsReversals: false,
  cards: [
    {
      id: "phase-one-test.spark",
      name: { zhHant: "星火", en: "Spark" },
      artwork: {
        face: "missing://phase-one-test/spark",
        back: CARD_BACK,
      },
      keywords: ["開始", "測試"],
      uprightMeaning: "從一個足夠小的實驗開始。",
      reversedMeaning: "此牌組已關閉逆位，不會產生此方向。",
      category: "custom",
      sequence: 0,
      metadata: { symbol: "✦", expectedFallback: true },
    },
    {
      id: "phase-one-test.tide",
      name: { zhHant: "潮汐", en: "Tide" },
      artwork: {
        face: "procedural://atelier/test/tide",
        back: CARD_BACK,
      },
      keywords: ["節奏", "回返"],
      uprightMeaning: "觀察往返的節奏，再選擇投入時點。",
      reversedMeaning: "此牌組已關閉逆位，不會產生此方向。",
      category: "custom",
      sequence: 1,
      metadata: { symbol: "≈" },
    },
    {
      id: "phase-one-test.stone",
      name: { zhHant: "基石", en: "Foundation Stone" },
      artwork: {
        face: "procedural://atelier/test/stone",
        back: CARD_BACK,
      },
      keywords: ["穩固", "驗證"],
      uprightMeaning: "先確認基礎可靠，再承載更複雜的選擇。",
      reversedMeaning: "此牌組已關閉逆位，不會產生此方向。",
      category: "custom",
      sequence: 2,
      metadata: { symbol: "◇" },
    },
  ],
};

export const phaseOneTestDeck = parseDeckManifest(phaseOneTestManifest);
