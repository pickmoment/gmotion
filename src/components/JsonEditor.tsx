/** 스펙 원문 편집. 폼이 못 다루는 필드나 통째로 붙여넣을 때 쓴다. */
import { useEffect, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import type { Spec } from "../engine/types";

export function JsonEditor({ spec, onChange }: { spec: Spec; onChange: (s: Spec) => void }) {
  const [text, setText] = useState(() => JSON.stringify(spec, null, 2));
  const [err, setErr] = useState("");
  /* 내가 친 편집이 되돌아와 커서를 튕기지 않게 한다 */
  const mine = useRef(false);

  useEffect(() => {
    if (mine.current) {
      mine.current = false;
      return;
    }
    setText(JSON.stringify(spec, null, 2));
    setErr("");
  }, [spec]);

  return (
    <div className="pane-body json-editor">
      <div className="json-bar">
        {err ? <span className="warn-inline">{err}</span> : <span className="dim">JSON 이 유효하면 즉시 반영된다</span>}
      </div>
      <CodeMirror
        value={text}
        theme={oneDark}
        extensions={[json()]}
        basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
        onChange={(v) => {
          setText(v);
          try {
            const parsed = JSON.parse(v) as Spec;
            if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.scenes)) {
              setErr("scenes 배열이 있어야 한다");
              return;
            }
            setErr("");
            mine.current = true;
            onChange(parsed);
          } catch (e) {
            setErr((e as Error).message);
          }
        }}
      />
    </div>
  );
}
