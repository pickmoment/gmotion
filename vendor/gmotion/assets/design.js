/*!
 * design.js — 스펙에 인라인한 커스텀 디자인 요소
 *
 * 왜 이 파일이 있나.
 *   커스텀 요소를 앱의 레지스트리에만 등록해 두면, 스펙은 **이름만** 참조하기 때문에
 *   같은 스펙을 CLI 로 빌드하거나 남에게 넘기면 그 요소가 없다 —
 *   `theme "myBrand" 는 없다` 가 뜨고 조용히 midnight 으로 떨어진다.
 *   스킨은 `skin: {...}` 로 스펙에 담을 길이 있었지만 테마·픽토그램·벡터는 없었다.
 *   그 비대칭을 없앤다. 스펙의 `design` 블록 하나에 전부 담는다.
 *
 * 모양은 앱의 커스텀 라이브러리와 **같다** — 앱이 내보낸 JSON 을 그대로 붙일 수 있다.
 *
 *   "design": {
 *     "themes":  { "myBrand": { "label":"…", "bg":"#0b1020", … } },
 *     "skins":   { "myBrand": { "extends":"flat", "vars":{ "r-lg":"4px" } } },
 *     "icons":   { "myLogo":  { "path":"M4 4 …", "aliases":["로고"] } },
 *     "arts":    { "myArt":   { "label":"…", "svg":"<circle …/>" } },
 *     "marks":   { "myMark":  { "label":"…", "where":"under", "svg":"…" } },
 *     "decors":  { "myBg":    { "label":"…", "svg":"…" } },
 *     "frames":  { "myFrame": { "label":"…", "ratio":1.6, "svg":"…" } }
 *   }
 *
 * 설계 원칙 두 가지.
 *
 *  1. **빌드 범위로만 등록한다.** 엔진의 레지스트리는 모듈 수준이라 그냥 넣으면
 *     같은 프로세스의 다음 빌드까지 오염된다(앱은 타이핑마다 빌드한다).
 *     `install` 이 이전 값을 기억한 토큰을 돌려주고 `restore` 가 원상복구한다.
 *     기본 요소와 이름이 겹쳐도 안전하다 — 빌드가 끝나면 기본 요소가 돌아온다.
 *  2. **SVG 는 문자열 템플릿으로 받는다.** `{W}` `{accent}` 같은 자리를 값으로 채운다 —
 *     테마 색이 자동으로 따라오고, 스펙에 함수를 담지 않아도 된다(JSON 이어야 한다).
 */
'use strict';

/* 스펙의 design 블록에 담을 수 있는 갈래. 앱의 커스텀 라이브러리와 키가 같다. */
var KINDS = ['themes', 'skins', 'icons', 'arts', 'marks', 'decors', 'frames'];

/* 테마가 반드시 가져야 하는 값 — 하나라도 없으면 스타일시트가 조용히 깨진다 */
var THEME_REQUIRED = ['bg', 'bg2', 'ink', 'ink2', 'dim', 'accent', 'accent2', 'good', 'warn', 'bad'];
/* 없으면 채워 주는 값 — 있으나 마나 한 것까지 적게 만들지 않는다 */
var THEME_DEFAULTS = {
  line: 'rgba(128,128,128,.16)', panel: 'rgba(255,255,255,.04)', panelLine: 'rgba(128,128,128,.18)',
  font: 'display', grain: .04, vig: .4, glow: 0
};

var MARK_WHERE = ['under', 'around', 'behind', 'strike', 'point', 'corner', 'badge', 'ribbon', 'tape', 'stamp'];

/** `{이름}` 자리를 값으로 채운다. 값이 없는 자리는 그대로 남는다(눈에 보여야 고친다). */
function fill(svg, vars) {
  var out = String(svg);
  for (var k in vars) {
    if (!Object.prototype.hasOwnProperty.call(vars, k)) continue;
    out = out.split('{' + k + '}').join(String(vars[k]));
  }
  return out;
}

/** 테마 색을 템플릿 값으로. 모든 벡터가 같은 이름을 쓴다. */
function themeVars(T) {
  return {
    accent: T.accent, accent2: T.accent2, ink: T.ink, ink2: T.ink2, dim: T.dim,
    bg: T.bg, bg2: T.bg2, good: T.good, warn: T.warn, bad: T.bad,
    line: T.line, panel: T.panel, pline: T.panelLine
  };
}

