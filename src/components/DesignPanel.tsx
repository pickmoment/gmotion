import { useMemo, useRef, useState } from "react";
import { GG, ICONS, THEMES_REGISTRY, VECTORS } from "../engine/boot";
import type { CustomDesignLibrary, ThemeColors, ThemeDefinition } from "../engine/types";
import {
  DECOR_CATEGORIES,
  FRAME_CATEGORIES,
  ICON_CATEGORIES,
  MARK_CATEGORIES,
  MOOD_PALETTES,
  checkThemeContrast,
  extractSvgPath,
  generateArtSvg,
  generateDecorSvg,
  generateFrameSvg,
  generateMarkSvg,
  isDarkTheme,
  renderArtSvg,
  renderDecorSvg,
  renderFrameSvg,
  renderMarkSvg,
  resolveThemeColors,
} from "../lib/design";
import { MAX_IMAGE_LEN, useDesignStore } from "../lib/designStore";
import { IconGlyph } from "./fields/IconPicker";
import { SkinsTab } from "./SkinsTab";
import { listSkins } from "../lib/design";

export type DesignTab =
  "themes" | "skins" | "decors" | "marks" | "arts" | "frames" | "icons" | "tokens";

export function DesignPanel({
  onClose,
  currentTheme = "midnight",
  currentSkin,
  onApplySkin,
  onApplyTheme,
  onApplyDecor,
  onApplyMark,
  onApplyArt,
  onApplyFrame,
  onNotify,
}: {
  onClose: () => void;
  currentTheme?: string;
  currentSkin?: string;
  onApplySkin?: (skinKey: string) => void;
  onApplyTheme?: (themeKey: string) => void;
  onApplyDecor?: (decorKey: string) => void;
  onApplyMark?: (markKey: string) => void;
  onApplyArt?: (artKey: string) => void;
  onApplyFrame?: (frameKey: string) => void;
  onNotify?: (msg: string) => void;
}) {
  const [tab, setTab] = useState<DesignTab>("themes");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("전체");

  const {
    library,
    addTheme,
    updateTheme,
    deleteTheme,
    addIcon,
    deleteIcon,
    addArt,
    deleteArt,
    addMark,
    deleteMark,
    addDecor,
    deleteDecor,
    addFrame,
    deleteFrame,
    exportLibraryJSON,
    importLibraryJSON,
  } = useDesignStore();

  /* ── Sub Editor Modal States ── */
  const [editingTheme, setEditingTheme] = useState<{
    isNew: boolean;
    key: string;
    def: ThemeDefinition;
  } | null>(null);
  const [editingIcon, setEditingIcon] = useState<{
    isNew: boolean;
    key: string;
    path: string;
    aliases: string[];
    label: string;
  } | null>(null);
  const [editingArt, setEditingArt] = useState<{
    isNew: boolean;
    key: string;
    label: string;
    svg: string;
    image?: string;
    fit?: "contain" | "cover";
  } | null>(null);
  const [editingMark, setEditingMark] = useState<{
    isNew: boolean;
    key: string;
    label: string;
    where: "under" | "around" | "behind" | "point" | "corner" | "ribbon";
    svg: string;
    draw: boolean;
    text: boolean;
  } | null>(null);
  const [editingDecor, setEditingDecor] = useState<{
    isNew: boolean;
    key: string;
    label: string;
    category: string;
    svg: string;
    image?: string;
    fit?: "contain" | "cover";
  } | null>(null);
  const [editingFrame, setEditingFrame] = useState<{
    isNew: boolean;
    key: string;
    label: string;
    ratio: number;
    svg: string;
    bar?: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Export & Import ── */
  const handleExport = () => {
    const json = exportLibraryJSON();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gmotion-custom-design-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.("커스텀 디자인 라이브러리가 JSON 파일로 저장되었습니다.");
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = String(evt.target?.result || "");
      const res = importLibraryJSON(text);
      if (res.success) {
        onNotify?.(
          `디자인 요소 ${res.count}개를 불러왔다${res.skipped ? ` (형식이 맞지 않아 ${res.skipped}개는 건너뛰었다)` : ""}.`,
        );
      } else {
        alert(`가져오기 실패: ${res.error}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /* ── Tab Counts ── */
  const counts = useMemo(() => {
    const defaultThemesCount = Object.keys(THEMES_REGISTRY).length;
    const customThemesCount = Object.keys(library.themes).filter((k) => !THEMES_REGISTRY[k]).length;

    const defaultDecorsCount = Object.keys(VECTORS.DECOR).length;
    const customDecorsCount = Object.keys(library.decors).filter((k) => !VECTORS.DECOR[k]).length;

    const defaultMarksCount = Object.keys(VECTORS.MARK).length;
    const customMarksCount = Object.keys(library.marks).filter((k) => !VECTORS.MARK[k]).length;

    const defaultArtsCount = Object.keys(VECTORS.ART).length;
    const customArtsCount = Object.keys(library.arts).filter((k) => !VECTORS.ART[k]).length;

    const defaultFramesCount = Object.keys(VECTORS.FRAME).length;
    const customFramesCount = Object.keys(library.frames).filter((k) => !VECTORS.FRAME[k]).length;

    const defaultIconsCount = ICONS.count;
    const customIconsCount = Object.keys(library.icons).length;

    return {
      themes: defaultThemesCount + customThemesCount,
      /* 스킨은 등록 레지스트리 하나에 기본·커스텀이 함께 들어 있다 */
      skins: listSkins().length,
      decors: defaultDecorsCount + customDecorsCount,
      marks: defaultMarksCount + customMarksCount,
      arts: defaultArtsCount + customArtsCount,
      frames: defaultFramesCount + customFramesCount,
      icons: defaultIconsCount + customIconsCount,
    };
  }, [library]);

  /* ── Open New Item modal based on active tab ── */
  const handleAddNew = () => {
    if (tab === "themes") {
      const base = resolveThemeColors(currentTheme);
      setEditingTheme({
        isNew: true,
        key: `customTheme${Object.keys(library.themes).length + 1}`,
        def: {
          label: "커스텀 테마 — 나만의 브랜드 색상",
          ...base,
          font: "display",
          grain: 0.04,
          vig: 0.4,
          glow: 1,
          decor: ["blob", "grid"],
        },
      });
    } else if (tab === "decors") {
      setEditingDecor({
        isNew: true,
        key: `customDecor${Object.keys(library.decors).length + 1}`,
        label: "커스텀 배경 — 나만의 그래픽 패턴",
        category: "기하·격자",
        svg: `<circle cx="{W}*0.5" cy="{H}*0.5" r="100" fill="{accent}" opacity="0.2"/>`,
      });
    } else if (tab === "marks") {
      setEditingMark({
        isNew: true,
        key: `customMark${Object.keys(library.marks).length + 1}`,
        label: "커스텀 강조 마크",
        where: "under",
        svg: `<svg class="gg-mark gg-mk-under" viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true"><path d="M2 10 Q50 2 98 10" stroke="{accent}" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,
        draw: true,
        text: false,
      });
    } else if (tab === "arts") {
      setEditingArt({
        isNew: true,
        key: `customArt${Object.keys(library.arts).length + 1}`,
        label: "커스텀 일러스트",
        svg: `<g class="gg-artP"><circle cx="100" cy="100" r="70" fill="{accent}" fill-opacity="0.15" stroke="{accent}" stroke-width="3"/><rect x="70" y="70" width="60" height="60" rx="8" fill="{accent2}"/></g>`,
      });
    } else if (tab === "frames") {
      setEditingFrame({
        isNew: true,
        key: `customFrame${Object.keys(library.frames).length + 1}`,
        label: "커스텀 프레임",
        ratio: 16 / 10,
        svg: `<rect x="2" y="2" width="{W}-4" height="{H}-4" rx="16" fill="{bg2}" stroke="{accent}" stroke-width="3"/>`,
      });
    } else if (tab === "icons") {
      setEditingIcon({
        isNew: true,
        key: `customStar`,
        label: "커스텀 별 아이콘",
        aliases: ["별", "스타", "커스텀별"],
        path: "M12 2l3 7h7l-5.5 4.5 2 7.5-6.5-5-6.5 5 2-7.5L2 9h7z",
      });
    }
  };

  return (
    <div className="modal design-studio-modal" role="dialog" aria-label="디자인 스튜디오">
      <div className="modal-box design-modal-box">
        {/* ── Studio Header ── */}
        <header className="design-modal-head">
          <div className="design-head-title">
            <h2>🎨 디자인 스튜디오 &amp; 요소 관리</h2>
            <span className="dim">테마·배경·마크·일러스트·프레임·아이콘 탐색 및 커스텀 제작</span>
          </div>

          <div className="design-head-actions">
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept=".json,application/json"
              onChange={handleImportFile}
            />
            <button
              type="button"
              className="ghost"
              onClick={() => fileInputRef.current?.click()}
              title="JSON 파일에서 불러오기"
            >
              📥 JSON 가져오기
            </button>
            <button
              type="button"
              className="ghost"
              onClick={handleExport}
              title="커스텀 라이브러리를 JSON 파일로 저장"
            >
              📤 JSON 내보내기
            </button>
            {tab !== "tokens" && (
              <button
                type="button"
                className="primary"
                onClick={handleAddNew}
                title="새로운 디자인 요소 생성"
              >
                ＋ 신규 추가
              </button>
            )}
            <button type="button" className="ghost close-btn" onClick={onClose} title="닫기 (ESC)">
              ×
            </button>
          </div>
        </header>

        {/* ── Studio Tab Bar ── */}
        <nav className="design-tabs-nav">
          <button
            type="button"
            className={tab === "themes" ? "on" : ""}
            onClick={() => {
              setTab("themes");
              setCat("전체");
              setQ("");
            }}
          >
            테마 ({counts.themes})
          </button>
          <button
            type="button"
            className={tab === "skins" ? "on" : ""}
            onClick={() => {
              setTab("skins");
              setCat("전체");
              setQ("");
            }}
          >
            스킨 ({counts.skins})
          </button>
          <button
            type="button"
            className={tab === "decors" ? "on" : ""}
            onClick={() => {
              setTab("decors");
              setCat("전체");
              setQ("");
            }}
          >
            배경 ({counts.decors})
          </button>
          <button
            type="button"
            className={tab === "marks" ? "on" : ""}
            onClick={() => {
              setTab("marks");
              setCat("전체");
              setQ("");
            }}
          >
            마크 ({counts.marks})
          </button>
          <button
            type="button"
            className={tab === "arts" ? "on" : ""}
            onClick={() => {
              setTab("arts");
              setCat("전체");
              setQ("");
            }}
          >
            일러스트 ({counts.arts})
          </button>
          <button
            type="button"
            className={tab === "frames" ? "on" : ""}
            onClick={() => {
              setTab("frames");
              setCat("전체");
              setQ("");
            }}
          >
            프레임 ({counts.frames})
          </button>
          <button
            type="button"
            className={tab === "icons" ? "on" : ""}
            onClick={() => {
              setTab("icons");
              setCat("전체");
              setQ("");
            }}
          >
            아이콘 ({counts.icons})
          </button>
          <button
            type="button"
            className={tab === "tokens" ? "on" : ""}
            onClick={() => {
              setTab("tokens");
              setCat("전체");
              setQ("");
            }}
          >
            토큰 가이드
          </button>
        </nav>

        {/* ── Tab Content ── */}
        <main className="design-tab-content">
          {tab === "skins" && (
            <SkinsTab
              q={q}
              setQ={setQ}
              cat={cat}
              setCat={setCat}
              currentTheme={currentTheme}
              currentSkin={currentSkin}
              onApplySkin={onApplySkin}
              onNotify={onNotify}
            />
          )}
          {tab === "themes" && (
            <ThemesTab
              q={q}
              setQ={setQ}
              cat={cat}
              setCat={setCat}
              currentTheme={currentTheme}
              library={library}
              onApplyTheme={(key) => {
                onApplyTheme?.(key);
                onNotify?.(`테마 "${key}" 가 문서에 적용되었습니다.`);
              }}
              onEditTheme={(key, def) => setEditingTheme({ isNew: false, key, def })}
              onCloneTheme={(key, def) =>
                setEditingTheme({
                  isNew: true,
                  key: `${key}Custom`,
                  def: { ...def, label: `${def.label} (복제본)` },
                })
              }
              onDeleteTheme={(key) => {
                if (confirm(`테마 "${key}" 를 삭제하시겠습니까?`)) {
                  deleteTheme(key);
                  onNotify?.(`테마 "${key}" 가 삭제되었습니다.`);
                }
              }}
            />
          )}

          {tab === "decors" && (
            <DecorsTab
              q={q}
              setQ={setQ}
              cat={cat}
              setCat={setCat}
              currentTheme={currentTheme}
              library={library}
              onApplyDecor={(key) => {
                onApplyDecor?.(key);
                onNotify?.(`배경 레이어 "${key}" 가 적용되었습니다.`);
              }}
              onEditDecor={(key, item) =>
                setEditingDecor({
                  isNew: false,
                  key,
                  label: item.label,
                  category: item.category || "기하·격자",
                  svg: item.svg || "",
                  image: item.image,
                  fit: item.fit,
                })
              }
              onCloneDecor={(key, item) =>
                setEditingDecor({
                  isNew: true,
                  key: `${key}Custom`,
                  label: `${item.label} (복제본)`,
                  category: item.category || "기하·격자",
                  svg: item.svg || "",
                  image: item.image,
                  fit: item.fit,
                })
              }
              onDeleteDecor={(key) => {
                if (confirm(`배경 "${key}" 를 삭제하시겠습니까?`)) {
                  deleteDecor(key);
                  onNotify?.(`배경 "${key}" 가 삭제되었습니다.`);
                }
              }}
            />
          )}

          {tab === "marks" && (
            <MarksTab
              q={q}
              setQ={setQ}
              cat={cat}
              setCat={setCat}
              currentTheme={currentTheme}
              library={library}
              onApplyMark={(key) => {
                onApplyMark?.(key);
                onNotify?.(`마크 "${key}" 가 적용되었습니다.`);
              }}
              onEditMark={(key, item) =>
                setEditingMark({
                  isNew: false,
                  key,
                  label: item.label,
                  where: item.where,
                  svg: item.svg,
                  draw: !!item.draw,
                  text: !!item.text,
                })
              }
              onCloneMark={(key, item) =>
                setEditingMark({
                  isNew: true,
                  key: `${key}Custom`,
                  label: `${item.label} (복제본)`,
                  where: item.where,
                  svg: item.svg,
                  draw: !!item.draw,
                  text: !!item.text,
                })
              }
              onDeleteMark={(key) => {
                if (confirm(`마크 "${key}" 를 삭제하시겠습니까?`)) {
                  deleteMark(key);
                  onNotify?.(`마크 "${key}" 가 삭제되었습니다.`);
                }
              }}
            />
          )}

          {tab === "arts" && (
            <ArtsTab
              q={q}
              setQ={setQ}
              currentTheme={currentTheme}
              library={library}
              onApplyArt={(key) => {
                onApplyArt?.(key);
                onNotify?.(`일러스트 "${key}" 가 적용되었습니다.`);
              }}
              onEditArt={(key, item) =>
                setEditingArt({
                  isNew: false,
                  key,
                  label: item.label,
                  svg: item.svg || "",
                  image: item.image,
                  fit: item.fit,
                })
              }
              onCloneArt={(key, item) =>
                setEditingArt({
                  isNew: true,
                  key: `${key}Custom`,
                  label: `${item.label} (복제본)`,
                  svg: item.svg || "",
                  image: item.image,
                  fit: item.fit,
                })
              }
              onDeleteArt={(key) => {
                if (confirm(`일러스트 "${key}" 를 삭제하시겠습니까?`)) {
                  deleteArt(key);
                  onNotify?.(`일러스트 "${key}" 가 삭제되었습니다.`);
                }
              }}
            />
          )}

          {tab === "frames" && (
            <FramesTab
              q={q}
              setQ={setQ}
              cat={cat}
              setCat={setCat}
              currentTheme={currentTheme}
              library={library}
              onApplyFrame={(key) => {
                onApplyFrame?.(key);
                onNotify?.(`프레임 "${key}" 가 적용되었습니다.`);
              }}
              onEditFrame={(key, item) =>
                setEditingFrame({
                  isNew: false,
                  key,
                  label: item.label,
                  ratio: item.ratio,
                  svg: item.svg,
                  bar: item.bar,
                })
              }
              onCloneFrame={(key, item) =>
                setEditingFrame({
                  isNew: true,
                  key: `${key}Custom`,
                  label: `${item.label} (복제본)`,
                  ratio: item.ratio,
                  svg: item.svg,
                  bar: item.bar,
                })
              }
              onDeleteFrame={(key) => {
                if (confirm(`프레임 "${key}" 를 삭제하시겠습니까?`)) {
                  deleteFrame(key);
                  onNotify?.(`프레임 "${key}" 가 삭제되었습니다.`);
                }
              }}
            />
          )}

          {tab === "icons" && (
            <IconsTab
              q={q}
              setQ={setQ}
              cat={cat}
              setCat={setCat}
              library={library}
              onDeleteIcon={(key) => {
                if (confirm(`아이콘 "${key}" 를 삭제하시겠습니까?`)) {
                  deleteIcon(key);
                  onNotify?.(`아이콘 "${key}" 가 삭제되었습니다.`);
                }
              }}
              onNotify={onNotify}
            />
          )}

          {tab === "tokens" && <TokensGuideTab currentTheme={currentTheme} />}
        </main>

        {/* ── Sub Modals ── */}
        {editingTheme && (
          <ThemeEditorModal
            data={editingTheme}
            onClose={() => setEditingTheme(null)}
            onSave={(key, def) => {
              if (editingTheme.isNew) {
                addTheme(key, def);
                onNotify?.(`새 테마 "${key}" 가 등록되었습니다.`);
              } else {
                updateTheme(key, def);
                onNotify?.(`테마 "${key}" 가 업데이트되었습니다.`);
              }
              setEditingTheme(null);
            }}
          />
        )}

        {editingDecor && (
          <DecorEditorModal
            data={editingDecor}
            onClose={() => setEditingDecor(null)}
            onSave={(key, item) => {
              addDecor(key, item);
              onNotify?.(`배경 "${key}" 가 등록되었습니다.`);
              setEditingDecor(null);
            }}
          />
        )}

        {editingMark && (
          <MarkEditorModal
            data={editingMark}
            onClose={() => setEditingMark(null)}
            onSave={(key, item) => {
              addMark(key, item.label, item.where, item.svg, item.draw, item.text);
              onNotify?.(`마크 "${key}" 가 등록되었습니다.`);
              setEditingMark(null);
            }}
          />
        )}

        {editingArt && (
          <ArtEditorModal
            data={editingArt}
            onClose={() => setEditingArt(null)}
            onSave={(key, item) => {
              addArt(key, item);
              onNotify?.(`일러스트 "${key}" 가 등록되었습니다.`);
              setEditingArt(null);
            }}
          />
        )}

        {editingFrame && (
          <FrameEditorModal
            data={editingFrame}
            onClose={() => setEditingFrame(null)}
            onSave={(key, item) => {
              addFrame(key, item.label, item.ratio, item.svg, item.bar);
              onNotify?.(`프레임 "${key}" 가 등록되었습니다.`);
              setEditingFrame(null);
            }}
          />
        )}

        {editingIcon && (
          <IconEditorModal
            data={editingIcon}
            onClose={() => setEditingIcon(null)}
            onSave={(key, item) => {
              addIcon(key, item.path, item.aliases, item.label);
              onNotify?.(`커스텀 아이콘 "${key}" 가 등록되었습니다.`);
              setEditingIcon(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ *
 * 1. 테마 탭 (Themes Tab)
 * ═══════════════════════════════════════════════════════════════════════ */

function ThemesTab({
  q,
  setQ,
  cat,
  setCat,
  currentTheme,
  library,
  onApplyTheme,
  onEditTheme,
  onCloneTheme,
  onDeleteTheme,
}: {
  q: string;
  setQ: (q: string) => void;
  cat: string;
  setCat: (c: string) => void;
  currentTheme: string;
  library: CustomDesignLibrary;
  onApplyTheme: (k: string) => void;
  onEditTheme: (k: string, def: ThemeDefinition) => void;
  onCloneTheme: (k: string, def: ThemeDefinition) => void;
  onDeleteTheme: (k: string) => void;
}) {
  const allThemes = useMemo(() => {
    const list: { key: string; def: ThemeDefinition; custom: boolean; dark: boolean }[] = [];
    const seen = new Set<string>();

    for (const [k, def] of Object.entries(THEMES_REGISTRY)) {
      seen.add(k);
      const custom = !!def.custom || !!library.themes[k];
      const dark = isDarkTheme(def);
      list.push({ key: k, def, custom, dark });
    }

    for (const [k, def] of Object.entries(library.themes)) {
      if (!seen.has(k)) {
        list.push({ key: k, def, custom: true, dark: isDarkTheme(def) });
      }
    }

    return list;
  }, [library.themes]);

  const filtered = useMemo(() => {
    return allThemes.filter((t) => {
      if (cat === "기본" && t.custom) return false;
      if (cat === "커스텀" && !t.custom) return false;
      if (cat === "다크" && !t.dark) return false;
      if (cat === "라이트" && t.dark) return false;
      if (q.trim()) {
        const query = q.toLowerCase();
        return t.key.toLowerCase().includes(query) || t.def.label.toLowerCase().includes(query);
      }
      return true;
    });
  }, [allThemes, cat, q]);

  return (
    <div className="tab-pane-view">
      <div className="tab-filter-bar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="테마 검색 (이름, 영문 키)..."
          className="search-input"
        />
        <div className="tab-pills">
          {["전체", "기본", "커스텀", "다크", "라이트"].map((c) => (
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

      <div className="studio-cards-grid themes-grid">
        {filtered.map((t) => {
          const colors = resolveThemeColors(t.def);
          const contrast = checkThemeContrast(colors);
          const isCurrent = t.key === currentTheme;
          return (
            <div
              key={t.key}
              className={`theme-studio-card ${isCurrent ? "active-border" : ""}`}
              style={{ backgroundColor: colors.bg, color: colors.ink }}
            >
              <div className="theme-card-header">
                <div>
                  <h3 style={{ color: colors.ink }}>
                    {t.key}
                    {isCurrent && <span className="badge-active">적용중</span>}
                  </h3>
                  <span className="dim-sub" style={{ color: colors.ink2 }}>
                    {t.def.label}
                  </span>
                </div>
                <div className="theme-badges-row">
                  {t.custom ? (
                    <span className="badge-custom">커스텀</span>
                  ) : (
                    <span className="badge-default">기본</span>
                  )}
                  <span className="badge-tone">{t.dark ? "Dark" : "Light"}</span>
                </div>
              </div>

              {/* Color Swatch Bar */}
              <div className="studio-swatch-bar">
                <span style={{ backgroundColor: colors.bg2 }} title="bg2" />
                <span style={{ backgroundColor: colors.accent }} title="accent" />
                <span style={{ backgroundColor: colors.accent2 }} title="accent2" />
                <span style={{ backgroundColor: colors.good }} title="good" />
                <span style={{ backgroundColor: colors.warn }} title="warn" />
                <span style={{ backgroundColor: colors.bad }} title="bad" />
                <span style={{ backgroundColor: colors.ink }} title="ink" />
              </div>

              {/* gmotion 역할별 대비 기준과 폰트 정보 */}
              <div className="theme-meta-row" style={{ color: colors.ink2 }}>
                <span
                  title={`역할별 대비 점수: ${contrast.score}% (${contrast.list.filter((x) => x.pass).length}/${contrast.list.length} 통과)`}
                >
                  gmotion 대비: <strong>{contrast.ok ? "100% 통과" : `${contrast.score}%`}</strong>
                </span>
                <span>
                  폰트: <strong>{t.def.font || "display"}</strong>
                </span>
                {t.def.decor && (
                  <span>
                    배경: <strong>{t.def.decor.join(" + ")}</strong>
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="studio-card-actions">
                <button
                  type="button"
                  className="action-btn apply-btn"
                  onClick={() => onApplyTheme(t.key)}
                >
                  문서 테마로 적용
                </button>
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => onCloneTheme(t.key, t.def)}
                >
                  복제하여 수정
                </button>
                {t.custom && (
                  <>
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() => onEditTheme(t.key, t.def)}
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="action-btn del-btn"
                      onClick={() => onDeleteTheme(t.key)}
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {!filtered.length && <p className="dim pad">검색된 테마가 없습니다.</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ *
 * 2. 배경 탭 (Decors Tab)
 * ═══════════════════════════════════════════════════════════════════════ */

function DecorsTab({
  q,
  setQ,
  cat,
  setCat,
  currentTheme,
  library,
  onApplyDecor,
  onEditDecor,
  onCloneDecor,
  onDeleteDecor,
}: {
  q: string;
  setQ: (q: string) => void;
  cat: string;
  setCat: (c: string) => void;
  currentTheme: string;
  library: CustomDesignLibrary;
  onApplyDecor: (k: string) => void;
  onEditDecor: (
    k: string,
    item: {
      label: string;
      category?: string;
      svg?: string;
      image?: string;
      fit?: "contain" | "cover";
    },
  ) => void;
  onCloneDecor: (
    k: string,
    item: {
      label: string;
      category?: string;
      svg?: string;
      image?: string;
      fit?: "contain" | "cover";
    },
  ) => void;
  onDeleteDecor: (k: string) => void;
}) {
  const allDecors = useMemo(() => {
    const list: {
      key: string;
      label: string;
      category: string;
      custom: boolean;
      svg?: string;
      image?: string;
      fit?: "contain" | "cover";
    }[] = [];
    const seen = new Set<string>();

    for (const [k, item] of Object.entries(VECTORS.DECOR)) {
      seen.add(k);
      let foundCat = "기타";
      for (const [cName, keys] of Object.entries(DECOR_CATEGORIES)) {
        if (keys.includes(k)) {
          foundCat = cName;
          break;
        }
      }
      list.push({
        key: k,
        label: item.label || k,
        category: item.category || foundCat,
        custom: !!item.custom || !!library.decors[k],
        svg: library.decors[k]?.svg,
        image: library.decors[k]?.image,
        fit: library.decors[k]?.fit,
      });
    }

    for (const [k, item] of Object.entries(library.decors)) {
      if (!seen.has(k)) {
        list.push({
          key: k,
          label: item.label || k,
          category: item.category || "커스텀",
          custom: true,
          svg: item.svg,
          image: item.image,
          fit: item.fit,
        });
      }
    }

    return list;
  }, [library.decors]);

  const categories = useMemo(() => {
    return ["전체", ...Object.keys(DECOR_CATEGORIES), "커스텀"];
  }, []);

  const filtered = useMemo(() => {
    return allDecors.filter((d) => {
      if (cat === "커스텀" && !d.custom) return false;
      if (cat !== "전체" && cat !== "커스텀" && d.category !== cat) return false;
      if (q.trim()) {
        const query = q.toLowerCase();
        return d.key.toLowerCase().includes(query) || d.label.toLowerCase().includes(query);
      }
      return true;
    });
  }, [allDecors, cat, q]);

  return (
    <div className="tab-pane-view">
      <div className="tab-filter-bar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="배경 검색..."
          className="search-input"
        />
        <div className="tab-pills">
          {categories.map((c) => (
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

      <div className="studio-cards-grid vectors-grid">
        {filtered.map((d) => {
          const svg = renderDecorSvg(d.key, currentTheme, 1, 260, 140);
          return (
            <div key={d.key} className="vector-studio-card">
              <div
                className="vector-preview-box decor-preview"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <div className="vector-card-info">
                <div className="vector-card-title">
                  <strong>{d.key}</strong>
                  {d.custom ? (
                    <span className="badge-custom">커스텀</span>
                  ) : (
                    <span className="badge-cat">{d.category}</span>
                  )}
                </div>
                <p className="dim-sub">{d.label}</p>
              </div>

              <div className="studio-card-actions">
                <button
                  type="button"
                  className="action-btn apply-btn"
                  onClick={() => onApplyDecor(d.key)}
                >
                  배경으로 적용
                </button>
                <button
                  type="button"
                  className="action-btn"
                  onClick={() =>
                    onCloneDecor(d.key, {
                      label: d.label,
                      category: d.category,
                      image: d.image,
                      fit: d.fit,
                      svg: d.image
                        ? undefined
                        : d.svg || `<rect width="{W}" height="{H}" fill="{accent}" opacity="0.1"/>`,
                    })
                  }
                >
                  복제하여 수정
                </button>
                {d.custom && (
                  <>
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() =>
                        onEditDecor(d.key, {
                          label: d.label,
                          category: d.category,
                          svg: d.svg,
                          image: d.image,
                          fit: d.fit,
                        })
                      }
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="action-btn del-btn"
                      onClick={() => onDeleteDecor(d.key)}
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {!filtered.length && <p className="dim pad">검색된 배경이 없습니다.</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ *
 * 3. 마크 탭 (Marks Tab)
 * ═══════════════════════════════════════════════════════════════════════ */

function MarksTab({
  q,
  setQ,
  cat,
  setCat,
  currentTheme,
  library,
  onApplyMark,
  onEditMark,
  onCloneMark,
  onDeleteMark,
}: {
  q: string;
  setQ: (q: string) => void;
  cat: string;
  setCat: (c: string) => void;
  currentTheme: string;
  library: CustomDesignLibrary;
  onApplyMark: (k: string) => void;
  onEditMark: (
    k: string,
    item: {
      label: string;
      where: "under" | "around" | "behind" | "point" | "corner" | "ribbon";
      svg: string;
      draw?: boolean;
      text?: boolean;
    },
  ) => void;
  onCloneMark: (
    k: string,
    item: {
      label: string;
      where: "under" | "around" | "behind" | "point" | "corner" | "ribbon";
      svg: string;
      draw?: boolean;
      text?: boolean;
    },
  ) => void;
  onDeleteMark: (k: string) => void;
}) {
  const allMarks = useMemo(() => {
    const list: {
      key: string;
      label: string;
      where: "under" | "around" | "behind" | "point" | "corner" | "ribbon";
      category: string;
      text: boolean;
      draw: boolean;
      custom: boolean;
      svg?: string;
    }[] = [];
    const seen = new Set<string>();

    for (const [k, item] of Object.entries(VECTORS.MARK)) {
      seen.add(k);
      let foundCat = "밑줄·테두리";
      for (const [cName, keys] of Object.entries(MARK_CATEGORIES)) {
        if (keys.includes(k)) {
          foundCat = cName;
          break;
        }
      }
      list.push({
        key: k,
        label: item.label || k,
        where:
          (item.where as "under" | "around" | "behind" | "point" | "corner" | "ribbon") || "under",
        category: foundCat,
        text: !!item.text,
        draw: !!item.draw,
        custom: !!item.custom || !!library.marks[k],
        svg: library.marks[k]?.svg,
      });
    }

    for (const [k, item] of Object.entries(library.marks)) {
      if (!seen.has(k)) {
        list.push({
          key: k,
          label: item.label || k,
          where: item.where,
          category: "커스텀",
          text: !!item.text,
          draw: !!item.draw,
          custom: true,
          svg: item.svg,
        });
      }
    }

    return list;
  }, [library.marks]);

  const categories = useMemo(() => {
    return ["전체", ...Object.keys(MARK_CATEGORIES), "커스텀"];
  }, []);

  const filtered = useMemo(() => {
    return allMarks.filter((m) => {
      if (cat === "커스텀" && !m.custom) return false;
      if (cat !== "전체" && cat !== "커스텀" && m.category !== cat) return false;
      if (q.trim()) {
        const query = q.toLowerCase();
        return m.key.toLowerCase().includes(query) || m.label.toLowerCase().includes(query);
      }
      return true;
    });
  }, [allMarks, cat, q]);

  return (
    <div className="tab-pane-view">
      <div className="tab-filter-bar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="마크 검색..."
          className="search-input"
        />
        <div className="tab-pills">
          {categories.map((c) => (
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

      <div className="studio-cards-grid vectors-grid">
        {filtered.map((m) => {
          const svg = renderMarkSvg(m.key, currentTheme, m.text ? "NEW" : "강조");
          return (
            <div key={m.key} className="vector-studio-card">
              <div
                className="vector-preview-box mark-preview"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <div className="vector-card-info">
                <div className="vector-card-title">
                  <strong>{m.key}</strong>
                  {m.custom ? (
                    <span className="badge-custom">커스텀</span>
                  ) : (
                    <span className="badge-cat">{m.category}</span>
                  )}
                  <span className="badge-where">{m.where}</span>
                </div>
                <p className="dim-sub">{m.label}</p>
              </div>

              <div className="studio-card-actions">
                <button
                  type="button"
                  className="action-btn apply-btn"
                  onClick={() => onApplyMark(m.key)}
                >
                  마크로 적용
                </button>
                <button
                  type="button"
                  className="action-btn"
                  onClick={() =>
                    onCloneMark(m.key, {
                      label: m.label,
                      where: m.where,
                      svg: m.svg || `<path d="M0 10 L100 10" stroke="{accent}" stroke-width="3"/>`,
                      draw: m.draw,
                      text: m.text,
                    })
                  }
                >
                  복제하여 수정
                </button>
                {m.custom && (
                  <>
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() =>
                        onEditMark(m.key, {
                          label: m.label,
                          where: m.where,
                          svg: m.svg || "",
                          draw: m.draw,
                          text: m.text,
                        })
                      }
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="action-btn del-btn"
                      onClick={() => onDeleteMark(m.key)}
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {!filtered.length && <p className="dim pad">검색된 마크가 없습니다.</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ *
 * 4. 일러스트 탭 (Arts Tab)
 * ═══════════════════════════════════════════════════════════════════════ */

function ArtsTab({
  q,
  setQ,
  currentTheme,
  library,
  onApplyArt,
  onEditArt,
  onCloneArt,
  onDeleteArt,
}: {
  q: string;
  setQ: (q: string) => void;
  currentTheme: string;
  library: CustomDesignLibrary;
  onApplyArt: (k: string) => void;
  onEditArt: (
    k: string,
    item: { label: string; svg?: string; image?: string; fit?: "contain" | "cover" },
  ) => void;
  onCloneArt: (
    k: string,
    item: { label: string; svg?: string; image?: string; fit?: "contain" | "cover" },
  ) => void;
  onDeleteArt: (k: string) => void;
}) {
  const allArts = useMemo(() => {
    const list: {
      key: string;
      label: string;
      custom: boolean;
      svg?: string;
      image?: string;
      fit?: "contain" | "cover";
    }[] = [];
    const seen = new Set<string>();

    for (const [k, item] of Object.entries(VECTORS.ART)) {
      seen.add(k);
      list.push({
        key: k,
        label: item.label || k,
        custom: !!item.custom || !!library.arts[k],
        svg: library.arts[k]?.svg,
        image: library.arts[k]?.image,
        fit: library.arts[k]?.fit,
      });
    }

    for (const [k, item] of Object.entries(library.arts)) {
      if (!seen.has(k)) {
        list.push({
          key: k,
          label: item.label || k,
          custom: true,
          svg: item.svg,
          image: item.image,
          fit: item.fit,
        });
      }
    }

    return list;
  }, [library.arts]);

  const filtered = useMemo(() => {
    if (!q.trim()) return allArts;
    const query = q.toLowerCase();
    return allArts.filter(
      (a) => a.key.toLowerCase().includes(query) || a.label.toLowerCase().includes(query),
    );
  }, [allArts, q]);

  return (
    <div className="tab-pane-view">
      <div className="tab-filter-bar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="일러스트 검색..."
          className="search-input"
        />
      </div>

      <div className="studio-cards-grid vectors-grid">
        {filtered.map((a) => {
          const svg = renderArtSvg(a.key, currentTheme);
          return (
            <div key={a.key} className="vector-studio-card">
              <div
                className="vector-preview-box art-preview"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <div className="vector-card-info">
                <div className="vector-card-title">
                  <strong>{a.key}</strong>
                  {a.custom && <span className="badge-custom">커스텀</span>}
                </div>
                <p className="dim-sub">{a.label}</p>
              </div>

              <div className="studio-card-actions">
                <button
                  type="button"
                  className="action-btn apply-btn"
                  onClick={() => onApplyArt(a.key)}
                >
                  일러스트로 적용
                </button>
                <button
                  type="button"
                  className="action-btn"
                  onClick={() =>
                    onCloneArt(a.key, {
                      label: a.label,
                      image: a.image,
                      fit: a.fit,
                      svg: a.image
                        ? undefined
                        : a.svg ||
                          `<g class="gg-artP"><circle cx="100" cy="100" r="60" fill="{accent}" opacity="0.3"/></g>`,
                    })
                  }
                >
                  복제하여 수정
                </button>
                {a.custom && (
                  <>
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() =>
                        onEditArt(a.key, { label: a.label, svg: a.svg, image: a.image, fit: a.fit })
                      }
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="action-btn del-btn"
                      onClick={() => onDeleteArt(a.key)}
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {!filtered.length && <p className="dim pad">검색된 일러스트가 없습니다.</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ *
 * 5. 프레임 탭 (Frames Tab)
 * ═══════════════════════════════════════════════════════════════════════ */

function FramesTab({
  q,
  setQ,
  cat,
  setCat,
  currentTheme,
  library,
  onApplyFrame,
  onEditFrame,
  onCloneFrame,
  onDeleteFrame,
}: {
  q: string;
  setQ: (q: string) => void;
  cat: string;
  setCat: (c: string) => void;
  currentTheme: string;
  library: CustomDesignLibrary;
  onApplyFrame: (k: string) => void;
  onEditFrame: (
    k: string,
    item: { label: string; ratio: number; svg: string; bar?: number },
  ) => void;
  onCloneFrame: (
    k: string,
    item: { label: string; ratio: number; svg: string; bar?: number },
  ) => void;
  onDeleteFrame: (k: string) => void;
}) {
  const allFrames = useMemo(() => {
    const list: {
      key: string;
      label: string;
      ratio: number;
      category: string;
      custom: boolean;
      svg?: string;
      bar?: number;
    }[] = [];
    const seen = new Set<string>();

    for (const [k, item] of Object.entries(VECTORS.FRAME)) {
      seen.add(k);
      let foundCat = "디바이스";
      for (const [cName, keys] of Object.entries(FRAME_CATEGORIES)) {
        if (keys.includes(k)) {
          foundCat = cName;
          break;
        }
      }
      list.push({
        key: k,
        label: item.label || k,
        ratio: item.ratio || 16 / 9,
        category: foundCat,
        custom: !!item.custom || !!library.frames[k],
        svg: library.frames[k]?.svg,
        bar: library.frames[k]?.bar,
      });
    }

    for (const [k, item] of Object.entries(library.frames)) {
      if (!seen.has(k)) {
        list.push({
          key: k,
          label: item.label || k,
          ratio: item.ratio || 16 / 9,
          category: "커스텀",
          custom: true,
          svg: item.svg,
          bar: item.bar,
        });
      }
    }

    return list;
  }, [library.frames]);

  const categories = useMemo(() => {
    return ["전체", ...Object.keys(FRAME_CATEGORIES), "커스텀"];
  }, []);

  const filtered = useMemo(() => {
    return allFrames.filter((f) => {
      if (cat === "커스텀" && !f.custom) return false;
      if (cat !== "전체" && cat !== "커스텀" && f.category !== cat) return false;
      if (q.trim()) {
        const query = q.toLowerCase();
        return f.key.toLowerCase().includes(query) || f.label.toLowerCase().includes(query);
      }
      return true;
    });
  }, [allFrames, cat, q]);

  return (
    <div className="tab-pane-view">
      <div className="tab-filter-bar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="프레임 검색..."
          className="search-input"
        />
        <div className="tab-pills">
          {categories.map((c) => (
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

      <div className="studio-cards-grid vectors-grid">
        {filtered.map((f) => {
          const res = renderFrameSvg(f.key, currentTheme, 220, 140);
          return (
            <div key={f.key} className="vector-studio-card">
              <div
                className="vector-preview-box frame-preview"
                dangerouslySetInnerHTML={{ __html: res.svg }}
              />
              <div className="vector-card-info">
                <div className="vector-card-title">
                  <strong>{f.key}</strong>
                  {f.custom ? (
                    <span className="badge-custom">커스텀</span>
                  ) : (
                    <span className="badge-cat">{f.category}</span>
                  )}
                  <span className="badge-ratio">
                    {f.ratio ? `${Math.round(f.ratio * 100) / 100}` : "16:9"}
                  </span>
                </div>
                <p className="dim-sub">{f.label}</p>
              </div>

              <div className="studio-card-actions">
                <button
                  type="button"
                  className="action-btn apply-btn"
                  onClick={() => onApplyFrame(f.key)}
                >
                  프레임으로 적용
                </button>
                <button
                  type="button"
                  className="action-btn"
                  onClick={() =>
                    onCloneFrame(f.key, {
                      label: f.label,
                      ratio: f.ratio,
                      svg:
                        f.svg ||
                        `<rect x="2" y="2" width="{W}-4" height="{H}-4" rx="8" fill="{bg2}" stroke="{accent}"/>`,
                      bar: f.bar,
                    })
                  }
                >
                  복제하여 수정
                </button>
                {f.custom && (
                  <>
                    <button
                      type="button"
                      className="action-btn"
                      onClick={() =>
                        onEditFrame(f.key, {
                          label: f.label,
                          ratio: f.ratio,
                          svg: f.svg || "",
                          bar: f.bar,
                        })
                      }
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      className="action-btn del-btn"
                      onClick={() => onDeleteFrame(f.key)}
                    >
                      삭제
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {!filtered.length && <p className="dim pad">검색된 프레임이 없습니다.</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ *
 * 6. 아이콘 탭 (Icons Tab)
 * ═══════════════════════════════════════════════════════════════════════ */

function IconsTab({
  q,
  setQ,
  cat,
  setCat,
  library,
  onDeleteIcon,
  onNotify,
}: {
  q: string;
  setQ: (q: string) => void;
  cat: string;
  setCat: (c: string) => void;
  library: CustomDesignLibrary;
  onDeleteIcon: (k: string) => void;
  onNotify?: (msg: string) => void;
}) {
  const categories = useMemo(() => {
    return ["전체", ...Object.keys(ICON_CATEGORIES), "커스텀"];
  }, []);

  const hits = useMemo(() => {
    let base = ICONS.search(q);

    if (cat === "커스텀") {
      const customKeys = Object.keys(library.icons);
      if (q.trim()) {
        const query = q.toLowerCase();
        return customKeys.filter(
          (k) =>
            k.toLowerCase().includes(query) ||
            library.icons[k].aliases.some((a) => a.toLowerCase().includes(query)),
        );
      }
      return customKeys;
    }

    if (cat !== "전체") {
      const catKeys = ICON_CATEGORIES[cat] || [];
      base = base.filter((k) => catKeys.includes(k));
    }

    return base;
  }, [q, cat, library.icons]);

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    onNotify?.(`아이콘 이름 "${key}" 가 클립보드에 복사되었습니다.`);
  };

  return (
    <div className="tab-pane-view">
      <div className="tab-filter-bar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="아이콘 검색 (영문, 한글 별칭)..."
          className="search-input"
        />
        <div className="tab-pills">
          {categories.map((c) => (
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

      <div className="studio-icons-grid">
        {hits.map((k) => {
          const aliases = ICONS.aliases(k);
          const isCustom = !!library.icons[k];
          return (
            <div key={k} className="studio-icon-card" title={[k, ...aliases].join(" · ")}>
              <div className="studio-icon-glyph">
                <IconGlyph name={k} size={28} />
              </div>
              <strong className="studio-icon-name">{k}</strong>
              {aliases.length > 0 && <span className="studio-icon-alias dim">{aliases[0]}</span>}
              {isCustom && <span className="badge-custom-sm">커스텀</span>}

              <div className="studio-icon-actions">
                <button
                  type="button"
                  className="small-btn"
                  onClick={() => copyKey(k)}
                  title="아이콘 키 복사"
                >
                  복사
                </button>
                {isCustom && (
                  <button
                    type="button"
                    className="small-btn del-btn"
                    onClick={() => onDeleteIcon(k)}
                    title="커스텀 아이콘 삭제"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {!hits.length && <p className="dim pad">검색된 아이콘이 없습니다.</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ *
 * 7. 토큰 가이드 탭 (Tokens Guide Tab)
 * ═══════════════════════════════════════════════════════════════════════ */

function TokensGuideTab({ currentTheme }: { currentTheme: string }) {
  const colors = resolveThemeColors(currentTheme);

  return (
    <div className="tab-pane-view tokens-guide-view">
      <div className="tokens-section">
        <h3>1. 색상 시맨틱 토큰 (Color Semantic Tokens)</h3>
        <p className="dim">
          gmotion 모션그래픽 씬은 색상을 직접 쓰지 않고 아래 10종의 시맨틱 토큰을 참조합니다.
        </p>

        <div className="tokens-color-table">
          {[
            { token: "bg", name: "배경 (Background)", val: colors.bg, desc: "씬 전체 배경색" },
            {
              token: "bg2",
              name: "보조 배경 (Surface)",
              val: colors.bg2,
              desc: "카드, 패널, 레이어 컨테이너 배경",
            },
            {
              token: "ink",
              name: "본문 글자 (Primary Text)",
              val: colors.ink,
              desc: "타이틀, 주요 텍스트, 라벨",
            },
            {
              token: "ink2",
              name: "보조 글자 (Secondary Text)",
              val: colors.ink2,
              desc: "설명, 서브텍스트, 각주",
            },
            {
              token: "dim",
              name: "흐린 글자 / 보더 (Dim)",
              val: colors.dim,
              desc: "보조선, 비활성 텍스트, 가이드라인",
            },
            {
              token: "accent",
              name: "주요 강조색 (Primary Accent)",
              val: colors.accent,
              desc: "주요 시선 집중, 1차 데이터 포인트, 핵심 마크",
            },
            {
              token: "accent2",
              name: "보조 강조색 (Secondary Accent)",
              val: colors.accent2,
              desc: "비교군 데이터, 2차 강조 마크, 장식 그라디언트",
            },
            {
              token: "good",
              name: "긍정 / 성공 (Success)",
              val: colors.good,
              desc: "상승 지표, 통과, 체크 마크",
            },
            {
              token: "warn",
              name: "주의 / 경고 (Warning)",
              val: colors.warn,
              desc: "주의 지표, 대기 상태, 별표",
            },
            {
              token: "bad",
              name: "부정 / 위험 (Error)",
              val: colors.bad,
              desc: "하락 지표, 오류, 취소선",
            },
          ].map((item) => (
            <div key={item.token} className="token-color-row">
              <span className="token-chip" style={{ backgroundColor: item.val }} />
              <div className="token-meta">
                <strong>{item.token}</strong>
                <span className="token-name">{item.name}</span>
                <code className="token-hex">{item.val}</code>
              </div>
              <p className="token-desc">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="tokens-section">
        <h3>2. 타이포그래피 글자꼴 토큰 (Typography Tokens)</h3>
        <p className="dim">한글 웹폰트와 결합되어 영상의 성격을 결정합니다.</p>
        <div className="tokens-grid-2col">
          {[
            {
              token: "display",
              font: "Pretendard ExtraBold",
              use: "기술 explainer, 테크 오프닝, 하이에너지",
            },
            {
              token: "serif",
              font: "MaruBuri (마루부리)",
              use: "다큐멘터리, 스토리텔링, 롱폼 내레이션",
            },
            {
              token: "sans",
              font: "Pretendard Medium",
              use: "지표 리포트, B2B 대시보드, 사내 공유",
            },
            {
              token: "neo",
              font: "Pretendard SemiBold",
              use: "설계 문서, 블루프린트, 기획 보고서",
            },
            {
              token: "soft",
              font: "Gowun Batang / Dodam",
              use: "브랜드 캠페인, 공예·아날로그 감성",
            },
            {
              token: "round",
              font: "Pretendard Rounded",
              use: "클레이모피즘, 친근한 튜토리얼, 어린이",
            },
          ].map((f) => (
            <div key={f.token} className="token-box">
              <strong>{f.token}</strong>
              <p className="dim">폰트: {f.font}</p>
              <p className="use-text">용도: {f.use}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="tokens-section">
        <h3>3. 질감 &amp; 애니메이션 세기 토큰 (Texture &amp; Motion Energy)</h3>
        <div className="tokens-grid-2col">
          <div className="token-box">
            <strong>에너지 (energy)</strong>
            <p className="dim">
              E1 (여유·차분, hold 1.25x) / E2 (기본 템포) / E3 (하이에너지·쇼츠, hold 0.75x)
            </p>
          </div>
          <div className="token-box">
            <strong>배경 세기 (decorLevel)</strong>
            <p className="dim">0 (은은함, 투명도 약) / 1 (기본 강도) / 2 (강한 존재감)</p>
          </div>
          <div className="token-box">
            <strong>노이즈 그레인 (grain)</strong>
            <p className="dim">0.02 ~ 0.12 (종이·필름 질감 입자)</p>
          </div>
          <div className="token-box">
            <strong>비네트 &amp; 글로우 (vig / glow)</strong>
            <p className="dim">외곽 비네팅 및 강조 요소 발광 드롭섀도우</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════ *
 * Sub Editor Modals (테마, 배경, 마크, 일러스트, 프레임, 아이콘)
 * ═══════════════════════════════════════════════════════════════════════ */

function ThemeEditorModal({
  data,
  onClose,
  onSave,
}: {
  data: { isNew: boolean; key: string; def: ThemeDefinition };
  onClose: () => void;
  onSave: (key: string, def: ThemeDefinition) => void;
}) {
  const [key, setKey] = useState(data.key);
  const [label, setLabel] = useState(data.def.label);
  const [font, setFont] = useState(data.def.font || "display");
  const [grain, setGrain] = useState(data.def.grain ?? 0.04);
  const [vig, setVig] = useState(data.def.vig ?? 0.4);
  const [glow, setGlow] = useState(data.def.glow ?? 1);

  const [colors, setColors] = useState<ThemeColors>({
    bg: data.def.bg || "#0b1020",
    bg2: data.def.bg2 || "#141b33",
    ink: data.def.ink || "#eef2ff",
    ink2: data.def.ink2 || "#a5b0d4",
    dim: data.def.dim || "#707ca5",
    accent: data.def.accent || "#6ea8ff",
    accent2: data.def.accent2 || "#a78bfa",
    good: data.def.good || "#4ade80",
    warn: data.def.warn || "#fbbf24",
    bad: data.def.bad || "#fb7185",
  });

  const contrast = checkThemeContrast(colors);

  const updateColor = (k: keyof ThemeColors, val: string) => {
    setColors((c) => ({ ...c, [k]: val }));
  };

  const loadPreset = (presetKey: string) => {
    const preset = THEMES_REGISTRY[presetKey];
    if (preset) {
      setColors({
        bg: preset.bg,
        bg2: preset.bg2,
        ink: preset.ink,
        ink2: preset.ink2,
        dim: preset.dim,
        accent: preset.accent,
        accent2: preset.accent2,
        good: preset.good,
        warn: preset.warn,
        bad: preset.bad,
      });
      setFont(preset.font || "display");
      setGrain(preset.grain ?? 0.04);
      setVig(preset.vig ?? 0.4);
      setGlow(preset.glow ?? 1);
    }
  };

  return (
    <div className="modal sub-modal" role="dialog" aria-label="테마 편집">
      <div className="modal-box editor-modal-box">
        <div className="pane-head">
          <h3>{data.isNew ? "＋ 새 커스텀 테마 생성" : `테마 수정: ${data.key}`}</h3>
          <button type="button" className="ghost" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="editor-form-body">
          {/* 1. Quick Mood Palette Generator */}
          <div className="field">
            <label>🎨 원클릭 하모니 무드 팔레트 (Mood Presets)</label>
            <div className="mood-palettes-pills">
              {Object.entries(MOOD_PALETTES).map(([k, p]) => (
                <button
                  key={k}
                  type="button"
                  className="mood-pill-btn"
                  onClick={() => {
                    setColors(p.colors);
                    setFont(p.font);
                  }}
                >
                  <span className="mood-swatch">
                    <span style={{ backgroundColor: p.colors.bg }} />
                    <span style={{ backgroundColor: p.colors.accent }} />
                    <span style={{ backgroundColor: p.colors.accent2 }} />
                    <span style={{ backgroundColor: p.colors.ink }} />
                  </span>
                  <span>{p.label.split(" (")[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preset Selector */}
          <div className="field">
            <label>기존 15종 기본 테마에서 색상 불러오기</label>
            <select onChange={(e) => loadPreset(e.target.value)} defaultValue="">
              <option value="" disabled>
                — 프리셋 선택
              </option>
              {Object.keys(THEMES_REGISTRY).map((k) => (
                <option key={k} value={k}>
                  {k} ({THEMES_REGISTRY[k].label.split("—")[0]})
                </option>
              ))}
            </select>
          </div>

          <div className="grid-2col">
            <div className="field">
              <label>테마 키 (영문 식별자)</label>
              <input
                value={key}
                disabled={!data.isNew}
                onChange={(e) => setKey(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                placeholder="myBrand, darkBlue 등"
              />
            </div>
            <div className="field">
              <label>국문 레이블</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="마이브랜드 — 설명 문구"
              />
            </div>
          </div>

          {/* Realtime Live Mini Mockup Preview */}
          <div
            className="live-mockup-preview"
            style={{ backgroundColor: colors.bg, borderColor: colors.dim }}
          >
            <div className="mockup-header" style={{ color: colors.ink }}>
              <span
                className="mockup-badge"
                style={{ backgroundColor: colors.accent, color: colors.bg }}
              >
                SAMPLE
              </span>
              <strong>{label || "미리보기 타이틀"}</strong>
            </div>
            <p style={{ color: colors.ink2, margin: "3px 0", fontSize: "11px" }}>
              보조 설명 텍스트 (Secondary Text - ink2)
            </p>
            <div
              className="mockup-card"
              style={{ backgroundColor: colors.bg2, borderColor: colors.dim }}
            >
              <span style={{ color: colors.accent2 }}>보조 강조 포인트 (accent2)</span>
              <span style={{ color: colors.good, marginLeft: "auto", fontWeight: "bold" }}>
                +24.5% 상승
              </span>
            </div>
          </div>

          {/* 10 Colors Picker Grid */}
          <fieldset className="editor-fieldset">
            <legend>10종 색상 팔레트 설정</legend>
            <div className="colors-picker-grid">
              {(
                [
                  ["bg", "배경 (bg)"],
                  ["bg2", "보조 배경 (bg2)"],
                  ["ink", "본문 글자 (ink)"],
                  ["ink2", "보조 글자 (ink2)"],
                  ["dim", "흐린 선/글자 (dim)"],
                  ["accent", "주요 강조 (accent)"],
                  ["accent2", "보조 강조 (accent2)"],
                  ["good", "성공/긍정 (good)"],
                  ["warn", "주의/경고 (warn)"],
                  ["bad", "오류/부정 (bad)"],
                ] as const
              ).map(([colKey, colLabel]) => (
                <div key={colKey} className="color-field-cell">
                  <label>{colLabel}</label>
                  <div className="color-input-row">
                    <input
                      type="color"
                      value={colors[colKey]}
                      onChange={(e) => updateColor(colKey, e.target.value)}
                    />
                    <input
                      type="text"
                      value={colors[colKey]}
                      onChange={(e) => updateColor(colKey, e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          {/* 실제 사용 역할별 실시간 대비 검사 */}
          <div className="contrast-checker-box">
            <div className="contrast-header">
              <strong>실시간 역할별 대비 검사</strong>
              <span className={`contrast-pill ${contrast.ok ? "pass" : "fail"}`}>
                {contrast.ok ? "모든 대비 기준 통과" : `일부 대비 기준 미달 (${contrast.score}%)`}
              </span>
            </div>
            <div className="contrast-list-grid">
              {contrast.list.map((item) => (
                <div key={item.key} className={`contrast-item-row ${item.pass ? "pass" : "fail"}`}>
                  <span className="contrast-item-name">{item.name}</span>
                  <span className="contrast-item-ratio">
                    {item.ratio}:1 (필요 {item.need}:1)
                  </span>
                  <span className="contrast-item-status">{item.pass ? "✓ 통과" : "⚠ 미달"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Typography & Texture */}
          <div className="grid-2col">
            <div className="field">
              <label>기본 폰트</label>
              <select value={font} onChange={(e) => setFont(e.target.value)}>
                {Object.entries(GG.fonts).map(([fKey, fLabel]) => (
                  <option key={fKey} value={fKey}>
                    {fKey} — {fLabel}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>글로우 세기 (glow: {glow})</label>
              <input
                type="range"
                min={0}
                max={3}
                step={0.5}
                value={glow}
                onChange={(e) => setGlow(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="editor-modal-foot">
          <button type="button" className="ghost" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="primary"
            disabled={!key.trim()}
            onClick={() => {
              onSave(key.trim(), {
                label: label.trim() || key.trim(),
                font,
                grain,
                vig,
                glow,
                ...colors,
              });
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function DecorEditorModal({
  data,
  onClose,
  onSave,
}: {
  data: {
    isNew: boolean;
    key: string;
    label: string;
    category: string;
    svg: string;
    image?: string;
    fit?: "contain" | "cover";
  };
  onClose: () => void;
  onSave: (
    key: string,
    item: {
      label: string;
      category: string;
      svg?: string;
      image?: string;
      fit?: "contain" | "cover";
    },
  ) => void;
}) {
  const [mode, setMode] = useState<"gui" | "code" | "image">(data.image ? "image" : "gui");
  const [key, setKey] = useState(data.key);
  const [label, setLabel] = useState(data.label);
  const [category, setCategory] = useState(data.category);
  const [svg, setSvg] = useState(data.svg);
  const [image, setImage] = useState(data.image || "");
  const [fit, setFit] = useState<"contain" | "cover">(data.fit || "cover");
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // GUI Controls
  const [pattern, setPattern] = useState("blob");
  const [count, setCount] = useState(4);
  const [scale, setScale] = useState(1.0);
  const [opacity, setOpacity] = useState(0.2);
  const [blur, setBlur] = useState(12);
  const [colorMode, setColorMode] = useState<"accent" | "accent2" | "both" | "dim">("both");

  const applyGuiChange = (
    p = pattern,
    c = count,
    s = scale,
    op = opacity,
    bl = blur,
    cm = colorMode,
  ) => {
    const generated = generateDecorSvg(p, {
      count: c,
      scale: s,
      opacity: op,
      blur: bl,
      colorMode: cm,
    });
    setSvg(generated);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const uri = String(evt.target?.result || "");
      if (uri.length > MAX_IMAGE_LEN) {
        setImageError("이미지가 너무 크다 — data URI 기준 2MB(문자 수) 이하만 저장할 수 있다.");
        return;
      }
      setImageError(null);
      setImage(uri);
    };
    reader.readAsDataURL(file);
  };

  const previewFilled = svg
    .split("{W}")
    .join("320")
    .split("{H}")
    .join("180")
    .split("{accent}")
    .join("#6ea8ff")
    .split("{accent2}")
    .join("#a78bfa")
    .split("{bg}")
    .join("#0b1020")
    .split("{bg2}")
    .join("#141b33")
    .split("{ink}")
    .join("#eef2ff")
    .split("{dim}")
    .join("#707ca5");

  return (
    <div className="modal sub-modal" role="dialog" aria-label="배경 편집">
      <div className="modal-box editor-modal-box">
        <div className="pane-head">
          <div className="editor-head-title">
            <h3>{data.isNew ? "＋ 새 커스텀 배경 생성" : `배경 수정: ${data.key}`}</h3>
            <div className="tab-pills mode-switch-pills">
              <button
                type="button"
                className={mode === "gui" ? "on" : ""}
                onClick={() => setMode("gui")}
              >
                🎨 비주얼 GUI
              </button>
              <button
                type="button"
                className={mode === "code" ? "on" : ""}
                onClick={() => setMode("code")}
              >
                📝 SVG 템플릿 코드
              </button>
              <button
                type="button"
                className={mode === "image" ? "on" : ""}
                onClick={() => setMode("image")}
              >
                🖼 외부 이미지
              </button>
            </div>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="editor-form-body">
          <div className="grid-2col">
            <div className="field">
              <label>배경 키 (영문)</label>
              <input
                value={key}
                disabled={!data.isNew}
                onChange={(e) => setKey(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
              />
            </div>
            <div className="field">
              <label>카테고리</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {Object.keys(DECOR_CATEGORIES).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value="커스텀">커스텀</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>설명 라벨</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>

          {/* Realtime 16:9 Canvas Preview */}
          <div className="gui-canvas-preview">
            <span className="canvas-badge">실시간 배경 미리보기 (16:9)</span>
            {mode === "image" ? (
              image ? (
                <img
                  className="canvas-inner image-fill-preview"
                  src={image}
                  alt=""
                  style={{ objectFit: fit }}
                />
              ) : (
                <p className="dim pad">이미지를 선택하면 여기에 미리보기가 뜬다.</p>
              )
            ) : (
              <div
                className="canvas-inner"
                dangerouslySetInnerHTML={{
                  __html: previewFilled.includes("<svg")
                    ? previewFilled
                    : `<svg viewBox="0 0 320 180" width="100%" height="100%" aria-hidden="true">${previewFilled}</svg>`,
                }}
              />
            )}
          </div>

          {mode === "gui" ? (
            <div className="gui-controls-section">
              <div className="field">
                <label>배경 패턴 스타일 선택</label>
                <div className="pattern-presets-grid">
                  {[
                    ["blob", "유기 블롭 (Blob)"],
                    ["wave", "물결 웨이브 (Wave)"],
                    ["grid", "격자 그리드 (Grid)"],
                    ["dots", "도트 점 격자 (Dots)"],
                    ["rays", "방사 광선 (Rays)"],
                    ["rings", "동심원 링 (Rings)"],
                    ["beams", "사선 빛줄기 (Beams)"],
                  ].map(([pKey, pLabel]) => (
                    <button
                      key={pKey}
                      type="button"
                      className={`preset-btn ${pattern === pKey ? "on" : ""}`}
                      onClick={() => {
                        setPattern(pKey);
                        applyGuiChange(pKey);
                      }}
                    >
                      {pLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid-2col">
                <div className="field">
                  <label>개수 / 밀도 ({count})</label>
                  <input
                    type="range"
                    min={2}
                    max={12}
                    step={1}
                    value={count}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCount(val);
                      applyGuiChange(pattern, val);
                    }}
                  />
                </div>
                <div className="field">
                  <label>스케일 / 크기 ({scale.toFixed(1)}x)</label>
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    value={scale}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setScale(val);
                      applyGuiChange(pattern, count, val);
                    }}
                  />
                </div>
                <div className="field">
                  <label>투명도 ({(opacity * 100).toFixed(0)}%)</label>
                  <input
                    type="range"
                    min={0.05}
                    max={0.5}
                    step={0.02}
                    value={opacity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setOpacity(val);
                      applyGuiChange(pattern, count, scale, val);
                    }}
                  />
                </div>
                <div className="field">
                  <label>블러 흐림 ({blur}px)</label>
                  <input
                    type="range"
                    min={0}
                    max={30}
                    step={2}
                    value={blur}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBlur(val);
                      applyGuiChange(pattern, count, scale, opacity, val);
                    }}
                  />
                </div>
              </div>

              <div className="field">
                <label>색상 타겟</label>
                <div className="tab-pills">
                  {(
                    [
                      ["both", "accent + accent2"],
                      ["accent", "accent 단색"],
                      ["accent2", "accent2 단색"],
                      ["dim", "dim 은은하게"],
                    ] as const
                  ).map(([cmKey, cmLabel]) => (
                    <button
                      key={cmKey}
                      type="button"
                      className={colorMode === cmKey ? "on" : ""}
                      onClick={() => {
                        setColorMode(cmKey);
                        applyGuiChange(pattern, count, scale, opacity, blur, cmKey);
                      }}
                    >
                      {cmLabel}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : mode === "code" ? (
            <div className="field">
              <label>SVG 마크업 / 템플릿</label>
              <textarea
                rows={6}
                value={svg}
                onChange={(e) => setSvg(e.target.value)}
                placeholder="예: <circle cx='{W}*0.5' cy='{H}*0.5' r='80' fill='{accent}' opacity='0.2'/>"
              />
              <p className="hint">
                치환 변수: {"{W}"}, {"{H}"}, {"{accent}"}, {"{accent2}"}, {"{ink}"}, {"{bg}"},{" "}
                {"{dim}"}
              </p>
            </div>
          ) : (
            <div className="gui-controls-section">
              <div className="field">
                <label>이미지 파일 (data URI 로 인라인 저장)</label>
                <input
                  type="file"
                  ref={imageInputRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  className="secondary small"
                  onClick={() => imageInputRef.current?.click()}
                >
                  📁 이미지 파일 선택
                </button>
                {imageError && <p className="hint image-error">{imageError}</p>}
                <p className="hint">
                  PNG·JPG·WebP 등 한 장이 data URI 로 인라인된다 — 2MB(문자 수) 이하.
                </p>
              </div>
              <div className="field">
                <label>맞춤 방식 (fit)</label>
                <select value={fit} onChange={(e) => setFit(e.target.value as "contain" | "cover")}>
                  <option value="cover">cover — 꽉 채우고 넘치면 자른다 (배경 기본)</option>
                  <option value="contain">contain — 전부 보이게 맞춘다</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="editor-modal-foot">
          <button type="button" className="ghost" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="primary"
            disabled={!key.trim() || (mode === "image" ? !image : !svg.trim())}
            onClick={() =>
              onSave(
                key.trim(),
                mode === "image"
                  ? { label: label.trim() || key.trim(), category, image, fit }
                  : { label: label.trim() || key.trim(), category, svg },
              )
            }
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function MarkEditorModal({
  data,
  onClose,
  onSave,
}: {
  data: {
    isNew: boolean;
    key: string;
    label: string;
    where: "under" | "around" | "behind" | "point" | "corner" | "ribbon";
    svg: string;
    draw: boolean;
    text: boolean;
  };
  onClose: () => void;
  onSave: (
    key: string,
    item: {
      label: string;
      where: "under" | "around" | "behind" | "point" | "corner" | "ribbon";
      svg: string;
      draw: boolean;
      text: boolean;
    },
  ) => void;
}) {
  const [mode, setMode] = useState<"gui" | "code">("gui");
  const [key, setKey] = useState(data.key);
  const [label, setLabel] = useState(data.label);
  const [where, setWhere] = useState(data.where);
  const [svg, setSvg] = useState(data.svg);
  const [draw, setDraw] = useState(data.draw);
  const [text, setText] = useState(data.text);

  // GUI Controls
  const [markStyle, setMarkStyle] = useState("underline");
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [bend, setBend] = useState(0);
  const [dashed, setDashed] = useState(false);
  const [colorTarget, setColorTarget] = useState("accent");
  const [opacity, setOpacity] = useState(1.0);

  const applyGuiChange = (
    st = markStyle,
    sw = strokeWidth,
    b = bend,
    d = dashed,
    col = colorTarget,
    op = opacity,
  ) => {
    const res = generateMarkSvg(st, {
      strokeWidth: sw,
      bend: b,
      dashed: d,
      colorTarget: col,
      opacity: op,
    });
    setSvg(res.svg);
    setWhere(res.where);
    setDraw(res.draw);
    setText(res.text);
  };

  const previewFilled = svg
    .split("{accent}")
    .join("#6ea8ff")
    .split("{accent2}")
    .join("#a78bfa")
    .split("{good}")
    .join("#4ade80")
    .split("{warn}")
    .join("#fbbf24")
    .split("{bad}")
    .join("#fb7185")
    .split("{ink}")
    .join("#eef2ff")
    .split("{bg}")
    .join("#0b1020")
    .split("{text}")
    .join("NEW");

  return (
    <div className="modal sub-modal" role="dialog" aria-label="마크 편집">
      <div className="modal-box editor-modal-box">
        <div className="pane-head">
          <div className="editor-head-title">
            <h3>{data.isNew ? "＋ 새 커스텀 강조 마크 생성" : `마크 수정: ${data.key}`}</h3>
            <div className="tab-pills mode-switch-pills">
              <button
                type="button"
                className={mode === "gui" ? "on" : ""}
                onClick={() => setMode("gui")}
              >
                🎨 비주얼 GUI
              </button>
              <button
                type="button"
                className={mode === "code" ? "on" : ""}
                onClick={() => setMode("code")}
              >
                📝 SVG 코드
              </button>
            </div>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="editor-form-body">
          <div className="grid-2col">
            <div className="field">
              <label>마크 키 (영문)</label>
              <input
                value={key}
                disabled={!data.isNew}
                onChange={(e) => setKey(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
              />
            </div>
            <div className="field">
              <label>위치 타입 (where)</label>
              <select
                value={where}
                onChange={(e) =>
                  setWhere(
                    e.target.value as "under" | "around" | "behind" | "point" | "corner" | "ribbon",
                  )
                }
              >
                <option value="under">under (밑줄)</option>
                <option value="around">around (둘러싸기)</option>
                <option value="behind">behind (배경 칠)</option>
                <option value="point">point (가리키기)</option>
                <option value="corner">corner (모서리 배지)</option>
                <option value="ribbon">ribbon (대각 리본)</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>설명 라벨</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>

          {/* Realtime Text Preview with Mark */}
          <div className="gui-mark-preview-box">
            <span className="preview-heading">글자 위 실시간 강조 마크 렌더링</span>
            <div className="mark-preview-stage">
              <span className="mark-target-text">
                중요한 핵심 내용
                <div
                  className="mark-overlay-layer"
                  dangerouslySetInnerHTML={{ __html: previewFilled }}
                />
              </span>
            </div>
          </div>

          {mode === "gui" ? (
            <div className="gui-controls-section">
              <div className="field">
                <label>마크 스타일 프리셋</label>
                <div className="pattern-presets-grid">
                  {[
                    ["underline", "밑줄 (Line)"],
                    ["underline2", "이중 밑줄 (Double)"],
                    ["circle", "동그라미 (Circle)"],
                    ["box", "사각 박스 (Box)"],
                    ["highlight", "형광펜 띠 (Highlight)"],
                    ["badge", "알약 배지 (Badge)"],
                    ["stamp", "도장 스탬프 (Stamp)"],
                  ].map(([sKey, sLabel]) => (
                    <button
                      key={sKey}
                      type="button"
                      className={`preset-btn ${markStyle === sKey ? "on" : ""}`}
                      onClick={() => {
                        setMarkStyle(sKey);
                        applyGuiChange(sKey);
                      }}
                    >
                      {sLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid-2col">
                <div className="field">
                  <label>선 두께 ({strokeWidth}px)</label>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    step={1}
                    value={strokeWidth}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setStrokeWidth(val);
                      applyGuiChange(markStyle, val);
                    }}
                  />
                </div>
                <div className="field">
                  <label>구부림 / 곡률 ({bend})</label>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={1}
                    value={bend}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBend(val);
                      applyGuiChange(markStyle, strokeWidth, val);
                    }}
                  />
                </div>
              </div>

              <div className="grid-2col">
                <div className="field check">
                  <label>
                    <input
                      type="checkbox"
                      checked={dashed}
                      onChange={(e) => {
                        setDashed(e.target.checked);
                        applyGuiChange(markStyle, strokeWidth, bend, e.target.checked);
                      }}
                    />
                    점선 (Dashed) 스타일
                  </label>
                </div>
                <div className="field">
                  <label>색상 토큰</label>
                  <select
                    value={colorTarget}
                    onChange={(e) => {
                      setColorTarget(e.target.value);
                      applyGuiChange(markStyle, strokeWidth, bend, dashed, e.target.value);
                    }}
                  >
                    <option value="accent">accent (주요 강조)</option>
                    <option value="accent2">accent2 (보조 강조)</option>
                    <option value="good">good (성공/초록)</option>
                    <option value="warn">warn (주의/노랑)</option>
                    <option value="bad">bad (경고/빨강)</option>
                  </select>
                </div>
                <div className="field">
                  <label>투명도 ({(opacity * 100).toFixed(0)}%)</label>
                  <input
                    type="range"
                    min={0.2}
                    max={1.0}
                    step={0.1}
                    value={opacity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setOpacity(val);
                      applyGuiChange(markStyle, strokeWidth, bend, dashed, colorTarget, val);
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="field">
              <label>SVG 마크업</label>
              <textarea
                rows={5}
                value={svg}
                onChange={(e) => setSvg(e.target.value)}
                placeholder="예: <path d='M0 10 L100 10' stroke='{accent}' stroke-width='4'/>"
              />
              <p className="hint">
                치환 변수: {"{accent}"}, {"{accent2}"}, {"{ink}"}, {"{text}"}
              </p>
            </div>
          )}
        </div>

        <div className="editor-modal-foot">
          <button type="button" className="ghost" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="primary"
            disabled={!key.trim() || !svg.trim()}
            onClick={() =>
              onSave(key.trim(), { label: label.trim() || key.trim(), where, svg, draw, text })
            }
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function ArtEditorModal({
  data,
  onClose,
  onSave,
}: {
  data: {
    isNew: boolean;
    key: string;
    label: string;
    svg: string;
    image?: string;
    fit?: "contain" | "cover";
  };
  onClose: () => void;
  onSave: (
    key: string,
    item: { label: string; svg?: string; image?: string; fit?: "contain" | "cover" },
  ) => void;
}) {
  const [mode, setMode] = useState<"gui" | "code" | "image">(data.image ? "image" : "gui");
  const [key, setKey] = useState(data.key);
  const [label, setLabel] = useState(data.label);
  const [svg, setSvg] = useState(data.svg);
  const [image, setImage] = useState(data.image || "");
  const [fit, setFit] = useState<"contain" | "cover">(data.fit || "contain");
  const [imageError, setImageError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // GUI Controls
  const [concept, setConcept] = useState("data");
  const [scale, setScale] = useState(1.0);
  const [rotate, setRotate] = useState(0);
  const [detail, setDetail] = useState<"simple" | "rich">("simple");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyGuiChange = (c = concept, s = scale, r = rotate, d = detail) => {
    const generated = generateArtSvg(c, {
      scale: s,
      rotate: r,
      detail: d,
    });
    setSvg(generated);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = String(evt.target?.result || "");
      setSvg(text);
      setMode("code");
    };
    reader.readAsText(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const uri = String(evt.target?.result || "");
      if (uri.length > MAX_IMAGE_LEN) {
        setImageError("이미지가 너무 크다 — data URI 기준 2MB(문자 수) 이하만 저장할 수 있다.");
        return;
      }
      setImageError(null);
      setImage(uri);
    };
    reader.readAsDataURL(file);
  };

  const previewFilled = svg
    .split("{accent}")
    .join("#6ea8ff")
    .split("{accent2}")
    .join("#a78bfa")
    .split("{bg}")
    .join("#0b1020")
    .split("{bg2}")
    .join("#141b33")
    .split("{ink}")
    .join("#eef2ff")
    .split("{dim}")
    .join("#707ca5");

  return (
    <div className="modal sub-modal" role="dialog" aria-label="일러스트 편집">
      <div className="modal-box editor-modal-box">
        <div className="pane-head">
          <div className="editor-head-title">
            <h3>{data.isNew ? "＋ 새 커스텀 일러스트 생성" : `일러스트 수정: ${data.key}`}</h3>
            <div className="tab-pills mode-switch-pills">
              <button
                type="button"
                className={mode === "gui" ? "on" : ""}
                onClick={() => setMode("gui")}
              >
                🎨 비주얼 GUI
              </button>
              <button
                type="button"
                className={mode === "code" ? "on" : ""}
                onClick={() => setMode("code")}
              >
                📝 SVG 코드
              </button>
              <button
                type="button"
                className={mode === "image" ? "on" : ""}
                onClick={() => setMode("image")}
              >
                🖼 외부 이미지
              </button>
            </div>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="editor-form-body">
          <div className="grid-2col">
            <div className="field">
              <label>일러스트 키 (영문)</label>
              <input
                value={key}
                disabled={!data.isNew}
                onChange={(e) => setKey(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
              />
            </div>
            <div className="field">
              <label>설명 라벨</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
          </div>

          {/* 200x200 Preview Stage */}
          <div className="gui-art-preview-box">
            <span className="preview-heading">200×200 viewBox 실시간 렌더링</span>
            {mode === "image" ? (
              image ? (
                <img
                  className="art-stage-inner image-fill-preview"
                  src={image}
                  alt=""
                  style={{ objectFit: fit }}
                />
              ) : (
                <p className="dim pad">이미지를 선택하면 여기에 미리보기가 뜬다.</p>
              )
            ) : (
              <div
                className="art-stage-inner"
                dangerouslySetInnerHTML={{
                  __html: previewFilled.includes("<svg")
                    ? previewFilled
                    : `<svg viewBox="0 0 200 200" width="120" height="120" aria-hidden="true">${previewFilled}</svg>`,
                }}
              />
            )}
          </div>

          {mode === "gui" ? (
            <div className="gui-controls-section">
              <div className="field">
                <label>일러스트 개념 프리셋</label>
                <div className="pattern-presets-grid">
                  {[
                    ["data", "데이터 & 실린더 (Data)"],
                    ["network", "네트워크 & 노드 (Network)"],
                    ["growth", "성장 & 계단 (Growth)"],
                    ["shield", "보안 & 방패 (Shield)"],
                    ["collab", "협업 & 벤다이어그램 (Collab)"],
                  ].map(([cKey, cLabel]) => (
                    <button
                      key={cKey}
                      type="button"
                      className={`preset-btn ${concept === cKey ? "on" : ""}`}
                      onClick={() => {
                        setConcept(cKey);
                        applyGuiChange(cKey);
                      }}
                    >
                      {cLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid-2col">
                <div className="field">
                  <label>크기 스케일 ({scale.toFixed(1)}x)</label>
                  <input
                    type="range"
                    min={0.6}
                    max={1.4}
                    step={0.1}
                    value={scale}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setScale(val);
                      applyGuiChange(concept, val);
                    }}
                  />
                </div>
                <div className="field">
                  <label>회전 각도 ({rotate}°)</label>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={15}
                    value={rotate}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setRotate(val);
                      applyGuiChange(concept, scale, val);
                    }}
                  />
                </div>
              </div>

              <div className="field">
                <label>디테일 밀도</label>
                <div className="tab-pills">
                  <button
                    type="button"
                    className={detail === "simple" ? "on" : ""}
                    onClick={() => {
                      setDetail("simple");
                      applyGuiChange(concept, scale, rotate, "simple");
                    }}
                  >
                    심플 (기본)
                  </button>
                  <button
                    type="button"
                    className={detail === "rich" ? "on" : ""}
                    onClick={() => {
                      setDetail("rich");
                      applyGuiChange(concept, scale, rotate, "rich");
                    }}
                  >
                    리치 (상세 요소 추가)
                  </button>
                </div>
              </div>

              <div className="svg-upload-box">
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept=".svg,image/svg+xml"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  className="secondary small"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📁 외부 .SVG 파일 가져오기
                </button>
              </div>
            </div>
          ) : mode === "code" ? (
            <div className="field">
              <label>SVG 마크업 (200×200 viewBox 기준)</label>
              <textarea
                rows={6}
                value={svg}
                onChange={(e) => setSvg(e.target.value)}
                placeholder="<g class='gg-artP'><circle cx='100' cy='100' r='60' fill='{accent}'/></g>"
              />
              <p className="hint">
                치환 변수: {"{accent}"}, {"{accent2}"}, {"{bg2}"}, {"{ink}"}, {"{dim}"}
              </p>
            </div>
          ) : (
            <div className="gui-controls-section">
              <div className="field">
                <label>이미지 파일 (data URI 로 인라인 저장)</label>
                <input
                  type="file"
                  ref={imageInputRef}
                  style={{ display: "none" }}
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  className="secondary small"
                  onClick={() => imageInputRef.current?.click()}
                >
                  📁 이미지 파일 선택
                </button>
                {imageError && <p className="hint image-error">{imageError}</p>}
                <p className="hint">
                  PNG·JPG·WebP 등 한 장이 data URI 로 인라인된다 — 2MB(문자 수) 이하.
                </p>
              </div>
              <div className="field">
                <label>맞춤 방식 (fit)</label>
                <select value={fit} onChange={(e) => setFit(e.target.value as "contain" | "cover")}>
                  <option value="contain">contain — 전부 보이게 맞춘다 (일러스트 기본)</option>
                  <option value="cover">cover — 꽉 채우고 넘치면 자른다</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="editor-modal-foot">
          <button type="button" className="ghost" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="primary"
            disabled={!key.trim() || (mode === "image" ? !image : !svg.trim())}
            onClick={() =>
              onSave(
                key.trim(),
                mode === "image"
                  ? { label: label.trim() || key.trim(), image, fit }
                  : { label: label.trim() || key.trim(), svg },
              )
            }
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function FrameEditorModal({
  data,
  onClose,
  onSave,
}: {
  data: { isNew: boolean; key: string; label: string; ratio: number; svg: string; bar?: number };
  onClose: () => void;
  onSave: (key: string, item: { label: string; ratio: number; svg: string; bar?: number }) => void;
}) {
  const [mode, setMode] = useState<"gui" | "code">("gui");
  const [key, setKey] = useState(data.key);
  const [label, setLabel] = useState(data.label);
  const [ratio, setRatio] = useState(data.ratio || 16 / 9);
  const [svg, setSvg] = useState(data.svg);

  // GUI Controls
  const [preset, setPreset] = useState("browser");
  const [radius, setRadius] = useState(12);
  const [barHeight, setBarHeight] = useState(32);
  const [borderWidth, setBorderWidth] = useState(2);
  const [controls, setControls] = useState<"dots" | "lines" | "none">("dots");

  const applyGuiChange = (
    pr = preset,
    r = radius,
    b = barHeight,
    bw = borderWidth,
    c = controls,
  ) => {
    const generated = generateFrameSvg(pr, {
      radius: r,
      barHeight: b,
      borderWidth: bw,
      controls: c,
    });
    setSvg(generated);
  };

  const previewFilled = svg
    .split("{W}")
    .join("260")
    .split("{H}")
    .join("160")
    .split("{accent}")
    .join("#6ea8ff")
    .split("{accent2}")
    .join("#a78bfa")
    .split("{bg}")
    .join("#0b1020")
    .split("{bg2}")
    .join("#141b33")
    .split("{dim}")
    .join("#707ca5");

  return (
    <div className="modal sub-modal" role="dialog" aria-label="프레임 편집">
      <div className="modal-box editor-modal-box">
        <div className="pane-head">
          <div className="editor-head-title">
            <h3>{data.isNew ? "＋ 새 커스텀 프레임 생성" : `프레임 수정: ${data.key}`}</h3>
            <div className="tab-pills mode-switch-pills">
              <button
                type="button"
                className={mode === "gui" ? "on" : ""}
                onClick={() => setMode("gui")}
              >
                🎨 비주얼 GUI
              </button>
              <button
                type="button"
                className={mode === "code" ? "on" : ""}
                onClick={() => setMode("code")}
              >
                📝 SVG 코드
              </button>
            </div>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="editor-form-body">
          <div className="grid-2col">
            <div className="field">
              <label>프레임 키 (영문)</label>
              <input
                value={key}
                disabled={!data.isNew}
                onChange={(e) => setKey(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
              />
            </div>
            <div className="field">
              <label>화면비 (Ratio: {Math.round(ratio * 100) / 100})</label>
              <select value={ratio} onChange={(e) => setRatio(Number(e.target.value))}>
                <option value={16 / 10}>16:10 (브라우저·창)</option>
                <option value={16 / 9}>16:9 (와이드 모니터)</option>
                <option value={9 / 16}>9:16 (세로 모바일)</option>
                <option value={9 / 19.5}>9:19.5 (스마트폰)</option>
                <option value={3 / 4}>3:4 (태블릿)</option>
                <option value={4 / 3}>4:3 (클래식)</option>
                <option value={1}>1:1 (정사각)</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>설명 라벨</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>

          {/* Realtime Frame Canvas Preview */}
          <div className="gui-frame-preview-box">
            <span className="preview-heading">프레임 실시간 실루엣 미리보기</span>
            <div
              className="frame-stage-inner"
              dangerouslySetInnerHTML={{
                __html: `<svg viewBox="0 0 260 160" width="100%" height="100%" aria-hidden="true">${previewFilled}</svg>`,
              }}
            />
          </div>

          {mode === "gui" ? (
            <div className="gui-controls-section">
              <div className="field">
                <label>디바이스/창 스타일 프리셋</label>
                <div className="pattern-presets-grid">
                  {[
                    ["browser", "웹 브라우저 (Browser)"],
                    ["terminal", "코드 터미널 (Terminal)"],
                    ["phone", "스마트폰 (Phone)"],
                    ["card", "모던 카드 (Card)"],
                  ].map(([prKey, prLabel]) => (
                    <button
                      key={prKey}
                      type="button"
                      className={`preset-btn ${preset === prKey ? "on" : ""}`}
                      onClick={() => {
                        setPreset(prKey);
                        applyGuiChange(prKey);
                      }}
                    >
                      {prLabel}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid-2col">
                <div className="field">
                  <label>모서리 둥글기 ({radius}px)</label>
                  <input
                    type="range"
                    min={0}
                    max={28}
                    step={2}
                    value={radius}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setRadius(val);
                      applyGuiChange(preset, val);
                    }}
                  />
                </div>
                <div className="field">
                  <label>상단 타이틀바 높이 ({barHeight}px)</label>
                  <input
                    type="range"
                    min={20}
                    max={48}
                    step={2}
                    value={barHeight}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBarHeight(val);
                      applyGuiChange(preset, radius, val);
                    }}
                  />
                </div>
                <div className="field">
                  <label>외곽선 두께 ({borderWidth}px)</label>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    step={1}
                    value={borderWidth}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBorderWidth(val);
                      applyGuiChange(preset, radius, barHeight, val, controls);
                    }}
                  />
                </div>
              </div>
              <div className="field">
                <label>타이틀바 컨트롤 버튼</label>
                <div className="tab-pills">
                  {(
                    [
                      ["dots", "신호등 점 3개 (Mac)"],
                      ["lines", "바 라인 (Minimal)"],
                      ["none", "없음 (Clean)"],
                    ] as const
                  ).map(([cKey, cLabel]) => (
                    <button
                      key={cKey}
                      type="button"
                      className={controls === cKey ? "on" : ""}
                      onClick={() => {
                        setControls(cKey);
                        applyGuiChange(preset, radius, barHeight, borderWidth, cKey);
                      }}
                    >
                      {cLabel}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="field">
              <label>SVG 마크업</label>
              <textarea
                rows={5}
                value={svg}
                onChange={(e) => setSvg(e.target.value)}
                placeholder="<rect x='2' y='2' width='{W}-4' height='{H}-4' rx='8' fill='{bg2}' stroke='{accent}'/>"
              />
              <p className="hint">
                치환 변수: {"{W}"}, {"{H}"}, {"{accent}"}, {"{accent2}"}, {"{bg2}"}
              </p>
            </div>
          )}
        </div>

        <div className="editor-modal-foot">
          <button type="button" className="ghost" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="primary"
            disabled={!key.trim() || !svg.trim()}
            onClick={() => onSave(key.trim(), { label: label.trim() || key.trim(), ratio, svg })}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function IconEditorModal({
  data,
  onClose,
  onSave,
}: {
  data: { isNew: boolean; key: string; path: string; aliases: string[]; label: string };
  onClose: () => void;
  onSave: (key: string, item: { path: string; aliases: string[]; label: string }) => void;
}) {
  const [mode, setMode] = useState<"gui" | "code">("gui");
  const [key, setKey] = useState(data.key);
  const [label, setLabel] = useState(data.label);
  const [path, setPath] = useState(data.path);
  const [aliasesStr, setAliasesStr] = useState(data.aliases.join(", "));
  const [pasteInput, setPasteInput] = useState("");

  const ICON_SHAPES = [
    { name: "체크", path: "M20 6L9 17l-5-5" },
    { name: "별", path: "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" },
    {
      name: "하트",
      path: "M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 000-7.8z",
    },
    {
      name: "불꽃",
      path: "M8.5 14.5A2.5 2.5 0 0011 12c0-1.4-.5-2-1-3-1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a7 7 0 11-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 002.5 2.5z",
    },
    { name: "번개", path: "M13 2L4 14h7l-1 8 9-12h-7z" },
    { name: "돋보기", path: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3" },
    {
      name: "자물쇠",
      path: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
    },
    { name: "플러스", path: "M12 5v14M5 12h14" },
    { name: "화살표", path: "M5 12h14M13 6l6 6-6 6" },
    { name: "구름", path: "M17.5 19a4.5 4.5 0 00.5-9 6.5 6.5 0 00-12.6 1.6A4 4 0 006 19z" },
  ];

  const handlePasteSvg = (rawText: string) => {
    setPasteInput(rawText);
    const extracted = extractSvgPath(rawText);
    if (extracted) {
      setPath(extracted);
    }
  };

  return (
    <div className="modal sub-modal" role="dialog" aria-label="아이콘 편집">
      <div className="modal-box editor-modal-box">
        <div className="pane-head">
          <div className="editor-head-title">
            <h3>{data.isNew ? "＋ 새 커스텀 아이콘 등록" : `아이콘 수정: ${data.key}`}</h3>
            <div className="tab-pills mode-switch-pills">
              <button
                type="button"
                className={mode === "gui" ? "on" : ""}
                onClick={() => setMode("gui")}
              >
                🎨 비주얼 GUI
              </button>
              <button
                type="button"
                className={mode === "code" ? "on" : ""}
                onClick={() => setMode("code")}
              >
                📝 SVG 패스 코드
              </button>
            </div>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="editor-form-body">
          <div className="grid-2col">
            <div className="field">
              <label>아이콘 키 (영문 식별자)</label>
              <input
                value={key}
                disabled={!data.isNew}
                onChange={(e) => setKey(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                placeholder="customStar, companyLogo 등"
              />
            </div>
            <div className="field">
              <label>국문 레이블</label>
              <input value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
          </div>

          <div className="field">
            <label>한글 별칭 (쉼표로 구분)</label>
            <input
              value={aliasesStr}
              onChange={(e) => setAliasesStr(e.target.value)}
              placeholder="별, 스타, 즐겨찾기"
            />
          </div>

          {/* Real-time Glyph Preview Box */}
          <div className="icon-preview-box-row">
            <div className="glyph-preview-cell">
              <svg
                viewBox="0 0 24 24"
                width={40}
                height={40}
                fill="none"
                stroke="#6ea8ff"
                strokeWidth={1.7}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={path} />
              </svg>
            </div>
            <div className="glyph-meta-cell">
              <strong>실시간 24×24 글리프 미리보기</strong>
              <p className="dim">24x24 viewBox 기준 스트로크 픽토그램으로 렌더링됩니다.</p>
            </div>
          </div>

          {mode === "gui" ? (
            <div className="gui-controls-section">
              <div className="field">
                <label>기본 형태 프리셋 선택</label>
                <div className="icon-presets-row">
                  {ICON_SHAPES.map((sh) => (
                    <button
                      key={sh.name}
                      type="button"
                      className="icon-preset-chip"
                      onClick={() => setPath(sh.path)}
                      title={sh.name}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width={20}
                        height={20}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.7}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={sh.path} />
                      </svg>
                      <span>{sh.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>📋 외부 SVG 마크업 붙여넣기 (자동 패스 추출)</label>
                <textarea
                  rows={2}
                  value={pasteInput}
                  onChange={(e) => handlePasteSvg(e.target.value)}
                  placeholder="<svg ...><path d='...' /></svg> 코드를 붙여넣으면 자동으로 경로(d)를 추출합니다."
                />
              </div>
            </div>
          ) : (
            <div className="field">
              <label>24×24 SVG 패스 (d="..." 속성값)</label>
              <textarea
                rows={4}
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="M12 2l3 7h7l-5.5 4.5 2 7.5-6.5-5-6.5 5 2-7.5L2 9h7z"
              />
            </div>
          )}
        </div>

        <div className="editor-modal-foot">
          <button type="button" className="ghost" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="primary"
            disabled={!key.trim() || !path.trim()}
            onClick={() => {
              const aliases = aliasesStr
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              onSave(key.trim(), { path: path.trim(), aliases, label: label.trim() || key.trim() });
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
