import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Spec } from "../engine/types";

/* 파일 시스템은 Rust 를 지난다 — 여기서는 가짜 파일함을 쥐어 준다 */
const fake = vi.hoisted(() => ({ files: {} as Record<string, string> }));
vi.mock("./tauri", () => ({
  api: {
    readText: (path: string) =>
      path in fake.files ? Promise.resolve(fake.files[path]) : Promise.reject(new Error("없다")),
    readDataUri: (path: string) =>
      path in fake.files
        ? Promise.resolve(`data:audio/mpeg;base64,${fake.files[path]}`)
        : Promise.reject(new Error("없다")),
  },
}));

import {
  dirOf,
  isAbsolutePath,
  loadSpecMedia,
  relativeTo,
  resolveRef,
  retargetMedia,
  setMediaRefs,
  specMedia,
} from "./media";

const spec = (media?: Spec["media"]): Spec =>
  ({ title: "t", scenes: [{ pattern: "heroReveal", title: "x" }], media }) as Spec;

describe("경로 헬퍼", () => {
  it("절대경로를 두 플랫폼 모두에서 알아본다", () => {
    expect(isAbsolutePath("/a/b.srt")).toBe(true);
    expect(isAbsolutePath("C:\\a\\b.srt")).toBe(true);
    expect(isAbsolutePath("\\\\nas\\share\\b.srt")).toBe(true);
    expect(isAbsolutePath("b.srt")).toBe(false);
    expect(isAbsolutePath("./sub/b.srt")).toBe(false);
  });

  it("dirOf 는 파일 이름을 떼고, 루트는 루트로 남긴다", () => {
    expect(dirOf("/a/b/c.json")).toBe("/a/b");
    expect(dirOf("C:\\a\\c.json")).toBe("C:\\a");
    expect(dirOf("/c.json")).toBe("/");
    expect(dirOf("c.json")).toBe("");
  });

  it("스펙 폴더 기준으로 푼다 — 구분자는 폴더 쪽을 따른다", () => {
    expect(resolveRef("/a/b", "voice.srt")).toBe("/a/b/voice.srt");
    expect(resolveRef("/a/b", "./sub/voice.srt")).toBe("/a/b/sub/voice.srt");
    expect(resolveRef("/a/b", "../voice.srt")).toBe("/a/voice.srt");
    expect(resolveRef("C:\\a\\b", "voice.srt")).toBe("C:\\a\\b\\voice.srt");
    expect(resolveRef("/a/b", "/other/voice.srt")).toBe("/other/voice.srt");
    expect(resolveRef("", "voice.srt")).toBe("voice.srt");
  });

  it("상대경로로 되돌린다 — 루트가 다르면 절대경로를 그대로 둔다", () => {
    expect(relativeTo("/a/b", "/a/b/voice.srt")).toBe("voice.srt");
    expect(relativeTo("/a/b", "/a/voice.srt")).toBe("../voice.srt");
    expect(relativeTo("/a/b", "/x/y/voice.srt")).toBe("../../x/y/voice.srt");
    expect(relativeTo("C:\\a", "D:\\v\\voice.srt")).toBe("D:\\v\\voice.srt");
    expect(relativeTo("", "/a/voice.srt")).toBe("/a/voice.srt");
  });

  it("풀었다 되돌리면 제자리로 온다", () => {
    const dir = "/work/ep1";
    const abs = resolveRef(dir, "voice/intro.srt");
    expect(abs).toBe("/work/ep1/voice/intro.srt");
    expect(relativeTo(dir, abs)).toBe("voice/intro.srt");
  });
});

describe("media 필드", () => {
  it("엔진과 같은 눈으로 읽는다", () => {
    expect(specMedia(spec({ subs: "a.srt", captions: true }))).toEqual({
      subs: "a.srt",
      audio: null,
      captions: true,
    });
    expect(specMedia(spec())).toEqual({ subs: null, audio: null, captions: false });
  });

  it("일부만 갈아끼운다", () => {
    const next = setMediaRefs(spec({ subs: "a.srt" }), { audio: "a.mp3" });
    expect(next.media).toEqual({ subs: "a.srt", audio: "a.mp3" });
  });

  it("전부 비면 media 키째 지운다 — 빈 객체를 남기지 않는다", () => {
    const next = setMediaRefs(spec({ subs: "a.srt", captions: true }), {
      subs: null,
      captions: false,
    });
    expect("media" in next).toBe(false);
  });

  it("captions 는 켤 때만 남는다", () => {
    expect(
      setMediaRefs(spec({ subs: "a.srt", captions: true }), { captions: false }).media,
    ).toEqual({ subs: "a.srt" });
  });

  it("원본 스펙을 건드리지 않는다", () => {
    const s = spec({ subs: "a.srt" });
    setMediaRefs(s, { subs: "b.srt" });
    expect(s.media).toEqual({ subs: "a.srt" });
  });
});