/** 통째 svg 를 준 게 아니면 껍데기를 씌운다 — 조각만 줘도 되게 한다. */
function wrap(filled, cls, viewBox) {
  return filled.indexOf('<svg') >= 0 ? filled
    : '<svg class="' + cls + '" viewBox="' + viewBox + '" aria-hidden="true">' + filled + '</svg>';
}

/* ================================================================== *
 * 정의 → 레지스트리 항목
 *
 * 앱과 CLI 가 **같은 함수**를 쓴다. 예전에는 앱의 boot.ts 안에만 있어서
 * 두 경로의 결과가 어긋날 수 있었다.
 * ================================================================== */
var makers = {
  theme: function (def) {
    var T = {};
    for (var k in def) if (Object.prototype.hasOwnProperty.call(def, k)) T[k] = def[k];
    for (var d in THEME_DEFAULTS) if (T[d] == null) T[d] = THEME_DEFAULTS[d];
    if (!T.label) T.label = '커스텀 테마';
    T.custom = true;
    return T;
  },
  decor: function (def) {
    return {
      label: def.label || '커스텀 배경', category: def.category, custom: true,
      build: function (W, H, T, lv) {
        var v = themeVars(T); v.W = W; v.H = H; v.lv = lv;
        return wrap(fill(def.svg, v), 'gg-decor', '0 0 ' + W + ' ' + H);
      }
    };
  },
  mark: function (def) {
    return {
      label: def.label || '커스텀 마크',
      where: MARK_WHERE.indexOf(def.where) >= 0 ? def.where : 'under',
      draw: def.draw !== false, text: !!def.text, custom: true,
      build: function (T, text) {
        var v = themeVars(T); v.text = text || '';
        return fill(def.svg, v);
      }
    };
  },
  art: function (def) {
    return {
      label: def.label || '커스텀 일러스트', custom: true,
      build: function (T) { return wrap(fill(def.svg, themeVars(T)), 'gg-art', '0 0 200 200'); }
    };
  },
  frame: function (def) {
    var ratio = typeof def.ratio === 'number' && def.ratio > 0 ? def.ratio : 16 / 9;
    /* inner 는 프레임 안에 콘텐츠가 들어갈 자리다. 비율로 받아 화면비에 따라간다. */
    var pad = def.pad && typeof def.pad === 'object' ? def.pad : {};
    var px = typeof pad.x === 'number' ? pad.x : .05, py = typeof pad.y === 'number' ? pad.y : .08;
    return {
      label: def.label || '커스텀 프레임', ratio: ratio, bar: def.bar, custom: true,
      build: function (W, H, T) {
        var v = themeVars(T); v.W = W; v.H = H;
        var padX = Math.round(W * px), padY = Math.round(H * py);
        return {
          svg: wrap(fill(def.svg, v), 'gg-frame', '0 0 ' + W + ' ' + H),
          inner: { x: padX, y: padY, w: W - padX * 2, h: H - padY * 2 }
        };
      }
    };
  }
};

/* ================================================================== *
 * 빌드 범위 등록
 * ================================================================== */

function remember(token, bag, key) {
  token.push({ bag: bag, key: key,
    had: Object.prototype.hasOwnProperty.call(bag, key), prev: bag[key] });
}

/**
 * 스펙의 design 블록을 레지스트리에 얹는다. 돌려받은 토큰을 `restore` 에 넘긴다.
 *
 * reg: { THEMES, ICONS, ALIAS, VEC, SK }
 */
function install(design, reg) {
  var token = [];
  if (!design || typeof design !== 'object') return token;

  var themes = design.themes || {};
  for (var t in themes) if (Object.prototype.hasOwnProperty.call(themes, t)) {
    remember(token, reg.THEMES, t);
    reg.THEMES[t] = makers.theme(themes[t]);
  }

  var skins = design.skins || {};
  for (var s in skins) if (Object.prototype.hasOwnProperty.call(skins, s)) {
    remember(token, reg.SK.SKINS, s);
    reg.SK.registerSkin(s, skins[s]);
  }

  var icons = design.icons || {};
  for (var i in icons) if (Object.prototype.hasOwnProperty.call(icons, i)) {
    var ic = icons[i];
    remember(token, reg.ICONS, i);
    reg.ICONS[i] = typeof ic === 'string' ? ic : ic.path;
    /* 별칭도 되돌려야 한다 — 한글 이름으로 찾는 길이 다음 빌드에 남으면 안 된다 */
    var names = [].concat(ic && ic.label ? [ic.label] : [], (ic && ic.aliases) || []);
    for (var a = 0; a < names.length; a++) {
      var nm = String(names[a]).trim();
      if (!nm) continue;
      remember(token, reg.ALIAS, nm);
      reg.ALIAS[nm] = i;
    }
  }

  [['arts', 'ART', 'art'], ['marks', 'MARK', 'mark'],
   ['decors', 'DECOR', 'decor'], ['frames', 'FRAME', 'frame']].forEach(function (m) {
    var bag = design[m[0]] || {};
    for (var k in bag) if (Object.prototype.hasOwnProperty.call(bag, k)) {
      remember(token, reg.VEC[m[1]], k);
      reg.VEC[m[1]][k] = makers[m[2]](bag[k]);
    }
  });

  return token;
}

