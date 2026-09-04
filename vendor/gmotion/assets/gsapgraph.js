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
    module.exports = factory(require('./icons.js'), require('./vectors.js'), require('./charts.js'), require('./skins.js'), require('./design.js'));
  else root.GG = factory(root.GGIcons, root.GGVectors, root.GGCharts, root.GGSkins, root.GGDesign);
}(typeof self !== 'undefined' ? self : this, function (ICO, VEC, CH, SK, DS) {
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
/** #rrggbb 의 상대 휘도(WCAG). 배경이 밝은 테마인지 가리는 데 쓴다. */
function lum(hex) {
  var h = String(hex).replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length < 6) return 0;
  var c = [0, 1, 2].map(function (i) {
    var v = parseInt(h.substr(i * 2, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
/** #rrggbb 에 16진수 알파를 붙인다 — 헥스가 아니면 그대로 돌려준다(커스텀 테마 방어). */
function tint(hex, aa) {
  return /^#[0-9a-fA-F]{6}$/.test(String(hex)) ? hex + aa : hex;
}
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
    bg: '#0b1020', bg2: '#141b33', ink: '#eef2ff', ink2: '#a5b0d4', dim: '#7783aa',
    accent: '#6ea8ff', accent2: '#a78bfa', good: '#4ade80', warn: '#fbbf24', bad: '#fb7185',
    line: 'rgba(160,180,255,.22)', panel: 'rgba(255,255,255,.05)', panelLine: 'rgba(160,180,255,.16)',
    glow: 1, font: 'display', grain: .04, vig: .42, decor: ['blob', 'grid']
  },
  ink: {
    label: '잉크 — 먹색 배경 + 금색. 다큐·시리즈 오프닝',
    bg: '#111110', bg2: '#1c1b19', ink: '#f5f1e8', ink2: '#b8ae9c', dim: '#8b8271',
    accent: '#d4a24c', accent2: '#c2703d', good: '#8aa76a', warn: '#d99a3c', bad: '#c15f4e',
    line: 'rgba(212,162,76,.22)', panel: 'rgba(245,241,232,.04)', panelLine: 'rgba(212,162,76,.18)',
    glow: 0, font: 'serif', grain: .07, vig: .5, decor: ['arcs', 'topo']
  },
  paper: {
    label: '페이퍼 — 밝은 배경. 지표 리포트·사내 공유',
    bg: '#f7f5f0', bg2: '#ecebe4', ink: '#1b1a17', ink2: '#5c5a52', dim: '#6e695f',
    accent: '#2563eb', accent2: '#7c3aed', good: '#11813b', warn: '#aa5d05', bad: '#da2323',
    line: 'rgba(27,26,23,.14)', panel: 'rgba(255,255,255,.72)', panelLine: 'rgba(27,26,23,.1)',
    glow: 0, font: 'sans', grain: .05, vig: 0, decor: ['arcs', 'dots']
  },
  mono: {
    label: '모노 — 흑백. 타이포 중심, 절제된 톤',
    bg: '#0a0a0a', bg2: '#171717', ink: '#fafafa', ink2: '#a3a3a3', dim: '#818181',
    accent: '#fafafa', accent2: '#d4d4d4', good: '#fafafa', warn: '#a3a3a3', bad: '#797979',
    line: 'rgba(250,250,250,.2)', panel: 'rgba(250,250,250,.05)', panelLine: 'rgba(250,250,250,.14)',
    glow: 0, font: 'sans', grain: .03, vig: .34, decor: ['stripes', 'arcs']
  },
  neon: {
    label: '네온 — 고채도 + 글로우. 쇼츠·런칭·하이에너지',
    bg: '#08070f', bg2: '#151030', ink: '#f5f3ff', ink2: '#c4b5fd', dim: '#8274bd',
    accent: '#22d3ee', accent2: '#f472b6', good: '#34d399', warn: '#fbbf24', bad: '#fb7185',
    line: 'rgba(34,211,238,.3)', panel: 'rgba(124,58,237,.12)', panelLine: 'rgba(34,211,238,.24)',
    glow: 2, font: 'display', grain: .03, vig: .46, decor: ['mesh', 'beams']
  },
  warm: {
    label: '웜 — 크림·테라코타. 브랜드·캠페인 감성',
    bg: '#1a1310', bg2: '#2a1e18', ink: '#fdf6ec', ink2: '#d9bfa8', dim: '#9c8473',
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
  },
  kraft: {
    label: '크래프트 — 갈색 소포지 질감과 따뜻한 잉크. 공예·아날로그·스케치',
    bg: '#e8dcce', bg2: '#dbcaba', ink: '#201812', ink2: '#4a3b2c', dim: '#624f3c',
    accent: '#8b3d18', accent2: '#1b5e50', good: '#246b32', warn: '#8c4a00', bad: '#9c241b',
    line: 'rgba(32,24,18,.16)', panel: 'rgba(255,252,246,.78)', panelLine: 'rgba(32,24,18,.12)',
    glow: 0, font: 'soft', grain: .12, vig: .12, decor: ['creases', 'gridPaper']
  },
  blueprint: {
    label: '블루프린트 — 청사진 종이 배경 + 백색 도면선. 설계·기획·구조도',
    bg: '#0d2847', bg2: '#081c33', ink: '#f0f6fc', ink2: '#9ec5e8', dim: '#6fa0cc',
    accent: '#58a6ff', accent2: '#7ee787', good: '#3fb950', warn: '#f0883e', bad: '#ff7b72',
    line: 'rgba(88,166,255,.24)', panel: 'rgba(13,40,71,.72)', panelLine: 'rgba(88,166,255,.3)',
    glow: 1, font: 'neo', grain: .05, vig: .35, decor: ['gridPaper', 'creases']
  },
  clay: {
    label: '클레이 — 3D 점토 볼륨과 매트 파스텔. 클레이모피즘·스톱모션·친근한 설명',
    bg: '#f0ece4', bg2: '#e2dccf', ink: '#26221d', ink2: '#524b42', dim: '#686054',
    accent: '#a83c16', accent2: '#1a695d', good: '#287538', warn: '#944e00', bad: '#ab2424',
    line: 'rgba(38,34,29,.14)', panel: '#fcfaf6', panelLine: 'rgba(255,255,255,.9)',
    glow: 0, font: 'round', grain: .07, vig: .2, decor: ['clayBlobs', 'dots'],
    /* 테마가 기본 스킨을 정할 수 있다 — 스펙의 skin 이 있으면 그쪽이 이긴다 */
    skin: 'clay'
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
    return sc && sc.pattern === 'deviceShow' &&
      (sc.frame === 'terminal' || sc.frame === 'window' || sc.frame === 'editor');
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
    enter: 'power4.out', exit: 'power2.in', move: 'power3.inOut',
    dramatic: 'expo.out', overshoot: 'back.out(1.4)', soft: 'sine.inOut',
    draw: 'power3.inOut', count: 'power2.out'
  },
  s: { tight: .04, normal: .08, loose: .15 },
  /*
   * 카메라 — 씬이 정지하지 않게 만드는 값들. 슬라이드와 영상을 가르는 건 이 셋이다.
   *   amp   씬 카메라의 진폭. 줌은 배율, 팬·틸트는 화면 크기의 비율
   *   depth 배경 레이어가 카메라를 따라가는 비율. 1 이면 같이 붙어 움직여 깊이가 사라진다
   *   shut  셔터(모션블러) 기본 세기. 스테이지 1920px 기준 px
   */
  cam: { amp: .045, depth: .34, shut: 1 }
};
/* 에너지 레벨 — 지속시간 배율, 등장 이징, 이동 거리 배율, 트랜지션 길이 */
var ENERGY = {
  /* camAmp — 차분한 톤은 카메라가 더 오래·더 멀리 움직이고, 하이에너지는 컷이 이미 빠르므로 덜 움직인다.
     shut — 셔터는 반대다. 빠른 컷일수록 잔상이 강해야 컷이 컷으로 읽힌다. */
  E1: { label: 'E1 차분 — 느린 호흡, 절제된 카메라', dm: 1.35, hm: 1.25, ease: 'power3.out', dist: .8, trans: 1.0, sm: 1.3, camAmp: 1.2, shut: .6 },
  E2: { label: 'E2 표준 — 기본값', dm: 1.0, hm: 1.0, ease: 'power4.out', dist: 1.0, trans: .8, sm: 1.0, camAmp: 1.0, shut: 1 },
  E3: { label: 'E3 하이에너지 — 크래시 줌·오버슈트·비트 컷', dm: .7, hm: .78, ease: 'expo.out', dist: 1.25, trans: .5, sm: .7, camAmp: .7, shut: 1.35 }
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
 *  {k:'scramble', t, at, dur, chars?, speed?, reveal?}   ScrambleText
 *  {k:'roll',  t, at, dur, ease}                  .gg-rollIn 을 밀어 올린다
 *  {k:'type',  t, at, dur, n}                     타자기 — .gg-tw 폭을 n 단계로
 *  어느 op 에나 rm:false 를 달면 감소 모션에서 건너뛴다(중간 프레임용)
 *  amb:1 은 씬 타임라인이 아니라 마스터에 절대 시각으로 실린다 — contentEnd·자막 압축(ts)에 안 잡힌다(카메라·글자 퇴장)
 *  split/scramble/type 의 out:1 은 퇴장(to) 방향
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
/** 타자기 — 인라인 상자의 폭을 0 에서 글자 폭까지 n 단계로 늘린다. 폭은 런타임이 잰다 */
TW.prototype.type = function (t, at, dur, n) {
  return this.push({ k: 'type', t: t, at: r2(at), dur: r2(dur), n: n });
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
    /** 추상 일러스트 — 픽토그램보다 크고 구성적이다. 부분이 스태거로 등장한다.
     *  ART 는 200 박스에 굵기를 값으로 박아 두므로 작게 놓으면 선이 실처럼 얇아진다.
     *  100px 아래로 내려가면 배율만 걸어 올린다 — 굵기 위계(2~16)는 비율 그대로 남는다. */
    art: function (name, size, cls) {
      if (!VEC.ART[name]) return '';
      var z = num(size, 300), svg = VEC.ART[name].build(T);
      if (z < 100) {
        var k = 100 / z;
        svg = svg.replace(/stroke-width="([0-9.]+)"/g, function (m, w) { return 'stroke-width="' + r2(w * k) + '"'; });
      }
      return '<div class="gg-artBox ' + (cls || '') + '" style="width:' + z + 'px;height:' + z + 'px">' + svg + '</div>';
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
/* ------------------------------------------------------------------ *
 * 인라인 강조 — `*낱말*` 은 그 낱말만 accent 색이 되고, mark 가 있으면 그 낱말에 붙는다.
 * title · sub · quote text · kineticType lines · matchCut 제목이 받는다.
 * 글자 폭·읽는 시간·길이 검사는 표식을 뺀 글자(plain)로 잰다.
 * ------------------------------------------------------------------ */
var EM_RE = /\*([^*\n]+)\*/g;
function hasEm(s) { return /\*[^*\n]+\*/.test(String(s == null ? '' : s)); }
function plain(s) { return String(s == null ? '' : s).replace(EM_RE, '$1'); }
function emText(s) {
  return esc(s).replace(EM_RE, function (m, w) { return '<em class="gg-em">' + w + '</em>'; });
}
/*
 * 글자 등장 방식(textFx). 마스크 리빌이 기본이고 나머지는 그 자리를 대신한다.
 *  scramble    글자가 섞이다 정렬 (ScrambleText)
 *  typewriter  한 글자씩 찍힌다 — 커서가 따라오고 마지막 줄에서 깜박인다
 *  blur        흐림이 걷히며 맺힌다
 *  wipe        왼쪽에서 오른쪽으로 닦아 낸다 (clip-path)
 *  flip        글자가 아래 축으로 넘어와 선다 (SplitText chars + rotationX)
 *  glitch      몇 프레임 찢기고 어긋난 뒤 맺힌다 (x·clip-path·색분리 set 연쇄)
 *  outline     테두리만 서 있다가 속이 차오른다 (-webkit-text-stroke → color)
 *  roll        굴러 교체 — matchCut 만
 * 헤더(head)·kineticType·quote 가 같은 fxInner / revealText 를 쓴다.
 */
var TEXT_FX = {
  scramble:   { label: '스크램블 — 글자가 섞이다 정렬된다' },
  typewriter: { label: '타자기 — 한 글자씩 찍힌다. 커서가 따라온다' },
  blur:       { label: '블러 — 흐림이 걷히며 맺힌다' },
  wipe:       { label: '와이프 — 왼쪽에서 오른쪽으로 닦아 낸다' },
  flip:       { label: '플립 — 글자가 아래 축으로 넘어와 선다' },
  glitch:     { label: '글리치 — 찢기고 어긋난 뒤 맺힌다 (neon·E3)' },
  outline:    { label: '아웃라인 — 테두리만 서 있다가 속이 차오른다' },
  roll:       { label: '롤 — 굴러 교체된다 (matchCut 전용)' }
};
/** 마스크를 열어 두는 등장 — 마스크 밖으로 번지거나(blur) 축을 넘어 돌거나(flip) 어긋난다(glitch) */
function fxOpen(fx) { return fx === 'blur' || fx === 'flip' || fx === 'glitch'; }
/** 한 줄의 안쪽 마크업 — typewriter·wipe 는 글자 폭만큼의 인라인 상자가 필요하다 */
function fxInner(body, fx) {
  if (fx === 'typewriter') return '<span class="gg-in"><span class="gg-tw">' + body + '</span></span>';
  if (fx === 'wipe') return '<span class="gg-in">' + body + '</span>';
  return body;
}
function maskLines(text, cls, markSVG, fx) {
  var L = splitLines(text);
  /* 마크는 `*낱말*` 이 있으면 그 낱말(마지막 줄부터 찾는다)에, 없으면 마지막 줄의 글자 폭에 붙는다 —
     블록 폭에 맞추면 동그라미가 문장을 다 감싼다. */
  var emLine = -1;
  if (markSVG) for (var k = L.length - 1; k >= 0; k--) if (hasEm(L[k])) { emLine = k; break; }
  return L.map(function (l, i) {
    var body;
    if (i === emLine) {
      var first = true;
      body = esc(l).replace(EM_RE, function (m, w) {
        if (!first) return '<em class="gg-em">' + w + '</em>';
        first = false;
        return '<em class="gg-em gg-hasMark">' + w + markSVG + '</em>';
      });
    } else body = emText(l);
    /* blur·flip·glitch 는 마스크 밖으로 나가야 한다 — 잘리면 흐림이 아니라 네모다.
       outline 은 --sw(테두리 두께)를 트윈할 수 있게 클래스를 단다. */
    var inner = '<span class="gg-mask' + (fxOpen(fx) ? ' gg-open' : '') + '"><span class="gg-mk ' + (cls || '') +
      (fx === 'outline' ? ' gg-ol' : '') + '" data-l="' + i + '">' + fxInner(body, fx) + '</span></span>';
    /* gg-line 이 inline-block 이라 폭이 글자만큼이 되고, 마스크 밖이라 잘리지 않는다. */
    if (markSVG && emLine < 0 && i === L.length - 1) return '<span class="gg-line gg-hasMark">' + inner + markSVG + '</span>';
    return inner;
  }).join('');
}
/**
 * 텍스트 등장 IR 을 쓴다. sel 은 .gg-mk 들을 잡는 셀렉터(줄마다 data-l), text 는 줄 수·글자 수를
 * 세기 위한 원문. o: { dur(기본 normal), st(줄 스태거), yp(마스크 리빌 이동량 %), ease,
 * cursorOff(타자기 — 마지막 줄의 커서도 끈다. 다음 줄이 따로 revealText 로 이어질 때) }
 * 반환: 등장이 "읽히기 시작하는" 시점의 증가분이 반영된 t — 기존 마스크 리빌의 셈법을 유지한다.
 */
function revealText(tw, ctx, sel, text, fx, t, o) {
  o = o || {};
  var L = splitLines(text), n = L.length;
  var dur = num(o.dur, ctx.d('normal')), st = num(o.st, ctx.st('normal'));
  if (fx === 'scramble') {
    tw.scramble(sel, t, ctx.d('slow') * 1.15, { speed: .7, reveal: .2 });
    return t + ctx.d('slow') * .9;
  }
  if (fx === 'typewriter') {
    /* 줄마다 글자 수가 다르니 op 도 줄마다. 커서는 찍는 동안만 보이고 마지막 줄에 남아 깜박인다. */
    var tt = t, step = .055 * ctx.E.dm;
    L.forEach(function (l, i) {
      var s = sel + '[data-l="' + i + '"] .gg-tw', cnt = plain(l).length;
      var d = r2(clamp(cnt * step, .4, 2.4));
      tw.set(s, 0, { borderRightWidth: 0 });
      tw.set(s, tt, { borderRightWidth: '0.07em' });   /* '.07em' 은 GSAP 이 0 으로 읽는다 — 앞자리 0 을 붙인다 */
      tw.type(s, tt, d, cnt);
      tt += d;
      if (i < n - 1 || o.cursorOff) tw.set(s, tt + ctx.d('micro'), { borderRightWidth: 0 });
      if (i < n - 1) tt += ctx.d('micro');
    });
    return tt;
  }
  if (fx === 'blur') {
    tw.from(sel, t, { filter: 'blur(18px)', opacity: 0, scale: 1.05, duration: dur * 1.5, ease: TOKENS.e.move }, st * 1.4);
    return t + dur * 1.1 + st * 1.4 * (n - 1);
  }
  if (fx === 'wipe') {
    /* 위아래 여유를 크게 둔다 — 낱말에 붙은 마크(밑줄 -.26em, 동그라미 124%)가 상자 밖에 있다 */
    tw.fromTo(sel + ' .gg-in', t, { clipPath: 'inset(-40% 110% -40% -10%)' },
      { clipPath: 'inset(-40% -10% -40% -10%)', duration: dur * 1.25, ease: TOKENS.e.move }, st * 1.2);
    return t + dur * .9 + st * 1.2 * (n - 1);
  }
  if (fx === 'flip') {
    /* 글자마다 아래 축으로 넘어와 선다. 마스크는 열려 있으니(gg-open) 위로 삐져 나가도 잘리지 않는다 */
    tw.split(sel, t, 'chars', { rotationX: -92, opacity: 0, transformOrigin: '50% 100%', transformPerspective: 640,
      duration: dur * 1.1, ease: TOKENS.e.overshoot }, ctx.st('tight'));
    var cnt = plain(text).replace(/\s/g, '').length;
    return t + dur * .6 + ctx.st('tight') * Math.max(0, cnt - 1) * .6;
  }
  if (fx === 'glitch') {
    /* 여섯 프레임 — 좌우로 어긋나고 가로로 찢기고 색이 갈린 뒤 한 번에 맺힌다. 트윈이 아니라 set 연쇄라
       감소 모션에서는 프레임을 건너뛰고 마지막 상태만 남긴다(rm:false). 줄마다 조금씩 늦게. */
    var FR = [[7, 'inset(0 0 62% 0)'], [-8, 'inset(38% 0 0 0)'], [5, 'inset(18% 0 46% 0)'],
              [-4, 'inset(55% 0 12% 0)'], [3, 'inset(0 0 30% 0)'], [-2, 'inset(6% 0 6% 0)']];
    var step = .045 * ctx.E.dm, sh = ctx.T.accent2 || ctx.T.accent;
    L.forEach(function (l, i) {
      var s = sel + '[data-l="' + i + '"]', t0 = t + st * .6 * i;
      tw.set(s, 0, { opacity: 0 });
      FR.forEach(function (f, k) {
        tw.push({ k: 'set', t: s, at: r2(t0 + k * step), rm: false, v: { opacity: 1, x: ctx.px(f[0]), clipPath: f[1],
          textShadow: (k % 2 ? '-' : '') + '0.035em 0 ' + sh + ', ' + (k % 2 ? '' : '-') + '0.035em 0 ' + ctx.T.accent } });
      });
      tw.set(s, t0 + FR.length * step, { opacity: 1, x: 0, clipPath: 'none', textShadow: 'none' });
    });
    return t + FR.length * step + st * .6 * (n - 1) + ctx.d('micro');
  }
  if (fx === 'outline') {
    /* 테두리(--sw)만 있는 글자가 먼저 서고, 잠깐 뒤 속이 차오르며 테두리가 사라진다.
       from 이라 끝 색은 요소가 원래 갖는 색(ink·accent·emphasis)이다 — 인라인 강조도 제 색으로 찬다. */
    var t1 = t + ctx.d('fast') * .9;
    tw.from(sel, t, { opacity: 0, y: ctx.px(10), duration: ctx.d('fast'), ease: ctx.ei }, st);
    tw.from(sel, t1, { color: 'rgba(0,0,0,0)', '--sw': '0.05em', duration: dur * 1.3, ease: TOKENS.e.move }, st);
    if (hasEm(text)) tw.from(sel + ' .gg-em', t1, { color: 'rgba(0,0,0,0)', duration: dur * 1.3, ease: TOKENS.e.move }, st);
    return t1 + dur * .8 + st * (n - 1);
  }
  tw.from(sel, t, { yPercent: num(o.yp, 115), duration: dur, ease: o.ease || ctx.ei }, st);
  return t + dur * .6 + st * (n - 1);
}
/** 인라인 강조 낱말이 줄과 함께 들어올 때 살짝 튄다 — 색만으로는 "짚는다"가 안 읽힌다 */
function emPop(tw, ctx, sel, text, t) {
  if (!hasEm(text)) return;
  tw.from(sel + ' .gg-em', t + ctx.d('fast') * .3, { scale: .8, duration: ctx.d('normal'), ease: TOKENS.e.overshoot }, ctx.st('tight'));
}
/**
 * hold 동안 글자가 죽어 있지 않게 한다 — 카메라가 정지 프레임을 없애는 것과 같은 논리.
 * CSS 루프는 멈춰 있다가(paused) 등장이 끝나는 시점에 풀린다. 시킹으로 되감으면 다시 멈춘다(artLoop 와 같다).
 *  - 인라인 강조(.gg-em)·emphasis 줄(.gg-breath): 밝기가 아주 느리게 숨쉰다 — transform 은 GSAP 이 쓰니 filter 로
 *  - 글로우 테마(T.glow ≥ 2, neon): 블록(.gg-glowT)의 text-shadow 가 숨쉰다 — 상속되므로 안쪽 글자에 다 든다
 * host 는 블록 셀렉터(.gg-title / .gg-kl[data-i] / .gg-qt). 마크업 쪽에서 glowCls(ctx) 를 클래스에 붙여 둔다.
 */
function glowCls(ctx) { return ctx.T.glow >= 2 ? ' gg-glowT' : ''; }
function textLive(tw, ctx, host, text, at, o) {
  o = o || {};
  if (hasEm(text)) tw.set(host + ' .gg-em', at, { animationPlayState: 'running' });
  if (o.breath || (o.glow && ctx.T.glow >= 2)) tw.set(host, at, { animationPlayState: 'running' });
}
/*
 * 글자 퇴장(exitFx) — 트랜지션이 씬을 통째로 걷어 내는 대신 글자만 먼저 나간다.
 * 배경·일러스트·카드는 남아 트랜지션과 함께 가므로 "글자가 갈리고 장면은 이어진다"가 읽힌다.
 * 씬 길이가 확정된 뒤(compile 끝)에 끝에서 exitDur 만큼 앞에 얹는다. 씬 타임라인이 아니라
 * 마스터에 절대 시각으로 실리므로(amb:1) contentEnd·검수 프레임·자막 압축(ts)에 안 잡힌다.
 */
var EXIT_FX = {
  up:         { label: '위로 — 마스크 리빌을 되감는다. 기본 등장과 짝' },
  down:       { label: '아래로 — 들어온 길로 되돌아간다' },
  fade:       { label: '페이드 — 살짝 내려앉으며 사라진다' },
  scramble:   { label: '스크램블 — 섞이다 비워진다' },
  typewriter: { label: '백스페이스 — 찍은 순서의 반대로 지워진다 (textFx typewriter 와 함께)' },
  blur:       { label: '블러 — 흐려지며 사라진다' },
  wipe:       { label: '와이프 — 왼쪽에서 오른쪽으로 닦여 나간다' },
  flip:       { label: '플립 — 글자가 위 축으로 넘어가며 사라진다' },
  glitch:     { label: '글리치 — 찢기고 어긋난 뒤 꺼진다' }
};
/* 퇴장 fx 를 받는 글자 — 헤더 제목·키네틱 줄(스택 전부, 컷은 마지막 줄)·인용문·matchCut 의 to 제목(롤은 아래 칸) */
var EXIT_TEXT = ['.gg-title .gg-mk', '.gg-kstack .gg-kl .gg-mk', '.gg-kcut:last-of-type .gg-kl .gg-mk', '.gg-qt .gg-mk',
                 '.gg-mcTo .gg-mk', '.gg-mcRoll .gg-mcT:last-child'];
/* 곁글자 — fx 와 무관하게 페이드로 따라 나간다 */
var EXIT_SIDE = ['.gg-kicker', '.gg-sub', '.gg-title .gg-mark', '.gg-qm', '.gg-qby', '.gg-kcut:last-of-type .gg-kl',
                 '.gg-mcTo .gg-mcS', '.gg-mcRoll .gg-mcS'];
/** 퇴장에 걸리는 시간(초). 씬 길이를 이만큼의 일부로 늘리는 데도 쓴다 */
function exitDur(ctx, fx, chars) {
  var d = ctx.d('normal');
  if (fx === 'typewriter') return r2(clamp(chars * .035 * ctx.E.dm, .3, 1.6));
  if (fx === 'glitch') return r2(.045 * ctx.E.dm * 6 + ctx.d('micro'));
  if (fx === 'scramble' || fx === 'blur') return r2(d * 1.2);
  return r2(d * .9);
}
/** 셀렉터의 첫 클래스가 마크업에 있는지 — 없는 요소에 op 을 내면 IR 만 붓는다 */
function inHTML(html, sel) { var m = sel.match(/\.([a-zA-Z-]+)/); return !m || html.indexOf(m[1]) >= 0; }
/** 퇴장 IR 을 만든다. at 은 씬 상대 시각. html 로 있는 요소만 고른다. 반환: op 배열(amb:1 이 붙어 마스터에 실린다) */
function exitText(ctx, fx, at, chars, html) {
  var tw = new TW(), q = ctx.q, d = ctx.d('normal'), st = ctx.st('tight');
  var fin = TOKENS.e.exit || 'power2.in';
  var present = function (s) { return inHTML(html || '', s); };
  EXIT_SIDE.filter(present).forEach(function (s) { tw.to(q(s), at, { opacity: 0, y: ctx.px(8), duration: d * .6, ease: fin }); });
  /* 숨쉬기·글로우 루프는 멈춘다 — 사라지는 글자가 밝아지면 이상하다 */
  if (present('.gg-em')) tw.set(q('.gg-em'), at, { animationPlayState: 'paused' });
  if (present('.gg-glowT')) tw.set(q('.gg-glowT'), at, { animationPlayState: 'paused' });
  /* 마스크 — up/down 은 닫혀 있어야 잘려 나가고(blur·flip·인라인 마크가 열어 둔 것을 되돌린다),
     blur·flip 은 열려 있어야 번지고 넘어간다 */
  if (fx === 'up' || fx === 'down') tw.set(q('.gg-mask'), at, { overflow: 'hidden' });
  else if (fx === 'blur' || fx === 'flip') tw.set(q('.gg-mask'), at, { overflow: 'visible' });
  EXIT_TEXT.filter(present).forEach(function (s) {
    var sel = q(s);
    if (fx === 'up' || fx === 'down') {
      tw.to(sel, at, { yPercent: fx === 'up' ? -115 : 115, duration: d * .7, ease: fin }, st);
    } else if (fx === 'fade') {
      tw.to(sel, at, { opacity: 0, y: ctx.px(10), duration: d * .7, ease: fin }, st);
    } else if (fx === 'scramble') {
      tw.push({ k: 'scramble', t: sel, at: r2(at), dur: r2(d * 1.2), out: 1, speed: .7 });
    } else if (fx === 'typewriter') {
      tw.set(sel + ' .gg-tw', at, { borderRightWidth: '0.07em' });
      tw.push({ k: 'type', t: sel + ' .gg-tw', at: r2(at), dur: exitDur(ctx, fx, chars), n: Math.max(1, chars), out: 1 });
    } else if (fx === 'blur') {
      tw.to(sel, at, { filter: 'blur(18px)', opacity: 0, scale: 1.04, duration: d * 1.2, ease: TOKENS.e.move }, st);
    } else if (fx === 'wipe') {
      tw.fromTo(sel, at, { clipPath: 'inset(-40% -10% -40% -10%)' },
        { clipPath: 'inset(-40% -10% -40% 110%)', duration: d, ease: TOKENS.e.move }, st);
    } else if (fx === 'flip') {
      tw.push({ k: 'split', t: sel, at: r2(at), by: 'chars', out: 1, st: st * .6,
        v: { rotationX: 90, opacity: 0, transformOrigin: '50% 0%', transformPerspective: 640, duration: d * .8, ease: fin } });
    } else if (fx === 'glitch') {
      var FR = [[-6, 'inset(0 0 58% 0)'], [7, 'inset(42% 0 0 0)'], [-5, 'inset(20% 0 44% 0)'],
                [4, 'inset(52% 0 14% 0)'], [-3, 'inset(0 0 34% 0)'], [2, 'inset(8% 0 8% 0)']];
      var step = .045 * ctx.E.dm, sh = ctx.T.accent2 || ctx.T.accent;
      FR.forEach(function (f, k) {
        tw.push({ k: 'set', t: sel, at: r2(at + k * step), rm: false, v: { x: ctx.px(f[0]), clipPath: f[1],
          textShadow: (k % 2 ? '-' : '') + '0.035em 0 ' + sh + ', ' + (k % 2 ? '' : '-') + '0.035em 0 ' + ctx.T.accent } });
      });
      tw.set(sel, at + FR.length * step, { opacity: 0 });
    }
  });
  return tw.list.map(function (o) { o.amb = 1; return o; });
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
  var fx = TEXT_FX[sc.textFx] && sc.textFx !== 'roll' ? sc.textFx : '';
  if (fx === 'typewriter') {
    /* 타자기는 줄을 접을 수 없다(폭을 늘려 찍는다) — 넘치는 줄이 있으면 kineticType 처럼 글자를 줄인다 */
    var need = 0;
    titleLines.forEach(function (l) { need = Math.max(need, estEm(plain(l)) * tSize); });
    if (need > pos.w) tSize = Math.max(Math.round(tSize * .62), Math.floor(tSize * pos.w / need));
  }
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
    var inlineMark = !!(mk.svg && hasEm(sc.title));
    h.push('<h2 class="gg-title' + glowCls(ctx) + '" style="font-size:' + tSize + 'px">' + maskLines(sc.title, '', mk.svg, fx) + '</h2>');
    t = revealText(tw, ctx, q('.gg-title .gg-mk'), sc.title, fx, t);
    emPop(tw, ctx, q('.gg-title'), sc.title, t - ctx.d('normal') * .6);
    if (mk.svg) {
      /* 마크는 글자가 자리를 잡은 뒤에 그어진다 — 동시에 나오면 둘 다 안 읽힌다 */
      var ms = q('.gg-title .gg-mark');
      if (inlineMark) {
        /* 낱말에 붙은 마크는 마스크 안에 있다 — 글자가 다 올라온 뒤 마스크를 열어 줘야 잘리지 않는다.
           revealText 의 t 는 아직 글자가 움직이는 중이라 멈출 때까지 기다린다. */
        t += ctx.d('normal') * .4;
        tw.set(q('.gg-title .gg-mask'), t, { overflow: 'visible' });
        if (fx === 'typewriter') tw.set(q('.gg-title .gg-tw'), t, { overflow: 'visible' });
      }
      if (mk.def.draw) tw.draw(ms + ' path', t, ctx.d('normal'), TOKENS.e.move, ctx.st('tight'));
      else tw.from(ms, t, { scale: .6, opacity: 0, duration: ctx.d('fast'), ease: TOKENS.e.overshoot });
      tw.set(ms, t - .01, { opacity: 1 });
      tw.set(ms, 0, { opacity: 0 });
      t += ctx.d('fast') * .6;
    }
    /* 글자가 다 선 뒤 숨쉬기 시작 — 등장과 겹치면 둘 다 안 읽힌다 */
    textLive(tw, ctx, q('.gg-title'), sc.title, t + ctx.d('normal') * .4, { glow: true });
  }
  if (sc.sub) {
    h.push('<p class="gg-sub" style="font-size:' + sSize + 'px">' + emText(sc.sub) + '</p>');
    tw.from(q('.gg-sub'), t, { y: ctx.px(24), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei });
    textLive(tw, ctx, q('.gg-sub'), sc.sub, t + ctx.d('fast'));
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
/**
 * 접혀서 늘어난 헤더 높이. `head` 의 `h` 는 `\n` 으로 나눈 줄만 센다 — 한 줄로 적은 긴
 * 문장이 폭을 넘겨 브라우저가 접으면 그 한 줄만큼을 못 센다. 헤더 아래에 블록을
 * **붙여** 놓는 패턴(질문+선택지, 제목+CTA 처럼 한 덩어리로 배치하는 것들)은 그 차이가
 * 곧 겹침이라 이 값을 더한다. bodyCy 처럼 남은 공간의 중심을 쓰는 패턴은 필요 없다.
 */
function headWrapExtra(text, size, w) {
  var add = 0;
  splitLines(text).forEach(function (l) {
    var need = Math.ceil(estEm(l) * size / w);
    if (need > 1) add += (need - 1) * size * 1.08;
  });
  return Math.round(add);
}
/**
 * 아이콘 자리의 시각물. `art` 가 있으면 일러스트, 없으면 픽토그램이다.
 *
 * ART 는 200 박스에 도형을 여러 개 조합한 구성물이라 24 박스 픽토그램과 같은 크기로
 * 놓으면 뭉개진다. 아이콘 자리보다 훨씬 크게 잡아야 읽힌다 — 기본 1.9 배지만 자리마다
 * 여유가 달라서 호출부가 artSize 로 직접 정한다. 선이 얇아지는 건 ctx.art 가 막아 주지만
 * 형태가 뭉치는 건 못 막으니 100px 아래로는 내리지 않는다.
 * 자리가 좁아 감당이 안 되는 패턴(칩·통계 숫자 옆)에는 이 헬퍼를 쓰지 않는다.
 */
function visual(ctx, x, iconSize, artSize, cls) {
  if (!x) return '';
  if (x.art && VEC.ART[x.art]) return ctx.art(x.art, num(artSize, Math.round(iconSize * 1.9)), 'gg-vArt ' + (cls || ''));
  return x.icon ? ctx.icon(x.icon, iconSize, cls) : '';
}
/** 이 자리에 일러스트가 들어왔나 — 상자 높이를 미리 키워야 중심이 안 밀린다. */
function hasArt(x) { return !!(x && x.art && VEC.ART[x.art]); }

/**
 * 일러스트 등장 — 조각(`gg-artP`)이 차례로 선다. 픽토그램의 드로우온에 대응한다.
 *
 * 일부 그림은 상시 루프를 자기 안에 갖고 있다(`gears` 반대 회전 · `flow` 점 흐름).
 * 그건 CSS 애니메이션이라 씬이 재생되든 말든 페이지가 열린 순간부터 돈다 — 씬은 전부
 * DOM 에 있고 `visibility` 로만 숨기기 때문이다. 조립되는 중에 이미 돌고 있으면 등장이
 * 안 읽히므로, 기본은 멈춰 두고(`.gg-artLoop{animation-play-state:paused}`) 등장이
 * 끝나는 시점에 타임라인이 풀어 준다. 시킹으로 되감으면 다시 멈춘다.
 */
function artIn(tw, ctx, host, at, o) {
  o = o || {};
  var dur = num(o.dur, ctx.d('fast'));
  tw.from(ctx.q(host + ' .gg-artP'), at,
    { scale: num(o.scale, .74), opacity: 0, transformOrigin: '50% 50%', duration: dur, ease: TOKENS.e.overshoot },
    num(o.st, ctx.st('tight')));
  tw.set(ctx.q(host + ' .gg-artLoop'), at + dur * 1.25, { animationPlayState: 'running' });
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
/**
 * 두 점을 잇는 화살표 — 선과 머리(꺽쇠)를 **두 path 로** 나눠 준다.
 *
 * 왜 이렇게 나누나. 함정이 둘 있다.
 *
 *  1. `marker-end` 로 머리를 붙이면 안 된다. SVG 마커는 `stroke-dasharray` 를 타지
 *     않아서, DrawSVG 가 선을 0%에서 늘리는 동안에도 **머리는 처음부터 끝점에 그려져
 *     있다.** 선이 아직 오지 않은 자리에 꺽쇠만 떠 있는 화면이 나온다.
 *  2. 그렇다고 머리를 같은 path 의 두 번째 서브패스로 이어 붙여도 안 된다.
 *     **SVG 는 서브패스마다 dash 패턴을 처음부터 다시 시작한다** — 선이 15% 그려질 때
 *     머리도 자기 길이의 15%가 같이 나타난다.
 *
 * 그래서 선과 머리를 각각 **서브패스 하나뿐인 path** 로 두고, 머리의 draw 를 선보다
 * 늦게 건다. 그러면 선이 자라고 → 꺽쇠가 닫히는 순서가 정확히 나온다.
 *
 * 머리 길이는 선 길이에 비례하되 상한을 둔다 — 세로 배치의 짧은 화살표(28px)에
 * 가로용 머리(16px)를 그대로 쓰면 머리가 선의 절반을 넘는다.
 */
function arrowParts(x1, y1, x2, y2, max) {
  var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
  var ux = dx / len, uy = dy / len;
  var L = Math.min(num(max, 16), len * .4), W = L * .56;
  var bx = x2 - ux * L, by = y2 - uy * L;      /* 꺽쇠 뿌리 */
  var px = -uy * W, py = ux * W;               /* 선에 수직인 방향 */
  return {
    line: 'M' + r2(x1) + ' ' + r2(y1) + ' L' + r2(x2) + ' ' + r2(y2),
    head: 'M' + r2(bx + px) + ' ' + r2(by + py) + ' L' + r2(x2) + ' ' + r2(y2) +
      ' L' + r2(bx - px) + ' ' + r2(by - py)
  };
}
/** 화살표 두 조각의 마크업. 머리는 data-head 로 구분해 draw 를 따로 건다. */
function arrowSVG(i, parts) {
  return '<path class="gg-arrow" data-i="' + i + '" d="' + parts.line + '"/>' +
    '<path class="gg-arrow" data-i="' + i + '" data-head="1" d="' + parts.head + '"/>';
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
/**
 * `relCurve` 의 반대. 요소가 **도착점**에 놓여 있을 때 쓴다 — 같은 곡선을
 * `(x2,y2)` 기준 상대 좌표로 내므로 path 가 `(x1-x2, y1-y2)` 에서 시작해 `0 0` 으로 끝난다.
 * MotionPath 는 path 좌표를 요소의 x/y 에 **그대로 얹는다**(더하지 않는다). 그래서 요소를
 * `set` 으로 출발점에 미리 옮겨 두고 `relCurve` 를 걸면 그 오프셋이 한 번 더 더해진 것처럼
 * 보이며 도착점을 지나쳐 튕겨 나간다. 도착점에 놓인 요소는 이 함수를 쓴다.
 */
function relCurveTo(x1, y1, x2, y2, bow) {
  var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
  var b = num(bow, 0) * len;
  return 'M' + r2(-dx) + ' ' + r2(-dy) + ' Q' + r2(-dx / 2 - dy / len * b) + ' ' +
    r2(-dy / 2 + dx / len * b) + ' 0 0';
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
                 'lines', 'stops', 'sources', 'targets', 'orbits', 'stages', 'parts',
                 'options', 'chapters', 'next'];

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

/**
 * 스펙이 들고 다니는 외부 미디어 — 자막·음성 파일과 화면 자막 여부.
 *
 *   "media": { "subs": "intro.srt", "audio": "intro.mp3", "captions": true }
 *
 * 경로는 **스펙 파일이 있는 폴더 기준**으로 푼다(design 의 image 와 같은 규칙) —
 * 파일을 읽는 것은 CLI·앱의 일이고, 엔진은 무엇을 읽어야 하는지만 알려준다.
 * 루트 `audio: {offset, volume}` 는 재생 설정이라 그대로 남는다 — 여기는 파일이다.
 */
function mediaOf(spec) {
  var m = spec && typeof spec.media === 'object' && spec.media ? spec.media : {};
  return {
    subs: typeof m.subs === 'string' && m.subs.trim() ? m.subs.trim() : null,
    audio: typeof m.audio === 'string' && m.audio.trim() ? m.audio.trim() : null,
    captions: m.captions === true
  };
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
  fields: 'title(필수) · kicker · sub · icon|art(일러스트, icon 대신) · rule(기본 true)',
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
      artIn(tw, ctx, '.gg-heroArt', t, { scale: .82, dur: ctx.d('normal'), st: ctx.st('normal') });
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
  fields: 'lines[](필수: 문자열 또는 {text,emphasis,scale,fx}) · mode(stack|cut) · by(words|chars) · textFx — 줄 안의 `*낱말*` 은 인라인 강조',
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
      var need = estEm(plain(l.text)) * base;
      return need > w ? Math.max(Math.round(base * .62), Math.floor(base * w / need)) : base;
    });
    /* 줄의 fx — 줄에 적은 것이 씬 것을 이긴다. roll 은 matchCut 전용이라 여기서는 기본으로 흐른다 */
    function fxOf(l) { var f = l.fx || sc.textFx; return TEXT_FX[f] && f !== 'roll' ? f : ''; }
    /* 마스크 구조(maskLines)로 가는 등장 — scramble 만 .gg-kl 의 글자를 통째로 갈아 끼우므로 맨 글자로 둔다 */
    function structured(f) { return !!f && f !== 'scramble'; }

    if (mode === 'cut') {
      /* 컷 모드 — 한 줄씩 갈아치운다. 각 줄이 화면 중앙을 독점.
         래퍼가 세로 중앙을 잡는다 — 줄이 접혀도 중심이 흔들리지 않고, transform 이
         래퍼에 있어 안쪽 글자를 GSAP 이 마음대로 움직여도 어긋나지 않는다. */
      L.forEach(function (l, i) {
        var f = fxOf(l);
        H.push('<div class="gg-kcut" style="left:' + ctx.safe + 'px;top:' + ctx.cy + 'px;width:' + w + 'px">' +
          '<div class="gg-kl gg-c' + (l.emphasis ? ' gg-breath' : '') + glowCls(ctx) + '" data-i="' + i + '" style="font-size:' + sizes[i] + 'px' +
          (l.emphasis ? ';color:var(--acc)' : '') + '">' +
          (structured(f) ? maskLines(l.text, '', '', f) : emText(l.text)) + '</div></div>');
      });
      var beat = r2(Math.max(.34, readSec(itemsText(L.map(function (l) { return plain(l.text); })), ctx.energy) / L.length * 1.15));
      L.forEach(function (l, i) {
        var s = q('.gg-kl[data-i="' + i + '"]');
        var fx = fxOf(l), b = beat;
        tw.set(s, 0, { opacity: 0 });
        tw.set(s, t, { opacity: 1 });
        if (fx === 'scramble') tw.scramble(s, t, beat * .82, { speed: .8, reveal: .15 });
        else if (structured(fx)) {
          /* 타자기는 글자 수만큼 걸린다 — 박자가 그보다 짧으면 다 찍히기 전에 갈린다 */
          var tr = revealText(tw, ctx, s + ' .gg-mk', l.text, fx, t, { dur: ctx.d('fast') * 1.4, st: 0 });
          b = r2(Math.max(beat, tr - t + ctx.d('fast')));
        }
        else tw.split(s, t, by, { yPercent: 60, opacity: 0, scale: .86, duration: ctx.d('fast'), ease: ctx.ei }, ctx.st('tight'));
        if (ctx.energy === 'E3') tw.fx('impact', t);
        textLive(tw, ctx, s, l.text, t + ctx.d('fast') * 1.5, { breath: !!l.emphasis, glow: true });
        if (i < L.length - 1) { tw.to(s, t + b, { opacity: 0, scale: 1.1, duration: ctx.d('micro'), ease: TOKENS.e.exit }); }
        t += b;
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
      H.push('<div class="gg-kl gg-c' + (l.emphasis ? ' gg-breath' : '') + glowCls(ctx) + '" data-i="' + i + '" style="font-size:' + sizes[i] + 'px' +
        (i ? ';margin-top:' + gap + 'px' : '') + (l.emphasis ? ';color:var(--acc)' : '') + '">' +
        maskLines(l.text, '', '', fxOf(l)) + '</div>');
    });
    H.push('</div>');
    L.forEach(function (l, i) {
      var s = q('.gg-kl[data-i="' + i + '"] .gg-mk');
      var fx2 = fxOf(l);
      var tr = t;
      if (fx2) {
        tr = revealText(tw, ctx, s, l.text, fx2, t, { st: 0, cursorOff: i < L.length - 1 });
      } else if (l.emphasis) {
        tw.split(q('.gg-kl[data-i="' + i + '"]'), t, by, { yPercent: 100, opacity: 0, duration: ctx.d('normal'), ease: TOKENS.e.overshoot }, ctx.st('tight'));
      } else {
        tw.from(s, t, { yPercent: 112, duration: ctx.d('normal'), ease: ctx.ei });
        emPop(tw, ctx, s, l.text, t);
      }
      t = Math.max(t + readSec(plain(l.text), ctx.energy) * .48 + ctx.d('fast') * .3, tr);
      textLive(tw, ctx, q('.gg-kl[data-i="' + i + '"]'), l.text, Math.max(tr, t) + ctx.d('normal') * .5, { breath: !!l.emphasis, glow: true });
    });
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, ctx.d('slow')) };
  }
};

/* --- 3. cardsCascade — 여럿을 순서대로 보여준다. 나열의 기본. --- */
PATTERNS.cardsCascade = {
  label: '카드 캐스케이드',
  use: '항목 나열, 기능 소개, 구성요소 열거. 3~8개가 적정. 9개 넘으면 씬을 나눈다.',
  fields: 'items[](필수: {label,icon,art,note,value,badge,ribbon,spark}) · title · kicker · sub · cols · dir(up|left|scale)',
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
            : { y: ctx.px(44), scale: .97, opacity: 0, skewY: ctx.skew() };
      v.duration = ctx.d('fast') * 1.25; v.ease = ctx.ei;
      var stC = ctx.st(n > 6 ? 'tight' : 'normal');
      enterItems(tw, ctx, it, '.gg-cascadeCard', t, stC, v);
      appear = ctx.d('fast') * 1.25 + stC * (n - 1);
    }
    enterItems(tw, ctx, it, '.gg-cascadeCard', t, ctx.st('tight'),
      { scale: .6, opacity: 0, duration: ctx.d('fast'), ease: TOKENS.e.overshoot },
      { inner: ' .gg-ic', lead: ctx.d('micro') });
    /* 카드 뒤 일러스트는 카드가 자리를 잡은 뒤 번지듯 올라온다 — 아이콘보다 한 박자 늦다 */
    if (it.some(function (x) { return x.art && VEC.ART[x.art]; })) {
      enterItems(tw, ctx, it, '.gg-cascadeCard', t, ctx.st('tight'),
        { scale: .82, opacity: 0, transformOrigin: '100% 100%', duration: ctx.d('normal'), ease: ctx.ei },
        { inner: ' .gg-cardArt', lead: ctx.d('fast') * .8 });
    }
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
    /* 구분자는 `>` 가 있으면 `>` 만 쓴다 — 하이픈까지 구분자로 보면 라벨 안의
       하이픈에서 쪼개져("허브>link-w" → 허브·link·w) 링크가 조용히 사라진다.
       `>` 가 없을 때만 하이픈을 구분자로 본다("A - B" 표기 지원). */
    var links = arr(sc.links).map(function (l) {
      if (Array.isArray(l)) return { a: l[0], b: l[1] };
      var str = String(l);
      var p = str.indexOf('>') >= 0 ? str.split(/\s*>\s*/) : str.split(/\s*-+\s*/);
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
  fields: 'steps[](필수: {label,icon|art,note}) · title · kicker · vertical(기본: 화면비가 정함)',
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
    var svg = ['<svg class="gg-svg" viewBox="0 0 ' + ctx.W + ' ' + ctx.H + '" aria-hidden="true">'];
    var boxes = [];
    if (!vert) {
      var gap = 92, bw = Math.floor((ctx.W - ctx.safe * 2 - (n - 1) * gap) / n), bh = Math.round(bw * .62);
      if (bh > 300) bh = 300;
      var r = rowOf(n, ctx.W, bw, gap);
      r.forEach(function (g, i) { boxes.push({ x: g.x, y: mid - bh / 2, w: bw, h: bh, cx: g.cx, cy: mid }); });
      for (var i = 0; i < n - 1; i++) {
        var x1 = boxes[i].x + bw + 16, x2 = boxes[i + 1].x - 14;
        svg.push(arrowSVG(i, arrowParts(x1, mid, x2, mid)));
      }
    } else {
      var vgap = 44, bw2 = Math.min(ctx.W - ctx.safe * 2, 760), bh2 = Math.round(Math.min(190, (ctx.H * .58 - (n - 1) * vgap) / n));
      var totalH = n * bh2 + (n - 1) * vgap, y0 = mid - totalH / 2;
      for (var j = 0; j < n; j++) boxes.push({ x: (ctx.W - bw2) / 2, y: y0 + j * (bh2 + vgap), w: bw2, h: bh2, cx: ctx.cx, cy: y0 + j * (bh2 + vgap) + bh2 / 2 });
      for (var k = 0; k < n - 1; k++) {
        var y1 = boxes[k].y + bh2 + 8, y2 = boxes[k + 1].y - 8;
        svg.push(arrowSVG(k, arrowParts(ctx.cx, y1, ctx.cx, y2)));
      }
    }
    svg.push('</svg>');
    H.push(svg.join(''));
    st.forEach(function (x, i) {
      var b = boxes[i];
      H.push('<div class="gg-step" data-i="' + i + '" style="left:' + Math.round(b.x) + 'px;top:' + Math.round(b.y) +
        'px;width:' + Math.round(b.w) + 'px;min-height:' + Math.round(b.h) + 'px">' +
        '<div class="gg-stepNo">' + pad(i + 1, 2) + '</div>' +
        visual(ctx, x, 54, 150) +
        '<div class="gg-stepLb" style="font-size:' + Math.round(ctx.fs.body * 1.04) + 'px">' + esc(x.label) + '</div>' +
        (x.note ? '<div class="gg-stepNote">' + esc(x.note) + '</div>' : '') + '</div>');
    });
    /* 단계 하나 등장 -> 화살표 -> 다음 단계. 순서가 설명이다. */
    var beat = ctx.d('fast') * 1.1, aw = ctx.d('fast') * .85;
    st.forEach(function (x, i) {
      tw.from(q('.gg-step[data-i="' + i + '"]'), t, { y: ctx.px(vert ? 26 : 0), x: ctx.px(vert ? 0 : 34),
        skewX: vert ? 0 : ctx.skew('x'), skewY: vert ? ctx.skew() : 0, opacity: 0, scale: .94, duration: beat, ease: ctx.ei });
      if (hasArt(x)) artIn(tw, ctx, '.gg-step[data-i="' + i + '"]', t + beat * .45);
      t += beat * .75;
      if (i < n - 1) {
        /* 선이 자라고 → 꺽쇠가 닫힌다. 머리를 나중에 걸어야 순서가 보인다. */
        var sel = '.gg-arrow[data-i="' + i + '"]';
        tw.draw(q(sel + ':not([data-head])'), t, aw * .72, TOKENS.e.move);
        tw.draw(q(sel + '[data-head]'), t + aw * .64, aw * .36, TOKENS.e.move);
        t += aw * .8;
      }
    });
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, itemsText(st)) };
  }
};

/* --- 6. beforeAfter — 대비. 바뀐 것을 눈으로 보게 만든다. --- */
PATTERNS.beforeAfter = {
  label: '비포 애프터',
  use: '개선 전/후, 도입 전/후, 문제/해결. before 는 그대로 남고 after 가 링과 함께 올라선다.',
  fields: 'before{label,icon|art,items[],value} · after{...} (둘 다 필수) · title · kicker',
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
        (side === 'af' ? '<div class="gg-afHi"></div>' : '') +
        '<div class="gg-panelTag">' + esc(o.label || (side === 'bf' ? 'BEFORE' : 'AFTER')) + '</div>' +
        (o.value != null ? '<div class="gg-panelVal" style="font-size:' + Math.round(ctx.fs.num * .52) + 'px">' + esc(o.value) + '</div>' : '') +
        visual(ctx, o, 56, 168) +
        (it.length ? '<ul class="gg-panelList" style="font-size:' + Math.round(ctx.fs.body * .92) + 'px">' +
          it.map(function (x) { return '<li>' + esc(x.label) + (x.note ? ' <em>' + esc(x.note) + '</em>' : '') + '</li>'; }).join('') + '</ul>' : '') +
        '</div>';
    }
    H.push(panel('bf', B, panels[0]));
    H.push(panel('af', A, panels[1]));
    var dx = vert ? 0 : 30, dy = vert ? 26 : 0;
    tw.from(q('.gg-bf'), t, { x: ctx.px(-dx), y: ctx.px(-dy), opacity: 0, duration: ctx.d('normal'), ease: ctx.ei });
    tw.from(q('.gg-bf li'), t + ctx.d('fast') * .6, { x: ctx.px(16), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }, ctx.st('normal'));
    if (hasArt(B)) artIn(tw, ctx, '.gg-bf', t + ctx.d('fast') * .4);
    t += ctx.d('normal') + readSec(itemsText(B.items) + (B.label || ''), ctx.energy) * .55;
    /* 전환의 핵 — before 를 흐리게 지워서 대비를 만들지 않는다. before 는 그대로 읽히게 두고
       after 를 강조한다. 대비는 한쪽을 죽여서가 아니라 한쪽을 세워서 생긴다. */
    tw.from(q('.gg-af'), t, { x: ctx.px(dx), y: ctx.px(dy), opacity: 0, scale: .96, duration: ctx.d('normal') * 1.1, ease: ctx.ei });
    tw.from(q('.gg-af li'), t + ctx.d('fast') * .7, { x: ctx.px(18), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }, ctx.st('normal'));
    if (hasArt(A)) artIn(tw, ctx, '.gg-af', t + ctx.d('fast') * .5);
    if (A.value != null) tw.from(q('.gg-af .gg-panelVal'), t + ctx.d('fast') * .5, { scale: .7, opacity: 0, duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
    t += ctx.d('normal') * 1.1;
    /* after 가 다 들어온 뒤 한 단계 올라선다 — 링이 감기고 패널이 커지고 라벨에 불이 들어온다.
       등장 트윈이 끝난 시점에 붙인다. 겹치면 같은 scale·y 를 두 트윈이 다투게 된다. */
    tw.from(q('.gg-afHi'), t, { scale: .94, opacity: 0, transformOrigin: '50% 50%',
      duration: ctx.d('fast') * 1.2, ease: TOKENS.e.overshoot });
    tw.to(q('.gg-af'), t, { scale: 1.03, y: ctx.px(-8), duration: ctx.d('normal') * .9, ease: TOKENS.e.overshoot });
    tw.to(q('.gg-af .gg-panelTag'), t, { color: 'var(--good)', duration: ctx.d('fast'), ease: TOKENS.e.move });
    if (ctx.energy === 'E3') tw.fx('impact', t);
    t += ctx.d('normal') * .9;
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, itemsText(A.items) + (A.label || '')) };
  }
};

/* --- 7. explodedDiagram — 겹친 층을 펼쳐 구조를 보여준다. --- */
PATTERNS.explodedDiagram = {
  label: '분해도',
  use: '스택 구조, 계층 아키텍처, 레이어드 구성. 겹쳐 있다가 위아래로 펼쳐진다.',
  fields: 'layers[](필수: {label,icon|art,note}) · title · kicker · reverse(아래부터 펼침)',
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
        visual(ctx, x, 40) +
        '<div class="gg-layerLb" style="font-size:' + Math.round(ctx.fs.body * .98) + 'px">' + esc(x.label) + '</div>' +
        (x.note ? '<div class="gg-layerNote">' + esc(x.note) + '</div>' : '') + '</div>');
    });
    /* 전부 중앙에 겹쳐 있다가 제자리로 펼쳐진다 */
    ly.forEach(function (x, i) {
      var target = y0 + i * spread, collapsed = mid - lh / 2;
      tw.fromTo(q('.gg-layer[data-i="' + i + '"]'), t,
        { y: collapsed - target, opacity: 0, scaleY: .6, scaleX: .94 },
        { y: 0, opacity: 1, scaleY: 1, scaleX: 1, duration: ctx.d('normal') * 1.15, ease: TOKENS.e.overshoot });
      if (hasArt(x)) artIn(tw, ctx, '.gg-layer[data-i="' + i + '"]', t + ctx.d('fast') * .5);
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
  fields: 'items[](필수: {label,icon,art,note}) · focus(0부터, 필수) · detail{title,points[]} · title · kicker',
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
    if (it.some(function (x) { return x.art && VEC.ART[x.art]; })) {
      enterItems(tw, ctx, it, '.gg-zc', t, ctx.st('normal'),
        { scale: .82, opacity: 0, transformOrigin: '100% 100%', duration: ctx.d('normal'), ease: ctx.ei },
        { inner: ' .gg-cardArt', lead: ctx.d('fast') * .8 });
    }
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
/** 런타임 fmt 와 같은 표기 — 천 단위 쉼표, 소수 자리 */
function fmtNum(v, dec) {
  return (dec > 0 ? v.toFixed(dec) : String(Math.round(v))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
/**
 * 자릿수 롤(odometer) — 자리마다 0~9 띠가 굴러 멈춘다. count 는 값이 "흘러가는" 표기고,
 * 롤은 "돌아가다 맞춰지는" 표기다. 낮은 자리가 더 많이 돈다(j 번째 자리는 j+1 바퀴).
 * 쉼표·소수점은 굴리지 않는다. 반환: {html, ops:[{j, rows}]} — 자리별로 몇 칸 내려야 하는가
 */
function odometer(final) {
  var html = '', cols = [], j = 0;
  for (var i = 0; i < final.length; i++) {
    var ch = final[i];
    if (ch < '0' || ch > '9') { html += '<span class="gg-odS">' + ch + '</span>'; continue; }
    var spins = 1 + j, d = +ch, rows = '';
    for (var s = 0; s < spins; s++) for (var k = 0; k <= 9; k++) rows += '<i>' + k + '</i>';
    for (var k2 = 0; k2 <= d; k2++) rows += '<i>' + k2 + '</i>';
    html += '<span class="gg-od" data-j="' + j + '"><span class="gg-odIn">' + rows + '</span></span>';
    cols.push({ j: j, rows: spins * 10 + d });
    j++;
  }
  return { html: html, cols: cols };
}
var NUM_FX = {
  count: { label: '카운트 — 값이 목표까지 흘러 올라간다 (기본)' },
  roll:  { label: '롤 — 자리마다 0~9 띠가 굴러 멈춘다 (odometer)' }
};
PATTERNS.dataCounter = {
  label: '데이터 카운터',
  use: '핵심 지표 1~4개. 숫자가 목표값까지 올라가며 크기로 중요도를 말한다.',
  fields: 'stats[](필수: {value,unit,prefix,label,icon,dec,note}) · numFx(count|roll — 자릿수 롤) · title · kicker · sub',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var ss = items(sc.stats || sc.items), n = ss.length;
    var roll = sc.numFx === 'roll';
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
    var ods = [];
    ss.forEach(function (x, i) {
      var v = num(x.value, parseFloat(x.value) || 0), dec = num(x.dec, (String(x.value).split('.')[1] || '').length);
      var val;
      if (roll) { ods[i] = odometer(fmtNum(v, dec)); val = '<span class="gg-val gg-valRoll">' + ods[i].html + '</span>'; }
      else val = '<span class="gg-val" data-to="' + v + '" data-dec="' + dec + '">0</span>';
      H.push('<div class="gg-stat" data-i="' + i + '" style="left:' + Math.round(g[i].x) + 'px;top:' + Math.round(g[i].y) +
        'px;width:' + itemW + 'px">' +
        (x.icon ? ctx.icon(x.icon, Math.round(numSize * .42), 'gg-statIc') : '') +
        '<div class="gg-num" style="font-size:' + numSize + 'px">' +
        '<span class="gg-pre">' + esc(x.prefix || '') + '</span>' + val +
        '<span class="gg-unit" style="font-size:' + Math.round(numSize * .42) + 'px">' + esc(x.unit || '') + '</span></div>' +
        '<div class="gg-statLb" style="font-size:' + Math.round(ctx.fs.body * 1.06) + 'px">' + esc(x.label || '') + '</div>' +
        (x.note ? '<div class="gg-statNote">' + esc(x.note) + '</div>' : '') + '</div>');
    });
    var cdur = ctx.d('slow') * 1.25;
    ss.forEach(function (x, i) {
      var s = q('.gg-stat[data-i="' + i + '"]');
      tw.from(s, t, { y: ctx.px(30), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei });
      if (roll) {
        /* 자리마다 띠를 내린다 — 높은 자리가 먼저 멈추고 낮은 자리가 더 오래 돈다(rows 가 많아 같은 시간에 더 빠르게) */
        ods[i].cols.forEach(function (c) {
          tw.to(s + ' .gg-od[data-j="' + c.j + '"] .gg-odIn', t + ctx.d('micro') + c.j * ctx.st('tight') * .5,
            { y: -c.rows + 'em', duration: cdur * (1 + c.j * .08), ease: 'power4.out' });
        });
      } else {
        tw.count(s + ' .gg-val', t + ctx.d('micro'), cdur, 0, num(x.value, parseFloat(x.value) || 0),
          { dec: num(x.dec, (String(x.value).split('.')[1] || '').length) });
      }
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
  fields: 'left{label,value,items[],icon|art,tone} · right{...} (둘 다 필수) · title · kicker',
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
        visual(ctx, o, 58, 168) +
        '<div class="gg-sideLb" style="font-size:' + Math.round(ctx.fs.sub * .96) + 'px">' + esc(o.label || '') + '</div>' +
        (o.value != null ? '<div class="gg-sideVal" style="font-size:' + Math.round(ctx.fs.num * .46) + 'px">' + esc(o.value) + '</div>' : '') +
        (it.length ? '<ul class="gg-sideList" style="font-size:' + Math.round(ctx.fs.body * .9) + 'px">' +
          it.map(function (x) { return '<li>' + esc(x.label) + '</li>'; }).join('') + '</ul>' : '') + '</div>');
    });
    tw.draw(q('.gg-split'), t, ctx.d('normal'), TOKENS.e.move);
    t += ctx.d('normal') * .5;
    tw.from(q('.gg-lt'), t, { x: ctx.px(vert ? 0 : -70), y: ctx.px(vert ? -30 : 0), opacity: 0, duration: ctx.d('normal'), ease: ctx.ei });
    tw.from(q('.gg-rt'), t + ctx.st('loose'), { x: ctx.px(vert ? 0 : 70), y: ctx.px(vert ? 30 : 0), opacity: 0, duration: ctx.d('normal'), ease: ctx.ei });
    if (hasArt(L)) artIn(tw, ctx, '.gg-lt', t + ctx.d('fast') * .4);
    if (hasArt(R)) artIn(tw, ctx, '.gg-rt', t + ctx.st('loose') + ctx.d('fast') * .4);
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
  fields: 'sources[](필수) · target{label,icon|art}(필수) · title · kicker · sub',
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
    var tw2 = ctx.wide ? 400 : 320, th2 = hasArt(T) ? 262 : 172;
    H.push('<div class="gg-target" style="left:' + Math.round(ctx.cx - tw2 / 2) + 'px;top:' + Math.round(cy - th2 / 2) +
      'px;width:' + tw2 + 'px;min-height:' + th2 + 'px">' +
      visual(ctx, T, 56, 150) +
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
    if (hasArt(T)) artIn(tw, ctx, '.gg-target', t, { scale: .72, st: ctx.st('normal') });
    else if (T.icon) tw.draw(q('.gg-target path'), t, ctx.d('normal'), TOKENS.e.draw);
    t += ctx.d('normal');
    return { html: H.join(''), tw: tw, shot: r2(shotAt),
             dur: sceneDur(sc, ctx, t, T.label || '', { add: .5 }) };
  }
};

/* --- 13. divergence — 하나에서 여럿으로. 확장·파생 서사. --- */
PATTERNS.divergence = {
  label: '발산',
  use: '하나의 원천 -> 여러 결과, 플랫폼 -> 채널, 원칙 -> 실천. 수렴의 반대.',
  fields: 'source{label,icon|art}(필수) · targets[](필수) · title · kicker',
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
    var sw = ctx.wide ? 400 : 320, sh = hasArt(S) ? 262 : 172;
    H.push('<div class="gg-target gg-source" style="left:' + Math.round(ctx.cx - sw / 2) + 'px;top:' + Math.round(cy - sh / 2) +
      'px;width:' + sw + 'px;min-height:' + sh + 'px">' + visual(ctx, S, 56, 150) +
      '<div class="gg-targetLb" style="font-size:' + Math.round(ctx.fs.sub * .88) + 'px">' + esc(S.label || '') + '</div></div>');
    tg.forEach(function (x, i) {
      var p = pos[i];
      H.push('<div class="gg-chip" data-i="' + i + '" style="left:' + Math.round(p.x - chipW / 2) + 'px;top:' +
        Math.round(p.y - chipH / 2) + 'px;width:' + chipW + 'px">' + (x.icon ? ctx.icon(x.icon, 36) : '') +
        '<div class="gg-chipLb" style="font-size:' + Math.round(ctx.fs.small * .98) + 'px">' + esc(x.label) + '</div></div>');
    });
    tw.from(q('.gg-source'), t, { scale: .7, opacity: 0, duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
    if (hasArt(S)) artIn(tw, ctx, '.gg-source', t + ctx.d('micro'), { scale: .72, st: ctx.st('normal') });
    t += ctx.d('normal') * .8 + readSec(S.label || '', ctx.energy) * .35;
    tw.draw(q('.gg-flow'), t, ctx.d('normal'), TOKENS.e.draw, ctx.st('tight'));
    t += ctx.d('normal') * .55;
    tg.forEach(function (x, i) {
      var p = pos[i], sel = q('.gg-chip[data-i="' + i + '"]');
      /* 중심에서 시작해 곡선을 따라 제자리로. 칩의 홈 좌표가 도착점이라 path 도
         도착점 기준이어야 한다 — relCurve 를 쓰면 출발 오프셋이 한 번 더 얹혀 밖으로 튕긴다. */
      tw.set(sel, 0, { x: r2(ctx.cx - p.x), y: r2(cy - p.y), scale: .45, opacity: 0 });
      tw.path(sel, t + i * ctx.st('normal'), ctx.d('normal') * 1.2,
        relCurveTo(ctx.cx, cy, p.x, p.y, .1), { ease: ctx.ei });
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
  fields: 'center{label,icon|art}(필수) · orbits[](필수: {label,icon,ring}) · title · spin(초, 기본 26)',
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
    var cw = ctx.wide ? 300 : 270, ch = hasArt(C) ? (ctx.wide ? 226 : 220) : (ctx.wide ? 150 : 144);
    H.push('<div class="gg-center" style="left:' + Math.round(ctx.cx - cw / 2) + 'px;top:' + Math.round(cy - ch / 2) +
      'px;width:' + cw + 'px;min-height:' + ch + 'px">' + visual(ctx, C, 58, 124) +
      '<div class="gg-centerLb" style="font-size:' + Math.round(ctx.fs.sub * .9) + 'px">' + esc(C.label || '') + '</div></div>');
    /* 위성은 놓인 타원 위를 각도로 돈다 — 컨테이너를 통째로 회전시키면 중심에서의 거리가
       제각각이라(rx≠ry) 각자 자기 반지름의 원을 그리며 그려 둔 궤도선을 벗어난다.
       궤도 반지름과 시작 각도를 위성에 실어 두면 런타임이 매 프레임 타원 위 좌표를 찍는다. */
    var spin = num(sc.spin, 26) * (ctx.energy === 'E3' ? .62 : ctx.energy === 'E1' ? 1.5 : 1);
    rkeys.forEach(function (k, ri) {
      var list = rings[k], rr = baseR * (1 + ri * .58);
      var rx = rr * (ctx.wide ? 1.42 : 1.0), ry = rr * (ctx.wide ? 1 : 1.34);
      var p = ringOf(list.length, ctx.cx, cy, rx, ry, -90 + ri * 30);
      H.push('<div class="gg-orbit" data-r="' + ri + '" data-spin="' + r2(spin * (1 + ri * .45)) + '" style="left:0;top:0;width:' +
        ctx.W + 'px;height:' + ctx.H + 'px">' +
        list.map(function (o, j) {
          var pp = p[j], sat = ctx.wide ? 168 : 186;
          return '<div class="gg-sat" data-i="' + o.i + '" data-orx="' + r2(rx) + '" data-ory="' + r2(ry) +
            '" data-oa="' + r2(pp.ang) + '" style="left:' + Math.round(pp.x - sat / 2) + 'px;top:' +
            Math.round(pp.y - 58) + 'px;width:' + sat + 'px">' +
            '<div class="gg-satIn">' +
            (o.x.icon ? ctx.icon(o.x.icon, ctx.wide ? 38 : 42) : '') +
            '<div class="gg-satLb" style="font-size:' + Math.round(ctx.fs.small * (ctx.wide ? .96 : 1.1)) + 'px">' +
            esc(o.x.label) + '</div></div></div>';
        }).join('') + '</div>');
    });
    tw.from(q('.gg-center'), t, { scale: .72, opacity: 0, duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
    if (hasArt(C)) artIn(tw, ctx, '.gg-center', t + ctx.d('micro'), { st: ctx.st('normal') });
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
  fields: 'anchor{icon|art|text}(필수) · from{title,sub} · to{title,sub}(필수) · morph(앵커 회전·스케일) · anchorTo(아이콘 앵커만 모프)',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var A = typeof sc.anchor === 'string'
      ? (VEC.ART[sc.anchor] ? { art: sc.anchor }
         : ICO.iconPath(sc.anchor) ? { icon: sc.anchor } : { text: sc.anchor })
      : (sc.anchor || {});
    /* 아트 앵커는 도형이 여럿이라 드로우온·모프를 못 탄다 — 조각 스태거와 스케일로 간다. */
    var aArt = A.art && VEC.ART[A.art] ? A.art : null;
    var F = sc.from || {}, O = sc.to || {};
    /* anchorTo 를 주면 앵커가 그 도형으로 모프한다 — 회전·확대보다 훨씬 강한 연결 */
    var morphTo = sc.anchorTo && ICO.iconPath(sc.anchorTo) ? ICO.iconPath(sc.anchorTo) : null;
    var w = Math.min(ctx.W - ctx.safe * 2, ctx.wide ? 1200 : 900), x = (ctx.W - w) / 2;
    var asz = ctx.wide ? 200 : 170;
    var ay = ctx.cy - (ctx.wide ? 40 : 90);
    H.push('<div class="gg-anchor" style="left:' + Math.round(ctx.cx - asz / 2) + 'px;top:' + Math.round(ay - asz / 2) +
      'px;width:' + asz + 'px;height:' + asz + 'px">' +
      (aArt ? ctx.art(aArt, asz, 'gg-anchorArt')
        : A.icon ? ctx.icon(A.icon, asz, 'gg-drawIc')
        : '<span class="gg-anchorT" style="font-size:' + Math.round(asz * .62) + 'px">' + esc(A.text || '') + '</span>') +
      '</div>');
    var roll = sc.textFx === 'roll';
    function block(cls, o) {
      return '<div class="gg-mc ' + cls + ' gg-c" style="left:' + x + 'px;top:' + Math.round(ay + asz * .72) + 'px;width:' + w + 'px">' +
        /* 제목은 헤더처럼 마스크 안에 둔다 — exitFx up/down 이 잘려 나가야 사라지는 것으로 읽힌다 */
        (o.title ? '<div class="gg-mcT" style="font-size:' + Math.round(ctx.fs.title * .8) + 'px"><span class="gg-mask"><span class="gg-mk">' +
          emText(o.title) + '</span></span></div>' : '') +
        (o.sub ? '<div class="gg-mcS" style="font-size:' + Math.round(ctx.fs.sub * .9) + 'px">' + emText(o.sub) + '</div>' : '') + '</div>';
    }
    if (roll) {
      /* 롤 — 두 문장을 세로로 붙여 놓고 마스크 안에서 밀어 올린다. 교체가 물리적으로 읽힌다.
         칸이 flex 라 글자를 span 으로 한 번 감싼다 — 안 감싸면 `*낱말*` 앞뒤 공백이 flex 항목 사이에서 사라진다. */
      var ts = Math.round(ctx.fs.title * .8), ss = Math.round(ctx.fs.sub * .9);
      H.push('<div class="gg-mc gg-mcRoll gg-c" style="left:' + x + 'px;top:' + Math.round(ay + asz * .72) +
        'px;width:' + w + 'px">' +
        '<div class="gg-roll" style="height:' + Math.round(ts * 1.52) + 'px"><div class="gg-rollIn">' +
        '<div class="gg-mcT" style="font-size:' + ts + 'px"><span>' + emText(F.title || '') + '</span></div>' +
        '<div class="gg-mcT" style="font-size:' + ts + 'px"><span>' + emText(O.title || '') + '</span></div></div></div>' +
        ((F.sub || O.sub) ? '<div class="gg-roll gg-rollSub" style="height:' + Math.round(ss * 2.4) + 'px">' +
          '<div class="gg-rollIn">' +
          '<div class="gg-mcS" style="font-size:' + ss + 'px"><span>' + emText(F.sub || '') + '</span></div>' +
          '<div class="gg-mcS" style="font-size:' + ss + 'px"><span>' + emText(O.sub || '') + '</span></div></div></div>' : '') +
        '</div>');
    } else {
      H.push(block('gg-mcFrom', F));
      H.push(block('gg-mcTo', O));
    }
    if (!roll) tw.set(q('.gg-mcTo'), 0, { opacity: 0 });
    if (aArt) artIn(tw, ctx, '.gg-anchor', t, { dur: ctx.d('normal'), st: ctx.st('normal') });
    else if (A.icon) tw.draw(q('.gg-anchor path'), t, ctx.d('slow'), TOKENS.e.draw);
    tw.from(q('.gg-anchor'), t, { scale: .78, opacity: 0, duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
    t += ctx.d('slow') * .62;
    tw.from(roll ? q('.gg-mcRoll') : q('.gg-mcFrom'), t, { y: ctx.px(26), opacity: 0, duration: ctx.d('normal'), ease: ctx.ei });
    t += ctx.d('normal') + readSec((F.title || '') + (F.sub || ''), ctx.energy) * .85;
    /* 컷 — 앵커는 화면에 남고 텍스트가 교체된다. 이게 연결감의 정체. */
    if (morphTo && A.icon && !aArt) {
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
  fields: 'frame(browser|window|terminal|editor|search|dialog|phone|tablet|laptop|notification|' +
          'card|chat|memo|notepad|clipboard|clayBoard|receipt|newspaper|book) · ' +
          'screen{lines[]|items[]|art|title} · title · kicker · sub · caption',
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
    /* 프레임이 제목 자리를 정해 두었으면(검색어·제호·파일명·모달 제목) 거기에 앉힌다 */
    var slot = built.slot && SC.title ? built.slot : null;

    var body = '';
    var sLines = arr(SC.lines).map(String);
    var sItems = items(SC.items);
    if (SC.title && !slot) body += '<div class="gg-scT" style="font-size:' + Math.round(ctx.fs.sub * .82) + 'px">' + esc(SC.title) + '</div>';
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
      body += '<div class="gg-scItems" style="font-size:' + Math.round(ctx.fs.body * .9) + 'px">' +
        sItems.map(function (x, i) {
        return '<div class="gg-scI" data-i="' + i + '">' + (x.icon ? ctx.icon(x.icon, 30) : '') +
          '<span>' + esc(x.label) + '</span>' + (x.value != null ? '<b>' + esc(x.value) + '</b>' : '') + '</div>';
      }).join('') + '</div>';
    }
    H.push('<div class="gg-device gg-dev-' + fname + '" style="left:' + fx + 'px;top:' + fy +
      'px;width:' + fw + 'px;height:' + fh + 'px">' + built.svg +
      (slot ? '<div class="gg-scSlot" style="left:' + Math.round(slot.x) + 'px;top:' + Math.round(slot.y) +
        'px;width:' + Math.round(slot.w) + 'px;height:' + Math.round(slot.h) + 'px;font-size:' +
        Math.round(slot.size) + 'px">' + esc(SC.title) + '</div>' : '') +
      '<div class="gg-screen" style="left:' + Math.round(inner.x) + 'px;top:' + Math.round(inner.y) +
      'px;width:' + Math.round(inner.w) + 'px;height:' + Math.round(inner.h) + 'px">' + body + '</div></div>');
    if (sc.caption) {
      H.push('<div class="gg-caption gg-c" style="left:' + ctx.safe + 'px;top:' + (fy + fh + 26) +
        'px;width:' + availW + 'px;font-size:' + Math.round(ctx.fs.body * .92) + 'px">' + esc(sc.caption) + '</div>');
    }
    tw.from(q('.gg-device'), t, { y: ctx.px(34), opacity: 0, scale: .96, duration: ctx.d('slow'), ease: ctx.ei });
    t += ctx.d('slow') * .6;
    if (SC.title) { tw.from(q(slot ? '.gg-scSlot' : '.gg-scT'), t, { y: ctx.px(12), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }); t += ctx.d('fast') * .5; }
    if (SC.art) { artIn(tw, ctx, '.gg-scArt', t, { scale: .8, st: ctx.st('normal') }); t += ctx.d('fast'); }
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
    var qt = sc.text || sc.title, qL = splitLines(qt);
    var qfx = TEXT_FX[sc.textFx] && sc.textFx !== 'roll' ? sc.textFx : '';
    if (qfx === 'typewriter') {
      /* 타자기는 줄을 접지 못한다 — 넘치는 줄은 글자를 줄여 한 줄을 지킨다(.62 까지) */
      var need = 0;
      qL.forEach(function (l) { need = Math.max(need, estEm(plain(l)) * qs); });
      if (need > w) qs = Math.max(Math.round(qs * .62), Math.floor(qs * w / need));
    }
    H.push('<div class="gg-quote gg-c" style="left:' + x + 'px;top:' + Math.round(ctx.cy - (ctx.wide ? 190 : 240)) + 'px;width:' + w + 'px">' +
      '<div class="gg-qm" style="font-size:' + Math.round(qs * 2.6) + 'px">“</div>' +
      '<blockquote class="gg-qt' + glowCls(ctx) + '" style="font-size:' + qs + 'px">' + maskLines(qt, '', '', qfx) + '</blockquote>' +
      (sc.by ? '<div class="gg-qby" style="font-size:' + Math.round(ctx.fs.body * .96) + 'px">' + esc(sc.by) +
        (sc.role ? '<span class="gg-qrole"> · ' + esc(sc.role) + '</span>' : '') + '</div>' : '') + '</div>');
    tw.from(q('.gg-qm'), t, { y: ctx.px(20), opacity: 0, scale: .8, duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
    t += ctx.d('fast') * .5;
    var tr = revealText(tw, ctx, q('.gg-qt .gg-mk'), qt, qfx, t, { dur: ctx.d('normal') * 1.1, yp: 110, st: ctx.st('loose') });
    emPop(tw, ctx, q('.gg-qt'), qt, t);
    /* 인용은 문장이 다 자리 잡은 뒤에 출처가 붙는다 — 기본 리빌은 전체 길이를 기다린다 */
    t = Math.max(tr, t + ctx.d('normal') * 1.1 + ctx.st('loose') * Math.max(0, qL.length - 1));
    textLive(tw, ctx, q('.gg-qt'), qt, t + ctx.d('fast'), { glow: true });
    if (sc.by) { tw.from(q('.gg-qby'), t, { x: ctx.px(-18), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }); t += ctx.d('fast'); }
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, sc.text || sc.title || '', { scale: 1.15 }) };
  }
};

/* --- 21. funnel — 단계마다 걸러져 줄어든다. 줄어드는 것 자체가 메시지. --- */
PATTERNS.funnel = {
  label: '퍼널',
  use: '전환 퍼널, 단계별 선별·감소. 위가 넓고 아래가 좁다 — 마지막 단이 결론이다.',
  fields: 'stages[](필수: {label,value,note}) · title · kicker · unit · rates(단 사이 통과율, 기본 true)',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var st = items(sc.stages || sc.items), n = st.length;
    var hasHead = !!(sc.title || sc.kicker), topY = ctx.safe + (ctx.wide ? 28 : 94), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: ctx.wide ? 'left' : 'center' },
        { title: Math.round(ctx.fs.title * .7) });
      H.push(hd.html);
      t = hd.end;
    }
    var mid = hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy;
    var vals = st.map(function (x) { return num(x.value, parseFloat(x.value) || 0); });
    var numeric = vals.some(function (v) { return v > 0; });
    var hi = Math.max.apply(null, vals.concat([1]));
    var rates = sc.rates !== false && numeric;
    var maxW = Math.min(ctx.W - ctx.safe * 2, ctx.wide ? 1180 : 920);
    var gap = ctx.wide ? 46 : 44;
    var barH = clamp(Math.round((ctx.H * (ctx.wide ? .54 : .48) - (n - 1) * gap) / n), 62, ctx.wide ? 100 : 112);
    var totalH = n * barH + (n - 1) * gap, y0 = Math.round(mid - totalH / 2);
    st.forEach(function (x, i) {
      /* 폭이 값을 진다 — 바닥(.36)을 깔고 그 위에 비례를 얹는다. 순수 비례로 하면
         마지막 단이 라벨도 못 담을 만큼 좁아진다. 값이 없으면 선형으로 좁아진다. */
      var ratio = numeric ? .36 + .64 * (vals[i] / hi) : 1 - (n > 1 ? i * (.55 / (n - 1)) : 0);
      var w = Math.round(maxW * ratio);
      var fill = CH.mix(ctx.T.accent, ctx.T.bg2, (1 - (i + 1) / n) * .58);
      /* 글자색은 대비로 고른다 — 액센트가 밝은 테마(파스텔)면 어두운 잉크가 이긴다 */
      var txt = lum(fill) > .3 ? '#12141a' : '#fff';
      var y = y0 + i * (barH + gap);
      H.push('<div class="gg-fnRow" data-i="' + i + '" style="left:' + Math.round(ctx.cx - w / 2) + 'px;top:' + y +
        'px;width:' + w + 'px;height:' + barH + 'px">' +
        '<div class="gg-fnBar" style="background:' + fill + '"></div>' +
        '<div class="gg-fnIn" style="color:' + txt + '">' +
        '<span class="gg-fnLb" style="font-size:' + Math.round(ctx.fs.body * 1.02) + 'px">' + esc(x.label || '') + '</span>' +
        (numeric ? '<span class="gg-fnNum" style="font-size:' + Math.round(ctx.fs.body * 1.28) + 'px">' +
          '<span class="gg-fnVal">0</span><em class="gg-fnUnit">' + esc(x.unit || sc.unit || '') + '</em></span>' : '') +
        '</div>' +
        /* 노트는 바 밖 오른쪽 — 바 안에 넣으면 좁은 단에서 라벨을 밀어낸다 */
        (x.note ? '<div class="gg-fnSide">' + esc(x.note) + '</div>' : '') +
        '</div>');
      if (rates && i < n - 1 && vals[i] > 0) {
        var r = Math.round(vals[i + 1] / vals[i] * 100);
        H.push('<div class="gg-fnRate" data-i="' + i + '" style="left:' + Math.round(ctx.cx - 130) + 'px;top:' +
          Math.round(y + barH + gap / 2 - 17) + 'px;width:260px">↓ ' + r + '%</div>');
      }
    });
    var beat = ctx.d('fast') * 1.05;
    st.forEach(function (x, i) {
      var row = q('.gg-fnRow[data-i="' + i + '"]');
      tw.from(row, t, { y: ctx.px(26), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei });
      /* 바는 중앙에서 양쪽으로 벌어진다 — 깔때기의 대칭이 살아 있어야 한다 */
      tw.fromTo(row + ' .gg-fnBar', t + ctx.d('micro') * .5, { scaleX: 0 },
        { scaleX: 1, duration: ctx.d('fast') * 1.3, ease: ctx.ei });
      if (numeric) tw.count(row + ' .gg-fnVal', t + ctx.d('micro'), ctx.d('normal') * 1.1, 0, vals[i], { dec: num(x.dec, 0) });
      if (rates && i < n - 1 && vals[i] > 0) {
        tw.from(q('.gg-fnRate[data-i="' + i + '"]'), t + beat * .7,
          { y: -ctx.px(12), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei });
      }
      t += beat * .8;
    });
    t += ctx.d('normal') * .7;
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, itemsText(st) + (sc.title || '')) };
  }
};

/* --- 22. cycle — 순환 고리. 마지막 화살표가 처음으로 돌아가 고리를 닫는다. --- */
PATTERNS.cycle = {
  label: '사이클',
  use: '순환·플라이휠·반복 루프. 단계가 원을 돌고, 고리가 닫히는 순간이 클라이맥스다.',
  fields: 'steps[](필수: {label,icon,note}) · center{label,icon}(선택) · title · kicker',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var st = items(sc.steps || sc.items), n = Math.max(st.length, 1);
    var C = typeof sc.center === 'string' ? { label: sc.center } : sc.center;
    var hasHead = !!(sc.title || sc.kicker), topY = ctx.safe + (ctx.wide ? 24 : 84), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: 'center' },
        { title: Math.round(ctx.fs.title * .7) });
      H.push(hd.html);
      t = hd.end;
    }
    var mid = hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy;
    var rx = ctx.wide ? Math.min(540, (ctx.W - ctx.safe * 2) * .3) : (ctx.W - ctx.safe * 2) * .36;
    var ry = rx * (ctx.wide ? .56 : 1.18);
    var p = ringOf(n, ctx.cx, mid, rx, ry, -90);
    /* 노드 사이 원호 — 타원 위를 잘게 쪼갠 폴리라인이라 draw 가 안전하게 걸린다 */
    function arcPts(a1, a2) {
      var out = [], k = 12;
      for (var s = 0; s <= k; s++) {
        var a = (a1 + (a2 - a1) * s / k) * Math.PI / 180;
        out.push([ctx.cx + Math.cos(a) * rx, mid + Math.sin(a) * ry]);
      }
      return out;
    }
    var off = 360 / n * .27;
    var svg = ['<svg class="gg-svg" viewBox="0 0 ' + ctx.W + ' ' + ctx.H + '" aria-hidden="true">'];
    for (var i = 0; i < n; i++) {
      var a1 = p[i].ang + off, a2 = p[i].ang + 360 / n - off;
      var pts = arcPts(a1, a2);
      var d = pts.map(function (pt, s) { return (s ? ' L' : 'M') + r2(pt[0]) + ' ' + r2(pt[1]); }).join('');
      var last = pts[pts.length - 1], prev = pts[pts.length - 2];
      var head2 = arrowParts(prev[0], prev[1], last[0], last[1], 18).head;
      svg.push('<path class="gg-arrow" data-i="' + i + '" d="' + d + '"/>' +
        '<path class="gg-arrow" data-i="' + i + '" data-head="1" d="' + head2 + '"/>');
    }
    svg.push('</svg>');
    H.push(svg.join(''));
    if (C) {
      var cw = ctx.wide ? 280 : 250;
      H.push('<div class="gg-center" style="left:' + Math.round(ctx.cx - cw / 2) + 'px;top:' + Math.round(mid - 70) +
        'px;width:' + cw + 'px;min-height:140px">' + visual(ctx, C, 52, 116) +
        '<div class="gg-centerLb" style="font-size:' + Math.round(ctx.fs.sub * .88) + 'px">' + esc(C.label || '') + '</div></div>');
    }
    var nw = ctx.wide ? 230 : 240;
    st.forEach(function (x, i) {
      H.push('<div class="gg-node gg-cycN" data-i="' + i + '" style="left:' + Math.round(p[i].x - nw / 2) +
        'px;top:' + Math.round(p[i].y - (x.icon || x.art ? 74 : 46)) + 'px;width:' + nw + 'px">' +
        visual(ctx, x, 44, 96) +
        '<div class="gg-nodeLb" style="font-size:' + Math.round(ctx.fs.body * .98) + 'px">' + esc(x.label || '') + '</div>' +
        (x.note ? '<div class="gg-nodeNote">' + esc(x.note) + '</div>' : '') + '</div>');
    });
    if (C) {
      tw.from(q('.gg-center'), t, { scale: .72, opacity: 0, duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
      t += ctx.d('fast') * .8;
    }
    /* 단계 → 원호 → 다음 단계. processFlow 와 같은 문법 — 선이 자라고 꺽쇠가 닫는다. */
    var beat = ctx.d('fast') * 1.05, aw = ctx.d('fast') * .8;
    st.forEach(function (x, i) {
      tw.from(q('.gg-cycN[data-i="' + i + '"]'), t,
        { scale: .78, opacity: 0, duration: beat, ease: TOKENS.e.overshoot });
      if (hasArt(x)) artIn(tw, ctx, '.gg-cycN[data-i="' + i + '"]', t + beat * .4);
      t += beat * .62;
      var sel = '.gg-arrow[data-i="' + i + '"]';
      tw.draw(q(sel + ':not([data-head])'), t, aw * .72, TOKENS.e.move);
      tw.draw(q(sel + '[data-head]'), t + aw * .64, aw * .36, TOKENS.e.move);
      t += aw * .66;
    });
    /* 고리가 닫혔다 — 전체가 한 번 맥동한다. 반복이 시작됐다는 신호. */
    tw.fx('pulse', t, q('.gg-cycN'));
    t += ctx.d('fast');
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, itemsText(st) + (sc.title || '')) };
  }
};

