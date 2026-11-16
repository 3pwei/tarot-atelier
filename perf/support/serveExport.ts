/**
 * Serves `out/` for the performance run, so it measures the production build
 * rather than `next dev`. Usage: node perf/support/serveExport.ts <port>
 */
import { startExportServer } from "../../scripts/site/exportServer.ts";
import { site } from "../../scripts/site/siteConfig.ts";

const port = Number(process.argv[2]);
if (!Number.isInteger(port)) {
  throw new Error("Pass the port to listen on, e.g. node serveExport.ts 4310");
}

await startExportServer(site.exportDir, port);
