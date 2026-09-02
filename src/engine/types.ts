/** 엔진(gsapgraph)의 공개 표면. vendor/gmotion/assets/gsapgraph.js 의 export 와 일치한다. */

export type Cue = { start: number; end: number; text: string };

export interface ThemeColors {
  bg: string;
  bg2: string;
  ink: string;
  ink2: string;
  dim: string;
  accent: string;
  accent2: string;
  good: string;
  warn: string;
  bad: string;
  line?: string;
  panel?: string;
  panelLine?: string;
}

export interface ThemeDefinition extends ThemeColors {
  label: string;
  font?: string;
  grain?: number;
  vig?: number;
  glow?: number;
  decor?: string[];
  /** 이 테마가 기본으로 쓰는 스킨. 스펙의 skin 이 있으면 그쪽이 이긴다 */
  skin?: string;
  custom?: boolean;
}

/* ── 스킨 — 디자인 프리미티브(인터페이스)의 구현부 ──────────────────── */

/** 프리미티브 토큰 값 묶음. 키는 `--` 없는 토큰 이름(예: "r-lg"), 값은 CSS 선언에 그대로 들어간다. */
export type SkinVars = Record<string, string>;

/** 스펙에 인라인하는 커스텀 스킨 정의. 파일 한 장으로 모습이 재현된다. */
export interface SkinDefinition {
  /** 물려받을 스킨. 생략하면 glass */
  extends?: string;
  name?: string;
  label?: string;
  vars?: SkinVars;
  /** 프리미티브로 표현할 수 없는 것만. 기본 규칙 뒤에 실린다 */
  css?: string[];
  /** 어두운 배경을 전제로 한 스킨인지 — 밝은 테마에 얹으면 검증이 경고한다 */
  dark?: boolean;
  custom?: boolean;
}

/** 스킨을 실제 토큰 값으로 푼 결과. 편집기의 초기값·미리보기가 쓴다. */
export interface ResolvedSkin {
  name: string;
  label: string;
  vars: SkinVars;
  css: string;
  rules: string[];
}

/**
 * 스펙에 인라인하는 커스텀 디자인 요소. 앱의 커스텀 라이브러리와 **키가 같다** —
 * 라이브러리 내보내기 JSON 을 그대로 붙일 수 있다.
 */
export interface SpecDesign {
  themes?: Record<string, ThemeDefinition>;
  skins?: Record<string, SkinDefinition>;
  icons?: Record<string, { path: string; aliases?: string[]; label?: string }>;
  arts?: Record<string, { label: string; svg: string }>;
  marks?: Record<
    string,
    { label: string; where?: string; svg: string; draw?: boolean; text?: boolean }
  >;
  decors?: Record<string, { label: string; category?: string; svg: string }>;
  frames?: Record<
    string,
    { label: string; ratio?: number; svg: string; bar?: number; pad?: { x?: number; y?: number } }
  >;
}

export interface CustomDesignLibrary {
  themes: Record<string, ThemeDefinition>;
  skins: Record<string, SkinDefinition>;
  icons: Record<string, { path: string; aliases: string[]; label?: string }>;
  arts: Record<string, { label: string; svg: string }>;
  marks: Record<
    string,
    {
      label: string;
      where: "under" | "around" | "behind" | "point" | "corner" | "ribbon";
      svg: string;
      draw?: boolean;
      text?: boolean;
    }
  >;
  decors: Record<string, { label: string; category?: string; svg: string }>;
  frames: Record<string, { label: string; ratio: number; svg: string; bar?: number }>;
}

export interface ValidateResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats?: {
    scenes: number;
    totalSec: number;
    frames: number;
    theme: string;
    aspect: string;
    energy: string;
    mode: string;
    icons: number;
    patterns: number;
    tweens: number;
  };
  sync?: { matched: number; skipped: unknown[] } | null;
  scenes?: {
    n: number;
    id: string;
    pattern: string;
    at: number;
    dur: number;
    trans: string;
    matched?: number | null;
    ts?: number;
  }[];
}

