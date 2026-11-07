import { DatabaseSync } from "node:sqlite";
import type {
  D1Database,
  D1PreparedStatement,
} from "@/infrastructure/reading/usage/d1UsageLimiter";

/**
 * A D1 stand-in over Node's built-in SQLite, the engine D1 runs on, so the
 * limiter's SQL is tested for real without a Cloudflare account.
 */
export function sqliteD1(): D1Database & { readonly sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(":memory:");
  const statement = (
    query: string,
    values: readonly (string | number)[],
  ): D1PreparedStatement => ({
    bind: (...next) => statement(query, next),
    first: async <T>() =>
      (sqlite.prepare(query).get(...values) as T | undefined) ?? null,
    run: async () => sqlite.prepare(query).run(...values),
  });
  return { sqlite, prepare: (query) => statement(query, []) };
}
