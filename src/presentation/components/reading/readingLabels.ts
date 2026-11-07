import type { ReadingFailure } from "@/application/use-cases/requestReading";
import type { ReadingRequestIssue } from "@/domain/reading/buildReadingRequest";
import type { MeaningMode, SensitiveTopic } from "@/domain/reading/types";

/** Every player-facing word of the reading panel lives here. */

export const MEANING_LABELS: Readonly<Record<MeaningMode, string>> =
  Object.freeze({
    upright: "正位",
    reversed: "逆位",
    neutral: "逆位・中性解讀",
  });

export const FAILURE_MESSAGES: Readonly<Record<ReadingFailure, string>> =
  Object.freeze({
    "invalid-request-id": "這次的解讀編號無效，請重新產生。",
    "invalid-request": "牌陣資料不完整，請確認每個牌位都有問題並已抽牌。",
    "request-id-conflict": "牌陣在產生途中改變了，請重新產生。",
    cancelled: "已取消這次解讀，牌陣保持不變。",
    "provider-failed": "解讀暫時無法產生，請再試一次。",
    "invalid-result": "解讀內容格式有誤，已略過。請再試一次。",
  });

export const TOPIC_LABELS: Readonly<Record<SensitiveTopic, string>> =
  Object.freeze({
    health: "健康",
    legal: "法律",
    financial: "財務",
  });

export function issueMessage(issue: ReadingRequestIssue): string {
  switch (issue.code) {
    case "no-positions":
      return "牌陣還沒有牌位。";
    case "too-many-positions":
      return "牌位超過上限。";
    case "missing-question":
      return `牌位 ${issue.index} 還沒有問題。`;
    case "question-too-long":
      return `牌位 ${issue.index} 的問題太長。`;
    case "main-question-too-long":
      return "主問題太長。";
    case "undrawn-position":
      return `牌位 ${issue.index} 還沒有抽牌。`;
    case "mixed-decks":
      return "這個牌陣混用了不同的牌組。";
    case "unknown-deck":
      return "找不到這個牌陣使用的牌組。";
    case "unknown-card":
      return `牌位 ${issue.index} 的牌不屬於這個牌組。`;
  }
}

export const READING_COPY = Object.freeze({
  title: "解讀",
  sampleBadge: "範例解牌，不是 AI",
  sourceNote: "依牌義預先撰寫並組合而成，不是即時生成的 AI 解讀。",
  generate: "產生範例解讀",
  regenerate: "重新產生",
  loading: "正在組合解讀…",
  cancel: "取消",
  retry: "再試一次",
  stale: "牌陣已改變，下方是先前的解讀。按「重新產生」以更新。",
  deck: "使用的牌組",
  mainQuestion: "主問題",
  jumper: "跳牌",
  symbolism: "單牌象徵",
  interpretation: "與問題的關聯",
  jumperMessage: "跳牌補充",
  synthesis: "全局關聯",
  reflections: "反思問題",
  suggestions: "可以考慮的做法",
  disclaimer:
    "塔羅解讀僅供娛樂與自我反思，不能預測未來，也不構成醫療、法律或財務建議。",
  professional: (topics: string) =>
    `你的問題涉及${topics}。牌卡只能提供反思的角度，重要決定請諮詢合格的專業人士。`,
  waiting: "所有牌翻開後，就能產生解讀。",
});
