/**
 * MP4 렌더 설정 — 해상도를 고르고 크기를 미리 본다.
 *
 * 렌더는 실시간이라 되돌리기가 비싸다(28초 영상 = 28초 대기). 그래서 해상도와
 * 예상 크기를 **시작 전에** 한 화면에서 보여 주고, 그 뒤에 저장 위치를 묻는다.
 */
import {
  estimateSize,
  formatBytes,
  formatEstimate,
  resolutions,
  stageSize,
  type Resolution,
} from "../lib/render";

const mmss = (s: number) => {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

export function RenderSetupPanel({
  aspect,
  totalSec,
  fps,
  hasAudio,
  audioSec,
  value,
  onChange,
  onStart,
  onClose,
}: {
  aspect: string;
  totalSec: number;
  fps: number;
  hasAudio: boolean;
  /** 음성의 실제 길이(초). 모르면 null */
  audioSec: number | null;
  value: Resolution;
  onChange: (r: Resolution) => void;
  onStart: () => void;
  onClose: () => void;
}) {
  const list = resolutions(aspect);
  /* 기준 크기(화면비가 정한 원래 크기)의 짧은 변 — 사다리에서 어느 칸이 기본인지 표시한다 */
  const stage = stageSize(aspect);
  const nativeShort = Math.min(stage.w, stage.h);
  const est = estimateSize({ w: value.w, h: value.h, fps, sec: totalSec, audio: hasAudio });
  const frames = Math.ceil(totalSec * fps);
  /* 음성과 화면의 길이 차이. 0.5초부터 눈·귀에 걸린다 */
  const gap = hasAudio && audioSec != null ? audioSec - totalSec : 0;
  const mismatch = Math.abs(gap) >= 0.5;

  return (
    <div className="modal" role="dialog" aria-label="MP4 렌더 설정">
      <div className="modal-box">
        <div className="pane-head">
          <h2>MP4 렌더</h2>
          <button type="button" className="ghost" onClick={onClose}>
            닫기
          </button>
        </div>

        <p className="hint">
          헤드리스 Chrome 이 산출물을 <strong>실제로 재생</strong>하며 담는다 — 실시간이라 영상
          길이만큼(<strong>{mmss(totalSec)}</strong>) 걸린다. 화면비 <code>{aspect}</code> 는 그대로
          두고 담는 크기만 바꾼다.
        </p>

        <section className="gen-row">
          <h4>해상도</h4>
          <div className="gen-tools">
            {list.map((r) => {
              const e = estimateSize({ w: r.w, h: r.h, fps, sec: totalSec, audio: hasAudio });
              return (
                <label key={r.short} className={`gen-tool${value.short === r.short ? " on" : ""}`}>
                  <input
                    type="radio"
                    name="mp4-res"
                    checked={value.short === r.short}
                    onChange={() => onChange(r)}
                  />
                  <strong>
                    {r.w}×{r.h}
                  </strong>
                  <span className="dim">
                    {r.name}
                    {r.short === nativeShort ? " · 기준 크기" : ""}
                  </span>
                  <span className="mono dim tiny">약 {formatBytes(e.bytes)}</span>
                </label>
              );
            })}
          </div>
          {value.short > 1080 && (
            <p className="hint warn-text">
              기준 크기보다 크게 담는다 — 기기가 초당 {fps}장을 그려내지 못하면 직전 프레임이 채워져
              움직임이 거칠어질 수 있다. 길이와 화면 크기는 그대로다.
            </p>
          )}
        </section>

        <ul className="kv">
          <li>
            <span>길이</span>
            <strong>
              {mmss(totalSec)} · {frames.toLocaleString()}프레임 {fps}fps
            </strong>
          </li>
          <li>
            <span>예상 크기</span>
            <strong>{formatEstimate(est)}</strong>
          </li>
          <li>
            <span>음성</span>
            <strong>
              {hasAudio
                ? `AAC 192kbps 로 함께 담는다${audioSec != null ? ` · ${audioSec.toFixed(1)}초` : ""}`
                : "없음"}
            </strong>
          </li>
        </ul>

        {mismatch && (
          <p className="hint warn-text">
            음성이 화면보다{" "}
            <strong>
              {Math.abs(gap).toFixed(1)}초 {gap > 0 ? "길다" : "짧다"}
            </strong>{" "}
            (음성 {audioSec?.toFixed(1)}초 · 화면 {totalSec.toFixed(1)}초). 영상 길이는 화면이
            정하므로 {gap > 0 ? "남는 음성은 잘려 나간다" : "모자란 뒤끝은 무음으로 채운다"} — 자막
            파일로 씬 타이밍을 맞추면(자막·음성 메뉴) 이 차이가 사라진다.
          </p>
        )}

        <p className="hint">
          화질은 crf 19 로 고정된다 — 크기는 <strong>움직임 양과 배경 질감</strong>이 정하므로
          범위로 낸다. 정지 구간이 많으면 아래쪽, 쉬지 않고 움직이면 위쪽이다. 실제 크기는 렌더가
          끝나면 알려준다.
        </p>

        <div className="modal-ops">
          <button type="button" className="primary" onClick={onStart}>
            {value.w}×{value.h} 로 렌더 시작…
          </button>
          <button type="button" className="ghost" onClick={onClose}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
