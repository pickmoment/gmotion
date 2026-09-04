import { describe, it, expect } from "vitest";
import { ADAPTERS, extractJson } from "./agents";

describe("ADAPTERS", () => {
  const file = "/tmp/gmotion-agent/prompt.md";
  it("stdin 어댑터는 프롬프트를 argv 에 싣지 않고 stdin 으로 받는다", () => {
    expect(ADAPTERS.claude.stdin).toBe(true);
    expect(ADAPTERS.claude.args(file)).toEqual(["-p"]);
    expect(ADAPTERS.codex.stdin).toBe(true);
    expect(ADAPTERS.codex.args(file)).toEqual(["exec", "--skip-git-repo-check", "-"]);
  });
  it("@파일 어댑터는 경로를 메시지로 넘기고 stdin 은 닫는다", () => {
    expect(ADAPTERS.pi.stdin).toBe(false);
    expect(ADAPTERS.pi.args(file)).toEqual(["-p", `@${file}`]);
    expect(ADAPTERS.omp.stdin).toBe(false);
    expect(ADAPTERS.omp.args(file)).toEqual(["-p", `@${file}`]);
  });
  it("모델은 비우면 넘기지 않고, 주면 --model 로 붙는다", () => {
    expect(ADAPTERS.claude.args(file, "  ")).toEqual(["-p"]);
    expect(ADAPTERS.claude.args(file, "haiku")).toEqual(["-p", "--model", "haiku"]);
    expect(ADAPTERS.pi.args(file, "openai/gpt-5.2")).toEqual([
      "-p",
      `@${file}`,
      "--model",
      "openai/gpt-5.2",
    ]);
  });
});

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
