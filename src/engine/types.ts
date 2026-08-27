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
  custom?: boolean;
}

export interface CustomDesignLibrary {
  themes: Record<string, ThemeDefinition>;
  icons: Record<string, { path: string; aliases: string[]; label?: string }>;
  arts: Record<string, { label: string; svg: string }>;
  marks: Record<string, { label: string; where: "under" | "around" | "behind" | "point" | "corner" | "ribbon"; svg: string; draw?: boolean; text?: boolean }>;
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
