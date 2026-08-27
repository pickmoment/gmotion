/** 좌측 씬 목록 — 순서가 곧 내러티브라 재정렬을 제일 쉽게 둔다. */
import { useState } from "react";
import { PATTERNS, blankScene } from "../engine/schema";
import type { Scene, ValidateResult } from "../engine/types";
import { sceneLabel } from "../lib/spec";

export function SceneList({
  scenes,
  selected,
  result,
  onSelect,
  onAdd,
  onRemove,
  onDuplicate,
  onMove,
}: {
  scenes: Scene[];
  selected: number;
  result: ValidateResult;
  onSelect: (i: number) => void;
  onAdd: (scene: Scene, at: number) => void;
  onRemove: (i: number) => void;
  onDuplicate: (i: number) => void;
  onMove: (from: number, to: number) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const timing = result.scenes ?? [];

  return (
    <div className="pane scene-list">
      <div className="pane-head">
        <h2>씬 {scenes.length}</h2>
        {result.stats && (
          <span className="dim">
            {result.stats.totalSec}초 · 패턴 {result.stats.patterns}종
          </span>
        )}
      </div>

      <ol className="scenes">
        {scenes.map((s, i) => {
          const t = timing[i];
          return (
            <li
              key={i}
              className={`${i === selected ? "on" : ""}${drag === i ? " dragging" : ""}`}
              draggable
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (drag !== null && drag !== i) onMove(drag, i);
                setDrag(null);
              }}
              onDragEnd={() => setDrag(null)}
              onClick={() => onSelect(i)}
            >
              <div className="row">
                <span className="n">{i + 1}</span>
                <span className="pat">{s.pattern}</span>
                {t && <span className="dur">{t.dur}s</span>}
              </div>
              <div className="label">{sceneLabel(s)}</div>
              <div className="row sub">
                {i > 0 && t && <span className="trans">←{t.trans}</span>}
                {t?.matched != null && <span className="matched">자막 {Math.round(t.matched * 100)}%</span>}
              </div>
              <div className="ops" onClick={(e) => e.stopPropagation()}>
                <button type="button" title="위로" disabled={i === 0} onClick={() => onMove(i, i - 1)}>↑</button>
                <button type="button" title="아래로" disabled={i === scenes.length - 1} onClick={() => onMove(i, i + 1)}>↓</button>
                <button type="button" title="복제" onClick={() => onDuplicate(i)}>⧉</button>
                <button type="button" className="danger" title="삭제" onClick={() => onRemove(i)}>×</button>
              </div>
            </li>
          );
        })}
      </ol>

      {adding ? (
        <div className="pattern-menu">
          {Object.entries(PATTERNS).map(([k, p]) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                onAdd(blankScene(k) as Scene, scenes.length);
                setAdding(false);
              }}
              title={p.use}
            >
              <strong>{p.label}</strong>
              <span className="dim">{k}</span>
            </button>
          ))}
          <button type="button" className="ghost" onClick={() => setAdding(false)}>닫기</button>
        </div>
      ) : (
        <button type="button" className="add block" onClick={() => setAdding(true)}>
          + 씬 추가
        </button>
      )}
    </div>
  );
}
