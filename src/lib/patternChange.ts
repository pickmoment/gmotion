/**
 * 씬 유형(패턴) 바꾸기 — 내용을 **역할 단위**로 옮긴다.
 *
 * 패턴마다 필드 이름은 다르지만 역할은 겹친다: 제목 하나, 항목 배열 하나,
 * 양쪽 비교 두 짝, 중심 하나. 그 역할을 편집 스키마(`PATTERNS`)에서 구조로 읽어
 * 새 패턴의 같은 역할 자리에 넣고, **자리가 없는 것만 버린다.**
 *
 * 무엇이 옮겨졌고 무엇이 버려졌는지 함께 돌려준다 — 조용히 지우지 않는다.
 */
import { COMMON_FIELDS, PATTERNS, blankScene, type Field } from "../engine/schema";
import type { Item, Scene, SceneItem } from "../engine/types";

/** 패턴과 무관하게 남는 씬 필드 — skin 은 칩으로, decorLevel 은 decor 편집기 안에서 그려 COMMON_FIELDS 에 없다 */
const COMMON_KEYS: string[] = [...COMMON_FIELDS.map((f) => f.key), "skin", "decorLevel"];

/** 항목의 글자를 담고 있을 수 있는 키 — 패턴마다 이름만 다르다 */
const TEXT_KEYS = ["label", "text", "when"];
const SIDE_KEYS = ["label", "value", "icon", "tone", "items"];
const HUB_KEYS = ["label", "icon", "note"];

/** 항목 배열이 놓인 자리 */
type ListSlot = {
  path: string[];
  primary: string;
  /** 그 패턴의 항목이 받는 하위 키 — 나머지는 옮기지 않는다 */
  allow: string[];
  max: number | null;
};

type Slots = {
  heading?: string[];
  kicker?: string[];
  sub?: string[];
  icon?: string;
  list?: ListSlot;
  /** before/after · left/right 처럼 라벨+항목을 가진 짝 */
  sides: string[];
  /** target/source/center 처럼 항목 하나짜리 객체 */
  hubs: string[];
};

/** 역할을 옮긴 결과. UI 가 사용자에게 그대로 밝힌다. */
export type PatternChange = {
  scene: Scene;
  /** 옮겨진 것 */
  carried: string[];
  /** 자리가 없어 버린 것 */
  dropped: string[];
  /** 옮겼지만 손을 봐야 하는 것 */
  notes: string[];
};

/** 스키마의 구조로는 읽히지 않는 자리 — 차트 데이터는 `data.items` 안에 있다 */
const LIST_OVERRIDE: Record<string, ListSlot> = {
  chart: {
    path: ["data", "items"],
    primary: "label",
    allow: ["value", "unit", "icon", "note", "tone"],
    max: null,
  },
  /* 엔드카드의 내용 자리는 "다음 볼 것" 이다. 스키마 순서상 먼저 나오는 cta 는
     구독·좋아요 같은 행동 요청이라, 다른 패턴의 항목이 그리로 가면 뜻이 어긋난다. */
  endCard: {
    path: ["next"],
    primary: "label",
    allow: ["icon", "note", "value", "tone", "badge", "ribbon", "art", "spark", "say"],
    max: 2,
  },
};

type GroupField = Extract<Field, { k: "group" }>;
type ItemsField = Extract<Field, { k: "items" }>;

