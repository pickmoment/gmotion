/**
 * 항목 배열 편집기. 스펙은 문자열과 객체를 둘 다 받으므로, 라벨만 있으면
 * 문자열로 되돌려 스펙을 깨끗하게 유지한다.
 */
import { useState } from "react";
import type { ItemFieldKey } from "../../engine/schema";
import type { Item, SceneItem } from "../../engine/types";
import { IconPicker, IconGlyph } from "./IconPicker";
import { ArtPicker } from "./ArtPicker";
const LABELS: Record<ItemFieldKey, string> = {
  label: "라벨",
  text: "글",
  when: "시점",
  icon: "아이콘",
  note: "노트",
  value: "값",
  unit: "단위",
  prefix: "접두",
  dec: "소수 자리",
  tone: "톤",
  badge: "배지",
  ribbon: "리본",
  art: "일러스트",
  spark: "미니 추이선",
  say: "대사(say)",
  hub: "중심(hub)",
  ring: "궤도",
  emphasis: "강조",
  scale: "배율",
  values: "값들",
  highlight: "주인공 열",
};

const TONES = ["", "good", "bad", "warn", "dim"];

function toObj(it: SceneItem, primary: ItemFieldKey): Item {
  return typeof it === "string" ? ({ [primary]: it } as Item) : { ...it };
}

/** 라벨(또는 primary)만 남았으면 문자열로 접는다. */
function compact(o: Item, primary: ItemFieldKey): SceneItem {
  const keys = Object.keys(o).filter((k) => o[k] !== undefined && o[k] !== "");
  if (keys.length === 1 && keys[0] === primary && typeof o[primary] === "string")
    return o[primary] as string;
  const out: Record<string, unknown> = {};
  keys.forEach((k) => (out[k] = o[k]));
  return out as Item;
}

