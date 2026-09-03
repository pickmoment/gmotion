/**
 * 미리보기. 실제 산출물 HTML 을 그대로 iframe 에 띄운다 —
 * "미리보기용 렌더러" 를 따로 두면 산출물과 어긋나므로, 보이는 것이 곧 결과다.
 *
 * srcdoc iframe 은 부모와 동일 출처라 `contentWindow.GGM` 으로 씬 시킹을 그대로 쓴다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Spec, ValidateResult } from "../engine/types";
import { build, type SyncInput } from "../lib/build";
import { error as logError } from "@tauri-apps/plugin-log";

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

interface GGMWindow extends Window {
  GGM?: GGMApi;
}

/**
 * 부팅 실패 진단에 붙일 CSP. Tauri 는 배포 자산의 응답 **헤더**로 CSP 를 보내므로
 * 문서에는 meta 가 없다 — 헤더를 직접 읽어야 무엇이 막았는지 알 수 있다.
 */
async function effectiveCsp(): Promise<string> {
  try {
    const r = await fetch(location.href);
    return r.headers.get("content-security-policy") ?? "없음";
  } catch (e) {
    return `읽지 못했다(${String(e)})`;
  }
}

export function Preview({
  spec,
  sync,
  result,
  scene,
  onSceneChange,
  onReview,
}: {
  spec: Spec;
  sync: SyncInput;
  result: ValidateResult;
  scene: number;
  onSceneChange: (i: number) => void;
  onReview: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [html, setHtml] = useState("");
  const [err, setErr] = useState("");
  const [live, setLive] = useState(true);
  const [stamp, setStamp] = useState(0);
  const [stalled, setStalled] = useState(false);
  /** 산출물은 실렸는데 그 안의 스크립트가 실행되지 않았을 때 — 왜 그런지까지 적는다 */
  const [dead, setDead] = useState("");
  /* 자막 표시는 산출물 안의 상태다 — 다시 빌드해도 보던 대로 유지한다 */
  const [ccOn, setCcOn] = useState(true);
  const [motion, setMotion] = useState<"system" | "full" | "reduced">("system");
  const [safeArea, setSafeArea] = useState<"" | "video" | "shorts" | "captions">("");
  const pending = useRef(scene);
  const ccRef = useRef(true);

  ccRef.current = ccOn;

  pending.current = scene;

  /** 산출물이 실제로 바뀌었을 때만 iframe 을 다시 로드시킨다 — 자동 갱신에서까지 매번
   * 리로드하면 내용이 같아도 React 가 srcDoc 을 다시 쓰지 않아 load 이벤트가 안 오고,
   * 그 이벤트를 기다리는 스톨 타이머가 8초 뒤 "응답하지 않는다" 오탐을 낸다.
   * `force` 는 수동 "다시 빌드"·스톨 복구용 — 내용이 같아도 무조건 다시 로드시킨다
   * (iframe 을 `key={stamp}` 로 통째로 새로 만들어, 값이 같아 속성만 바꿔서는 안 오는
   * load 이벤트를 리마운트로 확실히 받는다). */
  const lastHtml = useRef("");

  const rebuild = useCallback(
    (force = false) => {
      try {
        const next = build(spec, sync, {
          clean: false,
          reducedMotion: motion === "system" ? undefined : motion === "reduced",
          safeArea: safeArea || undefined,
        });
        setErr("");
        if (force || next !== lastHtml.current) {
          lastHtml.current = next;
          setHtml(next);
          setStamp((s) => s + 1);
        }
      } catch (e) {
        setErr((e as Error).message);
      }
    },
    [spec, sync, motion, safeArea],
  );

  /* 검증을 통과한 스펙만 다시 그린다. 편집 중간 상태로 미리보기가 깨지지 않게. */
  useEffect(() => {
    if (!live) return;
    if (!result.ok || !spec.scenes.length) return;
    const t = setTimeout(rebuild, 450);
    return () => clearTimeout(t);
  }, [spec, sync.cues, sync.captions, sync.audioSrc, result.ok, live, rebuild]);

  const ggm = () => {
    // Same-origin srcDoc exposes the generated runtime API.
    const frameWindow = frame.current?.contentWindow as GGMWindow | null | undefined;
    return frameWindow?.GGM;
  };

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
      if (!cur) {
        watch.current = 0;
        return;
      }
      if (cur.master.time() >= end) {
        cur.seek(end);
        watch.current = 0;
        return;
      }
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
    setStalled(false);
    const timer = setTimeout(() => setStalled(true), 8000);
    const onLoad = () => {
      clearTimeout(timer);
      setStalled(false);
      const g = ggm();
      if (!g) {
        /* 산출물의 GSAP·런타임은 인라인 <script> 다. load 는 왔는데 GGM 이 없으면
           그 스크립트가 실행되지 않은 것이다 — 배포 빌드의 CSP(script-src) 가 가장
           흔한 원인이고(dev 에는 CSP 가 없어 재현되지 않는다), 그때는 화면이 그려지기만
           하고 움직이지 않는다. 무엇이 막았는지 알 수 있게 CSP 까지 로그에 남긴다. */
        const w = frame.current?.contentWindow as unknown as { gsap?: unknown } | null;
        const doc = frame.current?.contentDocument;
        setDead("산출물의 스크립트가 실행되지 않았다 — 로그(툴바 '로그')에 진단을 남겼다");
        void effectiveCsp().then((csp) =>
          logError(
            `[preview] 런타임 부팅 실패: gsap=${typeof w?.gsap} ggReady=${
              doc?.documentElement.dataset.ggReady ?? "없음"
            } scripts=${doc?.querySelectorAll("script").length ?? -1} csp=${csp}`,
          ),
        );
        return;
      }
      setDead("");
      stopWatch();
      Promise.resolve(g.ready).then(() => {
        g.goto(pending.current);
        if (!ccRef.current) g.setCaptions(false);
      });
    };
    f.addEventListener("load", onLoad);
    return () => {
      f.removeEventListener("load", onLoad);
      clearTimeout(timer);
    };
  }, [stamp]);

  /* 씬을 바꾸면 그 씬의 모션을 처음부터 보여준다 */
  useEffect(() => {
    const g = ggm();
    if (g) Promise.resolve(g.ready).then(() => playScene(scene));
  }, [scene, playScene]);

  const n = spec.scenes.length;

  return (
    <div className="pane preview">
      <div className="pane-head preview-head">
        <h2>미리보기</h2>
        <select value={motion} onChange={(e) => setMotion(e.target.value as typeof motion)}>
          <option value="system">모션: 시스템</option>
          <option value="full">모션: 전체</option>
          <option value="reduced">모션: 감소</option>
        </select>
        <select value={safeArea} onChange={(e) => setSafeArea(e.target.value as typeof safeArea)}>
          <option value="">안전 영역: 없음</option>
          <option value="video">일반 영상</option>
          <option value="shorts">9:16 쇼츠 UI</option>
          <option value="captions">자막 영역</option>
        </select>
        <label className="inline-check">
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          자동
        </label>
        <button type="button" className="ghost" onClick={onReview} disabled={!result.ok || !n}>
          씬 검수
        </button>
        <button type="button" className="ghost" onClick={() => rebuild(true)}>
          다시 빌드
        </button>
      </div>

      <div className="stage-host">
        {html ? (
          <iframe
            key={stamp}
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

      {stalled && (
        <p className="warn-inline">
          미리보기가 응답하지 않는다 —{" "}
          <button type="button" className="ghost" onClick={() => rebuild(true)}>
            다시 그리기
          </button>
        </p>
      )}

      {dead && <p className="warn-inline">{dead}</p>}

      <div className="transport">
        <button
          type="button"
          onClick={() => onSceneChange(Math.max(0, scene - 1))}
          disabled={scene === 0}
        >
          ←
        </button>
        <span className="pos">
          {n ? scene + 1 : 0} / {n}
        </span>
        <button
          type="button"
          onClick={() => onSceneChange(Math.min(n - 1, scene + 1))}
          disabled={scene >= n - 1}
        >
          →
        </button>
        <span className="sep" />
        <button type="button" onClick={() => playScene(scene)} title="이 씬을 처음부터">
          씬 다시
        </button>
        <button
          type="button"
          onClick={() => {
            stopWatch();
            ggm()?.play();
          }}
          title="씬 경계를 넘어 계속 재생"
        >
          재생
        </button>
        <button
          type="button"
          onClick={() => {
            stopWatch();
            ggm()?.pause();
          }}
        >
          정지
        </button>
        <button
          type="button"
          onClick={() => {
            stopWatch();
            ggm()?.replay();
          }}
          title="전체를 처음부터"
        >
          전체
        </button>
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
