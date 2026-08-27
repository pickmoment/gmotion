/**
 * 차트 데이터·옵션 편집기.
 *
 * 데이터 형태는 차트가 정한다(references/charts.md) — 차트 종류에서 형태를 끌어내
 * 맞는 표를 그리고, 형태를 벗어나는 경우를 위해 JSON 직접 편집을 남겨 둔다.
 */
import { useState } from "react";
import { GG } from "../../engine/boot";

type Shape = "items" | "series" | "heatmap" | "scatter";

const SHAPE: Record<string, Shape> = {
  bar: "items", barH: "items", donut: "items", area: "items", isotype: "items",
  gauge: "items", bullet: "items", sparkline: "items", waterfall: "items",
  line: "series", barGroup: "series", barStack: "series", radar: "series",
  slope: "series", dumbbell: "series",
  heatmap: "heatmap",
  scatter: "scatter",
};

/** 옵션은 차트마다 받는 게 다르다 — 해당 차트가 실제로 쓰는 것만 보여준다. */
const OPTS: Record<string, { key: string; label: string; type: "num" | "str" | "bool" | "tone" }[]> = {
  _all: [
    { key: "unit", label: "단위", type: "str" },
    { key: "dec", label: "소수 자릿수", type: "num" },
    { key: "categorical", label: "항목마다 다른 색", type: "bool" },
  ],
  bar: [{ key: "emphasis", label: "강조할 인덱스", type: "num" }, { key: "labels", label: "값 라벨", type: "bool" }],
  barH: [{ key: "emphasis", label: "강조할 인덱스", type: "num" }, { key: "sort", label: "큰 값부터 정렬", type: "bool" }],
  slope: [{ key: "emphasis", label: "강조할 인덱스", type: "num" }],
  line: [{ key: "labels", label: "값 라벨", type: "bool" }],
  gauge: [
    { key: "max", label: "축 상한", type: "num" },
    { key: "tone", label: "톤", type: "tone" },
    { key: "center", label: "가운데 글자", type: "str" },
    { key: "centerLabel", label: "가운데 라벨", type: "str" },
  ],
  donut: [{ key: "center", label: "가운데 글자", type: "str" }, { key: "centerLabel", label: "가운데 라벨", type: "str" }],
  radar: [{ key: "max", label: "축 상한", type: "num" }],
  bullet: [{ key: "max", label: "축 상한", type: "num" }, { key: "sharedScale", label: "모든 행이 같은 축", type: "bool" }],
  barStack: [{ key: "horizontal", label: "가로로 눕힘", type: "bool" }],
  isotype: [{ key: "icon", label: "칸 픽토그램", type: "str" }, { key: "cols", label: "한 줄 칸 수", type: "num" }],
  heatmap: [{ key: "values", label: "셀 안 숫자", type: "bool" }],
  waterfall: [],
};

type Data = Record<string, unknown>;

const nums = (s: string) =>
  s.split(/[,\s]+/).filter(Boolean).map(Number).filter((n) => !Number.isNaN(n));

