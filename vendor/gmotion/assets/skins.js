/*!
 * skins.js — 디자인 프리미티브(인터페이스)와 스킨(구현부)
 *
 * 왜 이 파일이 따로 있나.
 *   gsapgraph.js 의 스타일시트에는 클래스가 170종 넘게 있지만, 그중 "모습"을 결정하는
 *   실제 재료는 한 줌이다 — 표면(패널) 레시피 하나가 카드·노드·스텝·칩·패널·레이어·
 *   상세·타깃 열 계열에서 그대로 반복되고, 선 굵기 여섯 개가 모든 연결선을 만든다.
 *   그래서 부품 170개를 각각 교체 가능하게 만들지 않는다. **원시 요소(프리미티브)를
 *   CSS 커스텀 프로퍼티 계약으로 뽑고, 그 값 묶음을 스킨이라 부른다.**
 *
 *   - 인터페이스 = 아래 TOKENS 목록. 스타일시트는 이 변수만 읽는다.
 *   - 구현부     = SKINS[이름].vars(T, A) 가 돌려주는 값 묶음 (+ 필요하면 rules).
 *
 *   스킨 하나가 20~40줄이고, 그것만 갈아도 170개 클래스가 전부 따라온다.
 *
 * 계약 두 가지.
 *   1. `glass` 는 기본 구현이자 **회귀 기준**이다. 모든 토큰을 빠짐없이 정의하며,
 *      값은 프리미티브를 뽑기 전 스타일시트의 하드코딩 값과 1:1로 같다.
 *      다른 스킨은 바꾸고 싶은 토큰만 적고, 나머지는 glass 에서 채워진다.
 *   2. 토큰 값은 **CSS 선언에 그대로 꽂히는 문자열**이다. 계산이 필요하면
 *      vars(T, A) 안에서 끝낸다 — T 는 테마 색, A 는 {w,h} 화면비다.
 *      덕분에 스킨은 테마·화면비와 직교한다(테마 12종 × 스킨 6종이 다 성립한다).
 */
'use strict';

/* ================================================================== *
 * 인터페이스 — 프리미티브 토큰 계약
 *
 * 스타일시트가 읽는 변수의 전체 목록이다. 여기 없는 변수를 스타일시트가 읽으면
 * 스킨이 그 값을 바꿀 길이 없다는 뜻이므로, 규칙을 고칠 때 이 표를 같이 늘린다.
 * (validate 가 커스텀 스킨의 오타를 이 목록으로 잡는다.)
 * ================================================================== */
var TOKENS = {
  /* ---- 표면 — 패널 계열 열 곳이 공유하는 레시피 ---- */
  'surf-fill':   '면 색. card·node·step·panel·side·layer·detail·chip·target',
  'surf-line':   '테두리 색',
  'surf-lw':     '테두리 굵기',
  'surf-lw2':    '강조 테두리 굵기. target·center 처럼 주목시키는 면',
  'surf-shadow': '표면 그림자. none 이면 없음',
  /* ---- 모서리 반경 — 5단 스케일 ---- */
  'r-lg':        '큰 면. card · panel/side · target/center',
  'r-md':        '중간 면. step · detail · quote',
  'r-ms':        '중소 면. node',
  'r-sm':        '작은 면. chip · layer · satellite',
  'r-xs':        '타일. 디바이스 화면 안의 항목',
  /* ---- 배경 블러 — 유리 재질의 세기. none 이면 불투명 ---- */
  'bd-1':        '약. node · step · layer · chip',
  'bd-2':        '기본. card · panel/side',
  'bd-3':        '중. target/center',
  'bd-4':        '강. detail',
  /* ---- 링 — 중심을 표시하는 이중 테두리 ---- */
  'hub-ring':    'networkBuild 의 허브 노드 링',
  'target-ring': 'convergence 의 수렴 지점 링',
  /* ---- 연결선 ---- */
  'ln-cap':      '선 끝 모양. round · butt · square',
  'link-w':      '관계선 굵기', 'link-op': '관계선 불투명도',
  'arrow-w':     '화살표 굵기', 'arrow-op': '화살표 불투명도',
  'flow-w':      '흐름선 굵기', 'flow-op': '흐름선 불투명도',
  'route-w':     '경로선 굵기', 'route-op': '경로선 불투명도', 'route-dash': '경로선 점선 간격',
  'ring-w':      '궤도 원 굵기', 'ring-dash': '궤도 원 점선 간격',
  'dot-w':       '타임라인 점 테두리 굵기', 'dot-fill': '타임라인 점 속색',
  'flowdot-size': '흐르는 점 지름', 'flowdot-shadow': '흐르는 점 광채',
  /* ---- 타이포 ---- */
  'kick-size':   '킥커 크기', 'kick-mb': '킥커 아래 여백',
  'kick-caps':   '킥커 대문자화. uppercase · none', 'kick-w': '킥커 굵기',
  'title-w':     '제목 굵기', 'title-lh': '제목 행간',
  'sub-mt':      '부제 위 여백', 'sub-lh': '부제 행간',
  /* ---- 아이콘·강조 광채 ---- */
  'glow':        '강조 요소의 filter 값. 아이콘·룰·앵커 글자가 함께 쓴다',
  /* ---- 화면 자막 뱃지 ---- */
  'cc-fill':     '자막 뱃지 면 색', 'cc-line': '자막 뱃지 테두리 색', 'cc-lw': '자막 뱃지 테두리 굵기',
  'cc-r':        '자막 뱃지 모서리', 'cc-bd': '자막 뱃지 블러', 'cc-shadow': '자막 뱃지 그림자',
  'cc-ink':      '자막 글자색'
};

