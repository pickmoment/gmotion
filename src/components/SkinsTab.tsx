/**
 * 디자인 스튜디오 — 스킨 탭.
 *
 * 스킨은 **디자인 프리미티브의 구현부**다. 표면·모서리·블러·연결선·타이포의 값
 * 묶음이고, 스타일시트의 클래스 170종이 그 값만 읽는다. 그래서 여기서 값 몇 개를
 * 바꾸면 산출물 전체의 재질이 따라 바뀐다.
 *
 * 편집기는 **비워 두면 물려받는다**는 규칙으로 동작한다 — 입력칸이 비어 있으면
 * 기반 스킨(extends)의 값이 그대로 쓰이고, 채운 것만 `vars` 에 들어간다. 스킨을
 * "바꾸고 싶은 것만 적은 문서"로 유지하려는 것이다.
 */
import { useMemo, useState } from "react";
import type { SkinDefinition } from "../engine/types";
import { designTokenContract, listSkins, skinPreviewVars } from "../lib/design";
import { designStore, useDesignStore } from "../lib/designStore";
import { GG } from "../engine/boot";

const GROUP_ORDER = [
  "표면",
  "모서리 반경",
  "배경 블러",
  "링",
  "연결선",
  "타이포",
  "광채",
  "화면 자막",
];

type Draft = {
  key: string;
  label: string;
  base: string;
  vars: Record<string, string>;
  css: string;
  dark: boolean;
  isNew: boolean;
};

function SkinPreview({
  skin,
  theme,
  tall,
}: {
  skin: string | SkinDefinition;
  theme: string;
  tall?: boolean;
}) {
  const vars = useMemo(() => skinPreviewVars(skin, theme), [skin, theme]);
  return (
    <div
      className={`skin-swatch skin-swatch-md${tall ? " skin-swatch-tall" : ""}`}
      style={vars as React.CSSProperties}
    >
      <div className="skin-swatch-bg" />
      <div className="skin-swatch-card">
        <i />
        <b />
      </div>
      <div className="skin-swatch-card skin-swatch-card-2">
        <i />
        <b />
      </div>
      <svg className="skin-swatch-link" viewBox="0 0 100 40" aria-hidden="true">
        <path d="M18 20 Q50 8 82 20" />
      </svg>
    </div>
  );
}

