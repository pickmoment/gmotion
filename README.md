# gmotion

모션그래픽 스펙 에디터. Tauri 2 (Rust) + React + TypeScript.

선언적 JSON 스펙을 폼으로 편집하고, 실제 산출물 HTML 을 그 자리에서 미리 보고,
**HTML(일반·발표용·클린) · 타임코드 CSV · MP4** 로 내보낸다.
앱 안에 `gmotion` 스킬 전체가 들어 있어 `~/.claude/skills/gmotion` 설치도 이 앱이 한다.

엔진은 Claude Code 의 `gsap-motion` 스킬에서 갈라져 나왔다. 이 저장소가 그 사본을 들고 있고,
로컬 수정은 `vendor/PATCHES.md` 에 적혀 있다.

## 왜 이런 구조인가

**엔진은 앱이 직접 들고 있다.** `vendor/gmotion/` 이 스킬 디렉토리의 사본이고,
런타임에 사용자의 `~/.claude/skills` 를 읽지 않는다. 스킬이 설치돼 있지 않아도
앱은 완전히 동작하고, 오히려 앱이 스킬을 설치하는 쪽이다.

**엔진은 브라우저에서 돈다.** `gsapgraph.js` 는 UMD 라 Node 없이 웹뷰에서 그대로
실행된다. Node 전용 부분은 `gsap.bundle.js`·`runtime.js` 를 디스크에서 읽는 것뿐이고,
`toHTML(spec, { gsap, runtime })` 으로 소스를 주입하면 우회된다. Node 사이드카가 없다.

**산출물은 CLI 와 동일하다.** 같은 스펙을 CLI(`gm build`)로 빌드한 결과와
앱에서 빌드한 결과가 SHA-256 까지 일치한다. 미리보기도 별도 렌더러가 아니라
그 산출물 HTML 을 iframe 에 그대로 띄운 것이고, MP4 도 그 HTML 을 실제로 재생해 담는다 —
**미리보기·HTML·MP4 가 전부 같은 그림이다.**

```
vendor/gmotion/       스킬 전체 (소스 오브 트루스, 하나뿐)
  ├─ 프론트엔드가 ?raw 로 읽어 엔진을 부팅          → src/engine/boot.ts
  └─ Rust 가 include_dir! 로 바이너리에 넣어 설치   → src-tauri/src/skill.rs
```

**엔진 내부 이름은 스킬 이름과 분리한다.** 스킬은 `gmotion` 이지만 엔진 파일(`gsapgraph.js`),
전역(`GG`·`GGM`), CSS 클래스(`gg-*`), CLI(`gm.js`) 는 그대로다. 바꾸면 이미 만들어 둔
산출물이 깨지고 `gm check` 가 검사하는 정책 항목까지 어긋난다.

## 구성

