import type { SensitiveTopic } from "@/domain/reading/types";

/**
 * Phrases that state the future as certain or order the reader around.
 * Readings are for reflection, so no text shown to players may contain them.
 */
export const FORBIDDEN_CERTAINTY_PHRASES: readonly string[] = Object.freeze([
  "一定會",
  "一定要",
  "注定",
  "保證",
  "絕對會",
  "必定",
  "必然",
  "你必須",
  "必須立刻",
  "馬上去",
  "不可能失敗",
  "百分之百",
]);

export function findCertaintyPhrases(text: string): readonly string[] {
  return FORBIDDEN_CERTAINTY_PHRASES.filter((phrase) => text.includes(phrase));
}

const SENSITIVE_TOPIC_KEYWORDS: Readonly<
  Record<SensitiveTopic, readonly string[]>
> = Object.freeze({
  health: [
    "生病",
    "疾病",
    "病情",
    "醫生",
    "醫院",
    "看診",
    "藥",
    "手術",
    "治療",
    "診斷",
    "懷孕",
    "症狀",
    "憂鬱",
    "健康",
  ],
  legal: [
    "法律",
    "官司",
    "訴訟",
    "律師",
    "告我",
    "提告",
    "判決",
    "違法",
    "合約糾紛",
    "離婚協議",
  ],
  financial: [
    "投資",
    "股票",
    "基金",
    "貸款",
    "借錢",
    "負債",
    "欠債",
    "房貸",
    "理財",
    "加密貨幣",
    "比特幣",
    "買房",
  ],
});

/** Topics, in a stable order, that any of the texts touches on. */
export function detectSensitiveTopics(
  texts: readonly string[],
): readonly SensitiveTopic[] {
  const combined = texts.join("\n");
  return (Object.keys(SENSITIVE_TOPIC_KEYWORDS) as SensitiveTopic[]).filter(
    (topic) =>
      SENSITIVE_TOPIC_KEYWORDS[topic].some((keyword) =>
        combined.includes(keyword),
      ),
  );
}
