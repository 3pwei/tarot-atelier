import {
  MAX_READING_REQUEST_BYTES,
  READINGS_STATUS,
} from "@/application/reading/readingsApi";
import {
  serveReading,
  usageDayOf,
  type ServeReadingOutcome,
} from "@/application/use-cases/serveReading";
import type { DeckRegistry } from "@/domain/deck/deckRegistry";
import { AiReadingProvider } from "@/infrastructure/reading/ai/aiReadingProvider";
import {
  WorkersAiTextGenerator,
  type UsageLog,
} from "@/infrastructure/reading/ai/workersAiTextGenerator";
import { BUNDLED_READING_SOURCES } from "@/infrastructure/reading/prewrittenReadingProvider";
import {
  D1UsageLimiter,
  migrateUsageStore,
  type D1Database,
} from "@/infrastructure/reading/usage/d1UsageLimiter";
import {
  readingEndpointConfigOf,
  type ReadingEndpointConfig,
} from "@/server/readingEndpointConfig";

/** A structured log line. It never carries questions or reading text. */
export type EndpointLog = (event: Readonly<Record<string, unknown>>) => void;

export interface ReadingsEndpointDeps {
  readonly registry: DeckRegistry;
  readonly now: () => Date;
  readonly log: EndpointLog;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/** Browsers send Origin on cross-site posts; only this site may spend quota. */
function isForeignOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin !== new URL(request.url).origin;
}

async function readBody(request: Request): Promise<string | undefined> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_READING_REQUEST_BYTES) return undefined;
  const text = await request.text();
  return new TextEncoder().encode(text).length > MAX_READING_REQUEST_BYTES
    ? undefined
    : text;
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

/**
 * One anonymous key per visitor per day: a salted hash of the address, so
 * the address itself is never stored and keys cannot be linked across days.
 */
async function visitorKeyOf(
  request: Request,
  salt: string,
  day: string,
): Promise<string> {
  const address = request.headers.get("cf-connecting-ip") ?? "unknown";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${salt}|${day}|${address}`),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** Migrates each usage store once per running instance. */
const migrations = new WeakMap<D1Database, Promise<void>>();

function migrateOnce(
  db: D1Database,
  limiter: D1UsageLimiter,
  day: string,
): Promise<void> {
  let migration = migrations.get(db);
  if (!migration) {
    migration = migrateUsageStore(db).then(() => limiter.forgetBefore(day));
    migrations.set(db, migration);
    migration.catch(() => migrations.delete(db));
  }
  return migration;
}

function responseFor(outcome: ServeReadingOutcome): Response {
  if (outcome.ok) return json(READINGS_STATUS.ok, { result: outcome.result });
  const status = READINGS_STATUS[outcome.failure];
  return outcome.failure === "invalid-request"
    ? json(status, { error: outcome.failure })
    : json(status, { reason: outcome.failure });
}

async function serve(
  request: Request,
  body: unknown,
  config: ReadingEndpointConfig,
  deps: ReadingsEndpointDeps,
): Promise<ServeReadingOutcome> {
  const day = usageDayOf(deps.now());
  const limiter = new D1UsageLimiter(config.usageDb, {
    daily: config.dailyReadings,
    perVisitor: config.visitorDailyReadings,
  });
  await migrateOnce(config.usageDb, limiter, day);

  const logUsage: UsageLog = (usage) =>
    deps.log({ event: "reading.ai-usage", ...usage });
  const provider = new AiReadingProvider(
    deps.registry,
    new WorkersAiTextGenerator(
      config.ai,
      {
        model: config.model,
        maxOutputTokens: config.maxOutputTokens,
        timeoutMs: config.aiTimeoutMs,
      },
      logUsage,
    ),
    BUNDLED_READING_SOURCES,
  );
  return serveReading(
    body,
    { key: await visitorKeyOf(request, config.visitorSalt, day), day },
    { registry: deps.registry, limiter, provider },
  );
}

/**
 * POST /<slug>/api/v1/readings: one AI reading for a `ReadingRequest`.
 * Answers 429 or 503 with a reason when the browser should fall back to
 * pre-written content instead.
 */
export async function handleReadingsRequest(
  request: Request,
  env: unknown,
  deps: ReadingsEndpointDeps,
): Promise<Response> {
  if (isForeignOrigin(request)) {
    return json(READINGS_STATUS["forbidden-origin"], {
      error: "forbidden-origin",
    });
  }
  const text = await readBody(request);
  if (text === undefined) {
    return json(READINGS_STATUS["too-large"], { error: "too-large" });
  }
  const body = parseJson(text);
  if (!body.ok) {
    return json(READINGS_STATUS["invalid-request"], {
      error: "invalid-request",
    });
  }

  const config = readingEndpointConfigOf(env);
  if (!config.ok) {
    deps.log({ event: "reading.misconfigured", problems: config.problems });
    return json(READINGS_STATUS.unavailable, { reason: "unavailable" });
  }

  try {
    const outcome = await serve(request, body.value, config.config, deps);
    deps.log({
      event: "reading.served",
      outcome: outcome.ok ? "ok" : outcome.failure,
    });
    return responseFor(outcome);
  } catch (error) {
    deps.log({
      event: "reading.failed",
      error: error instanceof Error ? error.name : "unknown",
    });
    return json(READINGS_STATUS.unavailable, { reason: "unavailable" });
  }
}
