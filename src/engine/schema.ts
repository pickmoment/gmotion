/**
 * 패턴 20종의 편집 스키마.
 *
 * 엔진이 필드 목록을 문자열로만 알려 주므로(`gm pattern <이름>`), 폼을 그리려면
 * 구조화된 선언이 필요하다. 여기 있는 내용은 `references/spec.md` 를 그대로 옮긴
 * 것이고, 열거값(테마·차트·프레임 등)은 하드코딩하지 않고 엔진에서 읽는다.
 */
import { GG } from "./boot";

/** 항목 객체가 가질 수 있는 하위 필드 */
export type ItemFieldKey =
  | "label"
  | "text"
  | "when"
  | "icon"
  | "note"
  | "value"
  | "unit"
  | "prefix"
  | "dec"
  | "tone"
  | "badge"
  | "ribbon"
  | "art"
  | "spark"
  | "say"
  | "hub"
  | "ring"
  | "emphasis"
  | "scale";

export type Field =
  | { k: "text"; key: string; label: string; hint?: string; req?: boolean }
  | { k: "multiline"; key: string; label: string; hint?: string; req?: boolean; rows?: number }
  | { k: "number"; key: string; label: string; hint?: string; step?: number; ph?: string }
  | { k: "bool"; key: string; label: string; hint?: string; def?: boolean }
  | {
      k: "select";
      key: string;
      label: string;
      hint?: string;
      opts: () => Record<string, string>;
      req?: boolean;
    }
  | { k: "icon"; key: string; label: string; hint?: string }
  | {
      k: "items";
      key: string;
      label: string;
      hint?: string;
      req?: boolean;
      primary: ItemFieldKey;
      fields: ItemFieldKey[];
    }
  | { k: "strings"; key: string; label: string; hint?: string; ph?: string }
  | { k: "group"; key: string; label: string; hint?: string; req?: boolean; fields: Field[] }
  | { k: "chartdata"; key: string; label: string; hint?: string };

export interface PatternSchema {
  label: string;
  use: string;
  max: number | null;
  fields: Field[];
}

/* 항목 편집기에서 늘 접혀 있는 공통 장식 필드 — spec.md 의 "객체 공통 필드" */
const DECOR_FIELDS: ItemFieldKey[] = ["note", "tone", "badge", "ribbon", "art", "spark"];

const opt = {
  tone: () => ({
    good: "good — 긍정",
    bad: "bad — 부정",
    warn: "warn — 주의",
    dim: "dim — 흐리게",
  }),
  chart: () => GG.charts,
  frame: () => GG.frames,
  art: () => GG.arts,
  kineticMode: () => ({ stack: "stack — 쌓임(기본)", cut: "cut — 한 줄씩 교체" }),
  kineticBy: () => ({ words: "words — 단어 단위(기본)", chars: "chars — 글자 단위" }),
  cardDir: () => ({
    up: "up — 아래에서(기본)",
    left: "left — 왼쪽에서",
    scale: "scale — 확대",
    stack: "stack — 겹쳐 있다 흩어짐",
  }),
};

/** 항목 배열을 쓰는 패턴은 이 헬퍼로 정의한다. */
function items(
  key: string,
  label: string,
  o: { req?: boolean; hint?: string; primary?: ItemFieldKey; extra?: ItemFieldKey[] } = {},
): Field {
  return {
    k: "items",
    key,
    label,
    req: o.req,
    hint: o.hint,
    primary: o.primary ?? "label",
    fields: ["icon", ...(o.extra ?? []), ...DECOR_FIELDS],
  };
}

/** beforeAfter · splitCompare 의 한쪽 */
function side(key: string, label: string, hint: string): Field {
  return {
    k: "group",
    key,
    label,
    hint,
    req: true,
    fields: [
      { k: "text", key: "label", label: "라벨", req: true },
      { k: "text", key: "value", label: "값", hint: '"41%" 처럼 한눈에 읽히는 수치' },
      { k: "icon", key: "icon", label: "아이콘" },
      { k: "select", key: "tone", label: "톤", opts: opt.tone },
      { k: "strings", key: "items", label: "항목", ph: "한 줄에 하나" },
    ],
  };
}

