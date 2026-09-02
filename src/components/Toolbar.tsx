/** 상단 툴바 — 파일·예제·자막/음성·내보내기·스킬. */
import { useEffect, useRef, useState } from "react";

export interface ExportKind {
  key: "html" | "present" | "clean" | "csv" | "mp4";
  label: string;
  hint: string;
}

export const EXPORTS: ExportKind[] = [
  { key: "html", label: "HTML — 일반 재생", hint: "플레이어 포함. 그대로 열어 재생·공유" },
  {
    key: "present",
    label: "HTML — 발표용",
    hint: "씬 단위로 넘김. P 로 발표자 창. 화면 자막은 빠진다",
  },
  { key: "clean", label: "HTML — 클린", hint: "플레이어 UI 없이. 녹화·캡처용" },
  { key: "csv", label: "타임코드 CSV", hint: "편집기에 넣을 씬별 시작·끝 프레임" },
  {
    key: "mp4",
    label: "MP4 — 영상",
    hint: "1080p 30fps · 음성까지 담는다. 실시간이라 영상 길이만큼 걸린다",
  },
];

export function Toolbar({
  dirty,
  filePath,
  docTitle,
  canUndo,
  canRedo,
  subsPath,
  audioPath,
  cueCount,
  audioMB,
  captions,
  busy,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onExample,
  onDesign,
  onUndo,
  onRedo,
  onPickSubs,
  onPickAudio,
  onClearSync,
  onToggleCaptions,
  onGenSpec,
  onExport,
  onCheck,
  onSkill,
  onDocs,
  onOpenLogs,
}: {
  dirty: boolean;
  filePath: string | null;
  docTitle?: string;
  canUndo: boolean;
  canRedo: boolean;
  subsPath: string | null;
  audioPath: string | null;
  cueCount: number;
  audioMB: number;
  captions: boolean;
  busy: boolean;
  onNew: () => void | Promise<void>;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExample: () => void;
  onDesign: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onPickSubs: () => void;
  onPickAudio: () => void;
  onClearSync: () => void;
  onToggleCaptions: (v: boolean) => void;
  onGenSpec: () => void;
  onExport: (k: ExportKind["key"]) => void;
  onCheck: () => void;
  onSkill: () => void;
  onDocs: () => void;
  onOpenLogs: () => void;
}) {
  const [menu, setMenu] = useState<string | null>(null);
  const close = () => setMenu(null);
  const host = useRef<HTMLElement>(null);

  /* 마우스가 헤더를 벗어나면 닫는 방식은 메뉴가 예고 없이 사라진다 —
     바깥을 누르거나 Esc 를 눌렀을 때만 닫는다. */
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target instanceof Node)) return;
      if (host.current?.contains(e.target) && (e.target as Element).closest?.(".menu-host")) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  return (
    <header className="toolbar" ref={host}>
      <div className="brand">
        <img className="brand-mark" src="/icon.svg" alt="" aria-hidden="true" />
        <strong>gmotion</strong>
        <span className="dim">
          {filePath ? filePath.split(/[/\\]/).pop() : docTitle || "제목 없음"}
          {dirty ? " •" : ""}
        </span>
      </div>

      <div className="tb-group">
        <button type="button" onClick={() => void onNew()}>
          새로
        </button>
        <button type="button" onClick={onOpen}>
          열기
        </button>
        <button type="button" onClick={onSave} disabled={busy}>
          저장
        </button>
        <button type="button" onClick={onSaveAs} disabled={busy}>
          다른 이름
        </button>
        <button type="button" onClick={onExample}>
          예제
        </button>
        <button
          type="button"
          onClick={onDesign}
          title="디자인 스튜디오 및 요소 관리 (테마·배경·마크·일러스트·프레임·아이콘)"
        >
          디자인
        </button>
      </div>
      <div className="tb-group">
        <button type="button" onClick={onUndo} disabled={!canUndo} title="실행 취소 (Ctrl+Z / ⌘Z)">
          ↶
        </button>
        <button type="button" onClick={onRedo} disabled={!canRedo} title="다시 실행 (Ctrl+Y / ⇧⌘Z)">
          ↷
        </button>
      </div>

      <div className="tb-group menu-host">
        {/* 무엇이 걸려 있는지 버튼에서 바로 읽히게 한다 — 산출물에 실릴 것과 같다 */}
        <button
          type="button"
          className={subsPath ? "on" : ""}
          onClick={() => setMenu(menu === "sync" ? null : "sync")}
        >
          자막·음성
          {subsPath && <span className="badge">자막 {cueCount}</span>}
          {captions && <span className="badge">화면</span>}
          {audioMB > 0 && <span className="badge">음성 {audioMB.toFixed(1)}MB</span>}
        </button>
        {menu === "sync" && (
          <div className="menu wide-menu">
            {/* 자막 → 음성 → 화면 자막을 한 번에 마치는 자리다. 하나 고를 때마다 닫히면
                버튼을 다시 찾아 눌러야 하므로, 여기서는 아무것도 스스로 닫지 않는다.
                닫기는 바깥 클릭·Esc·닫기 버튼으로만 한다. */}
            <p className="hint">
              순서는 자막이 먼저, 음성이 그다음이다. <code>--audio</code> 만 주면 소리는 실측인데
              화면은 추정이라 어긋난다.
            </p>
            <div className="menu-row">
              <button type="button" onClick={() => onPickSubs()}>
                자막 {subsPath ? "다시 고르기" : "고르기"} (SRT·VTT)
              </button>
              <span className="mono dim">{subsPath ?? "없음"}</span>
            </div>
            <div className="menu-row">
              <button type="button" disabled={!subsPath} onClick={() => onPickAudio()}>
                음성 {audioPath ? "다시 고르기" : "고르기"} (mp3·m4a)
              </button>
              <span className="mono dim">{audioPath ?? "없음"}</span>
            </div>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={captions}
                disabled={!subsPath}
                onChange={(e) => onToggleCaptions(e.target.checked)}
              />
              화면 자막 얹기 — 화면 맨 아래에 붙는다. 보는 쪽에서 <code>C</code> 키로 끌 수 있다.
              발표용 산출물에는 실리지 않는다 (말은 발표자가 한다)
            </label>
            {/* 자막이 있으면 여기서 스펙 자체를 만들 수 있다 — 자막을 고르는 자리가
                "이걸로 뭘 할 수 있나" 를 아는 자리이기도 하다. */}
            <div className="menu-row">
              <button
                type="button"
                disabled={!subsPath}
                onClick={() => {
                  onGenSpec();
                  close();
                }}
              >
                자막으로 스펙 초안 만들기…
              </button>
              <span className="dim">로컬 에이전트 CLI(claude·codex·pi·omp) 또는 규칙 기반</span>
            </div>
            <div className="menu-row end">
              <button
                type="button"
                className="ghost danger"
                disabled={!subsPath && !audioPath}
                onClick={() => onClearSync()}
              >
                해제
              </button>
              <button type="button" className="ghost" onClick={close}>
                닫기
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="tb-group menu-host">
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => setMenu(menu === "export" ? null : "export")}
        >
          내보내기
        </button>
        {menu === "export" && (
          <div className="menu">
            {EXPORTS.map((e) => (
              <button
                key={e.key}
                type="button"
                onClick={() => {
                  onExport(e.key);
                  close();
                }}
              >
                <strong>{e.label}</strong>
                <span className="dim">{e.hint}</span>
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={onCheck} title="산출물 기계 검수 (gm check)">
          검수
        </button>
      </div>

      <div className="tb-group right">
        <button type="button" onClick={onDocs}>
          문서
        </button>
        <button type="button" onClick={onSkill}>
          스킬 설치
        </button>
        <button type="button" onClick={onOpenLogs} title="로그 폴더 열기">
          로그
        </button>
      </div>
    </header>
  );
}
