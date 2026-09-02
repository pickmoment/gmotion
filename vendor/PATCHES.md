# vendor/gmotion 로컬 수정

`vendor/gmotion/` 은 gmotion 스킬의 사본이고 앱의 소스 오브 트루스다.
업스트림 스킬로 다시 vendoring 하면 아래 수정이 사라진다 — 그때 다시 얹는다.

## 1. 화면 자막을 화면 맨 아래로 · 끄고 켤 수 있게 (2026-08-27)

**왜.** 자막이 바닥에서 15% 떠 있어 화면 한가운데에 뜬 것처럼 보였다. 영상 자막의
관례대로 맨 아래에 붙이고, 자막 없는 화면도 필요하므로 끄는 길을 냈다.

**같이 고친 것.** `.gg-cc` CSS 규칙이 닫히지 않아 `.gg-ccLow{bottom:8%}` 가 통째로
파서에 삼켜지고 있었다(`clean` 모드에서 자막을 내리는 동작이 무동작이었다).
자막이 이제 맨 아래에 있으므로 `.gg-ccLow` 자체를 없앴다.

### `assets/gsapgraph.js`
- `.gg-cc` — `bottom:15%` → `bottom:0`, `left/right` 8% → 6%, `line-height` 1.45 → 1.3.
  `padding-bottom:.18em` 은 여백이 아니라 클리핑 여유다 — 강조 박스가 글자 아래로 더
  내려오는데 스테이지가 `overflow:hidden` 이라 그만큼 잘린다.
- `.gg-cc span` — 아래 모서리를 각지게(`border-radius:.28em .28em 0 0`), 바닥에 붙는 모양.
- `.gg-ccLow` 규칙 삭제, 끊어진 CSS 블록 복구.
- `.gg-ccBtn` 추가 — 꺼진 상태를 `aria-pressed="false"` 로 눈에 보이게.
- 플레이어에 `CC` 버튼 추가 (자막이 있을 때만). `hasCC` 로 마크업 두 곳이 같은 조건을 쓴다.

### `assets/runtime.js`
- `ccOn` · `paintCCState()` · `setCaptions(on)` 추가. `?cc=0` 이면 꺼진 채 시작한다.
- `C` 키 — 일반 재생과 발표 모드 양쪽.
- 플레이어 `CC` 버튼 클릭 연결.
- `clean` 모드의 죽은 `gg-ccLow` 처리 삭제.
- `GGM.setCaptions(on)` · `GGM.captionsOn` 노출 — 앱 미리보기와 캡처가 쓴다.

### 문서
`SKILL.md` · `MANUAL.md` · `references/api.md` · `references/theming.md` · `assets/gm.js`
의 조작키 표와 `--captions` 설명에 `C` 키와 `?cc=0` 을 넣었다.

**검증.** `node assets/gm.js test` 92건 통과 · `gm check` 통과 ·
자막 박스 바닥이 스테이지 바닥에서 4px(1080 기준) — 잘리지 않고 붙는다.

## 2. kineticType — 줄이 접힐 때 다음 줄과 겹치던 문제 (2026-08-27)

**증상.** 한 줄이 화면 폭을 넘어 두 줄로 접히면 다음 줄이 그 위로 올라와 글자가 포개졌다.
실측(1080 기준): 2번 줄이 459~773 을 차지하는데 3번 줄이 651 에서 시작 — 122px 겹침.

**원인.** 스택 모드가 줄마다 `top` 을 미리 계산해 절대배치하고, 다음 줄로 넘어갈 때
`size * 1.16 + gap` 만큼만 전진했다. 한 줄 높이를 가정한 값이라 접히는 순간 어긋난다.

### `assets/gsapgraph.js`
- **스택 모드** — 절대좌표 누적을 걷어내고 `.gg-kstack` 래퍼 안에 흐름 배치. 줄 간격은
  `margin-top:gap`. 한 줄 블록은 `line-height 1.1em + .gg-mask 의 padding .06em = 1.16em`
  이라 예전 간격이 그대로 재현된다. 래퍼는 `translateY(-50%)` 로 걸어 브라우저가 잰
  **실제** 높이 기준으로 세로 중앙에 선다.
- **컷 모드** — 각 줄을 `.gg-kcut` 래퍼로 감싸 `top:cy` + `translateY(-50%)`.
  예전의 `cy - size*.62` 근사가 정확한 중앙 정렬로 바뀌었다.
  transform 을 래퍼에 둔 이유는 GSAP 이 안쪽 글자에 거는 transform 과 부딪히지 않게 하려는 것.
- `estEm(text)` 추가 — 글자 폭을 em 으로 어림한다. 900 굵기 표시용 글꼴에서 실측해
  계수를 맞췄고(자간 포함) 실측 대비 1.00~1.10 이다. **과대 추정이 안전한 방향**이라
  일부러 그쪽으로 뒀다 — 과대는 글자가 조금 작아지고 끝나지만 과소는 줄바꿈을 부른다.
- 줄이 넘치면 그 줄만 글자를 줄여 한 줄을 지킨다. 하한은 원래 크기의 `.62` 배 —
  그 아래로는 줄마다 크기를 달리해 만든 리듬이 무너진다.
- CSS: `.gg-kstack,.gg-kcut{position:absolute;transform:translateY(-50%)}` 추가,
  `.gg-kl` 에서 `position:absolute` 제거.
- **validate** — 하한에서도 한 줄에 안 들어가는 줄을 경고한다.

### `references/spec.md`
kineticType 절에 "한 줄은 한 줄로 나온다" 규칙을 적었다.

**검증.** `gm test` 92건 통과 · 기존 예제 14줄 중 축소되는 줄 0개(최대 비율 0.85로 여유) ·
재현 케이스 겹침 122px → 0(줄 간격 30px 균일, 스택 중심 540 = 스테이지 정중앙) ·
하한에서도 넘치는 극단 케이스는 2줄로 접히되 겹치지 않고 경고가 뜬다 · 컷 모드 콘솔 오류 0.

## 3. 음성이 있는 산출물에서 화면 자막이 아예 안 나오던 문제 (2026-08-27)

**증상.** `--subs --audio --captions` 로 만든 HTML 을 열면 소리도 안 나고 자막도 안 뜬다.
파일에는 둘 다 들어 있다(`<audio id="gg-audio">` 에 data URI, IR 에 `captions`).

**원인 둘.**
1. 브라우저는 소리 있는 자동재생을 막는다. 런타임은 이미 `master.play()` 로 화면만
   보내도록 처리하고 있었지만, **막혔다는 사실을 아무 데도 알리지 않았다** — 보는 쪽에서는
   "음성이 산출물에 안 들어갔다" 로 읽힌다.
2. 자막을 그리는 `paint()` 가 `tick()` 안에서만 불렸는데 `tick()` 은 `audioLead` 가
   true 여야 돈다. 자동재생이 막히면 `audioLead` 가 영영 false 라 **자막이 빈 채로 남는다.**
   음성 없는 산출물에는 타임라인 시계로 도는 별도 루프가 있었지만 음성 있는 쪽에는 없었다.
   앱 미리보기에서는 클릭이 사용자 제스처라 음성이 재생돼 이 경로가 드러나지 않았다.

### `assets/runtime.js`
- `flashHint(msg, ms)` 를 `keys()` 밖 모듈 수준으로 올렸다 — 음성 경로에서도 써야 한다.
- 자막 페인트 루프를 **음성 유무와 무관하게** 항상 돌린다. 시각은 지금 돌고 있는 시계에서
  가져온다 — `audioLead` 면 `AUD.currentTime - AOFF`, 아니면 `master.time()`.
- `AUD.play()` 가 거부되면 힌트를 띄운다: "소리는 브라우저가 막았다 — 재생 ▶ 이나 Space 를
  누르면 시작된다" (4.2초). 플레이어가 없는 clean·present 산출물에서는 조용히 넘어간다.

**검증.** `gm test` 92건 통과 · 실제 산출물(8.2MB 음성 인라인)을 열어 실측 —
수정 전: 자막 텍스트 빈 문자열, 음성 `paused:true`. 수정 후: 자동재생이 막힌 상태에서도
자막이 타임라인 시계를 따라 나오고 안내가 뜨며, 재생 버튼을 누르면 음성이 시작되고
음성·화면 시계가 0.01초 안에서 일치한다.

## 4. 발표용 산출물에서 화면 자막 제외 (2026-08-27)

**왜.** 발표는 사람이 앞에서 말한다. 그 말을 자막으로 청중 화면에 또 띄우면 시선이
갈리고, 발표자가 실제로 하는 말과 자막이 어긋나는 순간 오히려 방해가 된다.
`--present` 산출물에는 플레이어가 없어 `CC` 버튼도 없었다 — `C` 키를 아는 사람만 끌 수 있었다.

`--subs` 로 맞춘 **씬 타이밍은 그대로 적용된다** — 실측으로 잡은 리듬은 발표에서도
쓸모가 있고, 빠지는 것은 화면에 뜨는 자막뿐이다.

### `assets/gsapgraph.js`
- `toHTML` — `wantCC = 자막 있음 && !present` 하나로 모아, IR 의 `captions` 와
  `.gg-cc` 요소·플레이어 `CC` 버튼(`hasCC`)이 같은 조건을 쓰게 했다. 발표용에는
  자막 문장이 파일에 아예 들어가지 않는다(자막 텍스트로 grep 해도 안 나온다).

### `assets/runtime.js`
- 발표 모드 키 핸들러의 `C`(자막 토글) 삭제 — 발표용에는 자막 요소가 없어 죽은 코드다.
  일반 재생의 `C` 키는 그대로다.

### `assets/gm.js`
- `--present --captions` 를 함께 주면 알린다: "발표용에는 화면 자막이 실리지 않는다 —
  타이밍 정렬만 적용된다." 조용히 무시하면 자막이 실렸다고 오해한다.
- 도움말의 `--captions` · `--present` 설명에 같은 내용을 적었다.

### 앱
- `src/App.tsx` — `embedded(kind)` 로 바꿨다. 발표용을 내보내면 결과 메시지가
  "화면 자막 제외(발표용)" 로 뜬다. 실리지 않은 것을 실렸다고 적으면 안 된다.
- `src/components/Toolbar.tsx` — 발표용 내보내기 힌트와 화면 자막 체크박스 설명에 명시.

### 문서
`SKILL.md`(7. 발표용) · `MANUAL.md`(8-1 키 표 · 9장) · `references/api.md`(플래그 표 ·
`--present` 절) · `references/theming.md`(발표 모드) · 앱 `README.md` 기능 표.

**검증.** `node assets/gm.js test` 92건 통과 · `gm check` 통과(발표·일반 양쪽) ·
`tsc --noEmit` 통과 · 파일 실측: 발표용에 `id="gg-cc"` 0개, IR `captions` 없음,
자막 첫 문장 문자열 미포함, `"notes"` 는 그대로 실림, 씬 타이밍은 자막 정렬(5/5씬) 유지.

