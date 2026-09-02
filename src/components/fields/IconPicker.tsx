/** 픽토그램 191종 + 커스텀 아이콘 고르기. 한글 별칭으로도 찾는다. */
import { useMemo, useState } from "react";
import { ICONS } from "../../engine/boot";
import { ICON_CATEGORIES } from "../../lib/design";
import { useDesignStore } from "../../lib/designStore";

export function IconGlyph({ name, size = 20 }: { name: string; size?: number }) {
  const key = ICONS.resolve(name) ?? name;
  const d = ICONS.path(key);
  if (!d)
    return (
      <span className="glyph-missing" title={`없는 아이콘: ${name}`}>
        ?
      </span>
    );
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export function IconPicker({
  value,
  onChange,
  label = "아이콘 (icon)",
  hint,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  label?: string;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState("전체");
  const [q, setQ] = useState("");
  const { library } = useDesignStore();

  const resolved = value ? ICONS.resolve(value) : null;

  const categories = useMemo(() => {
    return ["전체", ...Object.keys(ICON_CATEGORIES), "커스텀"];
  }, []);

  const hits = useMemo(() => {
    if (!open) return [];
    let base = ICONS.search(q);

    if (cat === "커스텀") {
      const customKeys = Object.keys(library.icons);
      if (q.trim()) {
        const query = q.toLowerCase();
        return customKeys.filter(
          (k) =>
            k.toLowerCase().includes(query) ||
            library.icons[k].aliases.some((a) => a.toLowerCase().includes(query)),
        );
      }
      return customKeys;
    }

    if (cat !== "전체") {
      const catKeys = ICON_CATEGORIES[cat] || [];
      base = base.filter((k) => catKeys.includes(k));
    }

    return base;
  }, [open, q, cat, library.icons]);

  return (
    <div className="field icon-picker-wrap">
      <label>{label}</label>
      <div className="icon-row">
        <button
          type="button"
          className="icon-chip"
          title="픽토그램 고르기"
          onClick={() => setOpen((o) => !o)}
        >
          {value ? <IconGlyph name={value} /> : <span className="dim">＋</span>}
        </button>
        <input
          value={value ?? ""}
          placeholder="아이콘 이름 (한글 가능)"
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
      {value && !resolved && !ICONS.path(value) && (
        <p className="warn-inline">그런 픽토그램이 없다 — 검색해서 고른다</p>
      )}

      {open && (
        <div className="picker icon-popover">
          <div className="icon-popover-head">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`검색 — 전체 ${ICONS.count + Object.keys(library.icons).length}종`}
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

          <div className="picker-grid icon-thumb-grid">
            {hits.map((k) => {
              const aliases = ICONS.aliases(k);
              const isCustom = !!library.icons[k];
              return (
                <button
                  key={k}
                  type="button"
                  className={k === resolved || k === value ? "on" : ""}
                  title={[k, ...aliases.slice(0, 5)].join(" · ")}
                  onClick={() => {
                    onChange(k);
                    setOpen(false);
                  }}
                >
                  <IconGlyph name={k} />
                  <span>{k}</span>
                  {isCustom && <span className="badge-custom-sm">C</span>}
                </button>
              );
            })}
            {!hits.length && <p className="dim pad">없다. 다른 말로 찾아본다.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
