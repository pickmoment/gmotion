#!/usr/bin/env node
/*!
 * gsapgraph v0.1.0 — 선언적 JSON -> GSAP 모션그래픽 단일 HTML
 *
 * 설계 원칙
 *  1. 스펙에는 좌표도 타이밍도 없다. 씬 패턴과 내용만 쓴다. 배치·타이밍·코레오그래피는 엔진이 만든다.
 *  2. 엔진은 GSAP 코드 문자열을 뱉지 않는다. **트윈 IR**(선언적 트윈 목록)을 뱉고,
 *     산출물에 실린 작은 런타임이 그걸 마스터/씬 타임라인으로 조립한다.
 *     -> 시킹이 프레임 단위로 정확하고, 산출물이 사람이 읽을 수 있게 남는다.
 *  3. 런타임 의존성은 번들된 GSAP(assets/gsap.bundle.js)뿐이다.
 *
 * MIT License. 번들된 GSAP 은 GreenSock Standard 'no charge' license.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports)
    module.exports = factory(require('./icons.js'), require('./vectors.js'), require('./charts.js'));
  else root.GG = factory(root.GGIcons, root.GGVectors, root.GGCharts);
}(typeof self !== 'undefined' ? self : this, function (ICO, VEC, CH) {
'use strict';

var VERSION = '0.1.0';
var GSAP_VERSION = '3.15.0';

/* ================================================================== *
 * util
 * ================================================================== */
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
function arr(v) { return v == null ? [] : (Array.isArray(v) ? v : [v]); }
function has(o, k) { return o && Object.prototype.hasOwnProperty.call(o, k); }
function copy(o) { var r = {}; for (var k in o) if (has(o, k)) r[k] = o[k]; return r; }
function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }
function r2(n) { return Math.round(n * 100) / 100; }
function tc(sec) {
  var m = Math.floor(sec / 60), r = sec - m * 60;
  return pad(m, 2) + ':' + pad(r.toFixed(2), 5);
}
/** 목록에 넣을 한 줄 제목 — 개행을 없애고 길면 자른다 */
function oneLine(s, max) {
  var t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1) + '…' : t;
}
function slug(s, i) {
  var t = String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '');
  return t || ('s' + (i + 1));
}
/** 텍스트 길이로 읽는 시간을 추정한다 — hold 를 사용자가 안 줬을 때 쓴다. */
function readSec(text, energy) {
  var n = String(text == null ? '' : text).replace(/\s/g, '').length;
  var base = 0.55 + n * 0.075;          // 한글 기준 대략 초당 13자
  return clamp(base, 0.7, 4.5) * (energy === 'E3' ? 0.75 : energy === 'E1' ? 1.25 : 1);
}

/* ================================================================== *
 * 테마 — 색·타이포·질감. 씬 패턴은 색을 직접 쓰지 않고 토큰만 참조한다.
 * ================================================================== */
var THEMES = {
  midnight: {
    label: '미드나잇 — 남색 배경, 기본값. 발표 오프닝·기술 explainer',
    bg: '#0b1020', bg2: '#141b33', ink: '#eef2ff', ink2: '#a5b0d4', dim: '#707ca5',
    accent: '#6ea8ff', accent2: '#a78bfa', good: '#4ade80', warn: '#fbbf24', bad: '#fb7185',
    line: 'rgba(160,180,255,.22)', panel: 'rgba(255,255,255,.05)', panelLine: 'rgba(160,180,255,.16)',
    glow: 1, font: 'display', grain: .04, vig: .42, decor: ['blob', 'grid']
  },
  ink: {
    label: '잉크 — 먹색 배경 + 금색. 다큐·시리즈 오프닝',
    bg: '#111110', bg2: '#1c1b19', ink: '#f5f1e8', ink2: '#b8ae9c', dim: '#857b69',
    accent: '#d4a24c', accent2: '#c2703d', good: '#8aa76a', warn: '#d99a3c', bad: '#c15f4e',
    line: 'rgba(212,162,76,.22)', panel: 'rgba(245,241,232,.04)', panelLine: 'rgba(212,162,76,.18)',
    glow: 0, font: 'serif', grain: .07, vig: .5, decor: ['arcs', 'topo']
  },
  paper: {
    label: '페이퍼 — 밝은 배경. 지표 리포트·사내 공유',
    bg: '#f7f5f0', bg2: '#ecebe4', ink: '#1b1a17', ink2: '#5c5a52', dim: '#746f64',
    accent: '#2563eb', accent2: '#7c3aed', good: '#11813b', warn: '#aa5d05', bad: '#da2323',
    line: 'rgba(27,26,23,.14)', panel: 'rgba(255,255,255,.72)', panelLine: 'rgba(27,26,23,.1)',
    glow: 0, font: 'sans', grain: .05, vig: 0, decor: ['arcs', 'dots']
  },
  mono: {
    label: '모노 — 흑백. 타이포 중심, 절제된 톤',
    bg: '#0a0a0a', bg2: '#171717', ink: '#fafafa', ink2: '#a3a3a3', dim: '#7a7a7a',
    accent: '#fafafa', accent2: '#d4d4d4', good: '#fafafa', warn: '#a3a3a3', bad: '#797979',
    line: 'rgba(250,250,250,.2)', panel: 'rgba(250,250,250,.05)', panelLine: 'rgba(250,250,250,.14)',
    glow: 0, font: 'sans', grain: .03, vig: .34, decor: ['stripes', 'arcs']
  },
  neon: {
    label: '네온 — 고채도 + 글로우. 쇼츠·런칭·하이에너지',
    bg: '#08070f', bg2: '#151030', ink: '#f5f3ff', ink2: '#c4b5fd', dim: '#7b6dba',
    accent: '#22d3ee', accent2: '#f472b6', good: '#34d399', warn: '#fbbf24', bad: '#fb7185',
    line: 'rgba(34,211,238,.3)', panel: 'rgba(124,58,237,.12)', panelLine: 'rgba(34,211,238,.24)',
    glow: 2, font: 'display', grain: .03, vig: .46, decor: ['mesh', 'beams']
  },
  warm: {
    label: '웜 — 크림·테라코타. 브랜드·캠페인 감성',
    bg: '#1a1310', bg2: '#2a1e18', ink: '#fdf6ec', ink2: '#d9bfa8', dim: '#937967',
    accent: '#f59e5b', accent2: '#ef7d6b', good: '#a3b565', warn: '#f0b429', bad: '#e05c4b',
    line: 'rgba(245,158,91,.24)', panel: 'rgba(253,246,236,.05)', panelLine: 'rgba(245,158,91,.18)',
    glow: 1, font: 'serif', grain: .06, vig: .44, decor: ['mesh', 'arcs']
  },
  slate: {
    label: '슬레이트 — 회청 라이트. 기업 문서·B2B 리포트',
    bg: '#f4f6fa', bg2: '#e6eaf2', ink: '#0f172a', ink2: '#3f4c63', dim: '#5c6a82',
    accent: '#1d4ed8', accent2: '#6d28d9', good: '#15803d', warn: '#b45309', bad: '#be123c',
    line: 'rgba(15,23,42,.14)', panel: 'rgba(255,255,255,.76)', panelLine: 'rgba(15,23,42,.1)',
    glow: 0, font: 'neo', grain: .03, vig: 0, decor: ['grid', 'dots']
  },
  sand: {
    label: '샌드 — 따뜻한 베이지 라이트. 리테일·라이프스타일·브랜드',
    bg: '#faf6ef', bg2: '#f0e8da', ink: '#231a12', ink2: '#4d3f30', dim: '#6b5b46',
    accent: '#a2521a', accent2: '#7c4a2d', good: '#2f6b3a', warn: '#96590a', bad: '#a92f36',
    line: 'rgba(35,26,18,.15)', panel: 'rgba(255,252,246,.74)', panelLine: 'rgba(35,26,18,.11)',
    glow: 0, font: 'soft', grain: .06, vig: 0, decor: ['topo', 'arcs']
  },
  mint: {
    label: '민트 — 맑은 청록 라이트. 헬스케어·핀테크·클린테크',
    bg: '#f1faf6', bg2: '#dff0e8', ink: '#0c1f18', ink2: '#2f4b40', dim: '#4d6a5d',
    accent: '#0f766e', accent2: '#1d4ed8', good: '#15803d', warn: '#a35c07', bad: '#b91c48',
    line: 'rgba(12,31,24,.13)', panel: 'rgba(255,255,255,.78)', panelLine: 'rgba(12,31,24,.09)',
    glow: 0, font: 'sans', grain: .03, vig: 0, decor: ['blob', 'dots']
  },
  forest: {
    label: '포레스트 — 짙은 녹색 다크. 지속가능성·성장·자연',
    bg: '#08130e', bg2: '#12241b', ink: '#e9f4ec', ink2: '#a7c4b1', dim: '#7d9c89',
    accent: '#5ee0a0', accent2: '#a3e635', good: '#4ade80', warn: '#fbbf24', bad: '#fb7185',
    line: 'rgba(94,224,160,.2)', panel: 'rgba(233,244,236,.05)', panelLine: 'rgba(94,224,160,.16)',
    glow: 1, font: 'display', grain: .05, vig: .42, decor: ['topo', 'mesh']
  },
  ocean: {
    label: '오션 — 심해 청록 다크. 데이터·인프라·신뢰',
    bg: '#061219', bg2: '#0e2431', ink: '#e6f3f9', ink2: '#9fc4d6', dim: '#749cb0',
    accent: '#38d6ef', accent2: '#818cf8', good: '#34d399', warn: '#fbbf24', bad: '#fb7185',
    line: 'rgba(56,214,239,.2)', panel: 'rgba(230,243,249,.05)', panelLine: 'rgba(56,214,239,.16)',
    glow: 1, font: 'display', grain: .04, vig: .4, decor: ['wave', 'constellation']
  },
  plum: {
    label: '플럼 — 자주 다크. 문화·예술·프리미엄',
    bg: '#140b17', bg2: '#241429', ink: '#f6ecf7', ink2: '#c9adcf', dim: '#9c7fa4',
    accent: '#e0a3f5', accent2: '#f0abfc', good: '#6ee7b7', warn: '#fcd34d', bad: '#fda4af',
    line: 'rgba(224,163,245,.2)', panel: 'rgba(246,236,247,.05)', panelLine: 'rgba(224,163,245,.16)',
    glow: 1, font: 'serif', grain: .05, vig: .5, decor: ['blob', 'arcs']
  }
};
/* ------------------------------------------------------------------ *
 * 폰트 — 테마가 기본을 정하고, 스펙의 font 로 덮어쓸 수 있다.
 *
 * 전부 한글 글리프를 가진 웹폰트다. pre 는 프리텐다드(jsDelivr),
 * g 는 구글 폰트의 family 파라미터다. 쓰는 것만 링크를 건다.
 *
 * solo 는 굵기가 하나뿐인 폰트라는 표시다. 이런 폰트에 700·800 을 걸면
 * 브라우저가 굵기를 지어내(합성 볼드) 획이 뭉갠다. 위계는 크기와 색으로
 * 이미 충분히 주고 있으므로, 합성을 끄고 폰트가 가진 굵기를 그대로 쓴다.
 * ------------------------------------------------------------------ */
var FONTS = {
  display: { label: '프리텐다드 — 현대적 산세리프, 자간 좁게. 기본값',
             stack: "'Pretendard Variable',Pretendard,'Inter','Noto Sans KR',system-ui,sans-serif",
             pre: 1, tight: '-.03em' },
  sans:    { label: '프리텐다드 — 자간 보통. 글이 많은 화면',
             stack: "'Pretendard Variable',Pretendard,'Noto Sans KR',system-ui,sans-serif",
             pre: 1, tight: '-.02em' },
  serif:   { label: '나눔명조 — 다큐·시리즈 오프닝',
             stack: "'Nanum Myeongjo','Noto Serif KR',Georgia,serif",
             g: 'Nanum+Myeongjo:wght@400;700;800', tight: '-.01em' },
  impact:  { label: '블랙한산스 — 초굵은 고딕. 쇼츠·선언·한 마디',
             stack: "'Black Han Sans','Pretendard Variable',Pretendard,system-ui,sans-serif",
             g: 'Black+Han+Sans', tight: '-.01em', kick: '.16em', solo: 1 },
  round:   { label: '주아 — 둥글고 친근. 캠페인·교육·생활 서비스',
             stack: "'Jua','Pretendard Variable',Pretendard,system-ui,sans-serif",
             g: 'Jua', tight: '0', kick: '.14em', solo: 1 },
  classic: { label: '송명 — 가늘고 우아한 명조. 인용·에디토리얼',
             stack: "'Song Myung','Nanum Myeongjo',Georgia,serif",
             g: 'Song+Myung', tight: '0', kick: '.2em', solo: 1 },
  soft:    { label: '고운바탕 — 부드러운 명조. 브랜드·따뜻한 이야기',
             stack: "'Gowun Batang','Nanum Myeongjo',Georgia,serif",
             g: 'Gowun+Batang:wght@400;700', tight: '0' },
  neo:     { label: 'IBM Plex Sans KR — 중립적 기술 산세리프. 리포트·문서',
             stack: "'IBM Plex Sans KR','Pretendard Variable',Pretendard,system-ui,sans-serif",
             g: 'IBM+Plex+Sans+KR:wght@400;500;600;700', tight: '-.01em' },
  pen:     { label: '나눔펜 — 손글씨. 메모·스케치·사람의 말',
             stack: "'Nanum Pen Script','Pretendard Variable',Pretendard,cursive",
             g: 'Nanum+Pen+Script', tight: '0', kick: '.05em', solo: 1 },
  gothic:  { label: '고딕 A1 — 굵기 폭이 넓은 고전 고딕. 공지·안내',
             stack: "'Gothic A1','Pretendard Variable',Pretendard,system-ui,sans-serif",
             g: 'Gothic+A1:wght@400;500;700;900', tight: '-.02em' }
};

/** 스펙이 고정폭을 필요로 하는가 — 터미널·코드 프레임을 쓸 때만 링크를 건다. */
function needsMono(spec) {
  return arr(spec && spec.scenes).some(function (sc) {
    return sc && sc.pattern === 'deviceShow' && (sc.frame === 'terminal' || sc.frame === 'window');
  });
}

/* 고정폭 — 터미널·코드 화면에만 쓴다. 한글이 섞여도 칸이 맞아야 한다. */
var MONO = {
  stack: "'Nanum Gothic Coding',ui-monospace,SFMono-Regular,Menlo,monospace",
  g: 'Nanum+Gothic+Coding:wght@400;700'
};

/* 화면비 — 스테이지는 고정 px 좌표계. 뷰포트에는 transform:scale 로 맞춘다. */
var ASPECTS = {
  '16:9': { w: 1920, h: 1080, safe: 96,  label: '가로 영상·발표' },
  '9:16': { w: 1080, h: 1920, safe: 72,  label: '쇼츠·릴스' },
  '1:1':  { w: 1080, h: 1080, safe: 72,  label: '피드 정사각' },
  '4:5':  { w: 1080, h: 1350, safe: 72,  label: '피드 세로' }
};

/* ================================================================== *
 * 모션 토큰 — 패턴은 숫자를 직접 쓰지 않고 이 토큰만 쓴다.
 * 같은 스킬이 만든 산출물이 같은 사람 손처럼 보이는 이유.
 * ================================================================== */
var TOKENS = {
  d: { micro: .2, fast: .35, normal: .6, slow: 1.0, cine: 1.4 },
  e: {
    enter: 'power3.out', exit: 'power2.in', move: 'power2.inOut',
    dramatic: 'power4.out', overshoot: 'back.out(1.6)', soft: 'sine.inOut',
    draw: 'power2.inOut', count: 'power2.out'
  },
  s: { tight: .04, normal: .08, loose: .15 }
};
/* 에너지 레벨 — 지속시간 배율, 등장 이징, 이동 거리 배율, 트랜지션 길이 */
var ENERGY = {
  E1: { label: 'E1 차분 — 느린 호흡, 절제된 카메라', dm: 1.35, hm: 1.25, ease: 'power2.out', dist: .8, trans: 1.0, sm: 1.3 },
  E2: { label: 'E2 표준 — 기본값', dm: 1.0, hm: 1.0, ease: 'power3.out', dist: 1.0, trans: .8, sm: 1.0 },
  E3: { label: 'E3 하이에너지 — 크래시 줌·오버슈트·비트 컷', dm: .7, hm: .78, ease: 'power4.out', dist: 1.25, trans: .5, sm: .7 }
};

/* 포맷별 타이포 스케일 — 계산식보다 표가 예측 가능하다. 단위 px, 스테이지 좌표계. */
var TYPE = {
  '16:9': { title: 104, big: 148, sub: 46, body: 33, kicker: 26, small: 24, num: 200 },
  '9:16': { title: 92,  big: 128, sub: 44, body: 34, kicker: 25, small: 24, num: 190 },
  '1:1':  { title: 84,  big: 118, sub: 40, body: 32, kicker: 24, small: 22, num: 176 },
  '4:5':  { title: 86,  big: 122, sub: 41, body: 32, kicker: 24, small: 22, num: 182 }
};

/* ================================================================== *
 * 레이아웃 헬퍼 — 패턴이 좌표를 계산하는 유일한 통로.
 * ================================================================== */
/** n개를 가로 한 줄로 중앙 정렬 배치. 반환: [{x, w}] (x는 좌상단) */
function rowOf(n, W, itemW, gap) {
  var total = n * itemW + (n - 1) * gap, x0 = (W - total) / 2, out = [];
  for (var i = 0; i < n; i++) out.push({ x: x0 + i * (itemW + gap), w: itemW, cx: x0 + i * (itemW + gap) + itemW / 2 });
  return out;
}
/** n개를 cols 열 그리드로. 반환: [{x, y, w, h, col, row}] */
function gridOf(n, cols, W, itemW, itemH, gapX, gapY, cy) {
  var rows = Math.ceil(n / cols), out = [];
  var totalH = rows * itemH + (rows - 1) * gapY, y0 = cy - totalH / 2;
  for (var i = 0; i < n; i++) {
    var r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, n - r * cols);
    var totalW = inRow * itemW + (inRow - 1) * gapX, x0 = (W - totalW) / 2;
    out.push({ x: x0 + c * (itemW + gapX), y: y0 + r * (itemH + gapY), w: itemW, h: itemH, col: c, row: r,
               cx: x0 + c * (itemW + gapX) + itemW / 2, cy: y0 + r * (itemH + gapY) + itemH / 2 });
  }
  return out;
}
/** n개를 원형 배치. start 는 12시 기준 시작각(도). 반환: [{x,y,ang}] (중심 좌표) */
function ringOf(n, cx, cy, rx, ry, start) {
  var out = [], st = num(start, -90);
  for (var i = 0; i < n; i++) {
    var a = (st + i * 360 / n) * Math.PI / 180;
    out.push({ x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * num(ry, rx), ang: st + i * 360 / n });
  }
  return out;
}
/** 아이템 수와 화면비로 열 수를 정한다. 밀도 규칙: 한 줄에 5개 이상은 읽히지 않는다. */
function colsFor(n, wide) {
  if (wide) return n <= 3 ? n : (n === 4 ? 4 : (n <= 6 ? 3 : (n <= 8 ? 4 : 5)));
  return n <= 2 ? n : (n <= 4 ? 2 : (n <= 9 ? 3 : 3));
}

/* ================================================================== *
 * 트윈 IR — 엔진이 뱉는 것. 산출물 런타임이 이걸 읽어 타임라인을 만든다.
 *
 *  {k:'from'|'to'|'fromTo'|'set', t:sel, at:sec, v:{...}, v2:{...}, st:stagger}
 *  {k:'draw',  t:sel, at, dur, ease, st}          DrawSVG 0 -> 100%
 *  {k:'undraw',t:sel, at, dur, ease}              100% -> 0
 *  {k:'split', t:sel, at, by:'chars'|'words'|'lines', v, st}
 *  {k:'count', t:sel, at, dur, from, to, dec, unit, prefix}
 *  {k:'morph', t:sel, to:sel, at, dur, ease}
 *  {k:'cam',   at, dur, v:{scale,x,y,rotate}, ease}      .gg-world 변형
 *  {k:'label', name, at}
 *  {k:'fx',    fn:'impact'|'flash'|'shake'|'pulse', at, t?, v?}
 * ================================================================== */
function TW() { this.list = []; }
TW.prototype.push = function (o) { this.list.push(o); return this; };
TW.prototype.from = function (t, at, v, st) { return this.push({ k: 'from', t: t, at: r2(at), v: v, st: st }); };
TW.prototype.to = function (t, at, v, st) { return this.push({ k: 'to', t: t, at: r2(at), v: v, st: st }); };
TW.prototype.fromTo = function (t, at, v, v2, st) { return this.push({ k: 'fromTo', t: t, at: r2(at), v: v, v2: v2, st: st }); };
TW.prototype.set = function (t, at, v) { return this.push({ k: 'set', t: t, at: r2(at), v: v }); };
TW.prototype.draw = function (t, at, dur, ease, st) { return this.push({ k: 'draw', t: t, at: r2(at), dur: r2(dur), ease: ease, st: st }); };
TW.prototype.split = function (t, at, by, v, st) { return this.push({ k: 'split', t: t, at: r2(at), by: by, v: v, st: st }); };
TW.prototype.count = function (t, at, dur, from, to, o) {
  o = o || {}; return this.push({ k: 'count', t: t, at: r2(at), dur: r2(dur), from: from, to: to, dec: num(o.dec, 0), unit: o.unit || '', prefix: o.prefix || '' });
};
TW.prototype.morph = function (t, to, at, dur, ease) { return this.push({ k: 'morph', t: t, to: to, at: r2(at), dur: r2(dur), ease: ease }); };
/** 도형을 path 문자열(d)로 변형 — 셀렉터가 아니라 d 를 직접 준다 */
TW.prototype.morphTo = function (t, d, at, dur, ease, shapeIndex) {
  return this.push({ k: 'morph', t: t, d: d, at: r2(at), dur: r2(dur), ease: ease, shapeIndex: shapeIndex });
};
/** 곡선 경로를 따라 이동 */
TW.prototype.path = function (t, at, dur, d, o) {
  o = o || {};
  return this.push({ k: 'path', t: t, at: r2(at), dur: r2(dur), d: d, ease: o.ease,
                     rotate: !!o.rotate, start: o.start, end: o.end, st: o.st });
};
/** 글자가 섞이다 정렬된다 */
TW.prototype.scramble = function (t, at, dur, o) {
  o = o || {};
  return this.push({ k: 'scramble', t: t, at: r2(at), dur: r2(dur), chars: o.chars,
                     speed: o.speed, reveal: o.reveal });
};
/** 롤러처럼 굴러 교체된다 */
TW.prototype.roll = function (t, at, dur, ease) {
  return this.push({ k: 'roll', t: t, at: r2(at), dur: r2(dur), ease: ease });
};
TW.prototype.cam = function (at, dur, v, ease) { return this.push({ k: 'cam', at: r2(at), dur: r2(dur), v: v, ease: ease }); };
TW.prototype.label = function (name, at) { return this.push({ k: 'label', name: name, at: r2(at) }); };
TW.prototype.fx = function (fn, at, t, v) { return this.push({ k: 'fx', fn: fn, at: r2(at), t: t, v: v }); };

/* ================================================================== *
 * 씬 컨텍스트 — 패턴 빌더가 받는 것. 색·폰트크기·에너지·셀렉터·아이콘.
 * ================================================================== */
function makeCtx(spec, sc, i) {
  var asp = ASPECTS[spec.aspect] || ASPECTS['16:9'];
  var T = THEMES[spec.theme] || THEMES.midnight;
  var E = ENERGY[spec.energy] || ENERGY.E2;
  var fs = TYPE[spec.aspect] || TYPE['16:9'];
  var sid = 's' + (i + 1);
  var ctx = {
    W: asp.w, H: asp.h, safe: asp.safe, wide: asp.w >= asp.h, aspect: spec.aspect || '16:9',
    T: T, E: E, energy: spec.energy || 'E2', fs: fs, M: TOKENS, i: i, sid: sid,
    /** 추상 일러스트 — 픽토그램보다 크고 구성적이다. 부분이 스태거로 등장한다. */
    art: function (name, size, cls) {
      if (!VEC.ART[name]) return '';
      var z = num(size, 300);
      return '<div class="gg-artBox ' + (cls || '') + '" style="width:' + z + 'px;height:' + z + 'px">' +
        VEC.ART[name].build(T) + '</div>';
    },
    cx: asp.w / 2, cy: asp.h / 2,
    /** 씬 스코프 셀렉터 */
    q: function (s) { return '#' + sid + ' ' + s; },
    /** 지속시간에 에너지 배율을 적용한다. 패턴은 항상 이걸 쓴다. */
    d: function (name) { return r2((TOKENS.d[name] || num(name, .6)) * E.dm); },
    st: function (name) { return r2((TOKENS.s[name] || num(name, .08)) * E.sm); },
    /** 등장 이징 — 에너지가 정한다 */
    ei: E.ease,
    /**
     * 속도 왜곡 — 빠르게 들어오는 요소를 기울인다. 정지하면 0 으로 풀린다.
     * E3 에서만 붙는다. 차분한 톤에 스큐를 넣으면 화면이 흔들려 보인다.
     */
    skew: function (axis) {
      if ((spec.energy || 'E2') !== 'E3') return 0;
      return axis === 'x' ? 7 : 5;
    },
    /** 이동 거리에 에너지 배율 */
    px: function (v) { return Math.round(v * E.dist); },
    ic: function (n) { return ICO.iconPath(n); },
    used: {}
  };
  ctx.icon = function (name, size, cls, extra) {
    var p = ICO.iconPath(name);
    if (!p) return '';
    ctx.used[ICO.iconKey(name)] = 1;
    var s = num(size, 48);
    return '<svg class="gg-ic ' + (cls || '') + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true"' + (extra || '') + '><path d="' + p + '"/></svg>';
  };
  return ctx;
}

/* ================================================================== *
 * 공통 조립 헬퍼
 * ================================================================== */
/**
 * 글자 폭을 em 단위로 어림한다. 정확한 값은 브라우저만 알지만, 여기서 필요한 건
 * "이 줄이 한 줄에 들어가는가" 뿐이다. 넘칠 때만 글자를 줄이므로 넉넉하게(크게) 잡는다 —
 * 과대 추정은 글자가 살짝 작아지는 것으로 끝나지만, 과소 추정은 줄바꿈을 부른다.
 * 계수는 900 굵기 표시용 글꼴에서 실측해 맞췄다(자간 --tight 포함). 실측 대비 1.00~1.10 이다.
 */
