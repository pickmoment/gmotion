/**
 * CLI 없이 만드는 뼈대 초안.
 *
 * 모델을 쓰지 않으므로 **자막에 없는 말은 한 글자도 만들지 않는다.** 하는 일은 둘뿐이다 —
 * ① 자막을 5~15초 단위 씬으로 끊고 ② 그 씬의 자막 원문을 `say` 에 그대로 넣는다.
 * 화면에 뜨는 글자도 자막에서 잘라 쓴다.
 *
 * 왜 필요한가. CLI 가 없거나 로그인이 안 됐거나 사내망에서 막혀도 "빈 스펙에서 시작"
 * 이라는 가장 큰 벽은 넘어야 한다. 이 초안은 씬 경계와 `say` 가 이미 맞아 있으므로
 * 사용자는 패턴과 문구만 갈아 끼우면 된다.
 */
import type { Cue, Scene, Spec } from "../engine/types";

/** 목표 씬 길이(초). 5 아래로는 끊지 않고 15 를 넘기지 않는다. */
const TARGET = 9;
const MIN = 5;
const MAX = 15;

const ENDS = /[.!?…]$|다$|요$|까$|죠$|네$/;

/** 문장 단위로 자르되 길이 상한을 넘기지 않는다. 말을 만들지 않고 **줄이기만** 한다. */
function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sp = cut.lastIndexOf(" ");
  return (sp > max * 0.5 ? cut.slice(0, sp) : cut).replace(/[,·]$/, "") + "…";
}

/** 자막을 씬 단위로 묶는다. 문장이 끝나는 자리를 우선 경계로 삼는다. */
export function groupCues(cues: Cue[]): Cue[][] {
  const out: Cue[][] = [];
  let cur: Cue[] = [];
  const dur = () => (cur.length ? cur[cur.length - 1].end - cur[0].start : 0);

  for (const c of cues) {
    cur.push(c);
    const d = dur();
    const sentenceEnd = ENDS.test(c.text.trim());
    if (d >= MAX || (d >= MIN && sentenceEnd && d >= TARGET * 0.7)) {
      out.push(cur);
      cur = [];
    }
  }
  if (cur.length) {
    /* 마지막 토막이 너무 짧으면 앞 씬에 붙인다 — 1초짜리 씬은 화면이 되지 못한다 */
    if (out.length && dur() < MIN) out[out.length - 1].push(...cur);
    else out.push(cur);
  }
  return out;
}

const joinText = (g: Cue[]) => g.map((c) => c.text.replace(/\s*\n\s*/g, " ").trim()).join(" ");

/** 한 씬 분량의 자막에서 문장을 뽑는다. */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|(?<=다)\s+(?=[가-힣A-Z])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 패턴을 돌려 가며 붙인다. 필드가 자막에서 그대로 채워지는 것만 쓴다 —
 * 항목을 지어내야 하는 패턴(dataCounter·processFlow…)은 사람이 고를 몫으로 남긴다.
 */
const CYCLE = ["kineticType", "heroReveal", "quote"] as const;

export function draftFromCues(cues: Cue[], base: Partial<Spec> = {}): Spec {
  const groups = groupCues(cues);
  const scenes: Scene[] = groups.map((g, i) => {
    const say = joinText(g);
    const sents = sentences(say);
    const pattern = i === 0 ? "heroReveal" : CYCLE[i % CYCLE.length];
    const common = {
      say,
      transition: i === 0 ? undefined : (["fade", "pushLeft", "zoomIn"] as const)[i % 3],
      purpose: `자막 ${g[0].start.toFixed(1)}s~${g[g.length - 1].end.toFixed(1)}s`,
    };
    if (pattern === "kineticType") {
      return {
        pattern,
        ...common,
        lines: sents.slice(0, 3).map((s) => clip(s, 22)),
      };
    }
    if (pattern === "quote") {
      return { pattern, ...common, text: clip(sents[0] ?? say, 60) };
    }
    return {
      pattern: "heroReveal",
      ...common,
      title: clip(sents[0] ?? say, 28),
      sub: sents[1] ? clip(sents[1], 40) : undefined,
    };
  });

  return {
    title: clip(sentences(joinText(groups[0] ?? []))[0] ?? "제목", 24),
    message: clip(joinText(groups[0] ?? []), 60),
    aspect: "16:9",
    theme: "midnight",
    energy: "E2",
    ...base,
    scenes,
  };
}
