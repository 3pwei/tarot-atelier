import { describe, expect, it } from "vitest";
import { createSpread } from "@/domain/spread/spread";
import {
  BUILT_IN_TEMPLATES,
  createBlankSpread,
  createSpreadFromTemplate,
  deleteTemplate,
  missingBuiltIns,
  parseTemplateLibrary,
  restoreBuiltIns,
  saveTemplate,
  serializeTemplateLibrary,
  type TemplateLibrary,
} from "@/domain/spread/templates";
import { isSpreadReady } from "@/domain/spread/spread";
import {
  MAX_SAVED_TEMPLATES,
  MAX_SPREAD_POSITIONS,
  type Spread,
} from "@/domain/spread/types";

function counter(prefix = "id") {
  let next = 0;
  return () => `${prefix}-${(next += 1)}`;
}

function spreadWith(count: number): Spread {
  return createSpread({
    id: "s",
    mainQuestion: "主問題不會被存進範例",
    positions: Array.from({ length: count }, (_, order) => ({
      id: `p${order}`,
      question: order === 0 ? "" : `問題 ${order}`,
      x: order / 10,
      y: 0.4,
      rotation: order * 45,
    })),
  });
}

function save(library: TemplateLibrary, name: string, spread = spreadWith(2)) {
  const result = saveTemplate(library, {
    spread,
    name,
    createId: counter("t"),
  });
  if (!result.ok) throw new Error(result.code);
  return result;
}

describe("built-in templates", () => {
  it.each([
    ["three-card", 3],
    ["five-card", 5],
    ["circle", 8],
  ])("%s starts a ready spread with %i positions", (id, count) => {
    const template = BUILT_IN_TEMPLATES.find((t) => t.id === id);
    if (!template) throw new Error(id);
    const spread = createSpreadFromTemplate({ template, createId: counter() });

    expect(spread.templateId).toBe(id);
    expect(spread.positions).toHaveLength(count);
    expect(isSpreadReady(spread)).toBe(true);
    for (const position of template.positions) {
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.x).toBeLessThanOrEqual(1);
      expect(position.y).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeLessThanOrEqual(1);
    }
  });

  it("starts a blank spread with no template", () => {
    const spread = createBlankSpread({ createId: counter() });
    expect(spread.positions).toHaveLength(0);
    expect(spread.templateId).toBeUndefined();
  });
});

describe("saving templates", () => {
  it("stores layout, rotation and questions under a trimmed name", () => {
    const { library, template, replaced } = save(
      BUILT_IN_TEMPLATES,
      "  我的 \n 每週回顧  ",
    );

    expect(replaced).toBe(false);
    expect(template.name).toBe("我的 每週回顧");
    expect(template.builtIn).toBe(false);
    expect(template.positions).toEqual([
      { question: "", x: 0, y: 0.4, rotation: 0 },
      { question: "問題 1", x: 0.1, y: 0.4, rotation: 45 },
    ]);
    expect(library).toHaveLength(BUILT_IN_TEMPLATES.length + 1);

    const applied = createSpreadFromTemplate({
      template,
      createId: counter("x"),
    });
    expect(applied.mainQuestion).toBe("");
    expect(applied.positions.map((p) => p.rotation)).toEqual([0, 45]);
  });

  it("updates a template saved under the same name", () => {
    const first = save(BUILT_IN_TEMPLATES, "回顧");
    const second = save(first.library, "回顧", spreadWith(4));

    expect(second.replaced).toBe(true);
    expect(second.template.id).toBe(first.template.id);
    expect(second.library).toHaveLength(first.library.length);
    expect(second.template.positions).toHaveLength(4);
  });

  it("rejects empty or long names, empty tables and a full library", () => {
    const attempt = (library: TemplateLibrary, name: string, spread: Spread) =>
      saveTemplate(library, { spread, name, createId: counter() });

    expect(attempt([], "   ", spreadWith(1))).toEqual({
      ok: false,
      code: "name-required",
    });
    expect(attempt([], "名".repeat(31), spreadWith(1))).toEqual({
      ok: false,
      code: "name-too-long",
    });
    expect(attempt([], "空", spreadWith(0))).toEqual({
      ok: false,
      code: "no-positions",
    });

    let library: TemplateLibrary = [];
    for (let n = 0; n < MAX_SAVED_TEMPLATES; n += 1) {
      library = save(library, `牌陣 ${n}`).library;
    }
    expect(attempt(library, "再一個", spreadWith(1))).toEqual({
      ok: false,
      code: "library-full",
    });
    // Replacing an existing name still works when full.
    expect(attempt(library, "牌陣 3", spreadWith(1)).ok).toBe(true);
  });
});

