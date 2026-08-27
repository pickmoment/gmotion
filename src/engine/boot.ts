/**
 * 번들된 gmotion 엔진을 브라우저에서 부팅한다.
 *
 * 엔진 소스는 `vendor/gmotion` 에 앱이 직접 들고 있다 — 사용자의 스킬
 * 디렉토리를 참조하지 않는다. icons/vectors/charts 는 순수 CommonJS 이고
 * gsapgraph 는 UMD 라, `module` 과 `require` 만 채워 주면 그대로 돈다.
 *
 * `toHTML` 은 node 에서 gsap.bundle.js·runtime.js 를 디스크에서 읽지만,
 * 브라우저에서는 `opts.gsap` · `opts.runtime` 으로 소스를 주입하면 된다.
 */
import iconsSrc from "../../vendor/gmotion/assets/icons.js?raw";
import vectorsSrc from "../../vendor/gmotion/assets/vectors.js?raw";
import chartsSrc from "../../vendor/gmotion/assets/charts.js?raw";
import graphSrc from "../../vendor/gmotion/assets/gsapgraph.js?raw";
import runtimeSrc from "../../vendor/gmotion/assets/runtime.js?raw";
import gsapSrc from "../../vendor/gmotion/assets/gsap.bundle.js?raw";

import type { Engine, ThemeColors, ThemeDefinition } from "./types";

type Mod = Record<string, unknown>;

function evalCJS(src: string, name: string, deps: Record<string, Mod> = {}): Mod {
  /* node 는 셔뱅을 벗겨 주지만 new Function 은 그대로 파싱해 터진다 (gsapgraph.js) */
  const body = src.startsWith("#!") ? src.slice(src.indexOf("\n") + 1) : src;
  const module = { exports: {} as Mod };
  const require = (id: string): Mod => {
    const hit = deps[id];
    if (!hit) throw new Error(`${name} 이 ${id} 를 요구한다 — 브라우저에서는 제공하지 않는다`);
    return hit;
  };
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function("module", "exports", "require", body)(module, module.exports, require);
  return module.exports;
}

const ICO = evalCJS(iconsSrc, "icons.js");
const VEC = evalCJS(vectorsSrc, "vectors.js");
const CH = evalCJS(chartsSrc, "charts.js");

