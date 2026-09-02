# api — CLI · 검수 · 산출물 구조 · GSAP 함정

## CLI

```bash
G=<skill>/assets/gm.js

node $G validate spec.json                  # 오류와 연출 경고
node $G build    spec.json -o out.html      # 단일 HTML
node $G timing   spec.json -o sheet.csv     # 씬별 타임코드 (편집기용)

# 녹음이 끝났으면 — 자막으로 타이밍을 박고 음성을 얹는다
node $G build spec.json --subs voice.srt --audio voice.mp3 --captions -o out.html
node $G check    out.html                   # 산출물 기계 검수
node $G test                                # 엔진 회귀 검사 (엔진을 고쳤으면 반드시)
node $G info     [patterns|themes|trans|energy|aspects|tokens]
node $G pattern  convergence                # 패턴 하나의 필드
node $G icons    채팅                        # 픽토그램 191종 검색 (한글 지원)
node $G info     decor|mark|frame|art       # 벡터 세트 102종
```

빌드 플래그:

| 플래그 | 효과 |
|---|---|
| `--present` | **발표용으로 출력** — 씬 단위 진행 + 발표자 창 (아래). 화면 자막은 빠진다 |
| `--clean` | 플레이어 UI 없이 출력 (녹화용) |
| `--cdn` | GSAP 을 인라인하지 않고 jsDelivr 로 건다 — 146KB 가벼워지지만 오프라인 재생 불가 |
| `--no-fonts` | 폰트 CDN 을 걸지 않는다 |
| `--subs <f>` | **자막(SRT·VTT)으로 씬 타이밍을 실측으로 맞춘다.** 씬에 `say` 가 있어야 한다 |
| `--audio <f>` | 음성을 산출물에 심는다. 재생하면 **목소리가 시계를 잡는다** |
| `--captions` | 화면 자막을 얹는다 (`--subs` 와 함께). 화면 맨 아래에 붙고, 보는 쪽에서 `C` 키나 플레이어의 `CC` 버튼으로 끌 수 있다. **`--present` 산출물에는 실리지 않는다** |
| `--no-inline-audio` | 음성을 파일 안에 넣지 않고 경로로 참조한다 — HTML 옆에 둔다 |

`--subs` 는 `validate` `timing` 에도 준다. 안 주면 타임코드 시트가 추정 길이로 나온다.

기본 산출물은 **약 200KB 단일 파일**이다. GSAP(core + CustomEase + CustomWiggle +
DrawSVG + MorphSVG + SplitText + MotionPath + ScrambleText)이 인라인되어 있어 네트워크 없이
재생된다. 여덟 플러그인 모두 실제로 쓰인다 — 죽은 무게를 싣지 않는다.

| 플러그인 | 어디에 |
|---|---|
| DrawSVG | 선·화살표·축이 그려지는 모든 곳 |
| MorphSVG | `matchCut` 의 `anchorTo` — 도형이 다른 도형으로 변형 |
| MotionPath | `convergence`·`divergence` 의 곡선 이동, `networkBuild` 의 `flow` 점 |
| SplitText | 글자·단어 단위 스태거 |
| ScrambleText | `textFx: "scramble"` |
| CustomWiggle | `fx: shake` |
| CustomEase | 이징 등록 |

## 자막 동기화 — 화면을 목소리에 맞춘다

**순서가 있다. 자막이 먼저, 음성이 그다음이다.** `--audio` 만 주면 소리는 실측인데
화면은 글자 수 추정이라 어긋난다. 빌드가 이걸 경고한다.

```bash
node $G build spec.json --subs voice.srt --audio voice.m4a --captions -o out.html
```

빌드 리포트가 씬마다 자막 일치율을 찍는다.

```
  ✓ 씬 13(패턴 9종) · 530.54초 · ink · 16:9 · E2 · autoplay
    자막에 맞춤 — 13/13씬
    [1] 0s kineticType(15.85s)  자막 100%
    [4] 64.01s dataCounter(42.64s) ←zoomIn  자막 100%
    [7] 155.25s chart(73.28s) ←pushLeft  자막 93%
```

