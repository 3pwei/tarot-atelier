import { describe, expect, it } from "vitest";
import { createSpread, setPositionName } from "@/domain/spread/spread";
import {
  BUILT_IN_TEMPLATES,
  createBlankSpread,
  createSpreadFromLayout,
  createSpreadFromTemplate,
  deleteTemplate,
  matchesLayout,
  missingBuiltIns,
  parseTemplateLibrary,
  restoreBuiltIns,
  saveTemplate,
  serializeTemplateLibrary,
  TEMPLATE_LIBRARY_VERSION,
  type TemplateLibrary,
} from "@/domain/spread/templates";
import { isSpreadReady } from "@/domain/spread/spread";
import {
  MAX_SAVED_TEMPLATES,
  MAX_SPREAD_POSITIONS,
  type Spread,
} from "@/domain/spread/types";

/** A stored position as written before positions had short names. */
function withoutName(position: object): object {
  return Object.fromEntries(
    Object.entries(position).filter(([key]) => key !== "name"),
  );
}

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
      { name: "", question: "", x: 0, y: 0.4, rotation: 0 },
      { name: "", question: "問題 1", x: 0.1, y: 0.4, rotation: 45 },
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
      "單張指引",
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

  it("offers the single-card spread first among the built-ins after three cards", () => {
    expect(BUILT_IN_TEMPLATES.map((template) => template.name)).toEqual([
      "經典三張",
      "單張指引",
      "五張十字",
      "圓環",
    ]);
    const single = BUILT_IN_TEMPLATES[1]!;
    expect(single.positions).toHaveLength(1);
    // It answers the main question itself, under the usual rule that every
    // position has a question.
    expect(single.positions[0]!.question).toBe("這個問題的答案是什麼？");
  });

  describe("a library saved before the single-card spread (v1)", () => {
    const v1 = (templates: readonly unknown[]) => ({
      schemaVersion: 1,
      templates,
    });
    const [threeCard, single, fiveCard, circle] = BUILT_IN_TEMPLATES;

    it("gets it after the three-card spread, keeping everything else", () => {
      const { library } = save(
        BUILT_IN_TEMPLATES.filter((template) => template !== single),
        "我的",
      );
      expect(
        parseTemplateLibrary(v1(library))?.map((template) => template.name),
      ).toEqual(["經典三張", "單張指引", "五張十字", "圓環", "我的"]);
    });

    it("gets it first when the three-card spread was deleted", () => {
      expect(
        parseTemplateLibrary(v1([fiveCard, circle]))?.map(
          (template) => template.id,
        ),
      ).toEqual(["single-card", "five-card", "circle"]);
    });

    it("does not get it over a template of the same name", () => {
      const mine = { ...circle!, id: "mine", name: "單張指引", builtIn: false };
      expect(parseTemplateLibrary(v1([threeCard, mine]))).toEqual([
        threeCard,
        mine,
      ]);
    });

    it("gives it even to an emptied library, which never had it", () => {
      expect(parseTemplateLibrary(v1([]))).toEqual([single]);
    });
  });

  it("keeps the single-card spread deleted from a current library", () => {
    const current = BUILT_IN_TEMPLATES.filter(
      (template) => template.id !== "single-card",
    );
    expect(
      parseTemplateLibrary(JSON.parse(serializeTemplateLibrary(current))),
    ).toEqual(current);
  });

  it.each([
    ["no version", { templates: [] }],
    [
      "a future version",
      { schemaVersion: TEMPLATE_LIBRARY_VERSION + 1, templates: [] },
    ],
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

describe("comparing a spread with a layout", () => {
  const [threeCard] = BUILT_IN_TEMPLATES;
  if (!threeCard) throw new Error("expected a built-in template");
  const applied = () =>
    createSpreadFromTemplate({ template: threeCard, createId: counter() });

  it("matches the template it was just made from", () => {
    expect(matchesLayout(applied(), threeCard.positions)).toBe(true);
  });

  it("matches a layout saved from the spread", () => {
    const spread = spreadWith(3);
    const { template } = save([], "我的牌陣", spread);

    expect(matchesLayout(spread, template.positions)).toBe(true);
  });

  it.each([
    ["moved", { x: 0.11 }],
    ["turned", { rotation: 45 }],
    ["asked differently", { question: "換個問題" }],
  ])("differs once a position is %s", (_, change) => {
    const spread = applied();
    const [first, ...rest] = spread.positions;
    if (!first) throw new Error("expected a position");
    const edited = { ...spread, positions: [{ ...first, ...change }, ...rest] };

    expect(matchesLayout(edited, threeCard.positions)).toBe(false);
  });

  it("differs when positions are added, removed or reordered", () => {
    const spread = spreadWith(3);
    const layout = spread.positions;

    expect(matchesLayout(spreadWith(2), layout)).toBe(false);
    expect(matchesLayout(spreadWith(4), layout)).toBe(false);
    expect(
      matchesLayout(
        { ...spread, positions: [...spread.positions].reverse() },
        layout,
      ),
    ).toBe(false);
  });

  it("ignores the main question", () => {
    const spread = { ...applied(), mainQuestion: "另一個主問題" };

    expect(matchesLayout(spread, threeCard.positions)).toBe(true);
  });
});

describe("creating a spread from a layout", () => {
  it("lays out fresh positions and keeps the main question", () => {
    const layout = spreadWith(2).positions;
    const spread = createSpreadFromLayout({
      layout,
      templateId: "three-card",
      createId: counter("new"),
      mainQuestion: "主問題",
    });

    expect(matchesLayout(spread, layout)).toBe(true);
    expect(spread.templateId).toBe("three-card");
    expect(spread.mainQuestion).toBe("主問題");
    expect(spread.positions.map((position) => position.id)).not.toContain("p0");
    expect(spread.positions.every((p) => p.drawResult === undefined)).toBe(
      true,
    );
  });

  it("has no template when none is given", () => {
    const spread = createSpreadFromLayout({
      layout: [],
      createId: counter(),
    });

    expect(spread.templateId).toBeUndefined();
  });
});

describe("position names", () => {
  it("names every built-in position", () => {
    expect(
      BUILT_IN_TEMPLATES.map((template) =>
        template.positions.map((position) => position.name),
      ),
    ).toEqual([
      ["過去", "現在", "未來"],
      ["指引"],
      ["現況", "阻礙", "發展", "目標", "根源"],
      ["核心", "追求", "放下", "他人", "未見", "資源", "留意", "走向"],
    ]);
  });

  it("carries a template's names onto the table", () => {
    const spread = createSpreadFromTemplate({
      template: BUILT_IN_TEMPLATES[0]!,
      createId: counter(),
    });
    expect(spread.positions.map((position) => position.name)).toEqual([
      "過去",
      "現在",
      "未來",
    ]);
  });

  it("saves names trimmed, and counts them as part of the layout", () => {
    const spread = spreadWith(2);
    const renamed = setPositionName(spread, "p1", " 近況 ");
    if (!renamed.ok) throw new Error("rename failed");
    const { template } = save(BUILT_IN_TEMPLATES, "有名字", renamed.spread);
    expect(template.positions.map((position) => position.name)).toEqual([
      "",
      "近況",
    ]);
    expect(matchesLayout(renamed.spread, template.positions)).toBe(true);
    expect(matchesLayout(spread, template.positions)).toBe(false);
  });
});

describe("a library saved before position names (v2)", () => {
  const unnamed = (library: TemplateLibrary) =>
    library.map((template) => ({
      ...template,
      positions: template.positions.map(withoutName),
    }));
  const v2 = (templates: readonly unknown[]) => ({
    schemaVersion: 2,
    templates,
  });

  it("gives the built-ins their names and leaves the reader's own unnamed", () => {
    const { library } = save(BUILT_IN_TEMPLATES, "我的");
    const upgraded = parseTemplateLibrary(v2(unnamed(library)));
    expect(upgraded).toEqual(library);
    expect(upgraded?.at(-1)?.positions.map((p) => p.name)).toEqual(["", ""]);
  });

  it("leaves a built-in position unnamed once its question was changed", () => {
    const [threeCard] = unnamed(BUILT_IN_TEMPLATES);
    const edited = {
      ...threeCard!,
      positions: threeCard!.positions.map((position, order) =>
        order === 1 ? { ...position, question: "我現在的心情？" } : position,
      ),
    };
    expect(
      parseTemplateLibrary(v2([edited]))?.[0]?.positions.map((p) => p.name),
    ).toEqual(["過去", "", "未來"]);
  });

  it("upgrades a v1 library through both steps", () => {
    const withoutSingle = unnamed(
      BUILT_IN_TEMPLATES.filter((template) => template.id !== "single-card"),
    );
    expect(
      parseTemplateLibrary({ schemaVersion: 1, templates: withoutSingle }),
    ).toEqual(BUILT_IN_TEMPLATES);
  });

  it("rejects a current library whose names are missing or too long", () => {
    const [threeCard] = BUILT_IN_TEMPLATES;
    const named = (name: string) => ({
      schemaVersion: TEMPLATE_LIBRARY_VERSION,
      templates: [
        {
          ...threeCard!,
          positions: [{ ...threeCard!.positions[0]!, name }],
        },
      ],
    });
    expect(
      parseTemplateLibrary({
        schemaVersion: TEMPLATE_LIBRARY_VERSION,
        templates: unnamed([threeCard!]),
      }),
    ).toBeUndefined();
    expect(parseTemplateLibrary(named("五個字太長"))).toBeUndefined();
    expect(parseTemplateLibrary(named(" 過去"))).toBeUndefined();
    expect(parseTemplateLibrary(named("過去"))).toBeDefined();
  });
});
