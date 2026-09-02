# spec — 스펙 JSON 필드

**좌표와 타이밍은 쓸 수 없고 쓸 필요도 없다.** 배치·크기·이징·스태거는 엔진이
테마·화면비·에너지에서 계산한다. 스펙에는 **무슨 내용을 어떤 패턴으로** 만 쓴다.

## 루트

```jsonc
{
  "title":   "산출물 제목",              // <title>, 접근성 라벨
  "message": "이 영상이 남길 한 줄",       // 필수는 아니지만 없으면 경고. 씬 구성의 검증 기준
  "theme":   "midnight",                // midnight ink paper mono neon warm
  "skin":    "glass",                   // 표면·선·타이포의 구현부. 6종 (`gm info skins`). 테마와 직교
  "aspect":  "16:9",                    // 16:9 9:16 1:1 4:5
  "energy":  "E2",                      // E1 차분 · E2 표준 · E3 하이에너지
  "font":    "display",                 // 10종. 생략하면 테마가 정한다 (`gm info fonts`)
  "mode":    "autoplay",                // autoplay loop step
  "audio":   { "offset": 0, "volume": 1 }, // 음성을 얹을 때만. 파일은 --audio 로 준다
  "design":  { /* 아래 */ },            // 이 스펙에서만 쓰는 커스텀 요소 정의
  "scenes":  [ /* 아래 */ ]
}
```

`audio.offset` 은 **음성 안에서 첫 대사가 시작하는 시각**이다. 녹음 앞에 여백이
있으면 그만큼 적는다.

`skin` 은 색이 아니라 **재질**을 정한다 — 테마가 색을 정하고 스킨이 표면·선·타이포의
모양을 정하므로 둘은 곱해서 쓴다(테마 15종 × 스킨 6종). 생략하면 테마가 정한 기본
스킨이고, 그것도 없으면 `glass` 다. 자세한 것은 `theming.md` 의 스킨 절을 본다.

## design — 이 스펙에서만 쓰는 커스텀 요소

기본 요소(테마 15 · 스킨 6 · 픽토그램 191 · 벡터 79)로 안 되면 여기에 정의한다.
**정의가 스펙 안에 있으므로 CLI 로 빌드해도, 남에게 넘겨도 같은 모습이 나온다** —
이름만 참조하면 그 요소가 없는 곳에서 조용히 기본값으로 떨어진다.

```jsonc
{
  "theme": "myBrand",              // 아래 정의를 이름으로 가리킨다
  "skin":  "myBrand",
  "design": {
    "themes": { "myBrand": {
      "label": "우리 브랜드", "font": "neo",
      "bg": "#0b1020", "bg2": "#141b33", "ink": "#eef2ff", "ink2": "#a9b4d6", "dim": "#8290b5",
      "accent": "#ff7a45", "accent2": "#3ddc97", "good": "#3ddc97", "warn": "#ffb020", "bad": "#ff5470"
    } },
    "skins":  { "myBrand": { "extends": "flat", "vars": { "r-lg": "4px", "surf-line": "#ff7a45" } } },
    "icons":  { "myLogo": { "path": "M12 2 L22 20 L2 20 Z", "aliases": ["우리로고"] } },
    "arts":   { "myArt":  { "label": "우리 그림", "svg": "<circle cx='100' cy='100' r='62' stroke='{accent}' fill='none'/>" } },
    "marks":  { "myMark": { "label": "우리 밑줄", "where": "under", "svg": "<path d='M0 8 L100 6' stroke='{accent}'/>" } },
    "decors": { "myBg":   { "label": "우리 배경", "svg": "<rect width='{W}' height='{H}' fill='{bg}'/>" } },
    "frames": { "myFrame":{ "label": "우리 프레임", "ratio": 1.6, "svg": "<rect width='{W}' height='{H}' stroke='{ink}' fill='none'/>" } }
  }
}
```

| 갈래 | 필수 | 좌표계 |
|---|---|---|
| `themes` | 색 10종(`bg` `bg2` `ink` `ink2` `dim` `accent` `accent2` `good` `warn` `bad`) | — |
| `skins` | 없음 (`extends` 한 스킨에서 물려받는다) | — |
| `icons` | `path` | **24×24** path d |
| `arts` | `svg` | **200×200** |
| `marks` | `svg` · `where` | 붙는 글자 기준 상대 박스 |
| `decors` | `svg` | `{W}`×`{H}` (화면 전체) |
| `frames` | `svg` | `{W}`×`{H}`, `ratio` 로 가로세로비 |

