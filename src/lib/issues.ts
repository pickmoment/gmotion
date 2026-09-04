/**
 * 검증 메시지 ↔ 씬 연결.
 *
 * 엔진은 씬에 관한 오류·경고를 `씬 N: …` 또는 `씬 N (id|pattern): …` 로 시작한다
 * (gsapgraph.js 의 `tag`·`patErr`). 그 접두를 읽어 씬 번호를 뽑는다 — 메시지를 눌러
 * 씬으로 가고, 씬 목록에 배지를 달기 위한 것이다. 접두가 없으면 문서 전체에 대한 지적이다.
 */
import type { ValidateResult } from "../engine/types";

const PREFIX = /^씬 (\d+)(?: \([^)]*\))?: /;

/** 메시지가 가리키는 씬의 0 기반 인덱스. 씬에 대한 것이 아니면 null. */
export function issueScene(message: string): number | null {
  const m = PREFIX.exec(message);
  return m ? Number(m[1]) - 1 : null;
}

export interface SceneIssues {
  errors: number;
  warnings: number;
}

/** 씬 인덱스로 찍는 오류·경고 개수. 지적이 없는 씬 자리는 비어 있다. */
export function issuesByScene(result: ValidateResult): (SceneIssues | undefined)[] {
  const out: (SceneIssues | undefined)[] = [];
  const bump = (msgs: string[], key: keyof SceneIssues) => {
    for (const m of msgs) {
      const i = issueScene(m);
      if (i === null) continue;
      const cur = out[i] ?? { errors: 0, warnings: 0 };
      cur[key] += 1;
      out[i] = cur;
    }
  };
  bump(result.errors, "errors");
  bump(result.warnings, "warnings");
  return out;
}