function estEm(s) {
  var w = 0;
  for (var i = 0; i < s.length; i++) {
    var ch = s[i], c = s.charCodeAt(i);
    if (c === 32) w += .28;
    else if (c >= 0xAC00 && c <= 0xD7A3) w += 1;          /* 한글 음절 */
    else if (c >= 0x1100 && c <= 0x11FF) w += 1;          /* 한글 자모 */
    else if (c >= 0x3000 && c <= 0x9FFF) w += 1;          /* CJK · 전각 구두점 */
    else if (c >= 0xFF01 && c <= 0xFF60) w += 1;          /* 전각 영숫자 */
    else if (c < 0x80) w += /[A-Z0-9@#%&W]/.test(ch) ? .66 : /[a-z]/.test(ch) ? .47 : .33;
    else w += .6;
  }
  return w;
}

/** 여러 줄 텍스트를 마스크 리빌 가능한 구조로 감싼다. */
function splitLines(text) {
  if (Array.isArray(text)) return text.map(String);
  return String(text == null ? '' : text).split(/\n+/).filter(function (s) { return s.trim(); });
}
function maskLines(text, cls, markSVG) {
  var L = splitLines(text);
  return L.map(function (l, i) {
    var inner = '<span class="gg-mask"><span class="gg-mk ' + (cls || '') + '">' + esc(l) + '</span></span>';
    /* 마크는 마지막 줄의 글자 폭에 맞춰 붙는다 — 블록 폭에 맞추면 동그라미가 문장을 다 감싼다.
       gg-line 이 inline-block 이라 폭이 글자만큼이 되고, 마스크 밖이라 잘리지 않는다. */
    if (markSVG && i === L.length - 1) return '<span class="gg-line gg-hasMark">' + inner + markSVG + '</span>';
    return inner;
  }).join('');
}
/** 마크 스펙(문자열 또는 {type,text})을 SVG 로. 없으면 빈 문자열 */
function markOf(m, T) {
  if (!m) return { svg: '', def: null };
  var name = typeof m === 'string' ? m.split(':')[0] : m.type;
  var text = typeof m === 'string' ? m.split(':').slice(1).join(':') : m.text;
  var M = VEC.MARK[name];
  if (!M) return { svg: '', def: null, bad: name };
  return { svg: M.build(T, text), def: M, name: name };
}
/**
 * 헤더 블록(kicker/title/sub)의 HTML 과 등장 IR 을 만든다.
 * pos: {x,y,w,align} — 스테이지 좌표. 반환: {html, end} (end = 등장이 끝나는 상대초)
 */
function head(sc, ctx, tw, at, pos, size) {
  var q = ctx.q, fs = ctx.fs, sz = size || {};
  var tSize = num(sz.title, fs.title), sSize = num(sz.sub, fs.sub);
  /* 세로 포맷은 폭이 좁아 패턴들이 타이틀을 줄여 넘기지만, 그대로 두면 쇼츠에서 안 읽힌다 */
  if (!ctx.wide && sz.title) tSize = Math.min(fs.title, Math.round(tSize * 1.18));
  var titleLines = sc.title ? splitLines(sc.title) : [];
  if (titleLines.length >= 4) tSize = Math.round(tSize * 0.72);
  else if (titleLines.length === 3) tSize = Math.round(tSize * 0.85);
  var h = [], t = at;
  h.push('<div class="gg-head' + (pos.align === 'center' ? ' gg-c' : '') + '" style="left:' + pos.x + 'px;top:' + pos.y +
    'px;width:' + pos.w + 'px' + (pos.align === 'center' ? ';text-align:center' : '') + '">');
  if (sc.kicker) {
    h.push('<div class="gg-kicker">' + esc(sc.kicker) + '</div>');
    tw.from(q('.gg-kicker'), t, { y: ctx.px(18), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei });
    t += ctx.d('fast') * .5;
  }
  if (sc.title) {
    var mk = markOf(sc.mark, ctx.T);
    h.push('<h2 class="gg-title" style="font-size:' + tSize + 'px">' + maskLines(sc.title, '', mk.svg) + '</h2>');
    if (sc.textFx === 'scramble') {
      /* 글자가 섞이다 제자리를 찾는다. 마스크 리빌 대신 쓰는 등장 방식. */
      tw.scramble(q('.gg-title .gg-mk'), t, ctx.d('slow') * 1.15, { speed: .7, reveal: .2 });
      t += ctx.d('slow') * .9;
    } else {
      tw.from(q('.gg-title .gg-mk'), t, { yPercent: 115, duration: ctx.d('normal'), ease: ctx.ei }, ctx.st('normal'));
      t += ctx.d('normal') * .6 + ctx.st('normal') * (splitLines(sc.title).length - 1);
    }
    if (mk.svg) {
      /* 마크는 글자가 자리를 잡은 뒤에 그어진다 — 동시에 나오면 둘 다 안 읽힌다 */
      var ms = q('.gg-title .gg-mark');
      if (mk.def.draw) tw.draw(ms + ' path', t, ctx.d('normal'), TOKENS.e.move, ctx.st('tight'));
      else tw.from(ms, t, { scale: .6, opacity: 0, duration: ctx.d('fast'), ease: TOKENS.e.overshoot });
      tw.set(ms, t - .01, { opacity: 1 });
      tw.set(ms, 0, { opacity: 0 });
      t += ctx.d('fast') * .6;
    }
  }
  if (sc.sub) {
    h.push('<p class="gg-sub" style="font-size:' + sSize + 'px">' + esc(sc.sub) + '</p>');
    tw.from(q('.gg-sub'), t, { y: ctx.px(24), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei });
    t += ctx.d('fast') * .5;
  }
  h.push('</div>');
  /* 헤더가 실제로 차지하는 높이 — 본문 블록을 어디에 놓을지가 여기서 정해진다 */
  var hh = 0;
  if (sc.kicker) hh += 53;
  if (sc.title) hh += splitLines(sc.title).length * tSize * 1.08 + tSize * .06;
  if (sc.sub) hh += 26 + sSize * 1.5;
  return { html: h.join(''), end: t, h: Math.round(hh) };
}
/**
 * 헤더 아래 남은 공간의 중심. 헤더 높이를 모르고 상수로 밀면 헤더와 본문 사이가 벌어진다 —
 * 화면의 수직 균형이 무너지는 가장 흔한 원인이라 전 패턴이 이걸 쓴다.
 */
function bodyCy(ctx, topY, headH) {
  var maxHeadH = Math.round(ctx.H * (ctx.wide ? 0.32 : 0.28));
  var clampedHeadH = Math.min(headH, maxHeadH);
  return (topY + clampedHeadH + (ctx.wide ? 54 : 46) + (ctx.H - ctx.safe)) / 2;
}
/** 카드 한 장. i 는 스태거 순서용 인덱스. */
function card(it, g, ctx, o) {
  o = o || {};
  var icSize = num(o.iconSize, (g && g.w && g.w > 340) ? 80 : 56);
  var ic = it.icon ? ctx.icon(it.icon, icSize, 'gg-cardIc') : '';
  var deco = '';
  if (it.badge) deco += markOf({ type: 'badge', text: it.badge }, ctx.T).svg;
  if (it.ribbon) deco += markOf({ type: 'ribbon', text: it.ribbon }, ctx.T).svg;
  if (it.art && VEC.ART[it.art]) deco += '<div class="gg-cardArt">' + VEC.ART[it.art].build(ctx.T) + '</div>';
  if (it.spark && arr(it.spark).length > 1) {
    /* 카드 안 미니 추이 — 축도 라벨도 없다. 모양만 읽히면 된다 */
    var sp = CH.CHARTS.sparkline.build(CH.normData({ items: arr(it.spark) }), { tone: 'auto' }, ctx.T, 160, 54, 1);
    deco += '<div class="gg-cardSpark"><svg viewBox="0 0 160 54">' + sp.svg + '</svg></div>';
  }
  var lbStyle = o.labelSize ? ' style="font-size:' + o.labelSize + 'px"' : '';
  var ntStyle = o.noteSize ? ' style="font-size:' + o.noteSize + 'px"' : '';
  return '<div class="gg-card' + (it.tone ? ' gg-t-' + it.tone : '') + (o.cls ? ' ' + o.cls : '') +
    '"' + (o.idx != null ? ' data-i="' + o.idx + '"' : '') + ' style="left:' + Math.round(g.x) + 'px;top:' + Math.round(g.y) + 'px;width:' + Math.round(g.w) + 'px' +
    (g.h ? ';min-height:' + Math.round(g.h) + 'px' : '') + '">' +
    deco + ic +
    (it.value != null ? '<div class="gg-cardVal">' + esc(it.value) + '</div>' : '') +
    '<div class="gg-cardLb"' + lbStyle + '>' + esc(it.label) + '</div>' +
    (it.note ? '<div class="gg-cardNote"' + ntStyle + '>' + esc(it.note) + '</div>' : '') +
    '</div>';
}
/** 두 점을 잇는 곡선 path d. bow 는 휘는 정도. */
function curve(x1, y1, x2, y2, bow) {
  var mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
  var b = num(bow, 0) * len;
  return 'M' + r2(x1) + ' ' + r2(y1) + ' Q' + r2(mx - dy / len * b) + ' ' + r2(my + dx / len * b) + ' ' + r2(x2) + ' ' + r2(y2);
}
/**
 * 두 점을 잇는 곡선을 **출발점 기준 상대 좌표**로. MotionPath 용.
 * MotionPath 는 path 좌표를 요소의 transform(x/y)에 그대로 얹는다 — 절대 좌표를 주면
 * 요소가 스테이지 원점으로 순간이동한다. 그래서 0,0 에서 시작하는 path 를 따로 만든다.
 */
function relCurve(x1, y1, x2, y2, bow) {
  var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
  var b = num(bow, 0) * len, mx = dx / 2, my = dy / 2;
  return 'M0 0 Q' + r2(mx - dy / len * b) + ' ' + r2(my + dx / len * b) + ' ' + r2(dx) + ' ' + r2(dy);
}

/** 항목 배열을 {label,icon,note,...} 로 정규화. 문자열도 받는다. */
/* ------------------------------------------------------------------ *
 * 항목 배열의 필드 이름 — 패턴마다 부르는 이름이 다르다.
 *
 * 여기가 유일한 목록이다. 밀도 검사(validate)도, 자막 앵커링(syncScenes)도
 * 이것만 본다. 패턴을 새로 만들면서 항목 필드 이름을 새로 쓰면 여기에 더한다 —
 * 안 더하면 밀도 경고와 자막 앵커링이 조용히 그 패턴만 건너뛴다.
 * ------------------------------------------------------------------ */
var ITEM_KEYS = ['items', 'stats', 'steps', 'nodes', 'layers', 'events',
                 'lines', 'stops', 'sources', 'targets', 'orbits'];

/** 씬이 가진 항목 배열 — 차트는 data 안에 한 겹 더 들어 있다. */
function itemListOf(sc) {
  if (!sc) return null;
  for (var i = 0; i < ITEM_KEYS.length; i++) {
    if (Array.isArray(sc[ITEM_KEYS[i]])) return sc[ITEM_KEYS[i]];
  }
  if (sc.data && Array.isArray(sc.data.items)) return sc.data.items;
  return null;
}

/**
 * 씬 전체 길이 — 애니메이션이 끝난 시각 t 에 hold 를 더한다.
 *
 * hold 를 적었으면 그 값이고, 안 적었으면 화면에 나온 글자를 읽는 시간으로
 * 추정한다. 추정에는 에너지의 hold 배율(E.hm)이 곱해진다 — 차분한 톤은
 * 오래 머물고 하이에너지는 빨리 넘어간다.
 *
 *   sceneDur(sc, ctx, t, '읽을 글자')                글자 수로 추정
 *   sceneDur(sc, ctx, t, ctx.d('slow'))              초를 직접 준다
 *   sceneDur(sc, ctx, t, '글자', { add: .5 })         추정 뒤 조금 더 머문다
 *   sceneDur(sc, ctx, t, '글자', { scale: .5, min: 2.4 })
 */
function sceneDur(sc, ctx, t, hint, o) {
  o = o || {};
  if (ctx) ctx.animEnd = r2(t);
  var g = typeof hint === 'number' ? hint : readSec(hint || '', ctx.energy);
  if (o.scale) g *= o.scale;
  if (o.min != null) g = Math.max(o.min, g);
  return t + num(sc.hold, g * ctx.E.hm + (o.add || 0));
}

/**
 * 항목이 차례로 들어오는 등장 트윈.
 *
 * 항목에 say 가 없으면 스태거 하나로 끝낸다 — 트윈이 하나뿐이라 산출물이 가볍다.
 * say 가 있으면 항목마다 트윈을 따로 만든다. 자막 동기화가 항목별로 등장 시각을
 * 옮기려면 옮길 트윈이 항목마다 있어야 하기 때문이다. 두 갈래의 타이밍은 같다 —
 * i 번째 항목은 어느 쪽이든 at + i * gap 에 들어온다.
 *
 *   enterItems(tw, ctx, it, '.gg-cc', t, gap, vars)
 *   enterItems(tw, ctx, it, '.gg-cc', t, gap, vars, { inner: ' .gg-ic', lead: ctx.d('micro') })
 */
function enterItems(tw, ctx, list, sel, at, gap, vars, o) {
  o = o || {};
  var inner = o.inner || '', lead = num(o.lead, 0);
  if (hasSay(list)) {
    arr(list).forEach(function (x, i) {
      tw.from(ctx.q(sel + '[data-i="' + i + '"]' + inner), at + i * gap + lead, copy(vars));
    });
  } else {
    tw.from(ctx.q(sel + inner), at + lead, vars, gap);
  }
}

/** 밀도 검사용 — 이름을 가리지 않고 씬이 든 항목을 전부 모은다. */
function allItemsOf(sc) {
  var pool = [];
  ITEM_KEYS.forEach(function (k) { pool = pool.concat(arr(sc[k])); });
  return pool;
}

function items(v) {
  return arr(v).map(function (x) { return typeof x === 'string' ? { label: x } : (x || {}); });
}
function itemsText(v) { return items(v).map(function (x) { return x.label; }).join(' '); }
/* kineticType 의 lines 배열은 label 이 아니라 text 를 쓴다 — 정규화 통로를 따로 둔다.
   이 통로를 안 거치고 배열을 그대로 만지면 객체 줄이 [object Object] 로 샌다.
   제목 문자열을 줄로 쪼개는 splitLines 와 헷갈리지 않게 이름을 갈라 두었다. */
function lineItems(v) {
  return arr(v).map(function (x) { return typeof x === 'string' ? { text: x } : (x || {}); });
}
function lineText(l) { return typeof l === 'string' ? l : (l && l.text) || ''; }

/* ================================================================== *
 * 차트 — anim 지시를 트윈 IR 로 옮긴다.
 * 차트 모듈은 GSAP 을 모른다. "막대가 자란다" 까지만 말하고 방법은 여기서 정한다.
 * ================================================================== */
/* split 을 주면 항목마다 트윈을 따로 만든다 — 자막이 막대 하나하나의 시각을 옮길 수 있게.
   요소에는 data-i 가 이미 있으므로 셀렉터만 갈라 주면 된다. */
function chartAnim(tw, ctx, at, anim, dur, split) {
  var q = ctx.q, end = at;
  var SPLITTABLE = ['.gg-cBar', '.gg-cVal', '.gg-cSeg', '.gg-cDot'];
  arr(anim).forEach(function (a) {
    if (split > 0 && SPLITTABLE.indexOf(a.sel) >= 0) {
      var t1 = at + num(a.lag, 0) * (dur || 1);
      var d1 = num(a.dur, ctx.d('normal') / (dur || 1)) * (dur || 1);
      var s1 = num(a.st, 0) * (dur || 1);
      for (var k = 0; k < split; k++) {
        var one = copy(a);
        one.sel = a.sel + '[data-i="' + k + '"]';
        one.st = 0; one.lag = 0;
        chartAnim(tw, ctx, t1 + s1 * k, [one], dur, 0);
      }
      var fin1 = t1 + d1 + s1 * Math.max(0, split - 1);
      if (fin1 > end) end = fin1;
      return;
    }
    var sel = q(a.sel), t0 = at + num(a.lag, 0) * (dur || 1);
    var d = num(a.dur, ctx.d('normal') / (dur || 1)) * (dur || 1);
    var st = num(a.st, 0) * (dur || 1);
    if (a.k === 'grow') tw.fromTo(sel, t0, { scaleY: 0 }, { scaleY: 1, duration: d, ease: ctx.ei }, st);
    else if (a.k === 'growX') tw.fromTo(sel, t0, { scaleX: 0 }, { scaleX: 1, duration: d, ease: ctx.ei }, st);
    else if (a.k === 'draw') tw.draw(sel, t0, d, TOKENS.e.move, st);
    else if (a.k === 'sweep') tw.draw(sel, t0, d, TOKENS.e.move, st);
    else if (a.k === 'fade') tw.from(sel, t0, { opacity: 0, duration: d, ease: ctx.ei }, st);
    else if (a.k === 'pop') tw.from(sel, t0, { scale: 0, opacity: 0, transformOrigin: '50% 50%',
      duration: d, ease: TOKENS.e.overshoot }, st);
    else if (a.k === 'bloom') tw.from(sel, t0, { scale: .55, opacity: 0, duration: d, ease: TOKENS.e.overshoot }, st);
    var fin = t0 + d + st * Math.max(0, num(a.n, 8) - 1);
    if (fin > end) end = fin;
  });
  return end;
}
/** 범례 — 시리즈 2개 이상이면 반드시 있어야 한다. 색만으로 정체를 구분하게 두지 않는다. */
function legendHTML(list, ctx, x, y, w) {
  if (!list || !list.length) return '';
  return '<div class="gg-legend" style="left:' + Math.round(x) + 'px;top:' + Math.round(y) + 'px;width:' + Math.round(w) +
    'px;font-size:' + Math.round(ctx.fs.small * .96) + 'px">' +
    list.map(function (L) {
      return '<span class="gg-lgI"><i style="background:' + L.color + '"></i>' + esc(L.name) + '</span>';
    }).join('') + '</div>';
}

/* ================================================================== *
 * 자막 동기화 — 녹음이 끝난 뒤 화면을 목소리에 맞춘다.
 *
 * 씬에 say(그 씬에서 말하는 대사)를 적어 두면, 자막에서 그 대사가 흐르는
 * 구간을 찾아 씬의 시작과 길이를 실측으로 바꾼다. 항목마다 say 를 달면
 * 항목이 제 대사에 맞춰 하나씩 들어온다.
 *
 * 파서와 정렬은 scriptviz 에서 가져왔다 — 같은 자막을 같은 방식으로 읽는다.
 * 다만 커서 운용이 다르다. scriptviz 의 비트는 대본을 빠짐없이 덮지만
 * 모션그래픽의 씬은 대본의 일부만 화면으로 만든다. 화면 없는 구간에서
 * 커서가 걸리지 않도록 씬마다 시작 지점을 먼저 찾는다.
 * ================================================================== */

function subKey(s) {
  return String(s || '').toLowerCase().replace(/[^0-9a-z가-힣]/g, '');
}
function parseTimecode(s) {
  var m = String(s).trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/);
  if (!m) return null;
  var ms = m[4].length === 1 ? +m[4] * 100 : (m[4].length === 2 ? +m[4] * 10 : +m[4]);
  return (+(m[1] || 0)) * 3600 + (+m[2]) * 60 + (+m[3]) + ms / 1000;
}

/** SRT · VTT → [{start, end, text}]. 두 형식의 차이는 구분자와 헤더뿐이라 한 파서로 받는다. */
function parseSubtitles(text) {
  var src = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  var cues = [];
  src.split(/\n{2,}/).forEach(function (block) {
    var lines = block.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length) return;
    if (/^WEBVTT/i.test(lines[0])) lines.shift();
    if (/^(NOTE|STYLE|REGION)\b/i.test(lines[0] || '')) return;
    var ti = -1, tm = null;
    for (var i = 0; i < lines.length; i++) {
      tm = lines[i].match(/^(\S+)\s*-->\s*(\S+)/);
      if (tm) { ti = i; break; }
    }
    if (ti < 0) return;
    var st = parseTimecode(tm[1]), en = parseTimecode(tm[2]);
    if (st == null || en == null) return;
    var body = lines.slice(ti + 1).join(' ')
      .replace(/<[^>]*>/g, '').replace(/\{\\[^}]*\}/g, '')
      .replace(/\s+/g, ' ').trim();
    if (!body) return;
    cues.push({ start: st, end: Math.max(en, st), text: body });
  });
  cues.sort(function (a, b) { return a.start - b.start; });
  return cues;
}

/** 두 문자열이 앞에서부터 얼마나 겹치는지. 한쪽에 글자가 끼어도 계속 센다. */
function commonPrefixish(a, b) {
  var i = 0, j = 0, hit = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { hit++; i++; j++; continue; }
    if (a[i + 1] === b[j]) { i++; continue; }
    if (a[i] === b[j + 1]) { j++; continue; }
    i++; j++;
  }
  return hit;
}

/**
 * say 의 머리글자가 걸리는 첫 cue 를 cursor 이후에서 찾는다. 없으면 -1.
 * 이것이 scriptviz 와 갈리는 지점이다 — 씬이 덮지 않는 대사를 건너뛴다.
 */
function findAnchor(cues, cursor, say) {
  var key = subKey(say);
  if (key.length < 6) return -1;
  var head = key.slice(0, Math.min(24, Math.max(8, Math.round(key.length * 0.2))));
  var best = -1, bestHit = 0;
  for (var i = cursor; i < cues.length; i++) {
    var acc = subKey(cues[i].text);
    if (cues[i + 1]) acc += subKey(cues[i + 1].text);
    var hit = commonPrefixish(head, acc);
    if (hit > bestHit) { bestHit = hit; best = i; }
    if (hit >= head.length * 0.9) return i;
  }
  return bestHit >= head.length * 0.6 ? best : -1;
}

/**
 * 대사 하나가 덮는 자막 구간을 잡는다. anchor 부터 앞으로만 소비한다.
 * 돌려주는 것: {start, end, matched} — matched 는 자막으로 시각을 잡은 글자의 비율.
 */
function alignSay(say, cues, anchor) {
  var key = subKey(say);
  if (!key) return null;
  var take = [], acc = '', hit = 0;
  for (var i = anchor; i < cues.length; i++) {
    take.push(cues[i]);
    acc += subKey(cues[i].text);
    hit = commonPrefixish(key, acc);
    if (hit >= key.length * 0.92) break;
    if (acc.length > key.length * 1.6) break;
  }
  if (!take.length) return null;
  return {
    start: r2(take[0].start),
    end: r2(take[take.length - 1].end),
    matched: Math.round(hit / key.length * 1000) / 1000,
    used: take.length
  };
}

/** 항목 중 하나라도 say 를 달았는가 — 달렸으면 등장 트윈을 항목별로 푼다.
    say 가 없으면 기존 stagger 를 그대로 써서 트윈 수를 늘리지 않는다. */
function hasSay(list) {
  return arr(list).some(function (x) { return x && typeof x === 'object' && x.say; });
}

/* ================================================================== *
 * 씬 패턴.  (개수를 세려면 `gm info patterns` — 여기 숫자를 적으면 늘 어긋난다)
 * 각 패턴: {label, use, fields, build(sc, ctx) -> {html, tw, dur}}
 * dur 은 hold 를 포함한 씬 전체 길이. 스펙의 hold 가 없으면 내용 길이로 추정한다.
 * ================================================================== */
var PATTERNS = {};

/* --- 1. heroReveal — 한 메시지를 크게 세운다. 오프닝·클로징의 기본. --- */
PATTERNS.heroReveal = {
  label: '히어로 리빌',
  use: '오프닝, 클로징, 제품명·선언 공개. 한 씬에 메시지 하나.',
  fields: 'title(필수) · kicker · sub · icon · rule(기본 true)',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var w = Math.min(ctx.W - ctx.safe * 2, ctx.wide ? 1500 : 940);
    var x = (ctx.W - w) / 2;
    var artH = 0;
    if (sc.art && VEC.ART[sc.art]) {
      /* 일러스트는 아이콘보다 크고 부분이 나뉘어 있다 — 조각이 차례로 들어온다.
         헤더를 그만큼 내리지 않으면 타이틀 위로 겹친다. */
      var az = ctx.wide ? 330 : 270;
      artH = az;
      H.push('<div class="gg-heroArt" style="left:' + Math.round((ctx.W - az) / 2) + 'px;top:' +
        Math.round(ctx.cy - az - (ctx.wide ? 130 : 200)) + 'px">' + ctx.art(sc.art, az) + '</div>');
      tw.from(q('.gg-heroArt .gg-artP'), t, { scale: .82, opacity: 0, transformOrigin: '50% 50%',
        duration: ctx.d('normal'), ease: TOKENS.e.overshoot }, ctx.st('normal'));
      t += ctx.d('normal') * .8;
    } else if (sc.icon) {
      var isz = ctx.wide ? 132 : 108;
      H.push('<div class="gg-heroIc" style="left:' + (ctx.W - isz) / 2 + 'px;top:' + (ctx.cy - (ctx.wide ? 300 : 380)) + 'px">' +
        ctx.icon(sc.icon, isz, 'gg-drawIc') + '</div>');
      tw.draw(q('.gg-heroIc path'), t, ctx.d('slow'), TOKENS.e.draw);
      tw.from(q('.gg-heroIc'), t, { scale: .8, opacity: 0, duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
      t += ctx.d('slow') * .7;
    }
    var headY = ctx.cy - (ctx.wide ? 150 : 190) + (artH ? (ctx.wide ? 70 : 90) : 0);
    var hd = head(sc, ctx, tw, t, { x: x, y: headY, w: w, align: 'center' },
      { title: Math.round(ctx.fs.title * 1.06) });
    H.push(hd.html);
    t = hd.end;
    if (sc.rule !== false) {
      /* 룰라인은 헤더 블록 아래 — 타이틀 줄 수에 따라 따라 내려간다 */
      H.push('<div class="gg-rule" style="left:' + (ctx.cx - 90) + 'px;top:' + Math.round(headY + hd.h + 46) + 'px;width:180px"></div>');
      tw.from(q('.gg-rule'), t - ctx.d('fast') * .3, { scaleX: 0, duration: ctx.d('normal'), ease: TOKENS.e.move });
      t += ctx.d('fast') * .4;
    }
    if (ctx.energy === 'E3') tw.fx('impact', r2(t * .55));
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, (sc.title || '') + (sc.sub || '')) };
  }
};