/* 테마 색에서 반투명 색을 만든다 — 16진수 알파를 붙인다(#rrggbb + aa) */
function alpha(hex, aa) {
  return String(hex).length >= 7 ? String(hex).slice(0, 7) + aa : hex;
}

/** 배경이 어두운 테마인가 — 표면 그림자·광택의 방향을 고른다 (gsapgraph 의 lum 과 같은 WCAG 식) */
function darkBg(hex) {
  var h = String(hex).replace('#', '');
  if (h.length < 6) return true;
  var c = [0, 1, 2].map(function (i) {
    var v = parseInt(h.substr(i * 2, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) < .5;
}

var SKINS = {};

/* ------------------------------------------------------------------ *
 * glass — 기본. 반투명 패널 + 배경 블러.
 *
 * 표면에는 세 겹이 들어간다 — 위쪽 헤어라인 하이라이트(inset), 유리 광택(윗면이
 * 살짝 밝은 그라디언트), 낮게 깔린 그림자. 셋 다 빛이 위에서 온다는 하나의 가정을
 * 공유한다. 어두운 테마는 흰 하이라이트, 밝은 테마는 그림자가 형태를 만든다.
 * ------------------------------------------------------------------ */
SKINS.glass = {
  label: '글래스 — 반투명 패널 + 배경 블러. 기본값',
  vars: function (T, A) {
    var m = Math.min(A.w, A.h), dark = darkBg(T.bg);
    return {
      'surf-fill': dark
        ? 'linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,0) 58%),linear-gradient(var(--panel),var(--panel))'
        : 'var(--panel)',
      'surf-line': 'var(--pline)',
      'surf-lw': '1.5px', 'surf-lw2': '2px',
      'surf-shadow': dark
        ? 'inset 0 1px 0 rgba(255,255,255,.07),0 24px 48px -20px rgba(0,0,0,.55)'
        : 'inset 0 1px 0 rgba(255,255,255,.6),0 16px 36px -18px rgba(15,20,32,.18)',
      'r-lg': '24px', 'r-md': '20px', 'r-ms': '18px', 'r-sm': '16px', 'r-xs': '12px',
      'bd-1': 'blur(6px)', 'bd-2': 'blur(7px)', 'bd-3': 'blur(9px)', 'bd-4': 'blur(10px)',
      'hub-ring': '0 0 0 6px ' + alpha(T.accent, '18') + ',0 14px 34px -10px ' + alpha(T.accent, '30'),
      'target-ring': '0 0 0 8px ' + alpha(T.accent, '14') + ',0 14px 34px -10px ' + alpha(T.accent, '2b'),
      'ln-cap': 'round',
      'link-w': '2.2', 'link-op': '.5',
      'arrow-w': '2.6', 'arrow-op': '.72',
      'flow-w': '2.2', 'flow-op': '.45',
      'route-w': '2.4', 'route-op': '.4', 'route-dash': '8 12',
      'ring-w': '2', 'ring-dash': '6 10',
      'dot-w': '3.4', 'dot-fill': 'var(--bg)',
      'flowdot-size': '18px', 'flowdot-shadow': '0 0 16px var(--acc)',
      'kick-size': '26px', 'kick-mb': '22px', 'kick-caps': 'uppercase', 'kick-w': '600',
      'title-w': '800', 'title-lh': '1.08',
      'sub-mt': '26px', 'sub-lh': '1.5',
      /* 광채는 두 겹 — 좁고 진한 심지 + 넓고 옅은 번짐. 한 겹 광채는 스티커처럼 떠 보인다 */
      'glow': T.glow
        ? 'drop-shadow(0 0 ' + (T.glow * 5) + 'px ' + alpha(T.accent, 'b3') + ') drop-shadow(0 0 ' +
          (T.glow * 16) + 'px ' + alpha(T.accent, '59') + ')'
        : 'none',
      'cc-fill': 'rgba(10,14,24,.84)', 'cc-line': 'rgba(255,255,255,.16)', 'cc-lw': '1.5px',
      'cc-r': Math.round(m * .014) + 'px', 'cc-bd': 'blur(10px)',
      'cc-shadow': '0 8px 24px rgba(0,0,0,.45)', 'cc-ink': '#fff'
    };
  }
};

/* ------------------------------------------------------------------ *
 * flat — 블러도 투명도도 없는 불투명 면. 인쇄·저사양 화면·문서 톤.
 * 유리를 걷어내면 글자 대비가 올라간다 — 밝은 테마에서 특히 읽기 쉽다.
 * ------------------------------------------------------------------ */
SKINS.flat = {
  label: '플랫 — 불투명 면 + 얇은 테두리. 블러 없음. 문서·인쇄 톤',
  vars: function (T) {
    return {
      'surf-fill': T.bg2, 'surf-line': T.line, 'surf-lw': '1px',
      /* glass 가 그림자를 갖게 된 뒤에도 flat 은 이름대로 평평해야 한다 — 상속을 끊는다 */
      'surf-shadow': 'none',
      'r-lg': '14px', 'r-md': '12px', 'r-ms': '11px', 'r-sm': '10px', 'r-xs': '8px',
      'bd-1': 'none', 'bd-2': 'none', 'bd-3': 'none', 'bd-4': 'none',
      'glow': 'none',
      'link-op': '.62', 'flow-op': '.58', 'route-op': '.52',
      'cc-bd': 'none', 'cc-fill': 'rgba(12,14,18,.92)'
    };
  }
};

/* ------------------------------------------------------------------ *
 * brutalist — 반경 0, 굵은 잉크 테두리, 어긋난 하드 그림자. 편집 디자인·포스터 톤.
 *
 * 그림자를 ::after 로 깔지 않는다. GSAP 이 카드에 transform 을 걸면 그 카드가
 * 스태킹 컨텍스트가 되고, z-index:-1 인 ::after 는 카드 자기 배경 뒤로 들어가
 * 통째로 사라진다. box-shadow 는 그 함정이 없다 — 링이 필요한 허브·타깃은
 * 링과 오프셋을 한 목록으로 같이 준다.
 * ------------------------------------------------------------------ */
SKINS.brutalist = {
  label: '브루탈리스트 — 직각 + 굵은 잉크 테두리 + 어긋난 하드 그림자. 포스터·편집 톤',
  vars: function (T) {
    return {
      'surf-fill': T.bg2, 'surf-line': T.ink, 'surf-lw': '3px', 'surf-lw2': '4px',
      'r-lg': '0px', 'r-md': '0px', 'r-ms': '0px', 'r-sm': '0px', 'r-xs': '0px',
      'bd-1': 'none', 'bd-2': 'none', 'bd-3': 'none', 'bd-4': 'none',
      'surf-shadow': '9px 9px 0 ' + T.ink,
      'hub-ring': '0 0 0 3px ' + T.ink + ',9px 9px 0 ' + T.ink,
      'target-ring': '0 0 0 3px ' + T.ink + ',9px 9px 0 ' + T.ink,
      'ln-cap': 'butt',
      'link-w': '3', 'link-op': '.8', 'arrow-w': '3.4', 'arrow-op': '.9',
      'flow-w': '3', 'flow-op': '.7', 'route-w': '3', 'route-op': '.66', 'route-dash': '10 8',
      'ring-w': '3', 'dot-w': '4',
      'kick-mb': '18px', 'title-lh': '1', 'title-w': '900',
      'glow': 'none',
      'cc-r': '0px', 'cc-bd': 'none', 'cc-fill': T.ink, 'cc-line': T.ink, 'cc-shadow': '6px 6px 0 ' + alpha(T.accent, 'cc')
    };
  }
};

/* ------------------------------------------------------------------ *
 * clay — 클레이모피즘. 큰 반경 + 흰 테두리 + 안팎 이중 그림자로 볼륨을 만든다.
 * 원래 clay 테마 안에 !important 로 박혀 있던 특수 케이스를 스킨으로 승격했다 —
 * 이제 어떤 테마에도 얹을 수 있다.
 * ------------------------------------------------------------------ */
SKINS.clay = {
  label: '클레이 — 큰 반경 + 흰 테두리 + 이중 그림자로 점토 볼륨. 친근한 설명 톤',
  vars: function () {
    return {
      /* 테두리 색은 테마에 맡긴다 — clay 테마의 panelLine 이 이미 흰 하이라이트(rgba(255,255,255,.9))라
         원래 모습이 그대로 나오고, 어두운 테마에 얹어도 흰 선이 튀지 않는다 */
      'surf-lw': '2.5px', 'surf-lw2': '3px',
      'r-lg': '32px', 'r-md': '32px', 'r-ms': '32px', 'r-sm': '26px', 'r-xs': '18px',
      'surf-shadow': '0 18px 40px rgba(45,35,25,.14),inset 0 6px 12px rgba(255,255,255,.9),' +
        'inset 0 -6px 14px rgba(45,35,25,.08)',
      'bd-1': 'none', 'bd-2': 'none', 'bd-3': 'none', 'bd-4': 'none',
      'ln-cap': 'round', 'link-w': '3.2', 'flow-w': '3.2', 'arrow-w': '3.6', 'dot-w': '4.2',
      'cc-r': '22px'
    };
  }
};

/* ------------------------------------------------------------------ *
 * paper — 종이에 인쇄한 것처럼. 작은 반경, 실선 한 겹, 낮게 깔린 그림자.
 * 손그림 강조(mark)와 함께 쓰면 스케치노트 톤이 된다.
 * ------------------------------------------------------------------ */
SKINS.paper = {
  label: '페이퍼 — 작은 반경 + 실선 한 겹 + 낮은 그림자. 종이·스케치노트 톤',
  vars: function (T) {
    return {
      'surf-fill': T.bg2, 'surf-line': alpha(T.ink, '2e'), 'surf-lw': '1px',
      'r-lg': '6px', 'r-md': '5px', 'r-ms': '5px', 'r-sm': '4px', 'r-xs': '3px',
      'surf-shadow': '0 2px 0 ' + alpha(T.ink, '14') + ',0 10px 20px ' + alpha(T.ink, '0f'),
      'bd-1': 'none', 'bd-2': 'none', 'bd-3': 'none', 'bd-4': 'none',
      'glow': 'none',
      'link-w': '1.8', 'link-op': '.66', 'flow-w': '1.8', 'flow-op': '.6',
      'route-w': '1.8', 'route-dash': '5 7', 'ring-w': '1.6', 'ring-dash': '4 7',
      'title-lh': '1.12',
      'cc-r': '4px', 'cc-bd': 'none', 'cc-fill': alpha(T.ink, 'f0'), 'cc-line': 'transparent',
      'cc-shadow': '0 6px 18px rgba(0,0,0,.28)'
    };
  }
};

/* ------------------------------------------------------------------ *
 * neon — 면은 거의 비우고 형광 테두리와 외곽 광채로 형태를 만든다.
 * 어두운 테마에서 제 값을 한다. 밝은 테마에 얹으면 광채가 죽는다 — 경고를 낸다.
 * ------------------------------------------------------------------ */
SKINS.neon = {
  label: '네온 — 빈 면 + 형광 테두리 + 외곽 광채. 어두운 테마 전용 톤',
  dark: true,
  vars: function (T) {
    return {
      'surf-fill': alpha(T.bg, 'cc'), 'surf-line': T.accent, 'surf-lw': '1.5px', 'surf-lw2': '2px',
      'r-lg': '18px', 'r-md': '16px', 'r-ms': '14px', 'r-sm': '12px', 'r-xs': '10px',
      'surf-shadow': '0 0 22px ' + alpha(T.accent, '3d') + ',inset 0 0 18px ' + alpha(T.accent, '1a'),
      'bd-1': 'blur(3px)', 'bd-2': 'blur(3px)', 'bd-3': 'blur(4px)', 'bd-4': 'blur(4px)',
      'hub-ring': '0 0 0 2px ' + T.accent + ',0 0 30px ' + alpha(T.accent, '66'),
      'target-ring': '0 0 0 2px ' + T.accent2 + ',0 0 34px ' + alpha(T.accent2, '66'),
      'link-w': '1.6', 'link-op': '.85', 'flow-w': '1.6', 'flow-op': '.8',
      'arrow-w': '1.8', 'arrow-op': '.95', 'route-w': '1.6', 'route-op': '.7',
      'glow': 'drop-shadow(0 0 14px var(--acc))',
      'kick-caps': 'uppercase',
      'cc-fill': 'rgba(6,8,16,.9)', 'cc-line': alpha(T.accent, '55'),
      'cc-shadow': '0 0 24px ' + alpha(T.accent, '33')
    };
  },
  rules: function () {
    return ['.gg-link,.gg-arrow,.gg-flow,.gg-route{filter:drop-shadow(0 0 6px var(--acc))}'];
  }
};

/* ================================================================== *
 * 구현부 해석 — 스킨 이름(또는 인라인 정의)을 토큰 묶음으로
 * ================================================================== */

function merge(a, b) {
  var r = {}, k;
  for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) r[k] = a[k];
  for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) if (b[k] != null) r[k] = String(b[k]);
  return r;
}

/** 토큰 묶음을 `:root` 안에 넣을 선언 문자열로. */
function toCss(vars) {
  var out = [];
  for (var k in vars) if (Object.prototype.hasOwnProperty.call(vars, k)) out.push('--' + k + ':' + vars[k]);
  return out.join(';');
}

/**
 * 두 토큰 묶음의 차이만 남긴다 — 씬별 오버라이드가 쓴다.
 *
 * 씬 스코프 블록에 48개를 다 적을 이유가 없다. 같은 값은 `:root` 에서 상속되므로
 * 다른 것만 적으면 산출물이 작아지고, 열어 봤을 때 "이 씬은 무엇이 다른가" 가 바로 읽힌다.
 */
function diffVars(base, vars) {
  var out = {};
  for (var k in vars) {
    if (!Object.prototype.hasOwnProperty.call(vars, k)) continue;
    if (base[k] !== vars[k]) out[k] = vars[k];
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * 규칙 스코프 — 씬별 스킨의 추가 CSS 가 다른 씬으로 새지 않게
 *
 * 토큰은 CSS 변수라 상속으로 저절로 씬 안에 갇히지만, 스킨이 얹는 추가 규칙은
 * 선택자를 그대로 쓰면 문서 전체에 적용된다. 그래서 선택자 앞에 스코프를 붙인다.
 *
 * 규칙 안에서 `&` 는 스코프 자신으로 바뀐다 — 씬 뿌리 자체를 노려야 할 때 쓴다.
 * 스코프보다 **위**에 있는 요소(`.gg-stage` `.gg-captions` 처럼 씬 밖)를 노리는
 * 규칙은 스코프를 붙이면 맞는 요소가 사라진다. 씬별 스킨의 구조적 한계다.
 * ------------------------------------------------------------------ */

/** 씬 밖에 있어서 씬 스코프로는 닿지 않는 선택자들. 경고에 쓴다. */
var STAGE_SELECTORS = ['.gg-stage', '.gg-captions', '.gg-player', '.gg-grain',
                       '.gg-vig', '.gg-flash', '.gg-toc', '.gg-presenter'];

/** CSS 문자열을 최상위 규칙 단위로 자른다 (중괄호 깊이로 센다). */
function splitRules(css) {
  var out = [], depth = 0, start = 0;
  for (var i = 0; i < css.length; i++) {
    var c = css.charAt(i);
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) { out.push(css.slice(start, i + 1)); start = i + 1; }
    }
  }
  var tail = css.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

function scopeOne(rule, scope) {
  var open = rule.indexOf('{');
  if (open < 0) return rule;
  var sel = rule.slice(0, open).trim();
  var body = rule.slice(open);
  /* at-rule 은 겉껍데기를 두고 안쪽 규칙들을 각각 스코프한다 */
  if (sel.charAt(0) === '@') {
    var close = body.lastIndexOf('}');
    if (close < 1) return rule;
    var inner = body.slice(1, close);
    return sel + '{' + splitRules(inner).map(function (r) { return scopeOne(r, scope); }).join('') + '}';
  }
  return sel.split(',').map(function (one) {
    one = one.trim();
    if (!one) return '';
    return one.indexOf('&') >= 0 ? one.split('&').join(scope) : scope + ' ' + one;
  }).filter(Boolean).join(',') + body;
}

/** 규칙 목록 전체에 스코프를 붙인다. */
function scopeRules(rules, scope) {
  return rules.map(function (r) { return scopeOne(String(r), scope); });
}

/** 씬 스코프로는 닿지 않는 선택자를 쓴 규칙이 있는지 — validate 가 경고에 쓴다. */
function stageReaching(rules) {
  var hit = [];
  rules.forEach(function (r) {
    STAGE_SELECTORS.forEach(function (sel) {
      if (String(r).indexOf(sel) >= 0 && hit.indexOf(sel) < 0) hit.push(sel);
    });
  });
  return hit;
}

/**
 * 스펙의 `skin` 을 해석한다. 문자열이면 등록된 스킨, 객체면 인라인 커스텀 정의.
 *
 *   "skin": "brutalist"
 *   "skin": { "extends": "brutalist", "name": "우리 브랜드", "vars": {...}, "css": [".gg-card{...}"] }
 *
 * 스펙 한 장에 담기므로 CLI 로 빌드해도, 남에게 넘겨도 같은 모습이 재현된다.
 */
function resolve(skin, T, A) {
  var base = SKINS.glass.vars(T, A);          /* 모든 토큰의 기본값 — 빠진 토큰은 여기서 채워진다 */
  var def = null, name = 'glass';
  if (typeof skin === 'string' && SKINS[skin]) name = skin;
  else if (skin && typeof skin === 'object') {
    def = skin;
    if (typeof def['extends'] === 'string' && SKINS[def['extends']]) name = def['extends'];
  }
  var S = SKINS[name];
  var vars = merge(base, name === 'glass' ? null : (S.vars ? S.vars(T, A) : null));
  var rules = S.rules ? S.rules(T, A) : [];
  var label = S.label;
  if (def) {
    vars = merge(vars, def.vars);
    if (def.css) rules = rules.concat(Array.isArray(def.css) ? def.css : [def.css]);
    label = def.name || (label + ' + 커스텀');
    name = def.name || (name + '+custom');
  }
  return { name: name, label: label, vars: vars, rules: rules, css: toCss(vars) };
}

/** 앱·스튜디오가 만든 스킨을 엔진에 등록한다. designStore 가 쓴다. */
function registerSkin(key, def) {
  if (!key || !def) return;
  var vars = def.vars || {};
  SKINS[key] = {
    label: def.label || key,
    custom: true,
    dark: !!def.dark,
    vars: typeof vars === 'function' ? vars : function () { return vars; },
    rules: function () { return def.css ? (Array.isArray(def.css) ? def.css : [def.css]) : []; }
  };
}

function unregisterSkin(key) {
  if (key !== 'glass') delete SKINS[key];
}

/** 커스텀 정의의 토큰 이름 오타를 잡는다. validate 가 부른다. */
function unknownTokens(vars) {
  var bad = [];
  for (var k in vars) if (Object.prototype.hasOwnProperty.call(vars, k) && !TOKENS[k]) bad.push(k);
  return bad;
}

module.exports = {
  TOKENS: TOKENS, SKINS: SKINS, resolve: resolve,
  registerSkin: registerSkin, unregisterSkin: unregisterSkin, unknownTokens: unknownTokens,
  varsToCss: toCss, diffVars: diffVars, scopeRules: scopeRules, stageReaching: stageReaching
};
