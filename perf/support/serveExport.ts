/**
 * Serves the static export in `out/` the way a static host does, so
 * performance is measured on the production build rather than `next dev`.
 * Usage: node perf/support/serveExport.ts <port>
 */
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const EXPORT_ROOT = path.resolve("out");

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

async function resolveFile(urlPath: string): Promise<string | null> {
  const [pathname = "/"] = urlPath.split("?");
  const relative = decodeURIComponent(pathname);
  const candidate = path.join(EXPORT_ROOT, relative);
  if (!candidate.startsWith(EXPORT_ROOT)) return null;
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

const port = Number(process.argv[2]);
if (!Number.isInteger(port)) {
  throw new Error("Pass the port to listen on, e.g. node serveExport.ts 4310");
}

createServer(async (request, response) => {
  const file = await resolveFile(request.url ?? "/");
  if (!file) {
    response.writeHead(404).end("Not found");
    return;
  }
  response.writeHead(200, {
    "Content-Type":
      CONTENT_TYPES[path.extname(file)] ?? "application/octet-stream",
  });
  createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1");