**SVG 는 템플릿이다.** `{accent}` `{accent2}` `{ink}` `{ink2}` `{dim}` `{bg}` `{bg2}`
`{good}` `{warn}` `{bad}` `{line}` `{panel}` `{pline}` 자리가 테마 색으로 채워지고,
`{W}` `{H}` 는 화면 크기, `decors` 는 `{lv}`(세기 0·1·2), `marks` 는 `{text}` 를 더 받는다.
그래서 커스텀 요소도 **테마를 바꾸면 색이 따라온다.** 통째 `<svg>` 를 줘도 되고
조각만 줘도 껍데기를 씌워 준다.

`design` 의 정의는 **그 빌드 동안만** 유효하다 — 기본 요소와 이름이 겹쳐도
(`"midnight"` 을 재정의해도) 다음 빌드에는 기본 요소가 돌아온다.

앱(디자인 스튜디오)의 커스텀 라이브러리와 **키가 같다** — 라이브러리 내보내기 JSON 을
`design` 에 그대로 붙일 수 있고, 앱은 스펙이 참조하는 정의를 자동으로 여기에 심는다.

## 씬 공통

모든 씬이 받는다.

| 필드 | 뜻 |
|---|---|
| `pattern` | **필수.** 24종 중 하나 (`gm info patterns`) |
| `id` | 씬 식별자. 생략하면 title 에서 만든다 |
| `purpose` | 이 씬이 무엇을 하는 씬인지. 타임코드 시트에 남고, **쓰다 막히면 그 씬은 필요 없는 씬이다** |
| `hold` | 내용이 다 나온 뒤 머무는 초. 생략하면 글자 수로 추정한다. **자막에 맞추면 무시된다** |
| `say` | **이 씬에서 말하는 대사.** `--subs` 로 빌드할 때 이 글자를 자막에서 찾아 씬의 시작과 길이를 실측으로 정한다 |
| `transition` | 앞 씬에서 넘어오는 방식. 첫 씬은 무시 |
| `decor` | 배경 레이어. 이름 또는 배열(`["blob","grid"]`)로 겹친다. `false` 면 없음. 생략하면 루트 → 테마 기본 |
| `decorLevel` | 배경 세기 `0`(약) `1`(기본) `2`(강) |
| `skin` | **이 씬만 재질을 갈아 끼운다.** 스킨 이름 또는 인라인 정의. 생략하면 루트 `skin` |
| `textFx` | 글자 등장 방식. `scramble`(섞이다 정렬) · `roll`(굴러 교체, `matchCut` 전용) |
| `mark` | 제목에 붙는 강조. `"underline"` `"circle"` `"highlight"` 등. `"badge:NEW"` 처럼 값도 준다 |
| `art` | 추상 일러스트 48종. 씬 단위로는 `heroReveal` 이 받는다 — `icon` 과 배타로 둘 중 하나만 쓴다 |
| `notes` | **발표자 노트.** `--present` 로 빌드했을 때 발표자 창에 뜬다. 여러 줄 가능(`\n`). 없으면 `purpose` 를 대신 쓴다 |
| `title` `kicker` `sub` | 헤더. 패턴 대부분이 지원 (`kineticType` `matchCut` `quote` 제외) |

`title` 에 `\n` 을 쓰면 줄이 나뉘고 **줄 단위 마스크 리빌**이 걸린다.

트랜지션: `cut` `fade` `pushLeft` `pushRight` `pushUp` `zoomIn` `zoomOut` `wipe` `match` `curve` `pageFlip` `paperPeel` `curlWipe` `clayPop` `squish`

`notes` 는 일반 빌드 산출물에 들어가지 않는다 — 발표용(`--present`)에만 실린다.
청중에게 보일 파일에 발표 대사가 남지 않는다.

## 자막에 맞추기 — `say`

녹음이 끝나 자막(SRT·VTT)이 있으면 화면을 목소리에 맞출 수 있다. 씬마다 `say` 를
적고 `--subs` 로 빌드하면 씬의 시작·길이가 실측으로 바뀐다.

