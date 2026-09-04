/**
 * 미리보기. 실제 산출물 HTML 을 그대로 iframe 에 띄운다 —
 * "미리보기용 렌더러" 를 따로 두면 산출물과 어긋나므로, 보이는 것이 곧 결과다.
 *
 * iframe 은 `allow-same-origin` **없이** 띄운다. 스펙의 `svg`·마크·일러스트는
 * 에이전트 CLI 나 남이 준 파일에서 올 수 있고, 동일 출처로 띄우면 그 글자가
 * `parent.__TAURI_INTERNALS__.invoke(…)` 로 임의 경로 쓰기·삭제까지 닿는다.
 * 그래서 씬 시킹·재생은 런타임의 postMessage 다리(runtime.js 의 `bridge()`)로 한다.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { Spec, ValidateResult } from "../engine/types";
import { build, type SyncInput } from "../lib/build";
import { error as logError } from "@tauri-apps/plugin-log";

/** 산출물이 부모에게 보내는 것 */
type FromFrame =
  | { gg: "ready"; total: number; scenes: { at: number }[]; captions: boolean }
  | { gg: "state"; t: number; playing: boolean; captionsOn: boolean };

const RATES = [0.5, 1, 1.5, 2];

/** 시각 t 에 걸리는 씬 — 런타임의 sceneIndexAt 과 같은 규칙 */
function sceneAt(scenes: { at: number }[], t: number): number {
  let k = 0;
  for (let i = 0; i < scenes.length; i++) if (t >= scenes[i].at - 0.01) k = i;
  return k;
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
  /* 자막 표시·배속은 산출물 안의 상태다 — 다시 빌드해도 보던 대로 유지한다 */
  const [ccOn, setCcOn] = useState(true);
  const [rate, setRate] = useState(1);
  const [motion, setMotion] = useState<"system" | "full" | "reduced">("system");
  const [safeArea, setSafeArea] = useState<"" | "video" | "shorts" | "captions">("");
  /* 전송부가 보는 시계 — rAF 로 산출물의 마스터 시각을 읊는다 */
  const [clock, setClock] = useState({ t: 0, total: 0, playing: false });
  const pending = useRef(scene);
  const ccRef = useRef(true);
  const rateRef = useRef(1);
  /* 재생이 씬 경계를 넘어 목록 선택을 따라가게 할 때 — 그 선택 변경은 씬을 되감지 않는다 */
  const followed = useRef(false);

  ccRef.current = ccOn;
  rateRef.current = rate;

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

  /** 산출물에 조작을 보낸다. 아직 부팅 전이면 조용히 흘린다 — 뜨면 pending 으로 되맞춘다 */
  const send = useCallback((msg: Record<string, unknown>) => {
    frame.current?.contentWindow?.postMessage({ gg: "cmd", ...msg }, "*");
  }, []);

  /* 재생 중 씬 끝에서 멈출 자리. null 이면 경계를 넘어 계속 간다 */
  const stopAt = useRef<number | null>(null);
  const stopWatch = () => {
    stopAt.current = null;
  };

  /* 씬 경계 시각. 산출물과 같은 컴파일 결과라 검증 결과의 at 을 그대로 쓴다 */
  const marks = result.scenes ?? [];
  const marksRef = useRef(marks);
  marksRef.current = marks;
  /* 키 처리에서 지금 재생 중인지 — 상태를 의존성에 넣지 않으려고 ref 로 들고 있는다 */
  const playingRef = useRef(false);
  playingRef.current = clock.playing;

  /**
   * 씬 i 를 처음부터 재생하고 그 씬 끝에서 멈춘다.
   *
   * 씬 경계를 넘겨 계속 흘려보내면 편집 중인 씬을 놔두고 딴 데를 보고 있게 된다.
   * 산출물의 마스터 타임라인에는 씬 종료 콜백이 없으므로 부모가 시각을 지켜본다 —
   * 산출물을 건드리지 않고 밖에서만 제어하는 편이 낫다.
   */
  const playScene = useCallback(
    (i: number) => {
      const list = marksRef.current;
      const s = list[i];
      if (!s) return;
      const next = list[i + 1];
      /* 다음 씬이 들어오기 직전까지 — 트랜지션 겹침 구간을 물지 않는다 */
      stopAt.current = next ? next.at - 0.03 : null;
      send({ op: "seek", t: s.at });
      send({ op: "play" });
    },
    [send],
  );

  /* 다시 그린 뒤에는 보고 있던 씬으로 되돌린다 — 편집하다 처음으로 튀면 못 쓴다.
     여기서는 모션을 재생하지 않고 완성된 상태로 세운다. 타이핑을 멈출 때마다
     다시 빌드되므로, 그때마다 재생하면 글자가 계속 튀어 읽을 수 없다.

     산출물이 살아 있다는 증거는 다리가 보내는 `ready` 다. 8초 안에 오지 않으면
     인라인 <script> 가 실행되지 않은 것이다 — 배포 빌드의 CSP(script-src)가 가장
     흔한 원인이고(dev 에는 CSP 가 없어 재현되지 않는다), 그때는 화면이 그려지기만
     하고 움직이지 않는다. 무엇이 막았는지 알 수 있게 CSP 까지 로그에 남긴다. */
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  useEffect(() => {
    setStalled(false);
    const timer = setTimeout(() => {
      setStalled(true);
      setDead("산출물의 스크립트가 실행되지 않았다 — 로그(툴바 '로그')에 진단을 남겼다");
      void effectiveCsp().then((csp) => logError(`[preview] 런타임 부팅 실패: csp=${csp}`));
    }, 8000);

    const onMessage = (e: MessageEvent<FromFrame>) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      const m = e.data;
      if (!m || (m.gg !== "ready" && m.gg !== "state")) return;
      if (m.gg === "ready") {
        clearTimeout(timer);
        setStalled(false);
        setDead("");
        setClock({ t: 0, total: m.total, playing: false });
        stopWatch();
        send({ op: "goto", i: pending.current });
        if (!ccRef.current) send({ op: "captions", on: false });
        if (rateRef.current !== 1) send({ op: "rate", x: rateRef.current });
        return;
      }
      setClock((cur) =>
        Math.abs(cur.t - m.t) < 0.03 && cur.playing === m.playing
          ? cur
          : { t: m.t, total: cur.total, playing: m.playing },
      );
      /* 씬 끝에 닿으면 그 자리에 세운다 */
      if (stopAt.current != null && m.t >= stopAt.current) {
        const end = stopAt.current;
        stopWatch();
        send({ op: "seek", t: end });
        return;
      }
      /* 경계를 넘어 계속 재생 중이면 좌측 목록의 선택도 따라간다 */
      if (m.playing) {
        const cur = sceneAt(marksRef.current, m.t);
        if (cur !== sceneRef.current) {
          followed.current = true;
          onSceneChange(cur);
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timer);
    };
  }, [stamp, send, onSceneChange]);

  /* 씬을 바꾸면 그 씬의 모션을 처음부터 보여준다 — 재생이 경계를 넘어 선택이 따라온
     경우는 예외다. 그때 되감으면 방금 넘어간 씬이 다시 시작돼 재생이 절뚝거린다. */
  useEffect(() => {
    if (followed.current) {
      followed.current = false;
      return;
    }
    playScene(scene);
  }, [scene, playScene]);

  /* 전송부의 키. `div` 는 포커스를 못 받으므로 창에서 듣되, 글자를 치는 중에는 비켜 준다 —
     폼 입력·CodeMirror 안이면 그대로 두고, iframe 안에 포커스가 있으면 그 키(Space·←·→·R·C)는
     산출물 자신이 받는다(이 리스너에는 오지 않는다). 버튼 위의 Space 는 버튼 몫이다. */
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || el?.isContentEditable)
        return;
      if (e.key === " " && tag !== "BUTTON") {
        e.preventDefault();
        stopWatch();
        send({ op: playingRef.current ? "pause" : "play" });
      } else if (e.key === "ArrowLeft" && sceneRef.current > 0) {
        e.preventDefault();
        onSceneChange(sceneRef.current - 1);
      } else if (e.key === "ArrowRight" && sceneRef.current < spec.scenes.length - 1) {
        e.preventDefault();
        onSceneChange(sceneRef.current + 1);
      } else if (e.key === "," || e.key === ".") {
        e.preventDefault();
        stopWatch();
        send({ op: "step", n: e.key === "," ? -1 : 1 });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSceneChange, send, spec.scenes.length]);

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
          <iframe key={stamp} ref={frame} title="미리보기" srcDoc={html} sandbox="allow-scripts" />
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

      {/* 스크러버 — 산출물의 진행 바와 같은 시계를 본다. 씬 경계는 검증 결과의 시각으로 틱을 친다
          (산출물과 같은 컴파일이라 값이 같다) */}
      <div className="scrub">
        <div className="scrub-track">
          {clock.total > 0 &&
            (result.scenes ?? [])
              .slice(1)
              .map((s) => (
                <span
                  key={s.n}
                  className="tick"
                  style={{ left: `${(s.at / clock.total) * 100}%` }}
                />
              ))}
          <input
            type="range"
            min={0}
            max={clock.total || 1}
            step={0.01}
            value={Math.min(clock.t, clock.total || 1)}
            disabled={!clock.total}
            aria-label="재생 위치"
            onChange={(e) => {
              stopWatch();
              const t = Number(e.target.value);
              send({ op: "seek", t });
              setClock((cur) => ({ ...cur, t, playing: false }));
            }}
          />
        </div>
        <span className="time">
          {clock.t.toFixed(1)} / {clock.total.toFixed(1)}s
        </span>
      </div>

      <div className="transport">
        <button
          type="button"
          onClick={() => onSceneChange(Math.max(0, scene - 1))}
          disabled={scene === 0}
          title="이전 씬 (←)"
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
          title="다음 씬 (→)"
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
            send({ op: clock.playing ? "pause" : "play" });
          }}
          title={clock.playing ? "정지 (Space)" : "씬 경계를 넘어 계속 재생 (Space)"}
        >
          {clock.playing ? "정지" : "재생"}
        </button>
        <button
          type="button"
          onClick={() => {
            stopWatch();
            send({ op: "step", n: -1 });
          }}
          title="한 프레임 뒤로 (,)"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => {
            stopWatch();
            send({ op: "step", n: 1 });
          }}
          title="한 프레임 앞으로 (.)"
        >
          ›
        </button>
        <button
          type="button"
          onClick={() => {
            stopWatch();
            send({ op: "replay" });
          }}
          title="전체를 처음부터"
        >
          전체
        </button>
        <select
          className="rate"
          value={rate}
          title="배속 — 음성이 있으면 음성도 같이"
          onChange={(e) => {
            const x = Number(e.target.value);
            setRate(x);
            send({ op: "rate", x });
          }}
        >
          {RATES.map((r) => (
            <option key={r} value={r}>
              {r}×
            </option>
          ))}
        </select>
        {sync.captions && sync.cues && (
          <button
            type="button"
            className={ccOn ? "on" : ""}
            title="화면 자막 켜기·끄기 (산출물에서는 C 키)"
            onClick={() => {
              const next = !ccOn;
              setCcOn(next);
              send({ op: "captions", on: next });
            }}
          >
            CC
          </button>
        )}
      </div>
    </div>
  );
}