/** install 이 건드린 것을 전부 원상복구한다. 넣은 순서의 역순으로 되돌린다. */
function restore(token) {
  if (!token) return;
  for (var i = token.length - 1; i >= 0; i--) {
    var e = token[i];
    if (e.had) e.bag[e.key] = e.prev;
    else delete e.bag[e.key];
  }
}

/* ================================================================== *
 * 검증 — 정의가 부실하면 조용히 이상한 화면이 나온다
 * ================================================================== */

function validate(design, SK) {
  var errors = [], warnings = [];
  if (design == null) return { errors: errors, warnings: warnings };
  if (typeof design !== 'object' || Array.isArray(design)) {
    errors.push('design 은 객체여야 한다 (갈래: ' + KINDS.join(' ') + ').');
    return { errors: errors, warnings: warnings };
  }
  Object.keys(design).forEach(function (k) {
    if (KINDS.indexOf(k) < 0) errors.push('design.' + k + ' 는 없는 갈래다 (' + KINDS.join(' ') + ').');
  });

  var themes = design.themes || {};
  Object.keys(themes).forEach(function (k) {
    var missing = THEME_REQUIRED.filter(function (f) { return !themes[k] || !themes[k][f]; });
    if (missing.length) errors.push('design.themes.' + k + ' 에 색이 없다: ' + missing.join(' ') + '.');
    if (themes[k] && !themes[k].label) warnings.push('design.themes.' + k + ' 에 label 이 없다 — 목록에서 구분이 안 된다.');
  });

  var skins = design.skins || {};
  Object.keys(skins).forEach(function (k) {
    var d = skins[k] || {};
    if (d['extends'] != null && SK && !SK.SKINS[d['extends']])
      errors.push('design.skins.' + k + '.extends "' + d['extends'] + '" 는 없다.');
    var bad = SK ? SK.unknownTokens(d.vars || {}) : [];
    if (bad.length) errors.push('design.skins.' + k + '.vars 에 없는 토큰: ' + bad.join(' ') + '.');
  });

  var icons = design.icons || {};
  Object.keys(icons).forEach(function (k) {
    var d = icons[k];
    var pathStr = typeof d === 'string' ? d : (d && d.path);
    if (!pathStr) { errors.push('design.icons.' + k + ' 에 path 가 없다.'); return; }
    if (!/^[Mm]/.test(String(pathStr).trim()))
      warnings.push('design.icons.' + k + ' 의 path 가 M 으로 시작하지 않는다 — 24×24 좌표의 path d 여야 한다.');
  });

  [['arts', '일러스트'], ['marks', '마크'], ['decors', '배경'], ['frames', '프레임']].forEach(function (m) {
    var bag = design[m[0]] || {};
    Object.keys(bag).forEach(function (k) {
      if (!bag[k] || !bag[k].svg) errors.push('design.' + m[0] + '.' + k + ' 에 svg 가 없다.');
    });
  });

  var marks = design.marks || {};
  Object.keys(marks).forEach(function (k) {
    var w = marks[k] && marks[k].where;
    if (w != null && MARK_WHERE.indexOf(w) < 0)
      errors.push('design.marks.' + k + '.where "' + w + '" 는 없다 (' + MARK_WHERE.join(' ') + ').');
  });

  return { errors: errors, warnings: warnings };
}

module.exports = {
  KINDS: KINDS, MARK_WHERE: MARK_WHERE, THEME_REQUIRED: THEME_REQUIRED,
  makers: makers, install: install, restore: restore, validate: validate, fill: fill
};
