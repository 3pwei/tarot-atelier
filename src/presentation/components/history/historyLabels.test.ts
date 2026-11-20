import { describe, expect, it } from "vitest";
import {
  formatRecordedAt,
  formatRecordedAtFull,
} from "@/presentation/components/history/historyLabels";

// Local times, so the test reads the same in every time zone.
const now = new Date(2026, 10, 20, 9, 30);
const at = (...parts: [number, number, number, number, number]) =>
  new Date(...parts).toISOString();

describe("recorded time labels", () => {
  it("says today and yesterday by the calendar day, not 24 hours", () => {
    expect(formatRecordedAt(at(2026, 10, 20, 0, 5), now)).toBe("今天 00:05");
    expect(formatRecordedAt(at(2026, 10, 19, 23, 41), now)).toBe("昨天 23:41");
  });

  it("drops the year within this year and keeps it before", () => {
    expect(formatRecordedAt(at(2026, 10, 18, 21, 5), now)).toBe("11/18 21:05");
    expect(formatRecordedAt(at(2025, 11, 31, 8, 0), now)).toBe(
      "2025/12/31 08:00",
    );
  });

  it("gives the full date on a record's own page", () => {
    expect(formatRecordedAtFull(at(2026, 10, 20, 2, 10))).toBe(
      "2026/11/20 02:10",
    );
  });
});