/* --- 2. kineticType — 글자가 주인공. 메시지를 리듬으로 때린다. --- */
PATTERNS.kineticType = {
  label: '키네틱 타이포',
  use: '선언, 슬로건, 반전 대사. 줄마다 크기·강조를 달리해 리듬을 만든다.',
  fields: 'lines[](필수: 문자열 또는 {text,emphasis,scale}) · mode(stack|cut) · by(words|chars)',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var L = lineItems(sc.lines);
    if (!L.length && sc.title) L = splitLines(sc.title).map(function (s) { return { text: s }; });
    var mode = sc.mode || (ctx.energy === 'E3' ? 'cut' : 'stack');
    var by = sc.by || (ctx.energy === 'E3' ? 'chars' : 'words');
    var gap = ctx.wide ? 30 : 26;
    var w = ctx.W - ctx.safe * 2;
    /* 한 줄이 주인공인 패턴이다 — 넘치면 줄바꿈에 맡기지 않고 그 줄만 줄여 한 줄을 지킨다.
       .62 아래로는 리듬(줄마다 다른 크기)이 무너지므로 더 줄이지 않는다. 그래도 넘치면
       validate 가 짧게 쓰라고 짚는다. 접히더라도 아래 흐름 배치라 겹치지는 않는다. */
    var sizes = L.map(function (l) {
      var base = Math.round(ctx.fs.title * num(l.scale, l.emphasis ? 1.34 : 1));
      var need = estEm(l.text) * base;
      return need > w ? Math.max(Math.round(base * .62), Math.floor(base * w / need)) : base;
    });

    if (mode === 'cut') {
      /* 컷 모드 — 한 줄씩 갈아치운다. 각 줄이 화면 중앙을 독점.
         래퍼가 세로 중앙을 잡는다 — 줄이 접혀도 중심이 흔들리지 않고, transform 이
         래퍼에 있어 안쪽 글자를 GSAP 이 마음대로 움직여도 어긋나지 않는다. */
      L.forEach(function (l, i) {
        H.push('<div class="gg-kcut" style="left:' + ctx.safe + 'px;top:' + ctx.cy + 'px;width:' + w + 'px">' +
          '<div class="gg-kl gg-c" data-i="' + i + '" style="font-size:' + sizes[i] + 'px' +
          (l.emphasis ? ';color:var(--acc)' : '') + '">' + esc(l.text) + '</div></div>');
      });
      var beat = r2(Math.max(.34, readSec(itemsText(L.map(function (l) { return l.text; })), ctx.energy) / L.length * 1.15));
      L.forEach(function (l, i) {
        var s = q('.gg-kl[data-i="' + i + '"]');
        var fx = l.fx || sc.textFx;
        tw.set(s, 0, { opacity: 0 });
        tw.set(s, t, { opacity: 1 });
        if (fx === 'scramble') tw.scramble(s, t, beat * .82, { speed: .8, reveal: .15 });
        else tw.split(s, t, by, { yPercent: 60, opacity: 0, scale: .86, duration: ctx.d('fast'), ease: ctx.ei }, ctx.st('tight'));
        if (ctx.energy === 'E3') tw.fx('impact', t);
        if (i < L.length - 1) { tw.to(s, t + beat, { opacity: 0, scale: 1.1, duration: ctx.d('micro'), ease: TOKENS.e.exit }); }
        t += beat;
      });
      return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, ctx.d('slow')) };
    }
    /* 스택 모드 — 줄이 쌓이며 문장이 완성된다.
       줄마다 top 을 미리 계산해 두면 한 줄이 두 줄로 접히는 순간 다음 줄과 겹친다.
       계산하지 말고 흐름에 맡기고, 래퍼를 translateY(-50%) 로 세로 중앙에 건다 —
       접히든 말든 브라우저가 잰 실제 높이 기준으로 가운데에 놓인다.
       한 줄 블록 높이는 line-height 1.1em + .gg-mask 의 padding .06em = 1.16em 이라,
       margin-top:gap 이 예전 간격(size*1.16 + gap)을 그대로 재현한다. */
    H.push('<div class="gg-kstack" style="left:' + ctx.safe + 'px;top:' + ctx.cy + 'px;width:' + w + 'px">');
    L.forEach(function (l, i) {
      H.push('<div class="gg-kl gg-c" data-i="' + i + '" style="font-size:' + sizes[i] + 'px' +
        (i ? ';margin-top:' + gap + 'px' : '') + (l.emphasis ? ';color:var(--acc)' : '') + '">' +
        '<span class="gg-mask"><span class="gg-mk">' + esc(l.text) + '</span></span></div>');
    });
    H.push('</div>');
    L.forEach(function (l, i) {
      var s = q('.gg-kl[data-i="' + i + '"] .gg-mk');
      var fx2 = l.fx || sc.textFx;
      if (fx2 === 'scramble') {
        tw.scramble(s, t, ctx.d('slow'), { speed: .8, reveal: .16 });
      } else if (l.emphasis) {
        tw.split(q('.gg-kl[data-i="' + i + '"]'), t, by, { yPercent: 100, opacity: 0, duration: ctx.d('normal'), ease: TOKENS.e.overshoot }, ctx.st('tight'));
      } else {
        tw.from(s, t, { yPercent: 112, duration: ctx.d('normal'), ease: ctx.ei });
      }
      t += readSec(l.text, ctx.energy) * .48 + ctx.d('fast') * .3;
    });
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, ctx.d('slow')) };
  }
};

/* --- 3. cardsCascade — 여럿을 순서대로 보여준다. 나열의 기본. --- */
PATTERNS.cardsCascade = {
  label: '카드 캐스케이드',
  use: '항목 나열, 기능 소개, 구성요소 열거. 3~8개가 적정. 9개 넘으면 씬을 나눈다.',
  fields: 'items[](필수) · title · kicker · sub · cols · dir(up|left|scale)',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var it = items(sc.items), n = it.length;
    var hasHead = !!(sc.title || sc.kicker);
    var topY = ctx.safe + (ctx.wide ? 34 : 96);
    var hd = null;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: ctx.wide ? 'left' : 'center' },
        { title: Math.round(ctx.fs.title * .74) });
      H.push(hd.html);
      t = hd.end;
    }
    var maxCols = ctx.wide ? 5 : (ctx.aspect === '9:16' ? 2 : 3);
    var cols = Math.min(maxCols, Math.max(1, num(sc.cols, colsFor(n, ctx.wide))));
    var gapX = ctx.wide ? 36 : 28, gapY = ctx.wide ? 34 : 26;
    var availW = ctx.W - ctx.safe * 2;
    var itemW = Math.floor((availW - (cols - 1) * gapX) / cols);
    /* 한 줄이면 세로를 넉넉히 쓴다 — 넓고 납작한 카드는 화면이 비어 보인다 */
    var rows = Math.ceil(n / cols);
    var itemH = Math.round(itemW * (rows === 1 ? (ctx.wide ? .78 : .88) : (ctx.wide ? .68 : .75)));
    if (itemH > 400) itemH = 400;
    var blockCy = hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy;
    var g = gridOf(n, cols, ctx.W, itemW, itemH, gapX, gapY, blockCy);
    var isBig = rows === 1 && cols <= 4;
    var iconSize = Math.round(Math.min(96, Math.max(64, itemW * (isBig ? 0.22 : 0.18))));
    var lbSize = isBig ? (cols <= 3 ? Math.round(ctx.fs.body * 1.22) : Math.round(ctx.fs.body * 1.1)) : ctx.fs.body;
    var ntSize = isBig ? (cols <= 3 ? 27 : 25) : 23;
    it.forEach(function (x, i) {
      H.push(card(x, g[i], ctx, {
        cls: 'gg-cascadeCard',
        idx: i,
        iconSize: iconSize,
        labelSize: lbSize,
        noteSize: ntSize
      }));
    });

    var dir = sc.dir || 'up';
    var appear;
    if (dir === 'stack') {
      /* 카드가 중앙에 겹쳐 있다가 제자리로 흩어진다 — 한 덩어리였던 게 나뉘는 느낌 */
      var stTime = ctx.st(n > 6 ? 'tight' : 'normal');
      it.forEach(function (x, i) {
        var g2 = g[i], rot = (i - (n - 1) / 2) * 4;
        tw.fromTo(q('.gg-cascadeCard:nth-of-type(' + (i + 1) + ')'), t + i * stTime,
          { x: r2(ctx.cx - g2.cx), y: r2(blockCy - g2.cy), scale: .82, rotate: rot, opacity: 0 },
          { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, duration: ctx.d('normal') * 1.2, ease: TOKENS.e.overshoot });
      });
      appear = ctx.d('normal') * 1.2 + stTime * (n - 1);
    } else {
      var v = dir === 'left' ? { x: ctx.px(60), opacity: 0, skewX: ctx.skew('x') }
            : dir === 'scale' ? { scale: .88, opacity: 0 }
            : { y: ctx.px(44), opacity: 0, skewY: ctx.skew() };
      v.duration = ctx.d('fast') * 1.25; v.ease = ctx.ei;
      var stC = ctx.st(n > 6 ? 'tight' : 'normal');
      enterItems(tw, ctx, it, '.gg-cascadeCard', t, stC, v);
      appear = ctx.d('fast') * 1.25 + stC * (n - 1);
    }
    enterItems(tw, ctx, it, '.gg-cascadeCard', t, ctx.st('tight'),
      { scale: .6, opacity: 0, duration: ctx.d('fast'), ease: TOKENS.e.overshoot },
      { inner: ' .gg-ic', lead: ctx.d('micro') });
    t += appear;
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, itemsText(it) + (sc.title || '')) };
  }
};

/* --- 4. networkBuild — 관계를 그린다. 노드 먼저, 선은 나중에. --- */
PATTERNS.networkBuild = {
  label: '네트워크 빌드',
  use: '아키텍처, 시스템 관계, 조직 연결. 선이 그려지는 순서가 설명 순서다.',
  fields: 'nodes[](필수: {label,icon,hub}) · links[]("A>B" 또는 [i,j]) · title · kicker',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var nd = items(sc.nodes), n = nd.length;
    var hubIdx = -1;
    nd.forEach(function (x, i) { if (x.hub && hubIdx < 0) hubIdx = i; });
    var hasHead = !!(sc.title || sc.kicker), topY = ctx.safe + (ctx.wide ? 26 : 92), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: ctx.wide ? 'left' : 'center' },
        { title: Math.round(ctx.fs.title * .7) });
      H.push(hd.html);
      t = hd.end;
    }
    var cy = hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy;
    var rx = ctx.wide ? Math.min(430, (ctx.W - ctx.safe * 2) * .3) : (ctx.W - ctx.safe * 2) * .36;
    var ry = ctx.wide ? Math.min(300, (ctx.H - ctx.safe * 2) * .29) : rx * 1.15;
    var pos = [], ringNodes = [];
    nd.forEach(function (x, i) { if (i !== hubIdx) ringNodes.push(i); });
    var ring = ringOf(ringNodes.length, ctx.cx, cy, rx, ry, -90);
    ringNodes.forEach(function (idx, k) { pos[idx] = ring[k]; });
    if (hubIdx >= 0) pos[hubIdx] = { x: ctx.cx, y: cy };

    /* 링크 — "A>B" 라벨 참조 또는 인덱스 쌍. hub 가 있고 links 가 없으면 전부 hub 로 잇는다. */
    function findIdx(name) {
      for (var i = 0; i < n; i++) if (nd[i].label === name) return i;
      var k = parseInt(name, 10);
      return isFinite(k) ? k : -1;
    }
    var links = arr(sc.links).map(function (l) {
      if (Array.isArray(l)) return { a: l[0], b: l[1] };
      var p = String(l).split(/\s*[>\-]+\s*/);
      return { a: findIdx(p[0]), b: findIdx(p[1]), label: p[2] };
    }).filter(function (l) { return l.a >= 0 && l.b >= 0 && l.a < n && l.b < n; });
    if (!links.length && hubIdx >= 0) links = ringNodes.map(function (i) { return { a: hubIdx, b: i }; });
    if (!links.length) links = ringNodes.map(function (i, k) { return { a: i, b: ringNodes[(k + 1) % ringNodes.length] }; });

    var nodeW = ctx.wide ? 210 : 190, nodeH = 112;
    var svg = ['<svg class="gg-svg" viewBox="0 0 ' + ctx.W + ' ' + ctx.H + '" aria-hidden="true">'];
    links.forEach(function (l, i) {
      var a = pos[l.a], b = pos[l.b];
      svg.push('<path class="gg-link" data-i="' + i + '" d="' + curve(a.x, a.y, b.x, b.y, hubIdx >= 0 ? .06 : .14) + '"/>');
    });
    svg.push('</svg>');
    H.push(svg.join(''));
    nd.forEach(function (x, i) {
      var p = pos[i], isHub = i === hubIdx;
      H.push('<div class="gg-node' + (isHub ? ' gg-hub' : '') + '" data-i="' + i + '" style="left:' +
        Math.round(p.x - nodeW / 2) + 'px;top:' + Math.round(p.y - nodeH / 2) + 'px;width:' + nodeW + 'px">' +
        (x.icon ? ctx.icon(x.icon, isHub ? 46 : 38) : '') +
        '<div class="gg-nodeLb" style="font-size:' + Math.round(ctx.fs.small * (isHub ? 1.22 : 1)) + 'px">' + esc(x.label) + '</div>' +
        (x.note ? '<div class="gg-nodeNote">' + esc(x.note) + '</div>' : '') + '</div>');
    });

    if (hubIdx >= 0) {
      tw.from(q('.gg-hub'), t, { scale: .7, opacity: 0, duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
      t += ctx.d('normal') * .7;
    }
    tw.from(q('.gg-node:not(.gg-hub)'), t, { scale: .82, opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }, ctx.st('normal'));
    t += ctx.d('fast') + ctx.st('normal') * Math.max(0, ringNodes.length - 1);
    tw.draw(q('.gg-link'), t - ctx.d('fast') * .4, ctx.d('normal'), TOKENS.e.draw, ctx.st('normal'));
    t += ctx.d('normal') + ctx.st('normal') * Math.max(0, links.length - 1);
    /* flow: 선을 그린 뒤 그 위로 점이 흐른다 — 관계가 "연결"이 아니라 "흐름"일 때 */
    if (sc.flow) {
      links.forEach(function (l, i) {
        var a = pos[l.a], b = pos[l.b], fsel = q('.gg-flowDot[data-i="' + i + '"]');
        H.push('<div class="gg-flowDot" data-i="' + i + '" style="left:' + r2(a.x - 9) + 'px;top:' + r2(a.y - 9) + 'px"></div>');
        tw.set(fsel, 0, { opacity: 0 });
        tw.to(fsel, t - ctx.d('normal') * .5, { opacity: 1, duration: ctx.d('micro') });
        tw.path(fsel, t - ctx.d('normal') * .5, ctx.d('slow') * 1.1,
          relCurve(a.x, a.y, b.x, b.y, hubIdx >= 0 ? .06 : .14), { ease: TOKENS.e.soft });
        tw.to(fsel, t - ctx.d('normal') * .5 + ctx.d('slow') * .95, { opacity: 0, duration: ctx.d('fast') });
      });
      t += ctx.d('slow') * .6;
    }
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, itemsText(nd)) };
  }
};

/* --- 5. processFlow — 순서를 그린다. 단계 사이 화살표가 시간을 만든다. --- */
PATTERNS.processFlow = {
  label: '프로세스 플로우',
  use: '절차, 파이프라인, 단계별 흐름. 3~6단계. 7개 넘으면 두 씬으로 나눈다.',
  fields: 'steps[](필수: {label,icon,note}) · title · kicker · vertical(기본: 화면비가 정함)',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var st = items(sc.steps || sc.items), n = st.length;
    var vert = has(sc, 'vertical') ? !!sc.vertical : !ctx.wide;
    var hasHead = !!(sc.title || sc.kicker), topY = ctx.safe + (ctx.wide ? 26 : 92), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: ctx.wide ? 'left' : 'center' },
        { title: Math.round(ctx.fs.title * .7) });
      H.push(hd.html);
      t = hd.end;
    }
    var mid = hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy;
    var svg = ['<svg class="gg-svg" viewBox="0 0 ' + ctx.W + ' ' + ctx.H + '" aria-hidden="true">' +
      '<defs><marker id="ah-' + ctx.sid + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">' +
      '<path d="M0 0 L10 5 L0 10" fill="none" stroke="currentColor" stroke-width="1.7"/></marker></defs>'];
    var boxes = [];
    if (!vert) {
      var gap = 92, bw = Math.floor((ctx.W - ctx.safe * 2 - (n - 1) * gap) / n), bh = Math.round(bw * .62);
      if (bh > 300) bh = 300;
      var r = rowOf(n, ctx.W, bw, gap);
      r.forEach(function (g, i) { boxes.push({ x: g.x, y: mid - bh / 2, w: bw, h: bh, cx: g.cx, cy: mid }); });
      for (var i = 0; i < n - 1; i++) {
        var x1 = boxes[i].x + bw + 16, x2 = boxes[i + 1].x - 14;
        svg.push('<path class="gg-arrow" data-i="' + i + '" d="M' + r2(x1) + ' ' + mid + ' L' + r2(x2) + ' ' + mid +
          '" marker-end="url(#ah-' + ctx.sid + ')"/>');
      }
    } else {
      var vgap = 44, bw2 = Math.min(ctx.W - ctx.safe * 2, 760), bh2 = Math.round(Math.min(190, (ctx.H * .58 - (n - 1) * vgap) / n));
      var totalH = n * bh2 + (n - 1) * vgap, y0 = mid - totalH / 2;
      for (var j = 0; j < n; j++) boxes.push({ x: (ctx.W - bw2) / 2, y: y0 + j * (bh2 + vgap), w: bw2, h: bh2, cx: ctx.cx, cy: y0 + j * (bh2 + vgap) + bh2 / 2 });
      for (var k = 0; k < n - 1; k++) {
        var y1 = boxes[k].y + bh2 + 8, y2 = boxes[k + 1].y - 8;
        svg.push('<path class="gg-arrow" data-i="' + k + '" d="M' + ctx.cx + ' ' + r2(y1) + ' L' + ctx.cx + ' ' + r2(y2) +
          '" marker-end="url(#ah-' + ctx.sid + ')"/>');
      }
    }
    svg.push('</svg>');
    H.push(svg.join(''));
    st.forEach(function (x, i) {
      var b = boxes[i];
      H.push('<div class="gg-step" data-i="' + i + '" style="left:' + Math.round(b.x) + 'px;top:' + Math.round(b.y) +
        'px;width:' + Math.round(b.w) + 'px;min-height:' + Math.round(b.h) + 'px">' +
        '<div class="gg-stepNo">' + pad(i + 1, 2) + '</div>' +
        (x.icon ? ctx.icon(x.icon, 54) : '') +
        '<div class="gg-stepLb" style="font-size:' + Math.round(ctx.fs.body * 1.04) + 'px">' + esc(x.label) + '</div>' +
        (x.note ? '<div class="gg-stepNote">' + esc(x.note) + '</div>' : '') + '</div>');
    });
    /* 단계 하나 등장 -> 화살표 -> 다음 단계. 순서가 설명이다. */
    var beat = ctx.d('fast') * 1.1, aw = ctx.d('fast') * .85;
    st.forEach(function (x, i) {
      tw.from(q('.gg-step[data-i="' + i + '"]'), t, { y: ctx.px(vert ? 26 : 0), x: ctx.px(vert ? 0 : 34),
        skewX: vert ? 0 : ctx.skew('x'), skewY: vert ? ctx.skew() : 0, opacity: 0, scale: .94, duration: beat, ease: ctx.ei });
      t += beat * .75;
      if (i < n - 1) { tw.draw(q('.gg-arrow[data-i="' + i + '"]'), t, aw, TOKENS.e.move); t += aw * .8; }
    });
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, itemsText(st)) };
  }
};

/* --- 6. beforeAfter — 대비. 바뀐 것을 눈으로 보게 만든다. --- */
PATTERNS.beforeAfter = {
  label: '비포 애프터',
  use: '개선 전/후, 도입 전/후, 문제/해결. 왼쪽이 흐려지며 오른쪽이 켜진다.',
  fields: 'before{label,items[],value} · after{label,items[],value} (둘 다 필수) · title · kicker',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var B = sc.before || {}, A = sc.after || {};
    var hasHead = !!(sc.title || sc.kicker), topY = ctx.safe + (ctx.wide ? 24 : 88), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: 'center' },
        { title: Math.round(ctx.fs.title * .68) });
      H.push(hd.html);
      t = hd.end;
    }
    var mid = hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy;
    var vert = !ctx.wide;
    var pw = vert ? ctx.W - ctx.safe * 2 : Math.floor((ctx.W - ctx.safe * 2 - 110) / 2);
    var avail = (ctx.H - ctx.safe) - (mid - (hasHead ? topY + hd.h : ctx.safe));
    var ph = vert ? Math.round(Math.min(430, (ctx.H * .5 - 90) / 2)) : Math.round(Math.min(560, (ctx.H - ctx.safe * 2) - (hasHead ? hd.h + 62 : 0)));
    var panels = vert
      ? [{ x: (ctx.W - pw) / 2, y: mid - ph - 45 }, { x: (ctx.W - pw) / 2, y: mid + 45 }]
      : [{ x: ctx.safe, y: mid - ph / 2 }, { x: ctx.W - ctx.safe - pw, y: mid - ph / 2 }];

    function panel(side, o, p) {
      var it = items(o.items);
      return '<div class="gg-panel gg-' + side + '" style="left:' + Math.round(p.x) + 'px;top:' + Math.round(p.y) +
        'px;width:' + pw + 'px;min-height:' + ph + 'px">' +
        '<div class="gg-panelTag">' + esc(o.label || (side === 'bf' ? 'BEFORE' : 'AFTER')) + '</div>' +
        (o.value != null ? '<div class="gg-panelVal" style="font-size:' + Math.round(ctx.fs.num * .52) + 'px">' + esc(o.value) + '</div>' : '') +
        (o.icon ? ctx.icon(o.icon, 56) : '') +
        (it.length ? '<ul class="gg-panelList" style="font-size:' + Math.round(ctx.fs.body * .92) + 'px">' +
          it.map(function (x) { return '<li>' + esc(x.label) + (x.note ? ' <em>' + esc(x.note) + '</em>' : '') + '</li>'; }).join('') + '</ul>' : '') +
        '</div>';
    }
    H.push(panel('bf', B, panels[0]));
    H.push(panel('af', A, panels[1]));
    var dx = vert ? 0 : 30, dy = vert ? 26 : 0;
    tw.from(q('.gg-bf'), t, { x: ctx.px(-dx), y: ctx.px(-dy), opacity: 0, duration: ctx.d('normal'), ease: ctx.ei });
    tw.from(q('.gg-bf li'), t + ctx.d('fast') * .6, { x: ctx.px(16), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }, ctx.st('normal'));
    t += ctx.d('normal') + readSec(itemsText(B.items) + (B.label || ''), ctx.energy) * .55;
    /* 전환의 핵 — before 가 물러나고 after 가 켜진다. 동시에 일어나야 대비가 산다. */
    tw.to(q('.gg-bf'), t, { opacity: .34, scale: .97, filter: 'saturate(.25)', duration: ctx.d('normal'), ease: TOKENS.e.move });
    tw.from(q('.gg-af'), t, { x: ctx.px(dx), y: ctx.px(dy), opacity: 0, scale: .96, duration: ctx.d('normal') * 1.1, ease: ctx.ei });
    tw.from(q('.gg-af li'), t + ctx.d('fast') * .7, { x: ctx.px(18), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }, ctx.st('normal'));
    if (A.value != null) tw.from(q('.gg-af .gg-panelVal'), t + ctx.d('fast') * .5, { scale: .7, opacity: 0, duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
    if (ctx.energy === 'E3') tw.fx('impact', t + ctx.d('fast') * .4);
    t += ctx.d('normal') * 1.1;
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, itemsText(A.items) + (A.label || '')) };
  }
};

/* --- 7. explodedDiagram — 겹친 층을 펼쳐 구조를 보여준다. --- */
PATTERNS.explodedDiagram = {
  label: '분해도',
  use: '스택 구조, 계층 아키텍처, 레이어드 구성. 겹쳐 있다가 위아래로 펼쳐진다.',
  fields: 'layers[](필수: {label,icon,note}) · title · kicker · reverse(아래부터 펼침)',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var ly = items(sc.layers || sc.items), n = ly.length;
    var hasHead = !!(sc.title || sc.kicker), topY = ctx.safe + (ctx.wide ? 26 : 92), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: ctx.wide ? 'left' : 'center' },
        { title: Math.round(ctx.fs.title * .7) });
      H.push(hd.html);
      t = hd.end;
    }
    var mid = hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy;
    var lw = Math.min(ctx.W - ctx.safe * 2, ctx.wide ? 900 : 780);
    var lh = 96, gap = Math.round(Math.min(46, (ctx.H * .5 - n * lh) / Math.max(1, n - 1) + 20));
    var spread = lh + gap;
    var y0 = mid - ((n - 1) * spread) / 2 - lh / 2;
    /* 아이소메트릭 착시 — 살짝 눌러 눕히고 x 를 계단식으로 민다. */
    ly.forEach(function (x, i) {
      var k = sc.reverse ? n - 1 - i : i;
      var offX = (i - (n - 1) / 2) * (ctx.wide ? 26 : 16);
      H.push('<div class="gg-layer" data-i="' + i + '" style="left:' + Math.round((ctx.W - lw) / 2 + offX) + 'px;top:' +
        Math.round(y0 + i * spread) + 'px;width:' + lw + 'px;height:' + lh + 'px;z-index:' + (n - i) + '">' +
        (x.icon ? ctx.icon(x.icon, 40) : '') +
        '<div class="gg-layerLb" style="font-size:' + Math.round(ctx.fs.body * .98) + 'px">' + esc(x.label) + '</div>' +
        (x.note ? '<div class="gg-layerNote">' + esc(x.note) + '</div>' : '') + '</div>');
    });
    /* 전부 중앙에 겹쳐 있다가 제자리로 펼쳐진다 */
    ly.forEach(function (x, i) {
      var target = y0 + i * spread, collapsed = mid - lh / 2;
      tw.fromTo(q('.gg-layer[data-i="' + i + '"]'), t,
        { y: collapsed - target, opacity: 0, scaleY: .6, scaleX: .94 },
        { y: 0, opacity: 1, scaleY: 1, scaleX: 1, duration: ctx.d('normal') * 1.15, ease: TOKENS.e.overshoot });
      t += ctx.st('loose') * .9;
    });
    t += ctx.d('normal') * 1.15 - ctx.st('loose') * .9;
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, itemsText(ly)) };
  }
};

