// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { sanitizeSvg } from "./svg";

describe("sanitizeSvg", () => {
  it("이벤트 핸들러 속성을 전부 걷어낸다", () => {
    const out = sanitizeSvg(
      `<svg onload="alert(1)" ONMOUSEOVER="alert(2)" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" onclick="alert(3)"/></svg>`,
    );
    expect(out).not.toMatch(/onload|onmouseover|onclick/i);
    expect(out).toContain(`viewBox="0 0 10 10"`);
    expect(out).toContain(`r="4"`);
  });

  it("script·foreignObject 요소를 제거한다", () => {
    const out = sanitizeSvg(
      `<svg><script>alert(1)</script><foreignObject><iframe src="x"></iframe></foreignObject><rect width="4" height="4"/></svg>`,
    );
    expect(out).not.toMatch(/script|foreignobject|iframe/i);
    expect(out).toContain("<rect");
  });

  it("javascript: 링크는 버리고 문서 내부 참조는 남긴다", () => {
    const evil = sanitizeSvg(`<svg><a href="jav&#9;ascript:alert(1)"><text>x</text></a></svg>`);
    expect(evil).not.toMatch(/javascript/i);

    const safe = sanitizeSvg(`<svg><a href="#target"><use xlink:href="#glyph"/></a></svg>`);
    expect(safe).toContain(`href="#target"`);
    expect(safe).toContain(`xlink:href="#glyph"`);
  });

  it("정상 style·url(#id) 참조는 보존한다", () => {
    const out = sanitizeSvg(`<svg><rect fill="url(#g)" style="fill:var(--acc);opacity:.4"/></svg>`);
    expect(out).toContain(`fill="url(#g)"`);
    expect(out).toContain(`style="fill:var(--acc);opacity:.4"`);
  });

  it("스크립트를 부르는 style 만 버린다", () => {
    const out = sanitizeSvg(
      `<svg><rect style="background:url(javascript:alert(1))" width="2" height="2"/></svg>`,
    );
    expect(out).not.toMatch(/javascript/i);
    expect(out).toContain(`width="2"`);
  });

  it("attributeName 이 href 인 SMIL 애니메이션을 제거한다", () => {
    const out = sanitizeSvg(
      `<svg><a><set attributeName="href" to="javascript:alert(1)"/><animate attributeName="opacity" to="1"/></a></svg>`,
    );
    expect(out).not.toContain("<set");
    expect(out).toContain(`attributeName="opacity"`);
  });

  it("svg 로 감싸지 않은 조각 마크업도 살려서 돌려준다", () => {
    const out = sanitizeSvg(`<circle cx="5" cy="5" r="3" fill="#fff"/>`);
    expect(out).toContain("<circle");
    expect(out).toContain(`r="3"`);
    expect(out).toContain(`fill="#fff"`);
    expect(out).not.toContain("<svg");
  });

  it("조각 안에 숨긴 이벤트 핸들러도 걷어낸다", () => {
    const out = sanitizeSvg(`<circle cx="5" cy="5" r="3" onload="alert(1)"/>`);
    expect(out).not.toMatch(/onload/i);
  });

  it("빈 입력·비문자열은 빈 문자열", () => {
    expect(sanitizeSvg("")).toBe("");
    expect(sanitizeSvg("   ")).toBe("");
    expect(sanitizeSvg(undefined as unknown as string)).toBe("");
  });
});
