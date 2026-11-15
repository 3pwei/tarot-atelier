/**
 * Serves a static export the way a static host does: a path maps to the
 * file, its `index.html`, or the same name with `.html`. Used to measure and
 * capture the production build locally, never in production.
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import path from "node:path";

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
};

async function resolveFile(
  root: string,
  urlPath: string,
): Promise<string | null> {
  const [pathname = "/"] = urlPath.split("?");
  const candidate = path.join(root, decodeURIComponent(pathname));
  if (!candidate.startsWith(root)) return null;
  for (const option of [
    candidate,
    path.join(candidate, "index.html"),
    `${candidate}.html`,
  ]) {
    const info = await stat(option).catch(() => null);
    if (info?.isFile()) return option;
  }
  return null;
}

/** Starts serving `exportDir` on 127.0.0.1; resolves once it listens. */
export function startExportServer(
  exportDir: string,
  port: number,
): Promise<Server> {
  const root = path.resolve(exportDir);
  const server = createServer(async (request, response) => {
    const file = await resolveFile(root, request.url ?? "/");
    if (!file) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type":
        CONTENT_TYPES[path.extname(file)] ?? "application/octet-stream",
    });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