/* --- 8. zoomDetail — 전체를 보여준 뒤 하나로 들어간다. 카메라가 설명한다. --- */
PATTERNS.zoomDetail = {
  label: '줌 디테일',
  use: '개요 -> 특정 항목 상세. 맥락을 잃지 않고 깊이 들어갈 때. 매치컷의 사촌.',
  fields: 'items[](필수) · focus(0부터, 필수) · detail{title,points[]} · title · kicker',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], FX = [], t = 0;
    var it = items(sc.items), n = it.length, fi = clamp(num(sc.focus, 0), 0, n - 1);
    var D = sc.detail || {};
    var hasHead = !!(sc.title || sc.kicker), topY = ctx.safe + (ctx.wide ? 24 : 86), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: 'center' },
        { title: Math.round(ctx.fs.title * .66) });
      /* 헤더는 카메라를 따라가면 안 된다 — 줌인하면 화면 밖으로 밀려난다 */
      FX.push(hd.html);
      t = hd.end;
    }
    var cols = colsFor(n, ctx.wide), gapX = 34, gapY = 32;
    var itemW = Math.floor((ctx.W - ctx.safe * 2 - (cols - 1) * gapX) / cols);
    var itemH = Math.round(Math.min(260, itemW * .7));
    /* 상세 패널이 아래에 붙으므로 본문을 위로 조금 올린다 */
    var blockCy = (hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy) - (ctx.wide ? 90 : 130);
    var g = gridOf(n, cols, ctx.W, itemW, itemH, gapX, gapY, blockCy);
    it.forEach(function (x, i) { H.push(card(x, g[i], ctx, { cls: 'gg-zc' + (i === fi ? ' gg-focus' : ''), idx: i })); });
    /* 상세 패널 — 줌이 끝난 뒤 초점 카드 옆에 붙는다 */
    var pts = items(D.points);
    var dw = Math.min(ctx.W - ctx.safe * 2, ctx.wide ? 860 : 800);
    /* 상세 패널도 카메라 밖 — 확대된 카드 위에 겹치지 않게 하단에 세운다 */
    FX.push('<div class="gg-detail" style="left:' + Math.round((ctx.W - dw) / 2) + 'px;bottom:' +
      Math.round(ctx.safe) + 'px;width:' + dw + 'px">' +
      (D.title ? '<div class="gg-detailT" style="font-size:' + Math.round(ctx.fs.sub * .92) + 'px">' + esc(D.title) + '</div>' : '') +
      (pts.length ? '<ul class="gg-detailL" style="font-size:' + Math.round(ctx.fs.body * .9) + 'px">' +
        pts.map(function (p) { return '<li>' + esc(p.label) + '</li>'; }).join('') + '</ul>' : '') + '</div>');

    enterItems(tw, ctx, it, '.gg-zc', t, ctx.st('normal'),
      { y: ctx.px(36), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei });
    t += ctx.d('fast') + ctx.st('normal') * (n - 1) + readSec(itemsText(it), ctx.energy) * .4;
    /* 카메라 — world 를 확대·이동해 초점 카드를 화면 중앙으로. 개별 카드를 움직이지 않는다. */
    var fg = g[fi], scale = ctx.wide ? 1.42 : 1.32;
    var camY = (hasHead ? topY + hd.h + 40 : ctx.safe) + (ctx.H - ctx.safe * 2 - (pts.length ? 300 : 0)) * .42;
    tw.cam(t, ctx.d('cine'), { scale: scale, x: r2((ctx.cx - fg.cx) * scale), y: r2((camY - fg.cy) * scale) }, TOKENS.e.move);
    tw.to(q('.gg-zc:not(.gg-focus)'), t, { opacity: .22, duration: ctx.d('normal'), ease: TOKENS.e.move });
    tw.to(q('.gg-focus'), t, { borderColor: 'var(--acc)', duration: ctx.d('normal'), ease: TOKENS.e.move });
    t += ctx.d('cine') * .78;
    if (pts.length || D.title) {
      tw.from(q('.gg-detail'), t, { y: ctx.px(30), opacity: 0, duration: ctx.d('normal'), ease: ctx.ei });
      tw.from(q('.gg-detail li'), t + ctx.d('fast') * .5, { x: ctx.px(20), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }, ctx.st('normal'));
      t += ctx.d('normal');
    }
    return { html: H.join(''), fixed: FX.join(''), tw: tw,
             dur: sceneDur(sc, ctx, t, (D.title || '') + itemsText(pts)) };
  }
};

/* --- 9. dataCounter — 숫자가 올라간다. 지표 씬의 기본. --- */
PATTERNS.dataCounter = {
  label: '데이터 카운터',
  use: '핵심 지표 1~4개. 숫자가 목표값까지 올라가며 크기로 중요도를 말한다.',
  fields: 'stats[](필수: {value,unit,prefix,label,icon,dec,note}) · title · kicker · sub',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var ss = items(sc.stats || sc.items), n = ss.length;
    var hasHead = !!(sc.title || sc.kicker), topY = ctx.safe + (ctx.wide ? 34 : 104), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: 'center' },
        { title: Math.round(ctx.fs.title * .68) });
      H.push(hd.html);
      t = hd.end;
    }
    var mid = hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy;
    var cols = ctx.wide ? Math.min(n, 4) : (n <= 2 ? n : 2);
    var gapX = ctx.wide ? 60 : 34;
    var itemW = Math.floor((ctx.W - ctx.safe * 2 - (cols - 1) * gapX) / cols);
    var numSize = Math.round(ctx.fs.num * (n === 1 ? 1.08 : n === 2 ? .86 : n === 3 ? .72 : .6) * (ctx.wide ? 1 : .88));
    var itemH = Math.round(numSize * 1.9);
    var g = gridOf(n, cols, ctx.W, itemW, itemH, gapX, 40, mid);
    ss.forEach(function (x, i) {
      var v = num(x.value, parseFloat(x.value) || 0), dec = num(x.dec, (String(x.value).split('.')[1] || '').length);
      H.push('<div class="gg-stat" data-i="' + i + '" style="left:' + Math.round(g[i].x) + 'px;top:' + Math.round(g[i].y) +
        'px;width:' + itemW + 'px">' +
        (x.icon ? ctx.icon(x.icon, Math.round(numSize * .42), 'gg-statIc') : '') +
        '<div class="gg-num" style="font-size:' + numSize + 'px">' +
        '<span class="gg-pre">' + esc(x.prefix || '') + '</span>' +
        '<span class="gg-val" data-to="' + v + '" data-dec="' + dec + '">0</span>' +
        '<span class="gg-unit" style="font-size:' + Math.round(numSize * .42) + 'px">' + esc(x.unit || '') + '</span></div>' +
        '<div class="gg-statLb" style="font-size:' + Math.round(ctx.fs.body * 1.06) + 'px">' + esc(x.label || '') + '</div>' +
        (x.note ? '<div class="gg-statNote">' + esc(x.note) + '</div>' : '') + '</div>');
    });
    var cdur = ctx.d('slow') * 1.25;
    ss.forEach(function (x, i) {
      var s = q('.gg-stat[data-i="' + i + '"]');
      tw.from(s, t, { y: ctx.px(30), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei });
      tw.count(s + ' .gg-val', t + ctx.d('micro'), cdur, 0, num(x.value, parseFloat(x.value) || 0),
        { dec: num(x.dec, (String(x.value).split('.')[1] || '').length) });
      tw.from(s + ' .gg-statLb', t + cdur * .55, { y: ctx.px(14), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei });
      t += ctx.st('loose') * 1.6;
    });
    t += cdur - ctx.st('loose') * 1.6;
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, itemsText(ss)) };
  }
};

/* --- 10. timeline — 축을 그리고 사건을 얹는다. --- */
PATTERNS.timeline = {
  label: '타임라인',
  use: '연혁, 로드맵, 사건 순서. 3~6개. 축이 그려지는 방향이 시간의 방향이다.',
  fields: 'events[](필수: {when,label,note,icon}) · title · kicker · vertical',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var ev = arr(sc.events || sc.items).map(function (x) { return typeof x === 'string' ? { label: x } : (x || {}); });
    var n = ev.length, vert = has(sc, 'vertical') ? !!sc.vertical : !ctx.wide;
    var hasHead = !!(sc.title || sc.kicker), topY = ctx.safe + (ctx.wide ? 26 : 92), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: ctx.wide ? 'left' : 'center' },
        { title: Math.round(ctx.fs.title * .7) });
      H.push(hd.html);
      t = hd.end;
    }
    var mid = hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy;
    var svg = ['<svg class="gg-svg" viewBox="0 0 ' + ctx.W + ' ' + ctx.H + '" aria-hidden="true">'];
    var pts = [];
    if (!vert) {
      var x0 = ctx.safe + 40, x1 = ctx.W - ctx.safe - 40;
      svg.push('<path class="gg-axis" d="M' + x0 + ' ' + mid + ' L' + x1 + ' ' + mid + '"/>');
      for (var i = 0; i < n; i++) {
        var px = x0 + (n === 1 ? (x1 - x0) / 2 : i * (x1 - x0) / (n - 1));
        pts.push({ x: px, y: mid, up: i % 2 === 0 });
        svg.push('<circle class="gg-dot" data-i="' + i + '" cx="' + r2(px) + '" cy="' + mid + '" r="11"/>');
      }
    } else {
      var y0 = mid - ctx.H * .28, y1 = mid + ctx.H * .28, ax = ctx.safe + 60;
      svg.push('<path class="gg-axis" d="M' + ax + ' ' + r2(y0) + ' L' + ax + ' ' + r2(y1) + '"/>');
      for (var j = 0; j < n; j++) {
        var py = y0 + (n === 1 ? (y1 - y0) / 2 : j * (y1 - y0) / (n - 1));
        pts.push({ x: ax, y: py, up: false });
        svg.push('<circle class="gg-dot" data-i="' + j + '" cx="' + ax + '" cy="' + r2(py) + '" r="11"/>');
      }
    }
    svg.push('</svg>');
    H.push(svg.join(''));
    var ew = vert ? ctx.W - ctx.safe * 2 - 120 : Math.min(300, (ctx.W - ctx.safe * 2) / n - 16);
    ev.forEach(function (x, i) {
      var p = pts[i];
      var ex = vert ? p.x + 60 : p.x - ew / 2;
      var ey = vert ? p.y - 56 : (p.up ? p.y - 190 : p.y + 46);
      H.push('<div class="gg-ev' + (p.up && !vert ? ' gg-evUp' : '') + '" data-i="' + i + '" style="left:' + Math.round(ex) +
        'px;top:' + Math.round(ey) + 'px;width:' + Math.round(ew) + 'px' + (vert ? '' : ';text-align:center') + '">' +
        (x.when ? '<div class="gg-evWhen">' + esc(x.when) + '</div>' : '') +
        '<div class="gg-evLb" style="font-size:' + Math.round(ctx.fs.body * .94) + 'px">' + esc(x.label) + '</div>' +
        (x.note ? '<div class="gg-evNote">' + esc(x.note) + '</div>' : '') + '</div>');
    });
    var adur = ctx.d('slow') * 1.1;
    tw.draw(q('.gg-axis'), t, adur, TOKENS.e.draw);
    var span = adur * .92;
    ev.forEach(function (x, i) {
      var at = t + (n === 1 ? span * .5 : span * i / (n - 1)) * .9;
      tw.from(q('.gg-dot[data-i="' + i + '"]'), at, { scale: 0, opacity: 0, duration: ctx.d('fast'), ease: TOKENS.e.overshoot });
      tw.from(q('.gg-ev[data-i="' + i + '"]'), at + ctx.d('micro'), { y: ctx.px(vert ? 0 : 16), x: ctx.px(vert ? 20 : 0), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei });
    });
    t += adur;
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, itemsText(ev)) };
  }
};

/* --- 11. splitCompare — 둘을 나란히 놓고 고르게 한다. --- */
PATTERNS.splitCompare = {
  label: '스플릿 비교',
  use: '두 선택지, 두 진영, 두 수치의 대비. 가운데 선이 갈라지며 양쪽이 들어온다.',
  fields: 'left{label,value,items[],icon,tone} · right{...} (둘 다 필수) · title · kicker',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var L = sc.left || {}, R = sc.right || {};
    var hasHead = !!(sc.title || sc.kicker), topY = ctx.safe + (ctx.wide ? 26 : 88), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: 'center' },
        { title: Math.round(ctx.fs.title * .68) });
      H.push(hd.html);
      t = hd.end;
    }
    var mid = hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy;
    var vert = !ctx.wide;
    var svg = '<svg class="gg-svg" viewBox="0 0 ' + ctx.W + ' ' + ctx.H + '" aria-hidden="true">' +
      (vert ? '<path class="gg-split" d="M' + ctx.safe + ' ' + mid + ' L' + (ctx.W - ctx.safe) + ' ' + mid + '"/>'
            : '<path class="gg-split" d="M' + ctx.cx + ' ' + r2(mid - ctx.H * .3) + ' L' + ctx.cx + ' ' + r2(mid + ctx.H * .3) + '"/>') +
      '</svg>';
    H.push(svg);
    var pw = vert ? ctx.W - ctx.safe * 2 : Math.floor((ctx.W - ctx.safe * 2 - 130) / 2);
    var ph = vert ? Math.round(Math.min(400, ctx.H * .24)) : Math.round(Math.min(560, (ctx.H - ctx.safe * 2) - (hasHead ? hd.h + 62 : 0)));
    var sides = vert
      ? [{ x: (ctx.W - pw) / 2, y: mid - ph - 46 }, { x: (ctx.W - pw) / 2, y: mid + 46 }]
      : [{ x: ctx.safe, y: mid - ph / 2 }, { x: ctx.W - ctx.safe - pw, y: mid - ph / 2 }];
    [['lt', L, sides[0]], ['rt', R, sides[1]]].forEach(function (p) {
      var side = p[0], o = p[1], g = p[2], it = items(o.items);
      H.push('<div class="gg-side gg-' + side + (o.tone ? ' gg-t-' + o.tone : '') + '" style="left:' + Math.round(g.x) +
        'px;top:' + Math.round(g.y) + 'px;width:' + pw + 'px;min-height:' + ph + 'px">' +
        (o.icon ? ctx.icon(o.icon, 58) : '') +
        '<div class="gg-sideLb" style="font-size:' + Math.round(ctx.fs.sub * .96) + 'px">' + esc(o.label || '') + '</div>' +
        (o.value != null ? '<div class="gg-sideVal" style="font-size:' + Math.round(ctx.fs.num * .46) + 'px">' + esc(o.value) + '</div>' : '') +
        (it.length ? '<ul class="gg-sideList" style="font-size:' + Math.round(ctx.fs.body * .9) + 'px">' +
          it.map(function (x) { return '<li>' + esc(x.label) + '</li>'; }).join('') + '</ul>' : '') + '</div>');
    });
    tw.draw(q('.gg-split'), t, ctx.d('normal'), TOKENS.e.move);
    t += ctx.d('normal') * .5;
    tw.from(q('.gg-lt'), t, { x: ctx.px(vert ? 0 : -70), y: ctx.px(vert ? -30 : 0), opacity: 0, duration: ctx.d('normal'), ease: ctx.ei });
    tw.from(q('.gg-rt'), t + ctx.st('loose'), { x: ctx.px(vert ? 0 : 70), y: ctx.px(vert ? 30 : 0), opacity: 0, duration: ctx.d('normal'), ease: ctx.ei });
    t += ctx.d('normal') + ctx.st('loose');
    if (L.say || R.say) {
      /* 좌우가 각각 제 대사에 붙는다 — 한쪽을 말하는 동안 다른 쪽은 아직 없다 */
      tw.from(q('.gg-lt li'), t - ctx.d('fast'), { x: ctx.px(16), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }, ctx.st('normal'));
      tw.from(q('.gg-rt li'), t + ctx.st('loose') - ctx.d('fast'), { x: ctx.px(16), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }, ctx.st('normal'));
      tw.from(q('.gg-lt .gg-sideVal'), t - ctx.d('fast') * .5, { scale: .72, opacity: 0, duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
      tw.from(q('.gg-rt .gg-sideVal'), t + ctx.st('loose') - ctx.d('fast') * .5, { scale: .72, opacity: 0, duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
    } else {
      tw.from(q('.gg-side li'), t - ctx.d('fast'), { x: ctx.px(16), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }, ctx.st('normal'));
      tw.from(q('.gg-sideVal'), t - ctx.d('fast') * .5, { scale: .72, opacity: 0, duration: ctx.d('normal'), ease: TOKENS.e.overshoot }, ctx.st('loose'));
    }
    t += ctx.d('fast');
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, itemsText(L.items) + itemsText(R.items)) };
  }
};

/* --- 12. convergence — 흩어진 것들이 하나로 모인다. 통합·SSoT 서사의 핵. --- */
PATTERNS.convergence = {
  label: '수렴',
  use: '분산 -> 통합, 여러 채널 -> 단일 창구, 재료 -> 결과. 모이는 동작 자체가 메시지다.',
  fields: 'sources[](필수) · target{label,icon}(필수) · title · kicker · sub',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var src = items(sc.sources || sc.items), n = src.length;
    var T = typeof sc.target === 'string' ? { label: sc.target } : (sc.target || {});
    var hasHead = !!(sc.title || sc.kicker), topY = ctx.safe + (ctx.wide ? 24 : 84), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: 'center' },
        { title: Math.round(ctx.fs.title * .66) });
      H.push(hd.html);
      t = hd.end;
    }
    var cy = hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy;
    var rx = ctx.wide ? Math.min(500, (ctx.W - ctx.safe * 2) * .34) : (ctx.W - ctx.safe * 2) * .38;
    var ry = ctx.wide ? Math.min(330, (ctx.H - ctx.safe * 2) * .3) : rx * 1.2;
    var pos = ringOf(n, ctx.cx, cy, rx, ry, -90);
    var chipW = ctx.wide ? 212 : 184, chipH = 100;
    var svg = ['<svg class="gg-svg" viewBox="0 0 ' + ctx.W + ' ' + ctx.H + '" aria-hidden="true">'];
    pos.forEach(function (p, i) {
      svg.push('<path class="gg-flow" data-i="' + i + '" d="' + curve(p.x, p.y, ctx.cx, cy, .1) + '"/>');
    });
    svg.push('</svg>');
    H.push(svg.join(''));
    src.forEach(function (x, i) {
      var p = pos[i];
      H.push('<div class="gg-chip" data-i="' + i + '" style="left:' + Math.round(p.x - chipW / 2) + 'px;top:' +
        Math.round(p.y - chipH / 2) + 'px;width:' + chipW + 'px">' +
        (x.icon ? ctx.icon(x.icon, 36) : '') +
        '<div class="gg-chipLb" style="font-size:' + Math.round(ctx.fs.small * .98) + 'px">' + esc(x.label) + '</div></div>');
    });
    var tw2 = ctx.wide ? 400 : 320, th2 = 172;
    H.push('<div class="gg-target" style="left:' + Math.round(ctx.cx - tw2 / 2) + 'px;top:' + Math.round(cy - th2 / 2) +
      'px;width:' + tw2 + 'px;min-height:' + th2 + 'px">' +
      (T.icon ? ctx.icon(T.icon, 56) : '') +
      '<div class="gg-targetLb" style="font-size:' + Math.round(ctx.fs.sub * .88) + 'px">' + esc(T.label || '') + '</div>' +
      (T.note ? '<div class="gg-targetNote">' + esc(T.note) + '</div>' : '') + '</div>');

    /* 1) 흩어진 상태로 등장 — 무질서가 먼저 읽혀야 모이는 게 의미를 갖는다 */
    tw.set(q('.gg-target'), 0, { opacity: 0, scale: .5 });
    tw.from(q('.gg-chip'), t, { scale: .8, opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }, ctx.st('normal'));
    t += ctx.d('fast') + ctx.st('normal') * (n - 1) + readSec(itemsText(src), ctx.energy) * .34;
    /* 2) 경로가 그려진다 — 어디로 갈지 예고 */
    tw.draw(q('.gg-flow'), t, ctx.d('normal'), TOKENS.e.draw, ctx.st('tight'));
    t += ctx.d('normal') * .8;
    /* 검수 프레임 — 흩어진 칩과 경로가 다 보이는 이 순간이 이 씬의 요점이다.
       모이고 나면 화면에 target 하나만 남아 스크린샷으로는 아무것도 확인할 수 없다. */
    var shotAt = t;
    /* 3) 빨려 들어간다 — 화면에 그려진 그 경로를 따라간다. 직선으로 가면 경로가 장식이 된다. */
    src.forEach(function (x, i) {
      var p = pos[i], sel = q('.gg-chip[data-i="' + i + '"]');
      tw.path(sel, t + i * ctx.st('tight'), ctx.d('slow') * .85,
        relCurve(p.x, p.y, ctx.cx, cy, .1), { ease: 'power2.in' });
      tw.to(sel, t + i * ctx.st('tight'), { scale: .4, opacity: 0, duration: ctx.d('slow') * .85, ease: 'power2.in' });
    });
    tw.to(q('.gg-flow'), t + ctx.d('fast') * .6, { opacity: 0, duration: ctx.d('normal'), ease: TOKENS.e.exit });
    t += ctx.d('slow') * .8;
    /* 4) 하나가 남는다 */
    tw.to(q('.gg-target'), t, { opacity: 1, scale: 1, duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
    tw.fx('impact', t + ctx.d('micro'));
    if (T.icon) tw.draw(q('.gg-target path'), t, ctx.d('normal'), TOKENS.e.draw);
    t += ctx.d('normal');
    return { html: H.join(''), tw: tw, shot: r2(shotAt),
             dur: sceneDur(sc, ctx, t, T.label || '', { add: .5 }) };
  }
};

/* --- 13. divergence — 하나에서 여럿으로. 확장·파생 서사. --- */
PATTERNS.divergence = {
  label: '발산',
  use: '하나의 원천 -> 여러 결과, 플랫폼 -> 채널, 원칙 -> 실천. 수렴의 반대.',
  fields: 'source{label,icon}(필수) · targets[](필수) · title · kicker',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var S = typeof sc.source === 'string' ? { label: sc.source } : (sc.source || {});
    var tg = items(sc.targets || sc.items), n = tg.length;
    var hasHead = !!(sc.title || sc.kicker), topY = ctx.safe + (ctx.wide ? 24 : 84), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: 'center' },
        { title: Math.round(ctx.fs.title * .66) });
      H.push(hd.html);
      t = hd.end;
    }
    var cy = hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy;
    var rx = ctx.wide ? Math.min(500, (ctx.W - ctx.safe * 2) * .34) : (ctx.W - ctx.safe * 2) * .38;
    var ry = ctx.wide ? Math.min(330, (ctx.H - ctx.safe * 2) * .3) : rx * 1.2;
    var pos = ringOf(n, ctx.cx, cy, rx, ry, -90);
    var chipW = ctx.wide ? 196 : 176, chipH = 96;
    var svg = ['<svg class="gg-svg" viewBox="0 0 ' + ctx.W + ' ' + ctx.H + '" aria-hidden="true">'];
    pos.forEach(function (p, i) { svg.push('<path class="gg-flow" data-i="' + i + '" d="' + curve(ctx.cx, cy, p.x, p.y, .1) + '"/>'); });
    svg.push('</svg>');
    H.push(svg.join(''));
    var sw = ctx.wide ? 400 : 320, sh = 172;
    H.push('<div class="gg-target gg-source" style="left:' + Math.round(ctx.cx - sw / 2) + 'px;top:' + Math.round(cy - sh / 2) +
      'px;width:' + sw + 'px;min-height:' + sh + 'px">' + (S.icon ? ctx.icon(S.icon, 56) : '') +
      '<div class="gg-targetLb" style="font-size:' + Math.round(ctx.fs.sub * .88) + 'px">' + esc(S.label || '') + '</div></div>');
    tg.forEach(function (x, i) {
      var p = pos[i];
      H.push('<div class="gg-chip" data-i="' + i + '" style="left:' + Math.round(p.x - chipW / 2) + 'px;top:' +
        Math.round(p.y - chipH / 2) + 'px;width:' + chipW + 'px">' + (x.icon ? ctx.icon(x.icon, 36) : '') +
        '<div class="gg-chipLb" style="font-size:' + Math.round(ctx.fs.small * .98) + 'px">' + esc(x.label) + '</div></div>');
    });
    tw.from(q('.gg-source'), t, { scale: .7, opacity: 0, duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
    t += ctx.d('normal') * .8 + readSec(S.label || '', ctx.energy) * .35;
    tw.draw(q('.gg-flow'), t, ctx.d('normal'), TOKENS.e.draw, ctx.st('tight'));
    t += ctx.d('normal') * .55;
    tg.forEach(function (x, i) {
      var p = pos[i], sel = q('.gg-chip[data-i="' + i + '"]');
      /* 중심에서 시작해 곡선을 따라 제자리로 */
      tw.set(sel, 0, { x: r2(ctx.cx - p.x), y: r2(cy - p.y), scale: .45, opacity: 0 });
      tw.path(sel, t + i * ctx.st('normal'), ctx.d('normal') * 1.2,
        relCurve(ctx.cx, cy, p.x, p.y, .1), { ease: ctx.ei });
      tw.to(sel, t + i * ctx.st('normal'), { scale: 1, opacity: 1, duration: ctx.d('normal') * 1.15, ease: ctx.ei });
    });
    t += ctx.d('normal') * 1.15 + ctx.st('normal') * (n - 1);
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, itemsText(tg)) };
  }
};

