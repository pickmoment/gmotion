/** 스타터 예제 — 백지에서 쓰지 않고 가장 가까운 걸 열어 갈아끼운다. */
import type { Spec } from "../engine/types";

const raw = import.meta.glob("../../vendor/gmotion/assets/examples/*.json", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const NOTES: Record<string, string> = {
  "starter-story": "문제 → 해결 (7씬 28초, midnight, 16:9)",
  "starter-arch": "전체 → 부분 구조 설명 (4씬 35초, midnight, E1)",
  "starter-report": "지표 축적 (5씬 19초, paper, step) — 발표자 노트가 채워진 예제",
  "starter-intro": "시리즈 오프닝 (3씬 8초, ink, E3, 매치컷)",
  "starter-shorts": "쇼츠 (4씬 8초, neon, 9:16, E3)",
  "starter-vectors": "벡터 세트 쇼케이스 — 마크·배지·리본·일러스트·프레임",
  "starter-charts": "차트 쇼케이스 — 13씬, 데이터의 일마다 다른 형태",
  "starter-effects": "효과 쇼케이스 — 모프·곡선 경로·스크램블·롤·마퀴",
  "starter-narrated": "자막 동기화 — 씬·항목에 say 를 단 예 (5씬 62초)",
  "starter-fonts": "폰트 비교 — font 를 바꿔 가며 글자꼴을 고른다",
  "starter-paper":
    "종이 모션 쇼케이스 — 크래프트 테마, 접힘선·줄노트 배경, 페이지 넘김·종이 떼기 전환, 노트 프레임",
  "starter-clay":
    "클레이 애니메이션 쇼케이스 — 클레이 테마, 3D 점토 블롭 배경, 클레이 팝·스쿼시 탄성 전환, 점토 보드 프레임",
  "starter-skins":
    "스킨 쇼케이스 — 씬마다 재질을 갈아 끼운 예 (8씬 36초, ink). 6종 + 인라인 커스텀을 한 파일에서 본다",
};

const LIST = Object.entries(raw)
  .map(([path, text]) => {
    const name = path
      .split(/[/\\]/)
      .pop()!
      .replace(/\.json$/, "");
    return { name, text, note: NOTES[name] ?? "" };
  })
  .sort((a, b) => a.name.localeCompare(b.name));

export function ExamplesPanel({
  onPick,
  onClose,
}: {
  onPick: (s: Spec, name: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="modal" role="dialog" aria-label="예제">
      <div className="modal-box">
        <div className="pane-head">
          <h2>스타터 예제 {LIST.length}종</h2>
          <button type="button" className="ghost" onClick={onClose}>
            닫기
          </button>
        </div>
        <p className="hint">여는 순간 편집 중인 내용을 대체한다.</p>
        <div className="example-list">
          {LIST.map((e) => (
            <button
              key={e.name}
              type="button"
              onClick={() => onPick(JSON.parse(e.text) as Spec, e.name)}
            >
              <strong>{e.name}</strong>
              <span className="dim">{e.note}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
