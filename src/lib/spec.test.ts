import { describe, it, expect } from "vitest";
import {
  setField,
  setNested,
  sceneLabel,
  insertScene,
  removeScene,
  moveScene,
  replaceScene,
  cloneSpec,
  EMPTY_SPEC,
} from "./spec";

describe("setField", () => {
  it("빈 문자열이면 키를 지운다", () => {
    expect(setField({ a: "x" }, "a", "")).toEqual({});
  });
  it("값이 있으면 채운다", () => {
    expect(setField({}, "a", "x")).toEqual({ a: "x" });
  });
  it("빈 배열도 지운다", () => {
    expect(setField({ a: [1] }, "a", [])).toEqual({});
  });
});

describe("setNested", () => {
  it("중첩 그룹이 비면 그룹째 지운다", () => {
    expect(setNested({ detail: { x: "y" } }, "detail", "x", "")).toEqual({});
  });
  it("중첩 그룹에 값을 채운다", () => {
    expect(setNested({}, "detail", "x", "y")).toEqual({ detail: { x: "y" } });
  });
});

describe("sceneLabel", () => {
  it("title 을 우선한다", () => {
    expect(sceneLabel({ title: "제목", text: "본문" } as never)).toBe("제목");
  });
  it("아무 필드도 없으면 기본 라벨", () => {
    expect(sceneLabel({} as never)).toBe("(제목 없음)");
  });
});

describe("씬 배열 조작", () => {
  const spec = { ...EMPTY_SPEC, scenes: [{ id: "a" }, { id: "b" }] } as never;
  it("insertScene 은 지정 위치에 끼운다", () => {
    const next = insertScene(spec, 1, { id: "c" } as never);
    expect(next.scenes.map((s) => s.id)).toEqual(["a", "c", "b"]);
  });
  it("removeScene 은 지정 위치를 뺀다", () => {
    const next = removeScene(spec, 0);
    expect(next.scenes.map((s) => s.id)).toEqual(["b"]);
  });
  it("moveScene 은 범위를 벗어나면 그대로 돌려준다(참조 동일)", () => {
    expect(moveScene(spec, 0, 99)).toBe(spec);
  });
  it("replaceScene 은 해당 위치만 바꾼다", () => {
    const next = replaceScene(spec, 1, { id: "z" } as never);
    expect(next.scenes.map((s) => s.id)).toEqual(["a", "z"]);
  });
  it("cloneSpec 은 깊은 복사라 원본과 참조가 다르다", () => {
    const c = cloneSpec(spec);
    expect(c).toEqual(spec);
    expect(c).not.toBe(spec);
  });
});
