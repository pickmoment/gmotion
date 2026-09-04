import { describe, it, expect } from "vitest";
import { issueScene, issuesByScene } from "./issues";
import type { ValidateResult } from "../engine/types";

describe("issueScene", () => {
  it("`씬 N:` 접두를 0 기반 인덱스로", () => {
    expect(issueScene("씬 3: hold 는 0 이상의 초(숫자)여야 한다.")).toBe(2);
  });
  it("id·pattern 괄호가 붙어도 읽는다", () => {
    expect(issueScene('씬 12 (intro-2): textFx "x" 는 없다.')).toBe(11);
    expect(issueScene("씬 1 (dataCounter): 첫 요소가 7s 뒤에 나온다")).toBe(0);
  });
  it("문서 전체 지적은 null", () => {
    expect(issueScene("전체 226초다 — 2분을 넘으면 …")).toBeNull();
    expect(issueScene("scenes 가 비어 있다.")).toBeNull();
  });
  it("본문 한가운데의 '씬 N' 은 접두가 아니다", () => {
    expect(issueScene("트랜지션이 전부 fade 다 — 씬 2: 를 바꾼다")).toBeNull();
  });
});

describe("issuesByScene", () => {
  it("씬별로 오류·경고를 따로 센다", () => {
    const r = {
      ok: false,
      errors: ["씬 1: a", "씬 3 (x): b", "theme 없음"],
      warnings: ["씬 1: c", "전체 200초"],
    } as unknown as ValidateResult;
    const by = issuesByScene(r);
    expect(by[0]).toEqual({ errors: 1, warnings: 1 });
    expect(by[1]).toBeUndefined();
    expect(by[2]).toEqual({ errors: 1, warnings: 0 });
  });
});
