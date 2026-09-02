/**
 * MP4 렌더 진행 창.
 *
 * 헤드리스 Chrome 이 산출물을 실제로 재생하는 동안 화면을 받아 ffmpeg 으로 넘긴다 —
 * 실시간이라 영상 길이만큼 걸린다. 그래서 남은 시간을 같이 보여 주고 언제든 멈출 수 있게 한다.
 */
import { useEffect, useState } from "react";
import { api, onRenderProgress, type RenderProgress } from "../lib/tauri";

const mmss = (s: number) => {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

export function RenderPanel({ total, onCancel }: { total: number; onCancel: () => void }) {
  const [p, setP] = useState<RenderProgress | null>(null);

  useEffect(() => {
    const un = onRenderProgress(setP);
    return () => {
      void un.then((f) => f());
    };
  }, []);

  const done = p ? p.frame / Math.max(1, p.frames) : 0;
  const left = p ? Math.max(0, p.total_sec - p.sec) : total;

  return (
    <div className="modal" role="dialog" aria-label="MP4 렌더">
      <div className="modal-box narrow">
        <div className="pane-head">
          <h2>MP4 렌더</h2>
        </div>

        <p className="hint">
          헤드리스 Chrome 이 산출물을 실제로 재생하며 담는다 — 실시간이라 영상 길이만큼 걸린다.
          그동안 이 창은 두고 다른 일을 해도 된다.
        </p>

        <div className="render-bar" role="progressbar" aria-valuenow={Math.round(done * 100)}>
          <div style={{ width: `${done * 100}%` }} />
        </div>

        <ul className="kv">
          <li>
            <span>단계</span>
            <strong>{p?.phase ?? "준비"}</strong>
          </li>
          <li>
            <span>진행</span>
            <strong>
              {p
                ? `${p.frame.toLocaleString()} / ${p.frames.toLocaleString()} 프레임 · ${Math.round(done * 100)}%`
                : "—"}
            </strong>
          </li>
          <li>
            <span>남은 길이</span>
            <strong>
              {mmss(left)} / {mmss(total)}
            </strong>
          </li>
        </ul>

        <div className="modal-ops">
          <button
            type="button"
            className="danger"
            onClick={() => {
              void api.renderCancel();
              onCancel();
            }}
          >
            멈추기
          </button>
        </div>
      </div>
    </div>
  );
}