export function ChartEditor({
  chart,
  data,
  options,
  onData,
  onOptions,
}: {
  chart: string;
  data?: Data;
  options?: Data;
  onData: (v: Data | undefined) => void;
  onOptions: (v: Data | undefined) => void;
}) {
  const shape = SHAPE[chart] ?? "items";
  const [raw, setRaw] = useState(false);
  const [rawText, setRawText] = useState("");
  const [rawErr, setRawErr] = useState("");

  const d: Data = data ?? {};
  const o: Data = options ?? {};

  const setOpt = (k: string, v: unknown) => {
    const next = { ...o };
    if (v === undefined || v === "" || v === null) delete next[k];
    else next[k] = v;
    onOptions(Object.keys(next).length ? next : undefined);
  };

  const optFields = [...(OPTS[chart] ?? []), ...OPTS._all];

  return (
    <div className="field chart-field">
      <label>
        데이터
        <span className="req">필수</span>
        <button type="button" className="ghost right"
                onClick={() => {
                  if (!raw) setRawText(JSON.stringify(d, null, 2));
                  setRaw(!raw);
                  setRawErr("");
                }}>
          {raw ? "표로" : "JSON 직접"}
        </button>
      </label>
      <p className="hint">{GG.chartUse(chart)}</p>

      {raw ? (
        <>
          <textarea
            className="mono"
            rows={10}
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              try {
                onData(JSON.parse(e.target.value) as Data);
                setRawErr("");
              } catch (err) {
                setRawErr((err as Error).message);
              }
            }}
          />
          {rawErr && <p className="warn-inline">{rawErr}</p>}
        </>
      ) : shape === "items" ? (
        <ItemsTable
          items={(d.items as unknown[]) ?? []}
          bullet={chart === "bullet"}
          onChange={(items) => onData(items.length ? { ...d, items } : undefined)}
        />
      ) : shape === "series" ? (
        <SeriesTable
          categories={(d.categories as string[]) ?? []}
          series={(d.series as { name?: string; values?: number[] }[]) ?? []}
          onChange={(categories, series) => onData({ ...d, categories, series })}
        />
      ) : shape === "heatmap" ? (
        <HeatTable
          categories={(d.categories as string[]) ?? []}
          rows={(d.rows as string[]) ?? []}
          grid={(d.grid as number[][]) ?? []}
          onChange={(categories, rows, grid) => onData({ ...d, categories, rows, grid })}
        />
      ) : (
        <ScatterTable
          points={(d.points as Data[]) ?? []}
          onChange={(points) => onData(points.length ? { ...d, points } : undefined)}
        />
      )}

      <label className="sub-label">옵션</label>
      <div className="opt-grid">
        {optFields.map((f) => (
          <div className="field" key={f.key}>
            <label>{f.label}</label>
            {f.type === "bool" ? (
              <input type="checkbox" checked={!!o[f.key]} onChange={(e) => setOpt(f.key, e.target.checked || undefined)} />
            ) : f.type === "tone" ? (
              <select value={(o[f.key] as string) ?? ""} onChange={(e) => setOpt(f.key, e.target.value)}>
                <option value="">— 없음</option>
                <option value="good">good</option>
                <option value="warn">warn</option>
                <option value="bad">bad</option>
              </select>
            ) : (
              <input
                type={f.type === "num" ? "number" : "text"}
                value={o[f.key] === undefined ? "" : String(o[f.key])}
                onChange={(e) =>
                  setOpt(f.key, e.target.value === "" ? undefined : f.type === "num" ? Number(e.target.value) : e.target.value)
                }
              />
            )}
          </div>
        ))}
      </div>
      {chart === "waterfall" && (
        <div className="field">
          <label>합계로 취급할 인덱스</label>
          <input
            value={Array.isArray(o.totals) ? (o.totals as number[]).join(", ") : ""}
            placeholder="0, 4"
            onChange={(e) => setOpt("totals", nums(e.target.value).length ? nums(e.target.value) : undefined)}
          />
        </div>
      )}
    </div>
  );
}

function ItemsTable({
  items,
  bullet,
  onChange,
}: {
  items: unknown[];
  bullet: boolean;
  onChange: (v: unknown[]) => void;
}) {
  const norm = (it: unknown): Data =>
    typeof it === "number" ? { value: it } : { ...(it as Data) };
  const patch = (i: number, k: string, v: unknown) => {
    const next = items.slice();
    const o = norm(next[i]);
    if (v === undefined || v === "") delete o[k];
    else o[k] = v;
    next[i] = o;
    onChange(next);
  };
  return (
    <div className="table">
      <div className="tr th">
        <span>라벨</span>
        <span>값</span>
        {bullet && <span>목표</span>}
        <span />
      </div>
      {items.map((it, i) => {
        const o = norm(it);
        return (
          <div className="tr" key={i}>
            <input value={(o.label as string) ?? ""} onChange={(e) => patch(i, "label", e.target.value)} />
            <input type="number" step="any" value={o.value === undefined ? "" : String(o.value)}
                   onChange={(e) => patch(i, "value", e.target.value === "" ? undefined : Number(e.target.value))} />
            {bullet && (
              <input type="number" step="any" value={o.target === undefined ? "" : String(o.target)}
                     onChange={(e) => patch(i, "target", e.target.value === "" ? undefined : Number(e.target.value))} />
            )}
            <button type="button" className="ghost danger"
                    onClick={() => onChange(items.filter((_, j) => j !== i))}>×</button>
          </div>
        );
      })}
      <button type="button" className="add" onClick={() => onChange([...items, { label: "", value: 0 }])}>
        + 행 추가
      </button>
    </div>
  );
}

