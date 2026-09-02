import { describe, it, expect } from "vitest";
import { groupCues, draftFromCues } from "./specDraft";
import type { Cue } from "../engine/types";

const cue = (start: number, end: number, text: string): Cue => ({ start, end, text });

describe("groupCues", () => {
  it("빈 배열은 빈 그룹", () => {
    expect(groupCues([])).toEqual([]);
  });
  it("짧은 자막 전체를 한 그룹으로 묶는다", () => {
    const cues = [cue(0, 2, "안녕하세요."), cue(2, 4, "반갑습니다.")];
    const groups = groupCues(cues);
    expect(groups.length).toBe(1);
    expect(groups[0].length).toBe(2);
  });
});

describe("draftFromCues", () => {
  it("자막에 없는 말을 만들지 않는다 — say 는 항상 원문 부분집합", () => {
    const cues = [cue(0, 3, "이것은 테스트 자막입니다.")];
    const spec = draftFromCues(cues, { aspect: "16:9", theme: "midnight", energy: "E2" });
    for (const scene of spec.scenes) {
      const say = "say" in scene && typeof scene.say === "string" ? scene.say : undefined;
      if (say) expect("이것은 테스트 자막입니다.").toContain(say.replace(/…$/, ""));
    }
  });
  it("씬이 최소 1개는 나온다", () => {
    const cues = [cue(0, 5, "한 줄짜리 자막.")];
    const spec = draftFromCues(cues, { aspect: "16:9", theme: "midnight", energy: "E2" });
    expect(spec.scenes.length).toBeGreaterThan(0);
  });
});
