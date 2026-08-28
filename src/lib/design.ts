import { GG, SKINS, THEMES_REGISTRY, VECTORS } from "../engine/boot";
import type { CustomDesignLibrary, SkinDefinition, Spec, SpecDesign, ThemeColors } from "../engine/types";

/* ── 1. 색상 파싱 & WCAG AA 대비율 계산 ────────────────────────────────── */

export function parseHexOrRgb(color: string): [number, number, number] {
  const c = color.trim().toLowerCase();
  if (c.startsWith("#")) {
    const raw = c.slice(1);
    if (raw.length === 3) {
      return [
        parseInt(raw[0] + raw[0], 16),
        parseInt(raw[1] + raw[1], 16),
        parseInt(raw[2] + raw[2], 16),
      ];
    }
    if (raw.length >= 6) {
      return [
        parseInt(raw.slice(0, 2), 16),
        parseInt(raw.slice(2, 4), 16),
        parseInt(raw.slice(4, 6), 16),
      ];
    }
  }
  const rgbMatch = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return [parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10)];
  }
  return [0, 0, 0];
}

export function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((val) =>
    val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function calculateContrast(fg: string, bg: string): number {
  const [r1, g1, b1] = parseHexOrRgb(fg);
  const [r2, g2, b2] = parseHexOrRgb(bg);
  const l1 = relativeLuminance(r1, g1, b1);
  const l2 = relativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

export interface ContrastItem {
  key: string;
  name: string;
  fg: string;
  bg: string;
  ratio: number;
  need: number;
  pass: boolean;
}

export interface ContrastCheckResult {
  ok: boolean;
  score: number;
  worstKey?: string;
  worstRatio?: number;
  worstNeed?: number;
  list: ContrastItem[];
}

export function checkThemeContrast(colors: ThemeColors): ContrastCheckResult {
  const checks: { key: string; name: string; fg: string; bg: string; need: number }[] = [
    { key: "ink_bg", name: "본문 글자 (ink)", fg: colors.ink, bg: colors.bg, need: 4.5 },
    { key: "ink2_bg", name: "보조 글자 (ink2)", fg: colors.ink2, bg: colors.bg, need: 3.0 },
    { key: "dim_bg", name: "흐린 글자 (dim)", fg: colors.dim, bg: colors.bg, need: 3.0 },
    { key: "accent_bg", name: "강조색 1 (accent)", fg: colors.accent, bg: colors.bg, need: 3.0 },
    { key: "accent2_bg", name: "강조색 2 (accent2)", fg: colors.accent2, bg: colors.bg, need: 3.0 },
    { key: "good_bg", name: "긍정/성공 (good)", fg: colors.good, bg: colors.bg, need: 3.0 },
    { key: "warn_bg", name: "주의/경고 (warn)", fg: colors.warn, bg: colors.bg, need: 3.0 },
    { key: "bad_bg", name: "오류/부정 (bad)", fg: colors.bad, bg: colors.bg, need: 3.0 },
    { key: "ink_bg2", name: "카드 위 본문 (ink/bg2)", fg: colors.ink, bg: colors.bg2, need: 4.5 },
  ];

  const list: ContrastItem[] = checks.map((c) => {
    const ratio = calculateContrast(c.fg, c.bg);
    return {
      key: c.key,
      name: c.name,
      fg: c.fg,
      bg: c.bg,
      ratio,
      need: c.need,
      pass: ratio >= c.need,
    };
  });

  const fails = list.filter((item) => !item.pass);
  const ok = fails.length === 0;
  const passCount = list.filter((i) => i.pass).length;
  const score = Math.round((passCount / list.length) * 100);

  let worstKey: string | undefined;
  let worstRatio: number | undefined;
  let worstNeed: number | undefined;

  if (fails.length > 0) {
    const sorted = [...fails].sort((a, b) => a.ratio / a.need - b.ratio / b.need);
    worstKey = sorted[0].name;
    worstRatio = sorted[0].ratio;
    worstNeed = sorted[0].need;
  }

  return { ok, score, worstKey, worstRatio, worstNeed, list };
}

export function isDarkTheme(theme: string | ThemeColors): boolean {
  const colors = resolveThemeColors(theme);
  const [r, g, b] = parseHexOrRgb(colors.bg);
  return relativeLuminance(r, g, b) < 0.35;
}

export function resolveThemeColors(theme: string | ThemeColors): ThemeColors {
  if (typeof theme === "object" && theme !== null) {
    return theme;
  }
  const hit = THEMES_REGISTRY[theme] || (GG.themeColors && GG.themeColors()[theme]);
  if (hit) {
    return hit;
  }
  return {
    bg: "#0b1020",
    bg2: "#141b33",
    ink: "#eef2ff",
    ink2: "#a5b0d4",
    dim: "#707ca5",
    accent: "#6ea8ff",
    accent2: "#a78bfa",
    good: "#4ade80",
    warn: "#fbbf24",
    bad: "#fb7185",
  };
}

/* ── 2. SVG 동적 렌더링 헬퍼 ────────────────────────────────────────── */

export function renderDecorSvg(
  key: string,
  theme: string | ThemeColors,
  level: number = 1,
  w: number = 360,
  h: number = 200
): string {
  const T = resolveThemeColors(theme);
  const decor = VECTORS.DECOR[key];
  if (!decor || typeof decor.build !== "function") {
    return `<svg class="gg-decor" viewBox="0 0 ${w} ${h}" aria-hidden="true"><rect width="${w}" height="${h}" fill="${T.bg2}" opacity="0.4"/></svg>`;
  }
  try {
    return decor.build(w, h, T, level);
  } catch {
    return `<svg class="gg-decor" viewBox="0 0 ${w} ${h}" aria-hidden="true"></svg>`;
  }
}

export function renderMarkSvg(
  key: string,
  theme: string | ThemeColors,
  text: string = "강조"
): string {
  const T = resolveThemeColors(theme);
  const mark = VECTORS.MARK[key];
  if (!mark || typeof mark.build !== "function") {
    return `<svg class="gg-mark" viewBox="0 0 100 20" aria-hidden="true"><line x1="0" y1="18" x2="100" y2="18" stroke="${T.accent}" stroke-width="3"/></svg>`;
  }
  try {
    return mark.build(T, text);
  } catch {
    return `<svg class="gg-mark" viewBox="0 0 100 20" aria-hidden="true"></svg>`;
  }
}

export function renderArtSvg(key: string, theme: string | ThemeColors): string {
  const T = resolveThemeColors(theme);
  const art = VECTORS.ART[key];
  if (!art || typeof art.build !== "function") {
    return `<svg class="gg-art" viewBox="0 0 200 200" aria-hidden="true"><circle cx="100" cy="100" r="60" fill="${T.accent}" opacity="0.3"/></svg>`;
  }
  try {
    return art.build(T);
  } catch {
    return `<svg class="gg-art" viewBox="0 0 200 200" aria-hidden="true"></svg>`;
  }
}

export function renderFrameSvg(
  key: string,
  theme: string | ThemeColors,
  w: number = 240,
  h: number = 160
): { svg: string; inner: { x: number; y: number; w: number; h: number } } {
  const T = resolveThemeColors(theme);
  const frame = VECTORS.FRAME[key];
  if (!frame || typeof frame.build !== "function") {
    const pad = 16;
    return {
      svg: `<svg class="gg-frame" viewBox="0 0 ${w} ${h}" aria-hidden="true"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="8" fill="${T.bg2}" stroke="${T.accent}" stroke-width="2"/></svg>`,
      inner: { x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 },
    };
  }
  try {
    const buildFn = frame.build as unknown as (a: unknown, b: unknown, c: unknown) => unknown;
    let res = buildFn(T, w, h);
    if (typeof res !== "object" || res === null || !("svg" in res)) {
      res = buildFn(w, h, T);
    }
    if (typeof res === "object" && res !== null && "svg" in res && "inner" in res) {
      const typed = res as { svg: string; inner: { x: number; y: number; w: number; h: number } };
      return typed;
    }
    if (typeof res === "string") {
      return {
        svg: res,
        inner: { x: 16, y: 16, w: w - 32, h: h - 32 },
      };
    }
  } catch {
    // fallback
  }
  return {
    svg: `<svg class="gg-frame" viewBox="0 0 ${w} ${h}" aria-hidden="true"><rect width="${w}" height="${h}" fill="${T.bg2}"/></svg>`,
    inner: { x: 12, y: 12, w: w - 24, h: h - 24 },
  };
}

/* ── 3. 카테고리 태그 및 메타데이터 ──────────────────────────────────── */

export const DECOR_CATEGORIES: Record<string, string[]> = {
  "기하·격자": ["grid", "dots", "arcs", "hexes", "stripes", "horizon"],
  "유기·물결": ["blob", "wave", "mesh", "topo"],
  "종이·아날로그": ["creases", "gridPaper", "ruled", "sheets"],
  클레이: ["clayBlobs", "dough"],
  "빛·우주": ["rays", "rings", "beams", "constellation"],
};

export const MARK_CATEGORIES: Record<string, string[]> = {
  "밑줄·테두리": ["underline", "underline2", "circle", "box", "bracket", "strike"],
  "배경·칠": ["highlight", "scribble", "tape"],
  "포인터·배지": ["arrow", "star", "badge", "ribbon", "stamp", "clayPin"],
};

export const FRAME_CATEGORIES: Record<string, string[]> = {
  디바이스: ["browser", "window", "terminal", "phone", "tablet", "laptop"],
  "판·카드": ["card", "chat", "memo", "notepad", "clipboard", "clayBoard"],
};

export const ICON_CATEGORIES: Record<string, string[]> = {
  "지표·비즈니스": [
    "trendup", "trenddown", "chart", "pie", "won", "dollar", "wallet", "cart",
    "target", "rocket", "trophy", "award", "coin", "percent", "briefcase", "barChart",
  ],
  네비게이션: [
    "arrow", "right", "up", "down", "check", "x", "plus", "minus",
    "compass", "link", "globe", "pin", "map", "menu", "more", "search",
  ],
  미디어: [
    "play", "pause", "video", "music", "mic", "camera", "image",
    "volume", "film", "speaker", "radio", "disc", "tv",
  ],
  "보안·설정": [
    "lock", "unlock", "shield", "key", "gear", "sliders", "eye",
    "user", "users", "fingerprint", "bell", "info", "warn", "question",
  ],
  "기술·코드": [
    "laptop", "server", "cloud", "database", "terminal", "code",
    "cpu", "bot", "git", "zap", "battery", "wifi", "bluetooth",
  ],
  "자연·사물": [
    "heart", "star", "fire", "bolt", "bulb", "sun", "moon",
    "leaf", "flag", "gift", "sparkles", "coffee", "droplet", "book",
  ],
};

/* ── 4. 무드 팔레트 & GUI 비주얼 생성기 ────────────────────────────── */

export const MOOD_PALETTES: Record<string, { label: string; colors: ThemeColors; font: string }> = {
  deepNavy: {
    label: "딥 네이비 & 아쿠아 (테크·클라우드)",
    font: "display",
    colors: {
      bg: "#081022",
      bg2: "#121d38",
      ink: "#f0f4ff",
      ink2: "#9db0dc",
      dim: "#6b7d9b",
      accent: "#38bdf8",
      accent2: "#818cf8",
      good: "#34d399",
      warn: "#fbbf24",
      bad: "#fb7185",
    },
  },
  cleanWhite: {
    label: "클린 화이트 & 로열 블루 (리포트·B2B)",
    font: "sans",
    colors: {
      bg: "#f8fafc",
      bg2: "#edf2f7",
      ink: "#0f172a",
      ink2: "#475569",
      dim: "#64748b",
      accent: "#2563eb",
      accent2: "#7c3aed",
      good: "#16a34a",
      warn: "#d97706",
      bad: "#dc2626",
    },
  },
  luxuryGold: {
    label: "다크 차콜 & 샴페인 골드 (프리미엄·다큐)",
    font: "serif",
    colors: {
      bg: "#121212",
      bg2: "#1f1e1b",
      ink: "#f7f5ed",
      ink2: "#c4bcab",
      dim: "#827967",
      accent: "#d4af37",
      accent2: "#c97a3e",
      good: "#88a360",
      warn: "#d49a37",
      bad: "#c94a3e",
    },
  },
  modernDark: {
    label: "매트 블랙 & 에메랄드 (개발·인프라)",
    font: "neo",
    colors: {
      bg: "#0d1117",
      bg2: "#161b22",
      ink: "#f0f6fc",
      ink2: "#8b949e",
      dim: "#6e7681",
      accent: "#2ea043",
      accent2: "#58a6ff",
      good: "#3fb950",
      warn: "#d29922",
      bad: "#f85149",
    },
  },
  warmEarth: {
    label: "테라코타 & 크림 웜 (브랜드·감성)",
    font: "soft",
    colors: {
      bg: "#1c1410",
      bg2: "#2d2019",
      ink: "#fef7ee",
      ink2: "#d6bc9f",
      dim: "#9c8167",
      accent: "#f97316",
      accent2: "#fb923c",
      good: "#84cc16",
      warn: "#eab308",
      bad: "#ef4444",
    },
  },
  cyberNeon: {
    label: "사이버 네온 핑크 & 시안 (쇼츠·트렌드)",
    font: "display",
    colors: {
      bg: "#07040d",
      bg2: "#170c26",
      ink: "#fdf4ff",
      ink2: "#d8b4fe",
      dim: "#9333ea",
      accent: "#ec4899",
      accent2: "#06b6d4",
      good: "#10b981",
      warn: "#f59e0b",
      bad: "#f43f5e",
    },
  },
  forestGrowth: {
    label: "딥 포레스트 & 라임 (지속가능·성장)",
    font: "sans",
    colors: {
      bg: "#06130d",
      bg2: "#0f231a",
      ink: "#edf7f1",
      ink2: "#a3c8b4",
      dim: "#729683",
      accent: "#10b981",
      accent2: "#84cc16",
      good: "#22c55e",
      warn: "#eab308",
      bad: "#f43f5e",
    },
  },
};

export function generateDecorSvg(
  pattern: string,
  opts: {
    count?: number;
    scale?: number;
    opacity?: number;
    blur?: number;
    colorMode?: "accent" | "accent2" | "both" | "dim";
  } = {}
): string {
  const count = opts.count ?? 4;
  const scale = opts.scale ?? 1.0;
  const opacity = opts.opacity ?? 0.18;
  const blur = opts.blur ?? 12;
  const col1 = opts.colorMode === "accent2" ? "{accent2}" : opts.colorMode === "dim" ? "{dim}" : "{accent}";
  const col2 = opts.colorMode === "both" ? "{accent2}" : col1;

  if (pattern === "blob") {
    const filterDef =
      blur > 0
        ? `<defs><filter id="blobBlur"><feGaussianBlur stdDeviation="${blur}"/></filter></defs>`
        : "";
    const filterAttr = blur > 0 ? ' filter="url(#blobBlur)"' : "";
    const blobs: string[] = [];
    for (let i = 0; i < count; i++) {
      const cxRatio = Math.round((0.2 + (i * 0.6) / Math.max(1, count - 1)) * 100) / 100;
      const cyRatio = Math.round((0.25 + ((i % 2) * 0.45)) * 100) / 100;
      const r = Math.round(140 * scale);
      const fill = i % 2 === 0 ? col1 : col2;
      blobs.push(
        `<circle cx="{W}*${cxRatio}" cy="{H}*${cyRatio}" r="${r}" fill="${fill}" opacity="${opacity}"${filterAttr}/>`
      );
    }
    return `${filterDef}${blobs.join("\n")}`;
  }

  if (pattern === "wave") {
    const waves: string[] = [];
    for (let i = 0; i < count; i++) {
      const yRatio = Math.round((0.55 + (i * 0.4) / Math.max(1, count)) * 100) / 100;
      const fill = i % 2 === 0 ? col1 : col2;
      const op = Math.round(opacity * (1 - i * 0.15) * 100) / 100;
      waves.push(
        `<path d="M0 {H}*${yRatio} Q{W}*0.25 {H}*${yRatio - 0.08 * scale} {W}*0.5 {H}*${yRatio} T{W} {H}*${yRatio} L{W} {H} L0 {H}Z" fill="${fill}" opacity="${op}"/>`
      );
    }
    return waves.join("\n");
  }

  if (pattern === "grid") {
    const step = Math.round(60 * scale);
    return `<defs><pattern id="customGrid" width="${step}" height="${step}" patternUnits="userSpaceOnUse"><path d="M ${step} 0 L 0 0 0 ${step}" fill="none" stroke="${col1}" stroke-width="1.2" opacity="${opacity}"/></pattern></defs><rect width="{W}" height="{H}" fill="url(#customGrid)"/>`;
  }

  if (pattern === "dots") {
    const step = Math.round(40 * scale);
    const r = Math.round(2.5 * scale);
    return `<defs><pattern id="customDots" width="${step}" height="${step}" patternUnits="userSpaceOnUse"><circle cx="${step / 2}" cy="${step / 2}" r="${r}" fill="${col1}" opacity="${opacity}"/></pattern></defs><rect width="{W}" height="{H}" fill="url(#customDots)"/>`;
  }

  if (pattern === "rays") {
    const rays: string[] = [];
    const n = Math.max(8, count * 3);
    for (let i = 0; i < n; i++) {
      const angle = (i * 360) / n;
      rays.push(
        `<line x1="{W}*0.5" y1="{H}*0.5" x2="{W}*0.5" y2="-{H}" stroke="${col1}" stroke-width="${Math.round(2 * scale)}" opacity="${opacity}" transform="rotate(${angle} {W}*0.5 {H}*0.5)"/>`
      );
    }
    return rays.join("\n");
  }

  if (pattern === "rings") {
    const rings: string[] = [];
    for (let i = 1; i <= count; i++) {
      const r = Math.round(i * 65 * scale);
      rings.push(
        `<circle cx="{W}*0.5" cy="{H}*0.5" r="${r}" fill="none" stroke="${i % 2 === 0 ? col2 : col1}" stroke-width="${Math.round(2 * scale)}" opacity="${opacity}" stroke-dasharray="${i % 2 === 0 ? "4 8" : "none"}"/>`
      );
    }
    return rings.join("\n");
  }

  if (pattern === "beams") {
    const beams: string[] = [];
    for (let i = 0; i < count; i++) {
      const offset = (i - count / 2) * 120 * scale;
      beams.push(
        `<line x1="{W}*-0.2 + ${offset}" y1="{H}*1.2" x2="{W}*1.2 + ${offset}" y2="{H}*-0.2" stroke="${i % 2 === 0 ? col1 : col2}" stroke-width="${Math.round(20 * scale)}" opacity="${opacity}"/>`
      );
    }
    return beams.join("\n");
  }

  // Default fallback
  return `<circle cx="{W}*0.5" cy="{H}*0.5" r="${Math.round(150 * scale)}" fill="${col1}" opacity="${opacity}"/>`;
}

export function generateMarkSvg(
  style: string,
  opts: {
    strokeWidth?: number;
    bend?: number;
    dashed?: boolean;
    colorTarget?: string;
    opacity?: number;
  } = {}
): { svg: string; where: "under" | "around" | "behind" | "point" | "corner" | "ribbon"; draw: boolean; text: boolean } {
  const sw = opts.strokeWidth ?? 4;
  const bend = opts.bend ?? 0;
  const dash = opts.dashed ? ' stroke-dasharray="6 6"' : "";
  const col = opts.colorTarget ? `{${opts.colorTarget}}` : "{accent}";
  const op = opts.opacity ?? 1.0;

  if (style === "underline") {
    const ctrlY = 8 + bend;
    return {
      where: "under",
      draw: true,
      text: false,
      svg: `<svg class="gg-mark gg-mk-under" viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true"><path d="M2 12 Q50 ${ctrlY} 98 12" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round" opacity="${op}"${dash}/></svg>`,
    };
  }

  if (style === "underline2") {
    return {
      where: "under",
      draw: true,
      text: false,
      svg: `<svg class="gg-mark gg-mk-under" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true"><path d="M2 8 L98 8" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round" opacity="${op}"/><path d="M6 15 L94 15" stroke="{accent2}" stroke-width="${Math.max(1, sw - 1)}" fill="none" stroke-linecap="round" opacity="${op}"${dash}/></svg>`,
    };
  }

  if (style === "circle") {
    return {
      where: "around",
      draw: true,
      text: false,
      svg: `<svg class="gg-mark gg-mk-around" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="50" cy="50" rx="46" ry="42" stroke="${col}" stroke-width="${sw}" fill="none" stroke-linecap="round" opacity="${op}"${dash}/></svg>`,
    };
  }

  if (style === "box") {
    return {
      where: "around",
      draw: true,
      text: false,
      svg: `<svg class="gg-mark gg-mk-around" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="3" y="3" width="94" height="94" rx="8" stroke="${col}" stroke-width="${sw}" fill="none" opacity="${op}"${dash}/></svg>`,
    };
  }

  if (style === "highlight") {
    return {
      where: "behind",
      draw: false,
      text: false,
      svg: `<svg class="gg-mark gg-mk-behind" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="24" width="100" height="56" rx="4" fill="${col}" opacity="${Math.min(0.4, op * 0.3)}"/></svg>`,
    };
  }

  if (style === "badge") {
    return {
      where: "corner",
      draw: false,
      text: true,
      svg: `<svg class="gg-mark gg-mk-corner" viewBox="0 0 72 26" aria-hidden="true"><rect x="2" y="2" width="68" height="22" rx="11" fill="${col}" opacity="${op}"/><text x="36" y="16" fill="{bg}" font-size="11" font-weight="bold" text-anchor="middle" dominant-baseline="middle">{text}</text></svg>`,
    };
  }

  if (style === "stamp") {
    return {
      where: "corner",
      draw: false,
      text: true,
      svg: `<svg class="gg-mark gg-mk-corner" viewBox="0 0 70 34" aria-hidden="true"><rect x="2" y="2" width="66" height="30" rx="4" stroke="${col}" stroke-width="${sw}" fill="none" transform="rotate(-6 35 17)" opacity="${op}"/><text x="35" y="21" fill="${col}" font-size="12" font-weight="900" text-anchor="middle" transform="rotate(-6 35 17)">{text}</text></svg>`,
    };
  }

  // Fallback straight underline
  return {
    where: "under",
    draw: true,
    text: false,
    svg: `<svg class="gg-mark gg-mk-under" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="8" x2="100" y2="8" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" opacity="${op}"/></svg>`,
  };
}

export function generateArtSvg(
  concept: string,
  opts: {
    scale?: number;
    rotate?: number;
    detail?: "simple" | "medium" | "rich";
    accent2Ratio?: number;
  } = {}
): string {
  const s = opts.scale ?? 1.0;
  const rot = opts.rotate ?? 0;
  const rich = opts.detail === "rich";
  const rotAttr = rot ? ` transform="rotate(${rot} 100 100)"` : "";

  if (concept === "data") {
    return `<g class="gg-artP"${rotAttr}>
  <ellipse cx="100" cy="60" rx="${54 * s}" ry="${18 * s}" fill="{accent}" fill-opacity="0.18" stroke="{accent}" stroke-width="3"/>
  <path d="M${100 - 54 * s} 60 L${100 - 54 * s} 100 A${54 * s} ${18 * s} 0 0 0 ${100 + 54 * s} 100 L${100 + 54 * s} 60" fill="{bg2}" stroke="{accent}" stroke-width="3"/>
  <path d="M${100 - 54 * s} 100 L${100 - 54 * s} 140 A${54 * s} ${18 * s} 0 0 0 ${100 + 54 * s} 140 L${100 + 54 * s} 100" fill="{accent2}" fill-opacity="0.25" stroke="{accent2}" stroke-width="3"/>
  ${rich ? `<circle cx="100" cy="60" r="14" fill="{accent}"/>` : ""}
</g>`;
  }

  if (concept === "network") {
    return `<g class="gg-artP"${rotAttr}>
  <line x1="100" y1="44" x2="50" y2="94" stroke="{accent}" stroke-width="3" opacity="0.6"/>
  <line x1="100" y1="44" x2="150" y2="94" stroke="{accent}" stroke-width="3" opacity="0.6"/>
  <line x1="50" y1="94" x2="80" y2="150" stroke="{accent2}" stroke-width="3" opacity="0.6"/>
  <line x1="150" y1="94" x2="120" y2="150" stroke="{accent2}" stroke-width="3" opacity="0.6"/>
  <line x1="50" y1="94" x2="150" y2="94" stroke="{accent}" stroke-width="2" stroke-dasharray="4 6" opacity="0.4"/>
  <circle cx="100" cy="44" r="${16 * s}" fill="{accent}"/>
  <circle cx="50" cy="94" r="${14 * s}" fill="{accent2}"/>
  <circle cx="150" cy="94" r="${14 * s}" fill="{accent2}"/>
  <circle cx="80" cy="150" r="${12 * s}" fill="{accent}"/>
  <circle cx="120" cy="150" r="${12 * s}" fill="{accent}"/>
</g>`;
  }

  if (concept === "growth") {
    return `<g class="gg-artP"${rotAttr}>
  <rect x="42" y="120" width="${22 * s}" height="40" rx="4" fill="{accent}" opacity="0.3" stroke="{accent}" stroke-width="2"/>
  <rect x="74" y="90" width="${22 * s}" height="70" rx="4" fill="{accent}" opacity="0.5" stroke="{accent}" stroke-width="2"/>
  <rect x="106" y="60" width="${22 * s}" height="100" rx="4" fill="{accent}" opacity="0.75" stroke="{accent}" stroke-width="2"/>
  <rect x="138" y="34" width="${22 * s}" height="126" rx="4" fill="{accent2}" stroke="{accent2}" stroke-width="2"/>
  <path d="M42 110 L74 80 L106 50 L148 24" stroke="{accent2}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <polygon points="148,16 156,26 142,28" fill="{accent2}"/>
</g>`;
  }

  if (concept === "shield") {
    return `<g class="gg-artP"${rotAttr}>
  <path d="M100 24 L160 50 L160 106 C160 144 130 168 100 178 C70 168 40 144 40 106 L40 50 Z" fill="{accent}" fill-opacity="0.14" stroke="{accent}" stroke-width="3"/>
  <path d="M100 44 L144 64 L144 104 C144 132 122 150 100 158 C78 150 56 132 56 104 L56 64 Z" fill="{accent2}" fill-opacity="0.22" stroke="{accent2}" stroke-width="2"/>
  <path d="M78 102 L94 118 L126 82" stroke="{good}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</g>`;
  }

  // Default Collab circles
  return `<g class="gg-artP"${rotAttr}>
  <circle cx="76" cy="80" r="${46 * s}" fill="{accent}" fill-opacity="0.18" stroke="{accent}" stroke-width="3"/>
  <circle cx="124" cy="80" r="${46 * s}" fill="{accent2}" fill-opacity="0.18" stroke="{accent2}" stroke-width="3"/>
  <circle cx="100" cy="124" r="${46 * s}" fill="{accent}" fill-opacity="0.12" stroke="{accent}" stroke-width="3"/>
</g>`;
}

export function generateFrameSvg(
  preset: string,
  opts: {
    radius?: number;
    barHeight?: number;
    borderWidth?: number;
    controls?: "dots" | "lines" | "none";
  } = {}
): string {
  const r = opts.radius ?? 12;
  const bar = opts.barHeight ?? 32;
  const bw = opts.borderWidth ?? 2;
  const controls = opts.controls ?? "dots";

  const dotSvgs =
    controls === "dots"
      ? `<circle cx="20" cy="${bar / 2}" r="4" fill="#fb7185"/><circle cx="34" cy="${bar / 2}" r="4" fill="#fbbf24"/><circle cx="48" cy="${bar / 2}" r="4" fill="#4ade80"/>`
      : controls === "lines"
        ? `<rect x="16" y="${bar / 2 - 2}" width="28" height="4" rx="2" fill="{dim}"/>`
        : "";

  if (preset === "browser") {
    return `<rect x="${bw}" y="${bw}" width="{W}-${bw * 2}" height="{H}-${bw * 2}" rx="${r}" fill="{bg2}" stroke="{accent}" stroke-width="${bw}"/>
<path d="M${bw} ${bar} L{W}-${bw} ${bar}" stroke="{dim}" stroke-width="1"/>
${dotSvgs}
<rect x="64" y="${bar / 2 - 8}" width="{W}-140" height="16" rx="4" fill="{bg}" opacity="0.6"/>`;
  }

  if (preset === "terminal") {
    return `<rect x="${bw}" y="${bw}" width="{W}-${bw * 2}" height="{H}-${bw * 2}" rx="${r}" fill="#0a0f1d" stroke="{accent}" stroke-width="${bw}"/>
<path d="M${bw} ${bar} L{W}-${bw} ${bar}" stroke="#1f293d" stroke-width="1"/>
${dotSvgs}
<text x="64" y="${bar / 2 + 4}" fill="{dim}" font-size="10" font-family="monospace">terminal — bash</text>`;
  }

  if (preset === "phone") {
    return `<rect x="${bw}" y="${bw}" width="{W}-${bw * 2}" height="{H}-${bw * 2}" rx="${Math.max(20, r * 2)}" fill="{bg2}" stroke="{accent}" stroke-width="${bw}"/>
<rect x="{W}*0.35" y="10" width="{W}*0.3" height="12" rx="6" fill="#000"/>
<line x1="{W}*0.35" y1="{H}-16" x2="{W}*0.65" y2="{H}-16" stroke="{dim}" stroke-width="3" stroke-linecap="round"/>`;
  }

  // Modern Card
  return `<rect x="${bw}" y="${bw}" width="{W}-${bw * 2}" height="{H}-${bw * 2}" rx="${r}" fill="{bg2}" stroke="{accent}" stroke-width="${bw}"/>`;
}

export function extractSvgPath(svgMarkup: string): string {
  const raw = svgMarkup.trim();
  if (!raw.includes("<") && raw.length > 5 && raw.startsWith("M")) {
    return raw;
  }
  const match = raw.match(/d="([^"]+)"/i) || raw.match(/d='([^']+)'/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return "M12 2L4 14h7l-1 8 9-12h-7z";
}

/* ── 8. 스킨 미리보기 ──────────────────────────────────────────────────
 *
 * 스킨 토큰의 값은 `var(--panel)` 처럼 테마 변수를 참조할 수 있다(glass 가 그렇다).
 * 그래서 미리보기 요소에는 스킨 토큰만 얹어서는 안 되고 테마 변수도 같이 깔아야
 * 한다 — 안 깔면 그 선언들이 조용히 무효가 되어 아무것도 안 보인다.
 */

/** 스킨을 미리 보여 줄 요소에 얹을 인라인 CSS 변수. 테마 변수 + 스킨 토큰. */
export function skinPreviewVars(
  skin: string | SkinDefinition,
  theme: string | ThemeColors,
  aspect = "16:9"
): Record<string, string> {
  const c = resolveThemeColors(theme);
  const out: Record<string, string> = {
    "--bg": c.bg, "--bg2": c.bg2, "--ink": c.ink, "--ink2": c.ink2, "--dim": c.dim,
    "--acc": c.accent, "--acc2": c.accent2, "--good": c.good, "--warn": c.warn, "--bad": c.bad,
    "--line": c.line || "rgba(128,128,128,.16)",
    "--panel": c.panel || c.bg2,
    "--pline": c.panelLine || c.line || "rgba(128,128,128,.16)",
  };
  const themeKey = typeof theme === "string" ? theme : "midnight";
  const resolved = GG.resolveSkin(skin, themeKey, aspect);
  for (const [k, v] of Object.entries(resolved.vars)) out[`--${k}`] = v;
  return out;
}

/** 스킨 목록 — 엔진 기본 + 커스텀. 라벨과 다크 전용 여부를 함께 준다. */
export function listSkins(): { key: string; label: string; custom: boolean; dark: boolean }[] {
  return Object.keys(SKINS.SKINS).map((key) => {
    const def = SKINS.SKINS[key];
    return { key, label: def.label || key, custom: !!def.custom, dark: !!def.dark };
  });
}

/** 프리미티브 계약 — 토큰 이름 → 무엇을 정하는지. 편집기가 이 목록으로 입력칸을 만든다. */
export function designTokenContract(): { key: string; doc: string; group: string }[] {
  const groupOf = (k: string): string => {
    if (k.startsWith("surf-")) return "표면";
    if (k.startsWith("r-")) return "모서리 반경";
    if (k.startsWith("bd-")) return "배경 블러";
    if (k.endsWith("-ring")) return "링";
    if (k.startsWith("cc-")) return "화면 자막";
    if (k.startsWith("kick-") || k.startsWith("title-") || k.startsWith("sub-")) return "타이포";
    if (k === "glow") return "광채";
    return "연결선";
  };
  return Object.entries(SKINS.TOKENS).map(([key, doc]) => ({ key, doc, group: groupOf(key) }));
}

/* ── 9. 스펙에 커스텀 정의를 심는다 ────────────────────────────────────
 *
 * 커스텀 요소를 앱 라이브러리에만 두면 스펙은 **이름만** 참조한다 — 같은 스펙을
 * CLI 로 빌드하거나 남에게 넘기면 `theme "myBrand" 는 없다` 가 뜨고 조용히
 * 기본값으로 떨어진다. 그래서 스펙이 참조하는 커스텀 정의를 스펙의 `design`
 * 블록에 그대로 심는다. 파일 한 장으로 모습이 재현된다.
 *
 * 저장할 때만 몰래 심지 않는다 — 편집 중에도 JSON 편집기에 보여야 사용자가
 * "이 스펙에 무엇이 들어 있는지" 를 안다. 그래서 스펙이 바뀔 때마다 맞춘다.
 */

/** 스펙이 참조하는 커스텀 정의만 골라 design 블록을 만든다. 없으면 null. */
export function collectSpecDesign(
  spec: Spec,
  library: CustomDesignLibrary
): SpecDesign | null {
  const used = GG.usedDesignNames(spec);
  const out: SpecDesign = {};
  let n = 0;
  const KINDS: (keyof CustomDesignLibrary & keyof SpecDesign)[] = [
    "themes", "skins", "icons", "arts", "marks", "decors", "frames",
  ];
  for (const kind of KINDS) {
    const lib = library[kind] as Record<string, unknown>;
    const names = (used[kind] || []).filter((k) => !!lib[k]);
    if (!names.length) continue;
    const bag: Record<string, unknown> = {};
    for (const k of names) bag[k] = lib[k];
    (out as Record<string, unknown>)[kind] = bag;
    n += names.length;
  }
  return n ? out : null;
}

/**
 * 스펙의 design 블록을 지금 참조하는 것에 맞춘다.
 *
 * 더 심지도, 덜 심지도 않는다 — 참조를 지우면 정의도 빠진다. 같은 결과면 원래
 * 객체를 그대로 돌려주므로(참조 동등) 히스토리에 빈 칸이 쌓이지 않는다.
 */
export function syncSpecDesign(spec: Spec, library: CustomDesignLibrary): Spec {
  const next = collectSpecDesign(spec, library);
  const cur = (spec as { design?: SpecDesign }).design ?? null;
  if (JSON.stringify(cur ?? null) === JSON.stringify(next)) return spec;
  const copy = { ...spec } as Spec & { design?: SpecDesign };
  if (next) copy.design = next;
  else delete copy.design;
  return copy;
}
