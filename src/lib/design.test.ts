import { describe, expect, it } from "vitest";
import { THEMES_REGISTRY } from "../engine/boot";
import type { ThemeColors } from "../engine/types";
import { checkThemeContrast } from "./design";
const colors: ThemeColors = {
  bg: "#ffffff",
  bg2: "#f4f4f4",
  ink: "#000000",
  ink2: "#222222",
  dim: "#777777",
  accent: "#777777",
  accent2: "#777777",
  good: "#777777",
  warn: "#777777",
  bad: "#777777",
};

describe("checkThemeContrast", () => {
  it("설명과 강조 토큰을 실제 본문 기준 4.5:1로 검사한다", () => {
    const result = checkThemeContrast(colors);
    const dim = result.list.find((item) => item.key === "dim_bg");
    const accent = result.list.find((item) => item.key === "accent_bg");
    expect(dim?.need).toBe(4.5);
    expect(accent?.need).toBe(4.5);
  });

  it("카드 배경 위 설명 대비도 검사한다", () => {
    const result = checkThemeContrast(colors);
    expect(result.list.some((item) => item.key === "dim_bg2")).toBe(true);
  });

  it("번들 테마는 에디터의 동일한 기준을 모두 통과한다", () => {
    for (const [key, theme] of Object.entries(THEMES_REGISTRY)) {
      const result = checkThemeContrast(theme);
      expect(
        result.list.filter((item) => !item.pass),
        key,
      ).toEqual([]);
    }
  });
});
