import { describe, expect, it } from "vitest";
import { BUILT_IN_TEMPLATES } from "@/domain/spread/templates";
import {
  hasUnsavedLayout,
  revertTarget,
} from "@/presentation/components/spread/editBaseline";
import {
  createInitialState,
  createSpreadReducer,
  type SpreadAction,
  type SpreadUiState,
} from "@/presentation/components/spread/spreadState";

function counter() {
  let next = 0;
  return () => `id-${(next += 1)}`;
}

const reduce = createSpreadReducer(counter());

function play(...actions: SpreadAction[]): SpreadUiState {
  const start = reduce(createInitialState(counter()), {
    type: "hydrate",
    library: BUILT_IN_TEMPLATES,
  });
  return actions.reduce(reduce, start);
}

function firstPosition(state: SpreadUiState) {
  const position = state.spread.positions[0];
  if (!position) throw new Error("expected a position on the table");
  return position;
}

function unsaved(state: SpreadUiState): boolean {
  if (!state.editBaseline) throw new Error("expected an edit in progress");
  return hasUnsavedLayout(
    state.spread,
    revertTarget(state.editBaseline, state.spread, state.library),
  );
}

const moveFirst = (state: SpreadUiState): SpreadAction => ({
  type: "move",
  positionId: firstPosition(state).id,
  point: { x: 0.12, y: 0.34 },
});

describe("editing the layout", () => {
  it("has nothing unsaved before any change", () => {
    expect(unsaved(play({ type: "begin-edit" }))).toBe(false);
  });

  it("has unsaved changes once a position moves", () => {
    const editing = play({ type: "begin-edit" });

    expect(unsaved(reduce(editing, moveFirst(editing)))).toBe(true);
  });

  it("has unsaved changes after positions are added, even detached", () => {
    const added = play(
      { type: "begin-edit" },
      { type: "add", near: { x: 0.5, y: 0.5 } },
    );

    expect(added.spread.templateId).toBeUndefined();
    expect(unsaved(added)).toBe(true);
  });

  it("has nothing unsaved right after saving", () => {
    const editing = play({ type: "begin-edit" });
    const saved = reduce(reduce(editing, moveFirst(editing)), {
      type: "save-template",
      name: "我的三張",
    });

    expect(unsaved(saved)).toBe(false);
  });

  it("keeps changes unsaved when saving is refused", () => {
    const editing = play({ type: "begin-edit" });
    const refused = reduce(reduce(editing, moveFirst(editing)), {
      type: "save-template",
      name: "   ",
    });

    expect(unsaved(refused)).toBe(true);
  });

  it("compares with a newly applied template", () => {
    const editing = play({ type: "begin-edit" });
    const moved = reduce(editing, moveFirst(editing));
    const fiveCard = BUILT_IN_TEMPLATES[1];
    if (!fiveCard) throw new Error("expected a second built-in template");

    const applied = reduce(moved, {
      type: "apply-template",
      templateId: fiveCard.id,
    });

    expect(unsaved(applied)).toBe(false);
  });
});

describe("leaving without saving", () => {
  it("restores the library's template and keeps the main question", () => {
    const editing = play(
      { type: "main-question", text: "主問題" },
      { type: "begin-edit" },
    );
    const original = editing.spread.positions;
    const reverted = reduce(
      reduce(reduce(editing, moveFirst(editing)), {
        type: "add",
        near: { x: 0.5, y: 0.5 },
      }),
      { type: "revert-edit" },
    );

    expect(reverted.editBaseline).toBeUndefined();
    expect(reverted.spread.templateId).toBe(BUILT_IN_TEMPLATES[0]?.id);
    expect(reverted.spread.mainQuestion).toBe("主問題");
    expect(
      reverted.spread.positions.map(({ x, y, rotation, question }) => ({
        x,
        y,
        rotation,
        question,
      })),
    ).toEqual(
      original.map(({ x, y, rotation, question }) => ({
        x,
        y,
        rotation,
        question,
      })),
    );
    expect(reverted.notice?.text).toBe(
      `已還原成牌陣庫裡的「${BUILT_IN_TEMPLATES[0]?.name}」。`,
    );
  });

  it("restores the table as it was when the edit began, without a template", () => {
    const blank = play(
      { type: "blank" },
      { type: "add", near: { x: 0.3, y: 0.3 } },
    );
    const editing = reduce(blank, { type: "begin-edit" });
    const reverted = reduce(reduce(editing, moveFirst(editing)), {
      type: "revert-edit",
    });

    expect(firstPosition(reverted).x).toBe(firstPosition(blank).x);
    expect(reverted.spread.templateId).toBeUndefined();
    expect(reverted.notice?.text).toBe("已還原成開始編輯前的牌陣。");
  });

  it("falls back to the snapshot when the template was deleted meanwhile", () => {
    const editing = play({ type: "begin-edit" });
    const templateId = editing.spread.templateId;
    if (!templateId) throw new Error("expected a template on the table");
    const deleted = reduce(reduce(editing, moveFirst(editing)), {
      type: "delete-template",
      templateId,
    });
    const baseline = deleted.editBaseline;
    if (!baseline) throw new Error("expected an edit in progress");

    expect(revertTarget(baseline, deleted.spread, deleted.library).kind).toBe(
      "snapshot",
    );
  });
});

describe("finishing an edit", () => {
  it("keeps the table and forgets the baseline", () => {
    const editing = play({ type: "begin-edit" });
    const moved = reduce(editing, moveFirst(editing));
    const finished = reduce(moved, { type: "end-edit" });

    expect(finished.editBaseline).toBeUndefined();
    expect(finished.spread).toBe(moved.spread);
  });
});
