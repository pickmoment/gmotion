/**
 * 자막에서 스펙 JSON 을 받아 오는 프롬프트를 만든다.
 *
 * **스킬의 워크플로를 그대로 옮겼다.** 한 번에 JSON 을 시키면 모델은 자막 문장을
 * 화면 글자에 그대로 옮겨 적는다 — 자막이 이미 완성된 문장이라 가장 쉬운 길이기
 * 때문이다. 스킬이 "코드부터 쓰지 않는다"고 못 박은 이유가 그것이고, 여기서도
 * ① 메시지 한 줄과 씬 표(스토리보드) → ② 그 표를 근거로 스펙 JSON 의 두 단계로 나눈다.
 *
 * 카탈로그(패턴·테마·스킨·트랜지션…)는 **엔진에서 직접 뽑는다.** 손으로 적어 두면
 * 엔진에 패턴이 늘어날 때마다 여기가 낡는다. 필드 문법은 번들된 `references/spec.md`,
 * 감은 번들 예제 스펙을 그대로 실어 보낸다 — 스킬 3단계의 "예제에서 시작한다" 다.
 */
import { GG } from "../engine/boot";
import type { Cue } from "../engine/types";

export interface PromptOpts {
  aspect: string;
  theme: string;
  skin?: string;
  energy: string;
  /** 용도·톤 같은 사람의 말. 그대로 실어 보낸다 */
  note?: string;
  /** 번들에서 읽은 references/spec.md. 없으면 카탈로그만으로 간다 */
  reference?: string | null;
  /** 번들 예제 스펙 원문(starter-narrated.json). 감을 잡는 데 쓴다 */
  example?: string | null;
}

/** 스토리보드 — 1단계에서 받는 것. JSON 으로 받아 2단계에 그대로 물린다. */
export interface Storyboard {
  title?: string;
  message?: string;
  scenes: { n?: number; pattern: string; headline?: string; cues?: string; why?: string; peak?: boolean }[];
}

const clock = (s: number) => {
  const t = Math.max(0, s);
  const m = Math.floor(t / 60);
  const sec = (t % 60).toFixed(1).padStart(4, "0");
  return `${String(m).padStart(2, "0")}:${sec}`;
};

/** 자막을 모델이 그대로 인용할 수 있는 모양으로 편다. */
export function cueBlock(cues: Cue[]): string {
  return cues
    .map((c, i) => `#${i + 1} [${clock(c.start)} → ${clock(c.end)}] ${c.text.replace(/\s*\n\s*/g, " ")}`)
    .join("\n");
}

/** 패턴 카탈로그 — 무엇에 쓰는지와 필드, 항목 상한까지. */
function patternTable(): string {
  return Object.entries(GG.patterns)
    .map(([k, p]) => `| ${k} | ${p.use} | ${p.fields} | ${p.max ?? "-"} |`)
    .join("\n");
}

const list = (o: Record<string, string>) =>
  Object.entries(o)
    .map(([k, v]) => `${k}(${v})`)
    .join(" · ");

/**
 * 두 단계가 함께 지켜야 할 것. 여기가 품질을 가르는 자리다 —
 * 특히 "자막 문장을 화면에 그대로 옮기지 않는다" 한 줄이 없으면
 * 결과가 자막 낭독의 자막 버전이 된다.
 */