**브라우저 실측**(headless Chrome, `starter-narrated` + srt + `--captions`).
발표용: `.gg-cc`·`.gg-ccBtn`·`.gg-player` 0개, 발표 UI(진행 바·씬 번호·검은 화면·씬 목록)
와 발표자 창 마크업은 그대로, `GGM.captionsOn` false, `C` 키를 눌러도 콘솔 오류 0.
`→` 로 씬 진행 정상(`GGM.present.index()` 0→2, 화면 `3 / 5`) — 자막 띠 없음.
`?presenter=1` 로 발표자 창 정상(다음 씬 미리보기 · 지금·다음 씬 노트 · 타이머 · 씬 목록).
일반 재생(회귀 확인): `?t=30` 에서 자막 "그래서 세 가지를 바꿨습니다." 표시, `CC` 버튼 1개,
`C` 키로 `captionsOn` true→false·요소 `hidden` 전환. 세 세션 모두 콘솔 로그·페이지 오류 0.

## 5. 발표용(`--present`) 산출물에서 마지막 비트/항목이 잘리던 문제 (2026-08-27)

**증상.** 발표용(`--present` / PT)으로 내보낸 뒤 재생하면, 씬의 마지막 항목/단계/숫자 카운터/줄바꿈 텍스트 등 마지막 비트가 채 끝나기 전에 씬이 멈추고, 다음 씬으로 넘길 때(`API.next()`) 찰나의 순간에 튀어나온 뒤 다음 씬으로 넘어갔다.

**원인.**
1. `gsapgraph.js` 의 `compile()` 에서 씬의 애니메이션 완료 시점(`ce` / `contentEnd`)을 계산할 때 `tw.list` 를 돌며 `num(o.st, 0) * 3` 으로 스태거 시간을 어림잡고 있었다. 항목이 4개 이상이거나 kineticType, processFlow, dataCounter, timeline 등 다단계 비트가 있는 패턴에서 실제 애니메이션 종료 시점보다 `ce` 가 앞당겨져 계산되었다.
2. `runtime.js` 의 발표 모드 일시정지(`SPEC.present`)는 `s.at + s.ce + .06` 시점에 `master.addPause` 를 걸도록 되어 있었는데, 과소계산된 `ce` 때문에 마지막 비트가 등장하기 직전에 타임라인이 일시정지되었다.
3. 발표자가 `→` / `Space` 로 다음 슬라이드를 넘기면 `API.next()` 가 `master.time(nx.at)` 로 다음 씬으로 점프하면서 중간 구간(미완료된 마지막 비트 트윈)이 순간적으로 평가되어 반짝이고 지나갔다.

### `assets/gsapgraph.js`
- `sceneDur(sc, ctx, t, hint, o)` — 패턴 빌더 20종이 계산한 정확한 애니메이션 종료 시점 `t` 를 `ctx.animEnd = r2(t)` 에 저장.
- `compile()` — `ce` 기준값을 `ctx.animEnd` 로 잡고, 트윈 목록의 실제 종료 시점을 함께 반영하여 항목 수나 비트 수와 상관없이 씬 내의 모든 애니메이션이 온전히 끝나는 시점으로 `contentEnd` 를 정확히 산출.
- `syncScenes()` — `s.contentEnd` 갱신 시 `ae`(실제 트윈 최대 종료 시점)를 온전히 반영.

### `assets/runtime.js`
- `SPEC.present` 정지 시점 계산: `s.at + s.ce + .08` 로 안정적인 정착 여유를 두고, 다음 씬 시작 시각(`SPEC.scenes[i + 1].at - .001`)을 넘지 않도록 보정.

**검증.** `node assets/gm.js test` 92건 통과 · `cargo test` 5건 통과 · `npm run build` 통과 · 다중 항목 패턴(processFlow 5단계, cardsCascade 6개, dataCounter 4개, kineticType 4줄, timeline 4개) 실측: `contentEnd` >= 모든 트윈 종료 시점 확인 · 발표 모드에서 마지막 비트까지 온전히 재생 후 정지 확인.

## 6. 자막 동기화를 씬 단위 `say` 중심으로 일원화 (2026-08-27)

**왜.** 씬 내부의 세부 항목(카드, 단계, 지표, 사건 등)마다 개별적으로 `say`를 쪼개어 달면, 자막 큐와 단어 매칭이 어긋나기 쉽고 발화 순서가 조금만 바뀌어도 탐색 커서가 꼬이는 문제가 있었다. 씬 단위 `scene.say`에 씬 전체 대사를 적는 것만으로 씬의 시작·길이를 실측에 맞추고, 내부는 패턴 고유의 완성도 높은 코레오그래피(스태거 및 모션 리듬)로 자연스럽게 재생되도록 가이드와 스키마를 정비했다.

### `assets/gsapgraph.js`
- `syncScenes()` — 12초 이상 정지 시 출력되던 경고 메시지를 "항목에 say를 단다" 대신 "씬을 2~3개로 쪼개어 리듬을 만든다"로 변경.

### UI & 스키마 (`src/engine/schema.ts`, `ChartEditor.tsx`)
- `DECOR_FIELDS` 및 `side`, `single`, `lines`, `stats`, `events` 스키마에서 번잡한 하위 `say` 필드를 제거하고 씬 공통 필드(`scene.say`)에 집중.
- `ChartEditor`의 항목 테이블에서 `대사(say)` 컬럼 제거.

### 스킬 지침 및 문서
- `SKILL.md` · `spec.md` · `direction.md` · `api.md` — 자막 동기화 시 씬 단위 `say`에 자막 원문을 복사해 넣고, 긴 대사는 항목별 `say`로 쪼개는 대신 씬을 분할하도록 일관되게 개정.

**검증.** `node assets/gm.js test` 92건 통과 · `cargo test` 5건 통과 · `npm run build` 통과.

## 7. 자막-카드 클래스 충돌 버그 및 카드 내용물 타이포 비율 개선 (2026-08-27)

**증상.** `cardsCascade` 씬이 있는 산출물에서 화면 자막이 카드 뒤에 가려져 보이지 않거나 카드가 화면 바닥까지 비정상적으로 길게 늘어나고, 카드 박스 내부의 아이콘과 텍스트가 상대적으로 너무 작아 여백만 크고 왜소해 보이는 현상 발생.

**원인.**
1. **클래스명 충돌**: `cardsCascade` 카드의 클래스명(`.gg-cc`)과 자막 컨테이너 클래스명(`.gg-cc`)이 동일하게 지정되어 있었다. 자막에 걸려 있던 `position:absolute; bottom:0; left:6%; right:6%; z-index:60;` CSS가 카드로 전파되어, 카드가 화면 맨 아래 바닥까지 강제로 늘어나고 동일한 z-index로 인해 자막을 덮었다.
2. **카드 내부 타이포/아이콘 크기 비율 왜소**: 1~4개의 카드를 보여주는 넓은 카드 박스에서 아이콘 크기(상한 68px)와 라벨 폰트(33px), 노트 폰트(23px)가 고정되어 있어 카드가 커질수록 텍스트가 작게 보였다.

### `assets/gsapgraph.js`
- **자막 클래스 분리**: 자막 컨테이너 클래스를 `.gg-captions` 로 분리하고 `z-index: 200` 을 부여하여 모든 씬 요소 위에 항상 선명하게 표시되도록 수정.
- **카드 캐스케이드 클래스 변경**: `cardsCascade` 카드의 클래스를 `.gg-cascadeCard` 로 변경하여 자막 스타일 간섭 원천 차단.
- **카드 타이포 및 아이콘 비율 강화**:
  - `card()`: 대형 카드(1행 1~4열)일 때 라벨 폰트 `38~42px`(기존 33px 대비 +24%), 노트 폰트 `26~27px`, 아이콘 `88~96px`로 확장.
  - `.gg-card`: 패딩 `36px 30px`, 요소 간격 `gap: 16px`, 라벨 기본 폰트 `34px`, 볼드 가중치 강화.

**검증.** `node assets/gm.js test` 92건 통과 · `cargo test` 5건 통과 · `npm run build` 통과 · 실제 1920x1080 렌더 실측: 카드가 중앙에 균형 있게 배치되고(`itemH` 400px 이내), 하단 자막 띠가 카드 아래 여백 위로 선명하게 표시됨 확인.

## 8. 스펙 JSON 및 산출물 파일명 원본 일치 규칙 적용 (2026-08-27)

**왜.** AI/스킬이 스펙 JSON을 생성하거나 앱에서 다른 이름으로 저장/내보내기할 때, `spec.json`, `my.json`, `out.html` 같은 임의의 제네릭 이름을 쓰면 여러 영상 작업을 할 때 파일이 덮어써지거나 어떤 원본(대본·자막·음성)에 연결된 스펙인지 혼선이 생긴다.

### `SKILL.md`
- **파일명 규칙 명시**: 관련된 원본 파일(대본·자막·음성·주제)의 기본 이름(stem)과 동일하게 스펙 JSON(`<stem>.json`) 및 산출물(`<stem>.html`, `<stem>-발표.html`, `<stem>.mp4`)을 생성하도록 지침 추가.

### 앱 (`src/App.tsx`)
- `baseName()` 및 `defaultDir()` 헬퍼 추가: 열려 있는 스펙 파일명(`filePath`), 자막 파일명(`subsPath`), 음성 파일명(`audioPath`), 문서 제목(`spec.title`)에서 stem을 자동 추출하고, 저장·내보내기 시 원본과 동일한 이름 및 디렉토리를 기본값으로 제안하도록 개선.

**검증.** `npm run build` 통과 · `cargo test` 5건 통과.

## 9. spotlight 배경 장식 제거 (2026-08-27)

**왜.** `spotlight` 조명 효과는 화면 중앙과 상단에 강한 원뿔형 빛과 블러 원형 그라디언트를 형성하여, 씬의 텍스트·카드·차트의 시각적 대비를 해치고 주의를 산만하게 만들어 제거했다.

### `assets/vectors.js`
- `DECOR.spotlight` 정의 제거 (배경 15종 $\rightarrow$ 14종).

### 예제 및 문서
- `starter-charts.json` — 씬 7, 13의 `"decor": "spotlight"` $\rightarrow$ `"decor": "arcs"` 로 교체.
- `SKILL.md` · `theming.md` · `direction.md` — `spotlight` 설명 및 예시 제거.

## 10. 다중 라인(2줄) 자막 배경 겹침/계단 현상 수정 및 글래스 뱃지 통일 (2026-08-27)

**원인.**
1. 기존 `.gg-captions span`에 `display: inline` + `box-decoration-break: clone` + `border-radius: .28em .28em 0 0` (상단만 둥근 모서리)이 적용되어 있었다.
2. 자막이 2줄로 줄바꿈될 때, 줄마다 `box-decoration-break: clone`으로 인해 독립된 인라인 박스가 생성되었다.
3. 1번째 줄(긴 줄) 아래에 2번째 줄(짧은 줄)이 중앙 정렬될 때, 2번째 줄 상단의 둥근 모서리가 1번째 줄 하단에 파고들어 어색한 노치/음영 겹침을 발생시키고, 2번째 줄 하단 모서리는 각진 채로 노출되는 현상이 발생했다.