export interface PatternInfo {
  label: string;
  use: string;
  fields: string;
  max: number | null;
}

export interface BuildOpts {
  clean?: boolean;
  cdn?: boolean;
  noFonts?: boolean;
  present?: boolean;
  cues?: Cue[] | null;
  captions?: Cue[] | null;
  audioSrc?: string | null;
  gsap?: string;
  runtime?: string;
}

export interface Engine {
  version: string;
  gsapVersion: string;
  validate(spec: unknown, opts?: { cues?: Cue[] | null; captions?: Cue[] | null }): ValidateResult;
  toHTML(spec: unknown, opts?: BuildOpts): string;
  timing(spec: unknown, fps: number, opts?: { cues?: Cue[] | null }): string;
  compile(spec: unknown, opts?: unknown): unknown;
  parseSubtitles(src: string): Cue[];
  itemKeys(): string[];
  patterns: Record<string, PatternInfo>;
  themeColors(): Record<string, Record<string, string>>;
  fonts: Record<string, string>;
  themes: Record<string, string>;
  transitions: Record<string, string>;
  energies: Record<string, string>;
  aspects: Record<string, string>;
  /** 스킨 이름 → 라벨 */
  skins: Record<string, string>;
  /** 디자인 프리미티브 계약: 토큰 이름 → 무엇을 정하는지 */
  designTokens: Record<string, string>;
  resolveSkin(skin: string | SkinDefinition, theme?: string, aspect?: string): ResolvedSkin;
  /** 스펙이 참조하는 디자인 요소 이름 — 무엇을 스펙에 담아야 하는지 알아내는 데 쓴다 */
  usedDesignNames(spec: unknown): Record<string, string[]>;
  designKinds: string[];
  registerSkin(key: string, def: SkinDefinition): void;
  unregisterSkin(key: string): void;
  tokens: unknown;
  decors: Record<string, string>;
  _THEMES?: Record<string, ThemeDefinition>;
  marks: Record<string, string>;
  frames: Record<string, string>;
  arts: Record<string, string>;
  charts: Record<string, string>;
  chartUse(k: string): string;
  icons(q?: string): string[];
  iconAliases(k: string): string[];
  iconCount: number;
}

/* ── 스펙 ─────────────────────────────────────────────────────────── */

export type Item = {
  label?: string;
  icon?: string;
  note?: string;
  value?: string | number;
  tone?: "good" | "bad" | "warn" | "dim";
  badge?: string;
  ribbon?: string;
  art?: string;
  spark?: number[];
  say?: string;
  [k: string]: unknown;
};

export type SceneItem = string | Item;

export interface Scene {
  pattern: string;
  id?: string;
  purpose?: string;
  hold?: number;
  say?: string;
  transition?: string;
  /** 이 씬만 재질을 갈아 끼운다. 생략하면 루트 skin 을 따른다 */
  skin?: string | SkinDefinition;
  decor?: string | string[] | false;
  decorLevel?: 0 | 1 | 2;
  textFx?: "scramble" | "roll";
  mark?: string;
  art?: string;
  notes?: string;
  title?: string;
  kicker?: string;
  sub?: string;
  [k: string]: unknown;
}

export interface Spec {
  title?: string;
  message?: string;
  theme?: string;
  /** 재질. 등록된 스킨 이름이거나, 스펙에 인라인한 커스텀 정의 */
  skin?: string | SkinDefinition;
  /** 스펙에 인라인한 커스텀 디자인 요소 — 이게 있으면 CLI 로 빌드해도 모습이 재현된다 */
  design?: SpecDesign;
  aspect?: string;
  energy?: string;
  font?: string;
  mode?: string;
  decor?: string | string[] | false;
  decorLevel?: 0 | 1 | 2;
  audio?: { offset?: number; volume?: number };
  scenes: Scene[];
  [k: string]: unknown;
}
