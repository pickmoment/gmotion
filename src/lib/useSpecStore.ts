/** 스펙 상태 + 실행 취소. 히스토리는 JSON 스냅샷이라 단순하고 충분히 빠르다. */
import { useCallback, useRef, useState } from "react";
import type { Spec } from "../engine/types";
import { EMPTY_SPEC, cloneSpec } from "./spec";

const LIMIT = 120;

export function useSpecStore(initial: Spec = EMPTY_SPEC) {
  const [spec, setSpecRaw] = useState<Spec>(initial);
  const [dirty, setDirty] = useState(false);
  const past = useRef<string[]>([]);
  const future = useRef<string[]>([]);
  const [, bump] = useState(0);

  /** 편집 한 번 = 히스토리 한 칸. */
  const update = useCallback((fn: (s: Spec) => Spec) => {
    setSpecRaw((cur) => {
      const next = fn(cur);
      if (next === cur) return cur;
      past.current.push(JSON.stringify(cur));
      if (past.current.length > LIMIT) past.current.shift();
      future.current = [];
      setDirty(true);
      bump((n) => n + 1);
      return next;
    });
  }, []);

  /** 파일을 열었을 때처럼 히스토리를 버리고 갈아끼운다. */
  const reset = useCallback((next: Spec) => {
    past.current = [];
    future.current = [];
    setDirty(false);
    setSpecRaw(cloneSpec(next));
    bump((n) => n + 1);
  }, []);

  const undo = useCallback(() => {
    setSpecRaw((cur) => {
      const prev = past.current.pop();
      if (!prev) return cur;
      future.current.push(JSON.stringify(cur));
      setDirty(true);
      bump((n) => n + 1);
      return JSON.parse(prev) as Spec;
    });
  }, []);

  const redo = useCallback(() => {
    setSpecRaw((cur) => {
      const next = future.current.pop();
      if (!next) return cur;
      past.current.push(JSON.stringify(cur));
      setDirty(true);
      bump((n) => n + 1);
      return JSON.parse(next) as Spec;
    });
  }, []);

  return {
    spec,
    update,
    reset,
    undo,
    redo,
    dirty,
    markSaved: () => setDirty(false),
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