### `assets/gsapgraph.js`
- `.gg-captions`: `display: flex; justify-content: center; align-items: flex-end` 컨테이너로 개선하고, 화면비별 안전 높이(`bottom`) 자동 계산.
- `.gg-captions span`: `display: inline-block; max-width: 88%`의 단일 통합 글래스 뱃지로 변경. 1줄/2줄 여부와 관계없이 전체 자막 텍스트를 감싸는 둥근 다크 반투명 글래스(`backdrop-filter: blur(10px)`, `border-radius: 15px`, 은은한 보더 및 섀도우)로 일관되게 렌더링.

**검증.** `node assets/selftest.js` 95건 전체 통과 · `npm run build` 통과.


## 12. 클레이 애니메이션 (클레이모피즘·탄성 모션·점토 에셋) 추가 (2026-08-28)

**왜.** 찰흙/점토를 손으로 직접 빚은 듯한 따뜻한 볼륨감과 통통 튀는 스쿼시 & 스트레치(Squash & Stretch) 탄성 모션그래픽 제작 지원.

### `assets/gsapgraph.js`
- `THEMES.clay` 테마 추가: 3D 점토 볼륨감과 매트 파스텔/어스 톤 팔레트 (`bg: #f0ece4`, `accent: #a83c16`, `font: round` 주아).
- `TRANSITIONS.clayPop`, `TRANSITIONS.squish`: 점토가 납작하게 눌렸다가 통통 튀어오르는 탄성 바운스 씬 전환 트랜지션.
- 클레이모픽 CSS 스타일: `theme === 'clay'` 시 카드/패널/노드에 다중 인셋 하이라이트 + 딥 드롭 섀도우 + 두터운 32px 라운딩 자동 적용.

### `assets/vectors.js`
- `DECOR.clayBlobs`: 3D 점토 구슬이 둥둥 떠다니는 배경 레이어.
- `DECOR.dough`: 찰흙 반죽을 빚어 놓은 듯한 유기적 물결 배경.
- `FRAME.clayBoard`: 두툼한 찰흙 점토판 프레임.
- `MARK.clayPin`: 3D 볼륨 점토 압정 마크.

### 예제 및 문서
- `starter-clay.json` 쇼케이스 예제 추가 (19초 5씬).
- `theming.md` · `direction.md` · `spec.md` · `SKILL.md` 업데이트.

**검증.** `node assets/selftest.js` 96건 전체 통과 · `npm run build` 통과.
**검증.** `node assets/gm.js test` 92건 통과 · `cargo test` 5건 통과 · `npm run build` 통과.

## 10. Windows 환경 FFmpeg 자동 탐색 강화 (2026-08-27)

**왜.** Windows 환경에서 winget, scoop 등으로 설치된 패키지나 Vrew, OBS, Shotcut 등 흔히 설치된 미디어 도구의 내장 FFmpeg을 자동으로 발견하지 못해 MP4 렌더 시 "ffmpeg을 찾지 못했다"는 오류가 발생하는 문제 해결.

### `src-tauri/src/cdp.rs`
- `scan_for_ffmpeg()` 재귀 탐색 헬퍼 구현.
- `find_ffmpeg()`:
  - WinGet 패키지 디렉토리(`%LOCALAPPDATA%\Microsoft\WinGet\Packages`) 하위 재귀 탐색.
  - Vrew, Shotcut 등 `%APPDATA%` / `%LOCALAPPDATA%` 내장 도구 디렉토리 탐색.
  - `%LOCALAPPDATA%\Programs`, `imageio`, `uv` 캐시 바이너리 탐색.
  - HandBrake, OBS Studio 등 ProgramFiles 디렉토리 탐색.
  - `where.exe ffmpeg.exe` 및 `PATH` 환경변수 전체 탐색.

**검증.** `cargo test` 6건 통과 (`find_ffmpeg_finds_binary` 통과) · WinGet 및 Vrew FFmpeg 자동 감지 확인.

## 11. 화면 영역 넘침(Overflow) 방지 안전장치 강화 (2026-08-27)

**왜.** 긴 제목, 공백 없는 초장문 텍스트, 9:16 세로 화면에서의 과도한 열 수 설정 등으로 인해 화면 하단 안전 마진이 침범되거나 텍스트가 박스 밖으로 튀어나가는 예외 상황을 원천 방어.

### `assets/gsapgraph.js`
- **루트 CSS**: `word-break: keep-all; overflow-wrap: break-word;` 적용으로 공백 없는 긴 영문/URL/식별자가 컨테이너 폭을 찢고 나가는 문제 방지.
- `head()`: 제목이 3줄 이상일 때 타이틀 폰트 크기 자동 축소 (3줄 0.85배, 4줄 이상 0.72배)로 헤더가 본문을 짓누르는 현상 방지.
- `bodyCy()`: 헤더 높이가 과도하게 커지더라도 본문의 수직 중심점이 하단 안전 영역(safe)을 침범하지 않도록 최대 헤더 높이(화면 높이의 28~32%) 캡 적용.
- `cardsCascade`: 9:16 쇼츠 세로 모드에서 수동 `cols` 지정 시 최대 2열로 자동 클램핑하여 극단적으로 좁은 카드 생성 방지.
- `validate()`: 4줄 이상 제목 및 9:16 쇼츠 3열 이상 설정 시 사전 경고 추가.

**검증.** `node assets/gm.js test` 92건 통과 · `cargo test` 6건 통과 · `npm run build` 통과.

## 12. `.agents/skills` 스킬 설치 경로 지원 (2026-08-27)

**왜.** Claude Code(`~/.claude/skills`) 외에도 Codex, Cursor, Oh My Pi, Antigravity 등 다양한 범용 AI Agent 생태계에서 표준으로 사용하는 `~/.agents/skills` (및 `<project>/.agents/skills`) 디렉토리를 지원하여 스킬 활용성을 확장.

### `src-tauri/src/skill.rs`
- `skills_root()` 개선: `user-agents` / `agents` (`~/.agents/skills`) 및 `agents:<dir>` (`<dir>/.agents/skills`) 경로 라우팅 지원.

### `src/components/SkillPanel.tsx`
- 설치 위치 셀렉트 옵션 추가:
  - 사용자 전역 (Claude Code) — `~/.claude/skills`
  - 사용자 전역 (AI Agents) — `~/.agents/skills`
  - 프로젝트 (Claude Code) — `<선택 폴더>/.claude/skills`
  - 프로젝트 (AI Agents) — `<선택 폴더>/.agents/skills`

**검증.** `cargo test` 7건 통과 (`install_agents_roundtrip` 통과) · `npm run build` 통과.

## 13. 자막 활성화 시 씬 일괄 리프팅(Lifting)으로 하단 콘텐츠 가림 방지 (2026-08-28)

**왜.** 화면 하단에 자막이 얹힐 때 카드·차트·텍스트 등 본문 내용이 자막 뱃지에 가려지는 문제를 방지. 문장별로 실시간 이동하면 레이아웃 흔들림(Layout shift/Jitter)이 발생하므로, 자막 모드(`data-cc="true"`) 활성화 시 씬 전체를 독립 래퍼(`.gg-scenes-wrap`) 단위로 일괄 상단 리프팅하여 GSAP 개별 씬 트랜지션과의 충돌 없이 안정적인 안전영역을 확보.

### `assets/gsapgraph.js`
- `.gg-scenes-wrap` 래퍼 추가: 모든 씬(`.gg-scene`)을 감싸는 컨테이너로 분리하여 GSAP 트랜지션 인라인 transform 과 충돌 없이 동작.
- 자막 활성화 CSS: `.gg-stage[data-cc="true"] .gg-scenes-wrap` 에 화면비에 비례한 상단 이동(16:9 기준 약 -35px, 9:16 기준 약 -73px) 적용, 0.28s 부드러운 이징 트랜지션 연결 및 `prefers-reduced-motion` 대응.
- `toHTML()`: `<main class="gg-stage">` 에 초기 `data-cc="true"` 부여 및 `<div class="gg-scenes-wrap">` 마크업 적용.

### `assets/runtime.js`
- `paintCCState()`: 자막 표시 여부(`CC && ccOn`)에 따라 `.gg-stage` 의 `data-cc` 속성을 `"true"` / `"false"` 로 동기화. `C` 키 토글, 플레이어 CC 버튼, `GGM.setCaptions()` 호출 시 씬 리프팅 상태가 즉시 연동.

### `assets/selftest.js`
- `withCC` 검사 항목에 `.gg-scenes-wrap` 래퍼 생성 및 `data-cc="true"` 초기 속성 검증 추가 (99건 테스트 전체 통과).

**검증.** `node vendor/gmotion/assets/selftest.js` 99건 통과 · `cargo test` 7건 통과 · `npm run build` 통과.

## 14. 디자인 요소의 인터페이스·구현부 분리 — 프리미티브 48종 + 스킨 6종 (2026-08-28)

**왜.** 에셋(배경·마크·일러스트·프레임·픽토그램·테마)은 이미 `{label, build()}` 레지스트리로
교체 가능했지만, 정작 "모습"을 결정하는 씬 부품(카드·노드·스텝·칩·패널·타임라인·인용·
디바이스 화면)은 `gsapgraph.js` 의 HTML 문자열 빌더와 `css()` 플랫 배열에 하드코딩돼 있어
바꿀 길이 없었다. 같은 내용을 문서 톤으로도 포스터 톤으로도 낼 수 없었다.

**어떻게 나눴나 — 부품 170개가 아니라 원시 요소 48개.**
실측해 보니 클래스 173종이 사실상 한 줌의 레시피를 반복 소비하고 있었다 —
`background:var(--panel);border:1.5px solid var(--pline);border-radius:22px;backdrop-filter:blur(7px)`
이 열 계열(`.gg-card` `.gg-node` `.gg-hub` `.gg-step` `.gg-panel/.gg-side` `.gg-layer`
`.gg-detail` `.gg-chip` `.gg-target/.gg-center` `.gg-scI`)에서 그대로 반복되고,
`border-radius` 하드코딩 27곳 · `backdrop-filter` 11곳 · `box-shadow` 5곳이었다.
그래서 부품마다 구현체를 두지 않고 **원시 요소를 CSS 커스텀 프로퍼티 계약으로 뽑았다.**

- **인터페이스** = 토큰 48종 (`skins.js` 의 `TOKENS`). 스타일시트는 이 변수만 읽는다.
- **구현부** = `SKINS[이름].vars(T, A)` 가 돌려주는 값 묶음 (+ 필요하면 `rules`).

스킨 하나가 20~40줄이고, 그것만 갈면 173개 클래스가 전부 따라온다.

### `assets/skins.js` (신규)
- 토큰 계약 48종 — 표면 5 · 반경 5단 · 블러 4단 · 링 2 · 연결선 16 · 타이포 8 · 광채 1 · 자막 7.
- 스킨 6종 — `glass`(기본·회귀 기준) `flat` `brutalist` `clay` `paper` `neon`.
- `resolve(skin, T, A)` — 문자열이면 등록된 스킨, 객체면 스펙에 인라인된 커스텀 정의
  (`{extends, name, vars, css}`). 빠진 토큰은 `glass` 에서 채워지므로 스킨은
  "바꾸고 싶은 것만 적은 문서"로 유지된다.