```jsonc
{ "pattern": "dataCounter",
  // 씬에서 말하는 전체 대사를 자막 원문 그대로 적는다
  "say": "시작 자본은 백만 원이고 거래는 모두 열 번이라고 가정하겠습니다. 열 번째 거래에서 백만 원을 잃으면 남는 돈은 구만 원입니다.",
  "stats": [
    { "value": 100, "unit": "만 원", "label": "시작 자본" },
    { "value": 9,  "unit": "만 원", "label": "열 번째 거래 뒤" }
  ] }
```

지켜야 할 핵심 원칙:

1. **`say` 는 씬 단위로 적는다.** 씬 내부의 항목마다 복잡하게 대사를 쪼개지 않고, 씬 전체 대사를 자막 원문 그대로 적으면 씬의 시작과 길이가 자막에 정렬되고 내부는 패턴 고유의 완성도 높은 코레오그래피로 재생된다.
2. **`say` 는 자막의 연속 구간이어야 한다.** 중간 문장을 건너뛰고 이어 붙이면 정렬이 깨진다. 표현이 조금 달라지는 건(어미·조사·오탈자) 견디지만, 문장을 빼면 못 찾는다.
3. **긴 대사는 씬을 쪼갠다.** 씬 하나가 5~15초 대사를 덮을 때 가장 자연스럽다. 대사가 20초를 넘어가면 항목별로 `say`를 나누지 말고 씬을 2~3개로 분할하여 리듬을 만든다.

## 항목 표기

항목 배열은 **문자열이나 객체 둘 다** 받는다.

```jsonc
"items": ["Slack", "Jira"]                                    // 라벨만
"items": [{ "label": "Slack", "icon": "채팅", "note": "결정은 스레드 안에" }]
```

객체 공통 필드: `label` `icon` `note` `value` `tone` `badge` `ribbon` `art` `spark`
`tone` 은 `good` `bad` `warn` `dim` — 테두리·아이콘·값 색이 바뀐다.
`badge` 는 우상단 알약(`"NEW"`), `ribbon` 은 좌상단 띠(`"핵심"`), `spark` 는 카드 안 미니 추이선(`[3,5,4,8]`)이다.

### `art` — 일러스트를 어디에 놓나

`art` 는 자리에 따라 역할이 둘로 갈린다. **같은 이름표를 쓰지만 하는 일이 다르다.**

| 자리 | 역할 | 패턴 |
|---|---|---|
| **아이콘 자리를 대신한다** | `icon` 대신 일러스트가 주인공이 된다. 픽토그램보다 크게 놓인다 | `heroReveal`(`art`) · `processFlow`(`steps[].art`) · `explodedDiagram`(`layers[].art`) · `beforeAfter`(`before/after.art`) · `splitCompare`(`left/right.art`) · `convergence`(`target.art`) · `divergence`(`source.art`) · `orbit`(`center.art`) · `matchCut`(`anchor.art`) · `deviceShow`(`screen.art`) |
| **카드 뒤에 깔린다** | `icon` 과 **함께** 쓴다. 아이콘이 앞에서 뜻을 잡고 일러스트가 뒤에서 분위기를 만든다 | `cardsCascade` · `zoomDetail` 의 `items[].art` |

```jsonc
// 아이콘 자리를 대신 — 일러스트가 주인공
{ "pattern": "convergence", "sources": ["로그","지표","추적"],
  "target": { "label": "관측", "art": "dashboard" } }

// 카드 뒤 — 아이콘과 함께 쓴다
{ "pattern": "cardsCascade", "items": [
  { "label": "협업", "icon": "users", "art": "collab" }] }
```

`matchCut` 의 `anchorTo`(앵커 모프)는 **아이콘 앵커에서만** 동작한다 — 일러스트는 도형이
여러 개라 모프를 못 탄다. 대신 조각이 차례로 서는 등장을 받는다.

### 이야기 축으로 고르기

일러스트 48종은 서사 기능으로 나뉜다. **갈등을 그릴 그림이 있어야 이야기가 선다** —
성장·성과만 있으면 화면이 계속 좋은 소식만 말한다.

| 서사 위치 | 일러스트 |
|---|---|
| **문제 · 갈등** | `bottleneck`(정체) `warning`(위험) `decline`(감소) `maze`(시행착오) `fracture`(분열) |
| **선택 · 전환** | `crossroad`(기로) `bridge`(연결) `agreement`(합의) `puzzle` `balance` |
| **사람 · 조직** | `team` `customer` `collab` `learning` |
| **수단 · 실행** | `gears` `flow` `pipeline` 계열 · `codeBlock` `server` `cloud` `aiBrain` |
| **경제 · 자본** | `market`(캔들) `coinStack`(자금) `vault` `pieChart3d` |
| **여정 · 확산** | `roadmap`(단계) `megaphone`(확산) `globe`(글로벌) `rocket` `telescope` |
| **결과 · 성과** | `growth` `trophy` `flagPeak` `target` `sparkleMagic` |

