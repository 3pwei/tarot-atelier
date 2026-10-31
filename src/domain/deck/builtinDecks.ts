import { parseDeckManifest } from "@/domain/deck/deckManifestParser";
import {
  DECK_SCHEMA_VERSION,
  type CardDefinition,
  type DeckManifest,
  type TarotRank,
  type TarotSuit,
} from "@/domain/deck/types";

const CARD_BACK = "procedural://atelier/back/celestial";

interface MajorSeed {
  readonly zhHant: string;
  readonly en: string;
  readonly symbol: string;
  readonly keywords: readonly [string, string];
  readonly upright: string;
  readonly reversed: string;
}

const majorSeeds: readonly MajorSeed[] = [
  {
    zhHant: "愚者",
    en: "The Fool",
    symbol: "✦",
    keywords: ["啟程", "信任"],
    upright: "帶著好奇踏出第一步，讓經驗在路上塑造方向。",
    reversed: "衝動或過度遲疑遮住了起點，先確認風險再前行。",
  },
  {
    zhHant: "魔術師",
    en: "The Magician",
    symbol: "∞",
    keywords: ["創造", "聚焦"],
    upright: "資源已在手邊，把意圖收束成一個能開始的行動。",
    reversed: "能力分散或表達失真，重新對齊承諾與實際作為。",
  },
  {
    zhHant: "女祭司",
    en: "The High Priestess",
    symbol: "☾",
    keywords: ["直覺", "靜觀"],
    upright: "答案尚在沉澱，留一段安靜讓細微訊號浮現。",
    reversed: "內在聲音被雜訊蓋過，暫停追問外界的肯定。",
  },
  {
    zhHant: "皇后",
    en: "The Empress",
    symbol: "❀",
    keywords: ["滋養", "豐盛"],
    upright: "以耐心照料正在成長的人事物，豐盛來自持續投入。",
    reversed: "付出失去界線或創意乾涸，也要把照顧留給自己。",
  },
  {
    zhHant: "皇帝",
    en: "The Emperor",
    symbol: "♜",
    keywords: ["秩序", "責任"],
    upright: "建立清楚邊界與可依循的結構，穩定承擔決定。",
    reversed: "控制取代了領導，檢視規則是否仍服務真正目的。",
  },
  {
    zhHant: "教皇",
    en: "The Hierophant",
    symbol: "⚜",
    keywords: ["傳承", "學習"],
    upright: "從可靠傳統與師長經驗中取材，再形成自己的理解。",
    reversed: "既有規範限制了思考，允許自己提出不同的問題。",
  },
  {
    zhHant: "戀人",
    en: "The Lovers",
    symbol: "♡",
    keywords: ["選擇", "連結"],
    upright: "真誠選擇與價值一致的關係，讓承諾建立在理解上。",
    reversed: "期待與價值錯位，先說清楚彼此真正重視的事。",
  },
  {
    zhHant: "戰車",
    en: "The Chariot",
    symbol: "➶",
    keywords: ["意志", "前進"],
    upright: "整合互相拉扯的力量，把節奏掌握在自己手中。",
    reversed: "用力過猛或方向分裂，減速比盲目推進更有效。",
  },
  {
    zhHant: "力量",
    en: "Strength",
    symbol: "♌",
    keywords: ["勇氣", "溫柔"],
    upright: "用穩定而溫柔的勇氣接住本能，不必靠壓制證明強大。",
    reversed: "自我懷疑消耗了力量，先承認脆弱再恢復信心。",
  },
  {
    zhHant: "隱者",
    en: "The Hermit",
    symbol: "◇",
    keywords: ["獨處", "尋索"],
    upright: "暫離喧鬧整理經驗，讓內在標準重新照亮下一步。",
    reversed: "獨處逐漸變成隔絕，適時讓可信任的人靠近。",
  },
  {
    zhHant: "命運之輪",
    en: "Wheel of Fortune",
    symbol: "◉",
    keywords: ["循環", "轉機"],
    upright: "局勢正在轉動，辨認週期並把握可回應的時刻。",
    reversed: "抗拒變化使卡點延長，調整期待以找回主動空間。",
  },
  {
    zhHant: "正義",
    en: "Justice",
    symbol: "⚖",
    keywords: ["衡量", "誠實"],
    upright: "以事實與一致標準做判斷，也承擔選擇帶來的結果。",
    reversed: "偏見或逃避責任扭曲了衡量，需要補回被忽略的證據。",
  },
  {
    zhHant: "倒吊人",
    en: "The Hanged Man",
    symbol: "▽",
    keywords: ["懸停", "轉念"],
    upright: "暫停控制，換一個角度看見原本被遮住的可能。",
    reversed: "等待失去意義，確認犧牲是否只是拖延決定。",
  },
  {
    zhHant: "死神",
    en: "Death",
    symbol: "✣",
    keywords: ["結束", "蛻變"],
    upright: "讓已完成的篇章離開，空出的地方才能承接新形態。",
    reversed: "緊抓熟悉事物延緩轉換，為告別設定清楚界線。",
  },
  {
    zhHant: "節制",
    en: "Temperance",
    symbol: "⚗",
    keywords: ["調和", "節奏"],
    upright: "把不同元素耐心調和，以可持續的速度前進。",
    reversed: "失衡與急躁放大摩擦，先修正日常節奏再談突破。",
  },
  {
    zhHant: "惡魔",
    en: "The Devil",
    symbol: "⛓",
    keywords: ["束縛", "慾望"],
    upright: "看見慾望與依附如何運作，命名束縛就是鬆動的開始。",
    reversed: "已察覺限制並準備抽身，別低估舊習慣的回拉。",
  },
  {
    zhHant: "高塔",
    en: "The Tower",
    symbol: "ϟ",
    keywords: ["震盪", "揭露"],
    upright: "突然的真相拆除不穩結構，混亂也帶來重新建造的空間。",
    reversed: "害怕震動而延後必要改變，小幅拆解可減少日後衝擊。",
  },
  {
    zhHant: "星星",
    en: "The Star",
    symbol: "✧",
    keywords: ["希望", "修復"],
    upright: "在經歷震盪後重新相信未來，以微小行動恢復流動。",
    reversed: "希望暫時黯淡，先照顧耗竭而不必強迫自己樂觀。",
  },
  {
    zhHant: "月亮",
    en: "The Moon",
    symbol: "☽",
    keywords: ["朦朧", "潛意識"],
    upright: "資訊仍不完整，尊重感受但別急著把猜測當作事實。",
    reversed: "迷霧開始散去，逐一核對曾被恐懼放大的想像。",
  },
  {
    zhHant: "太陽",
    en: "The Sun",
    symbol: "☼",
    keywords: ["明朗", "活力"],
    upright: "坦率與活力照亮局面，讓成果被看見也分享喜悅。",
    reversed: "光芒被疲憊或過高期待遮住，簡單的快樂仍值得承認。",
  },
  {
    zhHant: "審判",
    en: "Judgement",
    symbol: "♩",
    keywords: ["召喚", "回顧"],
    upright: "回顧過去並回應真正的召喚，用新理解做出成熟決定。",
    reversed: "自責或否認妨礙更新，把評判改寫成可採取的修正。",
  },
  {
    zhHant: "世界",
    en: "The World",
    symbol: "◎",
    keywords: ["完成", "整合"],
    upright: "一段旅程完整收束，帶著整合後的能力走向新循環。",
    reversed: "最後一步尚未落地，找出未完成的承諾並好好收尾。",
  },
] as const;