export function SkinsTab({
  q,
  setQ,
  cat,
  setCat,
  currentTheme,
  currentSkin,
  onApplySkin,
  onNotify,
}: {
  q: string;
  setQ: (q: string) => void;
  cat: string;
  setCat: (c: string) => void;
  currentTheme: string;
  currentSkin?: string;
  onApplySkin?: (key: string) => void;
  onNotify?: (msg: string) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const { library } = useDesignStore();
  /* 커스텀 스킨을 저장·삭제하면 라이브러리가 바뀌고, 그때 목록을 다시 읽는다 */
  const skins = useMemo(() => listSkins(), [library.skins]);
  const contract = useMemo(() => designTokenContract(), []);

  const filtered = useMemo(
    () =>
      skins.filter((s) => {
        if (cat === "기본" && s.custom) return false;
        if (cat === "커스텀" && !s.custom) return false;
        if (q.trim()) {
          const query = q.toLowerCase();
          return s.key.toLowerCase().includes(query) || s.label.toLowerCase().includes(query);
        }
        return true;
      }),
    [skins, cat, q],
  );

  /* 기반 스킨의 값 — 편집기의 placeholder 가 된다. 비워 두면 이 값이 쓰인다. */
  const inherited = useMemo(
    () => (draft ? GG.resolveSkin(draft.base, currentTheme, "16:9").vars : {}),
    [draft?.base, currentTheme],
  );

  /* 지금 편집 중인 상태를 그대로 스킨 정의로 — 미리보기와 저장이 같은 것을 본다 */
  const draftDef = useMemo((): SkinDefinition | null => {
    if (!draft) return null;
    const vars: Record<string, string> = {};
    for (const [k, v] of Object.entries(draft.vars)) if (v.trim()) vars[k] = v.trim();
    const css = draft.css
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return {
      extends: draft.base,
      name: draft.key,
      label: draft.label,
      dark: draft.dark,
      vars,
      ...(css.length ? { css } : {}),
    };
  }, [draft]);

  const startEdit = (key: string) => {
    const existing = designStore.skinDefOf(key);
    setDraft({
      key,
      label: existing?.label || existing?.name || key,
      base: existing?.extends || "glass",
      vars: { ...(existing?.vars || {}) },
      css: (existing?.css || []).join("\n"),
      dark: !!existing?.dark,
      isNew: false,
    });
  };

  const startClone = (key: string) => {
    const existing = designStore.skinDefOf(key);
    const n = Object.keys(designStore.getLibrary().skins).length + 1;
    setDraft({
      key: `mySkin${n}`,
      label: `${key} 기반 커스텀 스킨`,
      base: existing?.extends || key,
      vars: { ...(existing?.vars || {}) },
      css: (existing?.css || []).join("\n"),
      dark: !!existing?.dark,
      isNew: true,
    });
  };

  const save = () => {
    if (!draft || !draftDef) return;
    const key = draft.key.trim();
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(key)) {
      onNotify?.("스킨 키는 영문으로 시작하는 영문·숫자·- _ 조합이어야 한다");
      return;
    }
    const bad = Object.keys(draftDef.vars || {}).filter((k) => !contract.some((c) => c.key === k));
    if (bad.length) {
      onNotify?.(`계약에 없는 토큰: ${bad.join(" ")}`);
      return;
    }
    designStore.addSkin(key, draftDef);
    onNotify?.(`스킨 "${key}" 를 저장했다 — 문서 설정의 스킨 목록에서 고를 수 있다`);
    setDraft(null);
  };

  const copyInline = () => {
    if (!draftDef) return;
    const snippet = JSON.stringify({ skin: draftDef }, null, 2);
    void navigator.clipboard.writeText(snippet).then(
      () => onNotify?.("스펙에 붙일 JSON 을 복사했다 — 파일 한 장으로 모습이 재현된다"),
      () => onNotify?.("복사에 실패했다"),
    );
  };

  const grouped = useMemo(() => {
    const map = new Map<string, typeof contract>();
    for (const t of contract) {
      const arr = map.get(t.group) || [];
      arr.push(t);
      map.set(t.group, arr);
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => ({ group: g, tokens: map.get(g)! }));
  }, [contract]);

  return (
    <div className="tab-pane-view">
      <div className="tab-filter-bar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="스킨 검색 (이름, 영문 키)..."
          className="search-input"
        />
        <div className="tab-pills">
          {["전체", "기본", "커스텀"].map((c) => (
            <button
              key={c}
              type="button"
              className={cat === c ? "on" : ""}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <p className="hint studio-lead">
        테마가 <strong>색</strong>을, 스킨이 <strong>재질</strong>을 정한다. 스킨은 디자인
        프리미티브 {contract.length}종의 값 묶음이고, 스타일시트의 클래스가 그 값만 읽으므로 스킨
        하나를 갈면 카드·노드· 스텝·칩·패널·연결선이 전부 따라온다.
      </p>

      {draft ? (
        <div className="skin-editor">
          <div className="skin-editor-side">
            <div className="skin-editor-preview">
              <SkinPreview skin={draftDef || draft.base} theme={currentTheme} tall />
              <p className="hint">테마 {currentTheme} 위에서 본 모습</p>
            </div>
            <div className="field">
              <label>키 (스펙에 적는 이름)</label>
              <input
                value={draft.key}
                onChange={(e) => setDraft({ ...draft, key: e.target.value })}
                disabled={!draft.isNew}
              />
            </div>
            <div className="field">
              <label>설명</label>
              <input
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              />
            </div>
            <div className="field">
              <label>기반 스킨</label>
              <select
                value={draft.base}
                onChange={(e) => setDraft({ ...draft, base: e.target.value })}
              >
                {skins
                  .filter((s) => s.key !== draft.key)
                  .map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.key} — {s.label.split("—")[0].trim()}
                    </option>
                  ))}
              </select>
              <p className="hint">비워 둔 토큰은 이 스킨의 값을 물려받는다</p>
            </div>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={draft.dark}
                onChange={(e) => setDraft({ ...draft, dark: e.target.checked })}
              />
              어두운 배경 전용 (밝은 테마에 얹으면 검증이 경고한다)
            </label>
            <div className="field">
              <label>추가 CSS (한 줄에 한 규칙)</label>
              <textarea
                rows={3}
                value={draft.css}
                onChange={(e) => setDraft({ ...draft, css: e.target.value })}
                placeholder=".gg-card{text-transform:uppercase}"
              />
              <p className="hint">프리미티브로 표현할 수 없는 것만. 기본 규칙 뒤에 실린다</p>
            </div>
            <div className="skin-editor-actions">
              <button type="button" className="action-btn apply-btn" onClick={save}>
                저장
              </button>
              <button
                type="button"
                className="action-btn"
                onClick={copyInline}
                title="스펙 JSON 으로 복사"
              >
                스펙에 인라인 복사
              </button>
              <button type="button" className="action-btn" onClick={() => setDraft(null)}>
                취소
              </button>
            </div>
          </div>

          <div className="skin-editor-tokens">
            {grouped.map(({ group, tokens }) => (
              <div className="skin-token-group" key={group}>
                <h5>{group}</h5>
                {tokens.map((t) => {
                  const v = draft.vars[t.key] ?? "";
                  return (
                    <div className="skin-token-row" key={t.key}>
                      <label htmlFor={`tok-${t.key}`}>
                        {t.key}
                        <small>{t.doc}</small>
                      </label>
                      <input
                        id={`tok-${t.key}`}
                        className={v.trim() ? "changed" : ""}
                        value={v}
                        placeholder={inherited[t.key] ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, vars: { ...draft.vars, [t.key]: e.target.value } })
                        }
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="skin-studio-grid">
          {filtered.map((s) => (
            <div className={`skin-studio-card${s.key === currentSkin ? " on" : ""}`} key={s.key}>
              <SkinPreview skin={s.key} theme={currentTheme} />
              <div className="skin-studio-meta">
                <strong>{s.key}</strong>
                {s.custom && <span className="badge-custom">커스텀</span>}
                {s.dark && (
                  <span className="badge-dark" title="어두운 테마 전용">
                    다크
                  </span>
                )}
              </div>
              <p className="skin-card-desc">{s.label}</p>
              <div className="studio-card-actions">
                {onApplySkin && (
                  <button
                    type="button"
                    className="action-btn apply-btn"
                    onClick={() => onApplySkin(s.key)}
                  >
                    적용
                  </button>
                )}
                {s.custom ? (
                  <>
                    <button type="button" className="action-btn" onClick={() => startEdit(s.key)}>
                      편집
                    </button>
                    <button
                      type="button"
                      className="action-btn del-btn"
                      onClick={() => {
                        designStore.deleteSkin(s.key);
                        onNotify?.(`스킨 "${s.key}" 를 지웠다`);
                      }}
                    >
                      삭제
                    </button>
                  </>
                ) : (
                  <button type="button" className="action-btn" onClick={() => startClone(s.key)}>
                    복제해서 편집
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
