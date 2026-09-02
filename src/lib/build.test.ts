import { describe, it, expect } from "vitest";
import { checkOutput } from "./build";

const FAKE_OK_HTML = `<html lang="ko"><head></head><body>
  <style>@media (prefers-reduced-motion: reduce) {}</style>
  <div aria-label="스테이지"></div>
  <div class="gg-scene" data-pattern="kineticType"></div>
  <div class="gg-scene" data-pattern="quote"></div>
  <div class="gg-scene" data-pattern="heroReveal"></div>
  <div class="gg-scene" data-pattern="chartReveal"></div>
  <script>window.GGM = {}; document.fonts.ready.then(()=>{});</script>
</body></html>`;

describe("checkOutput", () => {
  it("정책을 만족하는 산출물은 실패가 없다", () => {
    const r = checkOutput(FAKE_OK_HTML);
    expect(r.fail).toBe(0);
  });
  it("lang=ko 가 없으면 실패로 잡는다", () => {
    const r = checkOutput(FAKE_OK_HTML.replace('lang="ko"', ""));
    expect(r.fail).toBeGreaterThan(0);
  });
  it("외부 스크립트(CDN GSAP 제외)가 있으면 실패로 잡는다", () => {
    const bad = FAKE_OK_HTML.replace(
      "<script>",
      '<script src="https://evil.example/x.js"></script><script>',
    );
    const r = checkOutput(bad);
    expect(r.lines.some((l) => !l.ok && l.label.includes("외부 스크립트"))).toBe(true);
  });
});
