/** 스키마 한 줄을 입력 위젯 하나로 그린다. 폼 전체가 이걸 재귀로 쓴다. */
import type { Field } from "../../engine/schema";
import type { SceneItem } from "../../engine/types";
import { setField } from "../../lib/spec";
import { IconPicker } from "./IconPicker";
import { ItemsEditor } from "./ItemsEditor";
import { ChartEditor } from "./ChartEditor";
import { ThemePicker } from "./ThemePicker";
import { DecorEditor } from "./DecorEditor";
import { ArtPicker } from "./ArtPicker";
import { MarkPicker } from "./MarkPicker";
import { FramePicker } from "./FramePicker";
type Obj = Record<string, unknown>;

export function FieldRenderer({
  field,
  obj,
  onPatch,
  theme = "midnight",
  max,
}: {
  field: Field;
  obj: Obj;
  /** key 하나를 갈아끼운 새 객체를 돌려준다 */
  onPatch: (next: Obj) => void;
  /** 문서 테마 — 픽커 미리보기 색. 씬 객체에는 theme 이 없어 위에서 내려받는다 */
  theme?: string;
  /** 패턴의 밀도 상한 — 항목 배열이 자기 max 가 없을 때 쓴다 */
  max?: number | null;
}) {
  const set = (v: unknown) => onPatch(setField(obj, field.key, v));
  const v = obj[field.key];

  if (field.key === "decor") {
    return (
      <DecorEditor
        label={field.label}
        value={v as string | string[] | false | undefined}
        onChange={set}
        decorLevel={obj.decorLevel as 0 | 1 | 2 | undefined}
        onChangeLevel={(lvl) => onPatch(setField(obj, "decorLevel", lvl))}
        theme={theme}
        hint={field.hint}
      />
    );
  }
  if (field.key === "art" || field.key === "screen.art") {
    return (
      <ArtPicker
        label={field.label}
        value={v as string | undefined}
        onChange={set}
        theme={theme}
        hint={field.hint}
      />
    );
  }
  if (field.key === "mark") {
    return (
      <MarkPicker
        label={field.label}
        value={v as string | undefined}
        onChange={set}
        theme={theme}
        hint={field.hint}
      />
    );
  }
  if (field.key === "frame") {
    return (
      <FramePicker
        label={field.label}
        value={v as string | undefined}
        onChange={set}
        theme={theme}
        hint={field.hint}
      />
    );
  }
  if (field.key === "theme") {
    return (
      <ThemePicker
        label={field.label}
        value={v as string | undefined}
        onChange={(t) => set(t)}
        hint={field.hint}
      />
    );
  }

  switch (field.k) {
    case "text":
      return (
        <div className="field">
          <Label f={field} />
          <input
            value={v === undefined ? "" : String(v)}
            onChange={(e) => set(field.numeric ? numOrText(e.target.value) : e.target.value)}
          />
          <Hint f={field} />
        </div>
      );
    case "multiline":
      return (
        <div className="field wide">
          <Label f={field} />
          <textarea
            rows={field.rows ?? 3}
            value={(v as string) ?? ""}
            onChange={(e) => set(e.target.value)}
          />
          <Hint f={field} />
        </div>
      );

    case "number":
      return (
        <div className="field">
          <Label f={field} />
          <input
            type="number"
            step={field.step ?? 1}
            placeholder={field.ph}
            value={v === undefined ? "" : String(v)}
            onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))}
          />
          <Hint f={field} />
        </div>
      );

    case "bool":
      return (
        <div className="field check">
          <label>
            <input
              type="checkbox"
              checked={v === undefined ? !!field.def : !!v}
              onChange={(e) => set(e.target.checked === !!field.def ? undefined : e.target.checked)}
            />
            {field.label}
            {field.def !== undefined && (
              <span className="dim"> (기본 {field.def ? "켬" : "끔"})</span>
            )}
          </label>
          <Hint f={field} />
        </div>
      );

    case "select": {
      const opts = field.opts();
      return (
        <div className="field">
          <Label f={field} />
          <select value={(v as string) ?? ""} onChange={(e) => set(e.target.value)}>
            <option value="">— 없음</option>
            {Object.entries(opts).map(([k, label]) => (
              <option key={k} value={k}>
                {label.includes("—") ? label : `${k} — ${label}`}
              </option>
            ))}
          </select>
          <Hint f={field} />
        </div>
      );
    }

    case "icon":
      return (
        <>
          <IconPicker label={field.label} value={v as string} onChange={set} />
          <Hint f={field} />
        </>
      );

    case "strings": {
      const list = Array.isArray(v) ? (v as string[]) : typeof v === "string" ? [v] : [];
      return (
        <div className="field wide">
          <Label f={field} />
          <textarea
            rows={Math.min(8, Math.max(3, list.length + 1))}
            placeholder={field.ph}
            value={list.join("\n")}
            onChange={(e) => {
              const lines = e.target.value.split("\n").filter((s) => s.trim() !== "");
              set(lines.length ? lines : undefined);
            }}
          />
          <Hint f={field} />
        </div>
      );
    }

    case "items":
      return (
        <ItemsEditor
          value={v as SceneItem[] | undefined}
          onChange={set}
          label={field.label}
          hint={field.hint}
          req={field.req}
          max={field.max === undefined ? max : field.max}
          primary={field.primary}
          fields={field.fields}
        />
      );

    case "group": {
      /* 스펙은 항목 하나짜리 객체(target·center·answer)를 문자열로도 받는다 — 첫 필드(라벨)로 읽는다 */
      const g: Obj = typeof v === "string" ? { [field.fields[0].key]: v } : ((v as Obj) ?? {});
      return (
        <fieldset className="group">
          <legend>
            {field.label}
            {field.req && <span className="req">필수</span>}
          </legend>
          {field.hint && <p className="hint">{field.hint}</p>}
          <div className="grid">
            {field.fields.map((f) => (
              <FieldRenderer
                key={f.key}
                field={f}
                obj={g}
                onPatch={(next) => set(Object.keys(next).length ? next : undefined)}
                theme={theme}
                max={max}
              />
            ))}
          </div>
        </fieldset>
      );
    }

    case "chartdata":
      return (
        <ChartEditor
          chart={(obj.chart as string) ?? "bar"}
          data={v as Obj | undefined}
          options={obj.options as Obj | undefined}
          onData={set}
          onOptions={(o) => onPatch(setField(setField(obj, field.key, v), "options", o))}
        />
      );
  }
}

/** "3" 은 숫자, "PART 3" 은 글자 — 엔진이 typeof 로 가르므로 여기서 미리 가른다 */
function numOrText(s: string): number | string {
  const n = Number(s);
  return s.trim() !== "" && Number.isFinite(n) ? n : s;
}

function Label({ f }: { f: Field }) {
  return (
    <label>
      {f.label}
      {"req" in f && f.req && <span className="req">필수</span>}
    </label>
  );
}

function Hint({ f }: { f: Field }) {
  return f.hint ? <p className="hint">{f.hint}</p> : null;
}