const CRAFT = `## 화면을 만드는 규칙 (여기가 품질을 가른다)

- **자막은 귀로 듣는 말이고, 화면은 눈으로 읽는 것이다. 둘은 다른 물건이다.**
  자막 문장을 그대로 제목에 옮겨 적지 않는다. 화면에는 **짧은 구절**만 남긴다
  (제목 12~20자, 항목 라벨 4~10자). 조사·서술어를 덜어 낸다.
  - 나쁜 예: title "회의가 길어지는 이유는 안건이 많아서가 아닙니다"
  - 좋은 예: kicker "회의가 길어지는 이유" · title "안건이 아니라\\n결정자다"
- **말한 사실을 화면의 구조로 바꾼다.** 자막에서 뽑아 낼 것을 먼저 찾는다 —
  숫자는 \`dataCounter.stats\`, 대비는 \`beforeAfter\`·\`splitCompare\`,
  순서는 \`processFlow.steps\`·\`timeline.events\`, 나열은 \`cardsCascade.items\`,
  하나로 모이는 이야기는 \`convergence\`, 구조는 \`networkBuild\`.
  그냥 문장을 띄우는 패턴(heroReveal·kineticType·quote)만으로 채우면 실패다.
  **전체의 절반 이상은 구조를 가진 패턴이어야 한다.**
- **한 씬에 한 메시지.** 씬 하나가 대사 8~15초를 덮게 나눈다. 씬을 잘게 쪼개면
  화면이 자막처럼 흘러가고, 20초를 넘기면 대부분이 정지 화면이 된다.
- **피크를 하나 정한다.** 이야기가 뒤집히거나 결론이 서는 씬 하나에 가장 강한 패턴을 준다.
- **없는 것을 만들지 않는다.** 자막에 없는 수치·이름·인용을 쓰지 않는다.
  화면 글자는 자막의 사실을 **줄여 쓴 것**이어야 하고, 새로 지어낸 것이면 안 된다.`;

const SETTINGS = (o: PromptOpts) => `## 문서 설정 (그대로 쓴다)

\`\`\`json
{ "aspect": "${o.aspect}", "theme": "${o.theme}", "energy": "${o.energy}"${o.skin ? `, "skin": "${o.skin}"` : ""} }
\`\`\`${o.note ? `\n\n용도·톤: ${o.note}` : ""}`;

const CATALOG = () => `## 씬 패턴 카탈로그

| pattern | 쓰임 | 필드 | 항목 상한 |
|---|---|---|---|
${patternTable()}

## 그 밖의 값

- 트랜지션: ${list(GG.transitions)}
- 테마: ${Object.keys(GG.themes).join(" · ")}
- 스킨: ${Object.keys(GG.skins).join(" · ")}
- 에너지: ${list(GG.energies)}`;

/* ── 1단계: 스토리보드 ───────────────────────────────────────────── */

/**
 * 씬 표를 먼저 받는다. 스킬 워크플로 1단계 — "코드도 JSON 도 아직 쓰지 않는다".
 * 여기서 패턴 선택과 씬 경계가 정해지므로, 되돌아보기 가장 싼 지점이기도 하다.
 */
export function buildStoryboardPrompt(cues: Cue[], o: PromptOpts): string {
  const total = cues.length ? cues[cues.length - 1].end : 0;
  return `너는 모션그래픽 연출자다. 아래 **낭독 자막**을 화면으로 옮길 **씬 표**를 짠다.
아직 스펙 JSON 을 쓰지 않는다 — 무엇을 어떤 순서로 보여줄지만 정한다.

## 출력 형식 (이 JSON 하나만, 설명 없이)

\`\`\`json
{
  "title": "문서 제목(짧게)",
  "message": "이 영상이 남길 메시지 한 줄",
  "scenes": [
    { "n": 1, "pattern": "카탈로그의 pattern", "headline": "그 씬 화면에 뜰 한 줄(12~20자)",
      "cues": "1-3", "why": "왜 이 패턴인가 — 한 줄", "peak": false }
  ]
}
\`\`\`

- \`cues\` 는 그 씬이 덮는 자막 번호 범위다. **모든 자막이 정확히 한 씬에 속해야 한다**(빠짐·겹침 없이).
- \`peak\` 는 정확히 하나만 true.

${CRAFT}

${SETTINGS(o)}

${CATALOG()}

## 낭독 자막 (${cues.length}개 cue · 총 ${clock(total)})

${cueBlock(cues)}

---

씬 표 JSON 만 출력한다.`;
}

/* ── 2단계: 스펙 ────────────────────────────────────────────────── */

