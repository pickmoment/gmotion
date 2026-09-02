/** 씬 하나의 폼. 패턴별 필드 + 씬 비주얼 디자인 바 + 타이밍/연출 필드. */
import { useState } from "react";
import { GG } from "../engine/boot";
import { PATTERNS } from "../engine/schema";
import type { Scene } from "../engine/types";
import { changePattern, type PatternChange } from "../lib/patternChange";
import { ArtPicker } from "./fields/ArtPicker";
import { DecorEditor } from "./fields/DecorEditor";
import { FieldRenderer } from "./fields/FieldRenderer";
import { MarkPicker } from "./fields/MarkPicker";
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

  const patch = (k: keyof Scene, v: unknown) => {
    const next = { ...scene };
    if (v === undefined || v === "") {
      delete next[k];
    } else {
      (next as Record<string, unknown>)[k] = v;
    }
    onChange(next);
  };

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

          {/* 트랜지션 (Transition) 선택기 */}
          <div className="visual-slot-select" title="이전 씬에서 넘어오는 화면 전환 효과">
            <span className="slot-icon">🎬</span>
            <select
              value={scene.transition ?? ""}
              onChange={(e) => patch("transition", e.target.value || undefined)}
            >
              <option value="">전환: 기본 (fade/cut)</option>
              {Object.entries(GG.transitions).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 카메라 (Cam) 선택기 — 씬 전체 길이 동안 아주 느리게 움직인다 */}
          <div
            className="visual-slot-select"
            title="씬 카메라 무브. 비워두면 패턴에 맞는 카메라를 자동으로 고릅니다"
          >
            <span className="slot-icon">🎥</span>
            <select value={scene.cam ?? ""} onChange={(e) => patch("cam", e.target.value)}>
              <option value="">카메라: 자동 (패턴 기본)</option>
              {Object.entries(GG.cams).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* 텍스트 효과 (Text FX) 선택기 */}
          <div className="visual-slot-select" title="글자 등장 모션 효과">
            <span className="slot-icon">⚡</span>
            <select
              value={scene.textFx ?? ""}
              onChange={(e) => patch("textFx", e.target.value || undefined)}
            >
              <option value="">텍스트FX: 기본</option>
              <option value="scramble">scramble (섞이다 정렬)</option>
              <option value="roll">roll (굴러 교체)</option>
            </select>
          </div>
        </div>

        {/* ── 퀵 슬롯 인라인 에디터 팝오버들 ── */}
        {openDesignSlot === "decor" && (
          <div className="visual-slot-popover">
            <div className="slot-popover-head">
              <strong>배경 레이어 (decor) 설정</strong>
              <button type="button" className="ghost" onClick={() => setOpenDesignSlot(null)}>
                ×
              </button>
            </div>
            <DecorEditor
              label=""
              value={scene.decor}
              onChange={(v) => patch("decor", v)}
              decorLevel={scene.decorLevel}
              onChangeLevel={(lvl) => patch("decorLevel", lvl)}
              theme={theme}
              hint="비워두면 문서 테마의 기본 배경이 적용됩니다."
            />
          </div>
        )}

        {openDesignSlot === "mark" && (
          <div className="visual-slot-popover">
            <div className="slot-popover-head">
              <strong>제목 강조 마크 (mark) 설정</strong>
              <button type="button" className="ghost" onClick={() => setOpenDesignSlot(null)}>
                ×
              </button>
            </div>
            <MarkPicker
              label=""
              value={scene.mark}
              onChange={(v) => patch("mark", v)}
              theme={theme}
              hint="한 씬에 하나. 단어나 숫자에 밑줄, 원, 배지, 스탬프를 입힙니다."
            />
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
              onChange={(v) => patch("skin", v)}
              onOpenDesignPanel={onOpenDesign}
              hint="비워두면 루트 skin 을 따릅니다. 자막 뱃지는 씬 밖 레이어라 바뀌지 않습니다."
            />
          </div>
        )}

        {openDesignSlot === "art" && (
          <div className="visual-slot-popover">
            <div className="slot-popover-head">
              <strong>씬 대표 일러스트 (art) 설정</strong>
              <button type="button" className="ghost" onClick={() => setOpenDesignSlot(null)}>
                ×
              </button>
            </div>
            <ArtPicker
              label=""
              value={scene.art}
              onChange={(v) => patch("art", v)}
              theme={theme}
              hint="씬 상단/중앙에 배치되는 200×200 테마 색상 연동 추상 도형 일러스트입니다."
            />
          </div>
        )}
      </div>

      {/* ── 4. 패턴 주요 필드 (Pattern Specific Content) ── */}
      <div className="scene-content-section">
        <h4 className="section-subtitle">📝 패턴 내용 편집</h4>
        <div className="grid">
          {schema.fields.map((f) => (
            <FieldRenderer
              key={f.key}
              field={f}
              obj={scene as Record<string, unknown>}
              onPatch={(next) => onChange(next as Scene)}
            />
          ))}
        </div>
      </div>

      {/* ── 5. 타이밍 & 연출 세부 필드 (Timing, Audio, Notes) ── */}
      <div className="scene-details-accordion">
        <button type="button" className="section-toggle" onClick={() => setShowDetails((s) => !s)}>
          {showDetails ? "▾" : "▸"} 씬 타이밍·대사·발표자 노트
          {scene.say && <span className="badge-mini">대사</span>}
          {scene.hold && <span className="badge-mini">{scene.hold}s</span>}
          {scene.purpose && <span className="badge-mini">용도</span>}
        </button>

        {showDetails && (
          <div className="scene-details-body grid">
            <div className="field">
              <label>대사 (say)</label>
              <input
                value={scene.say ?? ""}
                placeholder="내레이션 또는 자막과 일치할 대사 텍스트"
                onChange={(e) => patch("say", e.target.value)}
              />
              <p className="hint">
                자막 싱크 시 이 대사를 기준으로 씬 등장 시각과 길이를 맞춥니다.
              </p>
            </div>

            <div className="field">
              <label>머무는 시간 (초, hold)</label>
              <input
                type="number"
                step={0.1}
                value={scene.hold === undefined ? "" : String(scene.hold)}
                placeholder="생략 시 글자 수로 자동 계산"
                onChange={(e) =>
                  patch("hold", e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
              <p className="hint">내용이 다 나온 뒤 머무는 시간입니다.</p>
            </div>

            <div className="field">
              <label>씬 용도 (purpose)</label>
              <input
                value={scene.purpose ?? ""}
                placeholder="이 씬의 핵심 전달 목적을 한 줄로"
                onChange={(e) => patch("purpose", e.target.value)}
              />
            </div>

            <div className="field">
              <label>발표자 노트 (notes)</label>
              <textarea
                rows={2}
                value={scene.notes ?? ""}
                placeholder="발표 모드(P)에서 발표자 화면에 띄울 메모"
                onChange={(e) => patch("notes", e.target.value)}
              />
            </div>

            <div className="field">
              <label>씬 식별자 (id)</label>
              <input
                value={scene.id ?? ""}
                placeholder="s1, problem, solution 등 (생략 시 자동)"
                onChange={(e) => patch("id", e.target.value)}
              />
            </div>
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