function isObj(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** 그룹 정체를 가르는 데 네 곳에서 같이 쓴다 — side 인가 hub 인가 */
function hasKey(fields: Field[], key: string) {
  return fields.some((f) => f.key === key);
}

/** 패턴의 역할 자리를 스키마에서 읽는다. */
function slotsOf(pattern: string): Slots {
  const fields = PATTERNS[pattern]?.fields ?? [];
  const groups = fields.filter((f): f is GroupField => f.k === "group");
  const sides = groups
    .filter((g) => hasKey(g.fields, "label") && hasKey(g.fields, "items"))
    .map((g) => g.key);
  /* 중심(hub)은 라벨에 아이콘을 단 것 — 라벨·노트만 있는 quizReveal.answer 는 중심이 아니다 */
  const hubs = groups
    .filter(
      (g) =>
        hasKey(g.fields, "label") &&
        hasKey(g.fields, "icon") &&
        !hasKey(g.fields, "items") &&
        !hasKey(g.fields, "title"),
    )
    .map((g) => g.key);

  /* 항목 배열 — 최상위에 없으면 그룹 안(deviceShow.screen.items)을 본다 */
  let list = LIST_OVERRIDE[pattern];
  if (!list) {
    let field = fields.find((f): f is ItemsField => f.k === "items");
    let path = field ? [field.key] : null;
    if (!field)
      for (const g of groups) {
        if (sides.includes(g.key)) continue;
        const inner = g.fields.find((f): f is ItemsField => f.k === "items");
        if (inner) {
          field = inner;
          path = [g.key, inner.key];
          break;
        }
      }
    if (field && path)
      list = {
        path,
        primary: field.primary,
        allow: [...field.fields, "say"],
        max: field.max === undefined ? (PATTERNS[pattern]?.max ?? null) : field.max,
      };
  }

  /* 제목·서브 — 최상위에 이름이 없으면 필수 그룹 안(matchCut 의 to)을 쓴다 */
  const textKey = (key: string) =>
    fields.some((f) => f.key === key && (f.k === "text" || f.k === "multiline")) ? [key] : null;
  const groupKey = (key: string) => {
    const g = groups.find(
      (x) =>
        x.req && x.fields.some((f) => f.key === key && (f.k === "text" || f.k === "multiline")),
    );
    return g ? [g.key, key] : null;
  };

  return {
    /* 퀴즈의 `question` 도 제목 자리다 — 이름을 안 알아보면 제목이 선택지 첫 줄로 섞인다 */
    heading:
      textKey("title") ?? textKey("text") ?? textKey("question") ?? groupKey("title") ?? undefined,
    kicker: textKey("kicker") ?? undefined,
    sub: textKey("sub") ?? groupKey("sub") ?? undefined,
    icon: fields.some((f) => f.k === "icon" && f.key === "icon") ? "icon" : undefined,
    list,
    sides,
    hubs,
  };
}

/** 이름을 뗀 항목 — 글자 하나, 남은 글자 하나, 나머지 필드 */
type Neutral = { text: string; alt: string; extras: Record<string, unknown> };

function neutral(raw: SceneItem, primary: string): Neutral {
  if (typeof raw === "string") return { text: raw, alt: "", extras: {} };
  const o = raw as Record<string, unknown>;
  /* 사람이 읽는 라벨을 글자로 삼는다 — timeline 의 when 같은 축 값보다 우선한다 */
  const order = ["label", "text", primary, "when"].filter((k, i, a) => a.indexOf(k) === i);
  let text = "";
  let used = "";
  for (const k of order) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) {
      text = v;
      used = k;
      break;
    }
  }
  let alt = "";
  const extras: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === used) continue;
    if (TEXT_KEYS.includes(k)) {
      if (!alt && typeof v === "string" && v.trim()) alt = v;
      continue;
    }
    extras[k] = v;
  }
  return { text, alt, extras };
}

function toItem(n: Neutral, slot: ListSlot): SceneItem {
  const o: Record<string, unknown> = {};
  if (n.text) o[slot.primary] = n.text;
  for (const [k, v] of Object.entries(n.extras)) if (slot.allow.includes(k)) o[k] = v;
  if (n.alt && slot.allow.includes("note") && o.note === undefined) o.note = n.alt;
  const keys = Object.keys(o);
  /* 객체가 글자 하나뿐이면 문자열로 되돌린다 — 스펙을 깨끗하게 유지한다 */
  if (keys.length === 1 && keys[0] === slot.primary && typeof o[slot.primary] === "string")
    return o[slot.primary] as string;
  return o as Item;
}

