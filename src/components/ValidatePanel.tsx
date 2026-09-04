/**
 * 검증 패널. 오류(✗)와 경고(!)를 CLI 와 같은 기준으로 보여준다.
 * 경고는 연출에 대한 지적이라 그냥 숨기지 않는다 — 무시하려면 이유가 있어야 한다.
 */
import type { Cue, Spec, ValidateResult } from "../engine/types";
import { issueScene } from "../lib/issues";

export function ValidatePanel({
  result,
  spec,
  cues,
  onSelectScene,
}: {
  result: ValidateResult;
  spec: Spec;
  cues: Cue[] | null;
  /** 씬에 대한 지적을 누르면 그 씬으로 간다 */
  onSelectScene: (i: number) => void;
}) {
  const { errors, warnings, stats, sync } = result;
  const clean = !errors.length && !warnings.length;

  /* 한 씬도 못 맞췄으면 대개 다른 회차의 자막을 고른 것이다.
     "시작 지점을 찾지 못했다" 가 씬 수만큼 반복될 뿐 그 사실은 드러나지 않아,
     양쪽 첫 문장을 나란히 보여 준다 — 보면 1초 만에 안다. */
  const mismatch =
    cues && cues.length > 0 && sync && sync.matched === 0
      ? {
          cue: cues[0].text,
          say: String(spec.scenes.find((x) => x.say)?.say ?? "").slice(0, 60),
        }
      : null;

  /* 씬에 대한 지적은 눌러서 그 씬으로 간다 — 30씬짜리에서 번호를 눈으로 찾지 않게 */
  const issue = (m: string, cls: string, mark: string, key: string) => {
    const i = issueScene(m);
    if (i === null || i >= spec.scenes.length)
      return (
        <li key={key} className={cls}>
          <span>{mark}</span>
          {m}
        </li>
      );
    return (
      <li key={key} className={cls}>
        <span>{mark}</span>
        <button type="button" className="issue-go" onClick={() => onSelectScene(i)}>
          {m}
        </button>
      </li>
    );
  };

  return (
    <div className="validate">
      <div className="pane-head">
        <h2>
          검증
          {errors.length > 0 && <span className="pill bad">✗ {errors.length}</span>}
          {warnings.length > 0 && <span className="pill warn">! {warnings.length}</span>}
          {clean && stats && <span className="pill ok">✓ 통과</span>}
        </h2>
      </div>

      {stats && (
        <p className="stats">
          씬 {stats.scenes}(패턴 {stats.patterns}종) · {stats.totalSec}초 · {stats.frames}프레임 ·{" "}
          {stats.theme} · {stats.aspect} · {stats.energy} · {stats.mode} · 트윈 {stats.tweens}
          {sync && ` · 자막에 맞춘 씬 ${sync.matched}/${stats.scenes}`}
        </p>
      )}

      {mismatch && (
        <div className="mismatch">
          <strong>자막이 이 스펙의 낭독이 아닌 것 같다 — 한 씬도 맞추지 못했다.</strong>
          <p>
            <span>자막 첫 줄</span>
            {mismatch.cue}
          </p>
          <p>
            <span>씬의 첫 대사</span>
            {mismatch.say || "(say 가 없다)"}
          </p>
        </div>
      )}

      <ul className="issues">
        {errors.map((e, i) => issue(e, "err", "✗", `e${i}`))}
        {warnings.map((w, i) => issue(w, "warn", "!", `w${i}`))}
      </ul>

      {clean && !stats && <p className="dim pad">씬을 추가하면 검증이 돈다.</p>}
    </div>
  );
}