- `registerSkin` · `unregisterSkin` · `unknownTokens`(오타 검출).
- **`brutalist` 의 오프셋 그림자는 `::after` 가 아니라 `box-shadow` 다** — GSAP 이 카드에
  transform 을 걸면 그 카드가 스태킹 컨텍스트가 되고 `z-index:-1` 인 `::after` 가 자기
  배경 뒤로 들어가 통째로 사라진다. 링이 필요한 허브·타깃은 링과 오프셋을 한 목록으로 준다.
- **`clay` 는 테두리 색을 정하지 않는다** — clay 테마의 `panelLine` 이 이미 흰 하이라이트라
  원래 모습이 그대로 나오고, 어두운 테마에 얹어도 흰 선이 튀지 않는다.

### `assets/gsapgraph.js`
- UMD factory 에 `skins.js` 추가 (`SK`).
- `css()` — `SK.resolve(c.skin, T, A)` 로 토큰을 풀어 `:root` 에 주입하고, 하드코딩 선언
  29곳을 `var(--토큰)` 으로 치환. 스킨의 추가 규칙은 배열 맨 뒤에 `concat` (특정도가 같아도 이긴다).
- `glow` 는 `filter:var(--glow)` 로 통일 — 테마의 `glow` 값은 `glass` 스킨이 읽어 토큰으로 넘긴다.
- `THEMES.clay.skin = 'clay'` — 테마가 기본 스킨을 정할 수 있고, 스펙의 `skin` 이 이긴다.
- **`c.theme === 'clay'` 특수 케이스 삭제** — `!important` 7선언으로 카드류만 덮던 것이
  스킨으로 승격됐다. 그 결과 clay 테마가 칩·타깃·위성·경유지·디바이스 타일·자막까지
  **일관되게** 클레이가 된다(예전에는 그것들만 유리로 남아 있었다).
- `compile()` — `skin` 선택(스펙 → 테마 → `glass`)과 반환값 추가.
- `validate()` — 없는 스킨 이름·`extends`·토큰 오타를 오류로, 어두운 배경 전용 스킨을
  밝은 테마에 얹으면 경고로. 계약에 없는 변수는 조용히 무시되므로 검증에서 걸러야 한다.
- `lum(hex)` 추가 — WCAG 상대 휘도. 밝은 테마 판별에 쓴다.
- 공개 API — `skins` `designTokens` `resolveSkin()` `registerSkin` `unregisterSkin`.

### `assets/gm.js`
- `gm info skins` — 스킨 6종 + 프리미티브 48종 전체와 각각이 정하는 것, 인라인 예시.
- `gm info` 요약과 usage 에 스킨 한 줄.

### `assets/selftest.js`
- 스킨 섹션 12건 추가. 핵심은 **양방향 계약 검사** 둘 —
  스타일시트가 읽는 `var(--x)` 중 아무도 정의하지 않는 것이 있는지, 계약에는 있는데
  아무도 안 읽는 죽은 토큰이 있는지. 이게 있으면 규칙과 계약이 어긋나는 사고를 영구히 막는다.
- 위생 검사 대상에 `skins.js` 추가.

### 앱
- `src/engine/boot.ts` — `skins.js` 를 `gsapgraph.js` 의 의존성으로 주입, `SKINS` 노출,
  `registerCustomSkin` · `unregisterCustomItem("skin")`.
- `src/engine/types.ts` — `SkinDefinition` `SkinVars` `ResolvedSkin`, `Spec.skin`,
  `ThemeDefinition.skin`, `CustomDesignLibrary.skins`, `Engine` 의 스킨 API.
- `src/lib/designStore.ts` — `addSkin` · `updateSkin` · `deleteSkin` · `skinDefOf`.
  라이브러리 import/export 와 예전 저장본 마이그레이션(빈 `skins`)도 함께.
- `src/lib/design.ts` — `skinPreviewVars()`(테마 변수 + 스킨 토큰. 테마 변수를 같이 깔지
  않으면 `var(--panel)` 을 참조하는 토큰이 무효가 된다) · `listSkins()` · `designTokenContract()`.
- `src/components/fields/SkinPicker.tsx` (신규) — 문서 설정의 스킨 선택. 스와치는 실제
  카드 규칙과 같은 토큰을 읽어 그린다. 스펙에 객체로 인라인된 스킨은 그대로 표시만 한다.
- `src/components/SkinsTab.tsx` (신규) — 디자인 스튜디오의 스킨 탭. 프리미티브를 갈래별로
  편집하고(비워 두면 기반 스킨에서 물려받는다) 커스텀 스킨으로 저장, **스펙에 인라인할 JSON 복사**.
  앱 등록만으로는 CLI 빌드·전달 시 재현되지 않으므로 이 경로가 있어야 한다.
- `src/components/DesignPanel.tsx` · `src/App.tsx` · `src/components/DocSettings.tsx` — 배선.

### 문서
`SKILL.md`(원칙 8·구성·레퍼런스 표) · `MANUAL.md`(4-5 절·`gm info` 표) ·
`references/spec.md`(루트 `skin`) · `references/theming.md`(스킨 절 — 6종 표, 인터페이스와
구현부, 토큰 갈래, 커스텀 스킨).

**검증.**
- **프리미티브 추출이 모습을 바꾸지 않음을 증명** — 스펙 7종 × 테마 7종 = 스타일시트 49장을
  추출 전후로 뜨고, `:root` 변수를 전부 전개한 뒤 문자 단위로 대조해 **49/49 완전 일치**.
  차이는 값이 `none` 인 `filter`·`box-shadow` 선언이 새로 생긴 것뿐이고(CSS 기본값과 같아
  계산값이 안 바뀐다, 스킨이 값을 넣을 자리가 된다), 브라우저 계산값도 추출 전 산출물과 동일
  (`border-radius:24px` · `backdrop-filter:blur(7px)`).
- `node assets/selftest.js` **112건 통과** (99 → 112).
- 스킨 6종을 `ink` 테마에 얹어 실제 렌더 확인 — 카드 계산값이 스킨마다 다르고
  (`0/6/14/18/24/32px` 반경, 블러 `none`~`blur(7px)`, 그림자 4종) 브루탈리스트의 오프셋
  그림자·네온의 외곽 광채·클레이의 볼륨이 육안으로 구분된다.
- `npx tsc --noEmit` 통과 · `npx vite build` 통과 · 앱 스킨 탭에 카드 6종 렌더 확인.

**남은 것.** `assets/examples/starter-report.html` 은 패치 7·10 이전에 빌드된 산출물이라
구 `.gg-cc` 자막 CSS 를 담고 있다(스킨과 무관한 별건). `MANUAL.md` 의 "테마 6종" 은
실제 15종으로 세어야 한다 — 스킨 작업 범위 밖이라 손대지 않았다.

## 15. 씬별 스킨 오버라이드 — 한 영상 안에서 재질을 갈아 끼운다 (2026-08-28)

**왜.** §14 에서 스킨을 문서 전역으로만 골랐다. 장을 가르거나(문제 제시는 직각, 해결은
둥글게) 인용 한 씬만 다르게 세우려면 씬 단위로 재질을 바꿀 수 있어야 한다.

**왜 이 seam 이 값싸게 열리나.** 프리미티브가 CSS 커스텀 프로퍼티라 **상속으로 저절로
씬 안에 갇힌다.** 씬에 `data-skin` 을 붙이고 `.gg-scene[data-skin="…"]{ … }` 에
루트와 다른 토큰만 적으면 끝이다 — 부품 빌더를 건드릴 필요가 없다. §14 에서 `:root`
스코프로 둔 것이 정확히 이 확장을 위한 자리였다.

### `assets/skins.js`
- `diffVars(base, vars)` — 루트와 다른 토큰만 남긴다. 씬 블록에 48개를 다 적을 이유가
  없고(같은 값은 `:root` 에서 내려온다), 열어 봤을 때 "이 씬은 무엇이 다른가" 가 바로 읽힌다.
  실측: brutalist 씬 블록이 **32/48 선언**.
- `scopeRules(rules, scope)` + `splitRules` + `scopeOne` — 스킨의 추가 CSS 선택자에
  스코프를 붙인다. at-rule(`@media`)은 겉껍데기를 두고 안쪽 선택자에 붙이고,
  `&` 는 스코프 자신으로 바꾼다(씬 뿌리를 노릴 때). `::after` 같은 의사요소도 유지된다.
- `stageReaching(rules)` · `STAGE_SELECTORS` — 씬 밖(`.gg-stage` `.gg-captions` …)을
  노리는 규칙을 식별한다. 씬 스코프로는 닿지 않는 것들이다.
- `varsToCss` 노출.

### `assets/gsapgraph.js`
- `compile()` — 씬마다 스킨 키를 정한다. **같은 스킨을 쓰는 씬들은 키를 공유**해
  스코프 블록이 한 번만 실리고, 인라인 정의는 `sk<씬번호>` 로 키를 만든다.
  **루트와 같은 스킨을 씬에 또 적은 것은 오버라이드로 세지 않는다**(마크업을 늘리지 않는다).
  씬 출력에 `skin`, 컴파일 결과에 `sceneSkins` 추가.
- `css()` — 씬별 스코프 블록과 스코프된 규칙을 스타일시트 맨 뒤에 붙인다. 특정도가
  기본 규칙보다 높아 확실히 이긴다. **자막 토큰(`cc-*`)은 씬 블록에서 뺀다** — 자막은
  씬 밖 무대 레이어라 스코프가 닿지 않아 죽은 선언이 된다.
- **오버라이드가 하나라도 있으면 루트 스킨의 추가 규칙을 `.gg-scene:not([data-skin])` 로
  좁힌다** — 안 그러면 재질을 갈아 낀 씬에 루트 스킨의 규칙이 남아 두 스킨이 섞인다
  (루트 `neon` + 씬 `flat` 이면 flat 씬의 연결선에 네온 광채가 남는다).
  오버라이드가 없으면 예전처럼 스코프 없이 실린다.
- `toHTML()` — 오버라이드가 있는 씬의 `<section>` 에 `data-skin`.
- `validate()` — 루트 스킨 검사를 `checkSkin(skin, theme, tag, …)` 로 빼서 씬에서도 쓴다.
  씬 스킨의 이름 오타·`extends`·토큰 오타를 씬 번호와 함께 오류로 내고, 씬 스킨에 적은
  자막 토큰은 무시된다는 것을 경고한다.

### `assets/selftest.js`
- 씬별 오버라이드 13건 추가 (125건 통과). 키 공유·루트 중복 제거·스코프·차이만 담기·
  자막 토큰 제외·루트 규칙 좁히기(그리고 **오버라이드가 없을 때는 좁히지 않기**)·씬 검증.

### 앱
- `src/engine/types.ts` — `Scene.skin`.
- `src/components/SceneForm.tsx` — 씬 비주얼 디자인 바에 **재질 칩**(🧱) 추가.
  누르면 `SkinPicker` 팝오버가 열리고, 비워 두면 루트를 따른다.

### 문서
`references/spec.md`(씬 공통 필드) · `references/theming.md`(씬별 오버라이드 소절 —
동작 원리, 트랜지션 중 교차, 한계 둘, 쓸 곳과 쓰지 말 곳) · `MANUAL.md` · `gm info skins`.

