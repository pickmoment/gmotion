import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Toolbar, type ExportKind } from "./components/Toolbar";
import { SceneList } from "./components/SceneList";
import { SceneForm } from "./components/SceneForm";
import { DocSettings } from "./components/DocSettings";
import { JsonEditor } from "./components/JsonEditor";
import { Preview } from "./components/Preview";
import { ValidatePanel } from "./components/ValidatePanel";
import { SkillPanel } from "./components/SkillPanel";
import { DocsPanel } from "./components/DocsPanel";
import { ExamplesPanel } from "./components/ExamplesPanel";
import { CheckPanel } from "./components/CheckPanel";
import { RenderPanel } from "./components/RenderPanel";
import { RenderSetupPanel } from "./components/RenderSetupPanel";
import { DesignPanel } from "./components/DesignPanel";
import { SpecGenPanel } from "./components/SpecGenPanel";
import { ReviewPanel } from "./components/ReviewPanel";
import { useSpecStore } from "./lib/useSpecStore";
import { syncSpecDesign } from "./lib/design";
import { useDesignStore, onLibrarySaveError } from "./lib/designStore";
import { EMPTY_SPEC, insertScene, moveScene, removeScene, replaceScene } from "./lib/spec";
import {
  dirOf,
  loadSpecMedia,
  measureAudioSec,
  relativeTo,
  retargetMedia,
  setMediaRefs,
  specMedia,
  type LoadedMedia,
} from "./lib/media";
import {
  build,
  checkOutput,
  parseSubtitles,
  timingCsv,
  validate,
  type CheckLine,
  type SyncInput,
} from "./lib/build";
import { accessibleTranscript } from "./lib/transcript";
import { RENDER_FPS, formatBytes, pickResolution, type Resolution } from "./lib/render";
import { api, ask, dialogs, shell } from "./lib/tauri";
import type { Cue, Scene, Spec } from "./engine/types";

type Tab = "form" | "doc" | "json";
type Modal =
  null | "skill" | "docs" | "examples" | "check" | "review" | "render" | "design" | "gen" | "mp4";