export function buildPrompt(cues: Cue[], o: PromptOpts, board?: Storyboard | null): string {
  const total = cues.length ? cues[cues.length - 1].end : 0;
  const ref = o.reference ? `\n## 필드 레퍼런스 (이 문법만 쓴다)\n\n${o.reference}\n` : "";
  const ex = o.example
    ? `\n## 잘 만든 예제 (같은 감으로 쓴다 — 내용은 베끼지 않는다)\n\n\`\`\`json\n${o.example}\n\`\`\`\n\n` +
      `이 예제에서 볼 것: 화면 글자가 자막보다 훨씬 짧다 · 수치가 stats 로 뽑혀 있다 · ` +
      `say 에는 낭독 원문이 그대로 들어 있다 · 패턴이 씬마다 다르다.\n`
    : "";
  const plan = board
    ? `\n## 확정된 씬 표 (이대로 만든다)\n\n\`\`\`json\n${JSON.stringify(board, null, 2)}\n\`\`\`\n\n` +
      `패턴과 순서는 이 표를 따른다. 화면 글자는 표의 headline 을 다듬어 쓰되, ` +
      `패턴이 요구하는 항목(stats·steps·items·before/after…)은 자막에서 뽑아 채운다.\n`
    : "";

  return `너는 gmotion 스펙 작성자다. 아래 **낭독 자막**을 화면으로 옮기는 스펙 JSON 한 장을 만든다.

## 출력 규칙 (어기면 쓸 수 없다)

- **표준출력에 JSON 객체 하나만 낸다.** 설명·인사·요약을 붙이지 않는다.
- 파일을 만들거나 고치지 않는다. 도구를 쓰지 않는다. 그냥 JSON 을 출력한다.
- 코드펜스로 감싸도 되지만, JSON 은 하나만 낸다.
- 카탈로그에 **있는 이름만** 쓴다. 없는 패턴·테마·트랜지션을 지어내지 않는다.

## 자막 정렬 규칙

- 씬마다 \`say\` 에 **그 씬에서 낭독하는 자막 원문을 그대로** 적는다(여러 cue 를 덮으면 공백으로 이어 붙인다).
  화면 타이밍은 이 \`say\` 를 자막에서 찾아 맞춘다 — 한 글자라도 바꾸면 못 찾는다.
  **\`say\` 는 원문 그대로, 화면에 뜨는 글자는 짧게 재단** — 이 둘은 다른 값이다.
- \`hold\` · 길이 · 시각을 적지 않는다. **타이밍은 자막이 정한다.**
- 씬마다 \`transition\` 을 정한다(첫 씬은 생략). 같은 것만 반복하지 않는다.
- \`title\`(문서 제목)과 \`message\`(한 줄 요약)를 채운다.

${CRAFT}

${SETTINGS(o)}
${plan}${ex}
${CATALOG()}
${ref}
## 낭독 자막 (${cues.length}개 cue · 총 ${clock(total)})

${cueBlock(cues)}

---

이제 JSON 만 출력한다.`;
}

/**
 * 검증에 걸렸을 때 붙이는 꼬리말.
 *
 * CLI 는 호출마다 새 대화다 — 앞의 규칙과 카탈로그를 기억하지 못한다. 그래서 재시도는
 * **원래 프롬프트 전체 + 이 꼬리말**로 보낸다. 진단만 보내면 규칙을 잊은 답이 온다.
 */
export function retrySuffix(prev: string, errors: string[], warnings: string[]): string {
  return `

---

## 방금 낸 JSON 이 검증을 통과하지 못했다

아래 오류를 고쳐서 **JSON 하나만** 다시 출력한다. 위의 규칙과 카탈로그는 그대로 지킨다.

### 오류 (반드시 고친다)

${errors.length ? errors.map((e) => `- ${e}`).join("\n") : "- (없음)"}

### 경고 (가능하면 고친다)

${warnings.length ? warnings.map((w) => `- ${w}`).join("\n") : "- (없음)"}

### 고칠 대상

\`\`\`json
${prev}
\`\`\`
`;
}

/** 출력에서 JSON 을 아예 찾지 못했을 때 붙이는 꼬리말. */
export const NO_JSON_SUFFIX = `

---

## 방금 출력에서 JSON 을 찾지 못했다

설명·진행 로그 없이 **\`{\` 로 시작해 \`}\` 로 끝나는 JSON 객체 하나만** 출력한다.
`;
