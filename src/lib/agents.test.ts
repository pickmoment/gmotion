import { describe, it, expect } from "vitest";
import { extractJson } from "./agents";

describe("extractJson", () => {
  it("코드펜스 안의 JSON 을 꺼낸다", () => {
    const text = '설명\n```json\n{"scenes":[{"id":"a"}]}\n```\n끝';
    expect(extractJson(text)?.value).toEqual({ scenes: [{ id: "a" }] });
  });
  it("펜스가 없어도 중괄호 균형으로 찾는다", () => {
    const text = '앞 텍스트 {"scenes":[]} 뒤 텍스트';
    expect(extractJson(text)?.value).toEqual({ scenes: [] });
  });
  it("scenes 배열이 없는 객체는 후보에서 제외한다", () => {
    const text = '{"foo":"bar"} 그리고 {"scenes":[{"id":"x"}]}';
    expect(extractJson(text)?.value).toEqual({ scenes: [{ id: "x" }] });
  });
  it("JSON 이 전혀 없으면 null", () => {
    expect(extractJson("스펙을 만들 수 없습니다")).toBeNull();
  });
  it("문자열 안의 중괄호는 깊이 계산에서 무시한다", () => {
    const text = '{"scenes":[{"say":"이건 { 괄호 } 다"}]}';
    expect(extractJson(text)?.value).toEqual({ scenes: [{ say: "이건 { 괄호 } 다" }] });
  });
});
