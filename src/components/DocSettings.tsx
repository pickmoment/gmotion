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
  const set = (k: string, v: unknown) =>
    onChange(setField(spec as Record<string, unknown>, k, v) as unknown as Spec);
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

  /**
   * true(기본) · false(끔) · 숫자(세기) 세 값을 받는 루트 필드.
   * "기본" 을 고르면 키 자체를 지운다 — 생략이 곧 기본값이다.
   */
  const tri = (
    k: "camera" | "depth" | "shutter",
    label: string,
    hint: string,
    o: { def: number; step: number; max?: number; numLabel: string },
  ) => {
    const v = spec[k] as boolean | number | undefined;
    const num = typeof v === "number";
    return (
      <div className="field" key={k}>
        <label>{label}</label>
        <select
          value={num ? "num" : v === false ? "off" : "on"}
          onChange={(e) =>
            set(k, e.target.value === "off" ? false : e.target.value === "num" ? o.def : undefined)
          }
        >
          <option value="on">기본(켬)</option>
          <option value="off">끔</option>
          <option value="num">숫자로 세기 지정</option>
        </select>
        {num && (
          <input
            type="number"
            step={o.step}
            min={0}
            max={o.max}
            value={String(v)}
            onChange={(e) => {
              const n = Number(e.target.value);
              set(k, e.target.value === "" || Number.isNaN(n) ? undefined : n);
            }}
          />
        )}
        <p className="hint">{num ? o.numLabel : hint}</p>
      </div>
    );
  };

  return (
    <div className="pane-body">
      <div className="field wide">
        <label>제목</label>
        <input value={spec.title ?? ""} onChange={(e) => set("title", e.target.value)} />
        <p className="hint">&lt;title&gt; 과 접근성 라벨에 쓰인다</p>
      </div>
      <div className="field wide">
        <label>메시지</label>
        <textarea
          rows={2}
          value={spec.message ?? ""}
          onChange={(e) => set("message", e.target.value)}
        />
        <p className="hint">
          이 영상이 남길 한 줄. 씬 구성의 검증 기준이 된다 — 없으면 경고가 뜬다
        </p>
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
        <legend>카메라·깊이</legend>
        <p className="hint">
          씬마다 아주 느린 카메라가 씬 전체 길이 동안 움직여 정지 프레임을 없앱니다. 씬별 카메라는
          씬 폼에서 고릅니다
        </p>
        <div className="grid">
          {tri("camera", "카메라(camera)", "생략하면 켜집니다. 끄면 모든 씬이 정지 화면이 됩니다", {
            def: 1,
            step: 0.1,
            numLabel: "카메라 움직임의 진폭 배율입니다. 1 이 기본",
          })}
          {tri(
            "depth",
            "깊이(depth)",
            "배경 레이어가 카메라를 덜 따라가며 깊이가 생깁니다. 생략하면 0.34",
            {
              def: 0.34,
              step: 0.01,
              max: 1,
              numLabel: "배경이 카메라를 따라가는 비율입니다. 권장 0.2~0.45, 0.7 을 넘으면 경고",
            },
          )}
          {tri(
            "shutter",
            "셔터(shutter)",
            "움직임이 있는 전환에 짧은 모션블러가 붙습니다. 생략하면 켜집니다",
            { def: 1, step: 0.1, numLabel: "모션블러 세기 배율입니다. 1 이 기본" },
          )}
        </div>
      </fieldset>

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
                set(
                  "audio",
                  setField(
                    { ...(spec.audio ?? {}) },
                    "offset",
                    e.target.value === "" ? undefined : Number(e.target.value),
                  ),
                )
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
                set(
                  "audio",
                  setField(
                    { ...(spec.audio ?? {}) },
                    "volume",
                    e.target.value === "" ? undefined : Number(e.target.value),
                  ),
                )
              }
            />
          </div>
        </div>
      </fieldset>
    </div>
  );
}