describe("retargetMedia", () => {
  it("저장 폴더가 바뀌면 상대경로를 다시 잡는다", () => {
    const s = spec({ subs: "voice.srt", audio: "voice.mp3", captions: true });
    const next = retargetMedia(s, "/work/other/ep.json", {
      subs: "/work/ep1/voice.srt",
      audio: "/work/ep1/voice.mp3",
    });
    expect(next.media).toEqual({
      subs: "../ep1/voice.srt",
      audio: "../ep1/voice.mp3",
      captions: true,
    });
  });

  it("같은 폴더면 스펙을 그대로 돌려준다(참조 동일)", () => {
    const s = spec({ subs: "voice.srt" });
    expect(
      retargetMedia(s, "/work/ep1/ep.json", { subs: "/work/ep1/voice.srt", audio: null }),
    ).toBe(s);
  });

  it("붙여 둔 파일이 없으면 손대지 않는다", () => {
    const s = spec({ subs: "voice.srt" });
    expect(retargetMedia(s, "/elsewhere/ep.json", { subs: null, audio: null })).toBe(s);
  });
});

const SRT =
  "1\n00:00:00,000 --> 00:00:02,000\n안녕하세요.\n\n2\n00:00:02,000 --> 00:00:04,000\n반갑습니다.\n";

describe("loadSpecMedia", () => {
  beforeEach(() => {
    fake.files = { "/work/ep1/voice.srt": SRT, "/work/ep1/voice.mp3": "AAAA" };
  });

  it("media 가 없으면 할 일이 없다", async () => {
    expect(await loadSpecMedia(spec(), "/work/ep1/ep.json")).toBeNull();
  });

  it("스펙 폴더 기준으로 자막·음성을 읽고 화면 자막을 켠다", async () => {
    const m = await loadSpecMedia(
      spec({ subs: "voice.srt", audio: "voice.mp3", captions: true }),
      "/work/ep1/ep.json",
    );
    expect(m?.subsPath).toBe("/work/ep1/voice.srt");
    expect(m?.cues?.length).toBe(2);
    expect(m?.audioPath).toBe("/work/ep1/voice.mp3");
    expect(m?.audioSrc?.startsWith("data:audio/mpeg;base64,")).toBe(true);
    expect(m?.captions).toBe(true);
    expect(m?.missing).toEqual([]);
    expect(m?.loaded.join(" ")).toContain("자막 2cue");
  });

  it("파일이 없으면 조용히 넘기지 않고 짚어 준다", async () => {
    const m = await loadSpecMedia(spec({ subs: "다른.srt", captions: true }), "/work/ep1/ep.json");
    expect(m?.cues).toBeNull();
    expect(m?.missing.join(" ")).toContain("자막 파일이 없다 — /work/ep1/다른.srt");
    /* 자막을 못 읽었으면 화면 자막도 켜지 않는다 — 소리만 실측이면 어긋난다 */
    expect(m?.captions).toBe(false);
  });

  it("스펙 파일 위치를 모르면 상대경로를 풀 수 없다고 알린다", async () => {
    const m = await loadSpecMedia(spec({ subs: "voice.srt" }), null);
    expect(m?.cues).toBeNull();
    expect(m?.missing.join(" ")).toContain("스펙 파일 위치를 알아야 찾는다");
  });

  it("절대경로는 스펙 위치를 몰라도 읽는다", async () => {
    const m = await loadSpecMedia(spec({ subs: "/work/ep1/voice.srt" }), null);
    expect(m?.cues?.length).toBe(2);
  });

  it("번들 예제는 파일 대신 넘겨받은 자막을 쓴다", async () => {
    const m = await loadSpecMedia(spec({ subs: "starter.srt", captions: true }), null, SRT);
    expect(m?.subsPath).toBe("starter.srt");
    expect(m?.cues?.length).toBe(2);
    expect(m?.captions).toBe(true);
  });
});
