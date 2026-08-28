/**
 * 스킨 선택 — 테마가 색을 정하고, 스킨이 재질(표면·선·타이포의 모양)을 정한다.
 *
 * 미리보기는 실제 산출물이 쓰는 프리미티브 토큰을 그대로 얹어서 그린다 — 카드
 * 규칙과 같은 선언(`var(--surf-fill)` `var(--r-lg)` …)을 쓰므로, 여기서 보이는
 * 모양이 빌드 결과와 어긋나지 않는다.
 */
import { useMemo, useState } from "react";
import type { SkinDefinition } from "../../engine/types";
import { listSkins, skinPreviewVars } from "../../lib/design";
import { useDesignStore } from "../../lib/designStore";

/** 스킨 한 칸의 미리보기 — 카드 두 장과 연결선. 실제 규칙과 같은 토큰을 읽는다. */
function SkinSwatch({
  skin,
  theme,
  size = "sm",
}: {
  skin: string | SkinDefinition;
  theme: string;
  size?: "sm" | "md";
}) {
  const vars = useMemo(() => skinPreviewVars(skin, theme), [skin, theme]);
  return (
    <div className={`skin-swatch skin-swatch-${size}`} style={vars as React.CSSProperties}>
      <div className="skin-swatch-bg" />
      <div className="skin-swatch-card">
        <i />
        <b />
      </div>
      <div className="skin-swatch-card skin-swatch-card-2">
        <i />
        <b />
      </div>
      <svg className="skin-swatch-link" viewBox="0 0 100 40" aria-hidden="true">
        <path d="M18 20 Q50 8 82 20" />
      </svg>
    </div>
  );
}

export function SkinPicker({
  value,
  theme = "midnight",
  onChange,
  label = "스킨",
  hint,
  onOpenDesignPanel,
}: {
  value?: string | SkinDefinition;
  theme?: string;
  onChange: (s: string | undefined) => void;
  label?: string;
  hint?: string;
  onOpenDesignPanel?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { library } = useDesignStore();

  /* 스펙에 인라인된 커스텀 정의는 이름으로 고를 수 있는 대상이 아니다 — 그대로 보여만 준다 */
  const inline = value !== undefined && typeof value !== "string" ? value : null;
  const currentKey = typeof value === "string" && value ? value : "";
  const skins = useMemo(() => listSkins(), [library.skins]);
  const current = skins.find((s) => s.key === currentKey);

  return (
    <div className="field skin-picker-wrap">
      <label>{label}</label>
      <div className="theme-trigger-row">
        <button
          type="button"
          className="theme-chip-trigger"
          onClick={() => setOpen((o) => !o)}
          title="스킨 선택"
          disabled={!!inline}
        >
          <SkinSwatch skin={inline || currentKey || "glass"} theme={theme} />
          <span className="theme-name-text">
            <strong>{inline ? inline.name || "커스텀" : currentKey || "기본"}</strong>
            <span className="dim">
              {" — "}
              {inline
                ? `스펙에 인라인된 정의${inline.extends ? ` (${inline.extends} 기반)` : ""}`
                : current
                  ? current.label.split("—")[0].trim()
                  : "테마가 정한 스킨"}
            </span>
          </span>
          {current?.custom && <span className="badge-custom">커스텀</span>}
          {!inline && <span className="caret">{open ? "▴" : "▾"}</span>}
        </button>
      </div>
      {inline ? (
        <p className="hint">
          스펙의 <code>skin</code> 에 정의가 직접 들어 있다 — 파일 한 장으로 모습이 재현된다. 이름으로
          바꾸려면 JSON 에서 <code>skin</code> 을 문자열로 고친다.
        </p>
      ) : (
        hint && <p className="hint">{hint}</p>
      )}

      {open && !inline && (
        <div className="picker theme-popover skin-popover">
          <div className="skin-cards-grid">
            <button
              type="button"
              className={`skin-card-item ${currentKey === "" ? "on" : ""}`}
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              <SkinSwatch skin="glass" theme={theme} size="md" />
              <span className="skin-card-name">기본</span>
              <span className="skin-card-desc">테마가 정한 스킨을 따른다</span>
            </button>
            {skins.map((s) => (
              <button
                key={s.key}
                type="button"
                className={`skin-card-item ${s.key === currentKey ? "on" : ""}`}
                onClick={() => {
                  onChange(s.key);
                  setOpen(false);
                }}
              >
                <SkinSwatch skin={s.key} theme={theme} size="md" />
                <span className="skin-card-name">
                  {s.key}
                  {s.custom && <span className="badge-custom">커스텀</span>}
                  {s.dark && <span className="badge-dark" title="어두운 테마 전용">다크</span>}
                </span>
                <span className="skin-card-desc">{s.label.split("—").slice(1).join("—").trim()}</span>
              </button>
            ))}
          </div>
          <div className="theme-popover-foot">
            <span className="hint">
              테마는 색, 스킨은 재질 — 둘은 곱해서 쓴다
            </span>
            {onOpenDesignPanel && (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenDesignPanel();
                }}
              >
                스킨 만들기 →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