/** 엔진. 앱 전체가 이 하나만 쓴다. */
const patchedGraphSrc = graphSrc.replace(
  /return\s*\{\s*version:\s*VERSION/m,
  "return {\n  _THEMES: THEMES,\n  version: VERSION"
);

export const GG = evalCJS(patchedGraphSrc, "gsapgraph.js", {
  "./icons.js": ICO,
  "./vectors.js": VEC,
  "./charts.js": CH,
}) as unknown as Engine;
/** 산출물에 인라인되는 소스 — toHTML 에 항상 이 둘을 넘긴다. */
export const ASSETS = { gsap: gsapSrc, runtime: runtimeSrc };

/** 픽토그램 191종. 이름·별칭 검색과 24x24 path 를 그대로 노출한다. */
export const ICONS = {
  all: Object.keys(ICO.ICONS as Record<string, string>).sort(),
  path: (key: string) => (ICO.ICONS as Record<string, string>)[key],
  /** 한글 별칭까지 훑는다. 빈 문자열이면 전체. */
  search: (q: string) => (ICO.iconSearch as (q: string) => string[])(q),
  aliases: (key: string) => (ICO.iconAliases as (k: string) => string[])(key),
  /** 스펙에 적은 이름을 실제 키로 정규화한다 (한글 이름 → 영문 키) */
  resolve: (name: string) => (ICO.iconKey as (n: string) => string | null)(name),
  count: ICO.count as number,
};

export const VECTORS = VEC as {
  DECOR: Record<string, { label: string; build: (W: number, H: number, T: ThemeColors, lv: number) => string; category?: string; custom?: boolean }>;
  MARK: Record<string, { label: string; where: string; build: (T: ThemeColors, text?: string) => string; draw?: boolean; text?: boolean; custom?: boolean }>;
  ART: Record<string, { label: string; build: (T: ThemeColors) => string; custom?: boolean }>;
  FRAME: Record<string, { label: string; ratio: number; build: (W: number, H: number, T: ThemeColors) => { svg: string; inner: { x: number; y: number; w: number; h: number } } | string; bar?: number; custom?: boolean }>;
  rng: (seed?: number) => () => number;
};

export const THEMES_REGISTRY = (GG._THEMES || {}) as Record<string, ThemeDefinition>;

export function registerCustomTheme(key: string, def: ThemeDefinition): void {
  def.custom = true;
  THEMES_REGISTRY[key] = def;
}

export function registerCustomIcon(key: string, path: string, aliases: string[] = [], label?: string): void {
  const icons = ICO.ICONS as Record<string, string>;
  const aliasMap = ICO.ALIAS as Record<string, string>;
  icons[key] = path;
  if (label) {
    aliasMap[label] = key;
  }
  for (const a of aliases) {
    if (a && a.trim()) {
      aliasMap[a.trim()] = key;
    }
  }
}

function fillSvgTemplate(svg: string, vars: Record<string, string | number>): string {
  let res = svg;
  for (const [k, v] of Object.entries(vars)) {
    res = res.split(`{${k}}`).join(String(v));
  }
  return res;
}

export function registerCustomVector(
  type: "DECOR" | "MARK" | "ART" | "FRAME",
  key: string,
  item: {
    label: string;
    svg: string;
    where?: "under" | "around" | "behind" | "point" | "corner" | "ribbon";
    ratio?: number;
    bar?: number;
    category?: string;
    draw?: boolean;
    text?: boolean;
  }
): void {
  if (type === "DECOR") {
    VECTORS.DECOR[key] = {
      label: item.label,
      category: item.category,
      custom: true,
      build: (W: number, H: number, T: ThemeColors, lv: number) => {
        const filled = fillSvgTemplate(item.svg, {
          W,
          H,
          accent: T.accent,
          accent2: T.accent2,
          ink: T.ink,
          ink2: T.ink2,
          dim: T.dim,
          bg: T.bg,
          bg2: T.bg2,
          good: T.good,
          warn: T.warn,
          bad: T.bad,
          lv,
        });
        if (filled.includes("<svg")) {
          return filled;
        }
        return `<svg class="gg-decor" viewBox="0 0 ${W} ${H}" aria-hidden="true">${filled}</svg>`;
      },
    };
  } else if (type === "MARK") {
    VECTORS.MARK[key] = {
      label: item.label,
      where: item.where || "under",
      draw: item.draw ?? true,
      text: item.text ?? false,
      custom: true,
      build: (T: ThemeColors, text?: string) => {
        const filled = fillSvgTemplate(item.svg, {
          accent: T.accent,
          accent2: T.accent2,
          ink: T.ink,
          ink2: T.ink2,
          dim: T.dim,
          bg: T.bg,
          bg2: T.bg2,
          good: T.good,
          warn: T.warn,
          bad: T.bad,
          text: text || "",
        });
        return filled;
      },
    };
  } else if (type === "ART") {
    VECTORS.ART[key] = {
      label: item.label,
      custom: true,
      build: (T: ThemeColors) => {
        const filled = fillSvgTemplate(item.svg, {
          accent: T.accent,
          accent2: T.accent2,
          ink: T.ink,
          ink2: T.ink2,
          dim: T.dim,
          bg: T.bg,
          bg2: T.bg2,
          good: T.good,
          warn: T.warn,
          bad: T.bad,
        });
        if (filled.includes("<svg")) {
          return filled;
        }
        return `<svg class="gg-art" viewBox="0 0 200 200" aria-hidden="true">${filled}</svg>`;
      },
    };
  } else if (type === "FRAME") {
    const ratio = item.ratio || 16 / 9;
    VECTORS.FRAME[key] = {
      label: item.label,
      ratio,
      custom: true,
      build: (W: number, H: number, T: ThemeColors) => {
        const filled = fillSvgTemplate(item.svg, {
          W,
          H,
          accent: T.accent,
          accent2: T.accent2,
          ink: T.ink,
          ink2: T.ink2,
          dim: T.dim,
          bg: T.bg,
          bg2: T.bg2,
          good: T.good,
          warn: T.warn,
          bad: T.bad,
        });
        const padX = Math.round(W * 0.05);
        const padY = Math.round(H * 0.08);
        return {
          svg: filled.includes("<svg") ? filled : `<svg class="gg-frame" viewBox="0 0 ${W} ${H}" aria-hidden="true">${filled}</svg>`,
          inner: {
            x: padX,
            y: padY,
            w: W - padX * 2,
            h: H - padY * 2,
          },
        };
      },
    };
  }
}

export function unregisterCustomItem(type: "theme" | "icon" | "DECOR" | "MARK" | "ART" | "FRAME", key: string): void {
  if (type === "theme") {
    delete THEMES_REGISTRY[key];
  } else if (type === "icon") {
    const icons = ICO.ICONS as Record<string, string>;
    const aliasMap = ICO.ALIAS as Record<string, string>;
    delete icons[key];
    for (const [alias, targetKey] of Object.entries(aliasMap)) {
      if (targetKey === key) {
        delete aliasMap[alias];
      }
    }
  } else if (type === "DECOR") {
    delete VECTORS.DECOR[key];
  } else if (type === "MARK") {
    delete VECTORS.MARK[key];
  } else if (type === "ART") {
    delete VECTORS.ART[key];
  } else if (type === "FRAME") {
    delete VECTORS.FRAME[key];
  }
}