일치율이 50% 아래면 그 씬은 못 맞춘 것으로 보고 앞 씬 끝에 이어 붙인다. 조용히
틀린 시각을 넣는 것보다 어디가 안 맞는지 말해 주는 편이 낫다.

**경고를 읽는 법.** 자막 모드에서는 씬 길이를 문제 삼지 않는다 — 길이는 목소리가
정한다. 대신 세 가지를 짚는다.

| 경고 | 뜻 | 할 일 |
|---|---|---|
| 마지막 움직임 뒤 N초 정지 | 씬 하나가 너무 긴 대사를 덮는다 | 씬을 2~3개로 쪼개어 리듬을 만든다 |
| 첫 요소가 N초 뒤에 나온다 | 그때까지 제목만 있는 빈 화면 | 대개 씬을 쪼개야 한다 |
| N배 압축 | 대사가 연출보다 짧다 | 연출을 덜거나 씬을 합친다 |
| 자막과 say 가 맞지 않는다 | `say` 가 자막의 연속 구간이 아니다 | 건너뛴 문장을 채운다 |

**어느 분량에 맞는가.** 씬 하나가 5~15초 대사를 덮을 때 가장 자연스럽다.
씬 열 개로 9분을 덮으면 씬당 50초가 되어 대부분이 정지 화면이 된다 —
항목 앵커링으로 절반쯤 줄지만 근본 해법은 씬을 더 쪼개는 것이다.
**낭독 대본 전체를 화면으로 만드는 일이라면 `scriptviz` 가 맞는 도구다.**

산출물에서 시계는 음성이다. 진행 바를 끌거나 `GGM.seek()` 를 불러도 소리와 화면이
같이 움직인다. 자동재생이 막히면(브라우저 정책) 화면만 먼저 가고, 재생을 누르면
음성이 시계를 도로 가져간다.

## 엔진을 고쳤을 때 — `gm test`

`assets/selftest.js` 가 세 가지를 본다.

| 무엇 | 잡는 것 |
|---|---|
| 단위 | 자막 파서·정렬·validate·항목 앵커링처럼 겉으로 안 드러나는 동작 |
| 소스 위생 | **같은 이름의 함수가 두 번 선언됐는지**, 항목 필드 목록이 두 벌인지 |
| 스냅샷 | 예제 9종을 컴파일한 씬 수·총 길이·**씬 시작 시각 배열**·트윈 수 |

**씬 시작 시각 배열이 가장 민감한 감지기다.** 타이밍 계산을 건드리면 여기가 먼저
틀어진다 — 트랜지션 오버랩을 0.8 에서 0.7 로 바꾸는 정도로도 전 예제가 걸린다.

```bash
node $G test                # 고치기 전에 통과시켜 두고, 고친 뒤 다시
node $G test -v             # 무엇이 통과했는지 하나씩
node $G test --update       # 의도한 변경이면 기준값을 갱신한다
```

`--update` 는 **바뀐 값이 옳다고 확인한 뒤에만** 쓴다. 무심코 쓰면 회귀를 기준값으로
승격시키는 셈이 된다.

소스 위생 검사가 있는 이유가 있다. 엔진이 2,700줄 한 파일이라 `function lines()` 를
두 번 선언하는 일이 실제로 일어났고, 뒤엣것이 앞엣것을 조용히 덮어 제목 줄바꿈
계산이 틀어졌다. 자바스크립트는 이때 아무 말도 하지 않는다.

## 검수 쿼리 — 이 스킬의 핵심 도구

산출물에 붙이는 쿼리스트링. **씬별 스크린샷 검수가 이걸로 된다.**

| 쿼리 | 효과 |
|---|---|
| `?paused=1` | 자동재생하지 않고 0초에서 정지 |
| `?scene=<n>` | 씬 n(0부터)의 기준 프레임으로 세우고 정지 |
| `?t=<초>` | 그 시각으로 세우고 정지 |
| `?clean=1` | 플레이어 UI 제거 (스크린샷에 안 걸린다) |
| `?motion=off` | 감소 모션 상태 강제 — 정적 대체가 읽히는지 확인 |
| `?motion=on` | OS 감소 모션 설정을 무시하고 애니메이션 재생 |
| `?cc=0` | 화면 자막을 끈 채로 시작 (자막 없는 컷을 뽑을 때) |
| `?raw=1` | 스테이지 스케일을 1로 고정 (원본 픽셀 확인) |