function getPath(root: unknown, path?: string[]): string {
  if (!path) return "";
  let cur: unknown = root;
  for (const k of path) {
    if (!isObj(cur)) return "";
    cur = cur[k];
  }
  return typeof cur === "string" ? cur : "";
}

function setPath(root: Record<string, unknown>, path: string[], value: unknown) {
  let cur = root;
  for (const k of path.slice(0, -1)) {
    const nx = cur[k];
    cur[k] = isObj(nx) ? { ...nx } : {};
    cur = cur[k] as Record<string, unknown>;
  }
  cur[path[path.length - 1]] = value;
}

function readList(scene: Scene, slot?: ListSlot): Neutral[] {
  if (!slot) return [];
  let cur: unknown = scene;
  for (const k of slot.path) {
    if (!isObj(cur)) return [];
    cur = cur[k];
  }
  if (!Array.isArray(cur)) return [];
  return (cur as SceneItem[])
    .map((it) => neutral(it, slot.primary))
    .filter((n) => n.text || Object.keys(n.extras).length);
}

function pickKeys(o: Record<string, unknown>, keys: string[]) {
  const next: Record<string, unknown> = {};
  for (const k of keys) if (o[k] !== undefined) next[k] = o[k];
  return next;
}

/** 한쪽(side)의 글자들 — 항목이 없으면 라벨이 그 자리를 대신한다 */
function sideTexts(side: Record<string, unknown>): string[] {
  const items = Array.isArray(side.items) ? (side.items as SceneItem[]) : [];
  const texts = items.map((it) => neutral(it, "label").text).filter(Boolean);
  if (texts.length) return texts;
  return typeof side.label === "string" && side.label.trim() ? [side.label] : [];
}

/** 카운터·차트가 쓸 수 있는 수치를 들고 있는가 — 문자열 "41" 도 수치로 본다 */
function hasNumber(n: Neutral) {
  const v = n.extras.value;
  if (typeof v === "number") return Number.isFinite(v);
  return typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v));
}

/**
 * 씬의 패턴을 바꾼다. 공통 필드는 그대로 두고, 내용은 역할이 같은 자리로 옮긴다.
 * 원본은 건드리지 않는다.
 */