```
src/
  engine/
    boot.ts          vendor 엔진을 브라우저에서 부팅 (CommonJS·UMD 셰임)
    schema.ts        패턴 28종의 편집 스키마 — 폼을 그리는 선언
    types.ts         엔진 공개 표면과 스펙 타입
  lib/
    build.ts         validate · toHTML · timing · gm check
    agents.ts        에이전트 CLI 어댑터(claude·codex·pi·omp) · 출력에서 JSON 추출
    specPrompt.ts    자막 → 씬 표 → 스펙 프롬프트 (카탈로그는 엔진에서, 예제는 번들에서)
    specGen.ts       CLI 호출 → 검증 → 진단을 되먹여 재요청하는 루프
    specDraft.ts     CLI 없이 만드는 규칙 기반 뼈대 초안
    spec.ts          스펙 불변 조작 헬퍼
    patternChange.ts 씬 유형 바꾸기 — 내용을 역할이 같은 자리로 옮기고 버린 것을 알린다
    media.ts         스펙의 media(자막·음성 경로) 를 읽고·적고·저장 위치에 맞춰 다시 잡는다
    useSpecStore.ts  실행 취소 / 다시 실행
    tauri.ts         Rust 커맨드 · 다이얼로그 · 렌더 진행률 래퍼
  components/
    Toolbar          파일 · 예제 · 자막/음성 · 내보내기 · 스킬
    SceneList        씬 목록 (재정렬 · 복제 · 삭제)
    SceneForm        패턴별 폼 + 씬 유형 선택 + 씬 공통 필드
    fields/          FieldRenderer · ItemsEditor · IconPicker · ChartEditor
    DocSettings      루트 필드 (테마 · 스킨 · 화면비 · 에너지 · 폰트 · 배경 · 음성 정렬)
    DesignPanel      디자인 스튜디오 — 테마 · 스킨 · 배경 · 마크 · 일러스트 · 프레임 · 픽토그램
    SkinsTab         스킨 탭 — 디자인 프리미티브 48종을 갈래별로 편집
    fields/SkinPicker  루트·씬 재질 선택 (스와치는 실제 카드 규칙과 같은 토큰을 읽는다)
    JsonEditor       스펙 원문 편집 (CodeMirror)
    Preview          산출물 iframe + 씬 트랜스포트
    ValidatePanel    오류 · 경고 · 자막 불일치 진단
    RenderPanel      MP4 진행률 · 멈추기
    SpecGenPanel     자막 → 스펙 초안 (CLI 선택 · 진행 로그 · 씬 표 · 검증 결과)
    CheckPanel · ExamplesPanel · DocsPanel · SkillPanel
src-tauri/
  src/skill.rs       번들 스킬 페이로드 — 상태 비교 · 설치 · 제거
  src/cdp.rs         Chrome DevTools Protocol 최소 클라이언트 · 실행파일 탐색 · base64
  src/render.rs      MP4 렌더 — 스크린캐스트 수신 · 고정 프레임률 리샘플 · ffmpeg 파이프
  src/agent.rs       에이전트 CLI 실행 — 실행파일 탐색 · PATH 보강 · 로그 스트림 · 취소
  src/lib.rs         파일 I/O · 음성 data URI · 파일 열기 · 커맨드 등록
  examples/rendercheck.rs   GUI 없이 렌더를 돌려 보는 도구
```

## 기능

|                  |                                                                                                                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 씬 편집          | 패턴 28종의 필드를 폼으로. 항목 배열은 문자열/객체를 오가며 스펙을 깨끗하게 유지                                                                                                                                                                 |
| 씬 유형 바꾸기   | 패턴을 바꾸면 내용이 **역할이 같은 자리로 따라간다**(제목·항목·양쪽 비교·중심 하나·수치). 자리가 없는 것만 버리고 무엇을 버렸는지 폼에 적는다                                                                                                    |
| 픽토그램         | 191종을 한글 별칭으로 검색해 고른다 — 이름을 외워 쓰지 않는다                                                                                                                                                                                    |
| 차트             | 17종. 차트 종류에서 데이터 형태(단일·다중·heatmap·scatter)를 끌어내 맞는 표를 그린다                                                                                                                                                             |
| 미리보기         | 실제 산출물을 iframe 에. 씬을 바꾸면 그 씬을 **처음부터 재생하고 씬 끝에서 멈춘다**                                                                                                                                                              |
| 검증             | `gm validate` 와 같은 오류(✗)·경고(!). 경고는 연출에 대한 지적이라 숨기지 않는다                                                                                                                                                                 |
| 자막·음성        | SRT·VTT 로 씬 타이밍을 실측 정렬, 음성을 data URI 로 산출물에 심는다. 한 씬도 못 맞추면 **다른 회차의 자막인지 짚어 준다**                                                                                                                       |
| 미디어 경로 기억 | 스펙 루트 `media`(`subs`·`audio`·`captions`)에 경로를 적어 둔다. **파일을 열면 자동으로 붙고**, 앱에서 고른 경로는 스펙에 적히고, 저장 위치가 바뀌면 상대경로를 다시 잡는다. 같은 스펙을 `gm build spec.json` 만으로 빌드해도 같은 파일을 읽는다 |
| 화면 자막        | 화면 맨 아래에 붙는다. 보는 쪽에서 `C` 키 · 플레이어 `CC` 버튼 · `?cc=0` 으로 끌 수 있다. **발표용 산출물에는 실리지 않는다**                                                                                                                    |
| 자막 → 스펙 초안 | 로컬 에이전트 CLI(claude·codex·pi·omp)로 **씬 표 → 스펙 JSON** 두 단계를 거쳐 받고, **앱의 검증기로 채점해 되먹인다**. 모델은 CLI 별로 골라 넣을 수 있다(비우면 CLI 기본값). CLI 가 없으면 자막을 그대로 배치한 뼈대 초안                        |
| 내보내기         | HTML(일반·발표용·클린) · 타임코드 CSV · MP4. 무엇이 실렸는지(자막·화면자막·음성) 결과에 명시한다                                                                                                                                                 |
| MP4 렌더         | 아래 절                                                                                                                                                                                                                                          |
| 검수             | `gm check` 와 같은 정책 검사                                                                                                                                                                                                                     |
| 디자인 스튜디오  | 테마·스킨·배경·마크·일러스트·프레임·픽토그램을 만들어 라이브러리(localStorage)에 보관. JSON 가져오기·내보내기                                                                                                                                    |
| 커스텀 재현성    | 스펙이 참조하는 커스텀 정의를 루트 `design` 에 **자동으로 심는다** — 앱에서 저장한 파일이 CLI 빌드에서도 같은 모습이 된다                                                                                                                        |
| 스킬 설치        | `~/.claude/skills` 또는 프로젝트 `.claude/skills` 로. 파일 단위 차이 표시                                                                                                                                                                        |
| 문서             | 번들 안의 direction·spec·charts·theming·api·MANUAL 을 앱에서 읽는다                                                                                                                                                                              |

