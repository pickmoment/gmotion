/** 픽토그램 191종 고르기. 한글 별칭으로도 찾는다 — 이름을 외워 쓰지 않게. */
import { useMemo, useState } from "react";
import { ICONS } from "../../engine/boot";

export function IconGlyph({ name, size = 20 }: { name: string; size?: number }) {
  const key = ICONS.resolve(name) ?? name;
  const d = ICONS.path(key);
  if (!d) return <span className="glyph-missing" title={`없는 아이콘: ${name}`}>?</span>;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
         strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function IconPicker({
  value,
  onChange,
  label,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const hits = useMemo(() => (open ? ICONS.search(q) : []), [open, q]);
  const resolved = value ? ICONS.resolve(value) : null;

  return (
    <div className="field">
      <label>{label}</label>
      <div className="icon-row">
        <button type="button" className="icon-chip" title="픽토그램 고르기"
                onClick={() => setOpen((o) => !o)}>
          {value ? <IconGlyph name={value} /> : <span className="dim">＋</span>}
        </button>
        <input
          value={value ?? ""}
          placeholder="아이콘 이름 (한글 가능)"
          onChange={(e) => onChange(e.target.value || undefined)}
        />
        {value && (
          <button type="button" className="ghost" onClick={() => onChange(undefined)} title="지우기">
            ×
          </button>
        )}
      </div>
      {value && !resolved && <p className="warn-inline">그런 픽토그램이 없다 — 검색해서 고른다</p>}
      {open && (
        <div className="picker">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`검색 — 전체 ${ICONS.count}종`} />
          <div className="picker-grid">
            {hits.map((k) => (
              <button
                key={k}
                type="button"
                className={k === resolved ? "on" : ""}
                title={[k, ...ICONS.aliases(k).slice(0, 5)].join(" · ")}
                onClick={() => {
                  onChange(k);
                  setOpen(false);
                }}
              >
                <IconGlyph name={k} />
                <span>{k}</span>
              </button>
            ))}
            {!hits.length && <p className="dim pad">없다. 다른 말로 찾아본다.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
