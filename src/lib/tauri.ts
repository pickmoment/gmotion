/** Rust 쪽 커맨드 래퍼. 파일 I/O 와 스킬 설치는 전부 여기를 지난다. */
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { confirm, open, save } from "@tauri-apps/plugin-dialog";

export interface SkillStatus {
  target: string;
  installed: boolean;
  bundled_files: number;
  up_to_date: boolean;
  missing: string[];
  differing: string[];
  extra: string[];
  bundled_version: string;
  installed_version: string | null;
}

export const api = {
  appDataDir: () => invoke<string>("app_data_dir"),
  appLogDir: () => invoke<string>("app_log_dir"),
  readText: (path: string) => invoke<string>("read_text", { path }),
  writeText: (path: string, contents: string) =>
    invoke<{ path: string; name: string }>("write_text", { path, contents }),
  readDataUri: (path: string) => invoke<string>("read_data_uri", { path }),
  fileSize: (path: string) => invoke<number>("file_size", { path }),
  openFile: (path: string) => invoke<void>("open_file", { path }),
  revealFile: (path: string) => invoke<void>("reveal_file", { path }),
  homeDir: () => invoke<string | null>("home_dir"),
  tempPath: (name: string) => invoke<string>("temp_path", { name }),
  removeFile: (path: string) => invoke<void>("remove_file", { path }),
  /** Chrome·ffmpeg 을 찾았는지 미리 확인한다 — 없으면 렌더를 시작조차 하지 않는다 */
  renderTools: () => invoke<string[]>("render_tools"),
  renderMp4: (opts: RenderOpts) => invoke<string>("render_mp4", { opts }),
  renderCancel: () => invoke<void>("render_cancel"),
  skillStatus: (root?: string | null) =>
    invoke<SkillStatus>("skill_status", { root: root ?? null }),
  skillInstall: (root?: string | null) =>
    invoke<SkillStatus>("skill_install", { root: root ?? null }),
  skillRemove: (root?: string | null) =>
    invoke<SkillStatus>("skill_remove", { root: root ?? null }),
  skillFile: (path: string) => invoke<string>("skill_file", { path }),
  skillManifest: () => invoke<string[]>("skill_manifest"),
  /** 설치된 에이전트 CLI 목록. 찾았다는 뜻일 뿐 — 로그인·네트워크는 돌려 봐야 안다 */
  agentTools: () => invoke<AgentTool[]>("agent_tools"),
  agentRun: (opts: AgentRunOpts) => invoke<AgentRunOut>("agent_run", { opts }),
  agentCancel: () => invoke<void>("agent_cancel"),
};

export interface AgentTool {
  id: string;
  bin: string;
}

export interface AgentRunOpts {
  bin: string;
  args: string[];
  cwd: string | null;
  timeout_sec: number;
}

export interface AgentRunOut {
  code: number;
  stdout: string;
  stderr: string;
  ms: number;
  timed_out: boolean;
  canceled: boolean;
}

export interface AgentLine {
  stream: "out" | "err";
  text: string;
}

/** 에이전트 CLI 로그 구독. 렌더 진행률과 같은 방식이다. */
export const onAgentLog = (fn: (l: AgentLine) => void) =>
  listen<AgentLine>("agent-log", (e) => fn(e.payload));

export interface RenderOpts {
  html_path: string;
  out_path: string;
  fps: number;
  width: number;
  height: number;
  audio_path: string | null;
  total_sec: number;
  quality: number;
}

export interface RenderProgress {
  phase: string;
  frame: number;
  frames: number;
  sec: number;
  total_sec: number;
}

/** 렌더 진행률 구독. 정리 함수를 돌려준다. */
export const onRenderProgress = (fn: (p: RenderProgress) => void) =>
  listen<RenderProgress>("mp4-progress", (e) => fn(e.payload));

export const dialogs = {
  openSpec: () =>
    open({ multiple: false, filters: [{ name: "스펙 JSON", extensions: ["json"] }] }) as Promise<
      string | null
    >,
  openSubs: () =>
    open({ multiple: false, filters: [{ name: "자막", extensions: ["srt", "vtt"] }] }) as Promise<
      string | null
    >,
  openAudio: () =>
    open({
      multiple: false,
      filters: [{ name: "음성", extensions: ["mp3", "m4a", "wav", "ogg", "aac", "webm", "opus"] }],
    }) as Promise<string | null>,
  openDir: () => open({ directory: true }) as Promise<string | null>,
  saveAs: (defaultPath: string, name: string, ext: string) =>
    save({ defaultPath, filters: [{ name, extensions: [ext] }] }) as Promise<string | null>,
};

/* 파일 열기·파인더 표시는 Rust 를 지난다 — opener 플러그인의 JS 커맨드는 ACL 스코프에
   걸려 허용 경로 목록이 비면 ForbiddenPath 로 막힌다. 자세한 이유는 lib.rs 의 open_file. */
export const shell = { openPath: api.openFile, revealItemInDir: api.revealFile };

/** 웹뷰의 window.confirm 은 플랫폼마다 다르게 뜬다 — 네이티브 다이얼로그를 쓴다. */
export const ask = (message: string, title: string) =>
  confirm(message, { title, kind: "warning", okLabel: "계속", cancelLabel: "취소" });
