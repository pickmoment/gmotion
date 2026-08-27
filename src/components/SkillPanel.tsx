/**
 * 스킬 설치.
 *
 * 스킬 페이로드는 앱 바이너리 안에 있다 — 앱은 사용자의 스킬 디렉토리를 읽지 않고,
 * 오히려 거기에 써 넣는 쪽이다. 설치본이 번들과 다른 파일까지 짚어 준다.
 */
import { useCallback, useEffect, useState } from "react";
import { api, ask, dialogs, shell, type SkillStatus } from "../lib/tauri";

export function SkillPanel({ onClose }: { onClose: () => void }) {
  const [root, setRoot] = useState<string | null>(null);
  const [st, setSt] = useState<SkillStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const refresh = useCallback(async (r: string | null) => {
    try {
      setSt(await api.skillStatus(r));
      setErr("");
    } catch (e) {
      setErr(String(e));
    }
  }, []);

  useEffect(() => {
    void refresh(root);
  }, [root, refresh]);

  const run = async (fn: () => Promise<SkillStatus>, done: string) => {
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      setSt(await fn());
      setMsg(done);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  const diffCount = st ? st.missing.length + st.differing.length : 0;

  return (
    <div className="modal" role="dialog" aria-label="스킬 설치">
      <div className="modal-box">
        <div className="pane-head">
          <h2>gmotion 스킬 설치</h2>
          <button type="button" className="ghost" onClick={onClose}>닫기</button>
        </div>

        <p className="hint">
          이 앱은 스킬 전체를 안에 들고 있다. 설치하면 Claude Code 가 같은 엔진으로 스펙을 만들고,
          앱이 그걸 그대로 열어 편집한다.
        </p>

        <div className="field">
          <label>설치 위치</label>
          <div className="icon-row">
            <select value={root === null ? "user" : "custom"}
                    onChange={(e) => setRoot(e.target.value === "user" ? null : (root ?? ""))}>
              <option value="user">사용자 전역 — ~/.claude/skills</option>
              <option value="custom">프로젝트 — &lt;선택한 폴더&gt;/.claude/skills</option>
            </select>
            {root !== null && (
              <button type="button" onClick={async () => {
                const d = await dialogs.openDir();
                if (d) setRoot(d);
              }}>
                폴더 고르기
              </button>
            )}
          </div>
          {st && <p className="hint mono">{st.target}</p>}
        </div>

        {st && (
          <>
            <ul className="kv">
              <li>
                <span>상태</span>
                <strong className={st.installed ? (st.up_to_date ? "ok" : "warn") : "dim"}>
                  {!st.installed ? "설치 안 됨" : st.up_to_date ? "최신" : `갱신 필요 — ${diffCount}개 파일`}
                </strong>
              </li>
              <li>
                <span>엔진 버전</span>
                <strong>
                  번들 {st.bundled_version}
                  {st.installed_version && st.installed_version !== st.bundled_version && ` · 설치본 ${st.installed_version}`}
                </strong>
              </li>
              <li>
                <span>파일</span>
                <strong>{st.bundled_files}개</strong>
              </li>
            </ul>

            {(st.differing.length > 0 || st.missing.length > 0) && (
              <details className="diff">
                <summary>차이 {diffCount}개</summary>
                <ul>
                  {st.missing.map((f) => <li key={`m${f}`}><span className="tag miss">없음</span>{f}</li>)}
                  {st.differing.map((f) => <li key={`d${f}`}><span className="tag diff">다름</span>{f}</li>)}
                </ul>
              </details>
            )}
            {st.extra.length > 0 && (
              <details className="diff">
                <summary>번들에 없는 파일 {st.extra.length}개 (설치는 이걸 건드리지 않는다)</summary>
                <ul>{st.extra.map((f) => <li key={f}>{f}</li>)}</ul>
              </details>
            )}
          </>
        )}

        {msg && <p className="ok-inline">{msg}</p>}
        {err && <p className="warn-inline">{err}</p>}

        <div className="modal-ops">
          <button type="button" className="primary" disabled={busy}
                  onClick={() => run(() => api.skillInstall(root), st?.installed ? "갱신했다." : "설치했다.")}>
            {st?.installed ? "덮어써 갱신" : "설치"}
          </button>
          <button type="button" disabled={busy || !st?.installed}
                  onClick={() => st && shell.revealItemInDir(st.target)}>
            폴더 열기
          </button>
          <button type="button" className="danger" disabled={busy || !st?.installed}
                  onClick={async () => {
                    if (await ask(`${st?.target} 를 지운다. 계속할까?`, "스킬 제거")) {
                      void run(() => api.skillRemove(root), "지웠다.");
                    }
                  }}>
            제거
          </button>
        </div>
      </div>
    </div>
  );
}
