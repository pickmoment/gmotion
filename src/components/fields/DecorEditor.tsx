import { useMemo, useState } from "react";
import { VECTORS } from "../../engine/boot";
import { DECOR_CATEGORIES, renderDecorSvg } from "../../lib/design";
import { sanitizeSvg } from "../../lib/svg";
import { useDesignStore } from "../../lib/designStore";

export function DecorEditor({
  value,
  onChange,
  decorLevel,
  onChangeLevel,
  theme = "midnight",
  label = "배경 레이어 (decor)",
  hint,
}: {
  value?: string | string[] | false;
  onChange: (v: string | string[] | false | undefined) => void;
  decorLevel?: 0 | 1 | 2;
  onChangeLevel?: (lvl: 0 | 1 | 2) => void;
  theme?: string;
  label?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState("전체");
  const [q, setQ] = useState("");
  const { library } = useDesignStore();

  const isFalse = value === false;
  const isDefault = value === undefined;

  const currentList = useMemo(() => {
    if (value === false || value === undefined) return [];
    return Array.isArray(value) ? value : [value];
  }, [value]);

  const allDecors = useMemo(() => {
    const list: { key: string; label: string; category: string; custom: boolean }[] = [];
    const seen = new Set<string>();

    for (const [k, item] of Object.entries(VECTORS.DECOR)) {
      seen.add(k);
      let foundCat = "기타";
      for (const [cName, keys] of Object.entries(DECOR_CATEGORIES)) {
        if (keys.includes(k)) {
          foundCat = cName;
          break;
        }
      }
      list.push({
        key: k,
        label: item.label || k,
        category: item.category || foundCat,
        custom: !!item.custom || !!library.decors[k],
      });
    }

    for (const [k, item] of Object.entries(library.decors)) {
      if (!seen.has(k)) {
        list.push({
          key: k,
          label: item.label || k,
          category: item.category || "커스텀",
          custom: true,
        });
      }
    }

    return list;
  }, [library.decors]);

  const categories = useMemo(() => {
    return ["전체", ...Object.keys(DECOR_CATEGORIES), "커스텀"];
  }, []);

  const filteredDecors = useMemo(() => {
    return allDecors.filter((d) => {
      if (cat === "커스텀" && !d.custom) return false;
      if (cat !== "전체" && cat !== "커스텀" && d.category !== cat) return false;
      if (q.trim()) {
        const query = q.toLowerCase();
        return d.key.toLowerCase().includes(query) || d.label.toLowerCase().includes(query);
      }
      return true;
    });
  }, [allDecors, cat, q]);

  const addDecor = (key: string) => {
    if (isFalse || isDefault) {
      onChange([key]);
    } else {
      onChange([...currentList, key]);
    }
  };

  const removeDecor = (idx: number) => {
    const next = currentList.filter((_, i) => i !== idx);
    onChange(next.length ? next : false);
  };

  const moveDecor = (from: number, to: number) => {
    if (to < 0 || to >= currentList.length) return;
    const next = [...currentList];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="field decor-editor-wrap">
      <div className="decor-head-row">
        <label>{label}</label>
        <div className="decor-presets-row">
          <button
            type="button"
            className={`decor-tag-btn ${isDefault ? "on" : ""}`}
            onClick={() => onChange(undefined)}
            title="테마에 지정된 기본 배경 사용"
          >
            테마 기본
          </button>
          <button
            type="button"
            className={`decor-tag-btn ${isFalse ? "on" : ""}`}
            onClick={() => onChange(false)}
            title="모든 배경 끄기"
          >
            끄기 (false)
          </button>
          {onChangeLevel && (
            <div className="decor-level-pills" title="배경 세기 (decorLevel)">
              <button
                type="button"
                className={decorLevel === 0 ? "on" : ""}
                onClick={() => onChangeLevel(0)}
              >
                약
              </button>
              <button
                type="button"
                className={decorLevel === 1 || decorLevel === undefined ? "on" : ""}
                onClick={() => onChangeLevel(1)}
              >
                보통
              </button>
              <button
                type="button"
                className={decorLevel === 2 ? "on" : ""}
                onClick={() => onChangeLevel(2)}
              >
                강
              </button>
            </div>
          )}
        </div>
      </div>
      {hint && <p className="hint">{hint}</p>}

      <div className="decor-active-layers">
        {isDefault && (
          <div className="decor-status-box">
            <span className="dim">
              테마 기본 배경이 적용됩니다. 커스텀 조합을 추가하려면 아래 버튼을 누르세요.
            </span>
          </div>
        )}
        {isFalse && (
          <div className="decor-status-box disabled">
            <span className="dim">배경이 꺼져 있습니다 (단색 배경만 렌더링).</span>
          </div>
        )}
        {!isDefault && !isFalse && (
          <div className="decor-chips-list">
            {currentList.map((k, idx) => {
              const svg = sanitizeSvg(renderDecorSvg(k, theme, decorLevel ?? 1, 64, 36));
              const custom = !!library.decors[k];
              return (
                <div key={`${k}-${idx}`} className="decor-layer-chip">
                  <div className="decor-chip-thumb" dangerouslySetInnerHTML={{ __html: svg }} />
                  <div className="decor-chip-info">
                    <strong>{k}</strong>
                    {custom && <span className="badge-custom-sm">커스텀</span>}
                  </div>
                  <div className="decor-chip-actions">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveDecor(idx, idx - 1)}
                      title="위로/앞으로 이동"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentList.length - 1}
                      onClick={() => moveDecor(idx, idx + 1)}
                      title="아래로/뒤로 이동"
                    >
                      ▶
                    </button>
                    <button
                      type="button"
                      className="decor-chip-del"
                      onClick={() => removeDecor(idx)}
                      title="삭제"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button type="button" className="decor-add-btn" onClick={() => setOpen((o) => !o)}>
          ＋ 배경 레이어 추가 {open ? "▲" : "▼"}
        </button>
      </div>

      {open && (
        <div className="picker decor-picker-popover">
          <div className="decor-popover-head">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="배경 검색 (이름·키)..."
            />
            <div className="tab-pills">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cat === c ? "on" : ""}
                  onClick={() => setCat(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="decor-thumb-grid">
            {filteredDecors.map((d) => {
              const svg = sanitizeSvg(renderDecorSvg(d.key, theme, decorLevel ?? 1, 140, 78));
              return (
                <button
                  key={d.key}
                  type="button"
                  className="decor-grid-item"
                  onClick={() => {
                    addDecor(d.key);
                  }}
                  title={d.label}
                >
                  <div className="decor-grid-svg" dangerouslySetInnerHTML={{ __html: svg }} />
                  <div className="decor-grid-label">
                    <span>{d.key}</span>
                    {d.custom && <span className="badge-custom-sm">C</span>}
                  </div>
                </button>
              );
            })}
            {!filteredDecors.length && <p className="dim pad">검색된 배경이 없습니다.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
