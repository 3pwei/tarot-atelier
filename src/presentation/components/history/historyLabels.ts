import { MAX_HISTORY_RECORDS } from "@/domain/history/readingHistory";

export const HISTORY_COPY = {
  open: "歷史紀錄",
  title: "歷史紀錄",
  limit: `最近 ${MAX_HISTORY_RECORDS} 筆`,
  close: "關閉",
  back: "返回",
  empty: "還沒有紀錄。把一次牌陣的牌全部翻開，就會自動存在這裡。",
  deviceOnly: `紀錄只存在這台裝置；超過 ${MAX_HISTORY_RECORDS} 筆會自動蓋掉最舊一筆。`,
  noMainQuestion: "（未填主問題）",
  customSpread: "自訂牌陣",
  withReading: "已解讀",
  withoutReading: "未解讀",
  noReading: "這次沒有產生解讀。",
  missingCard: "這張牌已不在牌組裡",
  deleteOne: "刪除這筆",
  deleteAll: "全部清除",
  confirmDeleteOne: "確定刪除這筆紀錄？刪除後無法復原。",
  confirmDeleteAll: "確定清除全部歷史紀錄？刪除後無法復原。",
  cancel: "取消",
  confirmDelete: "刪除",
  jumper: "跳牌",
} as const;

const pad = (value: number) => String(value).padStart(2, "0");

function dayStart(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A short local time for the list: 今天 / 昨天 with the time, the month and
 * day within this year, and the full date before that.
 */
export function formatRecordedAt(iso: string, now: Date): string {
  const at = new Date(iso);
  const time = `${pad(at.getHours())}:${pad(at.getMinutes())}`;
  const daysAgo = Math.round((dayStart(now) - dayStart(at)) / DAY_MS);
  if (daysAgo === 0) return `今天 ${time}`;
  if (daysAgo === 1) return `昨天 ${time}`;
  const monthDay = `${at.getMonth() + 1}/${at.getDate()}`;
  return at.getFullYear() === now.getFullYear()
    ? `${monthDay} ${time}`
    : `${at.getFullYear()}/${monthDay} ${time}`;
}

/** The full local date and time, for a record's own page. */
export function formatRecordedAtFull(iso: string): string {
  const at = new Date(iso);
  return `${at.getFullYear()}/${pad(at.getMonth() + 1)}/${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}`;
}
