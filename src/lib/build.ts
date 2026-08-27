/** 엔진 호출을 한곳에 모은다 — gsap·runtime 주입을 빠뜨리지 않게. */
import { GG, ASSETS } from "../engine/boot";
import type { BuildOpts, Cue, Spec, ValidateResult } from "../engine/types";

export interface SyncInput {
  cues: Cue[] | null;
  captions: boolean;
  audioSrc: string | null;
}

export const NO_SYNC: SyncInput = { cues: null, captions: false, audioSrc: null };

export function validate(spec: Spec, sync: SyncInput = NO_SYNC): ValidateResult {
  try {
    return GG.validate(spec, {
      cues: sync.cues,
      captions: sync.captions && sync.cues ? sync.cues : null,
    });
  } catch (e) {
    return { ok: false, errors: [`엔진 오류: ${(e as Error).message}`], warnings: [] };
  }
}

export function build(
  spec: Spec,
  sync: SyncInput = NO_SYNC,
  opts: Omit<BuildOpts, "gsap" | "runtime" | "cues" | "captions" | "audioSrc"> = {},
): string {
  return GG.toHTML(spec, {
    ...opts,
    cues: sync.cues,
    captions: sync.captions && sync.cues ? sync.cues : null,
    audioSrc: sync.audioSrc,
    gsap: ASSETS.gsap,
    runtime: ASSETS.runtime,
  });
}

export function timingCsv(spec: Spec, fps: number, sync: SyncInput = NO_SYNC): string {
  return GG.timing(spec, fps, { cues: sync.cues });
}

export function parseSubtitles(src: string): Cue[] {
  return GG.parseSubtitles(src);
}

/**
 * `gm check` 와 같은 산출물 기계 검수. CLI 를 그대로 옮겼다 —
 * 앱에서 빌드해도 정책 위반을 놓치지 않기 위해서다.
 */
export interface CheckLine {
  ok: boolean;
  label: string;
  why?: string;
}

export function checkOutput(html: string): { lines: CheckLine[]; info: string; fail: number } {
  const lines: CheckLine[] = [];
  let fail = 0;
  const must = (label: string, re: RegExp, why: string) => {
    const ok = re.test(html);
    lines.push({ ok, label, why: ok ? undefined : why });
    if (!ok) fail++;
  };
  const never = (label: string, re: RegExp, why: string) => {
    const m = html.match(re);
    lines.push({ ok: !m, label, why: m ? `${why} : ${String(m[0]).slice(0, 70)}` : undefined });
    if (m) fail++;
  };
  must('lang="ko"', /<html lang="ko">/, "한국어 문서 선언");
  must("감소 모션 대응", /prefers-reduced-motion/, "모션 민감 사용자에게 정적 대체가 필요하다");
  must("스크린리더 라벨", /aria-label=/, "스테이지와 조작부에 라벨");
  must("씬 라벨", /data-pattern="/, "씬마다 패턴 표시 — 검수 추적용");
  must("검수 API", /window\.GGM/, "씬별 시킹 캡처에 필요하다");
  must("폰트 로드 후 조립", /document\.fonts/, "폰트 늦게 오면 레이아웃이 튄다");
  never("레이아웃 속성 애니메이션", /"(width|height|top|left|margin[A-Za-z]*)":\s*[-\d]/, "transform/opacity 로 바꾼다");
  never(
    "외부 스크립트(CDN GSAP 제외)",
    /<script[^>]+src="(?!https:\/\/cdn\.jsdelivr\.net\/npm\/gsap)/,
    "단일 파일 정책 위반",
  );
  const scenes = (html.match(/class="gg-scene"/g) || []).length;
  const pats = new Set((html.match(/data-pattern="([a-zA-Z]+)"/g) || []).map((m) => m.split('"')[1]));
  if (scenes >= 4 && pats.size < 2) {
    lines.push({
      ok: false,
      label: `씬이 ${scenes}개인데 패턴이 1종이다`,
      why: "같은 움직임이 반복되면 정보가 구분되지 않는다",
    });
    fail++;
  }
  return {
    lines,
    info: `씬 ${scenes}개 · 패턴 ${pats.size}종(${[...pats].join(" ")}) · ${Math.round(html.length / 1024)}KB`,
    fail,
  };
}
