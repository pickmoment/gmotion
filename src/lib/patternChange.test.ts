import { describe, expect, it } from "vitest";
import { GG } from "../engine/boot";
import { PATTERNS, blankScene } from "../engine/schema";
import type { Scene } from "../engine/types";
import { changePattern } from "./patternChange";

const validate = (scene: Scene) =>
  GG.validate({ title: "t", theme: "midnight", aspect: "16:9", scenes: [scene] });

describe("changePattern", () => {
  it("같은 패턴이면 그대로 돌려준다(참조 동일)", () => {
    const s = blankScene("cardsCascade") as Scene;
    expect(changePattern(s, "cardsCascade").scene).toBe(s);
  });

  it("이름이 다른 같은 역할 자리로 항목을 옮긴다 — items → steps", () => {
    const s = { pattern: "cardsCascade", title: "제목", items: ["하나", "둘", "셋"] } as Scene;
    const { scene, carried } = changePattern(s, "processFlow");
    expect(scene.pattern).toBe("processFlow");
    expect(scene.steps).toEqual(["하나", "둘", "셋"]);
    expect(scene.items).toBeUndefined();
    expect(carried).toContain("제목");
  });

  it("timeline 의 when 은 note 로 내려가고 라벨이 항목 글자가 된다", () => {
    const s = {
      pattern: "timeline",
      events: [{ when: "1월", label: "착수", icon: "rocket" }],
    } as Scene;
    const { scene } = changePattern(s, "cardsCascade");
    expect(scene.items).toEqual([{ label: "착수", icon: "rocket", note: "1월" }]);
  });

  it("수치는 값을 받는 자리로만 따라간다 — stats → stages", () => {
    const s = {
      pattern: "dataCounter",
      stats: [
        { label: "가입", value: 1000, unit: "명" },
        { label: "결제", value: 90, unit: "명" },
      ],
    } as Scene;
    const { scene } = changePattern(s, "funnel");
    expect(scene.stages).toEqual([
      { label: "가입", value: 1000, unit: "명" },
      { label: "결제", value: 90, unit: "명" },
    ]);
  });

  it("값을 받지 않는 자리로 가면 수치는 버려진다 — stats → 카드", () => {
    const s = { pattern: "dataCounter", stats: [{ label: "가입", value: 1000 }] } as Scene;
    const { scene } = changePattern(s, "cardsCascade");
    expect(scene.items).toEqual(["가입"]);
  });

  it("항목을 양쪽 비교로 가르고, 되돌리면 다시 합친다", () => {
    const s = { pattern: "cardsCascade", items: ["A1", "A2", "B1", "B2"] } as Scene;
    const split = changePattern(s, "splitCompare").scene;
    /* 라벨은 새 패턴의 기본값이 남고 항목만 갈라 들어간다 */
    expect(split.left).toEqual({ label: "왼쪽", items: ["A1", "A2"] });
    expect(split.right).toEqual({ label: "오른쪽", items: ["B1", "B2"] });

    expect(changePattern(split, "cardsCascade").scene.items).toEqual(["A1", "A2", "B1", "B2"]);
  });

  it("before/after 는 left/right 로 자리째 옮겨진다", () => {
    const s = {
      pattern: "beforeAfter",
      before: { label: "지금", items: ["느리다"], tone: "bad" },
      after: { label: "이후", items: ["빠르다"], tone: "good" },
    } as Scene;
    const { scene } = changePattern(s, "splitCompare");
    expect(scene.left).toEqual({ label: "지금", items: ["느리다"], tone: "bad" });
    expect(scene.right).toEqual({ label: "이후", items: ["빠르다"], tone: "good" });
    expect(scene.before).toBeUndefined();
  });

  it("중심 하나짜리 객체는 도착점 자리로, 없으면 항목 끝으로 간다", () => {
    const s = {
      pattern: "convergence",
      sources: ["로그", "지표"],
      target: { label: "한 곳", icon: "database" },
    } as Scene;
    expect(changePattern(s, "divergence").scene.source).toEqual({
      label: "한 곳",
      icon: "database",
    });
    expect(changePattern(s, "cardsCascade").scene.items).toEqual(["로그", "지표", "한 곳"]);
  });

  it("유튜브 씬의 내용 자리를 찾아간다 — 항목은 선택지로, 엔드카드는 CTA 가 아니라 다음 볼 것으로", () => {
    const s = {
      pattern: "cardsCascade",
      title: "제목",
      items: [{ label: "왼쪽", icon: "layers" }, { label: "오른쪽" }],
    } as Scene;
    const quiz = changePattern(s, "quizReveal").scene;
    /* 라벨만 남은 항목은 문자열로 접힌다 — 스펙을 깨끗하게 두는 기존 규칙이다 */
    expect(quiz.options).toEqual([{ label: "왼쪽", icon: "layers" }, "오른쪽"]);
    expect(quiz.question).toBe("제목");

    const end = changePattern(s, "endCard").scene;
    expect(end.next).toEqual([{ label: "왼쪽", icon: "layers" }, "오른쪽"]);
    /* cta 는 기본값(구독·좋아요·알림)을 쓰도록 비어 있어야 한다 */
    expect(end.cta).toBeUndefined();
  });

  it("랭킹의 수치는 값을 받는 자리로 따라간다 — items(value) → stats", () => {
    const s = {
      pattern: "rankList",
      title: "가장 많이 물어본 것",
      items: [
        { label: "설치", value: 812 },
        { label: "속도", value: 604 },
      ],
    } as Scene;
    const { scene } = changePattern(s, "dataCounter");
    expect(scene.stats).toEqual([
      { label: "설치", value: 812 },
      { label: "속도", value: 604 },
    ]);
  });

  it("제목 자리가 없는 패턴에서는 제목이 첫 줄이 되고, 돌아오면 다시 제목이 된다", () => {
    const s = { pattern: "heroReveal", title: "정보는 어디에나 있다" } as Scene;
    const kinetic = changePattern(s, "kineticType").scene;
    expect(kinetic.lines).toEqual(["정보는 어디에나 있다"]);
    expect(changePattern(kinetic, "heroReveal").scene.title).toBe("정보는 어디에나 있다");
  });

  it("인용문·matchCut 처럼 이름이 다른 제목도 찾아 옮긴다", () => {
    const q = { pattern: "quote", text: "말 한 줄", by: "누구" } as Scene;
    expect(changePattern(q, "heroReveal").scene.title).toBe("말 한 줄");
    const m = changePattern(q, "matchCut").scene;
    expect(m.to).toEqual({ title: "말 한 줄" });
    expect(changePattern(m, "heroReveal").scene.title).toBe("말 한 줄");
  });

  it("서브는 캡션 자리로도 간다", () => {
    const s = { pattern: "heroReveal", title: "제목", sub: "부제" } as Scene;
    expect(changePattern(s, "chart").scene.caption).toBe("부제");
  });

  it("공통 필드는 남고, matchCut 전용 roll 은 따라가지 않는다", () => {
    const s = {
      pattern: "matchCut",
      anchor: "question",
      to: { title: "이후" },
      id: "s3",
      say: "여기서 이 말을 한다",
      hold: 1.5,
      transition: "zoomIn",
      mark: "underline",
      decor: "grid",
      textFx: "roll",
      notes: "노트",
    } as Scene;
    const { scene } = changePattern(s, "cardsCascade");
    expect(scene.id).toBe("s3");
    expect(scene.say).toBe("여기서 이 말을 한다");
    expect(scene.hold).toBe(1.5);
    expect(scene.transition).toBe("zoomIn");
    expect(scene.mark).toBe("underline");
    expect(scene.decor).toBe("grid");
    expect(scene.notes).toBe("노트");
    expect(scene.textFx).toBeUndefined();
    expect(changePattern(s, "kineticType").scene.textFx).toBeUndefined();
  });

  it("밀도 상한을 넘는 항목은 버리고 그 사실을 알린다", () => {
    const items = ["1", "2", "3", "4", "5", "6", "7"];
    const orbit = changePattern({ pattern: "cardsCascade", items } as Scene, "orbit");
    expect(orbit.scene.orbits).toEqual(items);
    expect(orbit.notes).toEqual([]);

    const cut = changePattern({ pattern: "cardsCascade", items } as Scene, "dataCounter");
    expect(cut.scene.stats).toHaveLength(4);
    expect(cut.notes.join(" ")).toContain("상한");
  });

  it("수치가 없으면 차트에 넣지 않는다 — 없는 값을 만들지 않는다", () => {
    const s = { pattern: "cardsCascade", title: "제목", items: ["가", "나"] } as Scene;
    const { scene, dropped } = changePattern(s, "chart");
    expect(dropped.join(" ")).toContain("수치가 없어");
    /* 뼈대 데이터는 그대로 — 라벨만 있는 0 짜리 막대를 만들지 않는다 */
    expect(scene.data).toEqual(blankScene("chart").data);
  });

  it("수치가 있으면 차트 데이터로 들어가고, 다시 지표로도 돌아온다", () => {
    const s = {
      pattern: "dataCounter",
      stats: [
        { label: "1월", value: 12 },
        { label: "2월", value: 18 },
      ],
    } as Scene;
    const chart = changePattern(s, "chart").scene;
    expect(chart.data).toEqual({
      items: [
        { label: "1월", value: 12 },
        { label: "2월", value: 18 },
      ],
    });
    expect(changePattern(chart, "dataCounter").scene.stats).toEqual([
      { label: "1월", value: 12 },
      { label: "2월", value: 18 },
    ]);
  });

  it("프레임 안 화면의 항목도 자리로 인정한다", () => {
    const s = { pattern: "cardsCascade", items: ["가", "나"] } as Scene;
    const dev = changePattern(s, "deviceShow").scene;
    expect(dev.screen).toEqual({ title: "화면", items: ["가", "나"] });
    expect(changePattern(dev, "cardsCascade").scene.items).toEqual(["가", "나"]);
  });

  it("원본 씬을 건드리지 않는다", () => {
    const s = { pattern: "cardsCascade", title: "제목", items: ["가"] } as Scene;
    const snapshot = JSON.stringify(s);
    changePattern(s, "timeline");
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it("어떤 유형에서 어떤 유형으로 바꿔도 검증 오류가 없다", () => {
    const names = Object.keys(PATTERNS);
    for (const from of names) {
      const src = blankScene(from) as Scene;
      expect(validate(src).errors, `${from} 뼈대`).toEqual([]);
      for (const to of names) {
        const { scene } = changePattern(src, to);
        expect(scene.pattern).toBe(to);
        expect(validate(scene).errors, `${from} → ${to}`).toEqual([]);
      }
    }
  });
});
