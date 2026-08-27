# spec — 스펙 JSON 필드

**좌표와 타이밍은 쓸 수 없고 쓸 필요도 없다.** 배치·크기·이징·스태거는 엔진이
테마·화면비·에너지에서 계산한다. 스펙에는 **무슨 내용을 어떤 패턴으로** 만 쓴다.

## 루트

```jsonc
{
  "title":   "산출물 제목",              // <title>, 접근성 라벨
  "message": "이 영상이 남길 한 줄",       // 필수는 아니지만 없으면 경고. 씬 구성의 검증 기준
  "theme":   "midnight",                // midnight ink paper mono neon warm
  "aspect":  "16:9",                    // 16:9 9:16 1:1 4:5
  "energy":  "E2",                      // E1 차분 · E2 표준 · E3 하이에너지
  "font":    "display",                 // 10종. 생략하면 테마가 정한다 (`gm info fonts`)
  "mode":    "autoplay",                // autoplay loop step
  "audio":   { "offset": 0, "volume": 1 }, // 음성을 얹을 때만. 파일은 --audio 로 준다
  "scenes":  [ /* 아래 */ ]
}
```

`audio.offset` 은 **음성 안에서 첫 대사가 시작하는 시각**이다. 녹음 앞에 여백이
있으면 그만큼 적는다.

## 씬 공통

모든 씬이 받는다.

| 필드 | 뜻 |
|---|---|
| `pattern` | **필수.** 20종 중 하나 (`gm info patterns`) |
| `id` | 씬 식별자. 생략하면 title 에서 만든다 |
| `purpose` | 이 씬이 무엇을 하는 씬인지. 타임코드 시트에 남고, **쓰다 막히면 그 씬은 필요 없는 씬이다** |
| `hold` | 내용이 다 나온 뒤 머무는 초. 생략하면 글자 수로 추정한다. **자막에 맞추면 무시된다** |
| `say` | **이 씬에서 말하는 대사.** `--subs` 로 빌드할 때 이 글자를 자막에서 찾아 씬의 시작과 길이를 실측으로 정한다 |
| `transition` | 앞 씬에서 넘어오는 방식. 첫 씬은 무시 |
| `decor` | 배경 레이어. 이름 또는 배열(`["blob","grid"]`)로 겹친다. `false` 면 없음. 생략하면 루트 → 테마 기본 |
| `decorLevel` | 배경 세기 `0`(약) `1`(기본) `2`(강) |
| `textFx` | 글자 등장 방식. `scramble`(섞이다 정렬) · `roll`(굴러 교체, `matchCut` 전용) |
| `mark` | 제목에 붙는 강조. `"underline"` `"circle"` `"highlight"` 등. `"badge:NEW"` 처럼 값도 준다 |
| `art` | 추상 일러스트. 패턴에 따라 아이콘 자리를 대신한다(`heroReveal`) |
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
`badge` 는 우상단 알약(`"NEW"`), `ribbon` 은 좌상단 띠(`"핵심"`), `art` 는 카드 우하단에 옅게 깔리는 일러스트,
`spark` 는 카드 안 미니 추이선(`[3,5,4,8]`)이다.

**벡터 이름은 기억으로 쓰지 않는다.** 픽토그램 191종 + 벡터 세트 55종이 있고 한글 이름도 따로 있다:

```bash
node <skill>/assets/gm.js icons 채팅       # 픽토그램 — speech(메시지·채팅·댓글)
node <skill>/assets/gm.js info decor       # 배경 15종
node <skill>/assets/gm.js info mark        # 강조 12종
node <skill>/assets/gm.js info frame       # 디바이스 8종
node <skill>/assets/gm.js info art         # 일러스트 20종
node <skill>/assets/gm.js info chart       # 차트 17종
```

없는 이름을 쓰면 validate 가 **가능한 목록을 보여주며 오류**로 잡는다. 조용히 사라지지 않는다.

---

# 패턴 20종

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
순서. 3~6단계. 단계 → 화살표 → 단계 순으로 등장한다.

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
  "frame": "browser",                    // browser window terminal phone tablet laptop card chat memo notepad clipboard clayBoard
  "screen": {                            // 프레임 안. 셋 중 필요한 것만
    "title": "검색 결과",
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
