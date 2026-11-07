import { registerBuiltInDecks } from "@/application/use-cases/createDeckLibrary";
import { InMemoryDeckRegistry } from "@/infrastructure/decks/inMemoryDeckRegistry";
import { handleReadingsRequest } from "@/server/readingsEndpoint";

/**
 * Cloudflare Pages Function entry. The site scripts bundle this file and
 * place it at functions/<slug>/api/v1/readings.js, where Pages serves it.
 */

const registry = registerBuiltInDecks(new InMemoryDeckRegistry());

export function onRequestPost(context: {
  readonly request: Request;
  readonly env: unknown;
}): Promise<Response> {
  return handleReadingsRequest(context.request, context.env, {
    registry,
    now: () => new Date(),
    clock: () => performance.now(),
    log: (event) => console.log(JSON.stringify(event)),
  });
}
