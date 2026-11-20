import type { Page } from "@playwright/test";

/**
 * Hides the Next.js development badge. E2E runs against `next dev`, where
 * the badge covers the bottom-left corner that a sheet's first button sits
 * in on a phone; production has no badge.
 */
export async function hideDevOverlay(page: Page): Promise<void> {
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });
}
