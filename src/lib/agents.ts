/**
 * 로컬 에이전트 CLI 어댑터.
 *
 * CLI 마다 "비대화형으로 한 번 묻고 답을 받는" 방법이 다르다. 그 차이만 여기 모은다 —
 * 프롬프트를 만드는 쪽(`specPrompt.ts`)과 결과를 검증하는 쪽(`specGen.ts`)은
 * 어느 CLI 인지 몰라도 된다.
 *
 * 실행 파일 탐색은 Rust 가 한다(`agent.rs`) — 앱을 Finder 에서 띄우면 PATH 가 빈약해
 * `which` 로는 못 찾는다. 여기서는 **찾은 실행 파일에 무슨 인자를 주는지**만 정한다.
 */

export interface AgentAdapter {
  id: string;
  label: string;
  /** 프롬프트 하나를 넘겨 한 번에 답을 받는 인자. model 이 비면 CLI 의 기본 모델로 돈다 */
  args(prompt: string, model?: string): string[];
  /** 목록에 함께 보여 줄 한 줄 — 준비물이 있으면 그것을 적는다 */
  hint: string;
  /** 모델 칸 도움말 — CLI 마다 받는 표기가 다르다 */
  modelHint: string;
  /** 자주 쓰는 값. 목록에 없다고 못 쓰는 것은 아니다(자유 입력) */
  models: string[];
}

/** 모델을 안 고르면 아무것도 넘기지 않는다 — CLI 가 자기 기본값을 쓴다. */
const withModel = (args: string[], model?: string): string[] =>
  model && model.trim() ? [...args, "--model", model.trim()] : args;

/**
 * 프롬프트는 argv 로 넘긴다. stdin 은 쓰지 않는다 —
 * `codex exec` 는 stdin 이 열려 있으면 추가 입력을 기다리다 멈춘다.
 * 길이는 문제되지 않는다(macOS·리눅스의 인자 한계는 1MB 안팎, 우리 프롬프트는 수십 KB).
 */
export const ADAPTERS: Record<string, AgentAdapter> = {
  claude: {
    id: "claude",
    label: "Claude Code",
    args: (p, m) => withModel(["-p", p], m),
    hint: "claude -p · 로그인돼 있으면 바로 된다",
    modelHint: "별칭(opus·sonnet·haiku) 또는 정식 이름. 비우면 CLI 설정의 기본 모델",
    models: ["opus", "sonnet", "haiku"],
  },
  codex: {
    id: "codex",
    label: "Codex CLI",
    /* --skip-git-repo-check 가 없으면 "Not inside a trusted directory" 로 거절한다 —
       우리는 일부러 빈 임시 폴더에서 돌리므로 항상 붙인다. */
    args: (p, m) => withModel(["exec", "--skip-git-repo-check", p], m),
    hint: "codex exec · 임시 폴더에서 돌리므로 신뢰 검사를 건너뛴다",
    modelHint: "codex 가 아는 모델 이름. 비우면 config 의 기본 모델",
    models: ["gpt-5.2-codex", "gpt-5.2"],
  },
  pi: {
    id: "pi",
    label: "pi",
    args: (p, m) => withModel(["-p", p], m),
    hint: "pi -p · 제공자·API 키 설정이 되어 있어야 한다",
    modelHint: "provider/id 표기를 받는다(예: openai/gpt-5.2). 비우면 기본 제공자(google)",
    models: ["anthropic/claude-opus-5", "openai/gpt-5.2", "google/gemini-3-pro"],
  },
  omp: {
    id: "omp",
    label: "omp",
    args: (p, m) => withModel(["-p", p], m),
    hint: "omp -p · 제공자·API 키 설정이 되어 있어야 한다",
    modelHint: "퍼지 매칭이 된다(opus · gpt-5.2 · openai/gpt-5.2). 비우면 설정의 기본 모델",
    models: ["opus", "sonnet", "gpt-5.2"],
  },
};

export const adapterOf = (id: string): AgentAdapter | null => ADAPTERS[id] ?? null;

/**
 * 모델 출력에서 스펙 JSON 을 꺼낸다.
 *
 * "JSON 만 출력하라"고 시켜도 코드펜스로 감싸거나 앞뒤에 한 줄을 붙이는 경우가 있고,
 * codex 처럼 진행 로그를 같은 스트림에 섞는 CLI 도 있다. 그래서 세 단계로 훑는다 —
 * ①  ```json 펜스 → ② 아무 코드펜스 → ③ 균형 잡힌 중괄호 덩어리.
 * 어느 쪽이든 **실제로 파싱되는 것 중 마지막 것**을 고른다. 재시도 대화에서는
 * 뒤쪽이 최신 답이고, 앞쪽에는 예시로 인용한 JSON 이 섞여 있을 수 있다.
 */
export function extractJson(text: string): { value: unknown; raw: string } | null {
  const tries: string[] = [];

  const fenced = [...text.matchAll(/```(?:json|jsonc)?\s*\n([\s\S]*?)```/g)];
  for (const m of fenced) tries.push(m[1]);

  /* 중괄호 균형 스캔. 문자열 안의 괄호·이스케이프를 세지 않게 상태를 들고 간다. */
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        tries.push(text.slice(start, i + 1));
        start = -1;
      }
      if (depth < 0) depth = 0;
    }
  }

  let hit: { value: unknown; raw: string } | null = null;
  for (const raw of tries) {
    const t = raw.trim();
    if (!t.startsWith("{")) continue;
    try {
      const value = JSON.parse(t);
      /* 스펙은 객체이고 scenes 를 가진다 — 모델이 곁들인 다른 JSON 을 집지 않는다 */
      if (value && typeof value === "object" && Array.isArray((value as { scenes?: unknown }).scenes)) {
        hit = { value, raw: t };
      }
    } catch {
      /* 파싱 실패는 후보 탈락일 뿐이다 */
    }
  }
  return hit;
}
