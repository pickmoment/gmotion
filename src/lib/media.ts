/**
 * 스펙이 들고 다니는 자막·음성 — 열면 자동으로 붙이고, 붙이면 스펙에 적는다.
 *
 *   "media": { "subs": "intro.srt", "audio": "intro.mp3", "captions": true }
 *
 * 경로는 **스펙 파일이 있는 폴더 기준**이다(엔진·CLI 와 같은 규칙). 스펙과 미디어를
 * 같이 옮겨도 깨지지 않게, 앱이 적을 때도 상대경로로 적는다 — 다른 갈래에 있으면
 * 절대경로가 남는다. 루트 `audio: {offset, volume}` 는 재생 설정이라 여기와 무관하다.
 */
import { GG } from "../engine/boot";
import type { Cue, Spec } from "../engine/types";
import { parseSubtitles } from "./build";
import { api } from "./tauri";

export interface MediaRefs {
  subs: string | null;
  audio: string | null;
  captions: boolean;
}

const WIN_ABS = /^[a-zA-Z]:[\\/]/;

export function isAbsolutePath(p: string): boolean {
  return p.startsWith("/") || p.startsWith("\\\\") || WIN_ABS.test(p);
}

/** 경로에서 폴더만. 웹뷰에는 node 의 path 가 없으니 두 구분자를 같이 본다. */
export function dirOf(p: string): string {
  const i = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
  if (i < 0) return "";
  return p.slice(0, i) || "/";
}

/** 폴더의 조각들. 루트의 빈 조각(`/a` → ["", "a"])은 남기고 꼬리만 버린다. */
function segments(dir: string): string[] {
  return dir.split(/[/\\]/).filter((s, i) => s !== "" || i === 0);
}

/** 스펙 폴더 기준 경로를 절대경로로 푼다. */
export function resolveRef(baseDir: string, ref: string): string {
  if (isAbsolutePath(ref) || !baseDir) return ref;
  const sep = baseDir.includes("\\") && !baseDir.includes("/") ? "\\" : "/";
  const out = segments(baseDir);
  for (const seg of ref.split(/[/\\]/)) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") {
      if (out.length > 1) out.pop();
      continue;
    }
    out.push(seg);
  }
  return out.join(sep);
}

/** 절대경로를 폴더 기준 상대경로로. 루트가 다르면(다른 드라이브) 절대경로를 그대로 둔다. */
export function relativeTo(baseDir: string, abs: string): string {
  if (!baseDir || !isAbsolutePath(abs)) return abs;
  const a = segments(baseDir);
  const b = segments(abs);
  if ((a[0] ?? "").toLowerCase() !== (b[0] ?? "").toLowerCase()) return abs;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const up: string[] = [];
  for (let k = i; k < a.length; k++) up.push("..");
  const rel = [...up, ...b.slice(i)].join("/");
  return rel || abs;
}

export function specMedia(spec: Spec): MediaRefs {
  return GG.media(spec);
}

/** media 를 불변으로 갈아끼운다. 전부 비면 키째 지운다 — 빈 객체가 스펙에 남지 않게. */
export function setMediaRefs(spec: Spec, patch: Partial<MediaRefs>): Spec {
  const next = { ...specMedia(spec), ...patch };
  const media: Record<string, unknown> = {};
  if (next.subs) media.subs = next.subs;
  if (next.audio) media.audio = next.audio;
  if (next.captions) media.captions = true;
  if (!Object.keys(media).length) {
    const rest = { ...spec };
    delete rest.media;
    return rest;
  }
  return { ...spec, media: media as Spec["media"] };
}

/**
 * 저장 위치가 바뀌면 상대경로를 다시 계산한다 — 붙여 둔 절대경로를 아는 동안에만.
 * 스펙이 바뀔 일이 없으면 같은 참조를 돌려준다.
 */
export function retargetMedia(
  spec: Spec,
  specPath: string,
  abs: { subs: string | null; audio: string | null },
): Spec {
  const dir = dirOf(specPath);
  const cur = specMedia(spec);
  const patch: Partial<MediaRefs> = {};
  if (abs.subs) patch.subs = relativeTo(dir, abs.subs);
  if (abs.audio) patch.audio = relativeTo(dir, abs.audio);
  if ((patch.subs ?? cur.subs) === cur.subs && (patch.audio ?? cur.audio) === cur.audio)
    return spec;
  return setMediaRefs(spec, patch);
}

export interface LoadedMedia {
  subsPath: string | null;
  cues: Cue[] | null;
  audioPath: string | null;
  audioSrc: string | null;
  captions: boolean;
  /** 무엇을 읽었고 무엇을 못 읽었는지 — 사용자에게 그대로 보여 준다 */
  loaded: string[];
  missing: string[];
}

/**
 * 스펙의 `media` 를 실제로 읽는다. 참조가 없으면 null 을 돌려준다(할 일이 없다).
 *
 * `specPath` 를 모르면 상대경로는 풀 수 없다 — 조용히 넘기지 않고 그 사실을 적는다.
 * `bundledSubs` 는 번들 예제용이다: 파일 시스템 대신 그 글자를 자막으로 쓴다.
 */
export async function loadSpecMedia(
  spec: Spec,
  specPath: string | null,
  bundledSubs?: string | null,
): Promise<LoadedMedia | null> {
  const refs = specMedia(spec);
  if (!refs.subs && !refs.audio && !refs.captions) return null;

  const out: LoadedMedia = {
    subsPath: null,
    cues: null,
    audioPath: null,
    audioSrc: null,
    captions: false,
    loaded: [],
    missing: [],
  };
  const dir = specPath ? dirOf(specPath) : "";
  const unresolvable = (ref: string) => !dir && !isAbsolutePath(ref);

  if (refs.subs && bundledSubs) {
    const cues = parseSubtitles(bundledSubs);
    if (cues.length) {
      out.subsPath = refs.subs;
      out.cues = cues;
      out.loaded.push(`자막 ${cues.length}cue`);
    } else out.missing.push(`자막에서 cue 를 찾지 못했다 — ${refs.subs}`);
  } else if (refs.subs && unresolvable(refs.subs)) {
    out.missing.push(`자막 "${refs.subs}" 는 스펙 파일 위치를 알아야 찾는다 — 먼저 저장한다`);
  } else if (refs.subs) {
    const p = resolveRef(dir, refs.subs);
    try {
      const cues = parseSubtitles(await api.readText(p));
      if (!cues.length) out.missing.push(`자막에서 cue 를 찾지 못했다 — ${p}`);
      else {
        out.subsPath = p;
        out.cues = cues;
        out.loaded.push(`자막 ${cues.length}cue`);
      }
    } catch {
      out.missing.push(`자막 파일이 없다 — ${p}`);
    }
  }

  if (refs.audio && unresolvable(refs.audio)) {
    out.missing.push(`음성 "${refs.audio}" 는 스펙 파일 위치를 알아야 찾는다 — 먼저 저장한다`);
  } else if (refs.audio) {
    const p = resolveRef(dir, refs.audio);
    try {
      const src = await api.readDataUri(p);
      out.audioPath = p;
      out.audioSrc = src;
      out.loaded.push(`음성 ${((src.length * 0.75) / 1048576).toFixed(1)}MB`);
    } catch {
      out.missing.push(`음성 파일이 없다 — ${p}`);
    }
  }

  /* 화면 자막은 자막을 읽어야 켜진다 — 소리만 있고 화면이 추정이면 어긋난다 */
  out.captions = refs.captions && !!out.cues;
  if (refs.captions && !out.cues) out.missing.push("자막을 못 읽어 화면 자막은 끈 채로 연다");
  return out;
}
