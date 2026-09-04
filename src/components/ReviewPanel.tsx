import { useEffect, useMemo, useRef, useState } from "react";
import type { Spec, ValidateResult } from "../engine/types";
import { build, type SyncInput } from "../lib/build";

type MotionMode = "full" | "reduced";
type SafeArea = "" | "video" | "shorts" | "captions";

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

  /* 카드마다 씬 하나의 완성 프레임을 세운다. iframe 은 `allow-same-origin` 없이 띄우므로
     (스펙의 svg 가 앱 문서를 만지지 못하게) 산출물 안의 GGM 을 직접 못 부른다 —
     런타임의 다리가 `ready` 를 보내오면 그 창에 goto 를 돌려보낸다. */
  const frames = useRef<(HTMLIFrameElement | null)[]>([]);
  useEffect(() => {
    const onMessage = (e: MessageEvent<{ gg?: string }>) => {
      if (e.data?.gg !== "ready") return;
      const i = frames.current.findIndex((f) => f && f.contentWindow === e.source);
      if (i < 0) return;
      frames.current[i]?.contentWindow?.postMessage({ gg: "cmd", op: "goto", i }, "*");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

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
                    ref={(el) => {
                      frames.current[index] = el;
                    }}
                    srcDoc={html}
                    sandbox="allow-scripts"
                    loading="lazy"
                    tabIndex={-1}
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