/* --- 14. orbit — 중심을 둘러싼 것들이 돈다. 생태계·주변 관계. --- */
PATTERNS.orbit = {
  label: '오빗',
  use: '중심과 위성, 생태계, 서비스를 둘러싼 요소. 회전은 루프로 남겨 앰비언트로 쓴다.',
  fields: 'center{label,icon}(필수) · orbits[](필수: {label,icon,ring}) · title · spin(초, 기본 26)',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var C = typeof sc.center === 'string' ? { label: sc.center } : (sc.center || {});
    var ob = items(sc.orbits || sc.items);
    var hasHead = !!(sc.title || sc.kicker), topY = ctx.safe + (ctx.wide ? 22 : 78), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: 'center' },
        { title: Math.round(ctx.fs.title * .72) });
      H.push(hd.html);
      t = hd.end;
    }
    var cy = hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy;
    var rings = {};
    ob.forEach(function (x, i) { var r = num(x.ring, 1); (rings[r] = rings[r] || []).push({ x: x, i: i }); });
    var rkeys = Object.keys(rings).sort();
    /* 궤도가 작으면 중심 박스에 위성이 겹친다 — 중심 반경보다 확실히 크게 잡는다 */
    var baseR = ctx.wide ? Math.min(330, (ctx.H - ctx.safe * 2) * .3) : (ctx.W - ctx.safe * 2) * .42;
    var svg = ['<svg class="gg-svg" viewBox="0 0 ' + ctx.W + ' ' + ctx.H + '" aria-hidden="true">'];
    rkeys.forEach(function (k, ri) {
      var rr = baseR * (1 + ri * .58);
      svg.push('<ellipse class="gg-ring" data-r="' + ri + '" cx="' + ctx.cx + '" cy="' + cy + '" rx="' + r2(rr * (ctx.wide ? 1.42 : 1.0)) + '" ry="' + r2(rr * (ctx.wide ? 1 : 1.34)) + '"/>');
    });
    svg.push('</svg>');
    H.push(svg.join(''));
    var cw = ctx.wide ? 300 : 270, ch = ctx.wide ? 150 : 144;
    H.push('<div class="gg-center" style="left:' + Math.round(ctx.cx - cw / 2) + 'px;top:' + Math.round(cy - ch / 2) +
      'px;width:' + cw + 'px;min-height:' + ch + 'px">' + (C.icon ? ctx.icon(C.icon, 58) : '') +
      '<div class="gg-centerLb" style="font-size:' + Math.round(ctx.fs.sub * .9) + 'px">' + esc(C.label || '') + '</div></div>');
    /* 위성은 회전 컨테이너(gg-orbit)에 넣고, 라벨은 역회전시켜 글자가 눕지 않게 한다. */
    var spin = num(sc.spin, 26) * (ctx.energy === 'E3' ? .62 : ctx.energy === 'E1' ? 1.5 : 1);
    rkeys.forEach(function (k, ri) {
      var list = rings[k], rr = baseR * (1 + ri * .58);
      var p = ringOf(list.length, ctx.cx, cy, rr * (ctx.wide ? 1.42 : 1.0), rr * (ctx.wide ? 1 : 1.34), -90 + ri * 30);
      H.push('<div class="gg-orbit" data-r="' + ri + '" data-spin="' + r2(spin * (1 + ri * .45)) + '" style="left:0;top:0;width:' +
        ctx.W + 'px;height:' + ctx.H + 'px;transform-origin:' + ctx.cx + 'px ' + cy + 'px">' +
        list.map(function (o, j) {
          var pp = p[j], sat = ctx.wide ? 168 : 186;
          return '<div class="gg-sat" data-i="' + o.i + '" style="left:' + Math.round(pp.x - sat / 2) + 'px;top:' +
            Math.round(pp.y - 58) + 'px;width:' + sat + 'px">' +
            '<div class="gg-satIn" data-spin="' + r2(spin * (1 + ri * .45)) + '">' +
            (o.x.icon ? ctx.icon(o.x.icon, ctx.wide ? 38 : 42) : '') +
            '<div class="gg-satLb" style="font-size:' + Math.round(ctx.fs.small * (ctx.wide ? .96 : 1.1)) + 'px">' +
            esc(o.x.label) + '</div></div></div>';
        }).join('') + '</div>');
    });
    tw.from(q('.gg-center'), t, { scale: .72, opacity: 0, duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
    t += ctx.d('normal') * .7;
    tw.draw(q('.gg-ring'), t, ctx.d('slow'), TOKENS.e.draw, ctx.st('loose'));
    tw.from(q('.gg-sat'), t + ctx.d('fast') * .5, { scale: .6, opacity: 0, duration: ctx.d('fast'), ease: TOKENS.e.overshoot }, ctx.st('normal'));
    t += ctx.d('slow') * .8 + ctx.st('normal') * ob.length;
    tw.fx('spin', 0);   /* 궤도 회전은 마스터와 분리된 무한 루프로 돈다 */
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, itemsText(ob)) };
  }
};

/* --- 15. matchCut — 앵커 하나를 남기고 나머지를 갈아치운다. 연결의 최고 수단. --- */
PATTERNS.matchCut = {
  label: '매치 컷',
  use: '두 개념을 한 형태로 잇는다. 앵커(아이콘·큰 글자)는 유지되고 주변 텍스트만 바뀐다.',
  fields: 'anchor{icon|text}(필수) · from{title,sub} · to{title,sub}(필수) · morph(앵커 회전·스케일)',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var A = typeof sc.anchor === 'string' ? { icon: ICO.iconPath(sc.anchor) ? sc.anchor : null, text: ICO.iconPath(sc.anchor) ? null : sc.anchor } : (sc.anchor || {});
    var F = sc.from || {}, O = sc.to || {};
    /* anchorTo 를 주면 앵커가 그 도형으로 모프한다 — 회전·확대보다 훨씬 강한 연결 */
    var morphTo = sc.anchorTo && ICO.iconPath(sc.anchorTo) ? ICO.iconPath(sc.anchorTo) : null;
    var w = Math.min(ctx.W - ctx.safe * 2, ctx.wide ? 1200 : 900), x = (ctx.W - w) / 2;
    var asz = ctx.wide ? 200 : 170;
    var ay = ctx.cy - (ctx.wide ? 40 : 90);
    H.push('<div class="gg-anchor" style="left:' + Math.round(ctx.cx - asz / 2) + 'px;top:' + Math.round(ay - asz / 2) +
      'px;width:' + asz + 'px;height:' + asz + 'px">' +
      (A.icon ? ctx.icon(A.icon, asz, 'gg-drawIc') : '<span class="gg-anchorT" style="font-size:' + Math.round(asz * .62) + 'px">' + esc(A.text || '') + '</span>') +
      '</div>');
    var roll = sc.textFx === 'roll';
    function block(cls, o) {
      return '<div class="gg-mc ' + cls + ' gg-c" style="left:' + x + 'px;top:' + Math.round(ay + asz * .72) + 'px;width:' + w + 'px">' +
        (o.title ? '<div class="gg-mcT" style="font-size:' + Math.round(ctx.fs.title * .8) + 'px">' + esc(o.title) + '</div>' : '') +
        (o.sub ? '<div class="gg-mcS" style="font-size:' + Math.round(ctx.fs.sub * .9) + 'px">' + esc(o.sub) + '</div>' : '') + '</div>';
    }
    if (roll) {
      /* 롤 — 두 문장을 세로로 붙여 놓고 마스크 안에서 밀어 올린다. 교체가 물리적으로 읽힌다. */
      var ts = Math.round(ctx.fs.title * .8), ss = Math.round(ctx.fs.sub * .9);
      H.push('<div class="gg-mc gg-mcRoll gg-c" style="left:' + x + 'px;top:' + Math.round(ay + asz * .72) +
        'px;width:' + w + 'px">' +
        '<div class="gg-roll" style="height:' + Math.round(ts * 1.52) + 'px"><div class="gg-rollIn">' +
        '<div class="gg-mcT" style="font-size:' + ts + 'px">' + esc(F.title || '') + '</div>' +
        '<div class="gg-mcT" style="font-size:' + ts + 'px">' + esc(O.title || '') + '</div></div></div>' +
        ((F.sub || O.sub) ? '<div class="gg-roll gg-rollSub" style="height:' + Math.round(ss * 2.4) + 'px">' +
          '<div class="gg-rollIn">' +
          '<div class="gg-mcS" style="font-size:' + ss + 'px">' + esc(F.sub || '') + '</div>' +
          '<div class="gg-mcS" style="font-size:' + ss + 'px">' + esc(O.sub || '') + '</div></div></div>' : '') +
        '</div>');
    } else {
      H.push(block('gg-mcFrom', F));
      H.push(block('gg-mcTo', O));
    }
    if (!roll) tw.set(q('.gg-mcTo'), 0, { opacity: 0 });
    if (A.icon) tw.draw(q('.gg-anchor path'), t, ctx.d('slow'), TOKENS.e.draw);
    tw.from(q('.gg-anchor'), t, { scale: .78, opacity: 0, duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
    t += ctx.d('slow') * .62;
    tw.from(roll ? q('.gg-mcRoll') : q('.gg-mcFrom'), t, { y: ctx.px(26), opacity: 0, duration: ctx.d('normal'), ease: ctx.ei });
    t += ctx.d('normal') + readSec((F.title || '') + (F.sub || ''), ctx.energy) * .85;
    /* 컷 — 앵커는 화면에 남고 텍스트가 교체된다. 이게 연결감의 정체. */
    if (morphTo && A.icon) {
      /* 도형 자체가 변형된다. 회전은 절제한다 — 모프가 이미 눈을 끌기 때문. */
      tw.morphTo(q('.gg-anchor path'), morphTo, t, ctx.d('slow') * 1.15, TOKENS.e.move);
      if (sc.morph !== false) tw.to(q('.gg-anchor'), t, { scale: 1.1, duration: ctx.d('slow'), ease: TOKENS.e.move });
    } else {
      var mv = sc.morph === false ? {} : { rotate: ctx.wide ? 180 : 90, scale: 1.16 };
      mv.duration = ctx.d('slow'); mv.ease = TOKENS.e.move;
      tw.to(q('.gg-anchor'), t, mv);
    }
    if (roll) {
      tw.roll(q('.gg-roll'), t, ctx.d('slow') * .95, 'power3.inOut');
    } else {
      tw.to(q('.gg-mcFrom'), t, { y: ctx.px(-24), opacity: 0, duration: ctx.d('fast'), ease: TOKENS.e.exit });
      tw.fromTo(q('.gg-mcTo'), t + ctx.d('fast') * .8, { y: ctx.px(28), opacity: 0 },
        { y: 0, opacity: 1, duration: ctx.d('normal'), ease: ctx.ei });
    }
    if (ctx.energy === 'E3') tw.fx('impact', t + ctx.d('fast') * .7);
    t += ctx.d('slow');
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, (O.title || '') + (O.sub || '')) };
  }
};

/* --- 16. cameraJourney — 넓은 캔버스를 카메라가 순회한다. --- */
PATTERNS.cameraJourney = {
  label: '카메라 여정',
  use: '한 판 위의 여러 지점을 훑는다. 지도·전경·큰 그림의 부분들. 3~5 정류장.',
  fields: 'stops[](필수: {label,note,icon}) · title · kicker · zoom(기본 1.9)',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var st = items(sc.stops || sc.items), n = st.length;
    var zoom = num(sc.zoom, ctx.wide ? 1.9 : 1.7);
    /* 캔버스를 화면보다 넓게 쓴다 — 카메라가 움직일 여지가 곧 공간감이다 */
    var spanX = ctx.W * .82, spanY = ctx.H * .58;
    var pts = [];
    for (var i = 0; i < n; i++) {
      var fr = n === 1 ? .5 : i / (n - 1);
      pts.push({ x: ctx.cx + (fr - .5) * spanX, y: ctx.cy + Math.sin(fr * Math.PI * 1.35) * spanY * .42 });
    }
    var svg = ['<svg class="gg-svg" viewBox="0 0 ' + ctx.W + ' ' + ctx.H + '" aria-hidden="true">'];
    var d = 'M' + r2(pts[0].x) + ' ' + r2(pts[0].y);
    for (var j = 1; j < n; j++) d += ' ' + curve(pts[j - 1].x, pts[j - 1].y, pts[j].x, pts[j].y, .1).replace(/^M[^Q]*/, '');
    svg.push('<path class="gg-route" d="' + d + '"/>');
    svg.push('</svg>');
    H.push(svg.join(''));
    var sw = 300, sh = 150;
    st.forEach(function (x, i) {
      var p = pts[i];
      H.push('<div class="gg-stop" data-i="' + i + '" style="left:' + Math.round(p.x - sw / 2) + 'px;top:' +
        Math.round(p.y - sh / 2) + 'px;width:' + sw + 'px;min-height:' + sh + 'px">' +
        '<div class="gg-stopNo">' + pad(i + 1, 2) + '</div>' + (x.icon ? ctx.icon(x.icon, 42) : '') +
        '<div class="gg-stopLb" style="font-size:' + Math.round(ctx.fs.body * .94) + 'px">' + esc(x.label) + '</div>' +
        (x.note ? '<div class="gg-stopNote">' + esc(x.note) + '</div>' : '') + '</div>');
    });
    var FX = [];
    if (sc.title || sc.kicker) {
      /* 헤더는 카메라를 따라 움직이면 안 된다 — fixed 로 빼서 world 밖에 세운다 */
      var hd = head(sc, ctx, tw, t, { x: ctx.safe, y: ctx.safe + (ctx.wide ? 20 : 76), w: ctx.W - ctx.safe * 2, align: 'center' },
        { title: Math.round(ctx.fs.title * .6) });
      FX.push(hd.html);
      t = hd.end;
    }
    /* 전경 -> 첫 정류장으로 들어가고, 하나씩 옮겨 간다 */
    tw.set(q('.gg-stop'), 0, { opacity: .25 });
    tw.draw(q('.gg-route'), t, ctx.d('cine'), TOKENS.e.draw);
    tw.cam(t, ctx.d('slow'), { scale: .92, x: 0, y: 0 }, TOKENS.e.move);
    t += ctx.d('cine') * .7;
    st.forEach(function (x, i) {
      var p = pts[i];
      tw.cam(t, ctx.d('cine'), { scale: zoom, x: r2((ctx.cx - p.x) * zoom), y: r2((ctx.cy - p.y) * zoom) }, TOKENS.e.move);
      tw.to(q('.gg-stop[data-i="' + i + '"]'), t + ctx.d('fast'), { opacity: 1, duration: ctx.d('normal'), ease: ctx.ei });
      if (i > 0) tw.to(q('.gg-stop[data-i="' + (i - 1) + '"]'), t + ctx.d('fast'), { opacity: .3, duration: ctx.d('normal'), ease: ctx.ei });
      t += ctx.d('cine') * .78 + readSec(x.label + (x.note || ''), ctx.energy) * .62;
    });
    /* 마지막에 전경으로 물러난다 — 부분을 본 뒤 전체를 다시 보여주는 게 이 패턴의 값이다 */
    tw.cam(t, ctx.d('cine'), { scale: .92, x: 0, y: 0 }, TOKENS.e.move);
    tw.to(q('.gg-stop'), t, { opacity: 1, duration: ctx.d('normal'), ease: ctx.ei });
    t += ctx.d('cine');
    return { html: H.join(''), fixed: FX.join(''), tw: tw, dur: sceneDur(sc, ctx, t, ctx.d('slow')) };
  }
};

/* --- 20. marquee — 항목이 끝없이 흐른다. --- */
PATTERNS.marquee = {
  label: '마퀴 — 흐르는 벨트',
  use: '로고·키워드·목록이 끝없이 지나간다. 개수가 많아 하나하나 볼 필요 없을 때, 또는 "계속 이어진다"가 메시지일 때.',
  fields: 'items[](필수) · rows(기본 1, 줄마다 방향이 반대) · speed(초, 기본 24) · title · kicker · sub',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var it = items(sc.items), rows = clamp(num(sc.rows, 1), 1, 4);
    var speed = num(sc.speed, 24);
    var hasHead = !!(sc.title || sc.kicker);
    var topY = ctx.safe + (ctx.wide ? 30 : 96), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: 'center' },
        { title: Math.round(ctx.fs.title * .7) });
      H.push(hd.html);
      t = hd.end;
    }
    var mid = hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy;
    var lh = Math.round(Math.min(150, (ctx.H * .5) / rows));
    var totalH = rows * lh + (rows - 1) * 22;
    var y0 = mid - totalH / 2;
    /* 줄마다 항목을 나눠 담고, 같은 목록을 두 번 이어 붙여 이음새를 없앤다 */
    for (var r = 0; r < rows; r++) {
      var mine = it.filter(function (_, i) { return i % rows === r; });
      if (!mine.length) mine = it;
      var cell = function (x) {
        return '<span class="gg-mqI">' + (x.icon ? ctx.icon(x.icon, 44) : '') +
          '<b style="font-size:' + Math.round(ctx.fs.body * 1.06) + 'px">' + esc(x.label) + '</b>' +
          (x.note ? '<em>' + esc(x.note) + '</em>' : '') + '</span>';
      };
      var seq = mine.map(cell).join('') + mine.map(cell).join('');
      H.push('<div class="gg-mqRow" data-r="' + r + '" style="top:' + Math.round(y0 + r * (lh + 22)) +
        'px;height:' + lh + 'px">' +
        '<div class="gg-mqTrack" style="animation-duration:' + r2(speed * (1 + r * .22)) + 's;animation-direction:' +
        (r % 2 ? 'reverse' : 'normal') + '">' + seq + '</div></div>');
    }
    tw.from(q('.gg-mqRow'), t, { opacity: 0, y: ctx.px(26), duration: ctx.d('normal'), ease: ctx.ei }, ctx.st('loose'));
    t += ctx.d('normal') + ctx.st('loose') * (rows - 1);
    return { html: H.join(''), tw: tw,
             dur: sceneDur(sc, ctx, t, itemsText(it), { scale: .5, min: 2.4 }) };
  }
};

/* --- 19. chart — 데이터를 그린다. 그려지는 과정이 곧 설명이다. --- */
PATTERNS.chart = {
  label: '차트',
  use: '수치를 형태로 보여준다. 어떤 차트를 쓸지는 데이터의 일이 정한다 — references/charts.md.',
  fields: 'chart(17종, 필수) · data{items[]|categories[]+series[]}(필수) · options{} · title · kicker · sub · caption',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var cname = CH.CHARTS[sc.chart] ? sc.chart : 'bar';
    var D = CH.normData(sc.data || sc);
    var o = sc.options || {};
    var hasHead = !!(sc.title || sc.kicker);
    var topY = ctx.safe + (ctx.wide ? 26 : 88), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: ctx.wide ? 'left' : 'center' },
        { title: Math.round(ctx.fs.title * .68) });
      H.push(hd.html);
      t = hd.end;
    }
    var top = hasHead ? topY + hd.h + (ctx.wide ? 44 : 38) : ctx.safe;
    var cw = ctx.W - ctx.safe * 2;
    var chh = (ctx.H - ctx.safe) - top - (sc.caption ? 66 : 0);
    /* 마크 스펙은 800px 폭 기준이라 스테이지 크기에 맞춰 배율을 준다 */
    var u = cw / 800;
    var built = CH.CHARTS[cname].build(D, o, ctx.T, cw, chh, u, o.icon ? ICO.iconPath(o.icon) : null, sc.data || sc);
    var legend = built.legend;
    if (legend && legend.length) chh -= 46;
    if (legend && legend.length) {
      built = CH.CHARTS[cname].build(D, o, ctx.T, cw, chh, u, o.icon ? ICO.iconPath(o.icon) : null, sc.data || sc);
    }
    H.push('<div class="gg-chart" style="left:' + ctx.safe + 'px;top:' + Math.round(top) + 'px;width:' + Math.round(cw) +
      'px;height:' + Math.round(chh) + 'px">' +
      '<svg class="gg-cSvg" viewBox="0 0 ' + Math.round(cw) + ' ' + Math.round(chh) + '">' + built.svg + '</svg></div>');
    if (legend && legend.length) H.push(legendHTML(legend, ctx, ctx.safe, top + chh + 14, cw));
    if (sc.caption) {
      H.push('<div class="gg-caption gg-c" style="left:' + ctx.safe + 'px;top:' + Math.round(ctx.H - ctx.safe - 40) +
        'px;width:' + Math.round(cw) + 'px;font-size:' + Math.round(ctx.fs.body * .9) + 'px">' + esc(sc.caption) + '</div>');
    }
    /* 축과 격자가 먼저 서고, 데이터가 그 위에 올라온다 */
    tw.from(q('.gg-cAxis,.gg-cGrid'), t, { opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }, ctx.st('tight'));
    tw.from(q('.gg-cTick'), t + ctx.d('micro'), { opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }, .02);
    t += ctx.d('fast') * .8;
    var dItems = (sc.data && arr(sc.data.items)) || [];
    t = chartAnim(tw, ctx, t, built.anim, ctx.E.dm, hasSay(dItems) ? dItems.length : 0);
    if (legend && legend.length) { tw.from(q('.gg-lgI'), t - ctx.d('fast'), { y: ctx.px(10), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }, ctx.st('normal')); }
    if (sc.caption) { tw.from(q('.gg-caption'), t, { y: ctx.px(12), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }); t += ctx.d('fast'); }
    var txt = D.cats.join('') + (sc.title || '') + (sc.caption || '');
    /* 검수 프레임을 직접 넘긴다 — IR 만 훑는 자동 계산은 스태거를 3배로만 잡아서
       100칸 아이소타입처럼 요소가 많은 차트는 등장 도중 프레임이 잡힌다 */
    return { html: H.join(''), tw: tw, shot: r2(t),
             dur: sceneDur(sc, ctx, t, txt, { add: .6 }) };
  }
};

/* --- 18. deviceShow — 디바이스 프레임 안에 화면을 보여준다. --- */
PATTERNS.deviceShow = {
  label: '디바이스 쇼케이스',
  use: '제품 화면, UI 소개, 로그·코드, 앱 흐름. 프레임이 "이건 실제 화면이다"를 말해 준다.',
  fields: 'frame(browser|window|terminal|phone|tablet|laptop|card|chat) · screen{lines[]|items[]|art|title} · title · kicker · sub · caption',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var fname = VEC.FRAME[sc.frame] ? sc.frame : 'browser';
    var F = VEC.FRAME[fname];
    var SC = sc.screen || {};
    var vertFrame = F.ratio < 1;
    var hasHead = !!(sc.title || sc.kicker);
    var topY = ctx.safe + (ctx.wide ? 26 : 88), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: 'center' },
        { title: Math.round(ctx.fs.title * .66) });
      H.push(hd.html);
      t = hd.end;
    }
    /* 프레임 크기 — 남은 세로에 맞추고 비율은 프레임이 정한다 */
    var availTop = hasHead ? topY + hd.h + 48 : ctx.safe;
    var availH = (ctx.H - ctx.safe) - availTop - (sc.caption ? 74 : 0);
    var availW = ctx.W - ctx.safe * 2;
    var fh = Math.min(availH, vertFrame ? availH : availW / F.ratio);
    var fw = fh * F.ratio;
    if (fw > availW) { fw = availW; fh = fw / F.ratio; }
    fw = Math.round(fw); fh = Math.round(fh);
    var fx = Math.round((ctx.W - fw) / 2);
    var fy = Math.round(availTop + (availH - fh) / 2);
    var built = F.build(ctx.T, fw, fh), inner = built.inner;

    var body = '';
    var sLines = arr(SC.lines).map(String);
    var sItems = items(SC.items);
    if (SC.title) body += '<div class="gg-scT" style="font-size:' + Math.round(ctx.fs.sub * .82) + 'px">' + esc(SC.title) + '</div>';
    if (SC.art && VEC.ART[SC.art]) {
      body += '<div class="gg-scArt">' + ctx.art(SC.art, Math.round(Math.min(inner.w, inner.h) * .66)) + '</div>';
    }
    if (sLines.length) {
      body += '<div class="gg-scLines" style="font-size:' + Math.round(ctx.fs.body * (fname === 'terminal' ? .78 : .9)) +
        'px">' + sLines.map(function (l, i) {
          var cmd = /^\s*[$>]\s?/.test(l);
          var body = cmd ? l.replace(/^\s*[$>]\s?/, '') : l;
          return '<div class="gg-scL' + (cmd ? ' gg-scCmd' : '') + '" data-i="' + i + '">' +
            (cmd ? '<span class="gg-scP">$</span> ' : '') + esc(body) + '</div>';
        }).join('') + '</div>';
    }
    if (sItems.length) {
      body += '<div class="gg-scItems">' + sItems.map(function (x, i) {
        return '<div class="gg-scI" data-i="' + i + '">' + (x.icon ? ctx.icon(x.icon, 30) : '') +
          '<span>' + esc(x.label) + '</span>' + (x.value != null ? '<b>' + esc(x.value) + '</b>' : '') + '</div>';
      }).join('') + '</div>';
    }
    H.push('<div class="gg-device' + (fname === 'terminal' ? ' gg-devTerm' : '') + '" style="left:' + fx + 'px;top:' + fy +
      'px;width:' + fw + 'px;height:' + fh + 'px">' + built.svg +
      '<div class="gg-screen" style="left:' + Math.round(inner.x) + 'px;top:' + Math.round(inner.y) +
      'px;width:' + Math.round(inner.w) + 'px;height:' + Math.round(inner.h) + 'px">' + body + '</div></div>');
    if (sc.caption) {
      H.push('<div class="gg-caption gg-c" style="left:' + ctx.safe + 'px;top:' + (fy + fh + 26) +
        'px;width:' + availW + 'px;font-size:' + Math.round(ctx.fs.body * .92) + 'px">' + esc(sc.caption) + '</div>');
    }
    tw.from(q('.gg-device'), t, { y: ctx.px(34), opacity: 0, scale: .96, duration: ctx.d('slow'), ease: ctx.ei });
    t += ctx.d('slow') * .6;
    if (SC.title) { tw.from(q('.gg-scT'), t, { y: ctx.px(12), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }); t += ctx.d('fast') * .5; }
    if (SC.art) { tw.from(q('.gg-scArt .gg-artP'), t, { scale: .8, opacity: 0, transformOrigin: '50% 50%', duration: ctx.d('fast'), ease: TOKENS.e.overshoot }, ctx.st('normal')); t += ctx.d('fast'); }
    if (sLines.length) {
      tw.from(q('.gg-scL'), t, { x: ctx.px(-16), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }, ctx.st('normal'));
      t += ctx.d('fast') + ctx.st('normal') * (sLines.length - 1);
    }
    if (sItems.length) {
      tw.from(q('.gg-scI'), t, { y: ctx.px(14), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }, ctx.st('normal'));
      t += ctx.d('fast') + ctx.st('normal') * (sItems.length - 1);
    }
    if (sc.caption) { tw.from(q('.gg-caption'), t, { y: ctx.px(14), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }); t += ctx.d('fast'); }
    return { html: H.join(''), tw: tw,
             dur: sceneDur(sc, ctx, t, sLines.join('') + itemsText(sItems) + (sc.caption || '')) };
  }
};