const suitSeeds: Readonly<
  Record<
    TarotSuit,
    {
      readonly zhHant: string;
      readonly en: string;
      readonly symbol: string;
      readonly focus: string;
      readonly shadow: string;
    }
  >
> = {
  wands: {
    zhHant: "權杖",
    en: "Wands",
    symbol: "♣",
    focus: "行動與創造力",
    shadow: "急躁與能量失焦",
  },
  cups: {
    zhHant: "聖杯",
    en: "Cups",
    symbol: "♥",
    focus: "情感與關係流動",
    shadow: "情緒淹沒與逃避",
  },
  swords: {
    zhHant: "寶劍",
    en: "Swords",
    symbol: "♠",
    focus: "思考與清楚溝通",
    shadow: "焦慮與過度分析",
  },
  pentacles: {
    zhHant: "錢幣",
    en: "Pentacles",
    symbol: "◆",
    focus: "資源與現實累積",
    shadow: "匱乏感與僵固執著",
  },
};

const rankSeeds: Readonly<
  Record<
    TarotRank,
    {
      readonly zhHant: string;
      readonly en: string;
      readonly theme: string;
      readonly guidance: string;
    }
  >
> = {
  ace: {
    zhHant: "一",
    en: "Ace",
    theme: "萌芽",
    guidance: "先保護最純粹的起心動念",
  },
  two: {
    zhHant: "二",
    en: "Two",
    theme: "選擇",
    guidance: "比較方向後做出有意識的取捨",
  },
  three: {
    zhHant: "三",
    en: "Three",
    theme: "展開",
    guidance: "讓初步成果與他人或環境連結",
  },
  four: {
    zhHant: "四",
    en: "Four",
    theme: "穩定",
    guidance: "在安全感與停滯之間找出界線",
  },
  five: {
    zhHant: "五",
    en: "Five",
    theme: "摩擦",
    guidance: "把衝突當成需要重新調整的訊號",
  },
  six: {
    zhHant: "六",
    en: "Six",
    theme: "回應",
    guidance: "接住變化並恢復較有餘裕的流動",
  },
  seven: {
    zhHant: "七",
    en: "Seven",
    theme: "考驗",
    guidance: "辨識雜訊，守住真正重要的選擇",
  },
  eight: {
    zhHant: "八",
    en: "Eight",
    theme: "推進",
    guidance: "讓重複練習形成清楚而有效的動能",
  },
  nine: {
    zhHant: "九",
    en: "Nine",
    theme: "成熟",
    guidance: "承認累積成果，也照顧最後一段疲憊",
  },
  ten: {
    zhHant: "十",
    en: "Ten",
    theme: "完成",
    guidance: "整理一個循環的收穫與負擔",
  },
  page: {
    zhHant: "侍者",
    en: "Page",
    theme: "訊息",
    guidance: "用初學者的眼光接收新線索",
  },
  knight: {
    zhHant: "騎士",
    en: "Knight",
    theme: "追尋",
    guidance: "讓熱情有方向，也為速度保留煞車",
  },
  queen: {
    zhHant: "皇后",
    en: "Queen",
    theme: "內化",
    guidance: "以成熟感受承接並滋養局面",
  },
  king: {
    zhHant: "國王",
    en: "King",
    theme: "掌握",
    guidance: "以責任與長期眼光運用影響力",
  },
};

