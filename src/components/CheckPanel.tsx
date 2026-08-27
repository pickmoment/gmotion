/** 산출물 기계 검수 결과 — `gm check` 와 같은 항목. OK 는 정책 준수일 뿐 그림이 좋다는 뜻이 아니다. */
import type { CheckLine } from "../lib/build";

export function CheckPanel({
  lines,
  info,
  fail,
  onClose,
}: {
  lines: CheckLine[];
  info: string;
  fail: number;
  onClose: () => void;
}) {
  return (
    <div className="modal" role="dialog" aria-label="산출물 검수">
      <div className="modal-box">
        <div className="pane-head">
          <h2>
            산출물 검수
            <span className={`pill ${fail ? "bad" : "ok"}`}>{fail ? `${fail}건` : "통과"}</span>
          </h2>
          <button type="button" className="ghost" onClick={onClose}>닫기</button>
        </div>
        <ul className="check">
          {lines.map((l, i) => (
            <li key={i} className={l.ok ? "ok" : "bad"}>
              <span>{l.ok ? "OK" : "MISS"}</span>
              <div>
                {l.label}
                {l.why && <p className="hint">← {l.why}</p>}
              </div>
            </li>
          ))}
        </ul>
        <p className="stats">{info}</p>
        <p className="hint">
          기계 검수는 글자가 넘치는지·요소가 겹치는지를 잡지 못한다. 미리보기에서 씬을 하나씩 눈으로 본다.
        </p>
      </div>
    </div>
  );
}