`warning` `decline` `fracture` `maze` 는 테마의 `warn`·`bad` 색을 쓴다 — 나머지가 강조색을
쓰는 것과 달리, 색만으로도 "여기가 나쁜 대목"이 읽힌다.

**벡터 이름은 기억으로 쓰지 않는다.** 픽토그램 191종 + 벡터 세트 102종이 있고 한글 이름도 따로 있다:

```bash
node <skill>/assets/gm.js icons 채팅       # 픽토그램 — speech(메시지·채팅·댓글)
node <skill>/assets/gm.js info decor       # 배경 20종
node <skill>/assets/gm.js info mark        # 강조 15종
node <skill>/assets/gm.js info frame       # 디바이스·실물 프레임 19종
node <skill>/assets/gm.js info art         # 일러스트 48종
node <skill>/assets/gm.js info chart       # 차트 17종
```

없는 이름을 쓰면 validate 가 **가능한 목록을 보여주며 오류**로 잡는다. 조용히 사라지지 않는다.

---

# 패턴 24종

## heroReveal — 히어로 리빌
오프닝·클로징. 한 씬에 메시지 하나.

```jsonc
{ "pattern": "heroReveal",
  "title": "찾는 시간을\n만드는 시간으로",   // 필수
  "kicker": "Single Source of Truth",
  "sub": "다음 스프린트부터",
  "icon": "database",                    // 있으면 선으로 그려지며 등장(DrawSVG)
  "rule": true }                         // 룰라인. 기본 true
```

## kineticType — 키네틱 타이포
글자가 주인공. 헤더 필드 대신 `lines` 를 쓴다.

```jsonc
{ "pattern": "kineticType",
  "lines": [                             // 필수
    "정보는",
    { "text": "어디에나 있다", "emphasis": true, "scale": 1.4 },
    "필요한 곳만 빼고"
  ],
  "mode": "stack",                       // stack 쌓임(기본) · cut 한 줄씩 교체
  "by": "words" }                        // words(기본) · chars — 글자 단위 스태거
```

`emphasis` 는 accent 색 + 1.34배 + 글자 단위 등장. `mode:"cut"` 은 E3 의 기본값이고
**쇼츠 훅**에 쓴다. 줄 6개까지.

**한 줄은 한 줄로 나온다.** 줄이 화면 폭을 넘으면 엔진이 그 줄만 글자를 줄여 한 줄을
지킨다(원래 크기의 .62배까지). 그보다 길면 접히는데, 접혀도 다음 줄과 겹치지는 않지만
리듬이 무너지므로 validate 가 짧게 끊으라고 짚는다. `emphasis` 는 1.34배라 같은 글자 수라도
먼저 넘친다 — 강조할 줄은 특히 짧게 쓴다.

## cardsCascade — 카드 캐스케이드
나열. 3~9개.

```jsonc
{ "pattern": "cardsCascade",
  "title": "답은 네 곳에 나뉘어 있다",
  "items": [ { "label": "Slack", "icon": "채팅", "note": "결정은 스레드 안에" } ],
  "cols": 4,                             // 생략하면 개수와 화면비로 정한다
  "dir": "up" }                          // up(기본) · left · scale · stack(겹쳐 있다가 흩어진다)
```

## networkBuild — 네트워크 빌드
관계. 노드가 먼저, 선이 나중. **선이 그려지는 순서가 설명 순서다.**

```jsonc
{ "pattern": "networkBuild",
  "title": "요청은 한 곳으로 들어온다",
  "nodes": [                             // 필수
    { "label": "API Gateway", "icon": "plug", "hub": true },   // hub 는 중앙
    { "label": "인증", "icon": "권한" }
  ],
  "links": ["API Gateway>인증", [0, 2]],   // 라벨 또는 인덱스. 생략하면 hub 에 전부 연결
  "flow": true }                         // 선을 그린 뒤 그 위로 점이 흐른다(관계가 "흐름"일 때)
```

