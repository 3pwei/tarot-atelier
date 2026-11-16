import type { Page, TestInfo } from "@playwright/test";
import { summarizeFrames, type FrameSummary } from "./frameStats";

/** How much slower than the test machine the CPU runs; 4 ≈ a budget phone. */
export const CPU_SLOWDOWN = Number(process.env.PERF_CPU_SLOWDOWN ?? "4");

/**
 * Cores the page sees. Budget phones commonly report eight slow cores, and
 * test machines often have two, so the reported count is set explicitly.
 */
const REPORTED_CORES = Number(process.env.PERF_REPORTED_CORES ?? "8");

interface ProbeWindow {
  __frameProbe: {
    intervals: number[];
    longTasks: number[];
    reset(): void;
  };
}

/**
 * Records the interval between painted frames and every long task, from the
 * first script on the page. Runs inside the browser.
 */
function installFrameProbe() {
  const probe = {
    intervals: [] as number[],
    longTasks: [] as number[],
    last: 0,
    reset() {
      probe.intervals = [];
      probe.longTasks = [];
      probe.last = 0;
    },
  };
  const tick = (now: number) => {
    if (probe.last > 0) probe.intervals.push(now - probe.last);
    probe.last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) probe.longTasks.push(entry.duration);
  }).observe({ type: "longtask", buffered: true });
  (window as unknown as ProbeWindow).__frameProbe = probe;
}

export async function preparePage(page: Page) {
  await page.addInitScript(installFrameProbe);
  await page.addInitScript((cores) => {
    Object.defineProperty(navigator, "hardwareConcurrency", {
      get: () => cores,
    });
  }, REPORTED_CORES);
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setCPUThrottlingRate", { rate: CPU_SLOWDOWN });
}

/** Runs `action` and reports how smoothly the page rendered meanwhile. */
export async function measure(
  page: Page,
  testInfo: TestInfo,
  scenario: string,
  action: () => Promise<void>,
): Promise<FrameSummary> {
  await page.evaluate(() =>
    (window as unknown as ProbeWindow).__frameProbe.reset(),
  );
  await action();
  const { intervals, longTasks } = await page.evaluate(() => {
    const probe = (window as unknown as ProbeWindow).__frameProbe;
    return { intervals: probe.intervals, longTasks: probe.longTasks };
  });
  const summary = summarizeFrames(intervals, longTasks);
  report(testInfo, { scenario, ...summary });
  return summary;
}

/**
 * Starts counting the JavaScript the page downloads; call before navigating.
 * The returned function reports the uncompressed kilobytes seen so far,
 * lazily loaded chunks included.
 */
export function trackScriptKilobytes(page: Page, testInfo: TestInfo) {
  const sizes: Promise<number>[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() !== "script") return;
    sizes.push(
      response
        .body()
        .then((body) => body.length)
        .catch(() => 0),
    );
  });
  return async (): Promise<number> => {
    const bytes = (await Promise.all(sizes)).reduce((sum, n) => sum + n, 0);
    const kilobytes = Math.round(bytes / 1024);
    report(testInfo, { scenario: "home-javascript-kb", kilobytes });
    return kilobytes;
  };
}

function report(testInfo: TestInfo, result: Record<string, number | string>) {
  const line = {
    project: testInfo.project.name,
    cpuSlowdown: CPU_SLOWDOWN,
    ...result,
  };
  console.log(`PERF ${JSON.stringify(line)}`);
}
