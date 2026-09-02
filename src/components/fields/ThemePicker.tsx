import { useMemo, useState } from "react";
import { THEMES_REGISTRY } from "../../engine/boot";
import { checkThemeContrast, isDarkTheme, resolveThemeColors } from "../../lib/design";
import { useDesignStore } from "../../lib/designStore";

export function ThemePicker({
  value,
  onChange,
  label = "테마",
  hint,
  onOpenDesignPanel,
}: {
  value?: string;
  onChange: (t: string) => void;
  label?: string;
  hint?: string;
  onOpenDesignPanel?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "default" | "custom" | "dark" | "light">("all");
  const [q, setQ] = useState("");
  const { library } = useDesignStore();

  const currentKey = value || "midnight";
  const currentColors = resolveThemeColors(currentKey);
  const currentDef = THEMES_REGISTRY[currentKey];

  const allThemes = useMemo(() => {
    const list: { key: string; label: string; custom: boolean; dark: boolean }[] = [];
    const seen = new Set<string>();

    for (const [k, def] of Object.entries(THEMES_REGISTRY)) {
      seen.add(k);
      const custom = !!def.custom || !!library.themes[k];
      const dark = isDarkTheme(def);
      list.push({ key: k, label: def.label || k, custom, dark });
    }

    for (const [k, def] of Object.entries(library.themes)) {
      if (!seen.has(k)) {
        list.push({ key: k, label: def.label || k, custom: true, dark: isDarkTheme(def) });
      }
    }

    return list;
  }, [library.themes]);

  const filteredThemes = useMemo(() => {
    return allThemes.filter((t) => {
      if (filter === "default" && t.custom) return false;
      if (filter === "custom" && !t.custom) return false;
      if (filter === "dark" && !t.dark) return false;
      if (filter === "light" && t.dark) return false;
      if (q.trim()) {
        const query = q.toLowerCase();
        return t.key.toLowerCase().includes(query) || t.label.toLowerCase().includes(query);
      }
      return true;
    });
  }, [allThemes, filter, q]);

  return (
    <div className="field theme-picker-wrap">
      <label>{label}</label>
      <div className="theme-trigger-row">
        <button
          type="button"
          className="theme-chip-trigger"
          onClick={() => setOpen((o) => !o)}
          title="테마 선택"
        >
          <div className="theme-mini-swatch">
            <span style={{ backgroundColor: currentColors.bg }} />
            <span style={{ backgroundColor: currentColors.bg2 }} />
            <span style={{ backgroundColor: currentColors.accent }} />
            <span style={{ backgroundColor: currentColors.accent2 }} />
            <span style={{ backgroundColor: currentColors.ink }} />
          </div>
          <span className="theme-name-text">
            <strong>{currentKey}</strong>
            <span className="dim">
              {" "}
              — {currentDef?.label.split("—")[0] || currentDef?.label || "기본"}
            </span>
          </span>
          {currentDef?.custom && <span className="badge-custom">커스텀</span>}
          <span className="caret">{open ? "▴" : "▾"}</span>
        </button>
      </div>
      {hint && <p className="hint">{hint}</p>}

      {open && (
        <div className="picker theme-popover">
          <div className="theme-popover-head">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="테마 검색 (이름·영문 키)..."
            />
            <div className="tab-pills">
              <button
                type="button"
                className={filter === "all" ? "on" : ""}
                onClick={() => setFilter("all")}
              >
                전체
              </button>
              <button
                type="button"
                className={filter === "default" ? "on" : ""}
                onClick={() => setFilter("default")}
              >
                기본
              </button>
              <button
                type="button"
                className={filter === "custom" ? "on" : ""}
                onClick={() => setFilter("custom")}
              >
                커스텀
              </button>
              <button
                type="button"
                className={filter === "dark" ? "on" : ""}
                onClick={() => setFilter("dark")}
              >
                다크
              </button>
              <button
                type="button"
                className={filter === "light" ? "on" : ""}
                onClick={() => setFilter("light")}
              >
                라이트
              </button>
            </div>
          </div>

          <div className="theme-cards-grid">
            {filteredThemes.map((t) => {
              const colors = resolveThemeColors(t.key);
              const contrast = checkThemeContrast(colors);
              const isSelected = t.key === currentKey;
              return (
                <button
                  key={t.key}
                  type="button"
                  className={`theme-card-item ${isSelected ? "on" : ""}`}
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: isSelected
                      ? colors.accent
                      : colors.panelLine || colors.line || colors.dim,
                    color: colors.ink,
                  }}
                  onClick={() => {
                    onChange(t.key);
                    setOpen(false);
                  }}
                >
                  <div className="theme-card-top">
                    <strong>{t.key}</strong>
                    {t.custom && <span className="badge-custom">커스텀</span>}
                    <span className="theme-contrast-badge" title="WCAG AA 대비율 검사">
                      {contrast.ok ? "AA 통과" : `${contrast.score}%`}
                    </span>
                  </div>
                  <p className="theme-card-desc" style={{ color: colors.ink2 }}>
                    {t.label}
                  </p>
                  <div className="theme-card-palette">
                    <span style={{ backgroundColor: colors.bg2 }} title="bg2" />
                    <span style={{ backgroundColor: colors.accent }} title="accent" />
                    <span style={{ backgroundColor: colors.accent2 }} title="accent2" />
                    <span style={{ backgroundColor: colors.good }} title="good" />
                    <span style={{ backgroundColor: colors.warn }} title="warn" />
                    <span style={{ backgroundColor: colors.bad }} title="bad" />
                    <span style={{ backgroundColor: colors.ink }} title="ink" />
                  </div>
                </button>
              );
            })}
            {!filteredThemes.length && <p className="dim pad">검색된 테마가 없습니다.</p>}
          </div>

          {onOpenDesignPanel && (
            <div className="theme-popover-foot">
              <button
                type="button"
                className="secondary small"
                onClick={() => {
                  setOpen(false);
                  onOpenDesignPanel();
                }}
              >
                ＋ 새 테마 만들기 / 디자인 스튜디오 열기
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