/* --- 17. quote — 말 한 줄에 화면을 다 준다. --- */
PATTERNS.quote = {
  label: '인용',
  use: '인용, 사용자 목소리, 핵심 문장. 호흡을 끊고 쉬어 가는 씬으로도 쓴다.',
  fields: 'text(필수) · by · role · icon',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var w = Math.min(ctx.W - ctx.safe * 2, ctx.wide ? 1340 : 900), x = (ctx.W - w) / 2;
    var qs = Math.round(ctx.fs.sub * (ctx.wide ? 1.42 : 1.28));
    H.push('<div class="gg-quote gg-c" style="left:' + x + 'px;top:' + Math.round(ctx.cy - (ctx.wide ? 190 : 240)) + 'px;width:' + w + 'px">' +
      '<div class="gg-qm" style="font-size:' + Math.round(qs * 2.6) + 'px">“</div>' +
      '<blockquote class="gg-qt" style="font-size:' + qs + 'px">' + maskLines(sc.text || sc.title) + '</blockquote>' +
      (sc.by ? '<div class="gg-qby" style="font-size:' + Math.round(ctx.fs.body * .96) + 'px">' + esc(sc.by) +
        (sc.role ? '<span class="gg-qrole"> · ' + esc(sc.role) + '</span>' : '') + '</div>' : '') + '</div>');
    tw.from(q('.gg-qm'), t, { y: ctx.px(20), opacity: 0, scale: .8, duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
    t += ctx.d('fast') * .5;
    tw.from(q('.gg-qt .gg-mk'), t, { yPercent: 110, duration: ctx.d('normal') * 1.1, ease: ctx.ei }, ctx.st('loose'));
    t += ctx.d('normal') * 1.1 + ctx.st('loose') * Math.max(0, splitLines(sc.text || sc.title).length - 1);
    if (sc.by) { tw.from(q('.gg-qby'), t, { x: ctx.px(-18), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }); t += ctx.d('fast'); }
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, sc.text || sc.title || '', { scale: 1.15 }) };
  }
};

/* 패턴별 필수 필드 — validate 가 쓴다. 없으면 만들 수 없는 것만 넣는다. */
var REQUIRED = {
  heroReveal: ['title'], kineticType: ['lines|title'], cardsCascade: ['items'],
  networkBuild: ['nodes'], processFlow: ['steps|items'], beforeAfter: ['before', 'after'],
  explodedDiagram: ['layers|items'], zoomDetail: ['items'], dataCounter: ['stats|items'],
  timeline: ['events|items'], splitCompare: ['left', 'right'], convergence: ['sources|items', 'target'],
  divergence: ['source', 'targets|items'], orbit: ['center', 'orbits|items'],
  matchCut: ['anchor', 'to'], cameraJourney: ['stops|items'], quote: ['text|title'],
  deviceShow: ['frame|screen'], chart: ['chart', 'data|items|series'], marquee: ['items']
};
/* 씬 길이 상한(초) — 카메라 순회처럼 여러 지점을 훑는 패턴은 원래 길다 */
var MAXSEC = { cameraJourney: 20, timeline: 16, zoomDetail: 15, convergence: 14 };
/* 밀도 상한 — 넘으면 씬을 나누라고 경고한다. 애니메이션은 정보량을 줄여주지 않는다. */
var MAXITEMS = {
  cardsCascade: 9, networkBuild: 8, processFlow: 6, explodedDiagram: 6, zoomDetail: 8,
  dataCounter: 4, timeline: 6, convergence: 7, divergence: 7, orbit: 10, cameraJourney: 5, kineticType: 6
};
/* 프레임 안에 들어가는 줄·항목 수 상한 — 화면 목업은 정보 밀도가 금방 넘친다 */
var MAXSCREEN = 7;

/* ================================================================== *
 * 트랜지션 — 씬 사이. 의미 없는 전환은 fade 보다 나쁘다.
 * dur 은 에너지의 trans 배율이 정한다.
 * ================================================================== */
var TRANSITIONS = {
  cut:       { label: '컷 — 즉시 교체. 리듬을 만들 때', out: null, inFrom: null, d: .001 },
  fade:      { label: '페이드 — 개념이 부드럽게 바뀔 때(기본)', out: { opacity: 0 }, inFrom: { opacity: 0 }, d: .7 },
  pushLeft:  { label: '푸시 좌 — 진행·다음 단계', out: { xPercent: -22, opacity: 0 }, inFrom: { xPercent: 22, opacity: 0 }, d: .8 },
  pushRight: { label: '푸시 우 — 되돌아가기·회상', out: { xPercent: 22, opacity: 0 }, inFrom: { xPercent: -22, opacity: 0 }, d: .8 },
  pushUp:    { label: '푸시 상 — 층을 올라감·심화', out: { yPercent: -18, opacity: 0 }, inFrom: { yPercent: 18, opacity: 0 }, d: .8 },
  zoomIn:    { label: '줌 인 — 전체에서 부분으로', out: { scale: 1.35, opacity: 0 }, inFrom: { scale: .78, opacity: 0 }, d: .9 },
  zoomOut:   { label: '줌 아웃 — 부분에서 전체로', out: { scale: .78, opacity: 0 }, inFrom: { scale: 1.3, opacity: 0 }, d: .9 },
  wipe:      { label: '와이프 — 화면을 닦아 교체. 장 구분', out: { opacity: 0 }, inFrom: { clip: 1, opacity: 1 }, d: .85 },
  match:     { label: '매치 — 겹쳐 넘긴다. 같은 형태가 이어질 때', out: { scale: 1.08, opacity: 0 }, inFrom: { scale: .96, opacity: 0 }, d: 1.0, overlap: .55 },
  curve:     { label: '곡선 와이프 — 아래에서 원호가 올라와 화면을 덮는다. 장 전환', out: { opacity: 0 }, inFrom: { clip: 'curve' }, d: 1.0 }
};

/* ================================================================== *
 * 빌드 — 스펙을 IR 로 컴파일한다. validate / toHTML / timing 이 모두 이걸 쓴다.
 * ================================================================== */
/** pattern 오류 문구 — compile 과 validate 가 같은 문장을 써야 중복 보고되지 않는다 */
function patErr(i, name) {
  return '씬 ' + (i + 1) + ': pattern "' + name + '" 은 없다 (' + Object.keys(PATTERNS).join(' ') + ').';
}
/** 씬 하나의 순수 애니메이션 끝 — hold 를 뺀 시간. */
function animEndOf(tw) {
  var e = 0;
  arr(tw).forEach(function (o) {
    var d = num(o.dur, 0) || (o.v && num(o.v.duration, 0)) || (o.v2 && num(o.v2.duration, 0)) || 0;
    e = Math.max(e, o.at + d + num(o.st, 0) * 3);
  });
  return r2(e);
}

/** 셀렉터가 이 항목의 것인가 */
function twOfItem(o, k) {
  return typeof o.t === 'string' && o.t.indexOf('data-i="' + k + '"') >= 0;
}

var SIDE_SEL = { left: '.gg-lt', right: '.gg-rt', before: '.gg-bf', after: '.gg-af' };

/**
 * 자막에 맞춰 씬의 시작·길이와 항목 등장 시각을 실측으로 바꾼다.
 *
 * 자연 타이밍과 다른 점이 하나 있다. 자연 상태에서 씬의 시작은 앞 씬의 끝에서
 * 트랜지션만큼 당겨 잡는데, 실측에서는 그 누적이 오차가 된다 — 씬을 열 개만
 * 지나도 몇 초씩 밀린다. 그래서 at 을 대사에 못 박고 트랜지션이 그 앞을 덮게 한다.
 */
function syncScenes(out, spec, cues, warnings) {
  var scenes = arr(spec.scenes);
  var cursor = 0, report = { matched: 0, skipped: [] };

  /* 1) 씬마다 시작 지점을 찾고 그 대사가 덮는 구간을 잡는다 */
  out.forEach(function (s, i) {
    var sc = scenes[i] || {};
    s.say = sc.say || '';
    if (!String(s.say).trim()) {
      report.skipped.push({ n: i + 1, why: 'say 가 없다' });
      return;
    }
    var a = findAnchor(cues, cursor, s.say);
    if (a < 0) {
      report.skipped.push({ n: i + 1, why: '자막에서 시작 지점을 찾지 못했다' });
      return;
    }
    var r = alignSay(s.say, cues, a);
    if (!r || r.matched < 0.5) {
      report.skipped.push({ n: i + 1, why: '자막과 say 가 맞지 않는다 (일치 ' +
        Math.round((r ? r.matched : 0) * 100) + '%) — say 는 자막의 연속 구간이어야 한다' });
      return;
    }
    s.syncAt = r.start; s.sayDur = r2(r.end - r.start); s.matched = r.matched;
    report.matched++;
    while (cursor < cues.length && cues[cursor].start < r.end - 0.01) cursor++;
  });

  var hit = out.filter(function (s) { return s.syncAt != null; });
  if (!hit.length) {
    warnings.push('자막에 맞출 수 있는 씬이 없다 — 씬에 say 를 적었는지 확인한다.');
    /* 여기서 멈추지 않는다. 아래 단계는 맞춘 씬이 없으면 아무 일도 하지 않고,
       마지막 5) 가 못 맞춘 씬을 앞 씬 끝에 이어 붙여 준다. 돌아가 버리면
       모든 씬의 at 이 0 으로 남아 화면이 통째로 겹친다. */
  }

  /* 2) 씬이 덮지 않는 대사 구간은 앞 씬이 머물러 흡수한다.
        화면을 비우면 그만큼 검은 구멍이 생긴다. */
  var audioEnd = cues[cues.length - 1].end;
  hit.forEach(function (s, k) {
    var next = hit[k + 1];
    s.dur = r2(Math.max(s.sayDur, (next ? next.syncAt : audioEnd) - s.syncAt));
  });

  /* 3) 항목·쪽을 제 대사에 앵커링한다 */
  out.forEach(function (s, i) {
    if (s.syncAt == null) return;
    var sc = scenes[i] || {};
    var from = 0;
    while (from < cues.length && cues[from].start < s.syncAt - 0.01) from++;
    var cur = from, moved = [], bad = 0;

    function moveGroup(pick, want) {
      var g = s.tw.filter(pick);
      if (!g.length) return false;
      var base = Math.min.apply(null, g.map(function (o) { return o.at; }));
      var d = r2(want - base);
      if (Math.abs(d) < 0.05) { moved.push(want); return true; }
      g.forEach(function (o) { o.at = r2(o.at + d); });
      moved.push(want);
      return true;
    }
    function anchorOf(say) {
      if (!say) return null;
      var a = findAnchor(cues, cur, say);
      if (a < 0 || cues[a].start >= s.syncAt + s.dur) { bad++; return null; }
      cur = a + 1;
      return r2(cues[a].start - s.syncAt);
    }

    var list = itemListOf(sc);
    if (list && hasSay(list)) {
      list.forEach(function (it, k) {
        var w = anchorOf(it && it.say);
        if (w == null) return;
        moveGroup(function (o) { return twOfItem(o, k); }, w);
      });
    }
    [['left', 'right'], ['before', 'after']].forEach(function (set) {
      if (!set.some(function (k) { return sc[k] && sc[k].say; })) return;
      set.forEach(function (side) {
        var w = anchorOf(sc[side] && sc[side].say);
        if (w == null) return;
        var sel = SIDE_SEL[side];
        moveGroup(function (o) {
          if (typeof o.t !== 'string') return false;
          /* after 는 제 등장과 함께 before 를 흐리게 만든다 — 같이 옮긴다 */
          if (side === 'after' && o.t.indexOf('.gg-bf') >= 0 && o.k === 'to') return true;
          if (side === 'before' && o.k === 'to') return false;
          return o.t.indexOf(sel) >= 0;
        }, w);
      });
    });

    if (bad) warnings.push('씬 ' + (i + 1) + ': 항목 ' + bad + '개의 say 를 씬 안에서 찾지 못했다.');
    if (!moved.length) return;
    s.itemSpread = r2(Math.max.apply(null, moved));
    var lead = r2(Math.min.apply(null, moved));
    /* 제목·키커가 있으면 그동안 화면이 비지 않는다 — 도입 대사만큼은 봐준다.
       제목이 없으면 정말 빈 화면이므로 엄격하게 본다. */
    var head0 = !!(sc.title || sc.kicker || sc.sub);
    if (lead > (head0 ? 6 : 3)) {
      warnings.push('씬 ' + (i + 1) + ' (' + s.pattern + '): 첫 요소가 ' + lead + 's 뒤에 나온다 — ' +
        (head0 ? '그때까지 제목만 떠 있다.' : '그때까지 빈 화면이다.') +
        ' 씬을 쪼개거나 첫 요소를 씬 첫 대사에 붙인다.');
    }
  });

  /* 4) 길이를 맞춘다. 남으면 머물고, 모자라면 씬 타임라인을 압축한다. */
  out.forEach(function (s, i) {
    if (s.syncAt == null) return;
    var ae = animEndOf(s.tw);
    if (s.dur >= ae) {
      s.ts = 1;
      var lastMove = Math.max(ae, s.itemSpread != null ? s.itemSpread + 1.2 : 0);
      var still = r2(Math.max(0, s.dur - lastMove));
      if (still > 12) {
        warnings.push('씬 ' + (i + 1) + ' (' + s.pattern + '): 마지막 움직임 뒤 ' + still +
          's 정지. 대사 ' + s.dur + 's 를 씬 하나가 덮는다 — 씬을 2~3개로 쪼개어 리듬을 만든다.');
      }
    } else {
      s.ts = r2(ae / s.dur);
      if (s.ts > 1.45) {
        warnings.push('씬 ' + (i + 1) + ' (' + s.pattern + '): 대사 ' + s.dur + 's 에 연출 ' + ae +
          's — ' + s.ts + '배 압축. 연출을 덜거나 씬을 쪼갠다.');
      }
    }
    /* 검수 프레임은 마지막 움직임 뒤로 — 항목이 다 나온 화면을 잡아야 한다 */
    s.contentEnd = r2(Math.min(s.dur, Math.max(s.contentEnd,
      s.itemSpread != null ? s.itemSpread + 1 : 0, ae)));
  });

  /* 5) 못 맞춘 씬은 앞 씬 끝에 이어 붙인다 — 자연 길이를 그대로 쓴다 */
  var prevEnd = 0;
  out.forEach(function (s) {
    if (s.syncAt != null) { s.at = s.syncAt; prevEnd = r2(s.at + s.dur); return; }
    s.at = prevEnd; prevEnd = r2(s.at + s.dur);
  });

  report.skipped.forEach(function (k) {
    warnings.push('씬 ' + k.n + ': 자막에 맞추지 못했다 — ' + k.why + '. 앞 씬 끝에 이어 붙였다.');
  });
  return report;
}

function compile(spec, opts) {
  spec = spec || {};
  opts = opts || {};
  var aspect = ASPECTS[spec.aspect] ? spec.aspect : '16:9';
  var theme = THEMES[spec.theme] ? spec.theme : 'midnight';
  var energy = ENERGY[spec.energy] ? spec.energy : 'E2';
  /* 폰트는 테마가 기본을 정하고 스펙이 덮어쓴다 — 같은 테마로 톤만 바꿀 수 있다 */
  var font = FONTS[spec.font] ? spec.font : THEMES[theme].font;
  var s2 = { aspect: aspect, theme: theme, energy: energy, font: font };
  var E = ENERGY[energy];
  var T = THEMES[theme];
  var scenes = arr(spec.scenes), out = [], used = {}, at = 0, errors = [], warnings = [];

  scenes.forEach(function (sc, i) {
    sc = sc || {};
    var P = PATTERNS[sc.pattern];
    if (!P) {
      errors.push(patErr(i, sc.pattern));
      return;
    }
    var ctx = makeCtx(s2, sc, i);
    var built;
    try { built = P.build(sc, ctx); }
    catch (e) { errors.push('씬 ' + (i + 1) + ' (' + sc.pattern + ') 빌드 실패: ' + e.message); return; }
    Object.keys(ctx.used).forEach(function (k) { used[k] = 1; });

    var tr = TRANSITIONS[sc.transition] ? sc.transition : (i === 0 ? 'cut' : 'fade');
    /* TRN 으로 받는다 — T 로 쓰면 바깥의 테마 T 를 가려서 테마 값이 통째로 사라진다 */
    var TRN = TRANSITIONS[tr];
    var tdur = r2(TRN.d * E.trans);
    /* 트랜지션은 앞 씬의 끝과 겹친다 — 씬 사이에 빈 화면이 생기면 리듬이 죽는다 */
    var overlap = i === 0 ? 0 : r2(tdur * num(TRN.overlap, .8));

    /* 배경 레이어 — 씬이 지정하지 않으면 루트, 루트도 없으면 테마 기본을 쓴다.
       false 를 주면 아무것도 깔지 않는다. 화면이 비어 보이는 가장 흔한 원인이 이 레이어의 부재다. */
    var dSpec = has(sc, 'decor') ? sc.decor : (has(spec, 'decor') ? spec.decor : T.decor);
    /* 차트 씬은 배경을 한 단계 낮춘다 — 데이터 위에 장식이 겹치면 읽는 속도가 떨어진다 */
    var dLvBase = num(has(sc, 'decorLevel') ? sc.decorLevel : spec.decorLevel, 1);
    if (!has(sc, 'decorLevel') && (sc.pattern === 'chart' || sc.pattern === 'deviceShow')) dLvBase -= 1;
    var dLv = clamp(dLvBase, 0, 2);
    var decorSVG = '';
    /* 여러 겹을 쌓을 수 있다 — 격자 위에 덩어리를 얹는 식으로 층이 생긴다 */
    if (dSpec) arr(dSpec).forEach(function (dn) {
      if (VEC.DECOR[dn]) decorSVG += VEC.DECOR[dn].build(ctx.W, ctx.H, T, dLv);
      else errors.push('씬 ' + (i + 1) + ': decor "' + dn + '" 는 없다 (' + Object.keys(VEC.DECOR).join(' ') + ').');
    });

    /* 씬의 내용이 다 나온 시각 — 씬별 스크린샷 및 발표 모드 정지 시점의 기준이 된다. */
    var ce = ctx.animEnd != null ? ctx.animEnd : 0;
    built.tw.list.forEach(function (o) {
      var d = num(o.dur, 0) || num(o.v && o.v.duration, 0) || num(o.v2 && o.v2.duration, 0);
      ce = Math.max(ce, o.at + d);
    });
    out.push({
      id: sc.id || slug(sc.title || sc.pattern, i),
      sid: ctx.sid, pattern: sc.pattern, purpose: sc.purpose || '',
      notes: sc.notes || sc.purpose || '',
      html: built.html, fixed: built.fixed || '', decor: decorSVG, tw: built.tw.list,
      dur: r2(built.dur), contentEnd: r2(Math.min(ce, built.dur)),
      trans: tr, tdur: tdur, overlap: overlap,
      /* 줄이 객체({text,...})일 수 있다 — lineText 를 거치지 않으면 [object Object] 가 된다 */
      at: 0, title: sc.title || sc.text || lineText(arr(sc.lines)[0]) || ''
    });
  });

  /* 절대 시작 시각 계산 — 자막이 있으면 대사에 못 박고, 없으면 앞 씬에서 이어 잡는다 */
  var sync = null;
  if (opts.cues && opts.cues.length && !errors.length) {
    sync = syncScenes(out, spec, opts.cues, warnings);
  } else {
    out.forEach(function (s, i) {
      if (i === 0) { s.at = 0; return; }
      s.at = r2(out[i - 1].at + out[i - 1].dur - s.overlap);
    });
  }
  var total = out.length ? r2(out[out.length - 1].at + out[out.length - 1].dur) : 0;
  if (sync && opts.cues.length) total = Math.max(total, r2(opts.cues[opts.cues.length - 1].end));

  return {
    aspect: aspect, theme: theme, energy: energy,
    mode: ['autoplay', 'loop', 'step'].indexOf(spec.mode) >= 0 ? spec.mode : 'autoplay',
    title: spec.title || '', message: spec.message || '', font: font,
    scenes: out, total: total, icons: Object.keys(used), errors: errors, warnings: warnings,
    sync: sync, audio: spec.audio || null, captions: opts.captions || null
  };
}

/* ================================================================== *
 * validate — 스펙의 오류와 연출상의 의심을 갈라 보고한다.
 * ================================================================== */
