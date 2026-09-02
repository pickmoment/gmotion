/**
 * MP4 내보내기 — 해상도 사다리와 파일 크기 추정.
 *
 * 해상도를 자유롭게 고를 수 있는 이유는 런타임이 스테이지를 부모 박스에 맞춰
 * `scale()` 하기 때문이다(`runtime.js` 의 `fit`). 비율만 같으면 뷰포트를 몇으로 띄워도
 * 같은 그림이 그 해상도로 래스터화된다 — 그래서 사다리는 **짧은 변**만 갈아 끼우고
 * 긴 변은 화면비가 정한다.
 *
 * 크기 추정은 실측에서 왔다. 스타터 예제 3종(intro·report·story)을 네 해상도에서
 * x264 crf 19 veryfast 로 렌더해 픽셀당 비트(bpp)를 쟀다:
 *
 * ```
 *            854×480   1280×720   1920×1080   3840×2160
 *   intro    0.0468    0.0327     0.0239      0.0148
 *   report   0.0090    0.0053     0.0035      0.0019
 *   story    0.0351    0.0291     0.0259      0.0227
 *   기하평균  0.0245    0.0172     0.0129      0.0086
 * ```
 *
 * 해상도에 따른 변화는 `bpp ∝ 픽셀^-0.35` 로 네 지점 모두 7% 안에서 맞는다.
 * 반면 **내용에 따른 차이는 7배**다 — crf 는 화질을 고정하므로 크기는 움직임 양과
 * 배경 질감이 정한다(report 는 step 모드로 정지 구간이 길고 배경이 평평하다).
 * 그래서 대표값 하나가 아니라 범위를 같이 낸다. 실제 크기는 렌더가 끝난 뒤 알려준다.
 */
import { GG } from "../engine/boot";

export interface Resolution {
  w: number;
  h: number;
  /** 사다리 값 = 짧은 변 */
  short: number;
  /** "4K" 처럼 부르는 이름 */
  name: string;
}

export interface SizeEstimate {
  /** 대표값(바이트) */
  bytes: number;
  /** 정지 구간이 많은 내용 */
  low: number;
  /** 움직임이 쉬지 않는 내용 */
  high: number;
  /** 영상 비트레이트(bps) — 대표값 기준 */
  videoBps: number;
}

/** 렌더 프레임률. render.rs 의 리샘플러가 이 값으로 고정 프레임률을 만든다. */
export const RENDER_FPS = 30;

/** 짧은 변 사다리. 기준 크기(1080)는 어느 화면비에도 들어 있다. */
const LADDER = [2160, 1440, 1080, 720, 480];

const NAMES: Record<number, string> = {
  2160: "4K",
  1440: "QHD",
  1080: "FHD",
  720: "HD",
  480: "SD",
};

/** 실측 기준점 — 1920×1080 30fps 의 픽셀당 비트(기하평균) */
const BPP_1080 = 0.0129;
const PX_1080 = 1920 * 1080;
/** 같은 crf 에서 해상도가 오르면 픽셀당 비트는 내려간다 — 실측 기울기 */
const BPP_SLOPE = -0.35;
/* 내용에 따른 폭. 실측 12편(예제 3종 × 해상도 4종)이 모델의 0.23배(report·4K)에서
   2.86배(story·4K) 사이에 들어왔다 — 그 바깥까지 조금 남겨 잡는다. */
const SPREAD_LOW = 0.2;
const SPREAD_HIGH = 3.2;
/** AAC 192kbps — render.rs 가 고정으로 쓴다 */
const AUDIO_BPS = 192_000;

/** h.264 yuv420p 는 짝수 크기를 요구한다 */
const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/** 화면비의 기준 크기. 엔진의 aspects 가 "1920×1080 — …" 꼴로 준다. */
export function stageSize(aspect?: string): { w: number; h: number } {
  const label = GG.aspects[aspect || "16:9"] ?? "";
  const m = label.match(/(\d+)\D+(\d+)/);
  return m ? { w: +m[1], h: +m[2] } : { w: 1920, h: 1080 };
}

/** 이 화면비로 고를 수 있는 해상도. 큰 것부터. */
export function resolutions(aspect?: string): Resolution[] {
  const native = stageSize(aspect);
  const long = Math.max(native.w, native.h);
  const short = Math.min(native.w, native.h);
  const portrait = native.h > native.w;
  return LADDER.map((s) => {
    const other = even((s * long) / short);
    return {
      w: portrait ? even(s) : other,
      h: portrait ? other : even(s),
      short: s,
      name: NAMES[s] ?? `${s}p`,
    };
  });
}

/** 사다리에서 짧은 변으로 하나 고른다. 없는 값이면 기준 크기로 돌아간다. */
export function pickResolution(aspect: string | undefined, short: number): Resolution {
  const list = resolutions(aspect);
  const native = stageSize(aspect);
  return (
    list.find((r) => r.short === short) ??
    list.find((r) => r.short === Math.min(native.w, native.h)) ??
    list[2]
  );
}

/** MP4 크기 추정. 음성은 트랙으로 다시 인코딩되므로 192kbps 로 정확히 더한다. */
export function estimateSize(o: {
  w: number;
  h: number;
  fps: number;
  sec: number;
  audio: boolean;
}): SizeEstimate {
  const px = o.w * o.h;
  const bpp = BPP_1080 * Math.pow(px / PX_1080, BPP_SLOPE);
  const videoBps = bpp * px * o.fps;
  const audioBytes = o.audio ? (AUDIO_BPS / 8) * o.sec : 0;
  const video = (videoBps / 8) * o.sec;
  return {
    bytes: video + audioBytes,
    low: video * SPREAD_LOW + audioBytes,
    high: video * SPREAD_HIGH + audioBytes,
    videoBps,
  };
}

/** 사람이 읽는 크기. 1MB 아래는 KB 로 준다. */
export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))}KB`;
  const mb = n / (1024 * 1024);
  return `${mb < 100 ? mb.toFixed(1) : Math.round(mb)}MB`;
}

/** "12.3MB (3~31MB)" — 범위를 숨기지 않는다. */
export function formatEstimate(e: SizeEstimate): string {
  return `${formatBytes(e.bytes)} (${formatBytes(e.low)}~${formatBytes(e.high)})`;
}