const rankOrder: readonly TarotRank[] = [
  "ace",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "page",
  "knight",
  "queen",
  "king",
];

const suitOrder: readonly TarotSuit[] = [
  "wands",
  "cups",
  "swords",
  "pentacles",
];

const majorCards: readonly CardDefinition[] = majorSeeds.map((seed, index) => ({
  id: `atelier-standard.major.${index.toString().padStart(2, "0")}`,
  name: { zhHant: seed.zhHant, en: seed.en },
  artwork: {
    face: `procedural://atelier/major/${index.toString().padStart(2, "0")}`,
    back: CARD_BACK,
  },
  keywords: seed.keywords,
  uprightMeaning: seed.upright,
  reversedMeaning: seed.reversed,
  category: "major",
  sequence: index,
  metadata: { numeral: index, symbol: seed.symbol },
}));

const minorCards: readonly CardDefinition[] = suitOrder.flatMap(
  (suit, suitIndex) => {
    const suitSeed = suitSeeds[suit];
    return rankOrder.map((rank, rankIndex) => {
      const rankSeed = rankSeeds[rank];
      return {
        id: `atelier-standard.${suit}.${rank}`,
        name: {
          zhHant: `${suitSeed.zhHant}${rankSeed.zhHant}`,
          en: `${rankSeed.en} of ${suitSeed.en}`,
        },
        artwork: {
          face: `procedural://atelier/${suit}/${rank}`,
          back: CARD_BACK,
        },
        keywords: [rankSeed.theme, suitSeed.focus],
        uprightMeaning: `${suitSeed.zhHant}${rankSeed.zhHant}帶來「${rankSeed.theme}」的課題：${rankSeed.guidance}，並把${suitSeed.focus}帶回當下。`,
        reversedMeaning: `${suitSeed.zhHant}${rankSeed.zhHant}逆位提醒${suitSeed.shadow}正在干擾「${rankSeed.theme}」；先降低耗損，再決定下一步。`,
        category: "minor" as const,
        sequence: 22 + suitIndex * rankOrder.length + rankIndex,
        suit,
        rank,
        metadata: { symbol: suitSeed.symbol },
      };
    });
  },
);

export const atelierStandardManifest: DeckManifest = {
  schemaVersion: DECK_SCHEMA_VERSION,
  id: "atelier-standard-tarot",
  name: { zhHant: "工坊標準塔羅", en: "Atelier Standard Tarot" },
  artist: "Tarot Atelier procedural art system",
  license: "Original project artwork; source-available with this repository",
  cards: [...majorCards, ...minorCards],
  supportsReversals: true,
  metadata: {
    edition: "Phase 01",
    artStatus: "Procedural frames and symbols; not a 78-card illustration set",
  },
};

export const atelierStandardDeck = parseDeckManifest(atelierStandardManifest);

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
