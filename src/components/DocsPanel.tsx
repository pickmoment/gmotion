/**
 * 번들 안의 레퍼런스를 앱에서 읽는다. 스킬 디렉토리가 아니라 바이너리 안의 것을 본다 —
 * 스킬을 설치하지 않아도 같은 문서를 볼 수 있다.
 */
import { useEffect, useState } from "react";
import { api } from "../lib/tauri";

const DOCS: { path: string; label: string; note: string }[] = [
  { path: "references/direction.md", label: "연출", note: "내러티브 아크, 패턴 고르기, 밀도·리듬, 흔한 실패" },
  { path: "references/spec.md", label: "스펙", note: "루트·씬 공통 필드, 패턴 20종의 필드와 예시" },
  { path: "references/charts.md", label: "차트", note: "어떤 차트인가, 색은 어떤 일을 하는가" },
  { path: "references/theming.md", label: "테마", note: "테마·화면비·에너지·재생 모드·모션 토큰" },
  { path: "references/api.md", label: "API", note: "CLI, 검수 쿼리, 산출물 구조, 자막 동기화" },
  { path: "MANUAL.md", label: "설명서", note: "CLI 를 직접 쓸 때 보는 문서" },
  { path: "SKILL.md", label: "스킬", note: "워크플로와 원칙" },
];

export function DocsPanel({ onClose }: { onClose: () => void }) {
  const [sel, setSel] = useState(DOCS[0].path);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .skillFile(sel)
      .then((t) => { setText(t); setErr(""); })
      .catch((e) => setErr(String(e)));
  }, [sel]);

  return (
    <div className="modal" role="dialog" aria-label="레퍼런스 문서">
      <div className="modal-box wide">
        <div className="pane-head">
          <h2>레퍼런스</h2>
          <button type="button" className="ghost" onClick={onClose}>닫기</button>
        </div>
        <div className="docs">
          <nav>
            {DOCS.map((d) => (
              <button key={d.path} type="button" className={d.path === sel ? "on" : ""} onClick={() => setSel(d.path)}>
                <strong>{d.label}</strong>
                <span className="dim">{d.note}</span>
              </button>
            ))}
          </nav>
          <pre className="doc-body">{err || text}</pre>
        </div>
      </div>
    </div>
  );
}
