import { useMemo, useState } from "react";
import { VECTORS } from "../../engine/boot";
import { MARK_CATEGORIES, renderMarkSvg } from "../../lib/design";
import { useDesignStore } from "../../lib/designStore";

export function MarkPicker({
  value,
  onChange,
  theme = "midnight",
  label = "강조 마크 (mark)",
  hint,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  theme?: string;
  label?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState("전체");
  const [q, setQ] = useState("");
  const { library } = useDesignStore();

  const [currentKey, currentText] = useMemo(() => {
    if (!value) return ["", ""];
    const idx = value.indexOf(":");
    if (idx < 0) return [value, ""];
    return [value.slice(0, idx), value.slice(idx + 1)];
  }, [value]);

  const allMarks = useMemo(() => {
    const list: {
      key: string;
      label: string;
      where: string;
      category: string;
      text: boolean;
      custom: boolean;
    }[] = [];
    const seen = new Set<string>();

    for (const [k, item] of Object.entries(VECTORS.MARK)) {
      seen.add(k);
      let foundCat = "밑줄·테두리";
      for (const [cName, keys] of Object.entries(MARK_CATEGORIES)) {
        if (keys.includes(k)) {
          foundCat = cName;
          break;
        }
      }
      list.push({
        key: k,
        label: item.label || k,
        where: item.where || "under",
        category: foundCat,
        text: !!item.text,
        custom: !!item.custom || !!library.marks[k],
      });
    }

    for (const [k, item] of Object.entries(library.marks)) {
      if (!seen.has(k)) {
        list.push({
          key: k,
          label: item.label || k,
          where: item.where || "under",
          category: "커스텀",
          text: !!item.text,
          custom: true,
        });
      }
    }

    return list;
  }, [library.marks]);

  const categories = useMemo(() => {
    return ["전체", ...Object.keys(MARK_CATEGORIES), "커스텀"];
  }, []);

  const filteredMarks = useMemo(() => {
    return allMarks.filter((m) => {
      if (cat === "커스텀" && !m.custom) return false;
      if (cat !== "전체" && cat !== "커스텀" && m.category !== cat) return false;
      if (q.trim()) {
        const query = q.toLowerCase();
        return m.key.toLowerCase().includes(query) || m.label.toLowerCase().includes(query);
      }
      return true;
    });
  }, [allMarks, cat, q]);

  const selectedDef = allMarks.find((m) => m.key === currentKey);
  const currentSvg = currentKey ? renderMarkSvg(currentKey, theme, currentText || "강조") : null;

  const handleSelect = (key: string, hasText: boolean) => {
    if (hasText) {
      const defaultText =
        currentText || (key === "stamp" ? "PASS" : key === "ribbon" ? "핵심" : "NEW");
      onChange(`${key}:${defaultText}`);
    } else {
      onChange(key);
    }
  };

  const handleTextChange = (txt: string) => {
    if (!currentKey) return;
    onChange(txt ? `${currentKey}:${txt}` : currentKey);
  };

  return (
    <div className="field mark-picker-wrap">
      <label>{label}</label>
      <div className="mark-row">
        <button
          type="button"
          className="mark-chip"
          title="강조 마크 고르기"
          onClick={() => setOpen((o) => !o)}
        >
          {currentSvg ? (
            <div className="mark-chip-thumb" dangerouslySetInnerHTML={{ __html: currentSvg }} />
          ) : (
            <span className="dim">＋</span>
          )}
        </button>
        <input
          value={value ?? ""}
          placeholder="underline / circle / badge:NEW / stamp:PASS …"
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

      {selectedDef?.text && (
        <div className="mark-text-subrow">
          <span className="dim">마크 문구:</span>
          <input
            value={currentText}
            placeholder="NEW, PASS, 핵심 등"
            onChange={(e) => handleTextChange(e.target.value)}
          />
        </div>
      )}

      {hint && <p className="hint">{hint}</p>}

      {open && (
        <div className="picker mark-popover">
          <div className="mark-popover-head">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="마크 검색..."
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

          <div className="mark-thumb-grid">
            {filteredMarks.map((m) => {
              const svg = renderMarkSvg(m.key, theme, "강조");
              const isSelected = m.key === currentKey;
              return (
                <button
                  key={m.key}
                  type="button"
                  className={`mark-grid-item ${isSelected ? "on" : ""}`}
                  onClick={() => {
                    handleSelect(m.key, m.text);
                    setOpen(false);
                  }}
                  title={m.label}
                >
                  <div className="mark-grid-svg" dangerouslySetInnerHTML={{ __html: svg }} />
                  <div className="mark-grid-label">
                    <span>{m.key}</span>
                    {m.custom && <span className="badge-custom-sm">C</span>}
                  </div>
                </button>
              );
            })}
            {!filteredMarks.length && <p className="dim pad">검색된 마크가 없습니다.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