function validate(spec, opts) {
  var errors = [], warnings = [];
  spec = spec || {};
  opts = opts || {};
  if (!arr(spec.scenes).length) errors.push('scenes 가 비어 있다.');
  if (spec.aspect && !ASPECTS[spec.aspect]) errors.push('aspect "' + spec.aspect + '" 는 없다 (' + Object.keys(ASPECTS).join(' ') + ').');
  if (spec.theme && !THEMES[spec.theme]) errors.push('theme "' + spec.theme + '" 는 없다 (' + Object.keys(THEMES).join(' ') + ').');
  if (spec.energy && !ENERGY[spec.energy]) errors.push('energy "' + spec.energy + '" 는 없다 (E1 E2 E3).');
  if (spec.font && !FONTS[spec.font]) errors.push('font "' + spec.font + '" 는 없다 (' + Object.keys(FONTS).join(' ') + ').');
  if (spec.decor && spec.decor !== false) arr(spec.decor).forEach(function (d) {
    if (!VEC.DECOR[d]) errors.push('decor "' + d + '" 는 없다 (' + Object.keys(VEC.DECOR).join(' ') + ').');
  });
  if (!spec.message) warnings.push('message 가 없다 — 이 모션그래픽이 전하려는 한 줄을 적어 두면 씬 구성을 스스로 검증할 수 있다.');

  var patCount = {}, run = { p: null, n: 0 };
  arr(spec.scenes).forEach(function (sc, i) {
    sc = sc || {};
    var tag = '씬 ' + (i + 1) + (sc.id ? ' (' + sc.id + ')' : '') + ': ';
    var P = PATTERNS[sc.pattern];
    if (!P) { errors.push(patErr(i, sc.pattern)); return; }
    patCount[sc.pattern] = (patCount[sc.pattern] || 0) + 1;
    /* 같은 패턴 3연속 — 다르게 보이려면 다르게 움직여야 한다 */
    if (run.p === sc.pattern) { run.n++; if (run.n === 3) warnings.push(tag + sc.pattern + ' 이 3연속이다. 패턴이나 트랜지션을 바꿔 리듬을 만든다.'); }
    else { run.p = sc.pattern; run.n = 1; }

    (REQUIRED[sc.pattern] || []).forEach(function (f) {
      var ok = f.split('|').some(function (k) {
        var v = sc[k];
        return v != null && (!Array.isArray(v) || v.length);
      });
      if (!ok) errors.push(tag + sc.pattern + ' 에 필수 필드 ' + f.split('|').join(' 또는 ') + ' 가 없다.');
    });
    if (sc.transition && !TRANSITIONS[sc.transition]) errors.push(tag + 'transition "' + sc.transition + '" 는 없다 (' + Object.keys(TRANSITIONS).join(' ') + ').');
    if (i === 0 && sc.transition && sc.transition !== 'cut') warnings.push(tag + '첫 씬의 transition 은 무시된다.');

    /* kineticType 은 한 줄이 한 호흡이다. 엔진이 글자를 줄여 한 줄을 지키지만 하한이
       있어서, 그보다 긴 줄은 접힌다 — 접혀도 겹치지는 않지만 리듬이 무너진다.
       (빌드 쪽 sizes 계산과 같은 기준: 하한 .62, 가용폭 = 화면폭 - 안전여백*2) */
    if (sc.pattern === 'kineticType') {
      var kAsp = ASPECTS[spec.aspect] || ASPECTS['16:9'];
      var kType = TYPE[spec.aspect] || TYPE['16:9'];
      var kW = kAsp.w - kAsp.safe * 2;
      lineItems(sc.lines).forEach(function (l, li) {
        var base = Math.round(kType.title * num(l.scale, l.emphasis ? 1.34 : 1));
        if (estEm(l.text) * base * .62 > kW) {
          warnings.push(tag + (li + 1) + '번째 줄이 한 줄에 안 들어간다 — "' +
            String(l.text).slice(0, 18) + '…". 접혀서 나오므로 짧게 끊거나 줄을 나눈다.');
        }
      });
    }
    if (sc.title && splitLines(sc.title).length >= 4) {
      warnings.push(tag + 'title 이 ' + splitLines(sc.title).length + '줄이다 — 타이틀을 1~2줄로 줄이고 나머지는 서브나 본문으로 내린다.');
    }
    if (spec.aspect === '9:16' && sc.cols && sc.cols > 2) {
      warnings.push(tag + '쇼츠(9:16)에서 cols 가 ' + sc.cols + '개다 — 화면 폭이 좁아 2열 이하가 권장된다.');
    }
    /* 밀도 */
    var pool = allItemsOf(sc);
    var cap = MAXITEMS[sc.pattern];
    if (cap && pool.length > cap) warnings.push(tag + '항목이 ' + pool.length + '개다. ' + sc.pattern + ' 는 ' + cap + '개까지가 읽힌다 — 씬을 나눈다.');
    /* 글자 밀도 — 애니메이션 씬에 문단은 들어가지 않는다 */
    var longs = [];
    ['title', 'sub', 'text'].forEach(function (k) {
      var s = String(sc[k] == null ? '' : sc[k]);
      if (s.replace(/\s/g, '').length > (k === 'text' ? 110 : 46)) longs.push(k);
    });
    if (longs.length) warnings.push(tag + longs.join('·') + ' 가 길다. 읽는 데 걸리는 시간이 hold 를 넘으면 사라진 뒤에 이해된다 — 줄이거나 씬을 나눈다.');
    /* 아이콘 오타 */
    var names = [];
    function collect(v) {
      arr(v).forEach(function (x) { if (x && typeof x === 'object' && x.icon) names.push(x.icon); });
    }
    if (sc.icon) names.push(sc.icon);
    [sc.items, sc.nodes, sc.steps, sc.layers, sc.stats, sc.events, sc.sources, sc.targets, sc.orbits, sc.stops].forEach(collect);
    [sc.target, sc.source, sc.center, sc.left, sc.right, sc.before, sc.after, sc.anchor].forEach(function (o) {
      if (o && typeof o === 'object' && o.icon) names.push(o.icon);
      if (o && typeof o === 'object') collect(o.items);
    });
    if (typeof sc.anchor === 'string') names.push(sc.anchor);
    names.forEach(function (nm) {
      if (!ICO.iconPath(nm)) {
        var sug = ICO.iconSuggest(nm);
        errors.push(tag + '아이콘 "' + nm + '" 은 없다.' + (sug.length ? ' 이런 게 있다: ' + sug.join(' ') : ' `gm icons <검색어>` 로 찾는다.'));
      }
    });
    if (sc.hold != null && (typeof sc.hold !== 'number' || sc.hold < 0)) errors.push(tag + 'hold 는 0 이상의 초(숫자)여야 한다.');

    /* 벡터 세트 이름 — 오타면 조용히 사라지므로 오류로 잡는다 */
    function chkVec(set, val, what) {
      arr(val).forEach(function (v) {
        if (v === false || v == null) return;
        var nm = typeof v === 'string' ? v.split(':')[0] : (v && v.type);
        if (nm && !set[nm]) errors.push(tag + what + ' "' + nm + '" 는 없다 (' + Object.keys(set).join(' ') + ').');
      });
    }
    if (sc.chart && !CH.CHARTS[sc.chart]) errors.push(tag + 'chart "' + sc.chart + '" 는 없다 (' +
      Object.keys(CH.CHARTS).join(' ') + ').');
    if (sc.pattern === 'chart' && CH.CHARTS[sc.chart]) {
      var CD = CH.normData(sc.data || sc), dat = sc.data || sc;
      /* heatmap 은 grid, scatter 는 points 로 받는다 — 형태가 다르다고 "데이터 없음"이 아니다 */
      var altOK = (sc.chart === 'heatmap' && arr(dat.grid).length) || (sc.chart === 'scatter' && arr(dat.points).length);
      if (!altOK && (!CD.series.length || !CD.series[0].values.length)) {
        errors.push(tag + 'chart 에 데이터가 없다 — ' +
          (sc.chart === 'heatmap' ? 'data.grid 와 data.rows 를 준다.'
           : sc.chart === 'scatter' ? 'data.points[{x,y,size,label}] 를 준다.'
           : 'data.items 나 data.series 를 준다.'));
      }
      /* 색은 순환하지 않는다. 9번째 시리즈는 새 색을 만들지 않고 접거나 나눈다 */
      if (CD.series.length > 8) errors.push(tag + '시리즈가 ' + CD.series.length + '개다 — 8개가 한계다. 나머지는 "기타"로 접거나 씬을 나눈다.');
      else if (CD.series.length > 4) warnings.push(tag + '시리즈가 ' + CD.series.length + '개다 — 5개부터는 범례가 필요하고 직접 라벨이 서로 부딪힌다.');
      if (['donut', 'pie'].indexOf(sc.chart) >= 0 && CD.series[0].values.length > 5)
        warnings.push(tag + '도넛 조각이 ' + CD.series[0].values.length + '개다 — 6개를 넘으면 누적 가로 막대(barStack + horizontal)가 낫다.');
      if (sc.chart === 'bar' && CD.cats.length > 10)
        warnings.push(tag + '막대가 ' + CD.cats.length + '개다 — 가로 막대(barH)로 눕히거나 상위만 남긴다.');
    }
    if (has(sc, 'decor') && sc.decor !== false) chkVec(VEC.DECOR, sc.decor, 'decor');
    if (sc.mark) chkVec(VEC.MARK, sc.mark, 'mark');
    if (sc.art) chkVec(VEC.ART, sc.art, 'art');
    if (sc.frame) chkVec(VEC.FRAME, sc.frame, 'frame');
    if (sc.screen && sc.screen.art) chkVec(VEC.ART, sc.screen.art, 'screen.art');
    [sc.items, sc.nodes, sc.steps, sc.stats, sc.stops].forEach(function (L) {
      arr(L).forEach(function (x) { if (x && x.art) chkVec(VEC.ART, x.art, 'items[].art'); });
    });
    /* 화면 목업 밀도 */
    if (sc.pattern === 'deviceShow' && sc.screen) {
      var scN = arr(sc.screen.lines).length + items(sc.screen.items).length;
      if (scN > MAXSCREEN) warnings.push(tag + '프레임 안 줄·항목이 ' + scN + '개다 — ' + MAXSCREEN +
        '개를 넘으면 화면이 아니라 문서가 된다.');
    }
  });

  var c = compile(spec, opts);
  c.errors.forEach(function (e) { if (errors.indexOf(e) < 0) errors.push(e); });
  c.warnings.forEach(function (w) { if (warnings.indexOf(w) < 0) warnings.push(w); });
  var timed = !!c.sync;

  /* 씬 길이·전체 리듬 —
     자막에 맞춘 경우 길이는 목소리가 정하므로 여기서 다시 따지지 않는다.
     대신 syncScenes 가 "정지가 길다 · 첫 요소가 늦다" 를 이미 짚는다. */
  var durs = c.scenes.map(function (s) { return s.dur; });
  if (!timed) {
    c.scenes.forEach(function (s, i) {
      if (s.dur < 1.4) warnings.push('씬 ' + (i + 1) + ' 이 ' + s.dur + '초다 — 내용을 읽기 전에 넘어간다. hold 를 늘리거나 내용을 합친다.');
      var cap = MAXSEC[s.pattern] || 13;
      if (s.dur > cap) warnings.push('씬 ' + (i + 1) + ' 이 ' + s.dur + '초다 — ' + s.pattern + ' 라도 ' + cap + '초를 넘으면 시선이 떠난다. 씬을 나눈다.');
    });
    /* 전부 같은 길이면 리듬이 없다 */
    if (durs.length >= 4) {
      var uniq = {}; durs.forEach(function (d) { uniq[Math.round(d * 2)] = 1; });
      if (Object.keys(uniq).length <= Math.max(2, Math.floor(durs.length / 3)))
        warnings.push('씬 길이가 거의 같다 — 강조할 씬은 길게, 넘길 씬은 짧게 해서 리듬을 만든다.');
    }
    if (c.total > 150) warnings.push('전체 ' + Math.round(c.total) + '초다 — 2분을 넘으면 모션그래픽이 아니라 영상이다. 나누는 걸 검토한다.');
  }
  if (opts.captions && opts.captions.length) {
    var capN = arr(spec.scenes).filter(function (sc) { return sc && sc.caption; }).length;
    if (capN) warnings.push('화면 자막을 켰는데 caption 이 있는 씬이 ' + capN +
      '개다 — 화면 아래가 두 겹이 된다. caption 을 지우거나 화면 자막을 끈다.');
  }
  if (spec.font === 'pen') {
    var longScenes = arr(spec.scenes).filter(function (sc) {
      return sc && (allItemsOf(sc).length > 4 || String(sc.sub || '').length > 40);
    }).length;
    if (longScenes) warnings.push('손글씨(pen)로 글이 많은 씬이 ' + longScenes +
      '개다 — 손글씨는 짧은 한 마디에서만 읽힌다. 항목을 줄이거나 다른 폰트를 쓴다.');
  }
  var trs = {};
  c.scenes.slice(1).forEach(function (s) { trs[s.trans] = 1; });
  if (c.scenes.length >= 5 && Object.keys(trs).length === 1 && trs.fade)
    warnings.push('트랜지션이 전부 fade 다 — 진행은 pushLeft, 심화는 zoomIn 처럼 의미에 맞게 바꾼다.');

  return {
    ok: errors.length === 0, errors: errors, warnings: warnings,
    stats: {
      scenes: c.scenes.length, totalSec: r2(c.total), frames: Math.ceil(c.total * 30),
      theme: c.theme, aspect: c.aspect, energy: c.energy, mode: c.mode,
      icons: c.icons.length, patterns: Object.keys(patCount).length,
      tweens: c.scenes.reduce(function (a, s) { return a + s.tw.length; }, 0)
    },
    sync: c.sync,
    scenes: c.scenes.map(function (s, i) {
      return { n: i + 1, id: s.id, pattern: s.pattern, at: s.at, dur: s.dur, trans: s.trans,
               matched: s.matched, ts: s.ts };
    })
  };
}

/* ================================================================== *
 * CSS — 테마 토큰 + 컴포넌트. 패턴이 만든 클래스가 여기서 옷을 입는다.
 * ================================================================== */
function css(c) {
  var T = THEMES[c.theme], A = ASPECTS[c.aspect], F = FONTS[c.font] || FONTS[T.font];
  var glow = T.glow ? 'filter:drop-shadow(0 0 ' + (T.glow * 10) + 'px var(--acc));' : '';
  return [
'*{margin:0;padding:0;box-sizing:border-box;word-break:keep-all;overflow-wrap:break-word}',
/* HTML 의 hidden 속성은 UA 스타일의 display:none 으로 동작한다 — 작성자 CSS 의
   display:grid/flex 가 그걸 덮어써서 숨긴 요소가 그대로 보인다. 명시적으로 막는다. */
'[hidden]{display:none!important}',
':root{--bg:' + T.bg + ';--bg2:' + T.bg2 + ';--ink:' + T.ink + ';--ink2:' + T.ink2 + ';--dim:' + T.dim +
  ';--acc:' + T.accent + ';--acc2:' + T.accent2 + ';--good:' + T.good + ';--warn:' + T.warn + ';--bad:' + T.bad +
  ';--line:' + T.line + ';--panel:' + T.panel + ';--pline:' + T.panelLine + ';--font:' + F.stack +
  ';--mono:' + MONO.stack + ';--tight:' + F.tight + ';--kick:' + (F.kick || '.24em') + '}',
/* 굵기가 하나뿐인 폰트는 브라우저가 굵기를 지어내지 못하게 막는다 — 획이 뭉갠다 */
F.solo ? 'body{font-synthesis-weight:none;-webkit-font-smoothing:antialiased}' : '',
'html,body{height:100%;background:var(--bg);color:var(--ink);font-family:var(--font);overflow:hidden}',
'body{display:block}',
/* 스테이지 — 고정 좌표계. 뷰포트에는 scale 로 맞춘다. */
'.gg-fit{position:fixed;inset:0;overflow:hidden}',
/* 스케일 래퍼와 스테이지를 분리한다 — 스테이지의 transform 은 impact/shake 가 쓴다.
   grid place-items 는 아이템이 뷰포트보다 크면 어긋나므로 absolute + translate 로 세운다. */
'.gg-scale{position:absolute;left:50%;top:50%;width:' + A.w + 'px;height:' + A.h + 'px;transform-origin:center center;' +
  'transform:translate(-50%,-50%)}',
'.gg-stage{position:relative;width:100%;height:100%;overflow:hidden;transform-origin:center center;' +
  'background:radial-gradient(120% 90% at 50% 0%,' + T.bg2 + ' 0%,' + T.bg + ' 62%);isolation:isolate}',
'.gg-grain{position:absolute;inset:0;pointer-events:none;opacity:' + T.grain + ';z-index:60;mix-blend-mode:overlay}',
'.gg-vig{position:absolute;inset:0;pointer-events:none;z-index:59;' +
  'background:radial-gradient(110% 80% at 50% 45%,transparent 55%,rgba(0,0,0,' + num(T.vig, .42) + ') 100%)}',
'.gg-flash{position:absolute;inset:0;pointer-events:none;z-index:58;background:var(--ink);opacity:0;mix-blend-mode:soft-light}',
'.gg-scene{position:absolute;inset:0;visibility:hidden}',
'.gg-world{position:absolute;inset:0;transform-origin:center center;will-change:transform}',
'.gg-fixed{position:absolute;inset:0;z-index:40;pointer-events:none}',
'.gg-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;color:var(--acc)}',
/* ---- 배경·분위기 레이어 ---- */
'.gg-decorL{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}',
'.gg-decor{position:absolute;inset:0;width:100%;height:100%}',
/* 마스터 타임라인과 무관한 느린 무한 루프 — CSS 로 돌린다. 시킹에 영향이 없다. */
'@keyframes ggFloat{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(2.2%,-2.6%) scale(1.05)}' +
  '66%{transform:translate(-1.8%,2%) scale(.97)}}',
'@keyframes ggSlide{0%{transform:translateX(-6%)}50%{transform:translateX(6%)}100%{transform:translateX(-6%)}}',
'@keyframes ggSpin{to{transform:rotate(360deg)}}',
'@keyframes ggPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(1.035)}}',
'@keyframes ggDrift{0%,100%{transform:translate(0,0)}50%{transform:translate(-1.6%,1.8%)}}',
'@keyframes ggTwinkle{0%,100%{opacity:1}50%{opacity:.25}}',
'.gg-drFloat{animation:ggFloat 24s ease-in-out infinite;transform-origin:center}',
'.gg-drSlide{animation:ggSlide 22s ease-in-out infinite}',
'.gg-drSpin{animation:ggSpin 150s linear infinite}',
'.gg-drPulse{animation:ggPulse 7s ease-in-out infinite;transform-origin:center}',
'.gg-drDrift{animation:ggDrift 20s ease-in-out infinite}',
'.gg-drTwinkle{animation:ggTwinkle 5s ease-in-out infinite}',
'@media (prefers-reduced-motion:reduce){' +
  '.gg-drFloat,.gg-drSlide,.gg-drSpin,.gg-drPulse,.gg-drDrift,.gg-drTwinkle{animation:none}}',
/* 공통 텍스트 */
'.gg-head{position:absolute}',
'.gg-c{text-align:center}',
'.gg-kicker{font-size:26px;letter-spacing:var(--kick);text-transform:uppercase;color:var(--acc);font-weight:600;margin-bottom:22px}',
'.gg-title{font-weight:800;line-height:1.08;letter-spacing:var(--tight);color:var(--ink)}',
'.gg-sub{margin-top:26px;color:var(--ink2);line-height:1.5;font-weight:400}',
'.gg-mask{display:block;overflow:hidden;padding-bottom:.06em}',
'.gg-mk{display:block;will-change:transform}',
'.gg-rule{position:absolute;height:3px;background:var(--acc);transform-origin:center;border-radius:2px;' + glow + '}',
/* ---- 강조 마크 ---- */
/* 마크를 다는 줄만 inline-block 이 된다 — 그래야 폭이 글자에 맞고 동그라미가 문장 전체를 감싸지 않는다 */
'.gg-line{position:relative;display:inline-block}',
'.gg-mark{position:absolute;pointer-events:none;overflow:visible}',
'.gg-mk-under{left:-1.5%;bottom:-.26em;width:103%;height:.3em}',
'.gg-mk-around{left:-5%;top:-12%;width:110%;height:124%}',
'.gg-mk-behind{left:-3%;top:-6%;width:106%;height:112%;z-index:-1}',
'.gg-mk-strike{left:-3%;top:0;width:106%;height:100%}',
'.gg-mk-point{right:-96px;bottom:-52px;width:88px;height:68px}',
'.gg-mk-corner{right:-52px;top:-30px;width:60px;height:40px}',
'.gg-mk-badge{right:-14px;top:-16px;height:34px;width:auto}',
'.gg-mk-ribbon{left:0;top:0;width:134px;height:134px;border-top-left-radius:22px;overflow:hidden}',
'.gg-mkStar{transform-origin:center;animation:ggTwinkle 3.4s ease-in-out infinite}',
/* ---- 추상 일러스트 ---- */
'.gg-artBox{position:relative}',
'.gg-artBox svg{width:100%;height:100%;display:block}',
'.gg-heroArt{position:absolute}',
'.gg-artP{transform-box:fill-box}',
'@keyframes ggArtSpin{to{transform:rotate(360deg)}}',
'@keyframes ggArtSpinR{to{transform:rotate(-360deg)}}',
'@keyframes ggArtFlow{0%{transform:translate(0,0);opacity:0}10%{opacity:1}' +
  '45%{transform:translate(96px,0)}70%{transform:translate(96px,84px)}' +
  '95%{transform:translate(156px,84px);opacity:1}100%{transform:translate(156px,84px);opacity:0}}',
'.gg-artSpin{animation:ggArtSpin 24s linear infinite}',
'.gg-artSpinR{animation:ggArtSpinR 18s linear infinite}',
'.gg-artFlow{animation:ggArtFlow 3.4s ease-in-out infinite}',
'.gg-cardArt{position:absolute;right:-6px;bottom:-6px;width:44%;opacity:.16;pointer-events:none}',
'.gg-cardArt svg{width:100%;height:auto;display:block}',
'@media (prefers-reduced-motion:reduce){.gg-artSpin,.gg-artSpinR,.gg-artFlow,.gg-mkStar{animation:none}}',
/* ---- 마퀴 ---- */
'.gg-mqRow{position:absolute;left:0;width:100%;overflow:hidden;display:flex;align-items:center;' +
  'mask-image:linear-gradient(90deg,transparent,#000 9%,#000 91%,transparent);' +
  '-webkit-mask-image:linear-gradient(90deg,transparent,#000 9%,#000 91%,transparent)}',
'@keyframes ggMq{from{transform:translateX(0)}to{transform:translateX(-50%)}}',
'.gg-mqTrack{display:flex;align-items:center;flex:0 0 auto;animation:ggMq linear infinite;will-change:transform}',
'.gg-mqI{display:inline-flex;align-items:center;gap:16px;padding:0 42px;white-space:nowrap;flex:0 0 auto}',
'.gg-mqI b{font-weight:700;color:var(--ink)}',
'.gg-mqI em{font-style:normal;font-size:.72em;color:var(--dim)}',
'@media (prefers-reduced-motion:reduce){.gg-mqTrack{animation:none}}',
/* ---- 차트 ---- */
'.gg-chart{position:absolute}',
'.gg-cSvg{width:100%;height:100%;display:block;font-family:var(--font);overflow:visible}',
'.gg-cTick{letter-spacing:-.01em}',
'.gg-cVal{letter-spacing:-.02em}',
'.gg-legend{position:absolute;display:flex;flex-wrap:wrap;gap:10px 26px;justify-content:center}',
'.gg-lgI{display:inline-flex;align-items:center;gap:9px;color:var(--ink2);font-weight:600}',
'.gg-lgI i{width:14px;height:14px;border-radius:4px;flex:0 0 auto}',
'.gg-cardSpark{position:absolute;right:18px;bottom:16px;width:38%;height:26%;pointer-events:none}',
'.gg-cardSpark svg{width:100%;height:100%;display:block;overflow:visible}',
/* ---- 디바이스 프레임 ---- */
'.gg-device{position:absolute}',
'.gg-frame{position:absolute;inset:0;width:100%;height:100%}',
'.gg-screen{position:absolute;display:flex;flex-direction:column;gap:16px;justify-content:center;overflow:hidden}',
'.gg-scT{font-weight:800;letter-spacing:var(--tight);color:var(--ink)}',
'.gg-scLines{display:flex;flex-direction:column;gap:11px;color:var(--ink2);line-height:1.45}',
'.gg-scL{display:flex;gap:9px}',
'.gg-scP{color:var(--acc);font-weight:700}',
'.gg-devTerm .gg-screen{font-family:var(--mono);justify-content:flex-start}',
'.gg-devTerm .gg-scL:not(.gg-scCmd){opacity:.72;padding-left:1.4em}',
'.gg-devTerm .gg-scLines{color:rgba(235,240,255,.82)}',
'.gg-scItems{display:flex;flex-direction:column;gap:12px}',
'.gg-scI{display:flex;align-items:center;gap:13px;padding:12px 15px;border-radius:12px;' +
  'background:var(--panel);border:1px solid var(--pline);font-size:.94em}',
'.gg-scI span{flex:1;font-weight:600;color:var(--ink)}',
'.gg-scI b{color:var(--acc);font-weight:800}',
'.gg-scArt{display:grid;place-items:center;flex:1;min-height:0}',
'.gg-caption{position:absolute;color:var(--dim);line-height:1.45}',
/* 화면 자막 — 스테이지 좌표계에 얹는다. 어떤 테마에서도 읽히도록 자체 그림자를 쓴다.
   영상 자막의 관례대로 화면 맨 아래에 붙인다. 플레이어 바는 마우스를 올리기 전까지
   보이지 않으므로 겹칠 일이 없고, 겹치는 순간은 자막보다 조작이 우선인 순간이다.
   숨기기는 hidden 속성으로 한다 — 전역 [hidden] 규칙이 display 를 확실히 끈다. */
/* padding-bottom 은 여백이 아니라 클리핑 여유다 — 강조 박스는 글자 아래로 조금 더
   내려오는데 스테이지가 overflow:hidden 이라 그만큼 잘린다. em 이라 화면비를 따라간다. */
'.gg-captions{position:absolute;left:6%;right:6%;bottom:0;padding-bottom:.22em;text-align:center;' +
  'z-index:200;pointer-events:none;' +
  'font-size:' + Math.round(A.h * .033) + 'px;font-weight:600;line-height:1.3;letter-spacing:-.01em}',
'.gg-captions span{display:inline;color:#fff;background:rgba(0,0,0,.68);border-radius:.28em .28em 0 0;' +
  'padding:.14em .48em .18em;box-decoration-break:clone;-webkit-box-decoration-break:clone;' +
  'text-shadow:0 2px 10px rgba(0,0,0,.95),0 0 2px rgba(0,0,0,.95)}',
/* 자막 켜기/끄기 버튼 — 꺼진 상태를 눈으로 구분할 수 있어야 한다 */
'.gg-ccBtn{font-size:11px;font-weight:700;letter-spacing:.02em;width:34px}',
'.gg-ccBtn[aria-pressed="false"]{opacity:.4;text-decoration:line-through}',
'.gg-ic{color:var(--acc);' + glow + '}',
'.gg-heroIc{position:absolute}',
/* 카드 */
'.gg-card{position:absolute;background:var(--panel);border:1.5px solid var(--pline);border-radius:24px;' +
  'padding:36px 30px;display:flex;flex-direction:column;gap:16px;justify-content:center;backdrop-filter:blur(7px)}',
'.gg-cardIc{margin-bottom:4px}',
'.gg-cardVal{font-size:48px;font-weight:800;color:var(--acc);letter-spacing:-.02em}',
'.gg-cardLb{font-size:34px;font-weight:700;line-height:1.32;color:var(--ink);letter-spacing:var(--tight)}',
'.gg-cardNote{font-size:24px;color:var(--dim);line-height:1.45}',
'.gg-focus{border-color:var(--pline)}',
'.gg-t-good{border-color:' + T.good + '55}.gg-t-good .gg-ic{color:' + T.good + '}',
'.gg-t-bad{border-color:' + T.bad + '55}.gg-t-bad .gg-ic{color:' + T.bad + '}',
'.gg-t-warn{border-color:' + T.warn + '55}.gg-t-warn .gg-ic{color:' + T.warn + '}',
'.gg-t-dim{opacity:.62}',
'.gg-t-good .gg-sideVal,.gg-t-good .gg-cardVal{color:' + T.good + '}',
'.gg-t-bad .gg-sideVal,.gg-t-bad .gg-cardVal{color:' + T.bad + '}',
'.gg-t-warn .gg-sideVal,.gg-t-warn .gg-cardVal{color:' + T.warn + '}',
/* 네트워크 */
'.gg-link{fill:none;stroke:var(--acc);stroke-width:2.2;opacity:.5;stroke-linecap:round}',
'.gg-node{position:absolute;background:var(--panel);border:1.5px solid var(--pline);border-radius:18px;' +
  'padding:18px 16px;display:flex;flex-direction:column;align-items:center;gap:9px;text-align:center;backdrop-filter:blur(6px)}',
'.gg-hub{border-color:var(--acc);background:var(--panel);box-shadow:0 0 0 6px ' + T.accent + '18}',
'.gg-nodeLb{font-weight:700;line-height:1.3}',
'.gg-nodeNote{font-size:21px;color:var(--dim)}',
/* 프로세스 */
'.gg-arrow{fill:none;stroke:var(--acc);stroke-width:2.6;opacity:.72;color:var(--acc)}',
'.gg-step{position:absolute;background:var(--panel);border:1.5px solid var(--pline);border-radius:20px;' +
  'padding:28px 26px;display:flex;flex-direction:column;gap:13px;align-items:flex-start;justify-content:center;backdrop-filter:blur(6px)}',
'.gg-stepNo{font-size:22px;font-weight:800;color:var(--acc);letter-spacing:.16em}',
'.gg-stepLb{font-weight:700;line-height:1.32}',
'.gg-stepNote{font-size:22px;color:var(--dim);line-height:1.45}',
/* 비포애프터 · 스플릿 */
'.gg-panel,.gg-side{position:absolute;background:var(--panel);border:1.5px solid var(--pline);border-radius:24px;' +
  'padding:38px 34px;display:flex;flex-direction:column;gap:18px;justify-content:center;backdrop-filter:blur(7px)}',
'.gg-panelTag{font-size:23px;letter-spacing:.2em;text-transform:uppercase;color:var(--dim);font-weight:700}',
'.gg-panelVal{font-weight:800;color:var(--acc);letter-spacing:-.02em}',
'.gg-af .gg-panelVal{color:var(--good)}',
'.gg-panelList,.gg-sideList,.gg-detailL{list-style:none;display:flex;flex-direction:column;gap:13px}',
'.gg-panelList li,.gg-sideList li,.gg-detailL li{position:relative;padding-left:30px;color:var(--ink2);line-height:1.44}',
'.gg-panelList li:before,.gg-sideList li:before,.gg-detailL li:before{content:"";position:absolute;left:6px;top:.52em;' +
  'width:9px;height:9px;border-radius:50%;background:var(--acc);opacity:.8}',
'.gg-panelList em,.gg-sideList em{font-style:normal;color:var(--dim);font-size:.86em}',
'.gg-split{fill:none;stroke:var(--line);stroke-width:2.4;stroke-dasharray:10 12}',
'.gg-sideLb{font-weight:800;letter-spacing:var(--tight)}',
'.gg-sideVal{font-weight:800;color:var(--acc);letter-spacing:-.02em}',
/* 분해도 */
'.gg-layer{position:absolute;background:var(--panel);border:1.5px solid var(--pline);border-radius:16px;' +
  'display:flex;align-items:center;gap:20px;padding:0 30px;backdrop-filter:blur(6px)}',
'.gg-layerLb{font-weight:700;flex:0 0 auto}',
'.gg-layerNote{font-size:22px;color:var(--dim);margin-left:auto}',
/* 줌 디테일 */
'.gg-detail{position:absolute;background:var(--panel);border:1.5px solid var(--acc);border-radius:20px;padding:30px 34px;' +
  'display:flex;flex-direction:column;gap:16px;backdrop-filter:blur(10px);z-index:30}',
'.gg-detailT{font-weight:800;color:var(--acc)}',
/* 지표 */
'.gg-stat{position:absolute;display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px}',
'.gg-statIc{margin-bottom:4px}',
/* 숫자에 글로우를 걸면 큰 글자가 뿌옇게 번져 읽는 속도가 떨어진다 — 아이콘·룰라인에만 쓴다 */
'.gg-num{font-weight:800;line-height:1;letter-spacing:-.035em;color:var(--ink);display:flex;align-items:baseline;gap:.04em}',
'.gg-pre,.gg-unit{color:var(--acc);font-weight:700}',
'.gg-val{font-variant-numeric:tabular-nums}',
'.gg-statLb{color:var(--ink2);font-weight:600;line-height:1.36}',
'.gg-statNote{font-size:22px;color:var(--dim)}',
/* 타임라인 */
'.gg-axis{fill:none;stroke:var(--line);stroke-width:2.6;stroke-linecap:round}',
'.gg-dot{fill:var(--bg);stroke:var(--acc);stroke-width:3.4}',
'.gg-ev{position:absolute;display:flex;flex-direction:column;gap:7px}',
'.gg-evWhen{font-size:23px;font-weight:800;color:var(--acc);letter-spacing:.1em}',
'.gg-evLb{font-weight:700;line-height:1.3}',
'.gg-evNote{font-size:21px;color:var(--dim);line-height:1.4}',
/* 수렴 · 발산 · 궤도 */
'.gg-chip{position:absolute;background:var(--panel);border:1.5px solid var(--pline);border-radius:16px;' +
  'padding:16px 14px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;backdrop-filter:blur(6px)}',
'.gg-chipLb{font-weight:700;line-height:1.28}',
'.gg-flow{fill:none;stroke:var(--acc);stroke-width:2.2;opacity:.45;stroke-linecap:round;stroke-dasharray:0}',
'.gg-flowDot{position:absolute;width:18px;height:18px;border-radius:50%;background:var(--acc);' +
  'box-shadow:0 0 16px var(--acc);z-index:15;pointer-events:none}',
'.gg-target,.gg-center{position:absolute;background:var(--panel);border:2px solid var(--acc);border-radius:24px;' +
  'padding:26px 22px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;' +
  'text-align:center;backdrop-filter:blur(9px);z-index:20;box-shadow:0 0 0 8px ' + T.accent + '14}',
'.gg-targetLb,.gg-centerLb{font-weight:800;letter-spacing:var(--tight)}',
'.gg-targetNote{font-size:22px;color:var(--dim)}',
'.gg-ring{fill:none;stroke:var(--line);stroke-width:2;stroke-dasharray:6 10}',
'.gg-orbit{position:absolute;will-change:transform}',
'.gg-sat{position:absolute}',
'.gg-satIn{background:color-mix(in srgb,' + T.bg + ' 84%,' + T.ink + ');border:1.5px solid var(--pline);' +
  'border-radius:16px;padding:15px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}',
'.gg-satLb{font-weight:700;line-height:1.24}',
/* 매치컷 */
'.gg-anchor{position:absolute;display:grid;place-items:center;z-index:20}',
'.gg-anchorT{font-weight:900;color:var(--acc);letter-spacing:-.04em;line-height:1;' + glow + '}',
'.gg-mc{position:absolute}',
'.gg-mcT{font-weight:800;letter-spacing:var(--tight);line-height:1.14}',
/* 롤 — 마스크 안에서 두 줄이 굴러 교체된다 */
'.gg-roll{overflow:hidden;position:relative}',
'.gg-rollIn{display:flex;flex-direction:column;height:200%}',
/* 롤 칸은 각자 절반을 차지하고 그 안에서 세로 중앙 — 밖에서 쓰던 margin 은 지운다.
   남겨 두면 자식이 아래로 밀려 마스크에 잘린다.
   .gg-mcS 같은 규칙과 특정도가 같으면 나중 규칙이 이기므로, 부모를 붙여 확실히 눌러 둔다. */
'.gg-mcRoll .gg-rollIn>*{flex:0 0 50%;display:flex;align-items:center;justify-content:center;' +
  'margin:0;line-height:1.24;padding:0}',
'.gg-rollSub{margin-top:18px}',
'.gg-mcS{margin-top:18px;color:var(--ink2);line-height:1.48}',
/* 카메라 여정 */
'.gg-route{fill:none;stroke:var(--acc);stroke-width:2.4;opacity:.4;stroke-dasharray:8 12;stroke-linecap:round}',
/* 경로선이 카드 위를 지나므로 배경을 불투명하게 섞는다 — 반투명이면 선이 카드 안에 비친다 */
'.gg-stop{position:absolute;background:color-mix(in srgb,' + T.bg + ' 86%,' + T.ink + ');' +
  'border:1.5px solid var(--pline);border-radius:20px;padding:22px 20px;' +
  'display:flex;flex-direction:column;gap:11px}',
'.gg-stopNo{font-size:21px;font-weight:800;color:var(--acc);letter-spacing:.16em}',
'.gg-stopLb{font-weight:700;line-height:1.3}',
'.gg-stopNote{font-size:21px;color:var(--dim);line-height:1.42}',
/* 인용 · 키네틱 */
'.gg-quote{position:absolute}',
'.gg-qm{font-family:Georgia,serif;color:var(--acc);opacity:.5;line-height:.7;height:.42em}',
'.gg-qt{font-weight:600;line-height:1.44;letter-spacing:var(--tight);color:var(--ink);margin-top:14px}',
'.gg-qby{margin-top:34px;color:var(--acc);font-weight:700}',
'.gg-qrole{color:var(--dim);font-weight:400}',
/* 세로 중앙은 래퍼가 잡는다 — 줄이 접혀도 실제 높이 기준으로 가운데에 선다.
   transform 을 래퍼에 두어야 GSAP 이 안쪽 글자에 거는 transform 과 부딪히지 않는다. */
'.gg-kstack,.gg-kcut{position:absolute;transform:translateY(-50%)}',
'.gg-kl{font-weight:900;line-height:1.1;letter-spacing:var(--tight);will-change:transform}',
/* 플레이어 */
/* 플레이어는 마우스를 올리기 전까지 완전히 숨는다 — 화면에 남는 건 작품뿐이어야 한다.
   opacity 0 이어도 hover 와 키보드 포커스는 그대로 잡힌다. */
'.gg-player{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:100;display:flex;align-items:center;gap:14px;' +
  'padding:11px 18px;border-radius:999px;background:rgba(10,12,20,.72);border:1px solid rgba(255,255,255,.14);' +
  'backdrop-filter:blur(14px);font:500 14px/1 var(--font);color:#fff;opacity:0;transition:opacity .22s ease-out}',
/* 마우스를 정확히 올리기 어려우므로 감지 영역만 넓힌다(보이는 크기는 그대로).
   z-index:-1 이 없으면 absolute 인 이 판이 static 인 버튼들 위에 놓여 클릭을 가로챈다. */
'.gg-player::before{content:"";position:absolute;inset:-26px -20px;border-radius:999px;z-index:-1}',
'.gg-player:hover,.gg-player:focus-within{opacity:1}',
'.gg-btn{all:unset;position:relative;z-index:1;cursor:pointer;width:30px;height:30px;' +
  'display:grid;place-items:center;border-radius:50%;font-size:15px}',
'.gg-btn:hover{background:rgba(255,255,255,.16)}',
'.gg-btn:focus-visible{outline:2px solid #6ea8ff;outline-offset:2px}',
'.gg-bar{position:relative;z-index:1;width:min(46vw,540px);height:6px;border-radius:3px;' +
  'background:rgba(255,255,255,.2);cursor:pointer}',
'.gg-prog{position:absolute;left:0;top:0;height:100%;width:0;border-radius:3px;background:#fff}',
'.gg-tick{position:absolute;top:-3px;width:2px;height:12px;background:rgba(255,255,255,.5);border-radius:1px}',
'.gg-time{font-variant-numeric:tabular-nums;opacity:.85;min-width:88px;text-align:right;font-size:13px}',
'.gg-hint{position:fixed;left:50%;bottom:76px;transform:translateX(-50%);z-index:100;font:500 13px/1 var(--font);' +
  'color:var(--ink2);opacity:0;transition:opacity .3s;pointer-events:none}',
'.gg-hint.on{opacity:.7}',
/* 감소 모션에서도 숨김을 유지한다. 대신 키보드로 닿을 수 있고(Tab → focus-within),
   Space·R·F 조작키는 플레이어 없이도 동작한다. */
'@media print{.gg-player,.gg-hint,.gg-pbar,.gg-pno{display:none}}',
/* ---------------- 발표 모드 ---------------- */
/* 발표 화면 — 청중이 보는 쪽. 장식은 최소로 둔다 */
'.gg-pbar{position:fixed;left:0;bottom:0;width:100%;height:4px;z-index:100;background:rgba(255,255,255,.12)}',
'.gg-pfill{height:100%;width:0;background:var(--acc);transition:width .35s ease-out}',
'.gg-pno{position:fixed;right:18px;bottom:16px;z-index:100;font:600 13px/1 var(--font);' +
  'color:var(--ink2);opacity:.5;font-variant-numeric:tabular-nums}',
'.gg-black{position:fixed;inset:0;z-index:200;background:#000}',
/* 씬 목록 오버레이 */
'.gg-toc{position:fixed;inset:0;z-index:150;background:rgba(6,8,14,.86);backdrop-filter:blur(8px);' +
  'display:grid;place-items:center;font-family:var(--font)}',
'.gg-tocIn{width:min(760px,86vw);max-height:80vh;overflow:auto;color:#fff}',
'.gg-tocIn h3{font-size:15px;letter-spacing:.02em;margin-bottom:14px;opacity:.8;font-weight:700}',
'.gg-tocIn h3 small{font-weight:400;opacity:.6;margin-left:8px;font-size:12px}',
'.gg-tocIn ol{list-style:none;display:flex;flex-direction:column;gap:2px}',
'.gg-tocIn li{display:flex;align-items:baseline;gap:12px;padding:9px 12px;border-radius:8px;cursor:pointer;font-size:14px}',
'.gg-tocIn li:hover{background:rgba(255,255,255,.1)}',
'.gg-tocIn li.on{background:var(--acc);color:#06080e}',
'.gg-tocIn li b{min-width:20px;opacity:.6;font-variant-numeric:tabular-nums}',
'.gg-tocIn li span{flex:1;font-weight:600}',
'.gg-tocIn li em{font-style:normal;opacity:.5;font-size:12px}',
/* 발표자 창 — ?presenter=1 */
'.gg-presenter{position:fixed;inset:0;z-index:300;background:#0c0e14;color:#e7ebf5;' +
  'font-family:var(--font);display:grid;grid-template-rows:auto 1fr auto auto;gap:0}',
'.gg-presenter header{display:flex;align-items:center;gap:16px;padding:14px 20px;' +
  'border-bottom:1px solid rgba(255,255,255,.1);font-size:14px}',
'.gg-pcount{font-weight:800;font-variant-numeric:tabular-nums;font-size:17px}',
'.gg-ptitle{flex:1;opacity:.6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
'.gg-ptimer{font-variant-numeric:tabular-nums;font-size:20px;font-weight:700}',
'.gg-pbtn{all:unset;cursor:pointer;padding:6px 11px;border-radius:7px;font-size:12px;' +
  'background:rgba(255,255,255,.1)}',
'.gg-pbtn:hover{background:rgba(255,255,255,.2)}',
'.gg-pmain{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:20px;padding:18px 20px;min-height:0}',
'.gg-presenter h4{font-size:11px;letter-spacing:.14em;text-transform:uppercase;opacity:.45;' +
  'margin-bottom:9px;font-weight:700}',
/* 다음 씬 미리보기 — 스테이지를 이 안으로 옮겨 축소한다 */
'.gg-pstage{position:relative;width:100%;aspect-ratio:' + A.w + '/' + A.h + ';max-height:58vh;' +
  'border-radius:10px;overflow:hidden;background:#000;border:1px solid rgba(255,255,255,.12)}',
'.gg-pnext{display:flex;flex-direction:column;min-height:0}',
'.gg-pstage .gg-fit{position:absolute;inset:0}',
'.gg-pnextT{margin-top:11px;font-size:15px;font-weight:700;line-height:1.35}',
'.gg-pnotes{min-height:0;overflow:auto}',
'.gg-pnotes p{font-size:16px;line-height:1.6;margin-bottom:20px;white-space:pre-wrap}',
'.gg-pnow{color:#fff}',
'.gg-pnn{opacity:.5}',
'.gg-plist{border-top:1px solid rgba(255,255,255,.1);padding:10px 20px;max-height:22vh;overflow:auto}',
'.gg-plist ol{list-style:none;display:flex;flex-wrap:wrap;gap:6px}',
'.gg-plist li{padding:5px 10px;border-radius:6px;background:rgba(255,255,255,.07);font-size:12px;cursor:pointer}',
'.gg-plist li:hover{background:rgba(255,255,255,.16)}',
'.gg-plist li.on{background:var(--acc);color:#06080e;font-weight:700}',
'.gg-presenter footer{padding:10px 20px;border-top:1px solid rgba(255,255,255,.1);' +
  'font-size:12px;opacity:.45}',
'@media (max-width:820px){.gg-pmain{grid-template-columns:1fr}}'
  ].join('\n');
}

