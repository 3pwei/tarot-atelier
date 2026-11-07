// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  D1UsageLimiter,
  migrateUsageStore,
  USAGE_MIGRATIONS,
} from "@/infrastructure/reading/usage/d1UsageLimiter";
import { sqliteD1 } from "@/infrastructure/reading/usage/testing/sqliteD1";

const DAY = "2026-11-07";

async function limiterWith(daily: number, perVisitor: number) {
  const db = sqliteD1();
  await migrateUsageStore(db);
  return { db, limiter: new D1UsageLimiter(db, { daily, perVisitor }) };
}

function countOf(db: ReturnType<typeof sqliteD1>, subject: string, day = DAY) {
  const row = db.sqlite
    .prepare("SELECT count FROM reading_usage WHERE day = ? AND subject = ?")
    .get(day, subject) as { count: number } | undefined;
  return row?.count ?? 0;
}

describe("D1UsageLimiter", () => {
  it("grants readings until the visitor's daily limit", async () => {
    const { limiter } = await limiterWith(10, 2);
    expect(await limiter.claim("a", DAY)).toBe("granted");
    expect(await limiter.claim("a", DAY)).toBe("granted");
    expect(await limiter.claim("a", DAY)).toBe("visitor-limit");
    expect(await limiter.claim("b", DAY)).toBe("granted");
  });

  it("does not count a refused visitor against the site", async () => {
    const { db, limiter } = await limiterWith(10, 1);
    await limiter.claim("a", DAY);
    await limiter.claim("a", DAY);
    expect(countOf(db, "site")).toBe(1);
    expect(countOf(db, "a")).toBe(1);
  });

  it("stops every visitor once the site's daily limit is reached", async () => {
    const { db, limiter } = await limiterWith(2, 5);
    expect(await limiter.claim("a", DAY)).toBe("granted");
    expect(await limiter.claim("b", DAY)).toBe("granted");
    expect(await limiter.claim("c", DAY)).toBe("daily-limit");
    expect(countOf(db, "c")).toBe(0);
  });

  it("starts counting again on a new day", async () => {
    const { limiter } = await limiterWith(1, 1);
    await limiter.claim("a", DAY);
    expect(await limiter.claim("a", "2026-11-08")).toBe("granted");
  });

  it("forgets counters older than two days", async () => {
    const { db, limiter } = await limiterWith(10, 10);
    for (const day of ["2026-11-04", "2026-11-05", "2026-11-06", DAY]) {
      await limiter.claim("a", day);
    }
    await limiter.forgetBefore(DAY);
    const days = db.sqlite
      .prepare("SELECT DISTINCT day FROM reading_usage ORDER BY day")
      .all()
      .map((row) => (row as { day: string }).day);
    expect(days).toEqual(["2026-11-05", "2026-11-06", DAY]);
  });
});

describe("migrateUsageStore", () => {
  it("records each schema version once and is safe to run again", async () => {
    const db = sqliteD1();
    await migrateUsageStore(db);
    await migrateUsageStore(db);
    const versions = db.sqlite
      .prepare("SELECT version FROM usage_schema")
      .all()
      .map((row) => (row as { version: number }).version);
    expect(versions).toEqual(USAGE_MIGRATIONS.map((_, i) => i + 1));
  });
});
