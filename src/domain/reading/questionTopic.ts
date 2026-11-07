/**
 * What the main question is about, read from its wording. Readings use it to
 * add a sentence that speaks to that area of life ("以工作或求職來說…").
 */
export const QUESTION_TOPICS = [
  "work",
  "love",
  "study",
  "relationships",
  "direction",
  "general",
] as const;

export type QuestionTopic = (typeof QUESTION_TOPICS)[number];

/**
 * Checked in this order, so "和同事的人際關係" is about work and "家人反對
 * 我的感情" is about love: the more specific area wins.
 */
const TOPIC_KEYWORDS: readonly (readonly [QuestionTopic, readonly string[]])[] =
  Object.freeze([
    [
      "work",
      [
        "面試",
        "工作",
        "職場",
        "升遷",
        "轉職",
        "求職",
        "老闆",
        "主管",
        "同事",
        "公司",
        "事業",
        "職涯",
      ],
    ],
    [
      "love",
      [
        "感情",
        "愛情",
        "戀愛",
        "對象",
        "伴侶",
        "男友",
        "女友",
        "男朋友",
        "女朋友",
        "另一半",
        "復合",
        "曖昧",
        "喜歡的人",
        "婚姻",
        "結婚",
      ],
    ],
    ["study", ["考試", "學業", "成績", "升學", "讀書", "學校", "論文", "考上"]],
    [
      "relationships",
      ["朋友", "家人", "家庭", "父母", "爸媽", "人際", "友情", "室友"],
    ],
    ["direction", ["人生", "方向", "選擇", "夢想", "自己"]],
  ]);

export function detectQuestionTopic(question: string): QuestionTopic {
  const match = TOPIC_KEYWORDS.find(([, keywords]) =>
    keywords.some((keyword) => question.includes(keyword)),
  );
  return match ? match[0] : "general";
}