/** target · source · center 처럼 항목 하나짜리 객체 */
function single(key: string, label: string, hint: string, req = true): Field {
  return {
    k: "group",
    key,
    label,
    hint,
    req,
    fields: [
      { k: "text", key: "label", label: "라벨", req: true },
      { k: "icon", key: "icon", label: "아이콘" },
      { k: "text", key: "note", label: "노트" },
    ],
  };
}

export const PATTERNS: Record<string, PatternSchema> = {
  heroReveal: {
    label: "히어로 리빌",
    use: "오프닝·클로징. 한 씬에 메시지 하나",
    max: null,
    fields: [
      {
        k: "multiline",
        key: "title",
        label: "제목",
        req: true,
        hint: "줄바꿈하면 줄 단위 마스크 리빌이 걸린다",
        rows: 3,
      },
      { k: "text", key: "kicker", label: "키커" },
      { k: "text", key: "sub", label: "서브" },
      { k: "icon", key: "icon", label: "아이콘", hint: "있으면 선으로 그려지며 등장(DrawSVG)" },
      { k: "bool", key: "rule", label: "룰라인", def: true },
    ],
  },
  kineticType: {
    label: "키네틱 타이포",
    use: "글자가 주인공. 헤더 대신 lines 를 쓴다",
    max: 6,
    fields: [
      {
        k: "items",
        key: "lines",
        label: "줄",
        req: true,
        primary: "text",
        fields: ["emphasis", "scale"],
        hint: "6줄까지. 강조는 accent 색 + 글자 단위 등장",
      },
      { k: "select", key: "mode", label: "모드", opts: opt.kineticMode },
      { k: "select", key: "by", label: "스태거 단위", opts: opt.kineticBy },
    ],
  },
  cardsCascade: {
    label: "카드 캐스케이드",
    use: "나열. 3~9개",
    max: 9,
    fields: [
      { k: "text", key: "title", label: "제목" },
      items("items", "카드", { req: true }),
      { k: "number", key: "cols", label: "열 수", ph: "생략하면 개수와 화면비로 정한다" },
      { k: "select", key: "dir", label: "등장 방향", opts: opt.cardDir },
    ],
  },
  networkBuild: {
    label: "네트워크 빌드",
    use: "관계. 선이 그려지는 순서가 설명 순서다",
    max: 8,
    fields: [
      { k: "text", key: "title", label: "제목" },
      items("nodes", "노드", { req: true, extra: ["hub"], hint: "hub 를 켠 노드가 중앙에 온다" }),
      {
        k: "strings",
        key: "links",
        label: "연결",
        ph: "API Gateway>인증  (또는 0>2)",
        hint: "생략하면 hub 에 전부 연결한다",
      },
      { k: "bool", key: "flow", label: "흐름 점", hint: "선을 그린 뒤 그 위로 점이 흐른다" },
    ],
  },
  processFlow: {
    label: "프로세스 플로우",
    use: "순서. 3~6단계",
    max: 6,
    fields: [
      { k: "text", key: "title", label: "제목" },
      items("steps", "단계", { req: true }),
      { k: "bool", key: "vertical", label: "세로 배치", hint: "생략하면 화면비가 정한다" },
    ],
  },
  beforeAfter: {
    label: "비포 애프터",
    use: "대비. before 가 물러나며 after 가 켜진다",
    max: null,
    fields: [
      { k: "text", key: "title", label: "제목" },
      side("before", "BEFORE", "물러나는 쪽"),
      side("after", "AFTER", "켜지는 쪽"),
    ],
  },
  explodedDiagram: {
    label: "분해도",
    use: "층 구조. 겹쳐 있다가 제자리로 펼쳐진다",
    max: 6,
    fields: [
      { k: "text", key: "title", label: "제목" },
      items("layers", "층", { req: true }),
      { k: "bool", key: "reverse", label: "아래부터 펼침" },
    ],
  },
  zoomDetail: {
    label: "줌 디테일",
    use: "개요 → 한 항목 확대",
    max: 8,
    fields: [
      { k: "text", key: "title", label: "제목" },
      items("items", "항목", { req: true }),
      { k: "number", key: "focus", label: "확대할 항목 번호", hint: "0부터. 필수", ph: "0" },
      {
        k: "group",
        key: "detail",
        label: "상세 패널",
        hint: "확대된 뒤 옆에 붙는다",
        fields: [
          { k: "text", key: "title", label: "제목" },
          { k: "strings", key: "points", label: "포인트", ph: "한 줄에 하나" },
        ],
      },
    ],
  },
  dataCounter: {
    label: "데이터 카운터",
    use: "숫자가 목표값까지 올라간다. 1~4개",
    max: 4,
    fields: [
      { k: "text", key: "title", label: "제목" },
      { k: "text", key: "kicker", label: "키커" },
      { k: "text", key: "sub", label: "서브" },
      {
        k: "items",
        key: "stats",
        label: "지표",
        req: true,
        primary: "label",
        fields: ["value", "unit", "prefix", "dec", "icon", "note"],
      },
    ],
  },
  timeline: {
    label: "타임라인",
    use: "사건 순서. 축이 그려지는 방향이 시간의 방향",
    max: 6,
    fields: [
      { k: "text", key: "title", label: "제목" },
      {
        k: "items",
        key: "events",
        label: "사건",
        req: true,
        primary: "when",
        fields: ["label", "note", "icon", "tone"],
      },
      { k: "bool", key: "vertical", label: "세로 배치" },
    ],
  },
  splitCompare: {
    label: "스플릿 비교",
    use: "둘을 나란히. 가운데 선이 그려지고 양쪽이 들어온다",
    max: null,
    fields: [
      { k: "text", key: "title", label: "제목" },
      side("left", "왼쪽", ""),
      side("right", "오른쪽", ""),
    ],
  },
  convergence: {
    label: "수렴",
    use: "모이는 동작 자체가 메시지다",
    max: 7,
    fields: [
      { k: "text", key: "title", label: "제목" },
      items("sources", "원천", { req: true, hint: "3~7개" }),
      single("target", "도착점", "하나로 남는 것"),
    ],
  },
  divergence: {
    label: "발산",
    use: "하나에서 여럿이 뻗어 나간다",
    max: 7,
    fields: [
      { k: "text", key: "title", label: "제목" },
      single("source", "출발점", ""),
      items("targets", "도착점", { req: true }),
    ],
  },
  orbit: {
    label: "오빗",
    use: "중심과 위성. 회전은 무한 루프로 돈다",
    max: 10,
    fields: [
      { k: "text", key: "title", label: "제목" },
      single("center", "중심", ""),
      items("orbits", "위성", { req: true, extra: ["ring"], hint: "ring 으로 2중 궤도를 만든다" }),
      { k: "number", key: "spin", label: "한 바퀴(초)", ph: "26" },
    ],
  },
  matchCut: {
    label: "매치 컷",
    use: "연결의 가장 강한 수단. 앵커는 남고 텍스트만 갈린다",
    max: null,
    fields: [
      { k: "text", key: "anchor", label: "앵커", req: true, hint: "픽토그램 이름 또는 큰 글자" },
      {
        k: "icon",
        key: "anchorTo",
        label: "모프 대상",
        hint: "주면 앵커가 그 도형으로 변형된다(MorphSVG)",
      },
      {
        k: "group",
        key: "from",
        label: "이전",
        fields: [
          { k: "multiline", key: "title", label: "제목", rows: 2 },
          { k: "text", key: "sub", label: "서브" },
        ],
      },
      {
        k: "group",
        key: "to",
        label: "이후",
        req: true,
        fields: [
          { k: "multiline", key: "title", label: "제목", req: true, rows: 2 },
          { k: "text", key: "sub", label: "서브" },
        ],
      },
      { k: "bool", key: "morph", label: "앵커 회전·확대", def: true },
    ],
  },
  cameraJourney: {
    label: "카메라 여정",
    use: "넓은 판을 카메라가 순회한다. 3~5 정류장",
    max: 5,
    fields: [
      { k: "text", key: "title", label: "제목" },
      items("stops", "정류장", { req: true }),
      { k: "number", key: "zoom", label: "확대 배율", step: 0.1, ph: "1.9" },
    ],
  },
  marquee: {
    label: "마퀴",
    use: "끝없이 흐른다. 하나하나 볼 필요가 없을 때",
    max: null,
    fields: [
      { k: "text", key: "title", label: "제목" },
      items("items", "항목", { req: true }),
      { k: "number", key: "rows", label: "줄 수", ph: "1", hint: "줄마다 방향이 반대다" },
      { k: "number", key: "speed", label: "한 바퀴(초)", ph: "24" },
    ],
  },
  chart: {
    label: "차트",
    use: "수치를 형태로. 어떤 차트를 쓸지는 데이터의 일이 정한다",
    max: null,
    fields: [
      { k: "select", key: "chart", label: "차트", req: true, opts: opt.chart },
      { k: "text", key: "title", label: "제목", hint: "차트 제목은 결론이다" },
      { k: "chartdata", key: "data", label: "데이터" },
      { k: "text", key: "caption", label: "캡션" },
    ],
  },
  deviceShow: {
    label: "디바이스 쇼케이스",
    use: '"이건 실제 화면이다" 를 프레임이 대신 말한다',
    max: null,
    fields: [
      { k: "text", key: "title", label: "제목" },
      { k: "select", key: "frame", label: "프레임", opts: opt.frame },
      {
        k: "group",
        key: "screen",
        label: "화면 안",
        hint: "줄·항목은 7개까지. 넘으면 화면이 아니라 문서가 된다",
        fields: [
          { k: "text", key: "title", label: "화면 제목" },
          {
            k: "strings",
            key: "lines",
            label: "줄",
            ph: "terminal 은 $ 로 시작하면 명령으로 본다",
          },
          items("items", "항목", {}),
          { k: "select", key: "art", label: "일러스트", opts: opt.art },
        ],
      },
      { k: "text", key: "caption", label: "캡션" },
    ],
  },
  quote: {
    label: "인용",
    use: "말 한 줄에 화면을 다 준다. 호흡을 끊는 씬으로도 쓴다",
    max: null,
    fields: [
      { k: "multiline", key: "text", label: "인용문", req: true, rows: 3 },
      { k: "text", key: "by", label: "말한 사람" },
      { k: "text", key: "role", label: "역할·맥락" },
      { k: "icon", key: "icon", label: "아이콘" },
    ],
  },
};

