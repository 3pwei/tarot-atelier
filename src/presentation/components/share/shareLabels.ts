import type {
  ImageShareOutcome,
  TextCopyOutcome,
} from "@/application/ports/sharer";

export const SHARE_COPY = {
  brand: "Tarot Atelier",
  imageBrand: "TAROT ATELIER",
  open: "分享",
  title: "分享這次的牌",
  hideQuestions: "隱藏我寫的問題",
  shareImage: "分享圖卡",
  copyText: "複製文字",
  close: "關閉",
  back: "返回",
  preparing: "正在產生圖卡…",
  previewFailed: "圖卡產生失敗，仍可複製文字分享。",
  previewAlt: "要分享的圖卡預覽",
  fallbackHint: "不支援系統分享的瀏覽器會改成「下載圖片」。",
  mainQuestion: "主問題：",
  disclaimer: "僅供娛樂與自我反思",
} as const;

export const IMAGE_OUTCOME_MESSAGES: Readonly<
  Record<ImageShareOutcome, string | undefined>
> = {
  shared: "已送出圖卡。",
  cancelled: undefined,
  downloaded: "已下載圖卡。",
  failed: "無法分享或下載圖卡，請改用「複製文字」。",
};

export const TEXT_OUTCOME_MESSAGES: Readonly<Record<TextCopyOutcome, string>> =
  {
    copied: "已複製文字。",
    failed: "這個瀏覽器無法複製文字。",
  };
