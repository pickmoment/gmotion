/**
 * 자막 → 스펙 초안. CLI 를 부르고, **받은 것을 채점해서 되먹인다.**
 *
 * 이 앱이 CLI 래퍼와 다른 지점이 여기다. 앱에는 이미 채점기가 있다 —
 * `validate` 가 문법·밀도·글자 길이를 보고, 자막 매칭률이 `say` 를 자막 원문 그대로
 * 썼는지 알려 준다. 그래서 받은 JSON 을 바로 열지 않고 검증 → 진단을 붙여 재요청 →
 * 통과분만 넘긴다. 사람이 CLI 에 직접 시키면 이 왕복이 없다.
 */
import { api } from "./tauri";
import { validate } from "./build";
import { adapterOf, extractJson } from "./agents";
import {
  buildPrompt,
  buildStoryboardPrompt,
  retrySuffix,
  NO_JSON_SUFFIX,
  type PromptOpts,
  type Storyboard,
} from "./specPrompt";
import type { Cue, Spec, ValidateResult } from "../engine/types";

export class CanceledError extends Error {
  constructor() {
    super("취소했다");
    this.name = "CanceledError";
  }
}

export interface GenOpts extends PromptOpts {
  cues: Cue[];
  /** `agent_tools` 가 준 것 */
  tool: { id: string; bin: string };
  /** 검증에 걸렸을 때 다시 물을 횟수. 첫 시도를 포함하지 않는다 */
  retries: number;
  timeoutSec: number;
  /** 비우면 CLI 의 기본 모델로 돈다 */
  model?: string;
  /** 씬 표를 먼저 받고 그것을 근거로 스펙을 만든다. 끄면 한 번에 묻는다 */
  storyboard: boolean;
  onStage(text: string): void;
}

export interface GenResult {
  spec: Spec;
  result: ValidateResult;
  /** 몇 번째 시도에서 나온 것인가 (1부터) */
  attempt: number;
  raw: string;
  ms: number;
  /** 1단계에서 받은 씬 표. 왜 이렇게 나눴는지를 사람이 읽는 자리다 */
  board?: Storyboard | null;
}

/** 씬 수 대비 자막에 맞춘 씬 수. 낮으면 `say` 를 원문 그대로 쓰지 않았다는 뜻이다. */
export const matchRate = (r: ValidateResult): number => {
  const scenes = r.stats?.scenes ?? 0;
  if (!r.sync || !scenes) return 0;
  return r.sync.matched / scenes;
};

