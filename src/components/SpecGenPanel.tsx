/**
 * 자막으로 스펙 초안 만들기.
 *
 * 로컬에 설치된 에이전트 CLI 를 돌려 스펙 JSON 을 받고, 앱의 검증기로 채점해
 * 통과분만 넘긴다. 받은 것을 **바로 열지 않는 것**이 이 창의 요점이다 —
 * 씬 표와 검증 결과를 먼저 보여 주고, 열지 말지는 사용자가 정한다.
 *
 * CLI 가 없거나 로그인이 안 됐을 수 있으므로 규칙 기반 초안도 같은 자리에 둔다.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { api, onAgentLog, type AgentTool } from "../lib/tauri";
import { ADAPTERS } from "../lib/agents";
import { generateSpec, matchRate, type GenResult } from "../lib/specGen";
import { draftFromCues, groupCues } from "../lib/specDraft";
import { validate } from "../lib/build";
import type { Cue, Spec } from "../engine/types";

interface Props {
  cues: Cue[];
  /** 지금 문서 설정 — 초안도 같은 화면비·테마로 나오게 한다 */
  base: { aspect: string; theme: string; skin?: string; energy: string };
  onClose: () => void;
  onApply: (spec: Spec, how: string) => void;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

export function SpecGenPanel({ cues, base, onClose, onApply }: Props) {
  const [tools, setTools] = useState<AgentTool[] | null>(null);
  const [toolId, setToolId] = useState<string>("");
  const [note, setNote] = useState("");
  const [retries, setRetries] = useState(2);
  const [model, setModel] = useState("");
  const [timeoutMin, setTimeoutMin] = useState(15);
  /* 씬 표를 먼저 받는 두 단계가 기본이다 — 한 번에 시키면 자막 문장이 그대로 화면에 올라온다 */
  const [storyboard, setStoryboard] = useState(true);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [out, setOut] = useState<GenResult | null>(null);
  const logBox = useRef<HTMLDivElement>(null);

  const total = cues.length ? cues[cues.length - 1].end : 0;
  const groups = useMemo(() => groupCues(cues), [cues]);

  useEffect(() => {
    void api
      .agentTools()
      .then((t) => {
        setTools(t);
        setToolId((cur) => cur || t[0]?.id || "");
      })
      .catch((e) => setErr(String(e)));
  }, []);

  /* 로그는 실행 중에만 흘린다. 마지막 200줄만 들고 있으면 화면에 충분하다. */
  useEffect(() => {
    const un = onAgentLog((l) => {
      setLogs((cur) => [...cur, `${l.stream === "err" ? "! " : ""}${l.text}`].slice(-200));
    });
    return () => {
      void un.then((f) => f());
    };
  }, []);

  useEffect(() => {
    logBox.current?.scrollTo({ top: logBox.current.scrollHeight });
  }, [logs]);

  const tool = tools?.find((t) => t.id === toolId) ?? null;
  const ad = tool ? ADAPTERS[tool.id] : null;

  const run = async () => {
    if (!tool) return;
    setRunning(true);
    setErr("");
    setOut(null);
    setLogs([]);
    try {
      const r = await generateSpec({
        cues,
        tool,
        ...base,
        note: note.trim() || undefined,
        model: model.trim() || undefined,
        storyboard,
        retries,
        timeoutSec: timeoutMin * 60,
        onStage: setStage,
      });
      setOut(r);
      setStage(
        r.result.ok ? "받았다 — 검증 통과" : `받았다 — 검증 오류 ${r.result.errors.length}건`,
      );
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
      setStage("");
    } finally {
      setRunning(false);
    }
  };

  const drafted = () => {
    const spec = draftFromCues(cues, base);
    const result = validate(spec, { cues, captions: false, audioSrc: null });
    setOut({ spec, result, attempt: 1, raw: JSON.stringify(spec, null, 2), ms: 0 });
    setErr("");
    setStage("규칙 기반 초안 — 자막을 씬으로 끊고 say 만 채웠다");
  };

  const rate = out ? matchRate(out.result) : 0;

  return (
    <div className="modal" role="dialog" aria-label="자막으로 스펙 초안 만들기">
      <div className="modal-box wide">
        <div className="pane-head">
          <h2>자막으로 스펙 초안 만들기</h2>
          <button type="button" className="ghost" onClick={onClose} disabled={running}>
            닫기
          </button>
        </div>

        <div className="pane-body gen">
          <p className="hint">
            자막 <strong>{cues.length}</strong>개 cue · 총 <strong>{mmss(total)}</strong> · 씬은
            대략 <strong>{groups.length}</strong>개로 나뉜다. 화면 내용은 자막에서만 나온다 — 없는
            수치는 만들지 않는다.
            <br />
            <span className="warn-text">
              선택한 CLI 를 통해 자막 전문이 그 CLI 가 쓰는 모델로 전송된다. 음성 파일은 보내지
              않는다(텍스트만 읽는다).
            </span>
          </p>

          <section className="gen-row">
            <h4>어떤 CLI 로 만들까</h4>
            {tools === null && <p className="dim">찾는 중…</p>}
            {tools && tools.length === 0 && (
              <p className="dim">
                설치된 에이전트 CLI 를 찾지 못했다. 아래 <strong>규칙 기반 초안</strong>으로도
                뼈대는 만들 수 있다.
              </p>
            )}
            <div className="gen-tools">
              {tools?.map((t) => {
                const ad = ADAPTERS[t.id];
                return (
                  <label key={t.id} className={`gen-tool${toolId === t.id ? " on" : ""}`}>
                    <input
                      type="radio"
                      name="agent-tool"
                      checked={toolId === t.id}
                      disabled={running}
                      onChange={() => setToolId(t.id)}
                    />
                    <strong>{ad?.label ?? t.id}</strong>
                    <span className="dim">{ad?.hint ?? ""}</span>
                    <span className="mono dim tiny">{t.bin}</span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="gen-row">
            <h4>모델 (선택)</h4>
            <input
              type="text"
              list="agent-models"
              value={model}
              disabled={running}
              placeholder={ad ? `비우면 ${ad.label} 의 기본 모델` : "CLI 를 먼저 고른다"}
              onChange={(e) => setModel(e.target.value)}
            />
            <datalist id="agent-models">
              {(ad?.models ?? []).map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <p className="hint">{ad?.modelHint ?? ""}</p>
          </section>

          <section className="gen-row">
            <h4>용도·톤 (선택)</h4>
            <input
              type="text"
              value={note}
              disabled={running}
              placeholder="예: 사내 공유용, 담담한 톤. 지표는 크게 보여 준다"
              onChange={(e) => setNote(e.target.value)}
            />
            <label className="inline-check">
              <input
                type="checkbox"
                checked={storyboard}
                disabled={running}
                onChange={(e) => setStoryboard(e.target.checked)}
              />
              씬 표를 먼저 받고 그것을 근거로 스펙을 만든다 (두 번 호출) — 끄면 한 번에 묻는다
            </label>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={retries > 0}
                disabled={running}
                onChange={(e) => setRetries(e.target.checked ? 2 : 0)}
              />
              검증에 걸리면 진단을 붙여 다시 묻는다 (최대 2회) — 오류·자막 매칭률을 그대로 되먹인다
            </label>
            <label className="inline-check">
              호출 1회 시간 제한
              <select
                value={timeoutMin}
                disabled={running}
                onChange={(e) => setTimeoutMin(Number(e.target.value))}
              >
                <option value={5}>5분</option>
                <option value={10}>10분</option>
                <option value={15}>15분</option>
                <option value={30}>30분</option>
                <option value={60}>60분</option>
              </select>
              최악의 경우 최대 {timeoutMin * (1 + retries)}분까지 기다릴 수 있다
            </label>
          </section>

          <div className="modal-ops start">
            <button
              type="button"
              className="primary"
              disabled={!tool || running}
              onClick={() => void run()}
            >
              {running ? "만드는 중…" : "스펙 만들기"}
            </button>
            <button
              type="button"
              disabled={running}
              onClick={drafted}
              title="모델을 쓰지 않는다 — 자막 문구를 그대로 배치한 뼈대다"
            >
              뼈대만 (자막 그대로)
            </button>
            {running && (
              <button type="button" className="danger" onClick={() => void api.agentCancel()}>
                멈추기
              </button>
            )}
            {stage && <span className="dim">{stage}</span>}
          </div>

          {err && <p className="err-text">{err}</p>}

          {(running || logs.length > 0) && (
            <section className="gen-row">
              <h4>진행 로그</h4>
              <div className="gen-log mono" ref={logBox}>
                {logs.length === 0 ? (
                  <span className="dim">응답을 기다린다…</span>
                ) : (
                  logs.map((l, i) => <div key={i}>{l}</div>)
                )}
              </div>
            </section>
          )}

          {out && (
            <section className="gen-row">
              <h4>
                초안 — 씬 {out.spec.scenes?.length ?? 0}개
                {out.attempt > 1 && <span className="dim"> · {out.attempt}번째 시도</span>}
                {out.ms > 0 && <span className="dim"> · {(out.ms / 1000).toFixed(1)}초</span>}
              </h4>
              <ul className="kv">
                <li>
                  <span>검증</span>
                  <strong className={out.result.ok ? "" : "err-text"}>
                    {out.result.ok ? "통과" : `오류 ${out.result.errors.length}건`}
                    {out.result.warnings.length > 0 && ` · 경고 ${out.result.warnings.length}건`}
                  </strong>
                </li>
                <li>
                  <span>자막 정렬</span>
                  <strong className={rate >= 0.8 ? "" : "warn-text"}>
                    {out.result.stats?.scenes ?? 0}씬 중 {out.result.sync?.matched ?? 0}씬 (
                    {Math.round(rate * 100)}%)
                  </strong>
                </li>
                <li>
                  <span>길이</span>
                  <strong>{(out.result.stats?.totalSec ?? 0).toFixed(1)}초</strong>
                </li>
              </ul>

              {out.board && (
                <details className="gen-board">
                  <summary>씬 표 — 왜 이렇게 나눴나 ({out.board.scenes?.length ?? 0}씬)</summary>
                  <ol>
                    {(out.board.scenes ?? []).map((b, i) => (
                      <li key={i}>
                        <code>{b.pattern}</code>
                        <strong>{b.headline ?? ""}</strong>
                        <span className="dim tiny">
                          {b.peak ? "★ " : ""}
                          {b.why ?? ""}
                          {b.cues ? ` · 자막 ${b.cues}` : ""}
                        </span>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
              <ol className="gen-scenes">
                {(out.spec.scenes ?? []).map((s, i) => (
                  <li key={i}>
                    <code>{s.pattern}</code>
                    <strong>
                      {String(
                        s.title ??
                          s.text ??
                          (Array.isArray(s.lines) ? s.lines.join(" / ") : "") ??
                          "",
                      )}
                    </strong>
                    <span className="dim tiny">{String(s.say ?? "").slice(0, 60)}</span>
                  </li>
                ))}
              </ol>

              {!out.result.ok && (
                <ul className="gen-errs">
                  {out.result.errors.slice(0, 6).map((e, i) => (
                    <li key={i} className="err-text">
                      {e}
                    </li>
                  ))}
                </ul>
              )}

              <div className="modal-ops">
                <button type="button" className="ghost" onClick={() => setOut(null)}>
                  버리기
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() =>
                    onApply(
                      out.spec,
                      `${out.spec.scenes?.length ?? 0}씬 · 자막 정렬 ${Math.round(rate * 100)}%`,
                    )
                  }
                >
                  이 초안 열기
                </button>
              </div>
              {!out.result.ok && (
                <p className="hint">
                  오류가 있어도 열 수 있다 — 검증 패널이 같은 오류를 짚어 주므로 씬 편집기에서
                  고치면 된다.
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
