/** 문서 설정 — 루트 필드. 테마·화면비·에너지·폰트는 엔진 목록에서 그대로 읽는다. */
import { GG } from "../engine/boot";
import type { Spec } from "../engine/types";
import { setField } from "../lib/spec";
import { ThemePicker } from "./fields/ThemePicker";
import { SkinPicker } from "./fields/SkinPicker";
import { DecorEditor } from "./fields/DecorEditor";

const MODES: Record<string, string> = {
  autoplay: "autoplay — 열면 재생",
  loop: "loop — 반복",
  step: "step — 눌러서 넘김",
};

export function DocSettings({
  spec,
  onChange,
  onOpenDesign,
}: {
  spec: Spec;
  onChange: (s: Spec) => void;
  onOpenDesign?: () => void;
}) {
  const set = (k: string, v: unknown) => onChange(setField(spec as Record<string, unknown>, k, v) as unknown as Spec);
  const sel = (k: string, label: string, opts: Record<string, string>, hint?: string) => (
    <div className="field" key={k}>
      <label>{label}</label>
      <select value={(spec[k] as string) ?? ""} onChange={(e) => set(k, e.target.value)}>
        <option value="">— 기본</option>
        {Object.entries(opts).map(([v, l]) => (
          <option key={v} value={v}>
            {l.includes("—") ? l : `${v} — ${l}`}
          </option>
        ))}
      </select>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );

  return (
    <div className="pane-body">
      <div className="field wide">
        <label>제목</label>
        <input value={spec.title ?? ""} onChange={(e) => set("title", e.target.value)} />
        <p className="hint">&lt;title&gt; 과 접근성 라벨에 쓰인다</p>
      </div>
      <div className="field wide">
        <label>메시지</label>
        <textarea rows={2} value={spec.message ?? ""} onChange={(e) => set("message", e.target.value)} />
        <p className="hint">이 영상이 남길 한 줄. 씬 구성의 검증 기준이 된다 — 없으면 경고가 뜬다</p>
      </div>

      <div className="grid">
        <ThemePicker
          value={spec.theme}
          onChange={(t) => set("theme", t)}
          onOpenDesignPanel={onOpenDesign}
        />
        <SkinPicker
          value={spec.skin}
          theme={spec.theme || "midnight"}
          onChange={(s) => set("skin", s)}
          onOpenDesignPanel={onOpenDesign}
          hint="색은 테마가, 재질은 스킨이 정한다"
        />
        {sel("aspect", "화면비", GG.aspects)}
        {sel("energy", "에너지", GG.energies)}
        {sel("font", "폰트", GG.fonts, "생략하면 테마가 정한다")}
        {sel("mode", "재생 모드", MODES)}
      </div>

      <div className="field wide">
        <DecorEditor
          value={spec.decor}
          onChange={(d) => set("decor", d)}
          decorLevel={spec.decorLevel}
          onChangeLevel={(lvl) => set("decorLevel", lvl)}
          theme={spec.theme || "midnight"}
          hint={`생략하면 테마 기본 배경이 적용됩니다. 전체 ${Object.keys(GG.decors).length}종 제공`}
        />
      </div>

      <fieldset className="group">
        <legend>음성 정렬</legend>
        <p className="hint">음성을 얹을 때만. 파일 자체는 툴바의 자막·음성에서 고른다</p>
        <div className="grid">
          <div className="field">
            <label>오프셋(초)</label>
            <input
              type="number"
              step={0.1}
              value={spec.audio?.offset ?? ""}
              onChange={(e) =>
                set("audio", setField({ ...(spec.audio ?? {}) }, "offset",
                  e.target.value === "" ? undefined : Number(e.target.value)))
              }
            />
            <p className="hint">음성 안에서 첫 대사가 시작하는 시각</p>
          </div>
          <div className="field">
            <label>볼륨</label>
            <input
              type="number"
              step={0.1}
              min={0}
              max={1}
              value={spec.audio?.volume ?? ""}
              onChange={(e) =>
                set("audio", setField({ ...(spec.audio ?? {}) }, "volume",
                  e.target.value === "" ? undefined : Number(e.target.value)))
              }
            />
          </div>
        </div>
      </fieldset>
    </div>
  );
}