## processFlow — 프로세스 플로우
순서. 3~6단계. **단계 → 화살표(선이 자라고 → 꺽쇠가 닫힌다) → 다음 단계** 순으로 등장한다.

```jsonc
{ "pattern": "processFlow",
  "title": "세 단계로 옮긴다",
  "steps": [ { "label": "수집", "icon": "refresh", "note": "네 채널을 자동 동기화" } ],
  "vertical": false }                    // 생략하면 화면비가 정한다(세로 포맷은 세로 배치)
```

## beforeAfter — 비포 애프터
대비. before 가 물러나며 after 가 켜진다 — **동시에 일어나야 대비가 산다.**

```jsonc
{ "pattern": "beforeAfter",
  "title": "질문하는 조직에서 찾는 조직으로",
  "before": { "label": "BEFORE", "value": "41%", "icon": "warn",
              "items": ["네 곳을 돌아다닌다"] },
  "after":  { "label": "AFTER",  "value": "12%", "icon": "check",
              "items": ["한 곳에서 검색한다"] } }
```

## explodedDiagram — 분해도
층 구조. 중앙에 겹쳐 있다가 제자리로 펼쳐진다.

```jsonc
{ "pattern": "explodedDiagram",
  "title": "네 층을 순서대로 지난다",
  "layers": [ { "label": "인증·인가", "icon": "shield", "note": "토큰 검증" } ],
  "reverse": false }                     // 아래부터 펼침
```

## zoomDetail — 줌 디테일
개요 → 한 항목 확대. 카메라가 world 를 확대하고, 헤더와 상세 패널은 **고정 레이어**라
따라 움직이지 않는다.

```jsonc
{ "pattern": "zoomDetail",
  "title": "병목은 한 곳에서 생긴다",
  "items": [ { "label": "결제", "icon": "creditcard", "note": "외부 PG 의존" } ],
  "focus": 2,                            // 필수. 0부터
  "detail": { "title": "결제 — 외부 PG 가 지연을 결정한다",
              "points": ["타임아웃 3초, 재시도 2회 → 최악 9초"] } }
```

## dataCounter — 데이터 카운터
숫자가 목표값까지 올라간다. 1~4개.

```jsonc
{ "pattern": "dataCounter",
  "title": "찾는 데 쓰는 시간",
  "stats": [                             // 필수
    { "value": 41, "unit": "%", "label": "정보 탐색에 쓰는 시간", "icon": "hourglass" },
    { "value": 3.2, "dec": 1, "unit": "회", "label": "주간 반복 질문" },
    { "value": 18400, "prefix": "₩", "label": "천 단위 구분은 자동" }
  ] }
```

`dec` 생략 시 `value` 의 소수 자리를 그대로 쓴다.

## timeline — 타임라인
사건 순서. 축이 그려지는 방향이 시간의 방향.

```jsonc
{ "pattern": "timeline",
  "title": "유입은 7월에 터졌다",
  "events": [ { "when": "7월", "label": "제휴 캠페인", "note": "가입 +9,200" } ],
  "vertical": false }
```

## splitCompare — 스플릿 비교
둘을 나란히. 가운데 선이 그려지고 양쪽이 들어온다.

```jsonc
{ "pattern": "splitCompare",
  "title": "들어오는 문은 열렸고 머무는 방이 좁다",
  "left":  { "label": "유입", "value": "+32%", "icon": "trendup", "tone": "good",
             "items": ["제휴 채널이 절반"] },
  "right": { "label": "정착", "value": "-7%p", "icon": "trenddown", "tone": "bad",
             "items": ["1주 이탈 58%"] } }
```

## convergence — 수렴
**모이는 동작 자체가 메시지다.** 흩어져 등장 → 경로 → 빨려 들어감 → 하나가 남음.

```jsonc
{ "pattern": "convergence",
  "title": "하나의 원천으로 모은다",
  "sources": [ { "label": "Slack", "icon": "채팅" } ],       // 필수. 3~7개
  "target": { "label": "Single Source of Truth",             // 필수
              "icon": "database", "note": "질문이 아니라 검색으로" } }
```

씬별 스크린샷은 **모이기 직전**(칩과 경로가 다 보이는 프레임)에서 잡힌다 —
모인 뒤에는 target 하나만 남아 확인할 게 없기 때문이다.

## divergence — 발산
수렴의 반대. 하나에서 여럿이 뻗어 나간다.