/* --- 23. anatomy — 한 비주얼의 부위를 짚는다. 콜아웃이 차례로 붙는다. --- */
PATTERNS.anatomy = {
  label: '해부도',
  use: '제품·구조의 부위 설명. 중앙 비주얼에 지시선 콜아웃이 하나씩 붙는다.',
  fields: 'parts[](필수: {label,note}) · art|icon(필수, 중앙 비주얼) · title · kicker',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var pt = items(sc.parts || sc.items), n = pt.length;
    var hasHead = !!(sc.title || sc.kicker), topY = ctx.safe + (ctx.wide ? 26 : 88), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: 'center' },
        { title: Math.round(ctx.fs.title * .68) });
      H.push(hd.html);
      t = hd.end;
    }
    var mid = hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy;
    var az = ctx.wide ? Math.min(470, Math.round(ctx.H * .44)) : Math.min(Math.round(ctx.W * .5), 480);
    var ay = ctx.wide ? mid : (hasHead ? topY + hd.h + 60 : ctx.safe + 60) + az / 2;
    /* 중앙 비주얼 — 일러스트가 기본, 없으면 픽토그램을 크게 드로우한다 */
    if (sc.art && VEC.ART[sc.art]) {
      H.push('<div class="gg-anatArt" style="left:' + Math.round(ctx.cx - az / 2) + 'px;top:' + Math.round(ay - az / 2) +
        'px">' + ctx.art(sc.art, az) + '</div>');
      artIn(tw, ctx, '.gg-anatArt', t, { scale: .84, dur: ctx.d('normal'), st: ctx.st('normal') });
    } else if (sc.icon) {
      var isz = Math.round(az * .56);
      H.push('<div class="gg-anatArt" style="left:' + Math.round(ctx.cx - isz / 2) + 'px;top:' + Math.round(ay - isz / 2) +
        'px">' + ctx.icon(sc.icon, isz, 'gg-drawIc') + '</div>');
      tw.draw(q('.gg-anatArt path'), t, ctx.d('slow'), TOKENS.e.draw);
      tw.from(q('.gg-anatArt'), t, { scale: .84, opacity: 0, duration: ctx.d('normal'), ease: ctx.ei });
    }
    t += ctx.d('normal') * .8;
    var svg = ['<svg class="gg-svg" viewBox="0 0 ' + ctx.W + ' ' + ctx.H + '" aria-hidden="true">'];
    var rr = az * .52;
    if (ctx.wide) {
      /* 콜아웃은 좌우로 번갈아 붙는다. 지시선: 점 → 꺾임 → 라벨 */
      var cw = Math.min(420, (ctx.W - az) / 2 - ctx.safe - 160);
      var rs = Math.ceil(n / 2), rowGap = Math.min(180, Math.round(ctx.H * .56 / Math.max(rs, 1)));
      pt.forEach(function (x, i) {
        var side = i % 2 === 0 ? 1 : -1, row = Math.floor(i / 2);
        var rowsThis = side > 0 ? Math.ceil(n / 2) : Math.floor(n / 2);
        var yy = Math.round(mid - (rowsThis - 1) * rowGap / 2 + row * rowGap);
        var cx2 = side > 0 ? ctx.cx + az / 2 + 150 : ctx.cx - az / 2 - 150 - cw;
        var ang = Math.atan2(yy - mid, side * (az / 2 + 150));
        var dx = ctx.cx + Math.cos(ang) * rr, dy = mid + Math.sin(ang) * rr;
        var edge = side > 0 ? cx2 - 12 : cx2 + cw + 12;
        var elbow = side > 0 ? cx2 - 46 : cx2 + cw + 46;
        svg.push('<circle class="gg-dot gg-anatDot" data-i="' + i + '" cx="' + r2(dx) + '" cy="' + r2(dy) + '" r="9"/>');
        svg.push('<path class="gg-link gg-anatLn" data-i="' + i + '" d="M' + r2(dx) + ' ' + r2(dy) +
          ' L' + r2(elbow) + ' ' + yy + ' L' + r2(edge) + ' ' + yy + '"/>');
        H.push('<div class="gg-co" data-i="' + i + '" style="left:' + Math.round(cx2) + 'px;top:' + (yy - 34) +
          'px;width:' + Math.round(cw) + 'px;text-align:' + (side > 0 ? 'left' : 'right') + '">' +
          '<div class="gg-coLb" style="font-size:' + Math.round(ctx.fs.body * 1.08) + 'px">' + esc(x.label || '') + '</div>' +
          (x.note ? '<div class="gg-coNote">' + esc(x.note) + '</div>' : '') + '</div>');
      });
    } else {
      /* 세로 포맷 — 비주얼에서 내려온 레일 하나가 점들을 꿴다. 지시선을 흩뿌리면 꼬인다 */
      var railX = ctx.safe + 30, rowY0 = Math.round(ay + az / 2 + 86), rowGap2 = 128;
      var lastY = rowY0 + (n - 1) * rowGap2;
      var ea = 165 * Math.PI / 180;
      var ex = ctx.cx + Math.cos(ea) * rr, ey = ay + Math.sin(ea) * rr;
      svg.push('<path class="gg-link gg-anatRail" d="M' + r2(ex) + ' ' + r2(ey) +
        ' L' + railX + ' ' + rowY0 + ' L' + railX + ' ' + lastY + '"/>');
      var cw2 = ctx.W - ctx.safe * 2 - 74;
      pt.forEach(function (x, i) {
        var yy = rowY0 + i * rowGap2;
        svg.push('<circle class="gg-dot gg-anatDot" data-i="' + i + '" cx="' + railX + '" cy="' + yy + '" r="9"/>');
        H.push('<div class="gg-co" data-i="' + i + '" style="left:' + (railX + 34) + 'px;top:' + (yy - 22) +
          'px;width:' + cw2 + 'px">' +
          '<div class="gg-coLb" style="font-size:' + Math.round(ctx.fs.body * 1.06) + 'px">' + esc(x.label || '') + '</div>' +
          (x.note ? '<div class="gg-coNote">' + esc(x.note) + '</div>' : '') + '</div>');
      });
    }
    svg.push('</svg>');
    H.push(svg.join(''));
    var beat = ctx.d('fast') * .95;
    if (!ctx.wide) {
      /* 레일이 먼저 내려오고, 점과 라벨이 그 위에 선다 */
      tw.draw(q('.gg-anatRail'), t, ctx.d('normal'), TOKENS.e.move);
      t += ctx.d('fast') * .6;
    }
    pt.forEach(function (x, i) {
      tw.from(q('.gg-anatDot[data-i="' + i + '"]'), t,
        { scale: 0, opacity: 0, transformOrigin: '50% 50%', duration: ctx.d('fast'), ease: TOKENS.e.overshoot });
      if (ctx.wide) tw.draw(q('.gg-anatLn[data-i="' + i + '"]'), t + ctx.d('micro'), ctx.d('fast') * .9, TOKENS.e.move);
      tw.from(q('.gg-co[data-i="' + i + '"]'), t + ctx.d('fast') * .55,
        { y: ctx.px(14), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei });
      t += beat * .75;
    });
    t += ctx.d('fast') * .6;
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, itemsText(pt) + (sc.title || '')) };
  }
};