## 벡터 세트

전부 **코드로 그린다.** 이미지 파일이 없고, 테마 색을 받아 그 자리에서 SVG 를 만들며,
스펙이 실제로 쓴 것만 산출물에 실린다.

| 세트 | 수 | 특징 |
|---|---|---|
| `DECOR` 배경 | 15 | 씬 배경. CSS 애니메이션으로 느리게 움직인다(마스터 타임라인과 무관) |
| `MARK` 강조 | 12 | 대상 폭에 맞춰 늘어난다. 선 두께는 `vector-effect="non-scaling-stroke"` 로 지킨다 |
| `FRAME` 디바이스 | 8 | `build()` 가 `inner{x,y,w,h}` 를 함께 돌려준다 — 패턴이 그 안에 DOM 을 놓는다 |
| `ART` 일러스트 | 48 | `<g class="gg-artP">` 로 부분이 나뉘어 있어 조각이 스태거로 등장한다. 테마색 그라디언트·접지 음영·스파클은 defs 로 자체 포함된다 |

난수는 결정적이다(`rng(seed)`) — 같은 스펙은 언제 빌드해도 같은 그림을 낸다.
`Math.random` 을 쓰면 다시 뽑을 때마다 배경이 달라져 프레임 캡처가 어긋난다.

## 발표용 산출물 — `--present`

```bash
node $G build spec.json -o 발표.html --present
```

청중 화면에는 하단 진행 바와 씬 번호만 남고, 발표 도구는 별창으로 나간다.

**화면 자막은 실리지 않는다.** `--captions` 를 함께 줘도 발표용 산출물에는 자막 요소가
들어가지 않는다 — 말은 발표자가 하는데 같은 문장이 화면에 또 뜨면 방해가 된다.
`--subs` 로 맞춘 씬 타이밍은 그대로 적용된다.

| 키 | 동작 |
|---|---|
| `→` `Space` `Enter` `PageDown` · 클릭 | 다음 씬 (그 씬의 모션이 재생된다) |
| `←` `PageUp` | 이전 씬 |
| `1`~`9` | 해당 씬으로 점프 |
| `Home` `End` | 처음 / 마지막 씬 |
| `R` | 지금 씬의 모션을 다시 |
| `B` | 검은 화면 (청중 시선을 끊을 때) |
| `O` | 씬 목록 오버레이 — 클릭해 점프 |
| `P` | 발표자 창 열기 |
| `F` | 전체화면 |

발표자 창은 같은 파일을 `?presenter=1` 로 연 것이다. `P` 로 열리지 않으면
(팝업 차단) 주소에 직접 붙여 새 창으로 연다. 두 창은 `postMessage` 로 붙어
어느 쪽에서 조작해도 함께 움직인다.

발표자 창에 뜨는 것: **다음 씬 미리보기** · 지금 씬 노트 · 다음 씬 노트 ·
경과 타이머 · 씬 목록(클릭 점프). 노트는 스펙의 `notes`(없으면 `purpose`)다.

세팅: 발표 화면을 프로젝터·외부 디스플레이에 `F` 로 전체화면, 발표자 창은 노트북에.
`?scene=n` 을 붙이면 그 씬이 완성된 상태로 시작한다 — 중간부터 발표하거나 검수할 때.

**발표 화면이 완전히 가려지면 브라우저가 애니메이션을 멈춘다.** 다른 창으로 덮지 말고
별도 디스플레이나 전체화면에 두어야 한다. 다시 보이면 이어서 진행된다.

## 산출물 JS API

`window.GGM` — 검수·캡처용.