```jsonc
{ "pattern": "divergence",
  "title": "온보딩 하나에 집중한다",
  "source": { "label": "첫 7일", "icon": "target" },          // 필수
  "targets": [ { "label": "첫날 성공 경험", "icon": "check" } ] }   // 필수
```

## orbit — 오빗
중심과 위성. 회전은 마스터 타임라인 밖에서 무한 루프로 돈다.

```jsonc
{ "pattern": "orbit",
  "title": "10분이 바꾸는 것",
  "center": { "label": "아침 10분", "icon": "sun" },          // 필수
  "orbits": [ { "label": "집중", "icon": "target", "ring": 1 } ],  // 필수. ring 으로 2중 궤도
  "spin": 26 }                           // 한 바퀴 도는 초. 기본 26
```

## matchCut — 매치 컷
**연결의 가장 강한 수단.** 앵커는 화면에 남고 텍스트만 갈린다.

```jsonc
{ "pattern": "matchCut",
  "anchor": "question",                  // 필수. 픽토그램 이름 또는 큰 글자
  "from": { "title": "무엇을 아는가", "sub": "지금까지의 질문" },
  "to":   { "title": "무엇을 모르는가", "sub": "이 시리즈의 질문" },   // 필수
  "anchorTo": "compass",                 // 주면 앵커가 그 도형으로 **모프**한다 (MorphSVG)
  "textFx": "roll",                      // 텍스트가 굴러 교체된다
  "morph": true }                        // 앵커 회전·확대. 기본 true
```

`anchorTo` 를 주면 회전 대신 **도형이 실제로 변형**된다 — 물음표가 나침반이 되는 식으로,
두 개념을 잇는 가장 강한 수단이다.

## cameraJourney — 카메라 여정
넓은 판을 카메라가 순회한다. 3~5 정류장. 마지막에 전경으로 물러난다.

```jsonc
{ "pattern": "cameraJourney",
  "title": "들어와서 나가기까지",
  "stops": [ { "label": "수신", "icon": "plug", "note": "게이트웨이 진입" } ],
  "zoom": 1.9 }                          // 정류장 확대 배율
```

## marquee — 마퀴
항목이 끝없이 흐른다. 개수가 많아 하나하나 볼 필요 없거나 "계속 이어진다"가 메시지일 때.

```jsonc
{ "pattern": "marquee",
  "title": "이미 여기저기 쓰인다",
  "items": [ { "label": "Slack", "icon": "채팅" } ],   // 필수
  "rows": 2,                             // 줄마다 방향이 반대다
  "speed": 24 }                          // 한 바퀴 초. 기본 24
```

흐름은 CSS 무한 루프라 마스터 타임라인·시킹과 무관하고, 감소 모션에서 멈춘다.

## chart — 차트
수치를 형태로. 17종이며 **어떤 차트를 쓸지는 데이터의 일이 정한다** — `references/charts.md`.

```jsonc
{ "pattern": "chart",
  "chart": "bar",                       // 필수
  "title": "3월에 꺾였다",                // 제목은 결론이다
  "data": { "items": [ { "label": "1월", "value": 1240 } ] },   // 필수
  "options": { "emphasis": 2 },
  "caption": "차트 아래 한 줄" }
```

`bar barH barGroup barStack line area donut gauge isotype radar scatter
waterfall slope dumbbell bullet heatmap sparkline`

색은 기본이 sequential(테마 accent 한 색조)이고, `emphasis` 로 하나만 강조하거나
`categorical: true` 로 시리즈를 구분한다. 데이터 형태와 옵션은 `charts.md` 에 있다.

카드 항목에 `spark: [3,5,4,8]` 을 주면 카드 안에 미니 추이선이 깔린다.

## deviceShow — 디바이스 쇼케이스
프레임 안에 화면을 보여준다. "이건 실제 화면이다"를 프레임이 대신 말한다.

```jsonc
{ "pattern": "deviceShow",
  "title": "한 곳에서 답이 나온다",
  "frame": "browser",                    // 화면: browser window terminal editor search dialog phone tablet laptop notification
                                         // 실물: card chat memo notepad clipboard clayBoard receipt newspaper book
  "screen": {                            // 프레임 안. 셋 중 필요한 것만
    "title": "검색 결과",                  // search·editor·newspaper·receipt·dialog 는 프레임이 정한 자리에 앉는다
                                         //   (검색어·파일명·제호·상호명·모달 제목)
    "items": [ { "label": "결정 로그", "icon": "doc", "value": "12" } ],
    "lines": ["$ gm build spec.json", "→ 발표.html (190KB)"],   // terminal 은 $ 로 시작하면 명령으로 본다
    "art": "search"
  },
  "caption": "프레임 아래 한 줄 설명" }
```

