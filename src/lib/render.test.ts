import { describe, it, expect } from "vitest";
import {
  RENDER_FPS,
  estimateSize,
  formatBytes,
  pickResolution,
  resolutions,
  stageSize,
} from "./render";

describe("resolutions", () => {
  it("16:9 는 짧은 변 사다리를 가로 크기로 펼친다", () => {
    expect(resolutions("16:9").map((r) => `${r.w}×${r.h}`)).toEqual([
      "3840×2160",
      "2560×1440",
      "1920×1080",
      "1280×720",
      "854×480",
    ]);
  });

  it("9:16 은 세로를 유지한다 — 짧은 변이 너비다", () => {
    expect(resolutions("9:16").map((r) => `${r.w}×${r.h}`)).toEqual([
      "2160×3840",
      "1440×2560",
      "1080×1920",
      "720×1280",
      "480×854",
    ]);
  });

  it("4:5 는 기준 크기 1080×1350 의 비율을 지킨다", () => {
    const r = resolutions("4:5");
    expect(`${r[2].w}×${r[2].h}`).toBe("1080×1350");
    expect(`${r[4].w}×${r[4].h}`).toBe("480×600");
  });

  it("모든 변이 짝수다 — h.264 yuv420p 가 요구한다", () => {
    for (const a of ["16:9", "9:16", "1:1", "4:5"]) {
      for (const r of resolutions(a)) {
        expect(r.w % 2, `${a} ${r.w}`).toBe(0);
        expect(r.h % 2, `${a} ${r.h}`).toBe(0);
      }
    }
  });

  it("기준 크기가 사다리에 들어 있다", () => {
    for (const a of ["16:9", "9:16", "1:1", "4:5"]) {
      const s = stageSize(a);
      expect(resolutions(a)).toContainEqual(expect.objectContaining({ w: s.w, h: s.h }));
    }
  });
});

describe("pickResolution", () => {
  it("짧은 변으로 고른다", () => {
    expect(pickResolution("16:9", 720)).toMatchObject({ w: 1280, h: 720 });
  });

  it("사다리에 없는 값이면 기준 크기로 돌아간다", () => {
    expect(pickResolution("16:9", 0)).toMatchObject({ w: 1920, h: 1080 });
    expect(pickResolution("9:16", 999)).toMatchObject({ w: 1080, h: 1920 });
  });

  it("화면비가 바뀌어도 고른 크기 단계는 유지된다", () => {
    expect(pickResolution("9:16", 720)).toMatchObject({ w: 720, h: 1280 });
  });
});

describe("estimateSize", () => {
  const sec = 28.39;

  it("실측(story 예제 1920×1080 = 5.7MB)이 범위 안에 든다", () => {
    const e = estimateSize({ w: 1920, h: 1080, fps: RENDER_FPS, sec, audio: false });
    const real = 5_716_778;
    expect(real).toBeGreaterThan(e.low);
    expect(real).toBeLessThan(e.high);
  });

  it("실측(report 예제 1920×1080 = 0.7MB)이 범위 안에 든다", () => {
    const e = estimateSize({ w: 1920, h: 1080, fps: RENDER_FPS, sec: 26.19, audio: false });
    const real = 707_167;
    expect(real).toBeGreaterThan(e.low);
    expect(real).toBeLessThan(e.high);
  });

  it("4K 실측 세 편이 모두 범위 안에 든다", () => {
    const cases: [number, number][] = [
      [7.9, 3_635_230],
      [26.19, 1_512_325],
      [28.39, 20_006_199],
    ];
    for (const [s, real] of cases) {
      const e = estimateSize({ w: 3840, h: 2160, fps: RENDER_FPS, sec: s, audio: false });
      expect(real, `${s}초`).toBeGreaterThan(e.low);
      expect(real, `${s}초`).toBeLessThan(e.high);
    }
  });

  it("해상도가 오르면 커지지만 픽셀 수만큼은 아니다 — crf 고정의 성질", () => {
    const hd = estimateSize({ w: 1280, h: 720, fps: RENDER_FPS, sec, audio: false });
    const fhd = estimateSize({ w: 1920, h: 1080, fps: RENDER_FPS, sec, audio: false });
    const ratio = fhd.bytes / hd.bytes;
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(2_073_600 / 921_600);
  });

  it("음성은 192kbps 로 정확히 더한다", () => {
    const a = estimateSize({ w: 1920, h: 1080, fps: RENDER_FPS, sec: 10, audio: true });
    const b = estimateSize({ w: 1920, h: 1080, fps: RENDER_FPS, sec: 10, audio: false });
    expect(a.bytes - b.bytes).toBeCloseTo((192_000 / 8) * 10, 6);
    /* 음성은 고정 비트레이트라 범위에 폭을 더하지 않는다 */
    expect(a.high - b.high).toBeCloseTo((192_000 / 8) * 10, 6);
  });

  it("길이에 비례한다", () => {
    const one = estimateSize({ w: 1920, h: 1080, fps: RENDER_FPS, sec: 10, audio: false });
    const two = estimateSize({ w: 1920, h: 1080, fps: RENDER_FPS, sec: 20, audio: false });
    expect(two.bytes / one.bytes).toBeCloseTo(2, 6);
  });
});

describe("formatBytes", () => {
  it("1MB 아래는 KB 로 준다", () => {
    expect(formatBytes(707_167)).toBe("691KB");
  });
  it("MB 는 소수 한 자리", () => {
    expect(formatBytes(5_716_778)).toBe("5.5MB");
  });
  it("100MB 이상은 정수", () => {
    expect(formatBytes(220 * 1024 * 1024)).toBe("220MB");
  });
});
