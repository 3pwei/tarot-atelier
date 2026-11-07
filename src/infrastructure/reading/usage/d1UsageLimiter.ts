import type {
  UsageClaim,
  UsageLimiter,
} from "@/application/ports/usageLimiter";

/** The part of Cloudflare's D1 binding this adapter uses. */
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface D1PreparedStatement {
  bind(...values: readonly (string | number)[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export interface UsageLimits {
  /** AI readings the whole site may serve per day. */
  readonly daily: number;
  /** AI readings one visitor may get per day. */
  readonly perVisitor: number;
}

/** The counter row for the whole site; visitor keys are hex, never this. */
const SITE_SUBJECT = "site";

/** How many past days of counters are kept; older rows are deleted. */
const KEPT_DAYS = 2;

/**
 * Versioned schema of the usage store. Add a migration to change it; never
 * edit one that has shipped.
 */
export const USAGE_MIGRATIONS: readonly (readonly string[])[] = Object.freeze([
  [
    `CREATE TABLE reading_usage (
      day TEXT NOT NULL,
      subject TEXT NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (day, subject)
    )`,
  ],
]);

const CLAIM = `INSERT INTO reading_usage (day, subject, count) VALUES (?1, ?2, 1)
  ON CONFLICT (day, subject) DO UPDATE SET count = count + 1 WHERE count < ?3
  RETURNING count`;

const RELEASE = `UPDATE reading_usage SET count = count - 1
  WHERE day = ?1 AND subject = ?2 AND count > 0`;

function daysBefore(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/**
 * Brings the store up to the latest schema. Safe to run on every cold start:
 * applied versions are recorded and skipped.
 */
export async function migrateUsageStore(db: D1Database): Promise<void> {
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS usage_schema (version INTEGER NOT NULL PRIMARY KEY)",
    )
    .run();
  const applied = await db
    .prepare("SELECT MAX(version) AS version FROM usage_schema")
    .first<{ version: number | null }>();
  const current = applied?.version ?? 0;
  for (const [offset, statements] of USAGE_MIGRATIONS.entries()) {
    const version = offset + 1;
    if (version <= current) continue;
    for (const statement of statements) await db.prepare(statement).run();
    await db
      .prepare("INSERT INTO usage_schema (version) VALUES (?1)")
      .bind(version)
      .run();
  }
}

/**
 * Daily AI reading limits kept in Cloudflare D1. Each claim is one atomic
 * upsert that only counts while under the limit, so concurrent requests
 * cannot push a counter past it.
 */
export class D1UsageLimiter implements UsageLimiter {
  readonly #db: D1Database;
  readonly #limits: UsageLimits;

  constructor(db: D1Database, limits: UsageLimits) {
    this.#db = db;
    this.#limits = limits;
  }

  async claim(visitor: string, day: string): Promise<UsageClaim> {
    if (!(await this.#count(day, SITE_SUBJECT, this.#limits.daily))) {
      return "daily-limit";
    }
    if (!(await this.#count(day, visitor, this.#limits.perVisitor))) {
      // The site's count was taken for a reading that will not happen.
      await this.#db.prepare(RELEASE).bind(day, SITE_SUBJECT).run();
      return "visitor-limit";
    }
    return "granted";
  }

  /** Deletes counters older than the days kept; call once in a while. */
  async forgetBefore(day: string): Promise<void> {
    await this.#db
      .prepare("DELETE FROM reading_usage WHERE day < ?1")
      .bind(daysBefore(day, KEPT_DAYS))
      .run();
  }

  async #count(day: string, subject: string, limit: number): Promise<boolean> {
    const row = await this.#db
      .prepare(CLAIM)
      .bind(day, subject, limit)
      .first<{ count: number }>();
    return row !== null;
  }
}