단축키: `Ctrl+S` / `⌘S` 저장 · `Ctrl+O` / `⌘O` 열기 · `Ctrl+Z` / `⌘Z` 실행 취소 · `Ctrl+Y` / `Ctrl+Shift+Z` / `⇧⌘Z` 다시 실행

미리보기 트랜스포트: **씬 다시**(이 씬을 처음부터) · 재생(씬 경계를 넘어 계속) · 정지 ·
전체(0초부터) · `CC`(자막을 얹었을 때만)

## MP4 렌더

산출물 HTML 을 헤드리스 Chrome 이 **실제로 재생**하고, 그 화면을 CDP 스크린캐스트로 받아
ffmpeg 에 넘긴다. 별도 렌더러를 만들지 않으므로 미리보기·HTML·MP4 가 전부 같은 그림이다.

**시계는 음성이 잡는다.** Chrome 을 `--autoplay-policy=no-user-gesture-required --mute-audio`
로 띄우면 음성이 소리 없이 재생되며 런타임의 마스터 타임라인을 끌고 간다 — 영상 길이가
음성 파일과 어긋나지 않는다. 음성이 없으면 타임라인 자체 시계로 간다.
음성 트랙은 산출물에 심은 data URI 가 아니라 **원본 파일을 그대로 붙인다** — 다시 인코딩하지 않는다.

**프레임은 도착 시각으로 다시 샘플링한다.** 스크린캐스트는 30fps 보다 빠르게도 느리게도
온다. 프레임마다 붙어 오는 타임스탬프로 놓일 자리를 계산해, 이미 채운 자리에 온 것은 버리고
빈 자리는 직전 프레임으로 메운다. 그리기가 밀려도 길이가 밀리지 않는다.
(실측: 프레임 타임스탬프와 `GGM.master.time()` 이 0.02초 안에서 일치한다.)

**해상도는 고른다.** 화면비의 기준 크기(16:9 면 1920×1080)를 짧은 변 기준으로 오르내려
**480p·720p·1080p·1440p·4K** 를 낸다 — 긴 변은 화면비가 정하고, h264 가 요구하는 짝수로
맞춘다. 크기만 바꾸는 것이 가능한 이유는 런타임이 스테이지를 부모 박스에 맞춰 `scale()`
하기 때문이다(`runtime.js` 의 `fit`) — 비율이 같으면 같은 그림이 그 해상도로 래스터화된다.
기준 크기보다 크게 담을 때는 기기가 초당 30장을 못 그릴 수 있다고 알린다(길이는 리샘플러가
지킨다).

**크기는 미리 보여준다.** 해상도마다 예상 파일 크기를 칸에 적고, 고른 것은 범위까지 낸다.
근거는 실측이다 — 스타터 예제 3종을 네 해상도에서 렌더해 픽셀당 비트를 재 보니
해상도 변화는 `bpp ∝ 픽셀^-0.35` 로 7% 안에서 맞는데, **내용에 따른 차이는 7배**였다
(crf 고정이라 크기는 움직임 양과 배경 질감이 정한다). 그래서 대표값과 범위를 같이 내고,
렌더가 끝나면 **실제 크기**를 알려준다. 모델과 실측표는 `src/lib/render.ts` 에 있다.

코덱은 **30fps · h264 · yuv420p · crf 19 · BT.709 limited range** 다.
MJPEG 입력은 full range 라 그대로 두면 플레이어마다 대비가 달라지므로 변환해 태그까지 박는다.

