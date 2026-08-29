import { useCallback, useEffect, useMemo, useState } from "react";
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
import { DesignPanel } from "./components/DesignPanel";
import { SpecGenPanel } from "./components/SpecGenPanel";
import { useSpecStore } from "./lib/useSpecStore";
import { syncSpecDesign } from "./lib/design";
import { useDesignStore } from "./lib/designStore";
import { EMPTY_SPEC, insertScene, moveScene, removeScene, replaceScene } from "./lib/spec";
import { build, checkOutput, parseSubtitles, timingCsv, validate, type CheckLine, type SyncInput } from "./lib/build";
import { GG } from "./engine/boot";
import { api, ask, dialogs, shell } from "./lib/tauri";
import type { Cue, Scene, Spec } from "./engine/types";

type Tab = "form" | "doc" | "json";
type Modal = null | "skill" | "docs" | "examples" | "check" | "render" | "design" | "gen";
export default function App() {
  const store = useSpecStore(EMPTY_SPEC);
  const { spec } = store;
  const { library } = useDesignStore();

  /* 커스텀 요소를 쓰면 그 정의를 스펙의 design 블록에 심는다 —
     스펙이 이름만 참조하면 CLI 로 빌드하거나 남에게 넘겼을 때 그 요소가 없다.
     저장할 때 몰래 넣지 않고 편집 중에 맞춘다 — JSON 편집기에 보여야 한다. */
  const update = useCallback(
    (fn: (s: Spec) => Spec) => store.update((cur) => syncSpecDesign(fn(cur), library)),
    [store, library]
  );
  const reset = useCallback(
    (next: Spec) => store.reset(syncSpecDesign(next, library)),
    [store, library]
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

  const [check, setCheck] = useState<{ lines: CheckLine[]; info: string; fail: number } | null>(null);

  const sync: SyncInput = useMemo(() => ({ cues, captions, audioSrc }), [cues, captions, audioSrc]);
  const result = useMemo(() => validate(spec, sync), [spec, sync]);

  const say = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3200);
  }, []);

  const fail = useCallback((e: unknown) => say(`실패: ${String(e)}`), [say]);

  /* 선택한 씬이 목록 밖으로 나가지 않게 붙든다 */
  useEffect(() => {
    if (selected >= spec.scenes.length) setSelected(Math.max(0, spec.scenes.length - 1));
  }, [spec.scenes.length, selected]);

  /* ── 파일 ───────────────────────────────────────────────────── */

  const doOpen = async () => {
    try {
      const p = await dialogs.openSpec();
      if (!p) return;
      const parsed = JSON.parse(await api.readText(p)) as Spec;
      reset(parsed);
      setFilePath(p);
      setSelected(0);
      say(`열었다 — ${p.split(/[/\\]/).pop()}`);
    } catch (e) {
      fail(e);
    }
  };

  const writeSpec = async (path: string) => {
    setBusy(true);
    try {
      await api.writeText(path, JSON.stringify(spec, null, 2));
      setFilePath(path);
      store.markSaved();
      say(`저장했다 — ${path.split(/[/\\]/).pop()}`);
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
      const stem = filePath.split(/[/\\]/).pop()?.replace(/\.json$/i, "");
      if (stem) return stem;
    }
    if (subsPath) {
      const stem = subsPath.split(/[/\\]/).pop()?.replace(/\.(srt|vtt)$/i, "");
      if (stem) return stem;
    }
    if (audioPath) {
      const stem = audioPath.split(/[/\\]/).pop()?.replace(/\.(mp3|m4a|wav|ogg|aac|webm|opus)$/i, "");
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

  const pickSubs = async () => {
    try {
      const p = await dialogs.openSubs();
      if (!p) return;
      const parsed = parseSubtitles(await api.readText(p));
      if (!parsed.length) return say("자막에서 cue 를 찾지 못했다 — SRT·VTT 형식인지 확인한다");
      setSubsPath(p);
      setCues(parsed);
      say(`자막 ${parsed.length}개 cue 를 읽었다`);
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
      say(`음성 ${(size / 1048576).toFixed(1)}MB 를 산출물에 심는다`);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const clearSync = () => {
    setSubsPath(null);
    setCues(null);
    setAudioPath(null);
    setAudioSrc(null);
    setCaptions(false);
  };

  /* ── 내보내기 ───────────────────────────────────────────────── */

  /** 산출물에 실제로 무엇이 실렸는지 — 내보낸 뒤 이걸 그대로 알려준다. */
  const embedded = (kind: ExportKind["key"]): string => {
    if (kind === "csv") return sync.cues ? `자막 타이밍 ${sync.cues.length}cue 기준` : "추정 타이밍";
    const parts: string[] = [];
    if (sync.cues) parts.push(`자막 정렬 ${sync.cues.length}cue`);
    /* 발표용에는 화면 자막이 빠진다 — 실리지 않은 것을 실렸다고 적으면 안 된다. */
    if (sync.captions && sync.cues) parts.push(kind === "present" ? "화면 자막 제외(발표용)" : "화면 자막");
    if (sync.audioSrc) parts.push(`음성 ${(sync.audioSrc.length * 0.75 / 1048576).toFixed(1)}MB`);
    return parts.length ? parts.join(" · ") : "자막·음성 없음";
  };

  const doExport = async (kind: ExportKind["key"]) => {
    if (kind === "mp4") return doRenderMp4();
    if (!result.ok) return say("검증 오류를 먼저 고친다");
    const dir = await defaultDir();
    const base = baseName();
    const csv = kind === "csv";
    const name = csv ? `${base}-타임코드.csv` : kind === "present" ? `${base}-발표.html` : `${base}.html`;
    const defaultPath = dir ? `${dir}/${name}` : name;
    const p = await dialogs.saveAs(defaultPath, csv ? "CSV" : "HTML", csv ? "csv" : "html");
    if (!p) return;
    setBusy(true);
    try {
      const text = csv
        ? timingCsv(spec, 30, sync)
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

  /** 화면비에서 픽셀 크기를 읽는다 — 엔진의 aspects 가 "1920×1080 — …" 로 준다. */
  const stageSize = (): { w: number; h: number } => {
    const label = GG.aspects[(spec.aspect as string) || "16:9"] ?? "";
    const m = label.match(/(\d+)\D+(\d+)/);
    return m ? { w: +m[1], h: +m[2] } : { w: 1920, h: 1080 };
  };

  const doRenderMp4 = async () => {
    if (!result.ok) return say("검증 오류를 먼저 고친다");
    const total = result.stats?.totalSec ?? 0;
    if (!total) return say("길이를 알 수 없다");
    try {
      await api.renderTools();
    } catch (e) {
      return say(String(e));
    }
    const dir = await defaultDir();
    const base = baseName();
    const defaultPath = dir ? `${dir}/${base}.mp4` : `${base}.mp4`;
    const out = await dialogs.saveAs(defaultPath, "MP4", "mp4");
    if (!out) return;

    const tmp = await api.tempPath(`gmotion-render-${Date.now()}.html`);
    setBusy(true);
    setModal("render");
    try {
      /* 렌더용 산출물은 미리보기·내보내기와 같은 빌드다 — 보이는 것이 곧 결과여야 한다.
         플레이어 UI 는 렌더 쪽에서 ?clean=1 로 뺀다. */
      await api.writeText(tmp, build(spec, sync));
      const { w, h } = stageSize();
      await api.renderMp4({
        html_path: tmp,
        out_path: out,
        fps: 30,
        width: w,
        height: h,
        /* 음성은 산출물에 심은 data URI 가 아니라 원본 파일을 트랙으로 붙인다 —
           다시 인코딩하지 않아 빠르고 깨끗하다. */
        audio_path: audioPath,
        total_sec: total,
        quality: 92,
      });
      say(`${out.split(/[/\\]/).pop()} — ${w}×${h} 30fps · ${total.toFixed(1)}초${audioPath ? " · 음성 포함" : ""}`);
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
      if (k === "z") {
        e.preventDefault();
        e.shiftKey ? store.redo() : store.undo();
      } else if (k === "y") {
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
        audioMB={sync.audioSrc ? sync.audioSrc.length * 0.75 / 1048576 : 0}
        captions={captions}
        busy={busy}
        onNew={async () => {
          if (store.dirty && !(await ask("저장하지 않은 편집이 있다. 버릴까?", "새로 만들기"))) return;
          reset(EMPTY_SPEC);
          setFilePath(null);
          setSelected(0);
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
        onToggleCaptions={setCaptions}
        onGenSpec={() => setModal("gen")}
        onExport={doExport}
        onCheck={doCheck}
        onSkill={() => setModal("skill")}
        onDocs={() => setModal("docs")}
      />

      <main className="cols">
        <SceneList
          scenes={spec.scenes}
          selected={selected}
          result={result}
          onSelect={(i) => { setSelected(i); setTab("form"); }}
          onAdd={(s, at) => { update((cur) => insertScene(cur, at, s)); setSelected(at); setTab("form"); }}
          onRemove={(i) => update((cur) => removeScene(cur, i))}
          onDuplicate={(i) => {
            update((cur) => insertScene(cur, i + 1, JSON.parse(JSON.stringify(cur.scenes[i])) as Scene));
            setSelected(i + 1);
          }}
          onMove={(from, to) => { update((cur) => moveScene(cur, from, to)); setSelected(to); }}
        />

        <section className="pane editor">
          <div className="tabs">
            <button type="button" className={tab === "form" ? "on" : ""} onClick={() => setTab("form")}>씬 편집</button>
            <button type="button" className={tab === "doc" ? "on" : ""} onClick={() => setTab("doc")}>문서 설정</button>
            <button type="button" className={tab === "json" ? "on" : ""} onClick={() => setTab("json")}>JSON</button>
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
                  씬이 없다. 왼쪽에서 씬을 추가하거나 툴바의 <strong>예제</strong>에서 가장 가까운 걸 열어 갈아끼운다.
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
          <Preview spec={spec} sync={sync} result={result} scene={selected} onSceneChange={setSelected} />
          <ValidatePanel result={result} spec={spec} cues={cues} />
        </section>
      </main>

      {toast && <div className="toast">{toast}</div>}

      {modal === "skill" && <SkillPanel onClose={() => setModal(null)} />}
      {modal === "docs" && <DocsPanel onClose={() => setModal(null)} />}
      {modal === "examples" && (
        <ExamplesPanel
          onClose={() => setModal(null)}
          onPick={(s, name) => {
            reset(s);
            setFilePath(null);
            setSelected(0);
            setModal(null);
            say(`${name} 를 열었다 — 내용을 갈아끼운다`);
          }}
        />
      )}
      {modal === "render" && (
        <RenderPanel total={result.stats?.totalSec ?? 0} onCancel={() => setModal(null)} />
      )}
      {modal === "check" && check && (
        <CheckPanel lines={check.lines} info={check.info} fail={check.fail} onClose={() => setModal(null)} />
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
          onApply={(next, how) => {
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
  const t = (title ?? "").trim().replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "-");
  return t || "motion";
}
