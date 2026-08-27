/** 씬 하나의 폼. 패턴별 필드 + 모든 패턴이 받는 공통 필드. */
import { useState } from "react";
import { COMMON_FIELDS, PATTERNS } from "../engine/schema";
import type { Scene } from "../engine/types";
import { FieldRenderer } from "./fields/FieldRenderer";
import { blankScene } from "../engine/schema";

export function SceneForm({
  scene,
  index,
  onChange,
}: {
  scene: Scene;
  index: number;
  onChange: (s: Scene) => void;
}) {
  const [showCommon, setShowCommon] = useState(false);
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

  return (
    <div className="pane-body">
      <header className="scene-head">
        <div>
          <span className="scene-n">[{index + 1}]</span>
          <strong>{schema.label}</strong>
          <span className="dim"> {scene.pattern}</span>
        </div>
        <p className="use">{schema.use}</p>
      </header>

      <PatternSelect scene={scene} onChange={onChange} />

      <div className="grid">
        {schema.fields.map((f) => (
          <FieldRenderer key={f.key} field={f} obj={scene as Record<string, unknown>}
                         onPatch={(next) => onChange(next as Scene)} />
        ))}
      </div>

      <button type="button" className="section-toggle" onClick={() => setShowCommon((s) => !s)}>
        {showCommon ? "▾" : "▸"} 씬 공통 — 용도·노트·대사·트랜지션·강조·배경
      </button>
      {showCommon && (
        <div className="grid">
          {COMMON_FIELDS.map((f) => (
            <FieldRenderer key={f.key} field={f} obj={scene as Record<string, unknown>}
                           onPatch={(next) => onChange(next as Scene)} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 패턴을 바꾸면 이전 패턴의 필드가 남아 검증이 시끄러워진다 —
 * 공통 필드만 남기고 새 패턴의 뼈대로 갈아끼운다.
 */
function PatternSelect({ scene, onChange }: { scene: Scene; onChange: (s: Scene) => void }) {
  const KEEP = ["id", "purpose", "hold", "say", "transition", "notes", "decor", "decorLevel", "mark", "textFx"];
  return (
    <div className="field">
      <label>패턴</label>
      <select
        value={scene.pattern}
        onChange={(e) => {
          const next = blankScene(e.target.value) as Scene;
          KEEP.forEach((k) => {
            if (scene[k] !== undefined) next[k] = scene[k];
          });
          onChange(next);
        }}
      >
        {Object.entries(PATTERNS).map(([k, p]) => (
          <option key={k} value={k}>
            {k} — {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}
