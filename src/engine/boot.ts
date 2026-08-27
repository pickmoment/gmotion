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

import type { Engine } from "./types";

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
export const GG = evalCJS(graphSrc, "gsapgraph.js", {
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
