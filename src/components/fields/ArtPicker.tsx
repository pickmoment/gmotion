import { useMemo, useState } from "react";
import { VECTORS } from "../../engine/boot";
import { renderArtSvg } from "../../lib/design";
import { useDesignStore } from "../../lib/designStore";

export function ArtPicker({
  value,
  onChange,
  theme = "midnight",
  label = "일러스트 (art)",
  hint,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  theme?: string;
  label?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { library } = useDesignStore();

  const allArts = useMemo(() => {
    const list: { key: string; label: string; custom: boolean }[] = [];
    const seen = new Set<string>();

    for (const [k, item] of Object.entries(VECTORS.ART)) {
      seen.add(k);
      list.push({
        key: k,
        label: item.label || k,
        custom: !!item.custom || !!library.arts[k],
      });
    }

    for (const [k, item] of Object.entries(library.arts)) {
      if (!seen.has(k)) {
        list.push({ key: k, label: item.label || k, custom: true });
      }
    }

    return list;
  }, [library.arts]);

  const filteredArts = useMemo(() => {
    if (!q.trim()) return allArts;
    const query = q.toLowerCase();
    return allArts.filter(
      (a) => a.key.toLowerCase().includes(query) || a.label.toLowerCase().includes(query),
    );
  }, [allArts, q]);

  const currentSvg = value ? renderArtSvg(value, theme) : null;
  const currentDef = value ? VECTORS.ART[value] || library.arts[value] : null;

  return (
    <div className="field art-picker-wrap">
      <label>{label}</label>
      <div className="art-row">
        <button
          type="button"
          className="art-chip"
          title="일러스트(art) 고르기"
          onClick={() => setOpen((o) => !o)}
        >
          {currentSvg ? (
            <div className="art-chip-thumb" dangerouslySetInnerHTML={{ __html: currentSvg }} />
          ) : (
            <span className="dim">＋</span>
          )}
        </button>
        <input
          value={value ?? ""}
          placeholder="collab / data / growth / search …"
          onChange={(e) => onChange(e.target.value || undefined)}
        />
        {value && (
          <button
            type="button"
            className="ghost"
            onClick={() => onChange(undefined)}
            title="지우기"
          >
            ×
          </button>
        )}
      </div>
      {hint && <p className="hint">{hint}</p>}
      {value && !currentDef && <p className="warn-inline">등록되지 않은 일러스트 키입니다.</p>}

      {open && (
        <div className="picker art-popover">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`일러스트 검색 — 전체 ${allArts.length}종`}
          />
          <div className="art-grid">
            {filteredArts.map((a) => {
              const svg = renderArtSvg(a.key, theme);
              const isSelected = a.key === value;
              return (
                <button
                  key={a.key}
                  type="button"
                  className={`art-grid-item ${isSelected ? "on" : ""}`}
                  onClick={() => {
                    onChange(a.key);
                    setOpen(false);
                  }}
                  title={a.label}
                >
                  <div className="art-grid-svg" dangerouslySetInnerHTML={{ __html: svg }} />
                  <span className="art-grid-name">{a.key}</span>
                  {a.custom && <span className="badge-custom-sm">커스텀</span>}
                </button>
              );
            })}
            {!filteredArts.length && <p className="dim pad">검색된 일러스트가 없습니다.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
