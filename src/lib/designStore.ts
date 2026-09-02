import { useSyncExternalStore } from "react";
import {
  registerCustomTheme,
  registerCustomSkin,
  registerCustomIcon,
  registerCustomVector,
  unregisterCustomItem,
} from "../engine/boot";
import type { CustomDesignLibrary, SkinDefinition, ThemeDefinition } from "../engine/types";

const STORAGE_KEY = "gmotion_custom_design_v1";

const SCHEMA_VERSION = 1;

interface StoredLibrary extends CustomDesignLibrary {
  schemaVersion?: number;
}

/** 버전 n → n+1 로 올리는 함수만 채운다. 다음 스키마 변경 때 여기에 추가한다. */
const MIGRATIONS: Record<number, (lib: StoredLibrary) => StoredLibrary> = {
  0: (lib) => ({ ...lib, skins: lib.skins || {}, schemaVersion: 1 }),
};

function migrate(lib: StoredLibrary): CustomDesignLibrary {
  let cur = lib;
  let v = cur.schemaVersion ?? 0;
  while (v < SCHEMA_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) break; /* 처리할 마이그레이션이 없으면 있는 그대로 둔다 — 데이터를 버리지 않는다 */
    cur = step(cur);
    v = cur.schemaVersion ?? v + 1;
  }
  const { schemaVersion: _drop, ...lib2 } = cur;
  return lib2 as CustomDesignLibrary;
}

const EMPTY_LIBRARY: CustomDesignLibrary = {
  themes: {},
  skins: {},
  icons: {},
  arts: {},
  marks: {},
  decors: {},
  frames: {},
};

let currentLibrary: CustomDesignLibrary = loadInitialLibrary();
const listeners = new Set<() => void>();

type SaveErrorListener = (message: string) => void;
const saveErrorListeners = new Set<SaveErrorListener>();
export function onLibrarySaveError(fn: SaveErrorListener): () => void {
  saveErrorListeners.add(fn);
  return () => saveErrorListeners.delete(fn);
}

function syncLibraryToEngine(lib: CustomDesignLibrary): void {
  for (const [k, v] of Object.entries(lib.themes)) {
    registerCustomTheme(k, v);
  }
  for (const [k, v] of Object.entries(lib.skins)) {
    registerCustomSkin(k, v);
  }
  for (const [k, v] of Object.entries(lib.icons)) {
    registerCustomIcon(k, v.path, v.aliases, v.label);
  }
  for (const [k, v] of Object.entries(lib.arts)) {
    registerCustomVector("ART", k, { label: v.label, svg: v.svg, image: v.image, fit: v.fit });
  }
  for (const [k, v] of Object.entries(lib.marks)) {
    registerCustomVector("MARK", k, {
      label: v.label,
      where: v.where,
      svg: v.svg,
      draw: v.draw,
      text: v.text,
    });
  }
  for (const [k, v] of Object.entries(lib.decors)) {
    registerCustomVector("DECOR", k, {
      label: v.label,
      category: v.category,
      svg: v.svg,
      image: v.image,
      fit: v.fit,
    });
  }
  for (const [k, v] of Object.entries(lib.frames)) {
    registerCustomVector("FRAME", k, { label: v.label, ratio: v.ratio, svg: v.svg, bar: v.bar });
  }
}

function loadInitialLibrary(): CustomDesignLibrary {
  if (typeof window === "undefined" || !window.localStorage) {
    return { ...EMPTY_LIBRARY };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_LIBRARY };
    const parsed = JSON.parse(raw) as StoredLibrary;
    const lib = migrate({
      themes: parsed.themes || {},
      skins: parsed.skins || {},
      icons: parsed.icons || {},
      arts: parsed.arts || {},
      marks: parsed.marks || {},
      decors: parsed.decors || {},
      frames: parsed.frames || {},
      schemaVersion: parsed.schemaVersion,
    });
    syncLibraryToEngine(lib);
    return lib;
  } catch (err) {
    console.warn("Failed to load custom design library:", err);
    return { ...EMPTY_LIBRARY };
  }
}