**검증.**
- `node assets/selftest.js` **125건 통과** (112 → 125).
- **§14 의 무변화 증명 재실행 — 49/49 유지.** 씬 오버라이드가 없을 때 루트 경로가
  예전과 완전히 같음을 확인했다.
- 한 파일 안에서 씬마다 카드 계산값이 갈리는 것을 브라우저로 실측 —
  루트 glass `24px/1.5px/blur(7px)/none` · brutalist `0px/3px/none/오프셋` ·
  clay `32px/2.5px/none/이중` · 인라인 `2px/4px/none/none`.
- **트랜지션 중 두 씬이 각자 재질을 지킨다** — `?t=2.9` 에서 s1 `opacity .50 r=24px bw=1.5px`,
  s2 `opacity .29 r=0px bw=3px`. 교차 페이드가 재질을 섞지 않는다.
- 앱 왕복 — 씬 재질 칩에서 brutalist 선택 → 칩 `재질: brutalist` → 미리보기 iframe 의
  `<section data-skin="brutalist">`, 카드 `0px/3px/9px 9px 0` 실측.
- `npx tsc --noEmit` 통과 · `npx vite build` 통과 · `gm check` 통과.

**한계(문서에 적었다).**
1. 자막 뱃지는 씬 스킨으로 안 바뀐다 — 씬 밖 무대 레이어다. 루트 `skin` 에 적는다.
2. 씬 스킨의 추가 CSS 는 그 씬에 스코프되므로, 씬 바깥 요소를 노리는 규칙은 맞는 요소가
   없어진다. 씬 뿌리 자신은 `&` 로 노린다.

## 16. 스킨 쇼케이스 스타터 예제 (2026-08-28)

**왜.** 폰트는 산출물 하나에 하나라 `starter-fonts.json` 이 "값을 바꿔 가며 빌드해
비교하라"고 안내할 수밖에 없었다. 스킨은 §15 의 씬별 오버라이드가 있으므로 **한 번
빌드하면 6종이 다 보인다.** 그 차이를 그대로 보여주는 예제를 넣었다.

### `assets/examples/starter-skins.json` (신규)
8씬 36초 · `ink` · 16:9 · E2 · 루트 `skin: glass`.

| 씬 | 패턴 | 스킨 | 보여주는 것 |
|---|---|---|---|
| 1 | heroReveal | (루트) | 개념 — 색과 재질은 따로 고른다 |
| 2 | cardsCascade | `flat` | 표면 프리미티브 넷(면·테두리·모서리·블러) |
| 3 | processFlow | `brutalist` | 같은 토큰이 단계 카드에도 걸린다 |
| 4 | networkBuild | `neon` | 연결선 프리미티브(굵기·불투명도·끝 모양·광채) |
| 5 | cardsCascade | `clay` | 그림자와 반경만으로 만든 볼륨 |
| 6 | beforeAfter | `paper` | 패널에도 같은 표면 — 부품 170개 vs 프리미티브 48 |
| 7 | splitCompare | 인라인 정의 | 6개만 적고 42개는 물려받는다 |
| 8 | heroReveal | (루트) | 루트로 돌아와 닫는다 |

패턴을 6종으로 흩어 같은 패턴이 3연속되지 않게 했고, 씬마다 `notes`(발표자 노트)에
"왜 이 씬이 이 스킨인지"를 적었다. `_note` 에 폰트 예제와 다른 점, 테마를 바꿔 다시
빌드하는 법, 표면이 없는 패턴(quote·kineticType·dataCounter)은 스킨을 갈아도 티가
적다는 것, 자막 토큰이 씬 스킨으로 안 바뀌는 것을 적었다.

**7씬의 인라인 토큰은 그 씬에서 눈에 보이는 것만 골랐다.** 처음에는 `link-w` ·
`kick-caps` 를 넣었는데 splitCompare 에는 연결선이 없고 킥커가 한글이라 둘 다 화면에
드러나지 않았다 — "6개 바꿨다"고 적어 두고 4개만 보이면 예제가 거짓말을 한다.
`surf-shadow`(금색 오프셋) · `kick-size`(34px)로 바꿨다.

### 등록
`src/components/ExamplesPanel.tsx` 는 예제 디렉터리를 glob 하므로 설명 한 줄만 더했다.
`SKILL.md`(예제 표 · 스타터 12종 → 13종) · `MANUAL.md`(예제 표 · 스킨 절).
`assets/selftest.baseline.json` 갱신 — **추가 1건, 기존 13건은 값 그대로**임을 확인했다.

**검증.** `gm validate` 오류·경고 0 · `gm test` 131건 통과 · 씬 8개를 브라우저로
시킹해 재질이 씬마다 갈리는 것을 실측(`(루트)/flat 14px/brutalist 0px/neon 14px+블러/
clay 32px/paper 6px/sk7 2px`)하고 스크린샷으로 육안 확인.

## 17. networkBuild 의 `links` 가 하이픈이 든 라벨을 조용히 버리던 문제 (2026-08-28)

**증상.** §16 예제를 만들다 발견했다. 노드 라벨을 `link-w` `flow-op` `ln-cap` 로 두고
`links: ["허브>link-w", "허브>flow-op", "허브>ln-cap", "허브>glow"]` 를 적었는데
**선이 4개 중 1개만 그려졌다.** 노드는 5개 다 정상으로 보여서 원인을 짚기 어렵다.

**원인.** 구분자 정규식이 `/\s*[>\-]+\s*/` 로 **하이픈까지 구분자로 봤다.**
`"허브>link-w"` 가 `["허브","link","w"]` 로 갈리고 `findIdx("link")` 가 -1 을 돌려주면
뒤의 `.filter()` 가 **아무 말 없이** 그 링크를 버린다.

### `assets/gsapgraph.js`
- `>` 가 있으면 `>` 만 구분자로 쓴다. `>` 가 없을 때만 하이픈을 구분자로 본다 —
  `"A-B"` · `"A - B"` 표기는 그대로 살아 있다.
- **validate 에 참조 대조를 넣었다.** 못 찾은 라벨·범위를 벗어난 인덱스·구분자가 없는
  문자열을 씬 번호와 함께 경고하고, 노드 라벨 목록을 같이 보여준다. 파서를 고쳐도
  오타는 여전히 조용히 사라지므로 이쪽이 본질적인 절반이다.

### `assets/selftest.js`
- 링크 표기 4종(하이픈 라벨 + `>` · `"A-B"` · `"A - B"` · 인덱스 쌍)의 선 개수와
  못 찾은 참조 경고를 못 박았다.

**검증.** 표기 4종 모두 기대한 선 개수(2·2·1·2) · 오타·범위 초과·구분자 없음 3종 모두
경고 · `gm test` 131건 통과 · 예제 4씬의 선이 1개 → 4개.

## 18. 문서에 적힌 개수를 실제와 맞추고, 다시 어긋나지 않게 검사로 못 박음 (2026-08-28)

**왜.** §16 을 쓰다 `MANUAL.md` 의 테마 표가 **"테마 6종"이라 적혀 있고 12행이 있고
실제로는 15종**인 것을 발견했다. 종류를 늘리면서 문서를 안 고친 자리가 여럿 쌓여 있었다.
숫자가 틀린 문서는 읽는 쪽이 "이게 전부인가" 를 판단할 수 없게 만든다.

### 고친 값
| 위치 | 적혀 있던 값 | 실제 |
|---|---|---|
| `MANUAL.md` 테마 절 | 테마 6종 (표는 12행) | **15종** — `kraft` `clay` `blueprint` 3행 추가 |
| `MANUAL.md` 테마 절 | 밝은 배경 넷 · 어두운 여덟 · "12종 모두" | **밝은 여섯**(+`kraft` `clay`) · **어두운 아홉** · "15종 모두" |
| `MANUAL.md` 트랜지션 절 | 트랜지션 10종 (표는 10행) | **15종** — `pageFlip` `paperPeel` `curlWipe` `clayPop` `squish` 5행 추가 |
| `MANUAL.md` `gm info` 예시·레퍼런스 표 (2곳) | 배경 15 · 마크 12 · 프레임 8 · 일러스트 20 | **20 · 15 · 12 · 32** |
| `MANUAL.md` `gm info` 레퍼런스 표 | 트랜지션 10종 | **15종** |
| `references/api.md` | 벡터 세트 55종 | **79종** |