function SeriesTable({
  categories,
  series,
  onChange,
}: {
  categories: string[];
  series: { name?: string; values?: number[] }[];
  onChange: (c: string[], s: { name?: string; values?: number[] }[]) => void;
}) {
  return (
    <div className="table">
      <div className="field">
        <label>가로축 항목</label>
        <input
          value={categories.join(", ")}
          placeholder="1월, 2월, 3월"
          onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean), series)}
        />
      </div>
      {series.map((s, i) => (
        <div className="tr" key={i}>
          <input value={s.name ?? ""} placeholder="시리즈 이름"
                 onChange={(e) => {
                   const next = series.slice();
                   next[i] = { ...s, name: e.target.value };
                   onChange(categories, next);
                 }} />
          <input
            className="grow"
            value={(s.values ?? []).join(", ")}
            placeholder="820, 1100, 1340"
            onChange={(e) => {
              const next = series.slice();
              next[i] = { ...s, values: nums(e.target.value) };
              onChange(categories, next);
            }}
          />
          <button type="button" className="ghost danger"
                  onClick={() => onChange(categories, series.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button type="button" className="add"
              onClick={() => onChange(categories, [...series, { name: "", values: [] }])}>
        + 시리즈 추가
      </button>
      {series.length > 8 && <p className="warn-inline">색은 순환하지 않는다 — 9번째 시리즈는 만들 수 없다</p>}
    </div>
  );
}

function HeatTable({
  categories,
  rows,
  grid,
  onChange,
}: {
  categories: string[];
  rows: string[];
  grid: number[][];
  onChange: (c: string[], r: string[], g: number[][]) => void;
}) {
  return (
    <div className="table">
      <div className="field">
        <label>열(가로)</label>
        <input value={categories.join(", ")} placeholder="월, 화, 수"
               onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean), rows, grid)} />
      </div>
      <div className="field">
        <label>행(세로)</label>
        <input value={rows.join(", ")} placeholder="오전, 오후"
               onChange={(e) => onChange(categories, e.target.value.split(",").map((s) => s.trim()).filter(Boolean), grid)} />
      </div>
      {rows.map((r, i) => (
        <div className="tr" key={i}>
          <span className="row-label">{r}</span>
          <input className="grow" value={(grid[i] ?? []).join(", ")} placeholder="12, 18, 22"
                 onChange={(e) => {
                   const g = grid.slice();
                   g[i] = nums(e.target.value);
                   onChange(categories, rows, g);
                 }} />
        </div>
      ))}
    </div>
  );
}

function ScatterTable({ points, onChange }: { points: Data[]; onChange: (v: Data[]) => void }) {
  const patch = (i: number, k: string, v: unknown) => {
    const next = points.slice();
    const o = { ...next[i] };
    if (v === undefined || v === "") delete o[k];
    else o[k] = v;
    next[i] = o;
    onChange(next);
  };
  return (
    <div className="table">
      <div className="tr th">
        <span>x</span><span>y</span><span>크기</span><span>라벨</span><span>그룹</span><span />
      </div>
      {points.map((p, i) => (
        <div className="tr" key={i}>
          {(["x", "y", "size"] as const).map((k) => (
            <input key={k} type="number" step="any" value={p[k] === undefined ? "" : String(p[k])}
                   onChange={(e) => patch(i, k, e.target.value === "" ? undefined : Number(e.target.value))} />
          ))}
          <input value={(p.label as string) ?? ""} onChange={(e) => patch(i, "label", e.target.value)} />
          <input value={(p.group as string) ?? ""} onChange={(e) => patch(i, "group", e.target.value)} />
          <button type="button" className="ghost danger"
                  onClick={() => onChange(points.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button type="button" className="add" onClick={() => onChange([...points, { x: 0, y: 0 }])}>
        + 점 추가
      </button>
    </div>
  );
}