/* --- 24. featureMatrix — 여럿을 여러 기준으로 견준다. highlight 열이 주인공. --- */
PATTERNS.featureMatrix = {
  label: '기능 매트릭스',
  use: '경쟁사·요금제·선택지 비교. 행이 기준, 열이 후보. highlight 열에 링이 감긴다.',
  fields: 'cols[](필수: {label,icon,highlight}) · rows[](필수: {label,values[]}) · title · kicker — values 는 true|false|문자열',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var cols = items(sc.cols).slice(0, 4), c = cols.length;
    var rows = items(sc.rows || sc.items), n = rows.length;
    var hasHead = !!(sc.title || sc.kicker), topY = ctx.safe + (ctx.wide ? 26 : 88), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: ctx.wide ? 'left' : 'center' },
        { title: Math.round(ctx.fs.title * .68) });
      H.push(hd.html);
      t = hd.end;
    }
    var mid = hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy;
    var maxW = Math.min(ctx.W - ctx.safe * 2, ctx.wide ? 1320 : 940);
    var lw = ctx.wide ? 300 : 180, gap = 14, rGap = 10;
    var cw = Math.floor((maxW - lw - gap * c) / c);
    var hasIco = cols.some(function (x) { return x.icon; });
    var headH = hasIco ? (ctx.wide ? 118 : 112) : 76;
    var rowH = ctx.wide ? 86 : 94;
    var totalH = headH + 18 + n * rowH + (n - 1) * rGap;
    var x0 = Math.round((ctx.W - maxW) / 2), y0 = Math.round(mid - totalH / 2);
    var hiIdx = -1;
    cols.forEach(function (x, j) {
      if (x.highlight && hiIdx < 0) hiIdx = j;
      H.push('<div class="gg-fmHead" data-i="' + j + '" style="left:' + (x0 + lw + gap + j * (cw + gap)) +
        'px;top:' + y0 + 'px;width:' + cw + 'px;height:' + headH + 'px;font-size:' + Math.round(ctx.fs.body * 1.02) + 'px">' +
        (x.icon ? ctx.icon(x.icon, 40) : '') + '<span>' + esc(x.label || '') + '</span></div>');
    });
    rows.forEach(function (x, i) {
      var cells = arr(x.values).slice(0, c).map(function (v, j) {
        var inner = v === true ? ctx.icon('check', 36, 'gg-fmMark gg-fmYes')
          : v === false ? ctx.icon('x', 30, 'gg-fmMark gg-fmNo')
          : '<span class="gg-fmMark gg-fmTxt" style="font-size:' + Math.round(ctx.fs.body * .96) + 'px">' + esc(String(v == null ? '' : v)) + '</span>';
        return '<div class="gg-fmCell" style="flex:0 0 ' + cw + 'px;margin-left:' + gap + 'px">' + inner + '</div>';
      }).join('');
      H.push('<div class="gg-fmRow" data-i="' + i + '" style="left:' + x0 + 'px;top:' + (y0 + headH + 18 + i * (rowH + rGap)) +
        'px;width:' + maxW + 'px;height:' + rowH + 'px">' +
        '<div class="gg-fmRowLb" style="flex:0 0 ' + lw + 'px;font-size:' + Math.round(ctx.fs.body * .98) + 'px">' +
        esc(x.label || '') + '</div>' + cells + '</div>');
    });
    if (hiIdx >= 0) {
      H.push('<div class="gg-fmHi" style="left:' + (x0 + lw + gap + hiIdx * (cw + gap) - 10) + 'px;top:' + (y0 - 10) +
        'px;width:' + (cw + 20) + 'px;height:' + (totalH + 20) + 'px"></div>');
    }
    enterItems(tw, ctx, cols, '.gg-fmHead', t, ctx.st('tight') * 1.5,
      { y: ctx.px(24), scale: .95, opacity: 0, duration: ctx.d('fast'), ease: ctx.ei });
    t += ctx.d('fast') * .9 + ctx.st('tight') * 1.5 * (c - 1);
    var stR = ctx.st('normal');
    enterItems(tw, ctx, rows, '.gg-fmRow', t, stR, { y: ctx.px(22), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei });
    /* 판정 마크는 행이 자리를 잡은 뒤 튀어나온다 — 표가 채워지는 리듬 */
    enterItems(tw, ctx, rows, '.gg-fmRow', t, stR,
      { scale: 0, opacity: 0, duration: ctx.d('fast'), ease: TOKENS.e.overshoot },
      { inner: ' .gg-fmMark', lead: ctx.d('micro') * 1.5 });
    t += ctx.d('fast') * 1.2 + stR * (n - 1);
    if (hiIdx >= 0) {
      /* 주인공 열의 링은 표가 다 찬 뒤에 감긴다 — 결론은 마지막에 */
      tw.from(q('.gg-fmHi'), t, { scale: .96, opacity: 0, transformOrigin: '50% 50%',
        duration: ctx.d('fast') * 1.2, ease: TOKENS.e.overshoot });
      if (ctx.energy === 'E3') tw.fx('impact', t);
      t += ctx.d('fast');
    }
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, itemsText(rows) + itemsText(cols) + (sc.title || '')) };
  }
};

