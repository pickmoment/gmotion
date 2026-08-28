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
import skinsSrc from "../../vendor/gmotion/assets/skins.js?raw";
import designSrc from "../../vendor/gmotion/assets/design.js?raw";
import graphSrc from "../../vendor/gmotion/assets/gsapgraph.js?raw";
import runtimeSrc from "../../vendor/gmotion/assets/runtime.js?raw";
import gsapSrc from "../../vendor/gmotion/assets/gsap.bundle.js?raw";

import type { Engine, SkinDefinition, ThemeColors, ThemeDefinition } from "./types";

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
const SK = evalCJS(skinsSrc, "skins.js");
const DS = evalCJS(designSrc, "design.js");

/** 엔진. 앱 전체가 이 하나만 쓴다. */
const patchedGraphSrc = graphSrc.replace(
  /return\s*\{\s*version:\s*VERSION/m,
  "return {\n  _THEMES: THEMES,\n  version: VERSION"
);

export const GG = evalCJS(patchedGraphSrc, "gsapgraph.js", {
  "./icons.js": ICO,
  "./vectors.js": VEC,
  "./charts.js": CH,
  "./skins.js": SK,
  "./design.js": DS,
}) as unknown as Engine;

/** 디자인 프리미티브(인터페이스)와 스킨(구현부). 스튜디오가 이걸로 편집기를 만든다. */
export const SKINS = SK as unknown as {
  TOKENS: Record<string, string>;
  SKINS: Record<string, { label: string; dark?: boolean; custom?: boolean }>;
  unknownTokens(vars: Record<string, string>): string[];
};
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
  /* 빠진 값 채우기(grain·vig·glow·font 기본값)도 엔진의 makers 가 한다 —
     CLI 가 스펙의 design.themes 를 읽을 때와 같은 결과가 나와야 한다. */
  const makers = (DS as unknown as { makers: { theme: (d: unknown) => ThemeDefinition } }).makers;
  THEMES_REGISTRY[key] = makers.theme(def);
}

/**
 * 커스텀 스킨을 엔진에 등록한다.
 *
 * 등록은 앱 안에서만 유효하다 — CLI 로 빌드하거나 남에게 넘길 때도 같은 모습이 나오게
 * 하려면 스펙의 `skin` 에 정의를 그대로 인라인해야 한다(designStore.skinDefOf 가 만든다).
 */
export function registerCustomSkin(key: string, def: SkinDefinition): void {
  (GG.registerSkin as (k: string, d: SkinDefinition) => void)(key, { ...def, custom: true });
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

/**
 * 커스텀 벡터를 등록한다. 실제 빌더는 **엔진의 design.js** 가 만든다 —
 * 앱과 CLI 가 같은 함수를 써야 두 경로의 결과가 어긋나지 않는다.
 * (예전에는 이 파일 안에 SVG 템플릿 채우기가 따로 있었다.)
 */
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
  const makers = (DS as unknown as { makers: Record<string, (d: unknown) => unknown> }).makers;
  const kind = { DECOR: "decor", MARK: "mark", ART: "art", FRAME: "frame" }[type];
  (VECTORS[type] as Record<string, unknown>)[key] = makers[kind]({ ...item, custom: true });
}

export function unregisterCustomItem(type: "theme" | "skin" | "icon" | "DECOR" | "MARK" | "ART" | "FRAME", key: string): void {
  if (type === "theme") {
    delete THEMES_REGISTRY[key];
  } else if (type === "skin") {
    (GG.unregisterSkin as (k: string) => void)(key);
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