```js
await GGM.ready            // 폰트 로드 + 타임라인 조립 완료
GGM.total                  // 전체 초
GGM.scenes                 // [{id, pattern, at, dur, shot}] — shot 이 검수 기준 프레임
GGM.goto(i)                // 씬 i 의 기준 프레임으로 세우고 정지
GGM.seek(t)                // t초로 세우고 정지
GGM.frame(n, fps=30)       // 프레임 번호로
GGM.play() / pause() / replay()
GGM.master                 // GSAP 타임라인 (직접 조작 가능)

// --present 로 빌드했을 때만
GGM.present.next() / prev() / jump(i) / replayScene() / index()
GGM.openPresenter()        // 발표자 창 열기
```

`GGM.goto(i)` 는 **씬의 내용이 다 나왔고 다음 씬은 아직 안 들어온** 프레임을 잡는다.
트랜지션 겹침 구간을 피하므로 씬별 스크린샷이 깨끗하다. `convergence` 처럼
요점이 잠깐 나타났다 사라지는 패턴은 엔진이 기준 프레임을 따로 지정해 둔다.

## agent-browser 로 씬별 검수

```bash
D=/tmp/shots; mkdir -p $D
agent-browser open "file://$PWD/out.html?paused=1&clean=1"
agent-browser eval "GGM.scenes.length"          # 씬 수 확인
for i in 0 1 2 3 4 5 6; do
  agent-browser eval "GGM.goto($i)" >/dev/null
  agent-browser screenshot "$D/s$i.png" >/dev/null
done
agent-browser errors --json                     # 콘솔 오류 0 이어야 한다
```

**자동 재생은 이 방법으로 검증할 수 없다.** agent-browser 의 창은 오프스크린이라
`requestAnimationFrame` 이 거의 돌지 않는다(실측: 3초에 1프레임). `master.play()` 를
불러도 시간이 흐르지 않는다. 대신 **시킹은 rAF 없이도 즉시 렌더되므로**
`GGM.seek` / `GGM.goto` 로 검증한다. `step` 모드의 정지 지점처럼 재생 동작을 확인해야
할 때는 타임라인을 직접 조회한다:

```bash
agent-browser eval "GGM.master.getChildren(false,true,true)
  .filter(c=>c.vars&&c.duration()===0).map(c=>+c.startTime().toFixed(2))"
```

찍은 뒤 **반드시 이미지를 눈으로 본다.** 기계 검수(`gm check`)가 잡지 못하는 것:
글자 넘침, 요소 겹침, 수직 균형, 카메라가 콘텐츠를 화면 밖으로 밀어내는 것,
밝은 테마에서 비네트가 지저분한 것 — 전부 스크린샷에서만 보인다.

창이 작으면 세로 포맷(9:16)이 작게 축소되어 판단이 어렵다. 그때는
`?raw=1` 로 원본 픽셀을 보거나 씬 하나를 확대해 확인한다.

## PNG 시퀀스로 뽑기

편집기에 넣을 컷이 필요하면 프레임을 하나씩 세워 찍는다.

```bash
agent-browser open "file://$PWD/out.html?paused=1&clean=1&raw=1"
N=$(agent-browser eval "Math.ceil(GGM.total*30)" | tr -d '"')
for ((f=0; f<N; f++)); do
  agent-browser eval "GGM.frame($f,30)" >/dev/null
  agent-browser screenshot "$(printf 'frames/%05d.png' $f)" >/dev/null
done
```

프레임 수가 많으면 오래 걸린다. **필요한 구간만** `GGM.seek` 로 찍는 게 낫다.
`gm timing` 으로 뽑은 CSV 에 씬별 시작·끝 프레임이 있다.

## 산출물 구조

```html
<div class="gg-fit">              뷰포트
  <div class="gg-scale">          transform: translate(-50%,-50%) scale(k) — 뷰포트 맞춤
    <main class="gg-stage">       고정 좌표계(1920×1080 등). impact/shake 가 transform 을 쓴다
      <section class="gg-scene">  씬. visibility 로 켜고 끈다
        <div class="gg-world">    카메라(cam)가 확대·이동하는 대상
        <div class="gg-fixed">    카메라를 따라가지 않는 레이어 (헤더·상세 패널)
      <div class="gg-flash">      임팩트 플래시
      <div class="gg-vig">        비네트 (테마가 0이면 없음)
      <svg class="gg-grain">      필름 그레인
<script> GSAP 번들 </script>
<script> 런타임 + 트윈 IR </script>
```