프레임 안 줄·항목은 **7개까지**. 넘으면 화면이 아니라 문서가 된다.

## quote — 인용
말 한 줄에 화면을 다 준다. 호흡을 끊는 씬으로도 쓴다.

```jsonc
{ "pattern": "quote",
  "text": "가입은 쉬웠는데\n뭘 해야 할지 몰라서 닫았어요",     // 필수
  "by": "3주차 이탈 사용자",
  "role": "인터뷰 7명 중 5명이 같은 말" }
```

## funnel — 퍼널
단계마다 걸러져 줄어든다. **폭이 값을 지고**, 단 사이에 통과율이 붙는다. 마지막 단이 결론이다.

```jsonc
{ "pattern": "funnel",
  "title": "가입은 많고 결제는 적다",
  "unit": "명",                          // 모든 단의 공통 단위 (단별 unit 이 이긴다)
  "stages": [                            // 필수. 6개까지
    { "label": "방문", "value": 48000 },
    { "label": "가입", "value": 9600, "note": "이메일 인증 포함" },   // note 는 바 밖 오른쪽
    { "label": "첫 결제", "value": 860 }
  ],
  "rates": true }                        // 단 사이 "↓ 20%" 통과율. 기본 true
```

`value` 를 생략하면 폭이 선형으로 좁아지기만 한다(수치·통과율 없이 모양만).
색은 시퀀셜 램프 — 마지막 단이 순수 액센트라 시선이 결론에 모인다.

## cycle — 사이클
순환·플라이휠·반복 루프. 단계가 원을 돌고, **마지막 화살표가 처음으로 돌아가 고리를 닫는다.**
닫히는 순간 전체가 한 번 맥동한다.

```jsonc
{ "pattern": "cycle",
  "title": "성장 플라이휠",
  "center": { "label": "제품", "icon": "rocket" },   // 선택. 고리 한가운데
  "steps": [                             // 필수. 6개까지
    { "label": "콘텐츠 발행", "icon": "pencil" },
    { "label": "유입", "icon": "users" },
    { "label": "전환", "icon": "check" }
  ] }
```

`processFlow` 가 직선 일방향이라면 cycle 은 "이 과정이 돌고 돈다"다.

## anatomy — 해부도
한 비주얼의 부위를 짚는다. 중앙 비주얼에 **지시선 콜아웃이 하나씩** 붙는다(점 → 선 → 라벨).

```jsonc
{ "pattern": "anatomy",
  "title": "파이프라인 해부",
  "art": "aiBrain",                      // art 또는 icon 필수 — 중앙 비주얼
  "parts": [                             // 필수. 6개까지
    { "label": "수집기", "note": "네 채널을 자동 동기화" },
    { "label": "색인", "note": "한 곳에서 답이 나온다" }
  ] }
```

가로 포맷은 좌우 번갈아 콜아웃이 붙고, 세로 포맷은 비주얼에서 내려온 레일 하나가
점들을 꿴다. `zoomDetail` 이 "하나만 자세히"라면 anatomy 는 "전부 이름을 붙인다"다.

## featureMatrix — 기능 매트릭스
여럿을 여러 기준으로 견준다. 행이 기준, 열이 후보. **`highlight` 열에 마지막에 링이 감긴다** — 결론은 마지막에.

```jsonc
{ "pattern": "featureMatrix",
  "title": "왜 이쪽인가",
  "cols": [                              // 필수. 4개까지
    { "label": "스프레드시트", "icon": "grid" },
    { "label": "우리", "icon": "rocket", "highlight": true }
  ],
  "rows": [                              // 필수. 6개까지. values 는 열 순서대로
    { "label": "자동 동기화", "values": [false, true] },     // true ✓(good) · false ✕(dim)
    { "label": "도입 기간", "values": ["6주", "2일"] }        // 문자열은 그대로
  ] }
```

`splitCompare` 가 2자 대비라면 featureMatrix 는 다자·다기준이다. `values` 개수는
열 수와 같아야 한다 — 다르면 validate 가 짚는다.
