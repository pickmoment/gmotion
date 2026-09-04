import { useMemo, useState } from "react";
import { VECTORS } from "../../engine/boot";
import { FRAME_CATEGORIES, renderFrameSvg } from "../../lib/design";
import { sanitizeSvg } from "../../lib/svg";
import { useDesignStore } from "../../lib/designStore";

export function FramePicker({
  value,
  onChange,
  theme = "midnight",
  label = "디바이스·프레임 (frame)",
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

  const allFrames = useMemo(() => {
    const list: {
      key: string;
      label: string;
      ratio: number;
      category: string;
      custom: boolean;
    }[] = [];
    const seen = new Set<string>();

    for (const [k, item] of Object.entries(VECTORS.FRAME)) {
      seen.add(k);
      let foundCat = "디바이스";
      for (const [cName, keys] of Object.entries(FRAME_CATEGORIES)) {
        if (keys.includes(k)) {
          foundCat = cName;
          break;
        }
      }
      list.push({
        key: k,
        label: item.label || k,
        ratio: item.ratio || 16 / 9,
        category: foundCat,
        custom: !!item.custom || !!library.frames[k],
      });
    }

    for (const [k, item] of Object.entries(library.frames)) {
      if (!seen.has(k)) {
        list.push({
          key: k,
          label: item.label || k,
          ratio: item.ratio || 16 / 9,
          category: "커스텀",
          custom: true,
        });
      }
    }

    return list;
  }, [library.frames]);

  const categories = useMemo(() => {
    return ["전체", ...Object.keys(FRAME_CATEGORIES), "커스텀"];
  }, []);

  const filteredFrames = useMemo(() => {
    return allFrames.filter((f) => {
      if (cat === "커스텀" && !f.custom) return false;
      if (cat !== "전체" && cat !== "커스텀" && f.category !== cat) return false;
      if (q.trim()) {
        const query = q.toLowerCase();
        return f.key.toLowerCase().includes(query) || f.label.toLowerCase().includes(query);
      }
      return true;
    });
  }, [allFrames, cat, q]);

  const currentDef = allFrames.find((f) => f.key === (value || "browser"));
  const currentSvg = value ? renderFrameSvg(value, theme, 60, 40) : null;

  return (
    <div className="field frame-picker-wrap">
      <label>{label}</label>
      <div className="frame-row">
        <button
          type="button"
          className="frame-chip"
          title="프레임 고르기"
          onClick={() => setOpen((o) => !o)}
        >
          {currentSvg ? (
            <div
              className="frame-chip-thumb"
              dangerouslySetInnerHTML={{ __html: sanitizeSvg(currentSvg.svg) }}
            />
          ) : (
            <span className="dim">＋</span>
          )}
        </button>
        <input
          value={value ?? ""}
          placeholder="browser / window / terminal / phone / tablet / card …"
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
      {value && !currentDef && <p className="warn-inline">등록되지 않은 프레임 키입니다.</p>}

      {open && (
        <div className="picker frame-popover">
          <div className="frame-popover-head">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="프레임 검색..."
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

          <div className="frame-thumb-grid">
            {filteredFrames.map((f) => {
              const res = renderFrameSvg(f.key, theme, 120, 80);
              const isSelected = f.key === (value || "browser");
              return (
                <button
                  key={f.key}
                  type="button"
                  className={`frame-grid-item ${isSelected ? "on" : ""}`}
                  onClick={() => {
                    onChange(f.key);
                    setOpen(false);
                  }}
                  title={f.label}
                >
                  <div
                    className="frame-grid-svg"
                    dangerouslySetInnerHTML={{ __html: sanitizeSvg(res.svg) }}
                  />
                  <div className="frame-grid-label">
                    <span>{f.key}</span>
                    {f.custom && <span className="badge-custom-sm">C</span>}
                  </div>
                </button>
              );
            })}
            {!filteredFrames.length && <p className="dim pad">검색된 프레임이 없습니다.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