function saveLibrary(lib: CustomDesignLibrary): void {
  currentLibrary = lib;
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...lib, schemaVersion: SCHEMA_VERSION }));
    }
  } catch (err) {
    console.error("Failed to save custom design library to localStorage:", err);
    const msg =
      "디자인 라이브러리를 저장하지 못했다 — 저장 공간이 가득 찼을 수 있다. 내보내기로 백업한 뒤 오래된 항목을 지운다.";
    saveErrorListeners.forEach((l) => l(msg));
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CustomDesignLibrary {
  return currentLibrary;
}

const MARK_WHERE: Record<string, true> = {
  under: true,
  around: true,
  behind: true,
  point: true,
  corner: true,
  ribbon: true,
};
const MAX_SVG_LEN = 200_000;
/** 이미지(data URI)는 localStorage 에 그대로 들어간다 — 문자 수 기준 2MB 상한 */
export const MAX_IMAGE_LEN = 2 * 1024 * 1024;
const IMAGE_TOO_BIG_MSG =
  "이미지가 너무 크다 — data URI 기준 2MB(문자 수) 이하만 저장할 수 있다. 더 작은 이미지를 쓴다.";

function isValidEntry(kind: keyof CustomDesignLibrary, v: unknown): boolean {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  const str = (x: unknown): x is string => typeof x === "string";
  const svgOk = (x: unknown) => str(x) && x.length > 0 && x.length <= MAX_SVG_LEN;
  switch (kind) {
    case "themes":
      return (
        str(o.label) &&
        ["bg", "bg2", "ink", "ink2", "dim", "accent", "accent2", "good", "warn", "bad"].every((k) =>
          str(o[k]),
        )
      );
    case "skins":
      return true;
    case "icons":
      return str(o.path) && Array.isArray(o.aliases) && (o.aliases as unknown[]).every(str);
    case "arts":
    case "decors": {
      if (!str(o.label)) return false;
      const hasSvg = o.svg != null;
      const hasImage = o.image != null;
      if (hasSvg === hasImage) return false; /* svg 또는 image 중 정확히 하나 */
      if (o.fit != null && o.fit !== "contain" && o.fit !== "cover") return false;
      if (hasImage) return str(o.image) && o.image.length > 0 && o.image.length <= MAX_IMAGE_LEN;
      return svgOk(o.svg);
    }
    case "marks":
      return str(o.label) && svgOk(o.svg) && !!MARK_WHERE[o.where as string];
    case "frames":
      return (
        str(o.label) && svgOk(o.svg) && typeof o.ratio === "number" && Number.isFinite(o.ratio)
      );
    default:
      return false;
  }
}

/* ── Store Actions ─────────────────────────────────────────────────── */

export const designStore = {
  getLibrary(): CustomDesignLibrary {
    return currentLibrary;
  },

  addTheme(key: string, def: ThemeDefinition): void {
    const next: CustomDesignLibrary = {
      ...currentLibrary,
      themes: { ...currentLibrary.themes, [key]: { ...def, custom: true } },
    };
    registerCustomTheme(key, { ...def, custom: true });
    saveLibrary(next);
  },

  updateTheme(key: string, def: ThemeDefinition): void {
    designStore.addTheme(key, def);
  },

  deleteTheme(key: string): void {
    const themes = { ...currentLibrary.themes };
    delete themes[key];
    unregisterCustomItem("theme", key);
    saveLibrary({ ...currentLibrary, themes });
  },

  /* ── 스킨 — 디자인 프리미티브의 구현부 ──────────────────────────── */

  addSkin(key: string, def: SkinDefinition): void {
    const withFlag: SkinDefinition = { ...def, custom: true };
    const next: CustomDesignLibrary = {
      ...currentLibrary,
      skins: { ...currentLibrary.skins, [key]: withFlag },
    };
    registerCustomSkin(key, withFlag);
    saveLibrary(next);
  },

  updateSkin(key: string, def: SkinDefinition): void {
    designStore.addSkin(key, def);
  },

  deleteSkin(key: string): void {
    const skins = { ...currentLibrary.skins };
    delete skins[key];
    unregisterCustomItem("skin", key);
    saveLibrary({ ...currentLibrary, skins });
  },

  /**
   * 스펙에 인라인할 형태로 스킨을 꺼낸다.
   *
   * 앱에 등록만 해 두면 CLI 로 빌드하거나 스펙을 남에게 넘겼을 때 모습이 재현되지
   * 않는다 — 스펙 파일 안에 정의가 들어 있어야 한다. 저장·내보내기 경로가 이걸 쓴다.
   */
  skinDefOf(key: string): SkinDefinition | null {
    const def = currentLibrary.skins[key];
    return def ? { ...def } : null;
  },

  addIcon(key: string, path: string, aliases: string[] = [], label?: string): void {
    const next: CustomDesignLibrary = {
      ...currentLibrary,
      icons: {
        ...currentLibrary.icons,
        [key]: { path, aliases, label: label || key },
      },
    };
    registerCustomIcon(key, path, aliases, label);
    saveLibrary(next);
  },

  deleteIcon(key: string): void {
    const icons = { ...currentLibrary.icons };
    delete icons[key];
    unregisterCustomItem("icon", key);
    saveLibrary({ ...currentLibrary, icons });
  },

  addArt(
    key: string,
    item: { label: string; svg?: string; image?: string; fit?: "contain" | "cover" },
  ): void {
    if (item.image && item.image.length > MAX_IMAGE_LEN) {
      saveErrorListeners.forEach((l) => l(IMAGE_TOO_BIG_MSG));
      return;
    }
    /* svg 또는 image 중 하나만 담는다 — 엔진 계약(둘 다 있으면 검증 오류) */
    const entry: CustomDesignLibrary["arts"][string] = item.image
      ? { label: item.label, image: item.image, fit: item.fit }
      : { label: item.label, svg: item.svg };
    const next: CustomDesignLibrary = {
      ...currentLibrary,
      arts: { ...currentLibrary.arts, [key]: entry },
    };
    registerCustomVector("ART", key, entry);
    saveLibrary(next);
  },

  deleteArt(key: string): void {
    const arts = { ...currentLibrary.arts };
    delete arts[key];
    unregisterCustomItem("ART", key);
    saveLibrary({ ...currentLibrary, arts });
  },

  addMark(
    key: string,
    label: string,
    where: "under" | "around" | "behind" | "point" | "corner" | "ribbon",
    svg: string,
    draw: boolean = true,
    text: boolean = false,
  ): void {
    const next: CustomDesignLibrary = {
      ...currentLibrary,
      marks: { ...currentLibrary.marks, [key]: { label, where, svg, draw, text } },
    };
    registerCustomVector("MARK", key, { label, where, svg, draw, text });
    saveLibrary(next);
  },

  deleteMark(key: string): void {
    const marks = { ...currentLibrary.marks };
    delete marks[key];
    unregisterCustomItem("MARK", key);
    saveLibrary({ ...currentLibrary, marks });
  },

  addDecor(
    key: string,
    item: {
      label: string;
      category?: string;
      svg?: string;
      image?: string;
      fit?: "contain" | "cover";
    },
  ): void {
    if (item.image && item.image.length > MAX_IMAGE_LEN) {
      saveErrorListeners.forEach((l) => l(IMAGE_TOO_BIG_MSG));
      return;
    }
    const entry: CustomDesignLibrary["decors"][string] = item.image
      ? { label: item.label, category: item.category, image: item.image, fit: item.fit }
      : { label: item.label, category: item.category, svg: item.svg };
    const next: CustomDesignLibrary = {
      ...currentLibrary,
      decors: { ...currentLibrary.decors, [key]: entry },
    };
    registerCustomVector("DECOR", key, entry);
    saveLibrary(next);
  },

  deleteDecor(key: string): void {
    const decors = { ...currentLibrary.decors };
    delete decors[key];
    unregisterCustomItem("DECOR", key);
    saveLibrary({ ...currentLibrary, decors });
  },

  addFrame(key: string, label: string, ratio: number, svg: string, bar?: number): void {
    const next: CustomDesignLibrary = {
      ...currentLibrary,
      frames: { ...currentLibrary.frames, [key]: { label, ratio, svg, bar } },
    };
    registerCustomVector("FRAME", key, { label, ratio, svg, bar });
    saveLibrary(next);
  },

  deleteFrame(key: string): void {
    const frames = { ...currentLibrary.frames };
    delete frames[key];
    unregisterCustomItem("FRAME", key);
    saveLibrary({ ...currentLibrary, frames });
  },

  resetDefaults(): void {
    for (const k of Object.keys(currentLibrary.themes)) unregisterCustomItem("theme", k);
    for (const k of Object.keys(currentLibrary.icons)) unregisterCustomItem("icon", k);
    for (const k of Object.keys(currentLibrary.arts)) unregisterCustomItem("ART", k);
    for (const k of Object.keys(currentLibrary.marks)) unregisterCustomItem("MARK", k);
    for (const k of Object.keys(currentLibrary.decors)) unregisterCustomItem("DECOR", k);
    for (const k of Object.keys(currentLibrary.frames)) unregisterCustomItem("FRAME", k);
    saveLibrary({ ...EMPTY_LIBRARY });
  },

  exportLibraryJSON(): string {
    return JSON.stringify(currentLibrary, null, 2);
  },

  importLibraryJSON(jsonStr: string): {
    success: boolean;
    count: number;
    skipped: number;
    error?: string;
  } {
    try {
      const parsed = JSON.parse(jsonStr) as Partial<CustomDesignLibrary>;
      if (typeof parsed !== "object" || parsed === null) {
        return { success: false, count: 0, skipped: 0, error: "유효한 JSON 객체가 아닙니다." };
      }
      const KINDS: (keyof CustomDesignLibrary)[] = [
        "themes",
        "skins",
        "icons",
        "arts",
        "marks",
        "decors",
        "frames",
      ];
      let count = 0;
      let skipped = 0;
      const merged: CustomDesignLibrary = { ...currentLibrary };
      for (const kind of KINDS) {
        const incoming = (parsed[kind] || {}) as Record<string, unknown>;
        const next = { ...merged[kind] } as Record<string, unknown>;
        for (const [k, v] of Object.entries(incoming)) {
          if (isValidEntry(kind, v)) {
            next[k] = v;
            count++;
          } else skipped++;
        }
        (merged as unknown as Record<string, unknown>)[kind] = next;
      }
      syncLibraryToEngine(merged);
      saveLibrary(merged);
      return { success: true, count, skipped };
    } catch (err) {
      return {
        success: false,
        count: 0,
        skipped: 0,
        error: err instanceof Error ? err.message : "JSON 파싱 오류",
      };
    }
  },
};

export function useDesignStore() {
  const library = useSyncExternalStore(subscribe, getSnapshot);
  return {
    library,
    ...designStore,
  };
}