밝기 분류는 눈대중이 아니라 WCAG 상대 휘도로 계산해 갈랐다(`lum(bg) > .35`) —
`kraft`(#e8dcce)와 `clay`(#f0ece4)가 밝은 쪽인데 어두운 쪽으로 세어져 있었다.
새로 추가한 트랜지션 5종에는 "종이·점토 질감을 전제한다" 는 한 줄을 붙였다 —
목록만 늘리면 어디에 쓰는지 알 수 없다.

### `assets/selftest.js` — 재발 방지
문서 7종(`SKILL.md` `MANUAL.md` `references/*.md`)을 읽어 엔진의 실제 개수와 대조한다.

- **개수 대조** — 패턴·테마·스킨·폰트·트랜지션·화면비·에너지·차트·픽토그램·배경·마크·
  프레임·일러스트 13종의 "N종" 표기를 전부 훑는다.
- **이름 대조** — 개수만 맞추고 행을 안 넣으면 여전히 거짓말이므로, 테마·트랜지션·스킨의
  키가 표에 실제로 적혀 있는지 본다(`MANUAL.md` 테마·트랜지션, `theming.md` 테마·스킨).
- **샘플 CLI 출력은 제외** — `씬 7(패턴 7종)` 은 그 스펙의 이야기일 뿐 재고 주장이 아니다.
  줄 단위로 보며 `씬 <숫자>` 가 있는 줄과 `✓ ✗ OK INFO WARN !` 로 시작하는 줄만 건너뛴다.
  **코드 블록 전체를 빼지는 않았다** — `gm info decor  # 배경 레이어 20종` 같은 주석은
  검사해야 하는 주장이다.

**검증.** `gm test` **136건 통과** (131 → 136). 검사에 이가 있는지 확인하려고 일부러
`테마 15종`→`14종`, 표에서 `blueprint`→`blueprnt` 로 훼손해 두 검사가 각각 잡는 것을
확인하고 복원했다. §14 의 프리미티브 무변화 증명 49/49 유지 · 예제 13종 `gm validate`
오류 0 · `tsc` · `vite build` 통과.

## 19. processFlow 화살표 — 꺽쇠가 선보다 먼저 다 떠 있던 문제 (2026-08-28)

**증상.** 단계 넷인 씬에서 아직 오지 않은 3번째 화살표의 **꺽쇠(`>`)만 화면 오른쪽에
떠 있었다.** 선도 없고 다음 블록도 없는데 화살표 머리만 있다. 의도한 순서는
단계 → 화살표 → 다음 단계인데, 보이는 순서는 "꺽쇠 전부 먼저 → 블록 → 선" 이었다.

**타임라인은 원래 맞았다.** 실측하면 step0(0.53) → arrow0(0.82) → step1(1.06) →
arrow1(1.35) → step2(1.59) 로 순서가 정확하다. 문제는 그리는 방식이었다.

**원인 둘. 두 번째가 함정이다.**

1. 머리를 `marker-end` 로 붙이고 있었다. **SVG 마커는 `stroke-dasharray` 를 타지 않는다** —
   DrawSVG 가 선을 0%에서 늘리는 동안에도 마커는 처음부터 path 끝점에 온전히 그려져 있다.
2. 그래서 머리를 같은 path 의 **두 번째 서브패스**로 이어 붙여 봤는데 이것도 틀렸다.
   **SVG 는 서브패스마다 dash 패턴을 처음부터 다시 시작한다.** 선이 15% 그려질 때
   머리도 자기 길이의 15%가 같이 나타난다(실측으로 확인 — 선 끝 한참 앞에 꺽쇠 조각이 떴다).

**해결.** 선과 머리를 **서브패스 하나뿐인 path 두 개**로 두고, 머리의 draw 를 선보다
늦게 건다. `data-head` 로 구분하고 선택자는 `:not([data-head])` / `[data-head]` 를 쓴다.
클래스는 `.gg-arrow` 를 그대로 공유하므로 CSS 규칙이 늘지 않는다.

### `assets/gsapgraph.js`
- `arrowParts(x1, y1, x2, y2, max)` 추가 — `{line, head}` 를 돌려준다. 머리 길이는
  선 길이의 40%를 넘지 않게 상한을 둔다(세로 배치의 짧은 화살표 28px 에 가로용 16px
  머리를 그대로 쓰면 머리가 선의 절반을 넘는다). `arrowSVG(i, parts)` 로 마크업을 만든다.
- processFlow — `<defs><marker>` 삭제, 가로·세로 모두 `arrowSVG(arrowParts(...))`.
- draw 를 둘로: 선 `aw * .72`, 머리는 `t + aw * .64` 에서 `aw * .36`. 살짝 겹쳐 걸어
  선이 끝나며 꺽쇠가 닫히게 했다. **화살표 전체가 끝나는 시각(`t + aw`)과 이후
  `t += aw * .8` 은 예전과 같다** — 그래서 씬 길이와 씬 시작 시각이 하나도 안 바뀐다.
- `.gg-arrow` 의 `color:var(--acc)` 삭제 — 마커의 `currentColor` 를 위해 있던 것이라
  머리를 path 로 옮긴 뒤로는 죽은 선언이다.

### `assets/selftest.js`
- `marker-end`·`<marker` 가 산출물에 없는지, 화살표 path 가 선 3 + 머리 3 인지,
  **서브패스가 여럿인 화살표 path 가 0개**인지(2번 함정의 재발 방지),
  그리고 `단계 → 선 → 꺽쇠 → 다음 단계` 시각 순서와 `꺽쇠 < 다음 단계` 를 못 박았다.
- 테스트 헬퍼에서 한 번 걸렸다 — `:not([data-head])` 안에도 `[data-head]` 가 들어 있어
  부분일치로 찾으면 선을 머리로 잡는다. 술어로 정확히 가르게 고쳤다.

### `assets/selftest.baseline.json`
화살표마다 트윈이 하나 늘어 processFlow 를 쓰는 예제 7종이 **+2** 씩 됐다.
갱신 전후를 프로그램으로 대조해 **바뀐 필드가 `tweens` 뿐**이고 씬 수·총 길이·
씬 시작 시각은 그대로임을 확인했다.

### 문서
`references/spec.md` processFlow 절 — "단계 → 화살표(선이 자라고 → 꺽쇠가 닫힌다) → 다음 단계".

**검증.** 브라우저에서 시각별 실측 —
`t=0.90 선22%/머리0%` · `t=1.05 선100%/머리19%` · `t=1.45 arw0 완료, arw1 선43%/머리0%` ·
`t=1.62 arw1 선100%/머리92%, 단계3 opacity 28%` · `t=1.95 arw2 선15%/머리0%`.
**어느 시점에도 다음 화살표의 꺽쇠가 미리 떠 있지 않다.** 문제 프레임 스크린샷으로
육안 확인 · `gm test` **142건 통과** · §14 프리미티브 무변화 증명 49/49 유지
(`.gg-arrow` color 삭제분을 알려진 델타로 반영).

## 20. 커스텀 요소의 비대칭 제거 — 일곱 갈래 전부 스펙에 담긴다 (2026-08-28)

**왜.** §14~15 로 스킨은 스펙에 인라인할 수 있게 됐지만 테마·픽토그램·벡터는 앱의
`localStorage` 라이브러리에만 있었다. 스펙은 **이름만** 참조하므로 같은 스펙을 CLI 로
빌드하거나 남에게 넘기면 그 요소가 없다. 실측: `theme: "myBrand"` →
`✗ theme "myBrand" 는 없다` 가 뜨고 **조용히 midnight 으로 떨어진다.**
커스텀에 두 갈래가 생겼고 그 차이가 문서에도 없었다.

**설계.** 갈래마다 필드를 내지 않고 **`design` 블록 하나**로 모았다. 키를 앱의
커스텀 라이브러리와 **똑같이** 맞췄기 때문에 라이브러리 내보내기 JSON 을 그대로
붙일 수 있고, 앱이 스펙에 심는 것과 사람이 손으로 쓰는 것이 같은 모양이다.

```jsonc
"design": { "themes":{…} "skins":{…} "icons":{…} "arts":{…} "marks":{…} "decors":{…} "frames":{…} }
```

### `assets/design.js` (신규)
- `makers.{theme,decor,mark,art,frame}` — 정의 → 레지스트리 항목. **SVG 를 문자열
  템플릿으로 받는다**(`{accent}` `{W}` `{lv}` `{text}` …). 스펙은 JSON 이라 함수를
  담을 수 없고, 템플릿이라야 테마를 바꿔도 색이 따라온다. 통째 `<svg>` 도, 조각도 받는다.
- `install(design, reg)` / `restore(token)` — **빌드 범위 등록.** 레지스트리는 모듈
  수준이라 그냥 넣으면 같은 프로세스의 다음 빌드까지 오염된다(앱은 타이핑마다 빌드한다).
  이전 값이 있었는지까지 기억해 역순으로 되돌리므로, **기본 요소와 이름이 겹쳐도**
  (`midnight` 을 재정의해도) 빌드가 끝나면 기본이 돌아온다. 픽토그램의 한글 별칭도 되돌린다.
- `validate(design, SK)` — 테마의 색 10종 누락, `svg`·`path` 누락, 없는 갈래,
  없는 `where`, 스킨 토큰 오타를 오류로. 24×24 가 아닌 듯한 path 는 경고.

### `assets/gsapgraph.js`
- UMD factory 에 `design.js` 추가.
- `withDesign(spec, fn)` — 공개 진입점 **네 개 전부**(`validate` `toHTML` `timing`
  `compile`)를 감쌌다. `toHTML` 이 안에서 `compile` 을 다시 불러 중첩되지만
  `install` 이 이전 값을 기억하므로 안전하다.
- `usedDesignNames(spec)` — 스펙이 참조하는 이름을 모은다. 항목 필드는 `ITEM_KEYS`
  한 곳만 본다(위생 검사가 목록이 두 벌 되는 것을 막는다). `mark: "badge:NEW"` 처럼
  값이 붙는 표기도 이름만 떼어 낸다.
- `validate` 가 `design` 블록을 검사한다.

### 앱
- `src/engine/boot.ts` — `design.js` 주입. **`fillSvgTemplate` 와 4갈래 분기를 삭제하고
  엔진의 `makers` 에 위임했다** — 앱과 CLI 가 같은 함수를 써야 두 경로의 결과가
  어긋나지 않는다(예전에는 이 로직이 boot.ts 안에만 있었다). `registerCustomTheme` 도 위임.
- `src/lib/design.ts` — `collectSpecDesign` · `syncSpecDesign`. 참조하는 정의만 담고,
  결과가 같으면 **원래 객체를 그대로 돌려준다**(참조 동등) — 히스토리에 빈 칸이 쌓이지 않는다.
- `src/App.tsx` — `update` · `reset` 을 감싸 스펙이 바뀔 때마다 맞춘다. 라이브러리를
  고치면 스펙에 심긴 사본도 따라가게 `useEffect` 를 걸었다.
  **저장할 때 몰래 심지 않는다** — 편집 중에 JSON 편집기에 보여야 사용자가 무엇이
  들어 있는지 안다.
- `src/engine/types.ts` — `SpecDesign` · `Spec.design` · `Engine.usedDesignNames`.

### 문서
`references/spec.md` — **design 절 신규**(갈래별 필수 필드·좌표계 표, 템플릿 변수 목록,
빌드 범위, 앱 라이브러리와 키가 같다는 것) · 루트 필드에 `design`.
`MANUAL.md` — 커스텀 요소 절. **이름만 참조하면 CLI 에서 기본값으로 떨어진다는 경고**를 명시.
`README.md` — 구성에 `DesignPanel` `SkinsTab` `SkinPicker`, 기능 표에 디자인 스튜디오와
커스텀 재현성 두 줄(그동안 3190줄 기능이 문서에 한 줄도 없었다).

**검증.**
- `gm test` **163건 통과** (142 → 163). 인라인 디자인 21건 중 핵심은 **격리** —
  빌드 뒤 레지스트리에 남은 것 0, 기본 테마를 덮어써도 원상복구, 그리고
  **`design` 없는 다음 스펙은 커스텀을 모른다**(이게 안 되면 스펙 사이가 섞인다).
- **CLI 왕복 실측** — 커스텀 테마·스킨·픽토그램·배경만으로 쓴 스펙 한 장을
  `gm validate`(오류 0) → `gm build` → 브라우저에서 `--acc:#ff7a45` · 카드 반경 4px ·
  테두리 2px · 삼각 로고 · 우측 상단 광원 배경 전부 확인. **앱 없이, 등록 없이 재현된다.**
- **앱 왕복 실측** — 라이브러리에 커스텀 테마를 두고 테마 선택기에서 고르니 JSON
  편집기에 `design.themes.myBrand` 가 즉시 나타났고, 기본 테마(`ink`)로 되돌리니
  `design` 블록이 사라졌다. 더 심지도 덜 심지도 않는다.
- §14 프리미티브 무변화 증명 49/49 유지 · 예제 13종 오류 0 · `tsc` · `vite build` 통과.

## 21. 진행 모드 두 가지 — 빠른 빌드 · 화면 검수 (2026-08-29)

**왜.** 5단계(씬별 스크린샷을 떠서 눈으로 보기)는 이 스킬의 품질을 지탱하는 단계지만
씬 수에 비례해 몇 분이 든다. 시안을 빨리 보고 싶을 때도 항상 그 값을 치러야 했고,
그렇다고 조용히 건너뛰면 **검수한 것처럼 보이는 산출물**이 나간다. 값을 치를지 말지를
사용자가 고르게 하고, 고르지 않은 쪽은 **하지 않았다고 밝힌다.**

### `SKILL.md`
- **0단계** — `AskUserQuestion` 에 "어떻게 진행할까요?" 를 더했다(검수까지 · 빠르게).
  용도·톤과 **한 번에** 묻고, 말로 이미 정해졌으면 묻지 않는다("빠르게"·"시안만" →
  빠른 모드, "검수까지"·"꼼꼼히" → 검수 모드). **애매하면 검수 모드**가 기본이다.
  모드가 가르는 것은 5단계뿐이라는 것을 표로 못 박았다 — 나머지 단계는 같다.
- **5단계** — 빌드와 `gm check`(기계 검수, 몇 초)는 두 모드 공통으로 두고, 그 뒤에서
  갈랐다. 빠른 모드는 거기서 8단계로 간다. `gm check` 의 `✗` 는 정책 위반이라
  빠른 모드에서도 고친다 — 빠르다는 것이 정책을 어겨도 된다는 뜻은 아니다.
- **8단계** — 빠른 모드로 냈으면 "화면 검수는 하지 않았다" 를 한 줄로 밝히고,
  `?scene=<n>` 으로 직접 보는 법과 "검수해줘" 로 **5단계만 따로 돌린다**는 것을 알린다.
  다시 만들지 않는다 — 이미 만든 산출물에 검수만 얹는다.
- **원칙 7** — "스크린샷을 보지 않았으면 끝난 게 아니다" 는 그대로 두고, 빠른 모드가
  그 예외가 아니라 **미룬 것**임을 붙였다. 원칙을 무르지 않으면서 선택지를 여는 자리다.

### 설치본
`~/.claude/skills/gmotion/SKILL.md` 에 같은 내용을 복사했다(스킬은 그쪽을 읽는다).
`diff -rq` 로 vendor 와 차이 0 확인.

**검증.** `gm test` 163건 통과 — 문서 개수 대조 검사(§18)에 걸리는 표기를 건드리지 않았다.
설치본·vendor 동일.

## 22. 산출물 시각·모션 품질 패스 — 빛의 방향과 이징의 결 (2026-09-02)

**왜.** 씬별 정지 화면을 떠 놓고 보면 세 가지가 아마추어 티를 냈다.
(1) 다크 테마의 `blob` 배경이 단색 타원 + `feGaussianBlur` 라 채도가 죽어 잿빛 얼룩처럼
보이고 그라디언트 밴딩이 생겼다. (2) 기본 스킨(glass)의 카드가 그림자도 하이라이트도
없는 반투명 면 하나라 배경에서 떠오르지 못하고 윤곽이 뭉갰다. (3) 이징이 `power2/3`
일변도라 등장이 밋밋하고, 트랜지션 선언에 적은 이징(clayPop 의 elastic 등)을 런타임이
기본값으로 덮어써 탄성 전환이 탄성 없이 재생됐다.

타이밍(씬 시작 시각·트윈 수)은 하나도 건드리지 않았다 — 스냅샷 기준값 갱신 없이
`gm test` 163건이 그대로 통과한다. 바뀌는 것은 곡선의 결과 픽셀의 질감뿐이다.

### `assets/gsapgraph.js`
- **TOKENS.e** — enter `power3.out`→`power4.out`, dramatic `power4.out`→`expo.out`,
  move·draw `power2.inOut`→`power3.inOut`, overshoot `back.out(1.6)`→`back.out(1.4)`
  (덜 튀고 더 정확하게 안착). **ENERGY** ease 도 한 단씩 올렸다: E1 `power3.out` ·
  E2 `power4.out` · E3 `expo.out`. 빠르게 출발해 길게 감속하는 곡선이 전문 모션의 결이다.
- **`.gg-stage` 배경** — 상단에 액센트 기운(`tint(accent, 17)`, 밝은 테마는 `0a`)을
  라디얼로 한 겹 더 깔았다. 화면에 색온도가 생기고 평평한 남색이 사라진다.
  `tint(hex, aa)` 헬퍼 추가 — 헥스가 아니면 그대로 돌려줘 커스텀 테마에 안전하다.
- **TRANSITIONS.fade** — 나가는 씬 `scale:1.012`, 들어오는 씬 `scale:.988` 드리프트.
  기본 전환이 정지 화면 겹침이 아니라 숨 쉬는 크로스디졸브가 된다.
- **cardsCascade** — 위로 들어오는 기본 등장에 `scale:.97` 안착을 더했다.

### `assets/skins.js`
- **glass** — "값을 옮겨 적었을 뿐, 손대지 않는다" 시대를 끝내고 빛의 방향을 정했다.
  빛은 위에서 온다: 위쪽 헤어라인 하이라이트(inset), 윗면이 살짝 밝은 광택 그라디언트
  (`surf-fill`, 다크 테마만), 낮게 깔린 그림자(`surf-shadow`). 밝은 테마는 흰 하이라이트
  대신 그림자가 형태를 만든다 — `darkBg()`(WCAG 휘도) 로 가른다.
- **glow** — 한 겹 10px 광채를 두 겹(좁고 진한 심지 5px + 넓고 옅은 번짐 16px)으로.
  한 겹 광채는 스티커처럼 떠 보인다. `hub-ring`·`target-ring` 에도 옅은 외곽 번짐 추가.
- **flat** — glass 가 그림자를 갖게 됐으므로 `surf-shadow:'none'` 을 명시해 상속을 끊었다.
  플랫은 이름대로 평평해야 한다. brutalist·clay·paper·neon 은 원래 자기 그림자가 있다.

### `assets/vectors.js`
- **DECOR.blob** — 블러 타원을 버리고 라디얼 그라디언트 오브로. 심지(×1.35)는 진하고
  가장자리는 길게 사라진다 — 잿빛 얼룩이 발광하는 오라가 되고 밴딩이 없어진다.
  결정적 난수 소비 순서는 그대로라 배치가 안 바뀐다.
- **DECOR.mesh** — 2스톱 선형 감쇠에 중간 스톱(52%, ×.45)을 넣어 꼬리를 길게 뺐다.

### `assets/runtime.js`
- **트랜지션 이징** — 선언에 `ease` 가 있으면 그 값이 이긴다(`p.rest.ease || 기본값`).
  clayPop 의 `elastic.out`/`back.in` 이 처음으로 실제로 재생된다. 들어오는 쪽 기본을
  `power2.out`→`power3.out` 으로 올렸다.

### 문서
`references/theming.md` 의 에너지 표·모션 토큰 값, `MANUAL.md`·`theming.md`·`SKILL.md` 의
glass 설명("기존 산출물과 같은 모습" → 빛의 3겹)을 실제와 맞췄다.

**검증.** `gm test` 163건 통과(스냅샷 갱신 없음 — 타이밍 불변의 증명) ·
`gm check` 통과(transform/opacity 만 애니메이션) · 예제 8종 재빌드 후 씬별 스크린샷
대조: 다크 카드에 윤곽·부양이 생기고, blob 이 발광 오라로, 라이트 리포트 카드는
낮은 엘리베이션으로. brutalist/clay/paper/neon 재질은 전후 동일. 클레이 전환·키네틱
마스크 리빌 중간 프레임 정상.

## 23. 씬 패턴 4종 추가 — funnel · cycle · anatomy · featureMatrix (2026-09-02)

**왜.** 패턴은 "문장의 동사"인데(direction.md §2), 전문 explainer 의 단골 동사 넷이
비어 있었다. (1) 단계마다 걸러져 **줄어든다**(전환 퍼널 — chart 17종에도 없다),
(2) 과정이 **돌고 돈다**(플라이휠 — processFlow 는 직선 일방향), (3) 한 비주얼의 부위를
**짚는다**(해부도 — zoomDetail 은 한 곳만), (4) 여럿을 여러 기준으로 **견준다**
(비교표 — splitCompare 는 2자까지). 20종 → 24종.

### `assets/gsapgraph.js`
- **funnel(§21)** — `stages[]`. 중앙 정렬 바가 위→아래로 좁아진다. 폭 = 바닥 .36 +
  값 비례 .64(순수 비례는 마지막 단이 라벨을 못 담는다). 색은 `CH.mix` 시퀀셜 램프 —
  **마지막 단이 순수 액센트**라 시선이 결론에 모인다. 글자색은 바 색의 WCAG 휘도(> .3)로
  가른다. 단 사이 "↓ n%" 통과율(`rates`, 기본 true). 바는 scaleX 로 중앙에서 벌어지고
  값은 `tw.count` 로 올라간다(단위는 카운트 대상 밖 — textContent 를 갈아치우기 때문).
  note 는 바 밖 오른쪽(`gg-fnSide`) — 안에 넣으면 좁은 단에서 라벨을 밀어낸다.
- **cycle(§22)** — `steps[]` + 선택 `center{}`. `ringOf` 타원 위에 노드를 놓고 노드 사이를
  잘게 쪼갠 폴리라인 원호(+ `arrowParts` 꺽쇠)로 잇는다. processFlow 와 같은 문법:
  선이 자라고 꺽쇠가 닫는다. 마지막 원호가 처음으로 돌아가 고리를 닫으면
  `fx:pulse` 로 전체가 한 번 맥동한다 — "반복이 시작됐다"는 신호.
- **anatomy(§23)** — `parts[]` + `art|icon`(필수). 가로: 콜아웃이 좌우로 번갈아 붙고
  지시선은 점(비주얼 주위 원 위) → 꺾임 → 라벨. 세로: 지시선을 흩뿌리면 꼬여서,
  비주얼에서 내려온 **레일 하나**가 점들을 꿰는 구조로 갈랐다. 점 팝 → 선 드로우 →
  라벨 순서로 부위 하나씩.
- **featureMatrix(§24)** — `cols[]`(≤4) × `rows[]`. 열 헤더는 미니 카드, 행은 표면 토큰을
  읽는 줄무늬 행. `values` 는 true(✓ good) · false(✕ dim) · 문자열. `highlight` 열에는
  표가 다 찬 **마지막에** 링(`target-ring`)이 감긴다 — 결론은 마지막에. E3 는 임팩트 동반.
- REQUIRED · MAXITEMS(전부 6, matrix 10) · ITEM_KEYS(`stages` `parts`) 등록.
  featureMatrix 의 `values` 개수가 열 수와 다르면 validate 가 짚는다.
- CSS: `gg-fn*` `gg-co*` `gg-anat*` `gg-fm*` — 전부 스킨 프리미티브(표면·반경·링 토큰)만
  읽으므로 6종 스킨·15종 테마에 자동으로 따라간다.

### 문서 · 예제 · 앱
- `SKILL.md` `MANUAL.md` `references/spec.md` — "패턴 24종"으로. spec.md 에 4종의 필드·예시
  절 추가. `direction.md` — 동사 표 4행, 밀도 표에 funnel·cycle·anatomy(6) 추가.
- `assets/examples/starter-verbs.json` — 4종을 한 편에 담은 쇼케이스. 스냅샷 기준값에
  추가됐다(기존 예제 기준값은 그대로 — 이 작업은 기존 산출물 타이밍을 안 바꾼다).
- 앱: `src/engine/schema.ts` 폼 스키마 4종 + `blankScene` 기본값,
  `ItemsEditor` 에 `values`(쉼표 입력, O/X ↔ true/false) · `highlight`(체크) 필드.

**검증.** `gm test` 164건 통과(기준값은 starter-verbs 추가분만 갱신 — diff 순증 확인) ·
`gm check` 8/8 OK(transform/opacity 만) · 16:9 다크/라이트 · 9:16 씬별 스크린샷 육안 검수 ·
재생 중간 프레임(퍼널 카운트 진행, 사이클 원호 드로우) 정상 · `npm run build`(tsc) ·
`vitest` 24건 · `cargo test` 11건 통과. `~/.claude/skills` 설치본 없음 — 동기화 대상 없음.

## 24. 외부 이미지 규약 — arts·decors 가 svg 대신 image 를 받는다 (2026-09-02)

**왜.** 로고·사진·스크린샷은 벡터로 못 그린다. `design.arts` 의 SVG 가 무살균으로
주입되는 것을 이용해 `<image href="data:…">` 를 손으로 심는 우회로는 있었지만,
규약이 아니라서 스킬(에이전트)이 쓸 수 없고 검증도 안 됐다. `image` 를 일급 필드로
승격한다 — 일러스트·배경 두 갈래만. 마크·프레임은 글자·콘텐츠 위에 얹는 장식이라
이미지가 설 자리가 아니다.

**규약.** `design.arts.<k>`·`design.decors.<k>` 에 `svg` **또는** `image` 중 정확히
하나(둘 다면 오류). `image` 값은 `<image href>` 에 들어갈 URI — data URI 권장,
원격 URL 은 경고(오프라인·MP4 렌더에서 안 보일 수 있다), **로컬 파일 경로는
`gm validate`·`gm build` 가 스펙 파일 기준으로 찾아 data URI 로 인라인**(`--audio`
인라인과 같은 계약 — 산출물은 여전히 파일 한 장). `fit`: `contain`(art 기본,
xMidYMid meet) · `cover`(decor 기본, slice). 이미지는 테마 색을 따라오지 않는다.

### `assets/design.js`
- `imageMarkup(def, w, h, defaultFit)` — href 를 XML 이스케이프해 `<image>` 조각으로.
- `makers.art`·`makers.decor` 가 `def.image` 면 그걸로 빌드 (art 200×200 · decor {W}×{H}).
- `validate` — 마크·프레임(svg 필수)과 일러스트·배경(svg|image 택일)을 갈랐다.
  둘 다·둘 다 없음은 오류, 없는 `fit`·원격 URL·경로 image 는 경고.

### `assets/gm.js`
- `inlineDesignImages(spec, specFile)` — data:·http(s): 가 아닌 image 를 스펙 파일 기준
  경로로 해석해 인라인. 없는 파일은 즉시 중단(빈 그림이 조용히 나가면 안 된다).
  `validate` 와 `build` 둘 다 통과시킨다 — 검증이 빌드와 같은 눈으로 본다.
- 빌드 보고에 "이미지 N장 X.XMB 를 HTML 안에 넣었다 (자리 목록)" 한 줄.

### `assets/selftest.js`
- §6 오류 문구를 새 계약에 맞추고(`svg 도 image 도 없다`), §6b 추가 — image
  일러스트·배경 스펙이 오류 없이 `<image href>` 로 산출물에 실리는지, fit 오타·
  원격 URL·경로 image 경고 3종. 163건 → 172건. **기존 예제 기준값은 그대로다** —
  이 작업은 타이밍을 안 건드린다.

### 문서
- `references/spec.md` design 절 — 갈래 표(`svg` 또는 `image`)와 외부 이미지 단락·예시.
- `MANUAL.md` 커스텀 요소 절 · `SKILL.md` §2(사용자가 로고·사진을 주면) · `gm.js` 사용법 헤더.

### 앱
- `src/engine/types.ts` — arts·decors 항목 `{ label; svg?; image?; fit? }`.
- `src/engine/boot.ts` — `registerCustomVector` 가 image·fit 을 엔진 maker 로 전달(타입만).
- `src/lib/designStore.ts` — `addArt`·`addDecor` 를 객체 인자로, image 는 2MB(문자 수)
  상한(localStorage 라서), 가져오기 검증이 svg|image 택일·fit·상한을 지킨다.
- `src/components/DesignPanel.tsx` — 일러스트·배경 편집 모달에 "외부 이미지" 모드:
  파일 선택 → FileReader data URI → fit 셀렉트 → 미리보기. 목록 카드는 엔진 build()
  경로라 image 항목도 자동 렌더.

**검증.** `gm test` 172건 통과(기준값 갱신 없음) · 로컬 경로 스펙을 CLI 로 빌드해
data URI 인라인·경로 잔존 없음 확인, 산출물 브라우저 스크린샷으로 art(contain)·
decor(cover) 육안 검수 · 없는 파일 즉시 오류 · `npx tsc --noEmit` · `vitest` 24건 통과 ·
DesignPanel 을 단독 마운트해 업로드 → 저장 → localStorage 왕복 → 리로드 후 카드 렌더까지
브라우저로 확인. `~/.claude/skills`·`~/.agents/skills` 설치본 없음 — 동기화 대상 없음.

## 25. ART 일러스트 48종 전면 재작업 — 디자인 시스템 도입 (2026-09-02)

**왜.** 기존 일러스트는 "균일 4px 스트로크 + 저투명 단색 채움"이라 평면적이고
아마추어 티가 났다. 개별 손질 대신 공통 디자인 시스템을 깔고 48종을 다시 그렸다.

### `assets/vectors.js` — ART 섹션 전체 교체
**디자인 시스템** (새 헬퍼):
- `art(T, body)` — 시그니처 변경(`art(body)` → T 를 받는다). 모든 그림 defs 에
  4개 페인트를 자체 포함: `FG`/`FG2`(accent·accent2 세로 페이드 몸통, .34→.05),
  `FH`(accent→accent2 대각 블렌드 — 그림당 하나뿐인 주인공 요소 전용),
  `ggGs`(접지용 라디얼). helpers 는 ART 전용이라 다른 섹션 영향 없음.
- `gid(T)` — defs id 에 테마색 해시를 붙인다. 한 페이지에 다른 테마의 그림이
  공존해도(앱 테마 탭) 그라디언트가 섞이지 않는다. 같은 테마 중복은 같은
  내용의 중복 id 라 무해하다.
- `ground(T, cx, cy, rx)` — 발밑 라디얼 음영. 그림이 카드 위에 접지한다.
- `spark(x, y, s, col, o?)` — Q 곡선 4점 반짝임. 시선점에 하나, 많아야 둘.
- `S`/`S2` 가 두께 인자를 받는다(`S(T, 2.5)`), 기존 호출( T 만)은 4 유지.

**48종 공통 문법.** 주 실루엣 = 그라디언트 채움 + 4px 스트로크, 보조 디테일 =
2.5~3px .35~.6, 주인공 요소 하나만 FH, 접지 음영, 스파클. `gg-artP` 스태거
그룹과 `gg-artSpin`/`gg-artSpinR`/`gg-artFlow` 루프는 그대로 — 특히 flow 의
파이프 경로는 CSS 키프레임(`ggArtFlow`)과 좌표가 묶여 있어 한 점도 안 바꿨다.

**형태 교정** (기존 지오메트리 버그):
- `puzzle` — knob 아크가 `A14`(현 32 > 2r=28)로 **유효하지 않은 아크**였다.
  두 조각이 같은 원(103.75,94 · r16)을 공유하도록 다시 그림 — large-arc=1 로
  반원이 볼록 튀어나와 정확히 맞물린다.
- `speedometer` — 바늘 피벗(100,144)과 아크 중심(100,112)이 어긋나 바늘이
  게이지를 뚫었다. 중심 (100,119)·r64 로 통일.
- `pieChart3d` — 아이소메트릭 파이가 안 읽혀 평면 분할 파이 + 분리 조각으로
  재설계. 라벨도 '분할 파이와 조각'으로.
- `bottleneck` — 벽 플랜지가 더듬이처럼 보여 제거, 대기 원 3개 대칭 + 목에
  끼인 작은 원 + 통과한 점의 잔상 페이드로 정리.

### 문서
- `references/api.md` — ART 수 20(실제와 불일치했다) → 48, defs 자체 포함 명시.

**검증.** `gm test` 172건 통과 · 48종 × 3테마(midnight·paper·neon) 콘택트시트를
브라우저 렌더해 육안 검수(다크·라이트 모두 대비 정상, 루프 클래스 보존) ·
`art(T, …)` 시그니처는 vectors.js 내부 전용이라 앱(`boot.ts` raw eval)·CLI 모두
무변경. 커스텀 일러스트(`design.arts`) 경로는 build() 를 안 타므로 영향 없음.

## 26. divergence — 칩이 제자리를 지나 화면 밖까지 튕겨 나가던 문제 (2026-09-02)

**증상.** 발산형에서 목표 칩이 링 좌표가 아니라 그 두 배 지점에 섰다.
실측(16:9, 목표 3개, cy=648): 칩이 `(1831, 898)` · `(89, 898)` · `(960, 94)` —
링 좌표는 `(1393, 762)` · `(527, 762)` · `(960, 382)` 다. 좌우 칩은 세이프 영역
밖 화면 구석에 박히고 위쪽 칩은 키커와 겹쳤다.

**원인.** MotionPath 는 path 좌표를 요소의 `x`/`y` 에 **그대로 얹는다**(현재
오프셋에 더하지 않는다). divergence 는 칩의 홈 좌표가 **도착점**이라 `set` 으로
`(cx-p.x, cy-p.y)` 만큼 중심으로 미리 옮겨 두는데, 경로는 출발점 기준인
`relCurve`(`M0 0 … dx dy`)를 썼다. 트윈이 시작되면 `set` 오프셋이 path 시작값
`0,0` 으로 덮여 칩이 홈으로 순간이동한 뒤 다시 `(dx, dy)` 만큼 밖으로 나간다 —
결과가 `2p - center`. convergence·networkBuild 는 홈이 곧 출발점이라 멀쩡했다.

### `assets/gsapgraph.js`
- `relCurveTo(x1,y1,x2,y2,bow)` 추가 — 같은 곡선을 **도착점 기준** 상대 좌표로 낸다
  (`M(x1-x2) (y1-y2) Q… 0 0`). 그린 `.gg-flow` 곡선과 제어점이 동일하다.
- `divergence` 의 칩 이동이 `relCurve` → `relCurveTo`. `set` 의 중심 오프셋이 path
  시작점과 정확히 같아져 순간이동이 없고, 칩은 `0,0`(=링 좌표)에 선다.

### `assets/selftest.js`
- 단위 검사 3건 추가 — 스냅샷 베이스라인은 씬 수·트윈 수·타이밍만 봐서 이 부류가
  통째로 안 보였다. divergence·convergence·networkBuild 를 컴파일해 모든 `k:'path'`
  트윈의 **path 시작점이 그 시각 요소의 `set` 오프셋과 같은지**, 발산형은 **끝점이
  `0,0`인지** 본다. 되돌리면(`relCurveTo`→`relCurve`) 2건이 즉시 실패한다.

**검증.** `gm test` 175건 통과(되돌림 실험에서 신규 2건 실패 확인) ·
헤드리스 브라우저로 씬 끝 프레임 실측: 칩 중심 `(1396, 764)` · `(524, 764)` ·
`(960, 362)` — 링 좌표와 일치(칩 실제 높이 65 vs `chipH` 가정 96 만큼 15px 위,
convergence 와 같은 기존 오차) · 비행 궤적을 `.gg-flow` path 에 투영해
`getPointAtLength` 로 대조: 진행률 0→1 단조, 경로 이탈 일정(칩 높이 오차분).
