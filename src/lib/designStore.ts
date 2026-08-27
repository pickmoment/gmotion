import { useSyncExternalStore } from "react";
import {
  registerCustomTheme,
  registerCustomIcon,
  registerCustomVector,
  unregisterCustomItem,
} from "../engine/boot";
import type { CustomDesignLibrary, ThemeDefinition } from "../engine/types";

const STORAGE_KEY = "gmotion_custom_design_v1";

const EMPTY_LIBRARY: CustomDesignLibrary = {
  themes: {},
  icons: {},
  arts: {},
  marks: {},
  decors: {},
  frames: {},
};

let currentLibrary: CustomDesignLibrary = loadInitialLibrary();
const listeners = new Set<() => void>();

function syncLibraryToEngine(lib: CustomDesignLibrary): void {
  for (const [k, v] of Object.entries(lib.themes)) {
    registerCustomTheme(k, v);
  }
  for (const [k, v] of Object.entries(lib.icons)) {
    registerCustomIcon(k, v.path, v.aliases, v.label);
  }
  for (const [k, v] of Object.entries(lib.arts)) {
    registerCustomVector("ART", k, { label: v.label, svg: v.svg });
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
    registerCustomVector("DECOR", k, { label: v.label, category: v.category, svg: v.svg });
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
    const parsed = JSON.parse(raw) as Partial<CustomDesignLibrary>;
    const lib: CustomDesignLibrary = {
      themes: parsed.themes || {},
      icons: parsed.icons || {},
      arts: parsed.arts || {},
      marks: parsed.marks || {},
      decors: parsed.decors || {},
      frames: parsed.frames || {},
    };
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
    }
  } catch (err) {
    console.error("Failed to save custom design library to localStorage:", err);
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

  addArt(key: string, label: string, svg: string): void {
    const next: CustomDesignLibrary = {
      ...currentLibrary,
      arts: { ...currentLibrary.arts, [key]: { label, svg } },
    };
    registerCustomVector("ART", key, { label, svg });
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
    text: boolean = false
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

  addDecor(key: string, label: string, svg: string, category?: string): void {
    const next: CustomDesignLibrary = {
      ...currentLibrary,
      decors: { ...currentLibrary.decors, [key]: { label, svg, category } },
    };
    registerCustomVector("DECOR", key, { label, svg, category });
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

  importLibraryJSON(jsonStr: string): { success: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr) as Partial<CustomDesignLibrary>;
      if (typeof parsed !== "object" || parsed === null) {
        return { success: false, count: 0, error: "유효한 JSON 객체가 아닙니다." };
      }
      const themes = { ...currentLibrary.themes, ...(parsed.themes || {}) };
      const icons = { ...currentLibrary.icons, ...(parsed.icons || {}) };
      const arts = { ...currentLibrary.arts, ...(parsed.arts || {}) };
      const marks = { ...currentLibrary.marks, ...(parsed.marks || {}) };
      const decors = { ...currentLibrary.decors, ...(parsed.decors || {}) };
      const frames = { ...currentLibrary.frames, ...(parsed.frames || {}) };

      const next: CustomDesignLibrary = { themes, icons, arts, marks, decors, frames };
      syncLibraryToEngine(next);
      saveLibrary(next);

      const count =
        Object.keys(parsed.themes || {}).length +
        Object.keys(parsed.icons || {}).length +
        Object.keys(parsed.arts || {}).length +
        Object.keys(parsed.marks || {}).length +
        Object.keys(parsed.decors || {}).length +
        Object.keys(parsed.frames || {}).length;

      return { success: true, count };
    } catch (err) {
      return {
        success: false,
        count: 0,
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