/** 모든 패턴이 받는 공통 필드 — 폼 하단 "씬 공통" 에 그린다. */
export const COMMON_FIELDS: Field[] = [
  { k: "text", key: "id", label: "씬 id", hint: "생략하면 title 에서 만든다" },
  {
    k: "text",
    key: "purpose",
    label: "용도(purpose)",
    hint: "쓰다 막히면 그 씬은 필요 없는 씬이다",
  },
  {
    k: "multiline",
    key: "notes",
    label: "발표자 노트",
    rows: 3,
    hint: "--present 산출물에만 실린다",
  },
  {
    k: "multiline",
    key: "say",
    label: "대사(say)",
    rows: 3,
    hint: "--subs 로 빌드할 때 자막에서 이 글자를 찾아 씬 시작·길이를 실측으로 정한다",
  },
  {
    k: "number",
    key: "hold",
    label: "머무는 시간(초)",
    hint: "생략하면 글자 수로 추정. 자막에 맞추면 무시된다",
    step: 0.1,
  },
  { k: "select", key: "transition", label: "트랜지션", opts: () => GG.transitions },
  { k: "select", key: "mark", label: "제목 강조 마크", opts: () => GG.marks, hint: "한 씬에 하나" },
  { k: "select", key: "art", label: "일러스트", opts: () => GG.arts },
  {
    k: "select",
    key: "textFx",
    label: "글자 효과",
    opts: () => ({ scramble: "scramble — 섞이다 정렬", roll: "roll — 굴러 교체(matchCut 전용)" }),
  },
  {
    k: "strings",
    key: "decor",
    label: "배경 레이어",
    ph: "blob / grid …  한 줄에 하나(겹친다)",
    hint: "생략하면 루트 → 테마 기본",
  },
  {
    k: "select",
    key: "decorLevel",
    label: "배경 세기",
    opts: () => ({ "0": "0 — 약", "1": "1 — 기본", "2": "2 — 강" }),
  },
];

