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

**검증.** `node assets/gm.js test` 92건 통과 · `cargo test` 5건 통과 · `npm run build` 통과.
