import { describe, expect, it } from "vitest";
import { detectPositionRole } from "@/domain/reading/positionRole";
import { BUILT_IN_TEMPLATES } from "@/domain/spread/templates";

describe("detectPositionRole", () => {
  it.each([
    ["這件事的過去與起因是什麼？", "past"],
    ["現在的狀態是什麼？", "present"],
    ["接下來可能的走向是什麼？", "future"],
    ["最後的結果會如何？", "future"],
    ["阻礙在哪裡？", "obstacle"],
    ["我可以怎麼做？", "advice"],
    ["我的內心真正想要什麼？", "self"],
    ["對方怎麼看這段關係？", "others"],
    ["今天的提醒？", "unknown"],
  ] as const)("reads %j as %s", (question, role) => {
    expect(detectPositionRole(question)).toBe(role);
  });

  it("prefers the more specific role when several match", () => {
    expect(detectPositionRole("我的阻礙是什麼？")).toBe("obstacle");
    expect(detectPositionRole("對方的過去如何影響現在？")).toBe("past");
  });

  it("does not mistake 其他 for another person", () => {
    expect(detectPositionRole("還有其他選擇嗎？")).toBe("unknown");
  });

  it("recognises every position of the classic three-card template", () => {
    const threeCard = BUILT_IN_TEMPLATES.find(
      (template) => template.id === "three-card",
    );
    expect(
      threeCard?.positions.map((p) => detectPositionRole(p.question)),
    ).toEqual(["past", "present", "future"]);
  });

  it("recognises the built-in five-card and circle wording it can", () => {
    expect(detectPositionRole("藏在底下的根源是什麼？")).toBe("past");
    expect(detectPositionRole("此刻的核心能量是什麼？")).toBe("present");
    expect(detectPositionRole("身邊的人如何影響這件事？")).toBe("others");
  });
});