export function ItemsEditor({
  value,
  onChange,
  label,
  hint,
  req,
  max,
  primary,
  fields,
}: {
  value?: SceneItem[];
  onChange: (v: SceneItem[] | undefined) => void;
  label: string;
  hint?: string;
  req?: boolean;
  max?: number | null;
  primary: ItemFieldKey;
  fields: ItemFieldKey[];
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [pickingIconIdx, setPickingIconIdx] = useState<number | null>(null);
  const [pickingArtIdx, setPickingArtIdx] = useState<number | null>(null);

  const list = value ?? [];

  const patch = (i: number, k: ItemFieldKey, v: unknown) => {
    const next = list.slice();
    const o = toObj(next[i], primary);
    if (v === undefined || v === "" || v === false) delete o[k];
    else (o as Record<string, unknown>)[k] = v;
    next[i] = compact(o, primary);
    onChange(next);
  };

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = list.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpenIdx(openIdx === i ? j : openIdx === j ? i : openIdx);
  };

  const over = max != null && list.length > max;

  return (
    <div className="field items-field">
      <label>
        {label}
        {req && <span className="req">필수</span>}
        <span className="count">
          {list.length}
          {max != null ? ` / ${max}` : ""}
        </span>
      </label>
      {hint && <p className="hint">{hint}</p>}
      {over && <p className="warn-inline">상한 {max}개를 넘었다 — 씬을 나눈다</p>}

      <div className="items">
        {list.map((it, i) => {
          const o = toObj(it, primary);
          const isOpen = openIdx === i;
          const extra = fields.filter((f) => o[f] !== undefined && o[f] !== "").length;
          return (
            <div key={i} className={`item${isOpen ? " open" : ""}`}>
              <div className="item-head">
                <span className="idx">{i}</span>

                {fields.includes("icon") && (
                  <button
                    type="button"
                    className={`item-head-icon-btn ${o.icon ? "has-val" : ""}`}
                    onClick={() => setPickingIconIdx(pickingIconIdx === i ? null : i)}
                    title={o.icon ? `아이콘: ${o.icon} (클릭하여 변경)` : "아이콘 선택"}
                  >
                    {o.icon ? (
                      <IconGlyph name={o.icon as string} size={16} />
                    ) : (
                      <span className="dim">＋icon</span>
                    )}
                  </button>
                )}

                {fields.includes("art") && (
                  <button
                    type="button"
                    className={`item-head-art-btn ${o.art ? "has-val" : ""}`}
                    onClick={() => setPickingArtIdx(pickingArtIdx === i ? null : i)}
                    title={o.art ? `일러스트: ${o.art} (클릭하여 변경)` : "일러스트 선택"}
                  >
                    {o.art ? `🎨 ${o.art}` : <span className="dim">＋art</span>}
                  </button>
                )}

                <input
                  value={(o[primary] as string) ?? ""}
                  placeholder={LABELS[primary]}
                  onChange={(e) => patch(i, primary, e.target.value)}
                />

                {/* Mini visual badges */}
                {o.tone && <span className={`item-chip-tone tone-${o.tone}`}>{o.tone}</span>}
                {o.badge && <span className="item-chip-badge">{o.badge}</span>}
                {o.ribbon && <span className="item-chip-ribbon">{o.ribbon}</span>}

                <button
                  type="button"
                  className="ghost"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  title="세부 필드"
                >
                  {extra ? `⋯${extra}` : "⋯"}
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  title="위로"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => move(i, 1)}
                  disabled={i === list.length - 1}
                  title="아래로"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="ghost danger"
                  title="삭제"
                  onClick={() => {
                    const next = list.slice();
                    next.splice(i, 1);
                    onChange(next.length ? next : undefined);
                    setOpenIdx(null);
                    setPickingIconIdx(null);
                    setPickingArtIdx(null);
                  }}
                >
                  ×
                </button>
              </div>

              {/* Inline Quick Icon Popover */}
              {pickingIconIdx === i && (
                <div className="item-inline-popover">
                  <IconPicker
                    label="아이콘 선택"
                    value={o.icon as string}
                    onChange={(v) => {
                      patch(i, "icon", v);
                      setPickingIconIdx(null);
                    }}
                  />
                </div>
              )}

              {/* Inline Quick Art Popover */}
              {pickingArtIdx === i && (
                <div className="item-inline-popover">
                  <ArtPicker
                    label="일러스트 선택"
                    value={o.art as string}
                    onChange={(v) => {
                      patch(i, "art", v);
                      setPickingArtIdx(null);
                    }}
                  />
                </div>
              )}
              {isOpen && (
                <div className="item-body">
                  {fields.map((f) => {
                    if (f === "icon" || f === "art") {
                      return f === "icon" ? (
                        <IconPicker
                          key={f}
                          label={LABELS[f]}
                          value={o.icon as string}
                          onChange={(v) => patch(i, "icon", v)}
                        />
                      ) : (
                        <ArtPicker
                          key={f}
                          label={LABELS[f]}
                          value={o.art as string}
                          onChange={(v) => patch(i, "art", v)}
                        />
                      );
                    }
                    if (f === "hub" || f === "emphasis" || f === "highlight") {
                      return (
                        <div className="field check" key={f}>
                          <label>
                            <input
                              type="checkbox"
                              checked={!!o[f]}
                              onChange={(e) => patch(i, f, e.target.checked)}
                            />
                            {LABELS[f]}
                          </label>
                        </div>
                      );
                    }
                    if (f === "tone") {
                      return (
                        <div className="field" key={f}>
                          <label>{LABELS[f]}</label>
                          <select
                            value={(o.tone as string) ?? ""}
                            onChange={(e) => patch(i, "tone", e.target.value)}
                          >
                            {TONES.map((t) => (
                              <option key={t} value={t}>
                                {t || "— 없음"}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    }
                    if (f === "value" || f === "dec" || f === "ring" || f === "scale") {
                      return (
                        <div className="field" key={f}>
                          <label>{LABELS[f]}</label>
                          <input
                            type="number"
                            step={f === "scale" ? 0.05 : f === "value" ? "any" : 1}
                            value={o[f] === undefined ? "" : String(o[f])}
                            onChange={(e) =>
                              patch(
                                i,
                                f,
                                e.target.value === "" ? undefined : Number(e.target.value),
                              )
                            }
                          />
                        </div>
                      );
                    }
                    if (f === "spark") {
                      return (
                        <div className="field" key={f}>
                          <label>{LABELS[f]}</label>
                          <input
                            value={Array.isArray(o.spark) ? (o.spark as number[]).join(", ") : ""}
                            placeholder="3, 5, 4, 8"
                            onChange={(e) => {
                              const nums = e.target.value
                                .split(/[,\s]+/)
                                .filter(Boolean)
                                .map(Number)
                                .filter((n) => !Number.isNaN(n));
                              patch(i, "spark", nums.length ? nums : undefined);
                            }}
                          />
                        </div>
                      );
                    }
                    if (f === "values") {
                      /* featureMatrix 행의 값 — O/✓/true → true, X/✕/false/- → false, 나머지는 글자 그대로 */
                      const vals = Array.isArray(o.values) ? (o.values as unknown[]) : [];
                      const show = vals
                        .map((v) => (v === true ? "O" : v === false ? "X" : String(v)))
                        .join(", ");
                      return (
                        <div className="field wide" key={f}>
                          <label>{LABELS[f]}</label>
                          <input
                            defaultValue={show}
                            placeholder="O, X, 6주  (열 순서대로)"
                            onBlur={(e) => {
                              const toks = e.target.value
                                .split(",")
                                .map((s) => s.trim())
                                .filter(Boolean)
                                .map((s) =>
                                  /^(o|✓|true)$/i.test(s)
                                    ? true
                                    : /^(x|✕|false|-)$/i.test(s)
                                      ? false
                                      : s,
                                );
                              patch(i, "values", toks.length ? toks : undefined);
                            }}
                          />
                        </div>
                      );
                    }
                    if (f === "say" || f === "note") {
                      return (
                        <div className="field wide" key={f}>
                          <label>{LABELS[f]}</label>
                          <textarea
                            rows={2}
                            value={(o[f] as string) ?? ""}
                            onChange={(e) => patch(i, f, e.target.value)}
                          />
                        </div>
                      );
                    }
                    return (
                      <div className="field" key={f}>
                        <label>{LABELS[f]}</label>
                        <input
                          value={(o[f] as string) ?? ""}
                          onChange={(e) => patch(i, f, e.target.value)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="add"
        onClick={() => {
          onChange([...list, ""]);
          setOpenIdx(null);
        }}
      >
        + {label} 추가
      </button>
    </div>
  );
}