엔진은 **GSAP 코드 문자열을 뱉지 않는다.** 선언적 트윈 목록(IR)을 뱉고,
산출물에 실린 런타임(약 280줄)이 그걸 마스터/씬 타임라인으로 조립한다.

```jsonc
{"k":"from","t":"#s2 .gg-cc","at":0.9,"v":{"y":44,"opacity":0,"duration":0.44},"st":0.08}
{"k":"draw","t":"#s4 .gg-arrow","at":1.2,"dur":0.3}          // DrawSVG 0→100%
{"k":"split","t":"#s1 .gg-kl","at":0,"by":"chars","v":{...}} // SplitText
{"k":"count","t":"#s3 .gg-val","at":.2,"dur":1.25,"from":0,"to":41}
{"k":"cam","at":3.1,"dur":1.4,"v":{"scale":1.42,"x":-210,"y":86}}
{"k":"fx","fn":"impact","at":2.4}
```

씬마다 자기 타임라인이 있고 마스터가 `add` 한다. 하나의 거대한 타임라인이 아니다.

## GSAP 함정 — 실제 브라우저에서 확인한 것만

1. **GSAP 은 대상의 transform 을 통째로 관리한다.**
   CSS 로 걸어 둔 `transform` 이 GSAP 트윈 한 번에 지워진다.
   이 스킬은 그래서 **뷰포트 맞춤용 `.gg-scale` 과 애니메이션용 `.gg-stage` 를 분리**한다.
   같은 요소에 CSS transform 과 GSAP 트윈을 함께 걸지 않는다.

2. **카메라(`cam`)는 world 안의 모든 것을 끌고 간다.**
   줌인하면 헤더도 상세 패널도 화면 밖으로 밀려난다. 카메라와 무관해야 하는 것은
   `.gg-fixed`(world 밖)에 넣는다.

3. **`String.replace` 의 대체 문자열은 `$` 를 특수 처리한다.**
   IR JSON 을 런타임에 심을 때 `replace('__SPEC__', json)` 을 쓰면 JSON 안의
   `$&` `$'` 같은 조각이 깨진다. **함수로 넘겨야 한다**: `replace(k, function(){return json})`.
   같은 이유로 플레이스홀더는 파일에 **한 번만** 등장해야 한다 — 주석에 먼저 쓰면
   주석이 치환되고 실제 코드는 남아 `ReferenceError` 가 난다.

4. **같은 요소를 두 번 SplitText 하면 span 이 중첩된다.**
   씬을 되감아 다시 재생할 때 발생한다. 분해 결과를 요소에 캐시해 재사용한다.
   3.13+ 는 `SplitText.create(el, opts)` 가 정식이고 `new SplitText()` 도 동작한다.

5. **무한 반복은 마스터 타임라인에 넣지 않는다.**
   `repeat: -1` 트윈을 마스터에 넣으면 마스터 길이가 무한이 되어 시킹이 깨진다.
   `orbit` 의 궤도 회전은 마스터 밖에서 독립적으로 돈다.

6. **시킹 왕복은 정확하다.**
   구간을 건너뛰어 `master.time(26)` → `time(0)` → `time(26)` 을 해도 상태가
   완전히 복원된다(실측). 프레임 캡처를 몇 번 다시 돌려도 같은 그림이 나온다.

7. **폰트가 늦게 오면 글자 분해 좌표가 어긋난다.**
   `document.fonts.ready` 이후에 타임라인을 조립한다.

8. **DrawSVG 는 stroke 가 있는 path 에서만 동작한다.**
   `fill` 만 있는 도형에는 효과가 없다. 이 스킬의 픽토그램은 전부 stroke 세트다.

