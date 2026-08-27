/** 스펙 조작 헬퍼. 전부 불변으로 다뤄 실행 취소를 단순하게 유지한다. */
import type { Scene, Spec } from "../engine/types";

export const EMPTY_SPEC: Spec = {
  title: "제목 없는 모션",
  message: "",
  theme: "midnight",
  aspect: "16:9",
  energy: "E2",
  mode: "autoplay",
  scenes: [],
};

export function cloneSpec(s: Spec): Spec {
  return JSON.parse(JSON.stringify(s)) as Spec;
}

export function replaceScene(spec: Spec, i: number, scene: Scene): Spec {
  const scenes = spec.scenes.slice();
  scenes[i] = scene;
  return { ...spec, scenes };
}

export function insertScene(spec: Spec, i: number, scene: Scene): Spec {
  const scenes = spec.scenes.slice();
  scenes.splice(i, 0, scene);
  return { ...spec, scenes };
}

export function removeScene(spec: Spec, i: number): Spec {
  const scenes = spec.scenes.slice();
  scenes.splice(i, 1);
  return { ...spec, scenes };
}

export function moveScene(spec: Spec, from: number, to: number): Spec {
  if (to < 0 || to >= spec.scenes.length || from === to) return spec;
  const scenes = spec.scenes.slice();
  const [s] = scenes.splice(from, 1);
  scenes.splice(to, 0, s);
  return { ...spec, scenes };
}

/** 값이 비었으면 키 자체를 지운다 — 스펙에 빈 문자열이 남으면 엔진이 헤더를 그린다. */
export function setField(obj: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> {
  const next = { ...obj };
  const empty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);
  if (empty) delete next[key];
  else next[key] = value;
  return next;
}

/** 중첩 객체(detail·screen·left…)의 한 필드를 갱신한다. 비면 객체째 지운다. */
export function setNested(
  obj: Record<string, unknown>,
  group: string,
  key: string,
  value: unknown,
): Record<string, unknown> {
  const cur = (obj[group] ?? {}) as Record<string, unknown>;
  const nextGroup = setField(cur, key, value);
  return setField(obj, group, Object.keys(nextGroup).length ? nextGroup : undefined);
}

/** 씬 목록에 보여 줄 한 줄 요약 */
export function sceneLabel(s: Scene): string {
  const pick = (v: unknown) => (typeof v === "string" && v.trim() ? v.replace(/\n/g, " ") : "");
  const first = (arr: unknown): string => {
    if (!Array.isArray(arr) || !arr.length) return "";
    const it = arr[0];
    if (typeof it === "string") return it;
    if (it && typeof it === "object") {
      const o = it as Record<string, unknown>;
      return pick(o.label) || pick(o.text) || pick(o.when) || "";
    }
    return "";
  };
  return (
    pick(s.title) ||
    pick(s.text) ||
    pick((s.to as Record<string, unknown>)?.title) ||
    first(s.lines) ||
    first(s.items) ||
    first(s.stats) ||
    first(s.steps) ||
    first(s.nodes) ||
    first(s.events) ||
    first(s.sources) ||
    first(s.stops) ||
    pick(s.id) ||
    "(제목 없음)"
  );
}
