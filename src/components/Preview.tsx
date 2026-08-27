/**
 * 미리보기. 실제 산출물 HTML 을 그대로 iframe 에 띄운다 —
 * "미리보기용 렌더러" 를 따로 두면 산출물과 어긋나므로, 보이는 것이 곧 결과다.
 *
 * srcdoc iframe 은 부모와 동일 출처라 `contentWindow.GGM` 으로 씬 시킹을 그대로 쓴다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Spec, ValidateResult } from "../engine/types";
import { build, type SyncInput } from "../lib/build";

interface GGMApi {
  master: { time(): number };
  scenes: { id: string; pattern: string; at: number; dur: number }[];
  total: number;
  ready: Promise<unknown>;
  goto(i: number): number;
  seek(t: number): number;
  play(): void;
  pause(): void;
  replay(): void;
  setCaptions(on: boolean): boolean;
  captionsOn: boolean;
}

export function Preview({
  spec,
  sync,
  result,
  scene,
  onSceneChange,
}: {
  spec: Spec;
  sync: SyncInput;
  result: ValidateResult;
  scene: number;
  onSceneChange: (i: number) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState("");
  const [err, setErr] = useState("");
  const [live, setLive] = useState(true);
  const [stamp, setStamp] = useState(0);
  /* 자막 표시는 산출물 안의 상태다 — 다시 빌드해도 보던 대로 유지한다 */
  const [ccOn, setCcOn] = useState(true);
  const pending = useRef(scene);
  const ccRef = useRef(true);

  ccRef.current = ccOn;

  pending.current = scene;

  /* 검증을 통과한 스펙만 다시 그린다. 편집 중간 상태로 미리보기가 깨지지 않게. */
  useEffect(() => {
    if (!live) return;
    if (!result.ok || !spec.scenes.length) return;
    const t = setTimeout(() => {
      try {
        setHtml(build(spec, sync, { clean: false }));
        setErr("");
        setStamp((n) => n + 1);
      } catch (e) {
        setErr((e as Error).message);
      }
    }, 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(spec), sync.cues, sync.captions, sync.audioSrc, result.ok, live]);

  const ggm = () => (frame.current?.contentWindow as unknown as { GGM?: GGMApi })?.GGM;

  /* 씬 끝을 감시하는 rAF 핸들. 씬을 또 바꾸거나 다시 빌드하면 취소한다. */
  const watch = useRef(0);
  const stopWatch = () => {
    if (watch.current) cancelAnimationFrame(watch.current);
    watch.current = 0;
  };

  /**
   * 씬 i 를 처음부터 재생하고 그 씬 끝에서 멈춘다.
   *
   * 씬 경계를 넘겨 계속 흘려보내면 편집 중인 씬을 놔두고 딴 데를 보고 있게 된다.
   * 산출물의 마스터 타임라인에는 씬 종료 콜백이 없으므로 부모에서 시각을 지켜본다 —
   * 산출물을 건드리지 않고 밖에서만 제어하는 편이 낫다.
   */
  const playScene = useCallback((i: number) => {
    const g = ggm();
    if (!g) return;
    const s = g.scenes[i];
    if (!s) return;
    const next = g.scenes[i + 1];
    /* 다음 씬이 들어오기 직전까지 — 트랜지션 겹침 구간을 물지 않는다 */
    const end = next ? next.at - 0.03 : g.total;
    stopWatch();
    g.seek(s.at);
    g.play();
    const tick = () => {
      const cur = ggm();
      if (!cur) { watch.current = 0; return; }
      if (cur.master.time() >= end) { cur.seek(end); watch.current = 0; return; }
      watch.current = requestAnimationFrame(tick);
    };
    watch.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => stopWatch, []);

  /* 다시 그린 뒤에는 보고 있던 씬으로 되돌린다 — 편집하다 처음으로 튀면 못 쓴다.
     여기서는 모션을 재생하지 않고 완성된 상태로 세운다. 타이핑을 멈출 때마다
     다시 빌드되므로, 그때마다 재생하면 글자가 계속 튀어 읽을 수 없다. */
  useEffect(() => {
    const f = frame.current;
    if (!f) return;
    const onLoad = () => {
      const g = ggm();
      if (!g) return;
      stopWatch();
      Promise.resolve(g.ready).then(() => {
        g.goto(pending.current);
        if (!ccRef.current) g.setCaptions(false);
      });
    };
    f.addEventListener("load", onLoad);
    return () => f.removeEventListener("load", onLoad);
  }, [stamp]);

  /* 씬을 바꾸면 그 씬의 모션을 처음부터 보여준다 */
  useEffect(() => {
    const g = ggm();
    if (g) Promise.resolve(g.ready).then(() => playScene(scene));
  }, [scene, playScene]);

  const n = spec.scenes.length;

  return (
    <div className="pane preview">
      <div className="pane-head">
        <h2>미리보기</h2>
        <label className="inline-check">
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          자동 갱신
        </label>
        <button type="button" className="ghost"
                onClick={() => {
                  try {
                    setHtml(build(spec, sync, { clean: false }));
                    setErr("");
                    setStamp((s) => s + 1);
                  } catch (e) {
                    setErr((e as Error).message);
                  }
                }}>
          다시 빌드
        </button>
      </div>

      <div className="stage-host">
        {html ? (
          <iframe
            ref={frame}
            title="미리보기"
            srcDoc={html}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <p className="empty">
            {n === 0
              ? "씬을 추가하면 여기에 나온다."
              : result.ok
                ? "빌드 중…"
                : "검증 오류를 고치면 미리보기가 갱신된다."}
          </p>
        )}
      </div>

      {err && <p className="warn-inline">{err}</p>}

      <div className="transport">
        <button type="button" onClick={() => onSceneChange(Math.max(0, scene - 1))} disabled={scene === 0}>←</button>
        <span className="pos">{n ? scene + 1 : 0} / {n}</span>
        <button type="button" onClick={() => onSceneChange(Math.min(n - 1, scene + 1))} disabled={scene >= n - 1}>→</button>
        <span className="sep" />
        <button type="button" onClick={() => playScene(scene)} title="이 씬을 처음부터">씬 다시</button>
        <button type="button" onClick={() => { stopWatch(); ggm()?.play(); }} title="씬 경계를 넘어 계속 재생">재생</button>
        <button type="button" onClick={() => { stopWatch(); ggm()?.pause(); }}>정지</button>
        <button type="button" onClick={() => { stopWatch(); ggm()?.replay(); }} title="전체를 처음부터">전체</button>
        {sync.captions && sync.cues && (
          <button
            type="button"
            className={ccOn ? "on" : ""}
            title="화면 자막 켜기·끄기 (산출물에서는 C 키)"
            onClick={() => {
              const next = !ccOn;
              setCcOn(next);
              ggm()?.setCaptions(next);
            }}
          >
            CC
          </button>
        )}
      </div>
    </div>
  );
}