실시간이라 **영상 길이만큼 걸린다** — 8분짜리면 8분이다. 진행률과 멈추기를 제공하고,
멈추면 만들다 만 파일도 지운다.

필요한 것: **Google Chrome** 또는 **Microsoft Edge**, 그리고 **ffmpeg**. 앱이 흔한 설치 위치를 직접 훑고
(`GMOTION_CHROME` · `GMOTION_FFMPEG` 로 지정할 수도 있다), **시작 전에 둘 다 확인**하므로
없으면 렌더를 시작조차 하지 않는다. Windows 에서는 `winget install Gyan.FFmpeg` 또는 `scoop install ffmpeg` 로 쉽게 설치할 수 있다.

```bash
# GUI 없이 렌더를 확인할 때
cd src-tauri
cargo run --example rendercheck -- <입력.html> <출력.mp4> <길이초> [음성파일] [N초뒤취소]
GMOTION_RENDER_SIZE=1280x720 cargo run --example rendercheck -- …   # 해상도를 바꿔 확인
GMOTION_RENDER_DEBUG=1 cargo run --example rendercheck -- …         # 프레임 인덱스·시계 대조
```

## 개발

필요한 것: Node 20+ · Rust 1.8x+ · C++ 빌드 도구 (Windows: Visual Studio Build Tools, macOS: Xcode CLT).
MP4 렌더에만 Chrome/Edge·ffmpeg 이 더 필요하고, 나머지 기능은 외부 의존성이 없다.

```bash
npm install
npm run tauri dev          # 앱 실행
npm run tauri build        # 배포 번들

npx tsc --noEmit                        # 타입 검사
cd src-tauri && cargo test              # base64 왕복 · 음성 data URI · 스킬 설치 왕복
node vendor/gmotion/assets/gm.js test   # 엔진 회귀 검사 (엔진을 고쳤으면 통과시킨다)
```

**CSP 는 두 줄이 함께 있어야 한다**(`tauri.conf.json` 의 `app.security`) —
`script-src` 에 `'unsafe-inline'`, 그리고 `"dangerousDisableAssetCspModification": ["script-src"]`.

미리보기는 산출물 HTML 을 srcdoc iframe 에 그대로 띄우고, srcdoc 문서는 **부모의 CSP 를
물려받는다** — 산출물의 GSAP·런타임은 인라인 `<script>` 이므로 인라인이 막히면 그림만 서고
움직이지 않는다(`window.GGM` 이 생기지 않아 씬 시킹·전송부도 죽는다). 산출물마다 스크립트가
달라 nonce·해시로는 좁힐 수 없다.

`'unsafe-inline'` 만으로는 부족하다: Tauri 는 자기가 심는 인라인 스크립트의
`'sha256-…'` 을 `script-src` 에 **덧붙이는데**, CSP 규칙상 해시·nonce 가 하나라도 있으면
`'unsafe-inline'` 은 **무시된다**. 그래서 그 덧붙이기를 `script-src` 에 대해서만 끈다.
CSP 는 문서의 meta 가 아니라 `tauri://` 응답 **헤더**로 오므로, 무엇이 실렸는지 볼 때는
헤더를 읽어야 한다(미리보기가 부팅에 실패하면 그 헤더를 로그에 적는다).

**dev 에서는 이 증상이 안 보인다** — 창이 vite(`devUrl`)를 열어 Tauri 가 CSP 를 싣지
않기 때문이다. 그래서 CSP 를 건드렸으면 `npm run tauri build` 로 만든 번들에서 미리보기가
재생되는지 확인한다.

vendor 엔진을 CLI 로 직접 쓸 수도 있다. `vendor/package.json` 이 루트의
`type: module` 로부터 CommonJS 를 격리해 둔다 (스킬 페이로드에는 들어가지 않는다).

```bash
node vendor/gmotion/assets/gm.js info patterns
node vendor/gmotion/assets/gm.js build spec.json -o out.html
```

## 엔진 갱신

`vendor/gmotion/` 을 새 스킬로 갈아끼우면 프론트엔드·Rust 양쪽이 같이 따라온다.
`vendor/package.json` 은 지우지 않는다.

**갈아끼우기 전에 `vendor/PATCHES.md` 를 읽는다.** 업스트림에 없는 로컬 수정이
적혀 있고, 다시 vendoring 하면 사라진다. 갈아끼운 뒤에는
`node vendor/gmotion/assets/gm.js test` 와 `cargo test` 를 통과시킨다.
