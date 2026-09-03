import { useMemo, useState } from "react";
import type { Spec, ValidateResult } from "../engine/types";
import { build, type SyncInput } from "../lib/build";

type MotionMode = "full" | "reduced";
type SafeArea = "" | "video" | "shorts" | "captions";

type ReviewApi = {
  ready: Promise<unknown>;
  goto(index: number): number;
};

interface ReviewWindow extends Window {
  GGM?: ReviewApi;
}

export function ReviewPanel({
  spec,
  sync,
  result,
  onPick,
  onClose,
}: {
  spec: Spec;
  sync: SyncInput;
  result: ValidateResult;
  onPick: (index: number) => void;
  onClose: () => void;
}) {
  const [motion, setMotion] = useState<MotionMode>("full");
  const [safeArea, setSafeArea] = useState<SafeArea>("");
  const [captions, setCaptions] = useState(sync.captions);
  const html = useMemo(
    () =>
      build(
        spec,
        { ...sync, audioSrc: null, captions },
        {
          clean: true,
          reducedMotion: motion === "reduced",
          safeArea: safeArea || undefined,
        },
      ),
    [spec, sync, captions, motion, safeArea],
  );

  return (
    <div className="modal review-modal" role="dialog" aria-label="씬별 화면 검수">
      <div className="modal-box review-box">
        <div className="pane-head">
          <h2>씬별 화면 검수</h2>
          <span className="dim">완성 프레임 {spec.scenes.length}개</span>
          <select value={motion} onChange={(e) => setMotion(e.target.value as MotionMode)}>
            <option value="full">전체 모션</option>
            <option value="reduced">감소 모션</option>
          </select>
          <select value={safeArea} onChange={(e) => setSafeArea(e.target.value as SafeArea)}>
            <option value="">안전 영역 없음</option>
            <option value="video">일반 영상</option>
            <option value="shorts">9:16 쇼츠 UI</option>
            <option value="captions">자막 영역</option>
          </select>
          {sync.cues && (
            <label className="inline-check">
              <input
                type="checkbox"
                checked={captions}
                onChange={(e) => setCaptions(e.target.checked)}
              />
              CC
            </label>
          )}
          <button type="button" className="ghost" onClick={onClose}>
            닫기
          </button>
        </div>
        <p className="review-note">
          글자 넘침·요소 겹침·수직 균형·자막 충돌·감소 모션의 정보 보존을 확인한다. 카드를 누르면
          편집 화면의 해당 씬으로 이동한다.
        </p>
        <div className="review-grid">
          {spec.scenes.map((scene, index) => {
            const timing = result.scenes?.[index];
            return (
              <button
                type="button"
                className="review-card"
                key={`${scene.id ?? index}-${motion}-${safeArea}-${captions}`}
                onClick={() => onPick(index)}
              >
                <span
                  className="review-frame"
                  style={{
                    aspectRatio:
                      spec.aspect === "9:16"
                        ? "9 / 16"
                        : spec.aspect === "1:1"
                          ? "1"
                          : spec.aspect === "4:5"
                            ? "4 / 5"
                            : "16 / 9",
                  }}
                >
                  <iframe
                    title={`씬 ${index + 1} ${scene.title || scene.pattern}`}
                    srcDoc={html}
                    sandbox="allow-scripts allow-same-origin"
                    loading="lazy"
                    tabIndex={-1}
                    onLoad={(event) => {
                      // Same-origin srcDoc exposes the runtime API after its inline script boots.
                      const frameWindow = event.currentTarget.contentWindow as ReviewWindow | null;
                      const api = frameWindow?.GGM;
                      if (api) void Promise.resolve(api.ready).then(() => api.goto(index));
                    }}
                  />
                </span>
                <span className="review-meta">
                  <strong>
                    {index + 1}. {scene.title || scene.kicker || scene.pattern}
                  </strong>
                  <small>
                    {scene.pattern}
                    {timing ? ` · ${timing.dur}s` : ""}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