/* --- 25. chapterCard — 영상의 장이 바뀐다. 번호가 서고 레일이 지금 어디인지 말한다. --- */
PATTERNS.chapterCard = {
  label: '챕터 카드',
  use: '유튜브 영상의 장 구분. 큰 번호와 진행 레일이 "전체 중 지금 여기"를 말해 준다.',
  fields: 'title(필수) · no(장 번호 — 숫자면 01 로 채운다) · chapters[](전체 장 이름, 현재 장이 켜진다) · of(전체 장 수, chapters 대신) · current(1부터, 기본 no) · sub · kicker',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var chs = items(sc.chapters);
    var total = chs.length || Math.max(Math.round(num(sc.of, 0)), 0);
    /* 숫자로 준 장 번호는 01 로 채운다 — 자리수가 흔들리면 장마다 글자 크기가 달라 보인다.
       "PART 3" 처럼 글자로 주면 그대로 쓴다. */
    var noNum = typeof sc.no === 'number' ? sc.no : (sc.no == null ? Math.round(num(sc.current, 1)) : null);
    var noTxt = noNum == null ? String(sc.no) : pad(Math.max(noNum, 0), 2);
    var cur = clamp(Math.round(num(sc.current, noNum == null ? 1 : noNum)), 1, Math.max(total, 1));
    var hasRail = total > 1;
    var railTop = ctx.H - ctx.safe - (ctx.wide ? 92 : 128);
    /* 레일이 아래를 차지하므로 본문은 남은 공간의 중심에 선다 */
    var mid = Math.round((ctx.safe + (hasRail ? railTop - 40 : ctx.H - ctx.safe)) / 2);
    var numSize = Math.round(ctx.fs.num * (ctx.wide ? .82 : .68));
    var tSize = Math.round(ctx.fs.title * (ctx.wide ? .8 : .76));
    var numW = Math.round(estEm(noTxt) * numSize);
    var align = ctx.wide ? 'left' : 'center', textW, textX, numX, headY, numTop;
    if (ctx.wide) {
      textW = Math.min(ctx.W - ctx.safe * 2 - numW - 72, 1080);
      numX = Math.round((ctx.W - (numW + 72 + textW)) / 2);
      textX = numX + numW + 72;
    } else {
      textW = ctx.W - ctx.safe * 2;
      textX = ctx.safe;
      numX = Math.round(ctx.cx - numW / 2);
    }
    /* 헤더 높이를 먼저 재고 배치한다 — 타이틀이 두 줄이 되면 중심이 밀린다.
       재는 방법은 한 번 만들어 보는 것뿐이므로 트윈은 버리는 TW 로 받는다. */
    var probe = head(sc, ctx, new TW(), 0, { x: textX, y: 0, w: textW, align: align }, { title: tSize });
    var probeH = probe.h + headWrapExtra(sc.title || '', tSize, textW);
    if (ctx.wide) {
      headY = Math.round(mid - probeH / 2);
      numTop = Math.round(headY + probeH / 2 - numSize * .58);
    } else {
      numTop = Math.round(mid - (numSize + 34 + probeH) / 2);
      headY = Math.round(numTop + numSize + 34);
    }
    H.push('<div class="gg-chNo" style="left:' + numX + 'px;top:' + numTop + 'px;width:' + numW +
      'px;font-size:' + numSize + 'px">' + esc(noTxt) + '</div>');
    tw.from(q('.gg-chNo'), t, { scale: .64, opacity: 0, y: ctx.px(22), transformOrigin: '50% 50%',
      duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
    if (ctx.energy === 'E3') tw.fx('impact', t + ctx.d('micro'));
    t += ctx.d('fast') * .75;
    var hd = head(sc, ctx, tw, t, { x: textX, y: headY, w: textW, align: align }, { title: tSize });
    H.push(hd.html);
    t = hd.end;
    if (hasRail) {
      var railW = Math.min(ctx.W - ctx.safe * 2, ctx.wide ? 1440 : 900);
      var rx0 = Math.round((ctx.W - railW) / 2), segGap = ctx.wide ? 16 : 12;
      var segW = (railW - segGap * (total - 1)) / total, lbSize = ctx.wide ? 22 : 21;
      /* 장 이름은 칸에 들어갈 때만 다 적는다 — 넘치면 접히거나 옆 칸과 부딪히므로
         지금 장 하나만 레일 아래 가운데에 적는다. */
      var fits = chs.length === total && chs.every(function (c) {
        return estEm(c.label || '') * lbSize <= segW - 12;
      });
      for (var i = 0; i < total; i++) {
        var state = i + 1 < cur ? ' gg-chDone' : (i + 1 === cur ? ' gg-chNow' : '');
        H.push('<div class="gg-chSeg' + state + '" data-i="' + i + '" style="left:' +
          Math.round(rx0 + i * (segW + segGap)) + 'px;top:' + railTop + 'px;width:' + Math.round(segW) + 'px">' +
          '<div class="gg-chTrack"><div class="gg-chFill"></div></div>' +
          (fits && chs[i] ? '<div class="gg-chSegLb" style="font-size:' + lbSize + 'px">' +
            esc(chs[i].label || '') + '</div>' : '') + '</div>');
      }
      if (!fits && chs[cur - 1]) {
        H.push('<div class="gg-chCur" style="left:' + rx0 + 'px;top:' + (railTop + 28) + 'px;width:' + railW +
          'px;font-size:' + (ctx.wide ? 25 : 24) + 'px">' + esc(chs[cur - 1].label || '') + '</div>');
      }
      tw.from(q('.gg-chSeg'), t, { y: ctx.px(14), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei }, ctx.st('tight'));
      t += ctx.d('fast') * .8 + ctx.st('tight') * (total - 1);
      /* 지난 장은 이미 채워져 있고, 지금 장만 왼쪽에서 채워진다 — "여기까지 왔다" */
      tw.from(q('.gg-chNow .gg-chFill'), t, { scaleX: 0, duration: ctx.d('normal'), ease: TOKENS.e.move });
      tw.from(q('.gg-chNow .gg-chSegLb'), t + ctx.d('micro'), { y: ctx.px(8), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei });
      tw.from(q('.gg-chCur'), t + ctx.d('micro'), { y: ctx.px(8), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei });
      t += ctx.d('normal') * .8;
    }
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, (sc.title || '') + (sc.sub || ''), { min: 2.2 }) };
  }
};

