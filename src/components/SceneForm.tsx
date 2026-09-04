/** 씬 하나의 폼. 패턴별 필드 + 씬 비주얼 디자인 바 + 공통 필드(연출 · 타이밍·대사·노트). */
import { useState } from "react";
import { COMMON_FIELDS, PATTERNS } from "../engine/schema";
import type { Scene } from "../engine/types";
import { changePattern, type PatternChange } from "../lib/patternChange";
import { setField } from "../lib/spec";
import { FieldRenderer } from "./fields/FieldRenderer";
import { SkinPicker } from "./fields/SkinPicker";

export function SceneForm({
  scene,
  index,
  theme = "midnight",
  onChange,
  onOpenDesign,
}: {
  scene: Scene;
  index: number;
  theme?: string;
  onChange: (s: Scene) => void;
  onOpenDesign?: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [openDesignSlot, setOpenDesignSlot] = useState<"decor" | "mark" | "art" | "skin" | null>(
    null,
  );

  const schema = PATTERNS[scene.pattern];

  if (!schema) {
    return (
      <div className="pane-body">
        <p className="warn-inline">모르는 패턴이다: {scene.pattern}</p>
        <p className="hint">JSON 탭에서 고치거나 아래에서 패턴을 다시 고른다.</p>
        <PatternSelect scene={scene} onChange={onChange} />
      </div>
    );
  }

  /* 공통 필드는 스키마 한 곳에서 오고, 여기서는 group 별로 자리만 정한다 */
  const obj = scene as Record<string, unknown>;
  const onPatch = (next: Record<string, unknown>) => onChange(next as Scene);
  const designField = COMMON_FIELDS.find((f) => f.key === openDesignSlot);

  return (
    <div className="pane-body scene-form-pane">
      {/* ── 1. 씬 헤더 ── */}
      <header className="scene-head">
        <div className="scene-head-main">
          <span className="scene-n">[{index + 1}]</span>
          <strong>{schema.label}</strong>
          <span className="dim"> {scene.pattern}</span>
        </div>
        <p className="use">{schema.use}</p>
      </header>

      {/* ── 2. 패턴 선택 ── */}
      <PatternSelect scene={scene} onChange={onChange} />

      {/* ── 3. 씬 비주얼 디자인 바 (Scene Visual Design Bar) ── */}
      <div className="scene-visual-bar">
        <div className="visual-bar-header">
          <span className="visual-bar-title">✨ 씬 비주얼 디자인</span>
          {onOpenDesign && (
            <button
              type="button"
              className="ghost visual-studio-link"
              onClick={onOpenDesign}
              title="디자인 스튜디오 열기"
            >
              🎨 디자인 스튜디오 ↗
            </button>
          )}
        </div>

        <div className="visual-chips-row">
          {/* 배경 (Decor) 칩 */}
          <button
            type="button"
            className={`visual-slot-chip ${scene.decor ? "active" : ""}`}
            onClick={() => setOpenDesignSlot((cur) => (cur === "decor" ? null : "decor"))}
            title="씬 배경 레이어 설정"
          >
            <span className="slot-icon">🌊</span>
            <span className="slot-label">배경</span>
            <strong className="slot-value">
              {scene.decor === false
                ? "끄기"
                : Array.isArray(scene.decor)
                  ? scene.decor.join("+")
                  : scene.decor || "테마 기본"}
            </strong>
          </button>

          {/* 제목 강조 마크 (Mark) 칩 */}
          <button
            type="button"
            className={`visual-slot-chip ${scene.mark ? "active" : ""}`}
            onClick={() => setOpenDesignSlot((cur) => (cur === "mark" ? null : "mark"))}
            title="제목 강조 마크 설정 (밑줄·동그라미·배지)"
          >
            <span className="slot-icon">✏️</span>
            <span className="slot-label">마크</span>
            <strong className="slot-value">{scene.mark || "— 없음"}</strong>
          </button>

          {/* 메인 일러스트 (Art) 칩 */}
          <button
            type="button"
            className={`visual-slot-chip ${scene.art ? "active" : ""}`}
            onClick={() => setOpenDesignSlot((cur) => (cur === "art" ? null : "art"))}
            title="씬 대표 일러스트 설정"
          >
            <span className="slot-icon">🎨</span>
            <span className="slot-label">일러스트</span>
            <strong className="slot-value">{scene.art || "— 없음"}</strong>
          </button>

          {/* 재질 (Skin) 칩 — 이 씬만 다른 스킨을 쓸 수 있다 */}
          <button
            type="button"
            className={`visual-slot-chip ${scene.skin ? "active" : ""}`}
            onClick={() => setOpenDesignSlot((cur) => (cur === "skin" ? null : "skin"))}
            title="이 씬만 재질(표면·선·타이포) 갈아 끼우기"
          >
            <span className="slot-icon">🧱</span>
            <span className="slot-label">재질</span>
            <strong className="slot-value">
              {typeof scene.skin === "string" ? scene.skin : scene.skin ? "커스텀" : "루트 따름"}
            </strong>
          </button>
        </div>

        {/* ── 칩 팝오버: 배경·마크·일러스트는 공통 필드를 그대로 그린다(스킨은 객체라 별도 픽커) ── */}
        {designField && (
          <div className="visual-slot-popover">
            <div className="slot-popover-head">
              <span className="dim">{designField.key}</span>
              <button type="button" className="ghost" onClick={() => setOpenDesignSlot(null)}>
                ×
              </button>
            </div>
            <FieldRenderer field={designField} obj={obj} onPatch={onPatch} theme={theme} />
          </div>
        )}

        {openDesignSlot === "skin" && (
          <div className="visual-slot-popover">
            <div className="slot-popover-head">
              <strong>이 씬의 재질 (skin) 설정</strong>
              <button type="button" className="ghost" onClick={() => setOpenDesignSlot(null)}>
                ×
              </button>
            </div>
            <SkinPicker
              label=""
              value={scene.skin}
              theme={theme}
              onChange={(v) => onPatch(setField(obj, "skin", v))}
              onOpenDesignPanel={onOpenDesign}
              hint="비워두면 루트 skin 을 따릅니다. 자막 뱃지는 씬 밖 레이어라 바뀌지 않습니다."
            />
          </div>
        )}
      </div>

      {/* ── 4. 연출 (transition · cam · textFx · exitFx) ── */}
      <div className="scene-content-section">
        <h4 className="section-subtitle">🎬 연출</h4>
        <div className="grid">
          {COMMON_FIELDS.filter((f) => f.group === "fx").map((f) => (
            <FieldRenderer key={f.key} field={f} obj={obj} onPatch={onPatch} theme={theme} />
          ))}
        </div>
      </div>

      {/* ── 5. 패턴 주요 필드 ── */}
      <div className="scene-content-section">
        <h4 className="section-subtitle">📝 패턴 내용 편집</h4>
        <div className="grid">
          {schema.fields.map((f) => (
            <FieldRenderer
              key={f.key}
              field={f}
              obj={obj}
              onPatch={onPatch}
              theme={theme}
              max={schema.max}
            />
          ))}
        </div>
      </div>

      {/* ── 6. 타이밍·대사·노트 (say · hold · purpose · notes · id) ── */}
      <div className="scene-details-accordion">
        <button type="button" className="section-toggle" onClick={() => setShowDetails((s) => !s)}>
          {showDetails ? "▾" : "▸"} 씬 타이밍·대사·발표자 노트
          {scene.say && <span className="badge-mini">대사</span>}
          {scene.hold && <span className="badge-mini">{scene.hold}s</span>}
          {scene.purpose && <span className="badge-mini">용도</span>}
        </button>

        {showDetails && (
          <div className="scene-details-body grid">
            {COMMON_FIELDS.filter((f) => f.group === "meta").map((f) => (
              <FieldRenderer key={f.key} field={f} obj={obj} onPatch={onPatch} theme={theme} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 씬 유형(패턴) 바꾸기 — 내용은 새 유형의 같은 역할 자리로 옮기고(`changePattern`),
 * 자리가 없어 버린 것은 사용자에게 밝힌다. 되돌리기는 ⌘Z 가 한다.
 */
function PatternSelect({ scene, onChange }: { scene: Scene; onChange: (s: Scene) => void }) {
  /* 방금 이 씬을 바꿔 만든 결과일 때만 요약을 보여 준다 — 참조가 같은 동안만이다 */
  const [last, setLast] = useState<{ scene: Scene; change: PatternChange } | null>(null);
  const fresh = last && last.scene === scene ? last.change : null;

  return (
    <div className="field pattern-select-field">
      <label>씬 유형 (pattern)</label>
      <select
        value={scene.pattern}
        onChange={(e) => {
          const change = changePattern(scene, e.target.value);
          setLast({ scene: change.scene, change });
          onChange(change.scene);
        }}
      >
        {Object.entries(PATTERNS).map(([k, p]) => (
          <option key={k} value={k} title={p.use}>
            {k} — {p.label}
          </option>
        ))}
      </select>
      {fresh ? (
        <p className="hint pattern-change-note" aria-live="polite">
          {fresh.carried.length ? (
            <>
              옮김 <strong>{fresh.carried.join(" · ")}</strong>
            </>
          ) : (
            "옮길 내용이 없었다"
          )}
          {fresh.dropped.length ? <> · 버림 {fresh.dropped.join(" · ")}</> : null}
          {fresh.notes.map((n) => (
            <span key={n} className="warn-inline">
              {" · "}
              {n}
            </span>
          ))}
          {" · ⌘Z / Ctrl+Z 로 되돌린다"}
        </p>
      ) : (
        <p className="hint">
          제목·항목·양쪽 비교 같은 내용은 새 유형의 같은 자리로 옮긴다. 자리가 없는 것만 버리고,
          무엇을 버렸는지 여기 적는다.
        </p>
      )}
    </div>
  );
}
