// @vitest-environment node
import { describe, expect, it } from "vitest";
import { basePathOf, defineSite, site } from "./siteConfig.ts";

describe("site config", () => {
  it("publishes this app under /tarot", () => {
    expect(site.slug).toBe("tarot");
    expect(basePathOf(site)).toBe("/tarot");
  });

  it.each(["Tarot", "tarot/app", "", "tarot app"])(
    "rejects the slug %j, which the games site would refuse",
    (slug) => {
      expect(() =>
        defineSite({ slug, exportDir: "out", previewDir: "preview" }),
      ).toThrow(/lowercase letters, digits and hyphens/u);
    },
  );

  it("is immutable", () => {
    expect(Object.isFrozen(site)).toBe(true);
  });
});
