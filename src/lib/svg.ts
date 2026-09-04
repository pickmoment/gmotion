/**
 * svg — 신뢰할 수 없는 SVG 마크업 정화.
 *
 * 왜 필요한가: 디자인 라이브러리의 벡터(localStorage 에 저장되고 JSON 파일로 주고받는다)와
 * 에이전트 CLI 가 생성한 스펙의 svg 문자열은 앱이 만든 것이 아니다. 그런데 앱은 그것을
 * dangerouslySetInnerHTML 로 앱 문서에 그대로 박는다. 앱 문서는 Tauri IPC 가 닿는 특권
 * 문서다 — 여기서 도는 스크립트는 __TAURI_INTERNALS__.invoke 로 파일 쓰기·삭제 커맨드를
 * 부를 수 있다. 즉 <svg onload=...> 하나가 임의 경로 쓰기로 이어진다.
 * 미리보기는 iframe(sandbox) 안에서 돌지만, 디자인 패널·피커의 썸네일은 앱 문서에 직접
 * 그려진다. 그 경로를 전부 이 함수로 통과시킨다.
 *
 * 정화 방침: 렌더링에 필요한 것(도형·그라디언트·필터·테마 색 style·문서 내부 #id 참조)은
 * 남기고, 스크립트를 실행시킬 수 있는 것만 잘라낸다.
 */

/** 통째로 들어내는 요소 — 스크립트 실행·외부 로드·HTML 탈출 경로. */
const DROP_TAGS: Record<string, true> = {
  script: true,
  foreignobject: true,
  iframe: true,
  object: true,
  embed: true,
  link: true,
  meta: true,
  base: true,
};

/** 값이 URL 로 해석되는 속성 — 스킴을 검사한다. */
const URL_ATTRS: Record<string, true> = {
  href: true,
  "xlink:href": true,
  src: true,
  action: true,
  formaction: true,
};

/** SMIL 애니메이션이 이 속성을 겨냥하면 나중에 href 를 javascript: 로 갈아끼울 수 있다. */
const ANIMATION_TAGS: Record<string, true> = { set: true, animate: true };

const DANGEROUS_SCHEMES = ["javascript:", "data:text/html", "vbscript:"];

/** CSS 로 스크립트를 부르는 옛 IE 문법과 스킴. */
const DANGEROUS_CSS = ["expression(", "javascript:", "url(javascript:"];

/** 공백·제어문자를 빼고 소문자로 — `java\tscript:` 같은 우회를 접는다. */
function normalizeUrl(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0020\u007f\s]/g, "").toLowerCase();
}

function isDangerousUrl(value: string): boolean {
  const v = normalizeUrl(value);
  return DANGEROUS_SCHEMES.some((scheme) => v.startsWith(scheme));
}

function isDangerousCss(value: string): boolean {
  const v = normalizeUrl(value);
  return DANGEROUS_CSS.some((token) => v.includes(normalizeUrl(token)));
}

function scrubElement(el: Element): boolean {
  const tag = el.localName.toLowerCase();

  if (DROP_TAGS[tag]) return false;

  if (ANIMATION_TAGS[tag]) {
    const target = (el.getAttribute("attributeName") || "").trim().toLowerCase();
    if (URL_ATTRS[target]) return false;
  }

  if (tag === "style" && isDangerousCss(el.textContent || "")) return false;

  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith("on")) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (URL_ATTRS[name] && isDangerousUrl(attr.value)) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (name === "style" && isDangerousCss(attr.value)) {
      el.removeAttribute(attr.name);
    }
  }

  return true;
}

/**
 * 스크립트를 실행시킬 수 있는 요소·속성을 걷어낸 SVG 마크업을 돌려준다.
 * `<svg>` 로 감싼 완전한 문서와 조각 마크업(`<circle …/>` 만 있는 것) 둘 다 받는다.
 */
export function sanitizeSvg(markup: string): string {
  if (typeof markup !== "string" || !markup.trim()) return "";
  if (typeof DOMParser === "undefined") {
    throw new Error("sanitizeSvg: DOMParser 가 없는 환경입니다 (브라우저 문서에서만 쓴다)");
  }

  // image/svg+xml 이 아니라 text/html 로 판다 — 조각 마크업은 XML 문서로 파싱되지 않는다.
  // 다만 조각은 <svg> 로 감싸서 넣는다: HTML 파서는 svg 밖의 `<image>` 를 `<img>` 로
  // 바꿔치기하는 등 도형 태그를 다르게 다룬다. 감싸면 foreign content 규칙으로 파싱된다.
  const isFragment = !/<svg[\s/>]/i.test(markup);
  const source = isFragment ? `<svg>${markup}</svg>` : markup;

  const doc = new DOMParser().parseFromString(source, "text/html");
  const body = doc.body;
  if (!body) return "";

  for (const el of Array.from(body.querySelectorAll("*"))) {
    // 이미 잘려나간 가지에 속한 요소는 건너뛴다.
    if (!body.contains(el)) continue;
    if (!scrubElement(el)) el.remove();
  }

  if (!isFragment) return body.innerHTML;

  // 감싼 <svg> 를 도로 벗긴다. 조각이 `</svg>` 로 탈출을 시도했다면 래퍼 밖 내용은 버린다.
  const wrapper = body.firstElementChild;
  return wrapper && wrapper.localName.toLowerCase() === "svg" ? wrapper.innerHTML : "";
}
