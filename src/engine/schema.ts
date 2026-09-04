/**
 * 패턴 28종의 편집 스키마.
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
  | "values"
  | "highlight"
  | "scale"
  | "correct"
  | "rank";

export type Field =
  /** numeric: "3" 처럼 숫자로 읽히면 number 로 저장한다 — chapterCard.no 는 숫자일 때만 01 패딩·current 기본값이 된다 */
  | { k: "text"; key: string; label: string; hint?: string; req?: boolean; numeric?: boolean }
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
      /** 이 배열만의 상한. 없으면 패턴의 max(밀도 상한)를, null 이면 상한 없음 */
      max?: number | null;
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
  rankOrder: () => ({
    countdown: "countdown — 낮은 순위부터(기본)",
    up: "up — 적은 순서대로",
  }),
};

/** 항목 배열을 쓰는 패턴은 이 헬퍼로 정의한다. */
function items(
  key: string,
  label: string,
  o: {
    req?: boolean;
    hint?: string;
    max?: number | null;
    primary?: ItemFieldKey;
    extra?: ItemFieldKey[];
  } = {},
): Field {
  return {
    k: "items",
    key,
    label,
    req: o.req,
    hint: o.hint,
    max: o.max,
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

/** target · source · center 처럼 항목 하나짜리 객체. 엔진은 문자열도 같은 뜻으로 받는다 */
function single(
  key: string,
  label: string,
  hint: string,
  o: { req?: boolean; icon?: boolean } = {},
): Field {
  return {
    k: "group",
    key,
    label,
    hint,
    req: o.req ?? true,
    fields: [
      { k: "text", key: "label", label: "라벨", req: true },
      ...(o.icon === false ? [] : [{ k: "icon", key: "icon", label: "아이콘" } as Field]),
      { k: "text", key: "note", label: "노트" },
    ],
  };
}

/** 헤더 블록(kicker · sub) — 엔진의 head() 가 title 과 함께 읽는다. title 옆에 spread 한다 */
const HEAD_FIELDS: Field[] = [
  { k: "text", key: "kicker", label: "키커", hint: "제목 위 작은 한 줄" },
  { k: "text", key: "sub", label: "서브", hint: "제목 아래 한 줄" },
];

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
      ...HEAD_FIELDS,
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
      ...HEAD_FIELDS,
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
      ...HEAD_FIELDS,
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
      ...HEAD_FIELDS,
      items("steps", "단계", { req: true }),
      { k: "bool", key: "vertical", label: "세로 배치", hint: "생략하면 화면비가 정한다" },
    ],
  },
  beforeAfter: {
    label: "비포 애프터",
    use: "대비. before 는 그대로 남고 after 가 강조되며 올라선다",
    max: null,
    fields: [
      { k: "text", key: "title", label: "제목" },
      ...HEAD_FIELDS,
      side("before", "BEFORE", "그대로 남는 쪽"),
      side("after", "AFTER", "링이 감기며 강조되는 쪽"),
    ],
  },
  explodedDiagram: {
    label: "분해도",
    use: "층 구조. 겹쳐 있다가 제자리로 펼쳐진다",
    max: 6,
    fields: [
      { k: "text", key: "title", label: "제목" },
      ...HEAD_FIELDS,
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
      ...HEAD_FIELDS,
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
      ...HEAD_FIELDS,
      {
        k: "select",
        key: "numFx",
        label: "숫자 표기",
        opts: () => GG.numFx,
        hint: "count(기본) — 값이 흘러 올라간다 · roll — 자리마다 0~9 띠가 굴러 멈춘다",
      },
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
      ...HEAD_FIELDS,
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
      ...HEAD_FIELDS,
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
      ...HEAD_FIELDS,
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
      ...HEAD_FIELDS,
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
      ...HEAD_FIELDS,
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
      ...HEAD_FIELDS,
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
      ...HEAD_FIELDS,
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
      ...HEAD_FIELDS,
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
      ...HEAD_FIELDS,
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
          /* 프레임 안 상한은 엔진의 MAXSCREEN(7) — 패턴 max 와 별개다 */
          items("items", "항목", { max: 7 }),
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
  funnel: {
    label: "퍼널",
    use: "단계마다 걸러져 줄어든다. 마지막 단이 결론이다",
    max: 6,
    fields: [
      { k: "text", key: "title", label: "제목" },
      ...HEAD_FIELDS,
      items("stages", "단", { req: true, extra: ["value", "unit"] }),
      { k: "text", key: "unit", label: "공통 단위", hint: "단별 unit 이 이긴다" },
      { k: "bool", key: "rates", label: "통과율 표시", def: true, hint: "단 사이 ↓ %" },
    ],
  },
  cycle: {
    label: "사이클",
    use: "순환·플라이휠. 마지막 화살표가 고리를 닫는다",
    max: 6,
    fields: [
      { k: "text", key: "title", label: "제목" },
      ...HEAD_FIELDS,
      items("steps", "단계", { req: true }),
      single("center", "중심", "고리 한가운데. 생략 가능", { req: false }),
    ],
  },
  anatomy: {
    label: "해부도",
    use: "중앙 비주얼의 부위를 지시선으로 짚는다",
    max: 6,
    fields: [
      { k: "text", key: "title", label: "제목" },
      ...HEAD_FIELDS,
      {
        k: "select",
        key: "art",
        label: "일러스트",
        opts: opt.art,
        hint: "art 또는 아이콘 중 하나는 필수",
      },
      { k: "icon", key: "icon", label: "아이콘", hint: "art 가 없을 때 크게 드로우된다" },
      items("parts", "부위", { req: true }),
    ],
  },
  featureMatrix: {
    label: "기능 매트릭스",
    use: "행이 기준, 열이 후보. highlight 열에 링이 감긴다",
    max: 6,
    fields: [
      { k: "text", key: "title", label: "제목" },
      ...HEAD_FIELDS,
      {
        k: "items",
        key: "cols",
        label: "열(후보)",
        req: true,
        max: 4,
        primary: "label",
        fields: ["icon", "highlight"],
        hint: "4개까지. highlight 를 켠 열이 주인공",
      },
      {
        k: "items",
        key: "rows",
        label: "행(기준)",
        req: true,
        primary: "label",
        fields: ["values", "say"],
        hint: "값은 열 순서대로. O·X 또는 글자",
      },
    ],
  },
  chapterCard: {
    label: "챕터 카드",
    use: '유튜브 영상의 장 구분. 번호와 진행 레일이 "전체 중 지금 여기"를 말해 준다',
    max: 6,
    fields: [
      { k: "text", key: "title", label: "제목", req: true },
      {
        k: "text",
        key: "no",
        label: "장 번호",
        numeric: true,
        hint: "숫자면 01 로 채운다, PART 3 처럼 글자도 된다",
      },
      ...HEAD_FIELDS,
      {
        k: "strings",
        key: "chapters",
        label: "전체 장 이름",
        ph: "한 줄에 하나",
        hint: "칸에 다 들어갈 때만 전부 적는다. 넘치면 비우고 현재 장 이름만 나온다",
      },
      { k: "number", key: "of", label: "전체 장 수", hint: "장 이름 없이 칸만 그릴 때" },
      { k: "number", key: "current", label: "현재 장", hint: "1부터. 기본값은 숫자 장 번호" },
    ],
  },
  rankList: {
    label: "랭킹",
    use: "Top N 순위. 카운트다운으로 열고 1위에 링이 감기며 멈춘다",
    max: 6,
    fields: [
      { k: "text", key: "title", label: "제목" },
      ...HEAD_FIELDS,
      items("items", "항목", {
        req: true,
        extra: ["value", "unit", "rank"],
        hint: "1위부터 순서대로. 자리는 순위가 정한다",
      }),
      { k: "text", key: "unit", label: "공통 단위", hint: "항목의 unit 이 이긴다" },
      { k: "select", key: "order", label: "열리는 순서", opts: opt.rankOrder },
      { k: "bool", key: "top", label: "1위 강조", def: true },
    ],
  },
  quizReveal: {
    label: "퀴즈",
    use: "질문 → 선택지 → 정답. 선택지 뒤의 정지가 이 패턴의 핵이다",
    max: 4,
    fields: [
      { k: "multiline", key: "question", label: "질문", req: true, rows: 2 },
      ...HEAD_FIELDS,
      {
        k: "items",
        key: "options",
        label: "선택지",
        primary: "label",
        fields: ["icon", "correct", "note", "say"],
        hint: "4개까지. 정답 하나에 correct 를 켠다",
      },
      /* 엔진은 문자열과 {label,note} 를 다 받는다 — 아이콘은 그리지 않으므로 뺀다 */
      single(
        "answer",
        "정답",
        '체크 표시와 함께 열린다 — 라벨에는 선택지 글자를 그대로 쓰지 말고 "왜 그런가"를, 노트에는 덧붙일 설명을 적는다',
        { req: false, icon: false },
      ),
      {
        k: "number",
        key: "beat",
        label: "생각할 틈",
        step: 0.1,
        hint: "선택지 뒤 생각할 틈(초). 기본 1.2",
      },
      { k: "bool", key: "reveal", label: "정답 공개", def: true },
    ],
  },
  endCard: {
    label: "엔드카드",
    use: "영상의 마지막 씬. 구독 청하기와 다음 영상 권하기를 한 화면에서 끝낸다",
    max: 2,
    fields: [
      { k: "text", key: "title", label: "제목", req: true },
      ...HEAD_FIELDS,
      {
        k: "items",
        key: "cta",
        label: "행동 요청",
        /* 밀도 상한(next 2개)은 cta 에 걸리지 않는다 — 기본값부터 셋이다 */
        max: null,
        primary: "label",
        fields: ["icon"],
        hint: "비우면 구독·좋아요·알림",
      },
      items("next", "다음 볼 것", { hint: "다음 볼 것. 2개까지" }),
      { k: "text", key: "handle", label: "채널", hint: "채널 이름" },
    ],
  },
};

/**
 * 공통 필드가 씬 폼의 어느 자리에 그려지는지.
 * design — 비주얼 바의 칩(팝오버 안) · fx — 연출 줄 · meta — 접히는 타이밍·대사·노트
 */
export type CommonGroup = "design" | "fx" | "meta";
export type CommonField = Field & { group: CommonGroup };

/**
 * 모든 패턴이 받는 공통 필드 — SceneForm 이 group 별로 FieldRenderer 로 그리고,
 * patternChange 가 "패턴을 바꿔도 남는 키" 로 쓴다. 두 곳의 유일한 소스다.
 */
export const COMMON_FIELDS: CommonField[] = [
  /* decorLevel 은 decor 편집기가 세기 알약으로 함께 그린다 — 따로 필드를 두지 않는다 */
  {
    k: "strings",
    key: "decor",
    label: "배경 레이어",
    ph: "blob / grid …  한 줄에 하나(겹친다)",
    hint: "비워두면 문서 테마의 기본 배경이 적용된다",
    group: "design",
  },
  {
    k: "select",
    key: "mark",
    label: "제목 강조 마크",
    opts: () => GG.marks,
    hint: "한 씬에 하나. 단어나 숫자에 밑줄·원·배지·스탬프를 입힌다",
    group: "design",
  },
  {
    k: "select",
    key: "art",
    label: "일러스트",
    opts: () => GG.arts,
    hint: "씬 상단·중앙에 놓이는 테마 색 연동 추상 도형 일러스트",
    group: "design",
  },
  {
    k: "select",
    key: "transition",
    label: "트랜지션",
    opts: () => GG.transitions,
    hint: "이전 씬에서 넘어오는 화면 전환. 비우면 fade(첫 씬은 cut)",
    group: "fx",
  },
  {
    k: "select",
    key: "cam",
    label: "카메라(cam)",
    opts: () => GG.cams,
    hint: "비워두면 패턴에 맞는 카메라를 자동으로 고른다. 씬 전체 길이 동안 아주 느리게 움직여 정지 프레임을 없앤다",
    group: "fx",
  },
  {
    k: "select",
    key: "textFx",
    label: "글자 효과",
    opts: () => GG.textFx,
    hint: "제목·kineticType·quote 의 등장 방식. 제목 안의 *낱말* 은 그 낱말만 강조한다",
    group: "fx",
  },
  {
    k: "select",
    key: "exitFx",
    label: "글자 퇴장",
    opts: () => GG.exitFx,
    hint: "트랜지션 전에 글자만 먼저 나간다. typewriter(백스페이스)는 글자 효과도 typewriter 여야 한다",
    group: "fx",
  },
  {
    k: "multiline",
    key: "say",
    label: "대사(say)",
    rows: 3,
    hint: "내레이션·자막과 일치할 대사. --subs 로 빌드할 때 자막에서 이 글자를 찾아 씬 시작·길이를 실측으로 정한다",
    group: "meta",
  },
  {
    k: "number",
    key: "hold",
    label: "머무는 시간(초, hold)",
    step: 0.1,
    ph: "생략하면 글자 수로 추정",
    hint: "내용이 다 나온 뒤 머무는 시간. 자막에 맞추면 무시된다",
    group: "meta",
  },
  {
    k: "text",
    key: "purpose",
    label: "용도(purpose)",
    hint: "이 씬의 핵심 전달 목적 한 줄. 쓰다 막히면 그 씬은 필요 없는 씬이다",
    group: "meta",
  },
  {
    k: "multiline",
    key: "notes",
    label: "발표자 노트(notes)",
    rows: 3,
    hint: "--present 산출물의 발표자 화면에만 실린다",
    group: "meta",
  },
  {
    k: "text",
    key: "id",
    label: "씬 id",
    hint: "s1 · problem 처럼. 생략하면 title 에서 만든다",
    group: "meta",
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
    case "funnel":
      s.title = "제목";
      s.stages = [
        { label: "1단", value: 1000 },
        { label: "2단", value: 420 },
        { label: "3단", value: 90 },
      ];
      break;
    case "cycle":
      s.title = "제목";
      s.steps = ["1단계", "2단계", "3단계"];
      break;
    case "anatomy":
      s.title = "제목";
      s.icon = "database";
      s.parts = [{ label: "부위 1" }, { label: "부위 2" }];
      break;
    case "featureMatrix":
      s.title = "제목";
      s.cols = [{ label: "후보 A" }, { label: "후보 B", highlight: true }];
      s.rows = [
        { label: "기준 1", values: [false, true] },
        { label: "기준 2", values: ["6주", "2일"] },
      ];
      break;
    case "chapterCard":
      s.title = "장 제목";
      s.no = 1;
      s.chapters = ["첫째 장", "둘째 장", "셋째 장"];
      break;
    case "rankList":
      s.title = "제목";
      s.items = [
        { label: "1위 항목", value: 92 },
        { label: "2위 항목", value: 74 },
        { label: "3위 항목", value: 51 },
      ];
      break;
    case "quizReveal":
      s.question = "질문";
      s.options = [
        { label: "선택지 A" },
        { label: "선택지 B", correct: true },
        { label: "선택지 C" },
      ];
      /* answer 를 정답 라벨과 같게 쓰면 엔진이 경고한다 — "왜 그런가"를 적는 자리다 */
      s.answer = "B 가 정답인 이유";
      break;
    case "endCard":
      s.title = "제목";
      s.next = [{ label: "다음 영상" }];
      break;
  }
  return s;
}