/** 새 씬의 기본값 — 필수 필드가 비어 검증 오류부터 뜨지 않게 최소 뼈대를 채운다. */
export function blankScene(pattern: string): Record<string, unknown> {
  const s: Record<string, unknown> = { pattern };
  switch (pattern) {
    case "heroReveal":
      s.title = "제목";
      break;
    case "kineticType":
      s.lines = ["첫 줄", { text: "강조할 줄", emphasis: true }];
      break;
    case "cardsCascade":
      s.title = "제목";
      s.items = ["항목 1", "항목 2", "항목 3"];
      break;
    case "networkBuild":
      s.title = "제목";
      s.nodes = [{ label: "중심", hub: true }, { label: "노드 1" }, { label: "노드 2" }];
      break;
    case "processFlow":
      s.title = "제목";
      s.steps = ["1단계", "2단계", "3단계"];
      break;
    case "beforeAfter":
      s.title = "제목";
      s.before = { label: "BEFORE", items: ["지금은 이렇다"] };
      s.after = { label: "AFTER", items: ["이렇게 바뀐다"] };
      break;
    case "explodedDiagram":
      s.title = "제목";
      s.layers = ["층 1", "층 2", "층 3"];
      break;
    case "zoomDetail":
      s.title = "제목";
      s.items = ["항목 1", "항목 2", "항목 3"];
      s.focus = 1;
      s.detail = { title: "상세", points: ["포인트 1"] };
      break;
    case "dataCounter":
      s.title = "제목";
      s.stats = [{ value: 41, unit: "%", label: "지표" }];
      break;
    case "timeline":
      s.title = "제목";
      s.events = [{ when: "1월", label: "사건" }];
      break;
    case "splitCompare":
      s.title = "제목";
      s.left = { label: "왼쪽", items: ["항목"] };
      s.right = { label: "오른쪽", items: ["항목"] };
      break;
    case "convergence":
      s.title = "제목";
      s.sources = ["원천 1", "원천 2", "원천 3"];
      s.target = { label: "도착점" };
      break;
    case "divergence":
      s.title = "제목";
      s.source = { label: "출발점" };
      s.targets = ["도착 1", "도착 2", "도착 3"];
      break;
    case "orbit":
      s.title = "제목";
      s.center = { label: "중심" };
      s.orbits = ["위성 1", "위성 2", "위성 3"];
      break;
    case "matchCut":
      s.anchor = "question";
      s.from = { title: "이전" };
      s.to = { title: "이후" };
      break;
    case "cameraJourney":
      s.title = "제목";
      s.stops = ["정류장 1", "정류장 2", "정류장 3"];
      break;
    case "marquee":
      s.title = "제목";
      s.items = ["항목 1", "항목 2", "항목 3", "항목 4"];
      break;
    case "chart":
      s.chart = "bar";
      s.title = "제목";
      s.data = {
        items: [
          { label: "1월", value: 12 },
          { label: "2월", value: 18 },
        ],
      };
      break;
    case "deviceShow":
      s.title = "제목";
      s.frame = "browser";
      s.screen = { title: "화면", items: ["항목 1"] };
      break;
    case "quote":
      s.text = "인용문";
      break;
  }
  return s;
}
