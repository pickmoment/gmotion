import { describe, expect, it } from "vitest";
import type { Spec, ValidateResult } from "../engine/types";
import { accessibleTranscript } from "./transcript";

const spec: Spec = {
  title: "분기 <리포트>",
  message: "핵심 & 결론",
  scenes: [
    {
      pattern: "processFlow",
      title: "세 단계",
      purpose: "절차를 설명한다",
      say: "첫째부터 셋째까지 진행합니다.",
      steps: [{ label: "첫째" }, { label: "둘째" }, { label: "셋째" }],
    },
  ],
};
const result: ValidateResult = {
  ok: true,
  errors: [],
  warnings: [],
  scenes: [{ n: 1, id: "s1", pattern: "processFlow", at: 2, dur: 5, trans: "cut" }],
};

describe("accessibleTranscript", () => {
  it("장면 설명과 화면 글자, 내레이션, 캡션을 시맨틱 HTML로 낸다", () => {
    const html = accessibleTranscript(spec, result, [
      { start: 2, end: 4, text: "첫째부터 시작합니다." },
    ]);
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain("절차를 설명한다");
    expect(html).toContain("첫째 · 둘째 · 셋째");
    expect(html).toContain("첫째부터 셋째까지 진행합니다.");
    expect(html).toContain("00:02");
    expect(html).toContain("분기 &lt;리포트&gt;");
    expect(html).toContain("핵심 &amp; 결론");
  });
});
