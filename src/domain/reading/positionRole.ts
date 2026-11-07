/**
 * What a position asks about, read from its question. Readings use it to say
 * "in the present position…" instead of quoting the whole question back.
 */
export const POSITION_ROLES = [
  "past",
  "present",
  "future",
  "obstacle",
  "advice",
  "self",
  "others",
  "unknown",
] as const;

export type PositionRole = (typeof POSITION_ROLES)[number];

/**
 * Checked in this order, so "我的阻礙" is an obstacle rather than the self
 * and "對方的過去" is the past. Single characters such as 他 are matched only
 * in phrases, because they also appear inside unrelated words (其他).
 */
const ROLE_KEYWORDS: readonly (readonly [PositionRole, readonly string[]])[] =
  Object.freeze([
    ["obstacle", ["阻礙", "困難", "卡住", "挑戰"]],
    ["advice", ["建議", "怎麼做", "該如何", "如何做", "行動"]],
    ["past", ["過去", "起因", "原因", "背景", "根源"]],
    ["present", ["現在", "現況", "目前", "狀態", "此刻", "處境"]],
    ["future", ["未來", "走向", "接下來", "結果", "發展"]],
    [
      "others",
      [
        "對方",
        "他人",
        "別人",
        "身邊的人",
        "他的",
        "她的",
        "他對",
        "她對",
        "他會",
        "她會",
        "環境",
      ],
    ],
    ["self", ["我的", "內心", "感受"]],
  ]);

export function detectPositionRole(question: string): PositionRole {
  const match = ROLE_KEYWORDS.find(([, keywords]) =>
    keywords.some((keyword) => question.includes(keyword)),
  );
  return match ? match[0] : "unknown";
}
