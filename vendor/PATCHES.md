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