export async function generateSpec(o: GenOpts): Promise<GenResult> {
  const ad = adapterOf(o.tool.id);
  if (!ad) throw new Error(`모르는 CLI: ${o.tool.id}`);
  if (!o.cues.length) throw new Error("자막이 없다");

  /* 스펙 문법과 예제는 번들에서 그대로 실어 보낸다 — 없으면 카탈로그만으로 간다.
     예제(starter-narrated.json)는 자막 정렬 스펙이라 이 작업의 견본 그 자체다. */
  const bundled = async (p: string) => {
    try {
      return await api.skillFile(p);
    } catch {
      return null;
    }
  };
  const [reference, example] = await Promise.all([
    bundled("references/spec.md"),
    bundled("assets/examples/starter-narrated.json"),
  ]);
  const po: PromptOpts = { ...o, reference, example };

  /* 에이전트 CLI 는 현재 디렉토리를 작업 공간으로 본다 — 사용자 프로젝트가 아니라
     빈 임시 폴더에서 돌린다. 파일을 만들려 해도 여기서 끝난다. */
  const cwd = await api.tempPath("gmotion-agent");
  const call = async (text: string) => {
    const run = await api.agentRun({
      bin: o.tool.bin,
      args: ad.args(text, o.model),
      cwd,
      timeout_sec: o.timeoutSec,
    });
    if (run.canceled) throw new CanceledError();
    if (run.timed_out) throw new Error(`${o.timeoutSec}초 안에 끝나지 않아 멈췄다`);
    return run;
  };

  /* 1단계 — 씬 표. 한 번에 JSON 을 시키면 자막 문장이 그대로 화면에 올라온다.
     실패해도 치명적이지 않다: 표 없이 2단계로 간다. */
  let board: Storyboard | null = null;
  if (o.storyboard) {
    o.onStage(`${ad.label} 에 씬 표를 먼저 물었다 — 무엇을 어떤 순서로 보여줄지`);
    try {
      const run = await call(buildStoryboardPrompt(o.cues, po));
      const got = extractJson(run.stdout || run.stderr);
      if (got) board = got.value as Storyboard;
      o.onStage(
        board
          ? `씬 표 ${board.scenes?.length ?? 0}개를 받았다 — 이걸 근거로 스펙을 만든다`
          : "씬 표를 받지 못해 한 번에 만든다",
      );
    } catch (e) {
      if (e instanceof CanceledError) throw e;
      o.onStage("씬 표 단계를 건너뛴다 — 한 번에 만든다");
    }
  }

  const base = buildPrompt(o.cues, po, board);
  let prompt = base;
  let last: GenResult | null = null;
  const t0 = Date.now();

  for (let attempt = 1; attempt <= 1 + Math.max(0, o.retries); attempt++) {
    o.onStage(
      attempt === 1
        ? `${ad.label} 에 스펙을 요청했다 — 응답을 기다린다`
        : `${attempt}번째 시도 — 진단을 붙여 다시 묻는다`,
    );
    const run = await call(prompt);

    const found = extractJson(run.stdout || run.stderr);
    if (!found) {
      /* 종료 코드가 0 이 아니면 대개 로그인·네트워크 문제다. 그 말을 그대로 보여 준다. */
      const why = run.code !== 0 ? tail(run.stderr || run.stdout) : "출력에서 JSON 을 찾지 못했다";
      if (attempt > o.retries) throw new Error(why);
      o.onStage(`JSON 을 찾지 못했다 — 다시 묻는다 (${why.slice(0, 60)})`);
      prompt = base + NO_JSON_SUFFIX;
      continue;
    }

    const spec = found.value as Spec;
    const result = validate(spec, { cues: o.cues, captions: false, audioSrc: null });
    const cur: GenResult = { spec, result, attempt, raw: found.raw, ms: Date.now() - t0, board };
    last = cur;

    const rate = matchRate(result);
    if (result.ok && rate >= 0.8) return cur;

    if (attempt > o.retries) break;
    /* 매칭률이 낮은 것은 문법 오류가 아니라 **say 를 원문 그대로 쓰지 않은 것**이다.
       validate 는 이것을 오류로 내지 않으므로 진단에 직접 적어 준다. */
    const extra =
      rate < 0.8
        ? [
            `씬 ${result.stats?.scenes ?? 0}개 중 ${result.sync?.matched ?? 0}개만 자막에서 찾았다 — ` +
              "say 를 자막 원문과 한 글자도 다르지 않게 적는다(줄바꿈은 공백으로 이어 붙인다).",
          ]
        : [];
    o.onStage(
      result.ok
        ? `문법은 통과했지만 자막 매칭이 ${Math.round(rate * 100)}% 다 — 다시 묻는다`
        : `검증 오류 ${result.errors.length}건 — 진단을 붙여 다시 묻는다`,
    );
    prompt = base + retrySuffix(found.raw, [...result.errors, ...extra], result.warnings);
  }

  if (!last) throw new Error("스펙을 받지 못했다");
  return last;
}

/** 로그 꼬리 — 실패 원인은 대개 마지막 몇 줄에 있다. */
function tail(s: string, lines = 4): string {
  const t = s.trim().split("\n").filter(Boolean);
  return t.slice(-lines).join(" · ") || "출력이 비어 있다";
}