/* ================================================================== *
 * toHTML — 단일 파일 산출물.
 *  opts: {clean(플레이어 제거), noFonts, cdn(GSAP 을 CDN 으로), gsap(번들 소스 주입), runtime(런타임 소스 주입)}
 * ================================================================== */
var PRETENDARD_CDN =
  '<link rel="preconnect" href="https://cdn.jsdelivr.net">' +
  '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css">';

/**
 * 쓰는 폰트만 링크를 건다. 구글 폰트는 여러 family 를 한 요청에 묶을 수 있어
 * 본문과 고정폭을 같이 써도 요청이 하나다.
 */
function fontLinks(F, mono) {
  var out = [], fams = [];
  /* 프리텐다드는 대체 스택에도 들어 있어, 다른 폰트를 골라도 받쳐 두면 한글이 안 깨진다 */
  if (F.pre || /Pretendard/.test(F.stack)) out.push(PRETENDARD_CDN);
  if (F.g) fams.push(F.g);
  if (mono) fams.push(MONO.g);
  if (fams.length) {
    out.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?' +
      fams.map(function (f) { return 'family=' + f; }).join('&') + '&display=swap">');
  }
  return out.join('');
}
function grainSVG() {
  return '<svg class="gg-grain" aria-hidden="true"><filter id="ggGrain">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" stitchTiles="stitch"/>' +
    '<feColorMatrix type="saturate" values="0"/></filter>' +
    '<rect width="100%" height="100%" filter="url(#ggGrain)"/></svg>';
}
function toHTML(spec, opts) {
  opts = opts || {};
  var c = compile(spec, { cues: opts.cues, captions: opts.captions });
  var A = ASPECTS[c.aspect], T = THEMES[c.theme], F = FONTS[c.font] || FONTS[T.font];

  /* 런타임에 넘길 IR — 필요한 것만. 사람이 열어 봐도 읽히게 최소로 유지한다. */
  /* 발표 모드는 씬 단위로 넘기는 게 전제다 — mode 를 step 으로 강제한다 */
  var mode = opts.present ? 'step' : c.mode;
  var ir = {
    w: A.w, h: A.h, total: c.total, mode: mode, theme: c.theme, energy: c.energy,
    present: !!opts.present, title: c.title || '',
    scenes: c.scenes.map(function (s) {
      return { sid: s.sid, id: s.id, pattern: s.pattern, at: s.at, dur: s.dur, ce: s.contentEnd,
               ts: s.ts != null && s.ts !== 1 ? s.ts : undefined,
               trans: s.trans, tdur: s.tdur, tw: s.tw,
               head: oneLine(s.title, 60), notes: opts.present ? s.notes : undefined };
    })
  };
  /* 음성·화면 자막 — 자막으로 타이밍을 맞췄을 때만 의미가 있다 */
  if (opts.audioSrc) {
    var au = spec.audio && typeof spec.audio === 'object' ? spec.audio : {};
    ir.audio = { offset: num(au.offset, 0), volume: au.volume != null ? au.volume : null };
  }
  /* 발표용 산출물에는 화면 자막을 싣지 않는다 — 말은 발표자가 하고, 청중 화면에
     같은 문장이 또 뜨면 방해가 된다. 자막으로 맞춘 타이밍(cues)은 그대로 쓴다. */
  var wantCC = !!(opts.captions && opts.captions.length) && !opts.present;
  if (wantCC) {
    ir.captions = opts.captions.map(function (x) { return { s: r2(x.start), e: r2(x.end), t: esc(x.text) }; });
  }
  var trans = {};
  Object.keys(TRANSITIONS).forEach(function (k) {
    trans[k] = { out: TRANSITIONS[k].out, inFrom: TRANSITIONS[k].inFrom };
  });

  var useMono = needsMono(spec);
  var runtime = opts.runtime || readAsset('runtime.js');
  /* replace 는 대체문자열의 $ 패턴을 특수 처리한다 — 함수로 넘겨 회피한다 */
  runtime = runtime.replace('__SPEC__', function () { return JSON.stringify(ir); })
                   .replace('__TRANS__', function () { return JSON.stringify(trans); });
  var gsapSrc = opts.cdn ? null : (opts.gsap || readAsset('gsap.bundle.js'));

  var scenesHTML = c.scenes.map(function (s, i) {
    /* fixed 레이어는 world 밖에 붙인다 — 카메라가 움직여도 헤더·상세 패널은 제자리에 서 있어야 한다 */
    return '<section class="gg-scene" id="' + s.sid + '" data-pattern="' + s.pattern + '" data-id="' + esc(s.id) + '"' +
      ' style="z-index:' + (i + 1) + '" aria-label="' + esc((i + 1) + '. ' + (s.title || s.pattern)) + '">' +
      (s.decor ? '<div class="gg-decorL">' + s.decor + '</div>' : '') +
      '<div class="gg-world">' + s.html + '</div>' +
      (s.fixed ? '<div class="gg-fixed">' + s.fixed + '</div>' : '') +
      '</section>';
  }).join('\n');

  var presentUI = !opts.present ? '' : [
    '<div class="gg-pbar" aria-hidden="true"><div class="gg-pfill"></div></div>',
    '<div class="gg-pno" role="status" aria-live="polite">1 / ' + c.scenes.length + '</div>',
    '<div class="gg-black" hidden></div>',
    '<div class="gg-toc" hidden role="dialog" aria-label="씬 목록"><div class="gg-tocIn">' +
      '<h3>씬 목록 <small>숫자키로 이동 · O 닫기</small></h3><ol>' +
      c.scenes.map(function (s, i) {
        return '<li data-i="' + i + '"><b>' + (i + 1) + '</b><span>' + esc(oneLine(s.title || s.pattern, 52)) + '</span>' +
          '<em>' + s.pattern + ' · ' + s.dur + 's</em></li>';
      }).join('') + '</ol></div></div>',
    '<div class="gg-hint" role="status" aria-live="polite"></div>'
  ].join('');

  /* 발표자 창 — 같은 파일을 ?presenter=1 로 열면 이 화면이 된다 */
  var presenterUI = !opts.present ? '' :
    '<div class="gg-presenter" hidden>' +
    '<header><span class="gg-pcount">1 / ' + c.scenes.length + '</span>' +
    '<span class="gg-ptitle">' + esc(c.title || '') + '</span>' +
    '<span class="gg-ptimer" role="timer">00:00</span>' +
    '<button class="gg-pbtn" data-a="reset">타이머 초기화</button></header>' +
    '<div class="gg-pmain">' +
    '<section class="gg-pnext"><h4>다음 씬</h4><div class="gg-pstage"></div><div class="gg-pnextT"></div></section>' +
    '<section class="gg-pnotes"><h4>지금 씬 노트</h4><p class="gg-pnow"></p>' +
    '<h4>다음 씬 노트</h4><p class="gg-pnn"></p></section>' +
    '</div>' +
    '<div class="gg-plist"><ol></ol></div>' +
    '<footer>← → 이동 · B 검은 화면 · O 씬 목록 · 이 창에서 조작하면 발표 화면도 함께 움직입니다</footer>' +
    '</div>';

  var hasCC = wantCC;
  var player = (opts.clean || opts.present) ? '' :
    '<div class="gg-player" role="group" aria-label="재생 조작">' +
    '<button class="gg-btn" data-a="toggle" aria-label="재생/일시정지">❚❚</button>' +
    '<div class="gg-bar" role="slider" aria-label="진행" tabindex="0"><div class="gg-prog"></div></div>' +
    '<span class="gg-time">0.0 / ' + c.total.toFixed(1) + 's</span>' +
    (hasCC ? '<button class="gg-btn gg-ccBtn" data-a="cc" aria-label="자막 켜기·끄기" aria-pressed="true">CC</button>' : '') +
    '<button class="gg-btn" data-a="rate" aria-label="속도">1×</button>' +
    '<button class="gg-btn" data-a="replay" aria-label="처음부터">↺</button>' +
    '</div><div class="gg-hint" role="status" aria-live="polite"></div>';

  var title = c.title || (c.scenes[0] && c.scenes[0].title) || '모션그래픽';
  return [
'<!DOCTYPE html>',
'<html lang="ko">',
'<head>',
'<meta charset="utf-8">',
'<meta name="viewport" content="width=device-width,initial-scale=1">',
'<title>' + esc(title) + '</title>',
opts.noFonts ? '' : fontLinks(F, useMono),
'<style>',
css(c),
'</style>',
'</head>',
'<body>',
'<div class="gg-fit">',
'<div class="gg-scale">',
'<main class="gg-stage" role="img" aria-label="' + esc(title) + (c.message ? ' — ' + esc(c.message) : '') + '">',
scenesHTML,
'<div class="gg-flash" aria-hidden="true"></div>',
hasCC ? '<div class="gg-captions" id="gg-cc" aria-live="off"></div>' : '',
T.vig ? '<div class="gg-vig" aria-hidden="true"></div>' : '',
T.grain ? grainSVG() : '',
'</main>',
'</div>',
'</div>',
opts.audioSrc ? '<audio id="gg-audio" preload="auto" src="' + opts.audioSrc + '"></audio>' : '',
presentUI,
presenterUI,
player,
opts.cdn
  ? ['<script src="https://cdn.jsdelivr.net/npm/gsap@' + GSAP_VERSION + '/dist/gsap.min.js"></script>',
     '<script src="https://cdn.jsdelivr.net/npm/gsap@' + GSAP_VERSION + '/dist/CustomEase.min.js"></script>',
     '<script src="https://cdn.jsdelivr.net/npm/gsap@' + GSAP_VERSION + '/dist/CustomWiggle.min.js"></script>',
     '<script src="https://cdn.jsdelivr.net/npm/gsap@' + GSAP_VERSION + '/dist/DrawSVGPlugin.min.js"></script>',
     '<script src="https://cdn.jsdelivr.net/npm/gsap@' + GSAP_VERSION + '/dist/MorphSVGPlugin.min.js"></script>',
     '<script src="https://cdn.jsdelivr.net/npm/gsap@' + GSAP_VERSION + '/dist/SplitText.min.js"></script>',
     '<script src="https://cdn.jsdelivr.net/npm/gsap@' + GSAP_VERSION + '/dist/MotionPathPlugin.min.js"></script>'].join('\n')
  : '<script>' + gsapSrc + '</script>',
'<script>' + runtime + '</script>',
'</body>',
'</html>'
  ].filter(function (x) { return x !== ''; }).join('\n');
}

/* node 에서만 쓰는 에셋 로더 — 브라우저에서는 opts 로 소스를 주입한다. */
function readAsset(name) {
  if (typeof require !== 'function') throw new Error('브라우저에서는 opts.' + name.split('.')[0] + ' 로 소스를 넘겨야 한다');
  var fs = require('fs'), path = require('path');
  return fs.readFileSync(path.join(__dirname, name), 'utf8');
}

/* ================================================================== *
 * timing — 씬별 타임코드 시트. 편집기에 넣을 때·검수할 때 쓴다.
 * ================================================================== */
function timing(spec, fps, opts) {
  var c = compile(spec, opts), f = num(fps, 30), rows = [['씬', 'id', 'pattern', '시작', '끝', '길이', '시작프레임', '끝프레임', '트랜지션', '용도']];
  c.scenes.forEach(function (s, i) {
    rows.push([i + 1, s.id, s.pattern, tc(s.at), tc(s.at + s.dur), s.dur.toFixed(2),
      Math.round(s.at * f), Math.round((s.at + s.dur) * f), s.trans, s.purpose]);
  });
  rows.push(['', '', '합계', tc(0), tc(c.total), c.total.toFixed(2), 0, Math.round(c.total * f), '', '']);
  return rows.map(function (r) {
    return r.map(function (v) { return /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v; }).join(',');
  }).join('\n');
}

/* ================================================================== *
 * export
 * ================================================================== */
return {
  version: VERSION, gsapVersion: GSAP_VERSION,
  validate: validate, toHTML: toHTML, timing: timing, compile: compile,
  parseSubtitles: parseSubtitles,
  itemKeys: function () { return ITEM_KEYS.slice(); },
  get patterns() {
    var o = {};
    Object.keys(PATTERNS).forEach(function (k) { o[k] = { label: PATTERNS[k].label, use: PATTERNS[k].use, fields: PATTERNS[k].fields, max: MAXITEMS[k] || null }; });
    return o;
  },
  /** 테마의 색만 뽑아 준다 — 대비 검사가 쓴다 */
  themeColors: function () {
    var o = {};
    Object.keys(THEMES).forEach(function (k) {
      var T = THEMES[k];
      o[k] = { bg: T.bg, bg2: T.bg2, ink: T.ink, ink2: T.ink2, dim: T.dim,
               accent: T.accent, accent2: T.accent2, good: T.good, warn: T.warn, bad: T.bad };
    });
    return o;
  },
  get fonts() {
    var o = {};
    Object.keys(FONTS).forEach(function (k) { o[k] = FONTS[k].label; });
    return o;
  },
  get themes() { var o = {}; Object.keys(THEMES).forEach(function (k) { o[k] = THEMES[k].label; }); return o; },
  get transitions() { var o = {}; Object.keys(TRANSITIONS).forEach(function (k) { o[k] = TRANSITIONS[k].label; }); return o; },
  get energies() { var o = {}; Object.keys(ENERGY).forEach(function (k) { o[k] = ENERGY[k].label; }); return o; },
  get aspects() { var o = {}; Object.keys(ASPECTS).forEach(function (k) { o[k] = ASPECTS[k].w + '×' + ASPECTS[k].h + ' — ' + ASPECTS[k].label; }); return o; },
  tokens: TOKENS,
  get decors() { var o = {}; Object.keys(VEC.DECOR).forEach(function (k) { o[k] = VEC.DECOR[k].label; }); return o; },
  get marks() { var o = {}; Object.keys(VEC.MARK).forEach(function (k) { o[k] = VEC.MARK[k].label; }); return o; },
  get frames() { var o = {}; Object.keys(VEC.FRAME).forEach(function (k) { o[k] = VEC.FRAME[k].label; }); return o; },
  get arts() { var o = {}; Object.keys(VEC.ART).forEach(function (k) { o[k] = VEC.ART[k].label; }); return o; },
  get charts() {
    var o = {};
    Object.keys(CH.CHARTS).forEach(function (k) { o[k] = CH.CHARTS[k].label; });
    return o;
  },
  chartUse: function (k) { return CH.CHARTS[k] && CH.CHARTS[k].use; },
  icons: function (q) { return ICO.iconSearch(q); },
  iconAliases: function (k) { return ICO.iconAliases(k); },
  iconCount: ICO.count
};
}));