export function changePattern(scene: Scene, next: string): PatternChange {
  const carried: string[] = [];
  const dropped: string[] = [];
  const notes: string[] = [];
  if (next === scene.pattern || !PATTERNS[next]) return { scene, carried, dropped, notes };

  const from = slotsOf(scene.pattern);
  const to = slotsOf(next);
  const base = blankScene(next) as Scene;
  const obj = base as Record<string, unknown>;

  for (const k of COMMON_KEYS) if (scene[k] !== undefined) base[k] = scene[k];
  /* roll 은 matchCut 의 글자 교체 전용이다 — 다른 패턴에 남겨 두면 아무 일도 하지 않는다 */
  if (base.textFx === "roll" && next !== "matchCut") delete base.textFx;

  const heading = getPath(scene, from.heading);
  const kicker = getPath(scene, from.kicker);
  const sub = getPath(scene, from.sub);
  const icon =
    from.icon && typeof scene[from.icon] === "string" ? (scene[from.icon] as string) : "";
  const sides = from.sides.map((k) => scene[k]).filter(isObj);
  const hubs = from.hubs.map((k) => scene[k]).filter(isObj);
  let pool = readList(scene, from.list);

  /* ── 제목 ── 항목 자리가 아예 없는 패턴(heroReveal·quote)에서만 첫 항목을 제목으로 올린다 */
  if (to.heading) {
    const roomForItems = !!to.list || to.sides.length > 0;
    const text = heading || (!roomForItems && pool.length ? pool.shift()!.text : "");
    if (text) {
      setPath(obj, to.heading, text);
      carried.push(heading ? "제목" : "첫 항목 → 제목");
    }
  } else if (heading && to.list) {
    pool = [{ text: heading, alt: "", extras: {} }, ...pool];
    carried.push("제목 → 항목");
  } else if (heading) {
    dropped.push("제목");
  }

  /* ── 키커·서브·아이콘 ── */
  if (kicker && to.kicker) {
    setPath(obj, to.kicker, kicker);
    carried.push("키커");
  } else if (kicker) dropped.push("키커");

  if (sub && to.sub) {
    setPath(obj, to.sub, sub);
    carried.push("서브");
  } else if (sub) dropped.push("서브");

  if (icon && to.icon) {
    base[to.icon] = icon;
    carried.push("아이콘");
  } else if (icon) dropped.push("아이콘");

  /* ── 양쪽 비교(before/after · left/right) ── */
  if (to.sides.length) {
    if (sides.length) {
      to.sides.forEach((key, i) => {
        if (sides[i]) base[key] = pickKeys(sides[i], SIDE_KEYS);
      });
      carried.push("양쪽");
      if (sides.length > to.sides.length) dropped.push(`${to.sides.length + 1}번째 짝`);
    } else if (pool.length >= to.sides.length) {
      /* 항목을 짝 수만큼 갈라 넣는다 — 라벨은 새 패턴의 기본값을 그대로 쓴다 */
      const per = Math.ceil(pool.length / to.sides.length);
      to.sides.forEach((key, i) => {
        const chunk = pool.slice(i * per, (i + 1) * per).map((n) => n.text);
        const cur = isObj(base[key]) ? (base[key] as Record<string, unknown>) : {};
        if (chunk.length) base[key] = { ...cur, items: chunk };
      });
      carried.push(`항목 ${pool.length}개 → 양쪽`);
      pool = [];
    }
  } else if (sides.length) {
    const texts = to.list ? sides.flatMap(sideTexts) : [];
    if (texts.length) {
      pool = [...pool, ...texts.map((t) => ({ text: t, alt: "", extras: {} }))];
      carried.push("양쪽 → 항목");
    } else dropped.push("양쪽");
  }

  /* ── 중심 하나(target/source/center) ── */
  if (to.hubs.length && hubs.length) {
    to.hubs.forEach((key, i) => {
      if (hubs[i]) base[key] = pickKeys(hubs[i], HUB_KEYS);
    });
    carried.push("중심 항목");
  } else if (hubs.length) {
    const texts = to.list
      ? hubs.map((h) => (typeof h.label === "string" ? h.label : "")).filter(Boolean)
      : [];
    if (texts.length) {
      pool = [...pool, ...texts.map((t) => ({ text: t, alt: "", extras: {} }))];
      carried.push("중심 항목 → 항목");
    } else dropped.push("중심 항목");
  }

  /* ── 항목 배열 ── */
  if (pool.length) {
    const slot = to.list;
    if (!slot) {
      dropped.push(`항목 ${pool.length}개`);
    } else if (next === "chart" && !pool.some(hasNumber)) {
      /* 값 없는 항목을 차트에 넣으면 0 짜리 막대가 된다 — 없는 수치를 만들지 않는다 */
      dropped.push(`항목 ${pool.length}개 (수치가 없어 차트에 넣지 않았다)`);
    } else {
      const cap = slot.max ?? pool.length;
      const kept = pool.slice(0, cap);
      setPath(
        obj,
        slot.path,
        kept.map((n) => toItem(n, slot)),
      );
      carried.push(`항목 ${kept.length}개`);
      if (pool.length > cap) notes.push(`${pool.length - cap}개는 상한(${cap}개)을 넘어 버렸다`);
      if (next === "dataCounter" && !kept.every(hasNumber))
        notes.push("값(value)이 없는 지표는 0 으로 표시된다 — 숫자를 채운다");
    }
  }

  /* 확대할 항목 번호가 항목 수를 넘으면 아무것도 확대하지 못한다 — 마지막 항목으로 당긴다 */
  if (typeof base.focus === "number" && Array.isArray(base.items) && base.items.length)
    base.focus = Math.min(base.focus, base.items.length - 1);

  return { scene: base, carried, dropped, notes };
}