describe("deleting and restoring", () => {
  it("deletes saved and built-in templates alike", () => {
    const { library } = save(BUILT_IN_TEMPLATES, "我的");
    const withoutBuiltIn = deleteTemplate(library, "three-card");
    if (!withoutBuiltIn.ok) throw new Error("delete failed");
    const empty = [...withoutBuiltIn.library].reduce<TemplateLibrary>(
      (current, template) => {
        const removal = deleteTemplate(current, template.id);
        return removal.ok ? removal.library : current;
      },
      withoutBuiltIn.library,
    );

    expect(withoutBuiltIn.library.map((t) => t.id)).not.toContain("three-card");
    expect(empty).toEqual([]);
    expect(deleteTemplate(empty, "nope")).toEqual({
      ok: false,
      code: "unknown-template",
    });
  });

  it("restores missing built-ins first and keeps saved ones", () => {
    const { library } = save(BUILT_IN_TEMPLATES, "我的");
    const removal = deleteTemplate(library, "five-card");
    if (!removal.ok) throw new Error("delete failed");
    expect(missingBuiltIns(removal.library).map((t) => t.id)).toEqual([
      "five-card",
    ]);

    const restored = restoreBuiltIns(removal.library);
    expect(restored.map((t) => t.name)).toEqual([
      "經典三張",
      "五張十字",
      "圓環",
      "我的",
    ]);
    expect(missingBuiltIns(restored)).toEqual([]);
  });
});

describe("template library storage", () => {
  it("round-trips a library, including an empty one", () => {
    const { library } = save(BUILT_IN_TEMPLATES, "我的");
    expect(
      parseTemplateLibrary(JSON.parse(serializeTemplateLibrary(library))),
    ).toEqual(library);
    expect(
      parseTemplateLibrary(JSON.parse(serializeTemplateLibrary([]))),
    ).toEqual([]);
  });

  it.each([
    ["no version", { templates: [] }],
    ["a future version", { schemaVersion: 2, templates: [] }],
    [
      "a bad name",
      { schemaVersion: 1, templates: [{ ...BUILT_IN_TEMPLATES[0], name: "" }] },
    ],
    [
      "too many positions",
      {
        schemaVersion: 1,
        templates: [
          {
            ...BUILT_IN_TEMPLATES[0],
            positions: Array.from({ length: MAX_SPREAD_POSITIONS + 1 }, () => ({
              question: "",
              x: 0,
              y: 0,
              rotation: 0,
            })),
          },
        ],
      },
    ],
    [
      "duplicate names",
      {
        schemaVersion: 1,
        templates: [
          BUILT_IN_TEMPLATES[0],
          { ...BUILT_IN_TEMPLATES[1], name: "經典三張" },
        ],
      },
    ],
    [
      "coordinates off the table",
      {
        schemaVersion: 1,
        templates: [
          {
            ...BUILT_IN_TEMPLATES[0],
            positions: [{ question: "", x: 3, y: 0, rotation: 0 }],
          },
        ],
      },
    ],
  ])("rejects %s", (_, raw) => {
    expect(parseTemplateLibrary(raw)).toBeUndefined();
  });
});