export default function App() {
  const store = useSpecStore(EMPTY_SPEC);
  const { spec } = store;
  const { library } = useDesignStore();

  /* 커스텀 요소를 쓰면 그 정의를 스펙의 design 블록에 심는다 —
     스펙이 이름만 참조하면 CLI 로 빌드하거나 남에게 넘겼을 때 그 요소가 없다.
     저장할 때 몰래 넣지 않고 편집 중에 맞춘다 — JSON 편집기에 보여야 한다. */
  const update = useCallback(
    (fn: (s: Spec) => Spec) => store.update((cur) => syncSpecDesign(fn(cur), library)),
    [store, library],
  );
  const reset = useCallback(
    (next: Spec) => store.reset(syncSpecDesign(next, library)),
    [store, library],
  );

  /* 라이브러리에서 커스텀 요소를 고치면 스펙에 심긴 사본도 따라가야 한다 */
  useEffect(() => {
    store.update((cur) => syncSpecDesign(cur, library));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library]);

  const [tab, setTab] = useState<Tab>("form");
  const [selected, setSelected] = useState(0);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const [subsPath, setSubsPath] = useState<string | null>(null);
  const [cues, setCues] = useState<Cue[] | null>(null);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [captions, setCaptions] = useState(false);
  /* 음성의 실제 길이. 타임라인 길이와 어긋나면 렌더가 한쪽을 잘라내므로 미리 잰다 */
  const [audioSec, setAudioSec] = useState<number | null>(null);
  useEffect(() => {
    if (!audioSrc) {
      setAudioSec(null);
      return;
    }
    let live = true;
    void measureAudioSec(audioSrc).then((s) => {
      if (live) setAudioSec(s);
    });
    return () => {
      live = false;
    };
  }, [audioSrc]);

  const [check, setCheck] = useState<{ lines: CheckLine[]; info: string; fail: number } | null>(
    null,
  );

  /* MP4 해상도는 짧은 변으로만 들고 있는다 — 화면비를 바꿔도 고른 크기가 따라간다.
     0 이면 화면비의 기준 크기다. */
  const [resShort, setResShort] = useState(0);
  const renderRes = useMemo(() => pickResolution(spec.aspect, resShort), [spec.aspect, resShort]);

  const sync: SyncInput = useMemo(() => ({ cues, captions, audioSrc }), [cues, captions, audioSrc]);
  const result = useMemo(() => validate(spec, sync), [spec, sync]);

  const say = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3200);
  }, []);

  const fail = useCallback((e: unknown) => say(`실패: ${String(e)}`), [say]);

  /* 디자인 라이브러리 저장 실패(예: localStorage 가득 참)를 토스트로 알린다 */
  useEffect(() => onLibrarySaveError(say), [say]);

  /* 창을 닫으려 할 때 저장하지 않은 편집이 있으면 확인을 받는다 */
  const dirtyRef = useRef(store.dirty);
  dirtyRef.current = store.dirty;

  useEffect(() => {
    const win = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    void win
      .onCloseRequested(async (event) => {
        if (!dirtyRef.current) return;
        event.preventDefault();
        if (await ask("저장하지 않은 편집이 있다. 그래도 닫을까?", "닫기")) {
          await win.destroy();
        }
      })
      .then((u) => {
        unlisten = u;
      });
    return () => unlisten?.();
  }, []);

  /* 웹뷰 리로드·OS 강제종료 대비 안전망 */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  /* 선택한 씬이 목록 밖으로 나가지 않게 붙든다 */
  useEffect(() => {
    if (selected >= spec.scenes.length) setSelected(Math.max(0, spec.scenes.length - 1));
  }, [spec.scenes.length, selected]);

  /* ── 파일 ───────────────────────────────────────────────────── */

  /** 스펙의 media 를 읽어 붙인다 — 파일을 열 때·예제를 고를 때. 참조가 없으면 null. */
  const attachSpecMedia = async (
    next: Spec,
    path: string | null,
    bundledSubs?: string | null,
  ): Promise<LoadedMedia | null> => {
    setSubsPath(null);
    setCues(null);
    setAudioPath(null);
    setAudioSrc(null);
    setCaptions(false);
    const m = await loadSpecMedia(next, path, bundledSubs);
    if (!m) return null;
    setSubsPath(m.subsPath);
    setCues(m.cues);
    setAudioPath(m.audioPath);
    setAudioSrc(m.audioSrc);
    setCaptions(m.captions);
    return m;
  };

  /** 자동으로 읽은 것과 못 읽은 것을 한 줄로 — 조용히 넘기지 않는다. */
  const mediaNote = (m: LoadedMedia | null): string => {
    if (!m) return "";
    const parts = [...m.loaded, ...m.missing];
    return parts.length ? ` · ${parts.join(" · ")}` : "";
  };

  const doOpen = async () => {
    if (store.dirty && !(await ask("저장하지 않은 편집이 있다. 그래도 열까?", "열기"))) return;
    try {
      const p = await dialogs.openSpec();
      if (!p) return;
      const parsed = JSON.parse(await api.readText(p)) as Spec;
      reset(parsed);
      setFilePath(p);
      setSelected(0);
      const m = await attachSpecMedia(parsed, p);
      say(`열었다 — ${p.split(/[/\\]/).pop()}${mediaNote(m)}`);
    } catch (e) {
      fail(e);
    }
  };

  /* 자동저장 + 크래시 복구 — 데이터 유실을 막는 안전망 */
  const autosavePath = useRef<string | null>(null);
  const specRef = useRef(spec);
  specRef.current = spec;

  /* 마운트 시 한 번 — 이전 실행이 남긴 자동저장이 있으면 복구를 제안한다.
     StrictMode 는 개발 모드에서 마운트 이펙트를 일부러 두 번 부른다 — 가드 없이 두면
     복구 확인 대화상자가 두 번 뜬다(하나를 눌러도 곧바로 또 뜨는 것처럼 보인다). */
  const recoveryChecked = useRef(false);
  useEffect(() => {
    if (recoveryChecked.current) return;
    recoveryChecked.current = true;
    void (async () => {
      const dir = await api.appDataDir();
      const path = `${dir}/autosave.json`;
      autosavePath.current = path;
      try {
        const raw = await api.readText(path);
        if (raw.trim() && (await ask("이전에 저장하지 못한 편집이 있다. 복구할까?", "복구"))) {
          reset(JSON.parse(raw) as Spec);
          setFilePath(null);
          say("자동복구 파일을 불러왔다");
        }
      } catch {
        /* 자동저장 파일이 없다 — 정상이다 */
      }
      void api.removeFile(path);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* dirty 인 동안 20초마다 스냅샷 */
  useEffect(() => {
    const id = setInterval(() => {
      if (dirtyRef.current && autosavePath.current) {
        void api.writeText(autosavePath.current, JSON.stringify(specRef.current));
      }
    }, 20000);
    return () => clearInterval(id);
  }, []);

  /* 저장·새로·열기 등으로 dirty 가 풀리면 자동저장 파일도 치운다 — 다음 실행에서 헛되이 복구를 묻지 않게 */
  useEffect(() => {
    if (!store.dirty && autosavePath.current) void api.removeFile(autosavePath.current);
  }, [store.dirty]);

  const writeSpec = async (path: string) => {
    setBusy(true);
    try {
      /* 저장 위치가 바뀌면 media 의 상대경로도 그 폴더 기준으로 다시 잡는다 —
         스펙만 옮겨 놓고 자막을 못 찾는 일이 없게. */
      const next = retargetMedia(spec, path, { subs: subsPath, audio: audioPath });
      await api.writeText(path, JSON.stringify(next, null, 2));
      setFilePath(path);
      if (next === spec) store.markSaved();
      else store.commitSaved(next);
      const moved = next === spec ? "" : ` · media 경로를 이 폴더 기준으로 고쳤다`;
      say(`저장했다 — ${path.split(/[/\\]/).pop()}${moved}`);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const doSave = async () => {
    if (filePath) return writeSpec(filePath);
    return doSaveAs();
  };

  const baseName = (): string => {
    if (filePath) {
      const stem = filePath
        .split(/[/\\]/)
        .pop()
        ?.replace(/\.json$/i, "");
      if (stem) return stem;
    }
    if (subsPath) {
      const stem = subsPath
        .split(/[/\\]/)
        .pop()
        ?.replace(/\.(srt|vtt)$/i, "");
      if (stem) return stem;
    }
    if (audioPath) {
      const stem = audioPath
        .split(/[/\\]/)
        .pop()
        ?.replace(/\.(mp3|m4a|wav|ogg|aac|webm|opus)$/i, "");
      if (stem) return stem;
    }
    return slug(spec.title);
  };

  const defaultDir = async (): Promise<string> => {
    if (filePath) {
      const dir = filePath.replace(/[/\\][^/\\]+$/, "");
      if (dir) return dir;
    }
    if (subsPath) {
      const dir = subsPath.replace(/[/\\][^/\\]+$/, "");
      if (dir) return dir;
    }
    if (audioPath) {
      const dir = audioPath.replace(/[/\\][^/\\]+$/, "");
      if (dir) return dir;
    }
    return (await api.homeDir()) ?? "";
  };

  const doSaveAs = async () => {
    const dir = await defaultDir();
    const base = baseName();
    const defaultPath = filePath ?? (dir ? `${dir}/${base}.json` : `${base}.json`);
    const p = await dialogs.saveAs(defaultPath, "스펙 JSON", "json");
    if (p) await writeSpec(p);
  };

  /* ── 자막·음성 ──────────────────────────────────────────────── */

  /** 붙인 파일을 스펙에 적는다 — 스펙 폴더 기준 상대경로로. 다음에 열면 자동으로 붙는다. */
  const recordMedia = (key: "subs" | "audio", abs: string | null) => {
    const ref = abs ? relativeTo(filePath ? dirOf(filePath) : "", abs) : null;
    update((cur) => setMediaRefs(cur, { [key]: ref }));
  };

  const pickSubs = async () => {
    try {
      const p = await dialogs.openSubs();
      if (!p) return;
      const parsed = parseSubtitles(await api.readText(p));
      if (!parsed.length) return say("자막에서 cue 를 찾지 못했다 — SRT·VTT 형식인지 확인한다");
      setSubsPath(p);
      setCues(parsed);
      recordMedia("subs", p);
      say(`자막 ${parsed.length}개 cue 를 읽었다 — 스펙의 media.subs 에 적었다`);
    } catch (e) {
      fail(e);
    }
  };

  const pickAudio = async () => {
    try {
      const p = await dialogs.openAudio();
      if (!p) return;
      setBusy(true);
      const size = await api.fileSize(p);
      setAudioSrc(await api.readDataUri(p));
      setAudioPath(p);
      recordMedia("audio", p);
      say(`음성 ${(size / 1048576).toFixed(1)}MB 를 산출물에 심는다 — 경로를 스펙에 적었다`);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  /** 화면 자막 스위치도 스펙에 남는다 — 다음에 열면 그대로 켜진다. */
  const toggleCaptions = (on: boolean) => {
    setCaptions(on);
    update((cur) => setMediaRefs(cur, { captions: on }));
  };

  const clearSync = () => {
    setSubsPath(null);
    setCues(null);
    setAudioPath(null);
    setAudioSrc(null);
    setCaptions(false);
    update((cur) => setMediaRefs(cur, { subs: null, audio: null, captions: false }));
  };

  /* ── 내보내기 ───────────────────────────────────────────────── */

  /** 산출물에 실제로 무엇이 실렸는지 — 내보낸 뒤 이걸 그대로 알려준다. */
  const embedded = (kind: ExportKind["key"]): string => {
    if (kind === "csv")
      return sync.cues ? `자막 타이밍 ${sync.cues.length}cue 기준` : "추정 타이밍";
    if (kind === "transcript")
      return sync.cues ? `장면 설명 · 전체 캡션 ${sync.cues.length}cue` : "장면 설명 · 내레이션";
    const parts: string[] = [];
    if (sync.cues) parts.push(`자막 정렬 ${sync.cues.length}cue`);
    /* 발표용에는 화면 자막이 빠진다 — 실리지 않은 것을 실렸다고 적으면 안 된다. */
    if (sync.captions && sync.cues)
      parts.push(kind === "present" ? "화면 자막 제외(발표용)" : "화면 자막");
    if (sync.audioSrc) parts.push(`음성 ${((sync.audioSrc.length * 0.75) / 1048576).toFixed(1)}MB`);
    return parts.length ? parts.join(" · ") : "자막·음성 없음";
  };

  const doExport = async (kind: ExportKind["key"]) => {
    if (kind === "mp4") return doRenderMp4();
    if (!result.ok) return say("검증 오류를 먼저 고친다");
    const dir = await defaultDir();
    const base = baseName();
    const csv = kind === "csv";
    const transcript = kind === "transcript";
    const name = csv
      ? `${base}-타임코드.csv`
      : transcript
        ? `${base}-접근성-대본.html`
        : kind === "present"
          ? `${base}-발표.html`
          : `${base}.html`;
    const defaultPath = dir ? `${dir}/${name}` : name;
    const p = await dialogs.saveAs(defaultPath, csv ? "CSV" : "HTML", csv ? "csv" : "html");
    if (!p) return;
    setBusy(true);
    try {
      const text = csv
        ? timingCsv(spec, 30, sync)
        : transcript
          ? accessibleTranscript(spec, result, cues)
          : build(spec, sync, { present: kind === "present", clean: kind === "clean" });
      await api.writeText(p, text);
      const saved = `${p.split(/[/\\]/).pop()} (${Math.round(text.length / 1024)}KB) — ${embedded(kind)}`;
      /* 열기 실패는 저장 실패가 아니다. 한 try 로 묶으면 저장 성공 메시지가
         열기 오류에 덮여, 무엇이 실렸는지 확인할 길이 사라진다. */
      if (csv) return say(saved);
      try {
        await shell.openPath(p);
        say(saved);
      } catch (e) {
        say(`${saved} · 저장은 됐고 열기만 실패했다: ${String(e)}`);
      }
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  /** 해상도를 고르는 창을 먼저 띄운다 — 렌더는 실시간이라 잘못 고르면 그만큼 다시 기다린다. */
  const doRenderMp4 = async () => {
    if (!result.ok) return say("검증 오류를 먼저 고친다");
    if (!(result.stats?.totalSec ?? 0)) return say("길이를 알 수 없다");
    /* Chrome·ffmpeg 이 없으면 설정 창을 띄울 이유도 없다 */
    try {
      await api.renderTools();
    } catch (e) {
      return say(String(e));
    }
    setModal("mp4");
  };

  const startRenderMp4 = async (res: Resolution) => {
    const total = result.stats?.totalSec ?? 0;
    const dir = await defaultDir();
    const base = baseName();
    const defaultPath = dir ? `${dir}/${base}.mp4` : `${base}.mp4`;
    const out = await dialogs.saveAs(defaultPath, "MP4", "mp4");
    /* 저장 위치를 접으면 설정 창에 그대로 남는다 — 고른 해상도를 잃지 않는다 */
    if (!out) return;

    const tmp = await api.tempPath(`gmotion-render-${Date.now()}.html`);
    setBusy(true);
    setModal("render");
    try {
      /* 렌더용 산출물은 미리보기·내보내기와 같은 빌드다 — 보이는 것이 곧 결과여야 한다.
         플레이어 UI 는 렌더 쪽에서 ?clean=1 로 뺀다.
         해상도는 뷰포트 크기로만 정한다 — 런타임이 스테이지를 부모 박스에 맞춰
         scale 하므로 비율이 같으면 같은 그림이 그 해상도로 그려진다. */
      await api.writeText(tmp, build(spec, sync));
      await api.renderMp4({
        html_path: tmp,
        out_path: out,
        fps: RENDER_FPS,
        width: res.w,
        height: res.h,
        /* 음성은 산출물에 심은 data URI 가 아니라 원본 파일을 트랙으로 붙인다 —
           다시 인코딩하지 않아 빠르고 깨끗하다. */
        audio_path: audioPath,
        total_sec: total,
        quality: 92,
      });
      /* 추정이 아니라 실제 크기를 알려준다 — 다음 선택의 근거가 된다 */
      const size = await api.fileSize(out).catch(() => 0);
      say(
        `${out.split(/[/\\]/).pop()} — ${res.w}×${res.h} ${RENDER_FPS}fps · ${total.toFixed(1)}초${
          size ? ` · ${formatBytes(size)}` : ""
        }${audioPath ? " · 음성 포함" : ""}`,
      );
      await shell.revealItemInDir(out);
    } catch (e) {
      say(`렌더 실패: ${String(e)}`);
    } finally {
      void api.removeFile(tmp);
      setModal(null);
      setBusy(false);
    }
  };

  const doCheck = () => {
    if (!result.ok) return say("검증 오류를 먼저 고친다");
    try {
      setCheck(checkOutput(build(spec, sync)));
      setModal("check");
    } catch (e) {
      fail(e);
    }
  };

  /* ── 단축키 ─────────────────────────────────────────────────── */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      /* JSON 탭의 CodeMirror 는 자기 history 로 undo 하고 onChange 로 스토어에 새 상태를 밀어 넣는다 —
         여기서도 store.undo 를 하면 한 번의 ⌘Z 에 둘이 동시에 되돌아간다. 에디터 안에서는 CM 에 맡긴다 */
      const inEditor = e.target instanceof Element && !!e.target.closest(".cm-editor");
      if (k === "z") {
        if (inEditor) return;
        e.preventDefault();
        e.shiftKey ? store.redo() : store.undo();
      } else if (k === "y") {
        if (inEditor) return;
        e.preventDefault();
        store.redo();
      } else if (k === "s") {
        e.preventDefault();
        void doSave();
      } else if (k === "o") {
        e.preventDefault();
        void doOpen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const scene = spec.scenes[selected];

  return (
    <div className="app">
      <Toolbar
        dirty={store.dirty}
        filePath={filePath}
        docTitle={spec.title}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        subsPath={subsPath}
        audioPath={audioPath}
        cueCount={cues?.length ?? 0}
        audioMB={sync.audioSrc ? (sync.audioSrc.length * 0.75) / 1048576 : 0}
        captions={captions}
        mediaRefs={specMedia(spec)}
        busy={busy}
        onNew={async () => {
          if (store.dirty && !(await ask("저장하지 않은 편집이 있다. 버릴까?", "새로 만들기")))
            return;
          reset(EMPTY_SPEC);
          setFilePath(null);
          setSelected(0);
          void attachSpecMedia(EMPTY_SPEC, null);
        }}
        onOpen={doOpen}
        onSave={doSave}
        onSaveAs={doSaveAs}
        onExample={() => setModal("examples")}
        onDesign={() => setModal("design")}
        onUndo={store.undo}
        onRedo={store.redo}
        onPickSubs={pickSubs}
        onPickAudio={pickAudio}
        onClearSync={clearSync}
        onToggleCaptions={toggleCaptions}
        onGenSpec={() => setModal("gen")}
        onExport={doExport}
        onCheck={doCheck}
        onSkill={() => setModal("skill")}
        onDocs={() => setModal("docs")}
        onOpenLogs={() => {
          void api.appLogDir().then((d) => shell.revealItemInDir(d));
        }}
      />

      <main className="cols">
        <SceneList
          scenes={spec.scenes}
          selected={selected}
          result={result}
          onSelect={(i) => {
            setSelected(i);
            setTab("form");
          }}
          onAdd={(s, at) => {
            update((cur) => insertScene(cur, at, s));
            setSelected(at);
            setTab("form");
          }}
          onRemove={(i) => update((cur) => removeScene(cur, i))}
          onDuplicate={(i) => {
            update((cur) =>
              insertScene(cur, i + 1, JSON.parse(JSON.stringify(cur.scenes[i])) as Scene),
            );
            setSelected(i + 1);
          }}
          onMove={(from, to) => {
            update((cur) => moveScene(cur, from, to));
            setSelected(to);
          }}
        />

        <section className="pane editor">
          <div className="tabs">
            <button
              type="button"
              className={tab === "form" ? "on" : ""}
              onClick={() => setTab("form")}
            >
              씬 편집
            </button>
            <button
              type="button"
              className={tab === "doc" ? "on" : ""}
              onClick={() => setTab("doc")}
            >
              문서 설정
            </button>
            <button
              type="button"
              className={tab === "json" ? "on" : ""}
              onClick={() => setTab("json")}
            >
              JSON
            </button>
          </div>
          {tab === "form" &&
            (scene ? (
              <SceneForm
                scene={scene}
                index={selected}
                theme={spec.theme || "midnight"}
                onChange={(s) => update((cur) => replaceScene(cur, selected, s))}
                onOpenDesign={() => setModal("design")}
              />
            ) : (
              <div className="pane-body">
                <p className="dim pad">
                  씬이 없다. 왼쪽에서 씬을 추가하거나 툴바의 <strong>예제</strong>에서 가장 가까운
                  걸 열어 갈아끼운다.
                </p>
              </div>
            ))}
          {tab === "doc" && (
            <DocSettings
              spec={spec}
              onChange={(s) => update(() => s)}
              onOpenDesign={() => setModal("design")}
            />
          )}
          {tab === "json" && <JsonEditor spec={spec} onChange={(s) => update(() => s)} />}
        </section>

        <section className="side">
          <Preview
            spec={spec}
            sync={sync}
            result={result}
            scene={selected}
            onSceneChange={setSelected}
            onReview={() => setModal("review")}
          />
          <ValidatePanel
            result={result}
            spec={spec}
            cues={cues}
            onSelectScene={(i) => {
              setSelected(i);
              setTab("form");
            }}
          />
        </section>
      </main>

      {toast && <div className="toast">{toast}</div>}

      {modal === "skill" && <SkillPanel onClose={() => setModal(null)} />}
      {modal === "docs" && <DocsPanel onClose={() => setModal(null)} />}
      {modal === "examples" && (
        <ExamplesPanel
          onClose={() => setModal(null)}
          onPick={async (s, name, bundledSubs) => {
            if (
              store.dirty &&
              !(await ask("저장하지 않은 편집이 있다. 그래도 예제를 열까?", "예제 열기"))
            )
              return;
            reset(s);
            setFilePath(null);
            setSelected(0);
            setModal(null);
            /* 예제는 파일이 아니라 번들이다 — media.subs 가 가리키는 자막도 번들에서 준다 */
            const m = await attachSpecMedia(s, null, bundledSubs);
            say(`${name} 를 열었다 — 내용을 갈아끼운다${mediaNote(m)}`);
          }}
        />
      )}
      {modal === "mp4" && (
        <RenderSetupPanel
          aspect={spec.aspect || "16:9"}
          totalSec={result.stats?.totalSec ?? 0}
          fps={RENDER_FPS}
          hasAudio={!!audioPath}
          audioSec={audioSec}
          value={renderRes}
          onChange={(r) => setResShort(r.short)}
          onStart={() => void startRenderMp4(renderRes)}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "render" && (
        <RenderPanel
          total={result.stats?.totalSec ?? 0}
          res={renderRes}
          hasAudio={!!audioPath}
          onCancel={() => setModal(null)}
        />
      )}
      {modal === "check" && check && (
        <CheckPanel
          lines={check.lines}
          info={check.info}
          fail={check.fail}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "review" && (
        <ReviewPanel
          spec={spec}
          sync={sync}
          result={result}
          onPick={(index) => {
            setSelected(index);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "gen" && cues && (
        <SpecGenPanel
          cues={cues}
          base={{
            aspect: spec.aspect || "16:9",
            theme: spec.theme || "midnight",
            skin: typeof spec.skin === "string" ? spec.skin : undefined,
            energy: spec.energy || "E2",
          }}
          onClose={() => setModal(null)}
          onApply={async (next, how) => {
            if (
              store.dirty &&
              !(await ask("저장하지 않은 편집이 있다. 그래도 초안을 적용할까?", "초안 적용"))
            )
              return;
            /* 초안은 파일이 아니다 — 경로를 비워 두어 저장할 때 새 파일을 묻게 한다 */
            reset(next);
            setFilePath(null);
            setSelected(0);
            setModal(null);
            say(`자막에서 초안을 만들었다 — ${how}`);
          }}
        />
      )}
      {modal === "design" && (
        <DesignPanel
          currentTheme={spec.theme || "midnight"}
          currentSkin={typeof spec.skin === "string" ? spec.skin : undefined}
          onClose={() => setModal(null)}
          onApplySkin={(skinKey) => {
            update((cur) => ({ ...cur, skin: skinKey }));
            say(`스킨 "${skinKey}" 가 문서에 적용되었습니다.`);
          }}
          onApplyTheme={(themeKey) => {
            update((cur) => ({ ...cur, theme: themeKey }));
            say(`테마 "${themeKey}" 가 문서에 적용되었습니다.`);
          }}
          onApplyDecor={(decorKey) => {
            update((cur) => {
              const existing =
                cur.decor === false
                  ? []
                  : Array.isArray(cur.decor)
                    ? cur.decor
                    : cur.decor
                      ? [cur.decor]
                      : [];
              return { ...cur, decor: [...existing, decorKey] };
            });
            say(`배경 "${decorKey}" 가 문서에 추가되었습니다.`);
          }}
          onApplyMark={(markKey) => {
            if (scene) {
              update((cur) => replaceScene(cur, selected, { ...scene, mark: markKey }));
              say(`씬 [${selected + 1}] 에 마크 "${markKey}" 가 적용되었습니다.`);
            }
          }}
          onApplyArt={(artKey) => {
            if (scene) {
              update((cur) => replaceScene(cur, selected, { ...scene, art: artKey }));
              say(`씬 [${selected + 1}] 에 일러스트 "${artKey}" 가 적용되었습니다.`);
            }
          }}
          onApplyFrame={(frameKey) => {
            if (scene) {
              update((cur) => replaceScene(cur, selected, { ...scene, frame: frameKey }));
              say(`씬 [${selected + 1}] 에 프레임 "${frameKey}" 가 적용되었습니다.`);
            }
          }}
          onNotify={say}
        />
      )}
    </div>
  );
}

/** 파일 이름에 쓸 수 있게 다듬는다. 한글은 그대로 둔다. */
function slug(title?: string): string {
  const t = (title ?? "")
    .trim()
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "-");
  return t || "motion";
}