/* --- 26. rankList — 순위. 아래에서부터 열려 1위에서 멈춘다. --- */
PATTERNS.rankList = {
  label: '랭킹',
  use: 'Top N 순위. 카운트다운으로 낮은 순위부터 열고 1위에 링이 감기며 멈춘다.',
  fields: 'items[](필수: {label,note,value,unit,icon|art,rank,tone}) · order(countdown|up, 기본 countdown) · unit(공통 단위) · top(1위 강조, 기본 true) · title · kicker',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var it = items(sc.items), n = Math.max(it.length, 1);
    var hasHead = !!(sc.title || sc.kicker), topY = ctx.safe + (ctx.wide ? 30 : 92), hd;
    if (hasHead) {
      hd = head(sc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: ctx.wide ? 'left' : 'center' },
        { title: Math.round(ctx.fs.title * .7) });
      H.push(hd.html);
      t = hd.end;
    }
    var mid = hasHead ? bodyCy(ctx, topY, hd.h) : ctx.cy;
    var rowW = Math.min(ctx.W - ctx.safe * 2, ctx.wide ? 1200 : 940);
    var gap = ctx.wide ? 14 : 12;
    /* 행 높이는 남은 높이를 나눠 갖는다 — 6행이 들어와도 아래로 넘치지 않는다 */
    var room = (ctx.H - ctx.safe) - (mid - (ctx.H - ctx.safe - mid));
    var rowH = clamp(Math.floor((room - gap * (n - 1)) / n), 76, ctx.wide ? 124 : 134);
    var totalH = n * rowH + (n - 1) * gap;
    var x0 = Math.round((ctx.W - rowW) / 2), y0 = Math.round(mid - totalH / 2);
    var noSize = Math.round(rowH * .5), lbSize = Math.round(ctx.fs.body * .98), valSize = Math.round(rowH * .36);
    var unit = sc.unit || '', topIdx = -1;
    it.forEach(function (x, i) {
      var rank = Math.round(num(x.rank, i + 1));
      var isTop = rank === 1 && sc.top !== false;
      if (isTop && topIdx < 0) topIdx = i;
      var vis = visual(ctx, x, Math.round(rowH * .42), Math.round(rowH * .84));
      H.push('<div class="gg-rkRow' + (isTop ? ' gg-rkTop' : '') + (x.tone ? ' gg-t-' + x.tone : '') +
        '" data-i="' + i + '" style="left:' + x0 + 'px;top:' + (y0 + i * (rowH + gap)) +
        'px;width:' + rowW + 'px;height:' + rowH + 'px">' +
        '<div class="gg-rkNo" style="font-size:' + noSize + 'px;min-width:' + Math.round(noSize * 1.4) + 'px">' +
        rank + '</div>' +
        (vis ? '<div class="gg-rkVis">' + vis + '</div>' : '') +
        '<div class="gg-rkBody">' +
        '<div class="gg-rkLb" style="font-size:' + (isTop ? Math.round(lbSize * 1.12) : lbSize) + 'px">' +
        esc(x.label || '') + '</div>' +
        (x.note ? '<div class="gg-rkNote">' + esc(x.note) + '</div>' : '') + '</div>' +
        (x.value != null ? '<div class="gg-rkVal" style="font-size:' + valSize + 'px">' + esc(String(x.value)) +
          (x.unit || unit ? '<span class="gg-rkUnit">' + esc(x.unit || unit) + '</span>' : '') + '</div>' : '') +
        '</div>');
    });
    if (topIdx >= 0) {
      H.push('<div class="gg-rkHi" style="left:' + (x0 - 9) + 'px;top:' + (y0 + topIdx * (rowH + gap) - 9) +
        'px;width:' + (rowW + 18) + 'px;height:' + (rowH + 18) + 'px"></div>');
    }
    /* 공개 순서. 자리는 순위가 정하고 순서만 뒤집히므로, 카운트다운이면 아래에서 위로 채워진다 */
    var order = it.map(function (x, i) { return i; });
    if ((sc.order || 'countdown') === 'countdown') {
      order.sort(function (a, b) {
        return Math.round(num(it[b].rank, b + 1)) - Math.round(num(it[a].rank, a + 1));
      });
    }
    var beat = ctx.d('fast') * 1.1;
    order.forEach(function (i) {
      var s = '.gg-rkRow[data-i="' + i + '"]';
      tw.from(q(s), t, { y: ctx.px(24), x: ctx.px(26), opacity: 0, duration: ctx.d('fast') * 1.15, ease: ctx.ei });
      tw.from(q(s + ' .gg-rkNo'), t + ctx.d('micro') * .8,
        { scale: .6, opacity: 0, transformOrigin: '50% 50%', duration: ctx.d('fast'), ease: TOKENS.e.overshoot });
      if (hasArt(it[i])) artIn(tw, ctx, s, t + beat * .3);
      t += beat;
    });
    if (topIdx >= 0) {
      /* 1위의 링은 표가 다 찬 뒤에 감긴다 — 결론은 마지막에 */
      tw.from(q('.gg-rkHi'), t, { scale: .96, opacity: 0, transformOrigin: '50% 50%',
        duration: ctx.d('fast') * 1.2, ease: TOKENS.e.overshoot });
      if (ctx.energy === 'E3') tw.fx('impact', t);
      t += ctx.d('fast');
    }
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, itemsText(it) + (sc.title || '')) };
  }
};

/* --- 27. quizReveal — 질문을 던지고, 생각할 틈을 두고, 답을 연다. --- */
PATTERNS.quizReveal = {
  label: '퀴즈',
  use: '질문 → 선택지 → 정답. 선택지 뒤의 정지가 이 패턴의 핵이다 — 답을 바로 열면 시청자가 스스로 꺼내지 않는다.',
  fields: 'question(필수) · options[]({label,correct,note,icon}) · answer(문자열 또는 {label,note}) · beat(생각할 틈, 초 기본 1.2) · reveal(기본 true) · kicker · sub',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    var op = items(sc.options), n = op.length;
    var A = typeof sc.answer === 'string' ? { label: sc.answer } : (sc.answer || null);
    var reveal = sc.reveal !== false;
    /* 질문이 곧 타이틀이다 — 마스크 리빌·마크·textFx 를 헤더에서 그대로 물려받는다 */
    var hsc = copy(sc);
    hsc.title = sc.question || sc.title;
    var tSize = Math.round(ctx.fs.title * .8);
    var ansH = (reveal && A) ? (ctx.wide ? 124 : 146) : 0;
    var cols = ctx.wide ? (n <= 2 ? Math.max(n, 1) : 2) : 1;
    var gapX = ctx.wide ? 28 : 22, gapY = ctx.wide ? 20 : 18;
    var maxW = Math.min(ctx.W - ctx.safe * 2, ctx.wide ? 1240 : 900);
    var optW = Math.floor((maxW - (cols - 1) * gapX) / cols), optH = ctx.wide ? 116 : 124;
    var rows = Math.max(Math.ceil(n / cols), 1);
    var blockH = n ? rows * optH + (rows - 1) * gapY : 0;
    /* 질문 · 선택지 · 정답 띠는 한 덩어리다 — 덩어리째 화면 중앙에 놓는다.
       헤더 아래 남은 공간의 중심(bodyCy)에 선택지만 놓으면, 선택지가 두 개뿐일 때
       질문과 선택지 사이가 화면 높이만큼 벌어져 둘이 다른 씬처럼 읽힌다. */
    var gapQ = ctx.wide ? 72 : 84, gapA = ctx.wide ? 40 : 44;
    var probe = head(hsc, ctx, new TW(), 0, { x: ctx.safe, y: 0, w: ctx.W - ctx.safe * 2, align: 'center' },
      { title: tSize });
    var probeH = probe.h + headWrapExtra(hsc.title || '', tSize, ctx.W - ctx.safe * 2);
    var stackH = probeH + (n ? gapQ + blockH : 0) + (ansH ? gapA + ansH : 0);
    var topY = clamp(Math.round((ctx.H - stackH) / 2), ctx.safe + (ctx.wide ? 20 : 60),
      Math.max(ctx.safe, ctx.H - ctx.safe - stackH));
    var hd = head(hsc, ctx, tw, t, { x: ctx.safe, y: topY, w: ctx.W - ctx.safe * 2, align: 'center' },
      { title: tSize });
    H.push(hd.html);
    t = hd.end;
    var blockTop = Math.round(topY + probeH + gapQ);
    var ci = -1;
    op.forEach(function (x, i) { if (x.correct && ci < 0) ci = i; });
    if (n) {
      var g = gridOf(n, cols, ctx.W, optW, optH, gapX, gapY, blockTop + blockH / 2);
      op.forEach(function (x, i) {
        H.push('<div class="gg-qzOpt" data-i="' + i + '" style="left:' + Math.round(g[i].x) + 'px;top:' +
          Math.round(g[i].y) + 'px;width:' + optW + 'px;height:' + optH + 'px">' +
          '<div class="gg-qzKey">' + 'ABCDEF'.charAt(i) + '</div>' +
          (x.icon ? ctx.icon(x.icon, Math.round(optH * .38)) : '') +
          '<div class="gg-qzBody">' +
          '<div class="gg-qzLb" style="font-size:' + Math.round(ctx.fs.body * .98) + 'px">' + esc(x.label || '') + '</div>' +
          (x.note ? '<div class="gg-qzNote">' + esc(x.note) + '</div>' : '') + '</div></div>');
      });
      if (reveal && ci >= 0) {
        H.push('<div class="gg-qzHi" style="left:' + Math.round(g[ci].x - 9) + 'px;top:' + Math.round(g[ci].y - 9) +
          'px;width:' + (optW + 18) + 'px;height:' + (optH + 18) + 'px"></div>');
      }
    }
    if (reveal && A) {
      var bandW = Math.min(maxW, ctx.wide ? 1020 : 880);
      var bandY = Math.round(n ? blockTop + blockH + gapA : topY + probeH + gapA);
      H.push('<div class="gg-qzAns" style="left:' + Math.round((ctx.W - bandW) / 2) + 'px;top:' + bandY +
        'px;width:' + bandW + 'px;min-height:' + ansH + 'px">' + ctx.icon('check', ctx.wide ? 46 : 42) +
        '<div><div class="gg-qzAnsT" style="font-size:' + Math.round(ctx.fs.sub * .96) + 'px">' +
        esc(A.label || '') + '</div>' +
        (A.note ? '<div class="gg-qzAnsN">' + esc(A.note) + '</div>' : '') + '</div></div>');
    }
    if (n) {
      enterItems(tw, ctx, op, '.gg-qzOpt', t, ctx.st('normal'),
        { y: ctx.px(26), scale: .96, opacity: 0, duration: ctx.d('fast') * 1.15, ease: ctx.ei });
      t += ctx.d('fast') * 1.15 + ctx.st('normal') * (n - 1);
    }
    /* 생각할 틈 — 화면이 멈춰 있는 이 구간이 인출을 만든다. 에너지 배율을 따른다 */
    t += r2(Math.max(0, num(sc.beat, 1.2)) * ctx.E.dm);
    if (reveal) {
      if (ci >= 0) {
        op.forEach(function (x, i) {
          if (i === ci) return;
          tw.to(q('.gg-qzOpt[data-i="' + i + '"]'), t, { opacity: .34, duration: ctx.d('fast'), ease: TOKENS.e.soft });
        });
        tw.from(q('.gg-qzHi'), t + ctx.d('micro'), { scale: .94, opacity: 0, transformOrigin: '50% 50%',
          duration: ctx.d('fast') * 1.2, ease: TOKENS.e.overshoot });
        if (ctx.energy === 'E3') tw.fx('impact', t + ctx.d('micro'));
        t += ctx.d('fast') * 1.1;
      }
      if (A) {
        tw.from(q('.gg-qzAns'), t, { y: ctx.px(22), scale: .96, opacity: 0,
          duration: ctx.d('normal'), ease: TOKENS.e.overshoot });
        t += ctx.d('normal') * .8;
      }
    }
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, (hsc.title || '') + itemsText(op) + (A ? A.label : '')) };
  }
};