9. **HTML 의 `hidden` 속성은 작성자 CSS 의 `display` 에 진다.**
   `hidden` 은 UA 스타일시트의 `display:none` 으로 동작하므로 `.x{display:grid}` 를
   써 두면 숨긴 요소가 그대로 보인다. 발표자 UI가 청중 화면에 뜨는 사고가 여기서 났다.
   `[hidden]{display:none!important}` 를 전역으로 깔아 막는다.

10. **클래스 이름은 한 파일 안에서 유일해야 한다.**
   플레이어 눈금(`.gg-mark`)과 강조 마크(`.gg-mark`)가 겹쳐 모든 마크가 2×12px 로 눌렸다.
   나중에 정의된 규칙이 이기므로 조용히 망가진다 — 새 클래스를 만들 때 기존 CSS 를 grep 한다.

11. **변수 섀도잉으로 테마가 통째로 사라질 수 있다.**
   씬 루프 안의 `var T = TRANSITIONS[tr]` 가 바깥의 테마 `T` 를 가려서 배경이 하나도
   안 깔렸다. 오류도 경고도 나지 않는다 — 값이 `undefined` 가 되어 조용히 건너뛴다.

12. **`addPause` 를 씬 경계에 두면 발표가 저절로 흐른다.**
   경계에 멈추면 그 씬의 `hold` 만큼(길면 3~4초) 발표자가 아무것도 안 했는데 타임라인이
   진행한다. 화면은 트랜지션 시작 전이라 그대로인데 인덱스만 다음을 가리켜서
   **"페이지 번호만 넘어가는"** 현상이 된다. 정지 지점은 **씬 콘텐츠가 끝나는 시각**이어야 한다.

13. **마스크(`overflow:hidden`) 안에 넣는 요소는 밖에서 쓰던 여백을 지운다.**
   `.gg-mcS` 의 `margin-top:18px` 이 롤 마스크 안에서도 살아 있어 글자가 아래로 밀려 잘렸다.
   특정도가 같으면(둘 다 클래스 하나) **나중 규칙이 이기므로** 부모를 붙여
   `.gg-mcRoll .gg-rollIn>*{margin:0}` 처럼 확실히 눌러 둔다.
   마스크 높이는 `line-height` 가 아니라 **실제 글리프**를 기준으로 잡는다 —
   한글은 em box 를 거의 다 써서 `line-height:1.2` 로는 위아래가 잘린다(1.5 이상 필요).

14. **hover 감지 영역을 `::before` 로 넓히면 클릭이 막힌다.**
   `position:absolute` 인 pseudo 요소는 `position:static` 인 형제 자식들 **위**에 그려진다.
   플레이어를 숨기면서 감지 판을 깔았더니 속도·재시작 버튼이 눌리지 않았다 —
   `elementFromPoint` 로 보면 버튼 자리에 부모가 잡힌다.
   감지 판에 `z-index:-1`, 조작 요소에 `position:relative;z-index:1` 을 준다.
   **CSS 로 클릭 영역을 건드렸으면 실제로 클릭해 확인한다** — 눈으로는 안 보이는 버그다.

15. **현재 씬 인덱스를 시간에서 역산하지 않는다.**
   `time() >= scene.at - ε` 식으로 계산하면 정지 지점이 경계와 겹칠 때 화면과 번호가
   어긋난다. 인덱스는 상태로 들고, 밖에서 시킹했을 때만 되맞춘다(`GGM.present.resync()`).

16. **GSAP 3.15 는 모든 플러그인이 무료다.**
   MorphSVG · SplitText · DrawSVG · MotionPath · CustomWiggle 포함
   (GreenSock Standard 'no charge' license). 별도 등록 없이 번들해 쓴다.

## 기계 검수 항목 (`gm check`)

자기 선언 대신 grep 으로 확인한다.

```
lang="ko" · prefers-reduced-motion · aria-label · data-pattern · window.GGM
document.fonts · 레이아웃 속성 애니메이션 없음 · 허용 외 외부 스크립트 없음
씬 수 · 패턴 종류 수 · 파일 크기
```

씬이 4개 이상인데 패턴이 1종이면 경고한다 — 같은 움직임이 반복되면
내용이 달라도 같은 화면으로 읽힌다.