/* --- 28. endCard — 아웃트로. 구독을 청하고 다음 볼 것을 건넨다. --- */
PATTERNS.endCard = {
  label: '엔드카드',
  use: '영상의 마지막 씬. 구독·알림 청하기와 다음 영상 권하기를 한 화면에서 끝낸다.',
  fields: 'title(필수) · sub · cta[]({label,icon} — 생략하면 구독·좋아요·알림) · next[]({label,note,icon|art,badge} — 다음 볼 것, 2개까지) · handle(채널 이름) · kicker',
  build: function (sc, ctx) {
    var tw = new TW(), q = ctx.q, H = [], t = 0;
    /* CTA 를 안 적으면 유튜브의 세 가지를 그대로 쓴다 — 라벨은 스펙에서 바꿀 수 있다 */
    var cta = items(has(sc, 'cta') ? sc.cta : [
      { label: '구독', icon: 'user' }, { label: '좋아요', icon: 'thumbup' }, { label: '알림', icon: 'bell' }
    ]);
    var nx = items(sc.next).slice(0, 2), m = cta.length, k = nx.length;
    var tSize = Math.round(ctx.fs.title * (ctx.wide ? .9 : .84));
    var w = Math.min(ctx.W - ctx.safe * 2, ctx.wide ? 1400 : 940), x = Math.round((ctx.W - w) / 2);
    var chipH = ctx.wide ? 92 : 104, chipW = ctx.wide ? 250 : 230, chipGap = ctx.wide ? 26 : 20;
    /* 세로 프레임에서는 다음 볼 것을 한 열로 세운다 — 좁은 폭에 두 장을 나란히 놓으면
       제목이 두 줄로 접히고 카드가 납작해진다. 가로는 나란히가 낫다(눈이 한 번에 견준다). */
    var nxCols = ctx.wide ? Math.max(k, 1) : 1;
    /* 카드 높이는 카드 규칙(.gg-card 의 여백 36·간격 16)과 안에 실제로 든 것에서 계산한다.
       상수로 박으면 카드가 그 높이를 넘겨 자라 다음 카드·채널 이름과 겹친다. */
    var nxIcon = ctx.wide ? 72 : 64, nxRow = [];
    if (nx.some(function (v) { return v.icon || hasArt(v); })) nxRow.push(nxIcon + 4);
    if (nx.some(function (v) { return v.value != null; })) nxRow.push(53);
    nxRow.push(46);
    if (nx.some(function (v) { return v.note; })) nxRow.push(34);
    var cardH = k ? 72 + nxRow.reduce(function (a, b) { return a + b; }, 0) + 16 * (nxRow.length - 1) : 0;
    var cardW = k ? Math.min(ctx.wide ? 520 : 820, Math.floor((w - (nxCols - 1) * 32) / nxCols)) : 0;
    var nxRows = Math.ceil(k / nxCols), cardGapY = 20;
    var nxH = k ? nxRows * cardH + (nxRows - 1) * cardGapY : 0;
    var gapA = ctx.wide ? 56 : 96, gapB = ctx.wide ? 44 : 60, gapC = ctx.wide ? 44 : 62;
    /* 네 층(제목 · CTA · 다음 볼 것 · 채널 이름)을 한 덩어리로 보고 그 덩어리를 화면 중앙에 놓는다.
       층마다 제자리를 따로 잡으면 층이 빠진 경우(다음 영상이 없을 때)에 가운데가 텅 빈다. */
    var probe = head(sc, ctx, new TW(), 0, { x: x, y: 0, w: w, align: 'center' }, { title: tSize });
    var probeH = probe.h + headWrapExtra(sc.title || '', tSize, w);
    var footH = sc.handle ? gapC + 34 : 0;
    var stackH = probeH + gapA + chipH + (k ? gapB + nxH : 0) + footH;
    var headY = clamp(Math.round((ctx.H - stackH) / 2), ctx.safe, ctx.H - ctx.safe - stackH);
    var ctaY = Math.round(headY + probeH + gapA);
    var cardY = ctaY + chipH + gapB;
    var handleY = (k ? cardY + nxH : ctaY + chipH) + gapC;
    var hd = head(sc, ctx, tw, t, { x: x, y: headY, w: w, align: 'center' }, { title: tSize });
    H.push(hd.html);
    t = hd.end;
    var cg = rowOf(m, ctx.W, chipW, chipGap);
    cta.forEach(function (c, i) {
      H.push('<div class="gg-ecCta" data-i="' + i + '" style="left:' + Math.round(cg[i].x) + 'px;top:' + ctaY +
        'px;width:' + chipW + 'px;height:' + chipH + 'px;font-size:' + Math.round(ctx.fs.body * .96) + 'px">' +
        (c.icon ? ctx.icon(c.icon, Math.round(chipH * .42)) : '') + '<span>' + esc(c.label || '') + '</span></div>');
    });
    if (k) {
      var g = gridOf(k, nxCols, ctx.W, cardW, cardH, 32, cardGapY, cardY + nxH / 2);
      nx.forEach(function (v, i) {
        H.push(card(v, g[i], ctx, { cls: 'gg-ecNext', idx: i, iconSize: ctx.wide ? 72 : 64,
          labelSize: Math.round(ctx.fs.body * 1.02), noteSize: 23 }));
      });
    }
    if (sc.handle) {
      H.push('<div class="gg-ecHandle" style="left:' + x + 'px;top:' + handleY + 'px;width:' + w +
        'px;font-size:' + (ctx.wide ? 26 : 25) + 'px">' + esc(sc.handle) + '</div>');
    }
    enterItems(tw, ctx, cta, '.gg-ecCta', t, ctx.st('normal'),
      { scale: .74, opacity: 0, transformOrigin: '50% 50%', duration: ctx.d('fast') * 1.2, ease: TOKENS.e.overshoot });
    t += ctx.d('fast') * 1.2 + ctx.st('normal') * (m - 1);
    if (k) {
      enterItems(tw, ctx, nx, '.gg-ecNext', t, ctx.st('loose'),
        { y: ctx.px(32), scale: .97, opacity: 0, duration: ctx.d('fast') * 1.25, ease: ctx.ei });
      enterItems(tw, ctx, nx, '.gg-ecNext', t, ctx.st('loose'),
        { scale: .6, opacity: 0, duration: ctx.d('fast'), ease: TOKENS.e.overshoot },
        { inner: ' .gg-ic', lead: ctx.d('micro') });
      nx.forEach(function (v, i) {
        if (hasArt(v)) artIn(tw, ctx, '.gg-ecNext[data-i="' + i + '"]', t + ctx.d('fast') * .8);
      });
      t += ctx.d('fast') * 1.25 + ctx.st('loose') * (k - 1);
    }
    if (sc.handle) {
      tw.from(q('.gg-ecHandle'), t, { y: ctx.px(12), opacity: 0, duration: ctx.d('fast'), ease: ctx.ei });
      t += ctx.d('fast') * .5;
    }
    /* 마지막에 CTA 가 한 번 맥동한다 — 이 화면에서 시청자가 할 일이 그것이다 */
    tw.fx('pulse', t, q('.gg-ecCta'));
    t += ctx.d('fast');
    return { html: H.join(''), tw: tw, dur: sceneDur(sc, ctx, t, (sc.title || '') + (sc.sub || '') + itemsText(nx), { add: .4 }) };
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
  deviceShow: ['frame|screen'], chart: ['chart', 'data|items|series'], marquee: ['items'],
  funnel: ['stages|items'], cycle: ['steps|items'],
  anatomy: ['parts|items', 'art|icon'], featureMatrix: ['rows|items', 'cols'],
  chapterCard: ['title'], rankList: ['items'], quizReveal: ['question|title'], endCard: ['title']
};
/* 씬 길이 상한(초) — 카메라 순회처럼 여러 지점을 훑는 패턴은 원래 길다.
   퀴즈는 선택지 뒤에 일부러 멈추므로 그 정지까지가 씬 길이다. */
var MAXSEC = { cameraJourney: 20, timeline: 16, zoomDetail: 15, quizReveal: 15, convergence: 14 };
/* 밀도 상한 — 넘으면 씬을 나누라고 경고한다. 애니메이션은 정보량을 줄여주지 않는다. */
var MAXITEMS = {
  cardsCascade: 9, networkBuild: 8, processFlow: 6, explodedDiagram: 6, zoomDetail: 8,
  dataCounter: 4, timeline: 6, convergence: 7, divergence: 7, orbit: 10, cameraJourney: 5, kineticType: 6,
  funnel: 6, cycle: 6, anatomy: 6, featureMatrix: 10,
  chapterCard: 6, rankList: 6, quizReveal: 4, endCard: 2
};
/* 프레임 안에 들어가는 줄·항목 수 상한 — 화면 목업은 정보 밀도가 금방 넘친다 */
var MAXSCREEN = 7;

/* ================================================================== *
 * 트랜지션 — 씬 사이. 의미 없는 전환은 fade 보다 나쁘다.
 * dur 은 에너지의 trans 배율이 정한다.
 * ================================================================== */
var TRANSITIONS = {
  cut:       { label: '컷 — 즉시 교체. 리듬을 만들 때', out: null, inFrom: null, d: .001 },
  fade:      { label: '페이드 — 개념이 부드럽게 바뀔 때(기본)', out: { opacity: 0, scale: 1.012 }, inFrom: { opacity: 0, scale: .988 }, d: .7 },
  pushLeft:  { label: '푸시 좌 — 진행·다음 단계', out: { xPercent: -22, opacity: 0 }, inFrom: { xPercent: 22, opacity: 0 }, d: .8 },
  pushRight: { label: '푸시 우 — 되돌아가기·회상', out: { xPercent: 22, opacity: 0 }, inFrom: { xPercent: -22, opacity: 0 }, d: .8 },
  pushUp:    { label: '푸시 상 — 층을 올라감·심화', out: { yPercent: -18, opacity: 0 }, inFrom: { yPercent: 18, opacity: 0 }, d: .8 },
  zoomIn:    { label: '줌 인 — 전체에서 부분으로', out: { scale: 1.35, opacity: 0 }, inFrom: { scale: .78, opacity: 0 }, d: .9 },
  zoomOut:   { label: '줌 아웃 — 부분에서 전체로', out: { scale: .78, opacity: 0 }, inFrom: { scale: 1.3, opacity: 0 }, d: .9 },
  wipe:      { label: '와이프 — 화면을 닦아 교체. 장 구분', out: { opacity: 0 }, inFrom: { clip: 1, opacity: 1 }, d: .85 },
  match:     { label: '매치 — 겹쳐 넘긴다. 같은 형태가 이어질 때', out: { scale: 1.08, opacity: 0 }, inFrom: { scale: .96, opacity: 0 }, d: 1.0, overlap: .55 },
  curve:     { label: '곡선 와이프 — 아래에서 원호가 올라와 화면을 덮는다. 장 전환', out: { opacity: 0 }, inFrom: { clip: 'curve' }, d: 1.0 },
  pageFlip:  { label: '페이지 넘김 — 책장을 넘기듯 3D Y축 회전. 장·챕터 구분', out: { rotateY: -85, transformOrigin: '0% 50%', opacity: 0 }, inFrom: { rotateY: 85, transformOrigin: '100% 50%', opacity: 0 }, d: 1.0, overlap: .55 },
  paperPeel: { label: '종이 떼기 — 포스트잇이 떼어지듯 사선으로 들려 나감', out: { xPercent: 28, yPercent: -18, rotate: 6, opacity: 0 }, inFrom: { scale: .96, opacity: 0 }, d: .85 },
  curlWipe:  { label: '컬 와이프 — 종이 귀퉁이가 대각선으로 말려 올라가며 전환', out: { opacity: 0 }, inFrom: { clip: 'curl' }, d: 1.0 },
  clayPop:   { label: '클레이 팝 — 통통 튀어 올라 찌그러지며 탄성 전환', out: { scaleX: 1.14, scaleY: 0.86, y: -45, opacity: 0, ease: 'back.in(1.6)' }, inFrom: { scaleX: 0.84, scaleY: 1.16, scale: 0.92, opacity: 0, ease: 'elastic.out(1.2, 0.45)' }, d: .9, overlap: .5 },
  squish:    { label: '스쿼시 — 바닥으로 쿵 눌렸다가 튀어 오르는 탄성 전환', out: { scaleX: 1.22, scaleY: 0.72, opacity: 0 }, inFrom: { y: 50, scaleX: 0.88, scaleY: 1.15, opacity: 0 }, d: .85 },
};

/* ================================================================== *
 * 씬 카메라 — 정지 프레임을 없앤다.
 *
 * 슬라이드와 영상을 가르는 건 패턴이 아니라 **한 프레임도 완전히 멈추지 않는다**는
 * 사실이다. 등장 애니메이션이 끝난 뒤 hold 동안 화면이 굳어 있으면, 그 hold 는
 * 영상이 아니라 넘기기 전의 슬라이드로 읽힌다.
 *
 * 그래서 씬마다 카메라가 씬 전체 길이(hold 포함) 동안 아주 느리게 움직인다.
 * 진폭은 눈에 "움직임"으로 보이지 않을 만큼 작아야 한다 — 보이면 산만해진다.
 * 이징은 선형이다. 느린 카메라에 가속을 걸면 시작·끝에서 멈춘 것처럼 보인다.
 *
 * 안전 여백과의 관계: 줌은 배율이라 화면 끝의 요소가 (amp/2)·화면크기 만큼 밖으로
 * 나간다. amp .045 면 16:9 에서 43px 이고 안전 여백은 96px 이므로 잘리지 않는다.
 * 팬·틸트는 배율을 건드리지 않고 world 레이어만 밀기 때문에(배경은 별도 레이어라
 * 빈자리가 생기지 않는다) 여백 안에서만 움직이면 된다.
 * ================================================================== */
var CAMS = {
  none:     { label: '없음 — 카메라를 세운다' },
  pushIn:   { label: '푸시 인 — 천천히 다가간다(기본). 설명·축적' },
  pullOut:  { label: '풀 아웃 — 살짝 크게 시작해 안착한다. 선언·인용·클로징' },
  panLeft:  { label: '팬 좌 — 왼쪽으로 흐른다' },
  panRight: { label: '팬 우 — 오른쪽으로 흐른다' },
  tiltUp:   { label: '틸트 상 — 위로 올라간다' },
  tiltDown: { label: '틸트 하 — 아래로 내려간다' }
};
/*
 * 패턴별 기본 카메라. 적지 않은 씬에 무엇을 주느냐가 산출물 대부분을 정한다.
 *  - 타이포·선언 씬은 안착(pullOut)이 강조를 만든다 — 커지다 멈추면 들뜬다
 *  - 자체 앰비언트 모션이 있는 씬(마퀴의 흐름, 오빗의 회전)은 카메라를 세운다
 *  - 카메라를 직접 쓰는 패턴(zoomDetail·cameraJourney)은 여기서 다루지 않는다.
 *    씬에 이미 cam 트윈이 있으면 compile 이 앰비언트 카메라를 얹지 않는다
 */
var CAM_DEFAULT = {
  heroReveal: 'pullOut', kineticType: 'pullOut', quote: 'pullOut', endCard: 'pullOut',
  matchCut: 'pullOut', chapterCard: 'panRight', marquee: 'none', orbit: 'none'
};
/**
 * 씬 하나의 앰비언트 카메라 트윈 값. 없으면 null.
 *
 *   camOf('pushIn', 1920, 1080, 1)  ->  { v0:{scale:1}, v:{scale:1.045} }
 */
function camOf(name, W, H, ampMul) {
  var a = TOKENS.cam.amp * num(ampMul, 1);
  if (!a || !CAMS[name] || name === 'none') return null;
  /* 팬·틸트는 배율이 아니라 거리다 — 화면 크기의 비율로 잡아 화면비가 달라도 같은 느낌이 된다 */
  var dx = r2(W * a * .5), dy = r2(H * a * .5);
  if (name === 'pushIn')   return { v0: { scale: 1 },     v: { scale: r2(1 + a) } };
  if (name === 'pullOut')  return { v0: { scale: r2(1 + a) }, v: { scale: 1 } };
  if (name === 'panLeft')  return { v0: { x: dx },  v: { x: -dx } };
  if (name === 'panRight') return { v0: { x: -dx }, v: { x: dx } };
  if (name === 'tiltUp')   return { v0: { y: dy },  v: { y: -dy } };
  return { v0: { y: -dy }, v: { y: dy } };
}
/*
 * 루트 스위치 셋. 전부 "켜져 있는 게 기본"이다 — 영상처럼 보이는 게 기본값이어야 한다.
 *   camera  false·0 이면 카메라를 세운다. 숫자면 진폭 배율
 *   depth   false·0 이면 배경이 카메라를 따라가지 않는다(=깊이 없음). 0~1
 *   shutter false·0 이면 셔터를 끈다. 숫자면 세기 배율
 */
function camEnabled(spec) {
  return !(spec && (spec.camera === false || spec.camera === 0));
}
function depthOf(spec) {
  var v = spec ? spec.depth : undefined;
  if (v === false) return 0;
  if (typeof v === 'number' && isFinite(v)) return clamp(v, 0, 1);
  return TOKENS.cam.depth;
}
function shutterOf(spec) {
  var v = spec ? spec.shutter : undefined;
  if (v === false) return 0;
  if (typeof v === 'number' && isFinite(v)) return Math.max(0, v);
  return TOKENS.cam.shut;
}

/* ================================================================== *
 * 빌드 — 스펙을 IR 로 컴파일한다. validate / toHTML / timing 이 모두 이걸 쓴다.
 * ================================================================== */
/** pattern 오류 문구 — compile 과 validate 가 같은 문장을 써야 중복 보고되지 않는다 */
function patErr(i, name) {
  return '씬 ' + (i + 1) + ': pattern "' + name + '" 은 없다 (' + Object.keys(PATTERNS).join(' ') + ').';
}
/**
 * 씬 하나의 순수 애니메이션 끝 — hold 를 뺀 시간.
 *
 * 앰비언트 카메라(amb)는 세지 않는다. 그건 씬 전체 길이를 덮으므로 세면 "정지 구간이
 * 없다"가 되어, 자막 동기화가 짚어 주던 "마지막 움직임 뒤 N초 정지" 경고가 사라진다.
 */
function animEndOf(tw) {
  var e = 0;
  arr(tw).forEach(function (o) {
    if (o.amb) return;
    var d = num(o.dur, 0) || (o.v && num(o.v.duration, 0)) || (o.v2 && num(o.v2.duration, 0)) || 0;
    var st = num(o.st, 0);
    e = Math.max(e, o.at + d + (st ? st * 5 : 0));
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
          /* after 그룹에는 등장뿐 아니라 강조(.gg-afHi 링·패널 리프트)까지 함께 들어온다 */
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
  /* 스킨도 같은 규칙이다. 문자열이면 등록된 스킨, 객체면 스펙에 인라인된 커스텀 정의 */
  var skin = spec.skin != null && spec.skin !== '' ? spec.skin : (THEMES[theme].skin || 'glass');
  var s2 = { aspect: aspect, theme: theme, energy: energy, font: font };
  var E = ENERGY[energy];
  var T = THEMES[theme];
  var scenes = arr(spec.scenes), out = [], used = {}, at = 0, errors = [], warnings = [];
  /* 씬별 스킨 오버라이드 — 키 하나가 스코프 블록 하나다. 같은 스킨을 쓰는 씬들은
     키를 공유해 블록이 한 번만 실린다. 인라인 정의는 씬 번호로 키를 만든다. */
  var sceneSkins = {};
  /* 글자 퇴장은 씬 길이가 확정된 뒤 얹는다 — 씬별 ctx 와 퇴장 정보를 여기 들고 간다 */
  var exits = [];

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
      var st = num(o.st, 0);
      ce = Math.max(ce, o.at + d + (st ? st * 5 : 0));
    });
    /* 루트와 같은 스킨을 씬에 또 적은 경우는 오버라이드가 아니다 — 마크업을 늘리지 않는다 */
    var skKey = null;
    if (sc.skin != null && sc.skin !== '' &&
        !(typeof sc.skin === 'string' && typeof skin === 'string' && sc.skin === skin)) {
      skKey = typeof sc.skin === 'string' ? sc.skin : 'sk' + (i + 1);
      sceneSkins[skKey] = sc.skin;
    }
    /*
     * 앰비언트 카메라 — 이름만 여기서 정하고, 트윈은 타이밍이 확정된 뒤에 얹는다.
     * 자막에 맞추면 씬 길이가 바뀌므로(syncScenes), 지금 길이로 트윈을 만들면 어긋난다.
     *
     * 카메라를 직접 쓰는 패턴은 건드리지 않는다 — 두 카메라가 같은 레이어를 서로
     * 덮어 zoomDetail 의 확대가 풀리거나 cameraJourney 의 정류장이 어긋난다.
     */
    /* 이름 검사는 스위치와 무관하게 한다 — 오타는 조용히 "카메라 없음"으로 흘러 눈에 안 띈다 */
    if (has(sc, 'cam') && !CAMS[String(sc.cam)]) {
      errors.push('씬 ' + (i + 1) + ': cam "' + sc.cam + '" 는 없다 (' + Object.keys(CAMS).join(' ') + ').');
    }
    var ownCam = built.tw.list.some(function (o) { return o.k === 'cam'; });
    var camName = 'none';
    if (!ownCam && camEnabled(spec)) {
      camName = has(sc, 'cam') ? String(sc.cam) : (CAM_DEFAULT[sc.pattern] || 'pushIn');
      if (!CAMS[camName]) camName = 'none';
    }
    /* 글자 퇴장 — hold 뒤에 exitDur 의 70% 를 씬에 더한다(나머지 30% 는 다음 씬의 트랜지션과 겹친다).
       자막에 맞춘 씬은 길이가 대사로 정해지므로 늘리지 않고 끝에서 exitDur 만큼 앞에 얹는다. */
    var exFx = EXIT_FX[sc.exitFx] ? sc.exitFx : '';
    /* 세는 글자는 fx 를 받는 본문만 — kicker·sub 같은 곁글자는 글자 수와 무관하게 고정 페이드로 따라 나간다(EXIT_SIDE) */
    var exChars = plain(sc.question || sc.title || sc.text || (sc.to && sc.to.title) ||
      lineItems(sc.lines).map(function (l) { return l.text; }).join('')).replace(/\s/g, '').length;
    var exDur = exFx ? exitDur(ctx, exFx, exChars) : 0;
    exits.push(exFx ? { ctx: ctx, fx: exFx, dur: exDur, chars: exChars } : null);
    out.push({
      id: sc.id || slug(sc.title || sc.pattern, i),
      sid: ctx.sid, pattern: sc.pattern, purpose: sc.purpose || '', skin: skKey,
      notes: sc.notes || sc.purpose || '',
      html: built.html, fixed: built.fixed || '', decor: decorSVG, tw: built.tw.list,
      dur: r2(built.dur + exDur * .7), contentEnd: r2(Math.min(ce, built.dur)), cam: camName,
      trans: tr, tdur: tdur, overlap: overlap,
      /* 줄이 객체({text,...})일 수 있다 — lineText 를 거치지 않으면 [object Object] 가 된다 */
      at: 0, title: plain(sc.title || sc.text || lineText(arr(sc.lines)[0]) || '')
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

  /*
   * 앰비언트 카메라를 얹는다 — 씬 전체 길이(hold 포함)를 덮는 트윈 하나.
   * contentEnd 를 이미 재고 난 뒤라 씬별 스크린샷·발표 모드의 정지 지점은 그대로다.
   */
  var camMul = (typeof spec.camera === 'number' ? spec.camera : 1) * E.camAmp;
  out.forEach(function (s) {
    var mv = camOf(s.cam, ASPECTS[aspect].w, ASPECTS[aspect].h, camMul);
    if (!mv) return;
    s.tw = s.tw.concat([{ k: 'cam', amb: 1, at: 0, dur: s.dur, v0: mv.v0, v: mv.v, ease: 'none' }]);
  });
  /* 글자 퇴장 — 확정된 씬 길이의 끝에서 exitDur 만큼 앞. 마스터에 실리므로(amb) 압축(ts)·contentEnd 와 무관하다 */
  out.forEach(function (s, i) {
    var ex = exits[i];
    if (!ex) return;
    s.tw = s.tw.concat(exitText(ex.ctx, ex.fx, r2(Math.max(0, s.dur - ex.dur)), ex.chars, s.html));
  });

  return {
    aspect: aspect, theme: theme, energy: energy, skin: skin, sceneSkins: sceneSkins,
    mode: ['autoplay', 'loop', 'step'].indexOf(spec.mode) >= 0 ? spec.mode : 'autoplay',
    title: spec.title || '', message: spec.message || '', font: font,
    scenes: out, total: total, icons: Object.keys(used), errors: errors, warnings: warnings,
    sync: sync, audio: spec.audio || null, captions: opts.captions || null
  };
}

/* ================================================================== *
 * validate — 스펙의 오류와 연출상의 의심을 갈라 보고한다.
 * ================================================================== */
/**
 * 스킨 하나를 검사한다. 루트와 씬이 같은 규칙을 쓴다 (tag 로 어디인지만 구분).
 *
 * 이름이 틀리면 엔진은 조용히 glass 로 떨어지고, 계약에 없는 토큰은 아무 일도
 * 하지 않는다 — 둘 다 눈으로 알아채기 어려우므로 여기서 잡아야 한다.
 */
function checkSkin(skin, themeKey, tag, errors, warnings) {
  if (skin == null || skin === '') return;
  var names = Object.keys(SK.SKINS).join(' ');
  if (typeof skin === 'string') {
    if (!SK.SKINS[skin]) errors.push(tag + 'skin "' + skin + '" 는 없다 (' + names + ').');
  } else if (typeof skin === 'object') {
    var ext = skin['extends'];
    if (ext != null && !SK.SKINS[ext]) errors.push(tag + 'skin.extends "' + ext + '" 는 없다 (' + names + ').');
    var badTok = SK.unknownTokens(skin.vars || {});
    if (badTok.length) errors.push(tag + 'skin.vars 에 없는 토큰: ' + badTok.join(' ') + ' (gm info skins 로 목록을 본다).');
    if (!skin.vars && !skin.css) warnings.push(tag + 'skin 을 객체로 썼는데 vars 도 css 도 없다 — extends 한 스킨 그대로다.');
  }
  /* 어두운 배경을 전제로 만든 스킨을 밝은 테마에 얹으면 광채가 사라진다 */
  var skName = typeof skin === 'string' ? skin : skin['extends'];
  var skDef = SK.SKINS[skName];
  var thDef = THEMES[themeKey || 'midnight'];
  if (skDef && skDef.dark && thDef && lum(thDef.bg) > .35)
    warnings.push(tag + 'skin "' + skName + '" 은 어두운 배경을 전제로 한다 — 밝은 테마 "' +
      (themeKey || 'midnight') + '" 에서는 광채가 죽는다.');
}

function validate(spec, opts) {
  var errors = [], warnings = [];
  spec = spec || {};
  opts = opts || {};
  if (!arr(spec.scenes).length) errors.push('scenes 가 비어 있다.');
  if (spec.aspect && !ASPECTS[spec.aspect]) errors.push('aspect "' + spec.aspect + '" 는 없다 (' + Object.keys(ASPECTS).join(' ') + ').');
  if (spec.theme && !THEMES[spec.theme]) errors.push('theme "' + spec.theme + '" 는 없다 (' + Object.keys(THEMES).join(' ') + ').');
  if (spec.energy && !ENERGY[spec.energy]) errors.push('energy "' + spec.energy + '" 는 없다 (E1 E2 E3).');
  if (spec.font && !FONTS[spec.font]) errors.push('font "' + spec.font + '" 는 없다 (' + Object.keys(FONTS).join(' ') + ').');
  checkSkin(spec.skin, spec.theme, '', errors, warnings);
  /* 스펙에 인라인한 디자인 요소 — 정의가 부실하면 조용히 이상한 화면이 나온다 */
  var dv = DS.validate(spec.design, SK);
  errors = errors.concat(dv.errors);
  warnings = warnings.concat(dv.warnings);
  if (spec.decor && spec.decor !== false) arr(spec.decor).forEach(function (d) {
    if (!VEC.DECOR[d]) errors.push('decor "' + d + '" 는 없다 (' + Object.keys(VEC.DECOR).join(' ') + ').');
  });
  /* 카메라 스위치 — 문자열로 적으면(예: "off") 켜져 있는 것으로 흘러 조용히 무시된다 */
  [['camera', '카메라'], ['depth', '깊이'], ['shutter', '셔터']].forEach(function (p) {
    if (!has(spec, p[0])) return;
    var v = spec[p[0]];
    if (typeof v === 'boolean' || (typeof v === 'number' && isFinite(v) && v >= 0)) return;
    errors.push(p[0] + ' 는 true·false 또는 0 이상의 숫자(세기 배율)여야 한다 — ' + p[1] + '를 끄려면 false 를 쓴다.');
  });
  if (typeof spec.depth === 'number' && spec.depth > .7)
    warnings.push('depth 가 ' + spec.depth + ' 다 — 배경이 카메라를 거의 그대로 따라가면 깊이가 사라진다' +
      '(공간에 들어가는 게 아니라 한 장을 확대한 것처럼 보인다). 0.2~0.45 가 적정이다.');
  /* 스펙이 들고 다니는 자막·음성 경로 — 오타는 조용히 "자막 없음"으로 흐르므로 오류로 잡는다 */
  if (has(spec, 'media')) {
    if (typeof spec.media !== 'object' || !spec.media || Array.isArray(spec.media)) {
      errors.push('media 는 { subs, audio, captions } 객체여야 한다.');
    } else {
      ['subs', 'audio'].forEach(function (k) {
        if (has(spec.media, k) && typeof spec.media[k] !== 'string')
          errors.push('media.' + k + ' 는 파일 경로(문자열)여야 한다 — 스펙 파일이 있는 폴더 기준으로 찾는다.');
      });
      if (has(spec.media, 'captions') && typeof spec.media.captions !== 'boolean')
        errors.push('media.captions 는 true 또는 false 다.');
      var M = mediaOf(spec);
      if (!M.subs && (M.audio || M.captions))
        warnings.push('media 에 자막(subs)이 없다 — 소리는 실측인데 화면이 추정이면 어긋난다. 자막을 먼저 준다.');
      if (M.subs && !arr(spec.scenes).some(function (sc) { return sc && String(sc.say || '').trim(); }))
        warnings.push('media.subs 가 있는데 say 를 적은 씬이 없다 — 씬마다 그 씬에서 낭독하는 대사를 say 에 적어야 타이밍을 맞춘다.');
    }
  }
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
    checkSkin(sc.skin, spec.theme, tag, errors, warnings);
    /* 씬 스킨은 토큰만 그 씬에 갇힌다 — 자막 뱃지는 씬 밖 무대 레이어라 안 바뀐다 */
    if (sc.skin && typeof sc.skin === 'object' && sc.skin.vars) {
      var ccOnly = Object.keys(sc.skin.vars).filter(function (k) { return k.slice(0, 3) === 'cc-'; });
      if (ccOnly.length) warnings.push(tag + '씬 스킨의 자막 토큰(' + ccOnly.join(' ') +
        ')은 무시된다 — 자막은 씬 밖 무대 레이어다. 루트 skin 에 적는다.');
    }
    if (i === 0 && sc.transition && sc.transition !== 'cut') warnings.push(tag + '첫 씬의 transition 은 무시된다.');

    /* networkBuild 의 links 는 못 찾은 참조를 조용히 버린다 — 선이 사라진 걸
       눈으로 알아채기 어렵다(노드는 그대로 다 보인다). 여기서 이름을 대조한다. */
    if (sc.pattern === 'networkBuild') {
      var nn = items(sc.nodes), labels = nn.map(function (x) { return x.label; });
      arr(sc.links).forEach(function (l) {
        if (Array.isArray(l)) {
          var okIdx = [l[0], l[1]].every(function (k) { return k >= 0 && k < nn.length; });
          if (!okIdx) warnings.push(tag + 'links 의 [' + l.join(',') + '] 가 노드 범위(0~' +
            (nn.length - 1) + ')를 벗어난다 — 이 선은 그려지지 않는다.');
          return;
        }
        var str = String(l);
        var pp = str.indexOf('>') >= 0 ? str.split(/\s*>\s*/) : str.split(/\s*-+\s*/);
        [pp[0], pp[1]].forEach(function (name) {
          if (name != null && labels.indexOf(name) >= 0) return;
          var k = name == null ? NaN : parseInt(name, 10);
          if (isFinite(k) && k >= 0 && k < nn.length) return;
          warnings.push(tag + 'links "' + str + '" 의 "' + (name == null ? '(없음)' : name) +
            '" 는 노드에 없다 — 이 선은 그려지지 않는다. 노드 라벨: ' + labels.join(' · '));
        });
      });
    }

    /* kineticType 은 한 줄이 한 호흡이다. 엔진이 글자를 줄여 한 줄을 지키지만 하한이
       있어서, 그보다 긴 줄은 접힌다 — 접혀도 겹치지는 않지만 리듬이 무너진다.
       (빌드 쪽 sizes 계산과 같은 기준: 하한 .62, 가용폭 = 화면폭 - 안전여백*2) */
    if (sc.pattern === 'kineticType') {
      var kAsp = ASPECTS[spec.aspect] || ASPECTS['16:9'];
      var kType = TYPE[spec.aspect] || TYPE['16:9'];
      var kW = kAsp.w - kAsp.safe * 2;
      lineItems(sc.lines).forEach(function (l, li) {
        var base = Math.round(kType.title * num(l.scale, l.emphasis ? 1.34 : 1));
        if (estEm(plain(l.text)) * base * .62 > kW) {
          warnings.push(tag + (li + 1) + '번째 줄이 한 줄에 안 들어간다 — "' +
            String(l.text).slice(0, 18) + '…". 접혀서 나오므로 짧게 끊거나 줄을 나눈다.');
        }
      });
    }
    /* textFx — 오타면 조용히 기본 리빌로 흐른다. roll 은 matchCut 의 구조(두 문장을 세로로 붙임)가
       있어야 하고, scramble 은 글자를 통째로 갈아 끼우므로 인라인 강조(`*낱말*`)가 사라진다. */
    var fxNames = [sc.textFx].concat(lineItems(sc.lines).map(function (l) { return l.fx; })).filter(Boolean);
    fxNames.forEach(function (f) {
      if (!TEXT_FX[f]) errors.push(tag + 'textFx "' + f + '" 는 없다 (' + Object.keys(TEXT_FX).join(' ') + ').');
    });
    if (sc.textFx === 'roll' && sc.pattern !== 'matchCut')
      warnings.push(tag + 'textFx "roll" 은 matchCut 전용이다 — 다른 패턴에서는 기본 리빌로 나온다.');
    if (sc.numFx && !NUM_FX[sc.numFx])
      errors.push(tag + 'numFx "' + sc.numFx + '" 는 없다 (' + Object.keys(NUM_FX).join(' ') + ').');
    if (sc.numFx && sc.pattern !== 'dataCounter')
      warnings.push(tag + 'numFx 는 dataCounter 만 받는다 — 다른 패턴에서는 무시된다.');
    /* exitFx — 글자만 먼저 나간다. 백스페이스는 타자기 상자(.gg-tw)가 있어야 지울 것이 있다 */
    if (sc.exitFx && !EXIT_FX[sc.exitFx])
      errors.push(tag + 'exitFx "' + sc.exitFx + '" 는 없다 (' + Object.keys(EXIT_FX).join(' ') + ').');
    if (sc.exitFx === 'typewriter' && sc.textFx !== 'typewriter')
      errors.push(tag + 'exitFx "typewriter"(백스페이스)는 textFx "typewriter" 로 찍은 글자만 지울 수 있다.');
    if (sc.exitFx && !(sc.title || sc.question || sc.text || (sc.to && sc.to.title) || arr(sc.lines).length))
      warnings.push(tag + 'exitFx 가 있는데 나갈 글자(title·question·text·lines·matchCut 의 to.title)가 없다.');
    var emFields = ['title', 'sub', 'text', 'question'].filter(function (k) { return hasEm(sc[k]); })
      .concat(lineItems(sc.lines).some(function (l) { return hasEm(l.text); }) ? ['lines'] : []);
    if (emFields.length && fxNames.indexOf('scramble') >= 0)
      warnings.push(tag + emFields.join('·') + ' 의 `*낱말*` 강조는 scramble 과 함께 쓰면 사라진다 — 글자가 통째로 교체되기 때문이다. 다른 textFx 를 쓴다.');
    /* 타자기는 줄을 접지 못한다 — 폭을 늘려 찍기 때문이다. 글자를 .62 까지 줄여도 안 들어가면 넘친다 */
    if (sc.textFx === 'typewriter' && sc.pattern !== 'kineticType') {
      var tAsp = ASPECTS[spec.aspect] || ASPECTS['16:9'], tType = TYPE[spec.aspect] || TYPE['16:9'];
      var tW = tAsp.w - tAsp.safe * 2;
      var tSz = sc.pattern === 'quote' ? tType.sub * 1.42 : tType.title;
      splitLines(sc.question || sc.title || sc.text || '').forEach(function (l, li) {
        if (estEm(plain(l)) * tSz * .62 > tW)
          warnings.push(tag + 'typewriter 는 줄을 접지 못한다 — ' + (li + 1) + '번째 줄 "' + plain(l).slice(0, 18) +
            '…" 이 한 줄에 안 들어간다. `\\n` 으로 줄을 나눈다.');
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
      var s = plain(sc[k]);
      if (s.replace(/\s/g, '').length > (k === 'text' ? 110 : 46)) longs.push(k);
    });
    if (longs.length) warnings.push(tag + longs.join('·') + ' 가 길다. 읽는 데 걸리는 시간이 hold 를 넘으면 사라진 뒤에 이해된다 — 줄이거나 씬을 나눈다.');
    /* 아이콘 오타 */
    var names = [];
    function collect(v) {
      arr(v).forEach(function (x) { if (x && typeof x === 'object' && x.icon) names.push(x.icon); });
    }
    if (sc.icon) names.push(sc.icon);
    [sc.items, sc.nodes, sc.steps, sc.layers, sc.stats, sc.events, sc.sources, sc.targets, sc.orbits, sc.stops,
     sc.options, sc.cta, sc.next].forEach(collect);
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
    [sc.items, sc.nodes, sc.steps, sc.stats, sc.stops, sc.layers, sc.next].forEach(function (L) {
      arr(L).forEach(function (x) { if (x && x.art) chkVec(VEC.ART, x.art, 'items[].art'); });
    });
    /* 항목이 아니라 자리 하나를 차지하는 시각물도 같은 이름표를 쓴다 */
    [['before', sc.before], ['after', sc.after], ['left', sc.left], ['right', sc.right],
     ['target', sc.target], ['source', sc.source], ['center', sc.center],
     ['anchor', typeof sc.anchor === 'object' ? sc.anchor : null]].forEach(function (pair) {
      if (pair[1] && pair[1].art) chkVec(VEC.ART, pair[1].art, pair[0] + '.art');
    });
    /* 화면 목업 밀도 */
    if (sc.pattern === 'deviceShow' && sc.screen) {
      var scN = arr(sc.screen.lines).length + items(sc.screen.items).length;
      if (scN > MAXSCREEN) warnings.push(tag + '프레임 안 줄·항목이 ' + scN + '개다 — ' + MAXSCREEN +
        '개를 넘으면 화면이 아니라 문서가 된다.');
    }
    /* 매트릭스는 행의 값 수가 열 수와 맞아야 한다 — 모자라면 그 칸이 빈다 */
    if (sc.pattern === 'featureMatrix') {
      var fmC = arr(sc.cols).length;
      var bad = items(sc.rows || sc.items).filter(function (r) { return arr(r.values).length !== fmC; }).length;
      if (fmC && bad) warnings.push(tag + 'values 개수가 열 수(' + fmC + ')와 다른 행이 ' + bad + '개다 — 빈 칸이 생긴다.');
    }
    /* 퀴즈 — 정답 표시가 둘이면 하나는 잉여다. 링이 이미 답을 가리키므로 띠는 부연일 때만 쓴다 */
    if (sc.pattern === 'quizReveal') {
      var qOpt = items(sc.options);
      var qCor = qOpt.filter(function (o) { return o.correct; });
      var qAns = typeof sc.answer === 'string' ? sc.answer : (sc.answer && sc.answer.label) || '';
      if (qOpt.length && !qCor.length && sc.reveal !== false && !qAns) {
        warnings.push(tag + '선택지에 correct 가 없고 answer 도 없다 — 정답이 열리지 않는다. 정답 선택지에 correct 를 켠다.');
      }
      if (qCor.length > 1) warnings.push(tag + 'correct 가 ' + qCor.length + '개다 — 첫 번째만 정답으로 열린다.');
      if (qAns && qCor.length && qAns === (qCor[0].label || '')) {
        warnings.push(tag + 'answer 가 정답 선택지와 같은 글자다 — 링이 이미 그 선택지를 가리킨다. answer 는 "왜 그런가"를 적을 때만 쓴다.');
      }
    }
  });

  var c = compile(spec, opts);
  c.errors.forEach(function (e) { if (errors.indexOf(e) < 0) errors.push(e); });
  c.warnings.forEach(function (w) { if (warnings.indexOf(w) < 0) warnings.push(w); });
  /* 전체 화면 플래시는 효과 하나씩이 아니라 최종 타임라인의 1초 구간으로 본다.
     개별 효과가 안전해도 장면 경계에 몰리면 WCAG 2.3.1 한도를 넘을 수 있다. */
  var flashes = [];
  c.scenes.forEach(function (s) {
    s.tw.forEach(function (o) {
      if (o.k === 'fx' && (o.fn === 'flash' || o.fn === 'impact')) flashes.push(r2(s.at + num(o.at, 0)));
    });
  });
  flashes.sort(function (a, b) { return a - b; });
  for (var fi = 0; fi < flashes.length; fi++) {
    var fj = fi;
    while (fj < flashes.length && flashes[fj] < flashes[fi] + 1) fj++;
    if (fj - fi > 3) {
      errors.push('전체 화면 플래시가 ' + flashes[fi] + '초부터 1초 안에 ' + (fj - fi) +
        '회다 — 3회 이하로 줄이거나 flash·impact 효과를 분산한다.');
      break;
    }
  }

  /* WCAG 는 캡션 내용의 존재를 요구하고 읽기 속도 수치는 규정하지 않는다.
     아래 값은 gmotion 화면 검수용 보수적 제작 가이드다. */
  var qc = arr(opts.cues);
  if (qc.length) {
    var overlaps = 0, tooFast = 0, tooShort = 0, tooLongLine = 0;
    qc.forEach(function (q, qi) {
      var dur = num(q.end, 0) - num(q.start, 0);
      var chars = String(q.text || '').replace(/\s/g, '').length;
      if (qi && num(q.start, 0) < num(qc[qi - 1].end, 0)) overlaps++;
      if (dur > 0 && chars / dur > 17) tooFast++;
      if (dur > 0 && dur < .8 && chars > 4) tooShort++;
      if (String(q.text || '').split('\n').some(function (line) { return line.replace(/\s/g, '').length > 28; })) tooLongLine++;
    });
    if (overlaps) warnings.push('자막 cue 시간이 겹치는 곳이 ' + overlaps + '개다 — 동시에 두 자막이 필요한지 확인한다.');
    if (tooFast) warnings.push('읽기 속도가 초당 17자를 넘는 자막이 ' + tooFast + '개다 — cue 를 늘리거나 문장을 줄인다.');
    if (tooShort) warnings.push('0.8초보다 짧게 보이는 자막이 ' + tooShort + '개다 — 눈에 걸리지 않을 수 있다.');
    if (tooLongLine) warnings.push('한 줄이 28자를 넘는 자막이 ' + tooLongLine + '개다 — 두 줄로 나누되 화면 정보를 가리지 않는지 본다.');
  }
  /* 카메라를 직접 쓰는 패턴에 cam 을 적으면 무시된다 — 적어 놓고 안 움직이면 원인을 못 찾는다 */
  arr(spec.scenes).forEach(function (sc, i) {
    if (!sc || !has(sc, 'cam') || String(sc.cam) === 'none') return;
    var cs = c.scenes[i];
    if (cs && cs.pattern === sc.pattern && cs.cam === 'none' && camEnabled(spec))
      warnings.push('씬 ' + (i + 1) + ': cam "' + sc.cam + '" 은 무시된다 — ' + sc.pattern +
        ' 은 카메라를 직접 쓰는 패턴이라 씬 카메라를 얹지 않는다.');
  });
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
    /* 유튜브 한 편은 장(chapterCard)으로 이어 붙인 긴 물건이고, 자막(media.subs)이 있으면 길이는 목소리가 정한다 —
       그 둘 중 하나라도 있으면 2분 기준으로 따지지 않는다 */
    var youtube = arr(spec.scenes).some(function (sc) { return sc && (sc.pattern === 'chapterCard' || sc.pattern === 'endCard'); }) ||
      !!mediaOf(spec).subs;
    if (c.total > 150 && !youtube)
      warnings.push('전체 ' + Math.round(c.total) + '초다 — 2분을 넘으면 모션그래픽이 아니라 영상이다. 나누거나, ' +
        '유튜브 한 편이면 장(chapterCard)으로 나눴는지 확인한다.');
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
  /* 스킨 = 디자인 프리미티브의 구현부. 아래 규칙들은 스킨이 정한 변수만 읽는다. */
  var S = SK.resolve(c.skin, T, A);
  /* 씬별 오버라이드 — 토큰은 CSS 변수라 상속으로 씬 안에 저절로 갇힌다.
     루트와 다른 것만 적는다(같은 값은 :root 에서 내려온다).
     자막 토큰은 뺀다 — 자막은 씬 밖 무대 레이어라 씬 스코프가 닿지 않는다. */
  var skinKeys = Object.keys(c.sceneSkins || {});
  var sceneSkinCSS = [];
  skinKeys.forEach(function (k) {
    var R = SK.resolve(c.sceneSkins[k], T, A);
    var sel = '.gg-scene[data-skin="' + k + '"]';
    var d = SK.diffVars(S.vars, R.vars), live = {};
    Object.keys(d).forEach(function (t) { if (t.slice(0, 3) !== 'cc-') live[t] = d[t]; });
    var decls = SK.varsToCss(live);
    if (decls) sceneSkinCSS.push(sel + '{' + decls + '}');
    sceneSkinCSS = sceneSkinCSS.concat(SK.scopeRules(R.rules, sel));
  });
  /* 오버라이드가 있으면 루트 스킨의 추가 규칙도 스코프한다 — 안 그러면 재질을
     갈아 낀 씬에까지 루트 스킨의 규칙이 남아 두 스킨이 섞인다. */
  var rootRules = skinKeys.length ? SK.scopeRules(S.rules, '.gg-scene:not([data-skin])') : S.rules;
  /* 광채도 프리미티브다 — 테마의 glow 값은 glass 스킨이 읽어 --glow 로 넘긴다 */
  var glow = 'filter:var(--glow);';
  return [
'*{margin:0;padding:0;box-sizing:border-box;word-break:keep-all;overflow-wrap:break-word}',
/* HTML 의 hidden 속성은 UA 스타일의 display:none 으로 동작한다 — 작성자 CSS 의
   display:grid/flex 가 그걸 덮어써서 숨긴 요소가 그대로 보인다. 명시적으로 막는다. */
'[hidden]{display:none!important}',
':root{--bg:' + T.bg + ';--bg2:' + T.bg2 + ';--ink:' + T.ink + ';--ink2:' + T.ink2 + ';--dim:' + T.dim +
  ';--acc:' + T.accent + ';--acc2:' + T.accent2 + ';--good:' + T.good + ';--warn:' + T.warn + ';--bad:' + T.bad +
  ';--line:' + T.line + ';--panel:' + T.panel + ';--pline:' + T.panelLine + ';--font:' + F.stack +
  ';--mono:' + MONO.stack + ';--tight:' + F.tight + ';--kick:' + (F.kick || '.24em') +
  ';' + S.css + '}',
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
  /* 3겹 배경 — 상단 액센트 기운(아주 옅게) + 상단광 + 바탕. 밝은 테마는 기운을 반으로 줄인다 */
  'background:radial-gradient(85% 60% at 72% -12%,' + tint(T.accent, lum(T.bg) > .5 ? '0a' : '17') + ' 0%,transparent 60%),' +
  'radial-gradient(120% 90% at 50% 0%,' + T.bg2 + ' 0%,' + T.bg + ' 62%);isolation:isolate;perspective:1600px}',
/* 자막이 켜져 있을 때 씬 전체를 위로 일괄 리프팅 — GSAP 트랜지션과 충돌하지 않도록 독립 래퍼를 쓴다 */
'.gg-scenes-wrap{position:absolute;inset:0;transform-origin:center center;' +
  'transition:transform .28s cubic-bezier(.16,1,.3,1);will-change:transform}',
'.gg-stage[data-cc="true"] .gg-scenes-wrap{transform:translateY(-' + Math.round(A.h * (A.w < A.h ? .038 : .032)) + 'px)}',
'.gg-stage[data-cc="false"] .gg-scenes-wrap{transform:translateY(0)}',
'.gg-grain{position:absolute;inset:0;pointer-events:none;opacity:' + T.grain + ';z-index:60;mix-blend-mode:overlay}',
'.gg-vig{position:absolute;inset:0;pointer-events:none;z-index:59;' +
  'background:radial-gradient(110% 80% at 50% 45%,transparent 55%,rgba(0,0,0,' + num(T.vig, .42) + ') 100%)}',
'.gg-flash{position:absolute;inset:0;pointer-events:none;z-index:58;background:var(--ink);opacity:0;mix-blend-mode:soft-light}',
'.gg-scene{position:absolute;inset:0;visibility:hidden;transform-style:preserve-3d;backface-visibility:hidden}',
'.gg-world{position:absolute;inset:0;transform-origin:center center;will-change:transform}',
'.gg-fixed{position:absolute;inset:0;z-index:40;pointer-events:none}',
'.gg-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;color:var(--acc)}',
/* ---- 배경·분위기 레이어 ---- */
/* 배경도 카메라를 따라간다 — world 보다 덜 움직여 깊이를 만든다(runtime 의 DEPTH).
   overflow 는 이 박스에 걸리고 박스 자체가 확대되므로, 밀려도 프레임 밖이 드러나지 않는다. */
'.gg-decorL{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden;' +
  'transform-origin:center center;will-change:transform}',
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
/* 공통 텍스트 */
'.gg-head{position:absolute}',
'.gg-c{text-align:center}',
'.gg-kicker{font-size:var(--kick-size);letter-spacing:var(--kick);text-transform:var(--kick-caps);color:var(--acc);font-weight:var(--kick-w);margin-bottom:var(--kick-mb)}',
'.gg-title{font-weight:var(--title-w);line-height:var(--title-lh);letter-spacing:var(--tight);color:var(--ink)}',
'.gg-sub{margin-top:var(--sub-mt);color:var(--ink2);line-height:var(--sub-lh);font-weight:400}',
'.gg-mask{display:block;overflow:hidden;padding-bottom:.06em}',
'.gg-mk{display:block;will-change:transform}',
/* blur 는 마스크 밖으로 번져야 한다. 인라인 마크(`*낱말*`+mark)는 런타임이 등장 뒤 overflow 를 연다 */
'.gg-mask.gg-open{overflow:visible}',
/* 아웃라인 — --sw 가 테두리 두께. 0 에서 시작해 트윈이 .05em 에서 0 으로 되돌린다 */
'.gg-ol{--sw:0em;-webkit-text-stroke:var(--sw) var(--acc);paint-order:stroke fill}',
/* 인라인 강조 — 낱말 하나만 accent. inline-block 이라 팝(transform)과 마크 앵커(position)가 걸린다 */
'.gg-em{color:var(--acc);font-style:normal;display:inline-block;position:relative}',
/* hold 동안 살아 있는 글자 — 루프는 멈춰 있다가 타임라인이 등장 뒤에 풀어 준다(textLive).
   강조 낱말·emphasis 줄은 밝기가 숨쉬고(transform 은 GSAP 몫이라 filter), 글로우 테마는 text-shadow 가 숨쉰다.
   animation 단축 속성이 play-state 를 되돌리므로 paused 는 반드시 그 뒤에 온다. */
'.gg-em,.gg-breath{animation:ggBreath 3.4s ease-in-out infinite;animation-play-state:paused}',
'@keyframes ggBreath{50%{filter:brightness(1.18)}}',
'.gg-glowT{animation:ggGlowT 3.8s ease-in-out infinite;animation-play-state:paused}',
/* 둘 다 붙은 emphasis 줄 — 단축 속성이 서로를 덮으니 한 규칙에 둘을 적는다 */
'.gg-breath.gg-glowT{animation:ggBreath 3.4s ease-in-out infinite,ggGlowT 3.8s ease-in-out infinite;animation-play-state:paused}',
'@keyframes ggGlowT{0%,100%{text-shadow:0 0 .08em transparent}50%{text-shadow:0 0 .34em var(--acc)}}',
/* typewriter·wipe 의 인라인 상자 — 폭이 글자만큼이라 가운데 정렬에서도 글자의 왼쪽 끝에서 시작한다 */
'.gg-in{display:inline-block;vertical-align:top}',
/* content-box — 전역 border-box 아래서는 커서(테두리)가 폭 안에 들어가 마지막 글자를 가린다 */
'.gg-tw{display:inline-block;box-sizing:content-box;overflow:hidden;white-space:nowrap;vertical-align:top;' +
  'border-right:0 solid var(--acc);animation:ggCursor 1s steps(1) infinite}',
'@keyframes ggCursor{50%{border-color:transparent}}',
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
'.gg-mk-tape{right:-24px;top:-18px;width:72px;height:24px;transform:rotate(5deg)}',
'.gg-mk-stamp{right:-38px;top:-26px;width:104px;height:48px}',
'.gg-mk-clayPin{right:-16px;top:-16px;width:38px;height:38px}',
'.gg-mkStar{transform-origin:center;animation:ggTwinkle 3.4s ease-in-out infinite}',
/* ---- 추상 일러스트 ---- */
'.gg-artBox{position:relative}',
'.gg-artBox svg{width:100%;height:100%;display:block}',
'.gg-heroArt{position:absolute}',
/* 아이콘 자리를 대신하는 일러스트 — 부모가 플렉스라 눌리지 않게 크기를 고정한다 */
'.gg-vArt{flex:0 0 auto;color:var(--acc)}',
'.gg-artP{transform-box:fill-box}',
'@keyframes ggArtSpin{to{transform:rotate(360deg)}}',
'@keyframes ggArtSpinR{to{transform:rotate(-360deg)}}',
'@keyframes ggArtFlow{0%{transform:translate(0,0);opacity:0}10%{opacity:1}' +
  '45%{transform:translate(96px,0)}70%{transform:translate(96px,84px)}' +
  '95%{transform:translate(156px,84px);opacity:1}100%{transform:translate(156px,84px);opacity:0}}',
'.gg-artSpin{animation:ggArtSpin 24s linear infinite}',
'.gg-artSpinR{animation:ggArtSpinR 18s linear infinite}',
'.gg-artFlow{animation:ggArtFlow 3.4s ease-in-out infinite}',
/* 상시 루프는 기본 정지 — artIn 이 등장이 끝나는 시점에 풀어 준다.
   animation 단축 속성이 play-state 를 running 으로 되돌리므로 반드시 그 뒤에 온다. */
'.gg-artLoop{animation-play-state:paused;transform-box:view-box}',
'.gg-cardArt{position:absolute;right:-10px;bottom:-10px;width:52%;opacity:.28;pointer-events:none}',
'.gg-cardArt svg{width:100%;height:auto;display:block}',
/* ---- 마퀴 ---- */
'.gg-mqRow{position:absolute;left:0;width:100%;overflow:hidden;display:flex;align-items:center;' +
  'mask-image:linear-gradient(90deg,transparent,#000 9%,#000 91%,transparent);' +
  '-webkit-mask-image:linear-gradient(90deg,transparent,#000 9%,#000 91%,transparent)}',
'@keyframes ggMq{from{transform:translateX(0)}to{transform:translateX(-50%)}}',
'.gg-mqTrack{display:flex;align-items:center;flex:0 0 auto;animation:ggMq linear infinite;will-change:transform}',
'.gg-mqI{display:inline-flex;align-items:center;gap:16px;padding:0 42px;white-space:nowrap;flex:0 0 auto}',
'.gg-mqI b{font-weight:700;color:var(--ink)}',
'.gg-mqI em{font-style:normal;font-size:.72em;color:var(--dim)}',
/* ---- 감소 모션 ----
   상시 CSS 루프(배경·마퀴·커서·숨쉬기·일러스트)는 마스터 타임라인 밖에서 돌므로 GSAP 의 D()/ST() 가 못 막는다.
   미디어 쿼리를 직접 보지 않는다 — RM 판정(OS 설정·루트 reducedMotion·?motion=on|off)은 runtime 한 곳이 하고
   결과를 <html data-rm> 으로 세운다. 미디어 쿼리를 CSS 에 남기면 ?motion=on 이 OS 설정을 못 이긴다.
   두 클래스가 겹치는 .gg-breath.gg-glowT 와 같은 특이도라 이 블록은 그 뒤에 와야 이긴다. */
'[data-rm] .gg-scenes-wrap{transition:none}',
'[data-rm] .gg-drFloat,[data-rm] .gg-drSlide,[data-rm] .gg-drSpin,[data-rm] .gg-drPulse,[data-rm] .gg-drDrift,[data-rm] .gg-drTwinkle,' +
  '[data-rm] .gg-tw,[data-rm] .gg-em,[data-rm] .gg-breath,[data-rm] .gg-glowT,[data-rm] .gg-mkStar,' +
  '[data-rm] .gg-artSpin,[data-rm] .gg-artSpinR,[data-rm] .gg-artFlow,[data-rm] .gg-mqTrack{animation:none}',
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
'.gg-dev-terminal .gg-screen{font-family:var(--mono);justify-content:flex-start}',
'.gg-dev-terminal .gg-scL:not(.gg-scCmd){opacity:.72;padding-left:1.4em}',
'.gg-dev-terminal .gg-scLines{color:rgba(235,240,255,.82)}',
/* 프레임이 정한 제목 자리 — 검색어·제호·파일명·모달 제목이 여기 앉는다 */
'.gg-scSlot{position:absolute;display:flex;align-items:center;overflow:hidden;white-space:nowrap;' +
  'text-overflow:ellipsis;font-weight:700;color:var(--ink);letter-spacing:var(--tight)}',
'.gg-dev-search .gg-scSlot{font-weight:600}',
'.gg-dev-search .gg-screen{justify-content:flex-start}',
'.gg-dev-editor .gg-scSlot{font-family:var(--mono);font-weight:600;color:var(--ink2);letter-spacing:0}',
'.gg-dev-editor .gg-screen{font-family:var(--mono);justify-content:flex-start}',
'.gg-dev-newspaper .gg-scSlot{justify-content:center;font-weight:900;letter-spacing:.06em}',
'.gg-dev-newspaper .gg-screen,.gg-dev-book .gg-screen,.gg-dev-notification .gg-screen{justify-content:flex-start}',
'.gg-dev-dialog .gg-scL{justify-content:center}',
'.gg-dev-receipt .gg-scSlot{justify-content:center;font-weight:800;letter-spacing:.18em}',
'.gg-dev-receipt .gg-screen{gap:10px}',
'.gg-dev-receipt .gg-scItems{gap:0}',
/* 영수증 줄은 카드가 아니라 점선 위의 한 줄이다 */
'.gg-dev-receipt .gg-scI{background:none;border:0;border-bottom:1px dashed var(--surf-line);' +
  'border-radius:0;padding:11px 2px}',
'.gg-dev-dialog .gg-scSlot{justify-content:center;font-weight:800}',
'.gg-dev-dialog .gg-screen{text-align:center}',
'.gg-dev-notification .gg-scI{padding:15px 16px;border-radius:var(--r-sm)}',
'.gg-scItems{display:flex;flex-direction:column;gap:12px}',
'.gg-scI{display:flex;align-items:center;gap:13px;padding:12px 15px;border-radius:var(--r-xs);' +
  'background:var(--surf-fill);border:1px solid var(--surf-line);font-size:.94em}',
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
'.gg-captions{position:absolute;left:4%;right:4%;bottom:' + Math.round(A.h * (A.w < A.h ? .065 : .036)) + 'px;' +
  'display:flex;justify-content:center;align-items:flex-end;z-index:200;pointer-events:none}',
'.gg-captions span{display:inline-block;max-width:88%;color:var(--cc-ink);background:var(--cc-fill);' +
  'border:var(--cc-lw) solid var(--cc-line);border-radius:var(--cc-r);' +
  'padding:.28em .75em .32em;' +
  'font-size:' + Math.round(Math.min(A.w, A.h) * .032) + 'px;font-weight:600;line-height:1.42;' +
  'letter-spacing:-.01em;text-align:center;word-break:keep-all;overflow-wrap:break-word;' +
  'backdrop-filter:var(--cc-bd);-webkit-backdrop-filter:var(--cc-bd);' +
  'box-shadow:var(--cc-shadow);' +
  'text-shadow:0 1px 3px rgba(0,0,0,.8)}',
/* 자막 켜기/끄기 버튼 — 꺼진 상태를 눈으로 구분할 수 있어야 한다 */
'.gg-ccBtn{font-size:11px;font-weight:700;letter-spacing:.02em;width:34px}',
'.gg-ccBtn[aria-pressed="false"]{opacity:.4;text-decoration:line-through}',
'.gg-ic{color:var(--acc);' + glow + '}',
'.gg-heroIc{position:absolute}',
/* 카드 */
'.gg-card{position:absolute;background:var(--surf-fill);border:var(--surf-lw) solid var(--surf-line);border-radius:var(--r-lg);' +
  'padding:36px 30px;display:flex;flex-direction:column;gap:16px;justify-content:center;' +
  'backdrop-filter:var(--bd-2);box-shadow:var(--surf-shadow)}',
'.gg-cardIc{margin-bottom:4px}',
'.gg-cardVal{font-size:48px;font-weight:800;color:var(--acc);letter-spacing:-.02em}',
'.gg-cardLb{font-size:34px;font-weight:700;line-height:1.32;color:var(--ink);letter-spacing:var(--tight)}',
'.gg-cardNote{font-size:24px;color:var(--dim);line-height:1.45}',
'.gg-focus{border-color:var(--surf-line)}',
'.gg-t-good{border-color:' + T.good + '55}.gg-t-good .gg-ic{color:' + T.good + '}',
'.gg-t-bad{border-color:' + T.bad + '55}.gg-t-bad .gg-ic{color:' + T.bad + '}',
'.gg-t-warn{border-color:' + T.warn + '55}.gg-t-warn .gg-ic{color:' + T.warn + '}',
'.gg-t-dim{opacity:.62}',
'.gg-t-good .gg-sideVal,.gg-t-good .gg-cardVal{color:' + T.good + '}',
'.gg-t-bad .gg-sideVal,.gg-t-bad .gg-cardVal{color:' + T.bad + '}',
'.gg-t-warn .gg-sideVal,.gg-t-warn .gg-cardVal{color:' + T.warn + '}',
/* 네트워크 */
'.gg-link{fill:none;stroke:var(--acc);stroke-width:var(--link-w);opacity:var(--link-op);stroke-linecap:var(--ln-cap)}',
'.gg-node{position:absolute;background:var(--surf-fill);border:var(--surf-lw) solid var(--surf-line);border-radius:var(--r-ms);' +
  'padding:18px 16px;display:flex;flex-direction:column;align-items:center;gap:9px;text-align:center;' +
  'backdrop-filter:var(--bd-1);box-shadow:var(--surf-shadow)}',
'.gg-hub{border-color:var(--acc);background:var(--surf-fill);box-shadow:var(--hub-ring)}',
'.gg-nodeLb{font-weight:700;line-height:1.3}',
'.gg-nodeNote{font-size:21px;color:var(--dim)}',
/* 프로세스 */
/* color 는 예전에 marker-end 의 currentColor 를 위해 있었다 — 머리를 path 에 담은 뒤로 필요 없다 */
'.gg-arrow{fill:none;stroke:var(--acc);stroke-width:var(--arrow-w);opacity:var(--arrow-op)}',
'.gg-step{position:absolute;background:var(--surf-fill);border:var(--surf-lw) solid var(--surf-line);border-radius:var(--r-md);' +
  'padding:28px 26px;display:flex;flex-direction:column;gap:13px;align-items:flex-start;justify-content:center;' +
  'backdrop-filter:var(--bd-1);box-shadow:var(--surf-shadow)}',
'.gg-stepNo{font-size:22px;font-weight:800;color:var(--acc);letter-spacing:.16em}',
'.gg-stepLb{font-weight:700;line-height:1.32}',
'.gg-stepNote{font-size:22px;color:var(--dim);line-height:1.45}',
/* 비포애프터 · 스플릿 */
'.gg-panel,.gg-side{position:absolute;background:var(--surf-fill);border:var(--surf-lw) solid var(--surf-line);' +
  'border-radius:var(--r-lg);padding:38px 34px;display:flex;flex-direction:column;gap:18px;justify-content:center;' +
  'backdrop-filter:var(--bd-2);box-shadow:var(--surf-shadow)}',
'.gg-panelTag{font-size:23px;letter-spacing:.2em;text-transform:uppercase;color:var(--dim);font-weight:700}',
'.gg-panelVal{font-weight:800;color:var(--acc);letter-spacing:-.02em}',
'.gg-af .gg-panelVal{color:var(--good)}',
/* after 강조 링 — 패널에 붙어 크기를 그대로 따라간다(inset). 판정색은 액센트가 아니라 good */
'.gg-afHi{position:absolute;left:-9px;top:-9px;right:-9px;bottom:-9px;' +
  'border:var(--surf-lw2) solid ' + T.good + ';border-radius:var(--r-lg);' +
  'box-shadow:var(--target-ring);pointer-events:none}',
'.gg-panelList,.gg-sideList,.gg-detailL{list-style:none;display:flex;flex-direction:column;gap:13px}',
'.gg-panelList li,.gg-sideList li,.gg-detailL li{position:relative;padding-left:30px;color:var(--ink2);line-height:1.44}',
'.gg-panelList li:before,.gg-sideList li:before,.gg-detailL li:before{content:"";position:absolute;left:6px;top:.52em;' +
  'width:9px;height:9px;border-radius:50%;background:var(--acc);opacity:.8}',
'.gg-panelList em,.gg-sideList em{font-style:normal;color:var(--dim);font-size:.86em}',
'.gg-split{fill:none;stroke:var(--line);stroke-width:2.4;stroke-dasharray:10 12}',
'.gg-sideLb{font-weight:800;letter-spacing:var(--tight)}',
'.gg-sideVal{font-weight:800;color:var(--acc);letter-spacing:-.02em}',
/* 분해도 */
'.gg-layer{position:absolute;background:var(--surf-fill);border:var(--surf-lw) solid var(--surf-line);border-radius:var(--r-sm);' +
  'display:flex;align-items:center;gap:20px;padding:0 30px;backdrop-filter:var(--bd-1);box-shadow:var(--surf-shadow)}',
'.gg-layerLb{font-weight:700;flex:0 0 auto}',
'.gg-layerNote{font-size:22px;color:var(--dim);margin-left:auto}',
/* 줌 디테일 */
'.gg-detail{position:absolute;background:var(--surf-fill);border:var(--surf-lw) solid var(--acc);border-radius:var(--r-md);' +
  'padding:30px 34px;display:flex;flex-direction:column;gap:16px;backdrop-filter:var(--bd-4);' +
  'box-shadow:var(--surf-shadow);z-index:30}',
'.gg-detailT{font-weight:800;color:var(--acc)}',
/* 지표 */
'.gg-stat{position:absolute;display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px}',
'.gg-statIc{margin-bottom:4px}',
/* 숫자에 글로우를 걸면 큰 글자가 뿌옇게 번져 읽는 속도가 떨어진다 — 아이콘·룰라인에만 쓴다 */
'.gg-num{font-weight:800;line-height:1;letter-spacing:-.035em;color:var(--ink);display:flex;align-items:baseline;gap:.04em}',
'.gg-pre,.gg-unit{color:var(--acc);font-weight:700}',
'.gg-val{font-variant-numeric:tabular-nums}',
/* 자릿수 롤 — 자리마다 1em 창 안에서 0~9 띠가 내려간다. 쉼표·소수점(.gg-odS)은 고정 */
'.gg-valRoll{display:inline-flex;align-items:flex-start;height:1em;line-height:1;overflow:hidden}',
'.gg-od{display:inline-block;height:1em;overflow:hidden}',
'.gg-odIn{display:block;will-change:transform}',
'.gg-odIn i{display:block;height:1em;line-height:1;font-style:normal}',
'.gg-odS{display:inline-block;height:1em;line-height:1}',
'.gg-statLb{color:var(--ink2);font-weight:600;line-height:1.36}',
'.gg-statNote{font-size:22px;color:var(--dim)}',
/* 타임라인 */
'.gg-axis{fill:none;stroke:var(--line);stroke-width:2.6;stroke-linecap:round}',
'.gg-dot{fill:var(--dot-fill);stroke:var(--acc);stroke-width:var(--dot-w)}',
'.gg-ev{position:absolute;display:flex;flex-direction:column;gap:7px}',
'.gg-evWhen{font-size:23px;font-weight:800;color:var(--acc);letter-spacing:.1em}',
'.gg-evLb{font-weight:700;line-height:1.3}',
'.gg-evNote{font-size:21px;color:var(--dim);line-height:1.4}',
/* 수렴 · 발산 · 궤도 */
'.gg-chip{position:absolute;background:var(--surf-fill);border:var(--surf-lw) solid var(--surf-line);border-radius:var(--r-sm);' +
  'padding:16px 14px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;' +
  'backdrop-filter:var(--bd-1);box-shadow:var(--surf-shadow)}',
'.gg-chipLb{font-weight:700;line-height:1.28}',
'.gg-flow{fill:none;stroke:var(--acc);stroke-width:var(--flow-w);opacity:var(--flow-op);stroke-linecap:var(--ln-cap);stroke-dasharray:0}',
'.gg-flowDot{position:absolute;width:var(--flowdot-size);height:var(--flowdot-size);border-radius:50%;' +
  'background:var(--acc);box-shadow:var(--flowdot-shadow);z-index:15;pointer-events:none}',
'.gg-target,.gg-center{position:absolute;background:var(--surf-fill);border:var(--surf-lw2) solid var(--acc);' +
  'border-radius:var(--r-lg);padding:26px 22px;display:flex;flex-direction:column;align-items:center;' +
  'justify-content:center;gap:12px;text-align:center;backdrop-filter:var(--bd-3);z-index:20;' +
  'box-shadow:var(--target-ring)}',
'.gg-targetLb,.gg-centerLb{font-weight:800;letter-spacing:var(--tight)}',
'.gg-targetNote{font-size:22px;color:var(--dim)}',
'.gg-ring{fill:none;stroke:var(--line);stroke-width:var(--ring-w);stroke-dasharray:var(--ring-dash)}',
'.gg-orbit{position:absolute}',
'.gg-sat{position:absolute;will-change:transform}',
'.gg-satIn{background:color-mix(in srgb,' + T.bg + ' 84%,' + T.ink + ');border:var(--surf-lw) solid var(--surf-line);' +
  'border-radius:var(--r-sm);padding:15px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}',
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
'.gg-route{fill:none;stroke:var(--acc);stroke-width:var(--route-w);opacity:var(--route-op);' +
  'stroke-dasharray:var(--route-dash);stroke-linecap:var(--ln-cap)}',
/* 경로선이 카드 위를 지나므로 배경을 불투명하게 섞는다 — 반투명이면 선이 카드 안에 비친다 */
'.gg-stop{position:absolute;background:color-mix(in srgb,' + T.bg + ' 86%,' + T.ink + ');' +
  'border:var(--surf-lw) solid var(--surf-line);border-radius:var(--r-md);padding:22px 20px;' +
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
/* 퍼널 — 바 색은 빌더가 시퀀셜 램프로 인라인한다(마지막 단이 순수 액센트) */
'.gg-fnRow{position:absolute}',
'.gg-fnBar{position:absolute;inset:0;border-radius:var(--r-sm);box-shadow:var(--surf-shadow)}',
'.gg-fnIn{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;' +
  'gap:18px;padding:0 30px;white-space:nowrap;overflow:hidden}',
'.gg-fnLb{font-weight:700;letter-spacing:var(--tight);overflow:hidden;text-overflow:ellipsis}',
'.gg-fnSide{position:absolute;left:100%;margin-left:26px;top:50%;transform:translateY(-50%);' +
  'color:var(--dim);font-size:22px;white-space:nowrap}',
'.gg-fnNum{font-weight:800;font-variant-numeric:tabular-nums;letter-spacing:-.02em;flex:0 0 auto}',
'.gg-fnUnit{font-style:normal;font-size:.62em;font-weight:700;margin-left:.12em;opacity:.85}',
'.gg-fnRate{position:absolute;text-align:center;font-size:23px;font-weight:700;color:var(--dim);' +
  'font-variant-numeric:tabular-nums;letter-spacing:.02em}',
/* 해부도 */
'.gg-anatArt{position:absolute}',
'.gg-co{position:absolute}',
'.gg-coLb{font-weight:800;letter-spacing:var(--tight);line-height:1.28}',
'.gg-coNote{margin-top:7px;font-size:22px;color:var(--dim);line-height:1.42}',
'.gg-anatLn{opacity:.7}',
/* 기능 매트릭스 */
'.gg-fmHead{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;' +
  'gap:9px;background:var(--surf-fill);border:var(--surf-lw) solid var(--surf-line);border-radius:var(--r-sm);' +
  'backdrop-filter:var(--bd-1);box-shadow:var(--surf-shadow);font-weight:800;text-align:center;padding:0 12px}',
'.gg-fmRow{position:absolute;display:flex;align-items:stretch;background:var(--surf-fill);' +
  'border:var(--surf-lw) solid var(--surf-line);border-radius:var(--r-sm);backdrop-filter:var(--bd-1)}',
'.gg-fmRowLb{display:flex;align-items:center;font-weight:700;color:var(--ink2);padding:0 26px;' +
  'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
'.gg-fmCell{display:flex;align-items:center;justify-content:center}',
'.gg-fmYes{color:var(--good)}',
'.gg-fmNo{color:var(--dim);opacity:.55}',
'.gg-fmTxt{font-weight:700;color:var(--ink)}',
'.gg-fmHi{position:absolute;border:var(--surf-lw2) solid var(--acc);border-radius:var(--r-md);' +
  'box-shadow:var(--target-ring);pointer-events:none;z-index:25}',
/* 챕터 카드 — 번호와 진행 레일. 레일 칸은 scaleX 로 채워진다(transform 만 애니메이션한다) */
'.gg-chNo{position:absolute;font-weight:900;line-height:1;letter-spacing:-.05em;color:var(--acc);' +
  'font-variant-numeric:tabular-nums;text-align:center;' + glow + '}',
'.gg-chSeg{position:absolute;display:flex;flex-direction:column;align-items:center;gap:14px}',
'.gg-chTrack{width:100%;height:8px;border-radius:4px;background:var(--surf-line);overflow:hidden}',
'.gg-chFill{width:100%;height:100%;border-radius:4px;background:var(--acc);' +
  'transform-origin:0 50%;transform:scaleX(0)}',
'.gg-chDone .gg-chFill{transform:scaleX(1);opacity:.42}',
'.gg-chNow .gg-chFill{transform:scaleX(1)}',
'.gg-chSegLb{color:var(--dim);font-weight:600;line-height:1.3;text-align:center;word-break:keep-all}',
'.gg-chNow .gg-chSegLb{color:var(--ink);font-weight:700}',
'.gg-chCur{position:absolute;text-align:center;color:var(--ink);font-weight:700;' +
  'letter-spacing:var(--tight);word-break:keep-all}',
/* 랭킹 */
'.gg-rkRow{position:absolute;display:flex;align-items:center;gap:22px;padding:0 30px;' +
  'background:var(--surf-fill);border:var(--surf-lw) solid var(--surf-line);border-radius:var(--r-md);' +
  'backdrop-filter:var(--bd-1);box-shadow:var(--surf-shadow)}',
'.gg-rkNo{flex:0 0 auto;font-weight:900;color:var(--dim);font-variant-numeric:tabular-nums;' +
  'letter-spacing:-.04em;line-height:1;text-align:center}',
'.gg-rkTop .gg-rkNo{color:var(--acc)}',
'.gg-rkVis{flex:0 0 auto;display:flex;align-items:center}',
'.gg-rkBody{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}',
'.gg-rkLb{font-weight:700;color:var(--ink);letter-spacing:var(--tight);line-height:1.24;' +
  'overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
'.gg-rkNote{font-size:22px;color:var(--dim);line-height:1.4;overflow:hidden;' +
  'text-overflow:ellipsis;white-space:nowrap}',
'.gg-rkVal{flex:0 0 auto;font-weight:800;color:var(--acc);font-variant-numeric:tabular-nums;' +
  'letter-spacing:-.02em}',
'.gg-rkUnit{font-size:.6em;font-weight:700;margin-left:.14em;opacity:.85}',
'.gg-rkHi{position:absolute;border:var(--surf-lw2) solid var(--acc);border-radius:var(--r-md);' +
  'box-shadow:var(--target-ring);pointer-events:none;z-index:25}',
/* 퀴즈 — 정답 링과 답 띠는 good 색을 쓴다. 판정은 액센트가 아니라 판정 색이어야 한다 */
'.gg-qzOpt{position:absolute;display:flex;align-items:center;gap:20px;padding:0 28px;' +
  'background:var(--surf-fill);border:var(--surf-lw) solid var(--surf-line);border-radius:var(--r-md);' +
  'backdrop-filter:var(--bd-1);box-shadow:var(--surf-shadow)}',
'.gg-qzKey{flex:0 0 auto;display:grid;place-items:center;width:58px;height:58px;border-radius:50%;' +
  'border:var(--surf-lw2) solid var(--acc);color:var(--acc);font-weight:800;font-size:27px}',
'.gg-qzBody{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}',
'.gg-qzLb{font-weight:700;color:var(--ink);letter-spacing:var(--tight);line-height:1.28}',
'.gg-qzNote{font-size:21px;color:var(--dim);line-height:1.4}',
'.gg-qzHi{position:absolute;border:var(--surf-lw2) solid ' + T.good + ';border-radius:var(--r-md);' +
  'box-shadow:var(--target-ring);pointer-events:none;z-index:25}',
'.gg-qzAns{position:absolute;display:flex;align-items:center;justify-content:center;gap:20px;' +
  'padding:24px 32px;background:var(--surf-fill);border:var(--surf-lw2) solid ' + T.good + ';' +
  'border-radius:var(--r-md);backdrop-filter:var(--bd-2);box-shadow:var(--surf-shadow);text-align:left}',
'.gg-qzAns .gg-ic{color:' + T.good + '}',
'.gg-qzAnsT{font-weight:800;color:var(--ink);letter-spacing:var(--tight);line-height:1.3}',
'.gg-qzAnsN{margin-top:7px;font-size:22px;color:var(--dim);line-height:1.42}',
/* 엔드카드 — 다음 볼 것은 카드 규칙을 그대로 쓴다. CTA 만 알약 모양으로 따로 둔다 */
'.gg-ecCta{position:absolute;display:flex;align-items:center;justify-content:center;gap:14px;' +
  'border-radius:999px;background:var(--surf-fill);border:var(--surf-lw2) solid var(--acc);' +
  'backdrop-filter:var(--bd-2);box-shadow:var(--surf-shadow);font-weight:800;color:var(--ink);' +
  'letter-spacing:var(--tight)}',
'.gg-ecHandle{position:absolute;text-align:center;color:var(--dim);font-weight:700;letter-spacing:.06em}',
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
  /* 스킨이 얹는 추가 규칙은 맨 뒤에 — 기본 규칙과 특정도가 같아도 나중 것이 이긴다.
     씬 스코프 블록은 그보다 더 뒤에, 그리고 특정도도 높아 확실히 이긴다. */
  ].concat(rootRules).concat(sceneSkinCSS).join('\n');
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
    /* 깊이와 셔터는 런타임이 실행할 값이다 — 배경 레이어의 감쇠율과 잔상 세기.
       에너지 배율은 여기서 곱해 둔다 — 런타임에 에너지 표를 또 두지 않는다 */
    depth: depthOf(spec), shutter: r2(shutterOf(spec) * ENERGY[c.energy].shut),
    reducedMotion: typeof opts.reducedMotion === 'boolean' ? opts.reducedMotion : null,
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
      (s.skin ? ' data-skin="' + esc(s.skin) + '"' : '') +
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
opts.safeArea ? [
  '.gg-safe{position:absolute;z-index:1000;pointer-events:none;border:3px dashed rgba(255,255,255,.82);' +
    'box-shadow:0 0 0 1px rgba(0,0,0,.65) inset;color:#fff;font:700 22px/1 system-ui,sans-serif}',
  '.gg-safe::before{content:attr(data-label);position:absolute;top:8px;left:10px;padding:5px 8px;' +
    'border-radius:4px;background:rgba(0,0,0,.72)}',
  opts.safeArea === 'shorts' ? '.gg-safe{inset:10% 18% 18% 8%}' :
    opts.safeArea === 'captions' ? '.gg-safe{inset:6% 6% 18%}' : '.gg-safe{inset:5%}',
].join('') : '',
'</style>',
'</head>',
'<body>',
'<div class="gg-fit">',
'<div class="gg-scale">',
'<main class="gg-stage"' + (hasCC ? ' data-cc="true"' : '') + ' role="img" aria-label="' + esc(title) + (c.message ? ' — ' + esc(c.message) : '') + '">',
'<div class="gg-scenes-wrap">',
scenesHTML,
'</div>',
'<div class="gg-flash" aria-hidden="true"></div>',
hasCC ? '<div class="gg-captions" id="gg-cc" aria-live="off"></div>' : '',
T.vig ? '<div class="gg-vig" aria-hidden="true"></div>' : '',
T.grain ? grainSVG() : '',
opts.safeArea ? '<div class="gg-safe" aria-hidden="true" data-label="' +
  (opts.safeArea === 'shorts' ? '9:16 UI 안전 영역' : opts.safeArea === 'captions' ? '자막 안전 영역' : '영상 안전 영역') +
  '"></div>' : '',
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
function readAsset(name) {
  if (typeof require !== 'function') throw new Error('브라우저에서는 opts.' + name.split('.')[0] + ' 로 소스를 넘겨야 한다');
  var fs = require('fs'), path = require('path');
  return fs.readFileSync(path.join(__dirname, name), 'utf8');
}

/* ================================================================== *
 * 스펙에 인라인한 커스텀 디자인 요소 — 빌드 범위로만 등록한다
 *
 * 레지스트리(THEMES · ICO · VEC · SK)는 모듈 수준이라 그냥 넣으면 같은 프로세스의
 * 다음 빌드까지 오염된다. 앱은 타이핑마다 빌드하므로 반드시 되돌려야 한다.
 * 모든 공개 진입점(compile · validate · toHTML · timing)이 이 함수를 통과한다.
 * ================================================================== */
var DESIGN_REG = { THEMES: THEMES, ICONS: ICO.ICONS, ALIAS: ICO.ALIAS, VEC: VEC, SK: SK };
function withDesign(spec, fn) {
  var token = DS.install(spec && spec.design, DESIGN_REG);
  try { return fn(); }
  finally { DS.restore(token); }
}

/**
 * 스펙이 실제로 참조하는 디자인 요소 이름들 — 앱이 저장·내보낼 때 무엇을 스펙에
 * 담아야 하는지 알아내는 데 쓴다. 항목 필드 이름은 ITEM_KEYS 한 곳만 본다.
 */
function usedDesignNames(spec) {
  spec = spec || {};
  var out = { themes: [], skins: [], icons: [], arts: [], marks: [], decors: [], frames: [] };
  function put(k, v) { if (v && typeof v === 'string' && out[k].indexOf(v) < 0) out[k].push(v); }
  put('themes', spec.theme);
  put('skins', typeof spec.skin === 'string' ? spec.skin : (spec.skin && spec.skin['extends']));
  arr(spec.decor).forEach(function (d) { put('decors', d); });
  arr(spec.scenes).forEach(function (sc) {
    sc = sc || {};
    put('skins', typeof sc.skin === 'string' ? sc.skin : (sc.skin && sc.skin['extends']));
    arr(sc.decor).forEach(function (d) { put('decors', d); });
    /* mark 는 "badge:NEW" 처럼 값이 붙는다 */
    put('marks', String(sc.mark || '').split(':')[0] || null);
    put('arts', sc.art);
    put('frames', sc.frame);
    put('icons', sc.icon);
    if (sc.screen) { put('arts', sc.screen.art); }
    if (sc.target) { put('icons', sc.target.icon); }
    if (sc.center) { put('icons', sc.center.icon); }
    if (sc.source) { put('icons', sc.source.icon); }
    allItemsOf(sc).forEach(function (x) {
      if (!x || typeof x !== 'object') return;
      put('icons', x.icon);
      put('arts', x.art);
      put('marks', String(x.badge || '').split(':')[0] || null);
    });
  });
  return out;
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
  /* 공개 진입점은 전부 withDesign 을 통과한다 — 스펙의 design 블록을 빌드 동안만
     레지스트리에 얹고 끝나면 되돌린다. toHTML 이 안에서 compile 을 다시 불러도
     install 이 이전 값을 기억하므로 중첩이 안전하다. */
  validate: function (spec, opts) { return withDesign(spec, function () { return validate(spec, opts); }); },
  toHTML: function (spec, opts) { return withDesign(spec, function () { return toHTML(spec, opts); }); },
  timing: function (spec, fps, opts) { return withDesign(spec, function () { return timing(spec, fps, opts); }); },
  compile: function (spec, opts) { return withDesign(spec, function () { return compile(spec, opts); }); },
  /** 스펙이 참조하는 디자인 요소 이름 — 앱이 저장할 때 무엇을 담을지 정하는 데 쓴다 */
  usedDesignNames: usedDesignNames,
  designKinds: DS.KINDS,
  parseSubtitles: parseSubtitles,
  /** 스펙이 참조하는 자막·음성 파일 — CLI·앱이 무엇을 읽어야 하는지 여기서 읽는다 */
  media: mediaOf,
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
  /** 글자 등장 방식 — `gm info textfx` 와 앱 폼이 읽는다 */
  get textFx() { var o = {}; Object.keys(TEXT_FX).forEach(function (k) { o[k] = TEXT_FX[k].label; }); return o; },
  /** 숫자 표기 방식 — dataCounter 의 numFx */
  get numFx() { var o = {}; Object.keys(NUM_FX).forEach(function (k) { o[k] = NUM_FX[k].label; }); return o; },
  /** 글자 퇴장 방식 — 씬의 exitFx */
  get exitFx() { var o = {}; Object.keys(EXIT_FX).forEach(function (k) { o[k] = EXIT_FX[k].label; }); return o; },
  /** 씬 카메라 7종 — 앱의 씬 폼이 목록을 하드코딩하지 않게 여기서 읽는다 */
  get cams() { var o = {}; Object.keys(CAMS).forEach(function (k) { o[k] = CAMS[k].label; }); return o; },
  get energies() { var o = {}; Object.keys(ENERGY).forEach(function (k) { o[k] = ENERGY[k].label; }); return o; },
  get aspects() { var o = {}; Object.keys(ASPECTS).forEach(function (k) { o[k] = ASPECTS[k].w + '×' + ASPECTS[k].h + ' — ' + ASPECTS[k].label; }); return o; },
  tokens: TOKENS,
  /* 디자인 프리미티브(인터페이스)와 스킨(구현부). 앱 스튜디오가 이걸로 목록·편집기를 만든다. */
  get skins() {
    var o = {};
    Object.keys(SK.SKINS).forEach(function (k) { o[k] = SK.SKINS[k].label; });
    return o;
  },
  designTokens: SK.TOKENS,
  /** 스킨 하나를 실제 토큰 값으로 풀어 준다 — 미리보기·편집기의 초기값이 된다 */
  resolveSkin: function (skin, theme, aspect) {
    var T = THEMES[theme] || THEMES.midnight, A = ASPECTS[aspect] || ASPECTS['16:9'];
    var r = SK.resolve(skin, T, A);
    return { name: r.name, label: r.label, vars: r.vars, css: r.css, rules: r.rules };
  },
  registerSkin: SK.registerSkin,
  unregisterSkin: SK.unregisterSkin,
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
