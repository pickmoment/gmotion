/*!
 * charts — 데이터 차트 17종.
 *
 * dataviz 지침을 이 스킬의 조건에 맞춰 적용했다.
 *   · 형태를 먼저, 색은 마지막. 기본은 sequential(테마 accent 단일 색조)
 *   · categorical 은 **시리즈 자체가 주제일 때만**. 검증 통과한 8색을 고정 순서로 쓴다
 *     (validate_palette.js: light/dark 모두 5개 검사 PASS)
 *   · 이중 축 없음. 색은 순환하지 않는다(9번째 시리즈는 만들지 않는다)
 *   · 마크 스펙은 스테이지 크기에 비례한다 — 지침의 px 값은 800px 폭 기준이라
 *     u = W/800 을 곱한다(16:9 에서 2.4배). 안 하면 1920px 화면에 2px 선이 실처럼 보인다
 *   · hover 는 없다. 자동재생 영상이라 마우스가 없다 — 대신 **직접 라벨이 기본**이다
 *
 * build(D, o, T, W, H, u) -> { svg, anim:[], legend:[] }
 *   anim 은 애니메이션 지시다. 엔진이 트윈 IR 로 번역한다.
 *     {k:'grow'|'growX'|'draw'|'fade'|'pop'|'sweep'|'rise', sel, st, dur}
 */
'use strict';

function r2(n) { return Math.round(n * 100) / 100; }
function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
function arr(v) { return v == null ? [] : (Array.isArray(v) ? v : [v]); }
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/** 사람이 읽는 숫자 — 천 단위 쉼표, 큰 수는 축약 */
function fmt(v, dec) {
  if (!isFinite(v)) return '';
  var a = Math.abs(v);
  if (dec == null) dec = a < 10 && a % 1 !== 0 ? 1 : 0;
  return (dec > 0 ? v.toFixed(dec) : Math.round(v)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
/** 축 눈금을 깔끔한 수로 — 0 / 1,000 / 2,000 */
function niceTicks(min, max, n) {
  n = n || 4;
  var span = max - min || 1;
  var raw = span / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
  var norm = raw / mag, step = mag * (norm > 7 ? 10 : norm > 3 ? 5 : norm > 1.5 ? 2 : 1);
  var lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, out = [];
  for (var v = lo; v <= hi + step * .001; v += step) out.push(r2(v));
  return out;
}

/* ================================================================== *
 * 색 — 네 가지 일에 각각 하나의 규칙
 * ================================================================== */
/* 검증 통과한 카테고리 8색. 고정 순서이며 절대 순환하지 않는다.
   9번째 시리즈는 새 색을 만들지 않고 "기타"로 접거나 씬을 나눈다. */
var CAT_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
var CAT_DARK  = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

/** 배경이 밝은 테마인지 — 카테고리 팔레트의 명암 컬럼을 고른다 */
function isLight(T) {
  var h = String(T.bg).replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (r * .299 + g * .587 + b * .114) > 140;
}
function catColors(T) { return isLight(T) ? CAT_LIGHT : CAT_DARK; }

/** hex 를 밝기 t(0~1)로 섞는다 — sequential 램프를 만드는 데 쓴다 */
function mix(hex, other, t) {
  function p(h) {
    h = String(h).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  var a = p(hex), b = p(other);
  return '#' + [0, 1, 2].map(function (i) {
    var v = Math.round(a[i] + (b[i] - a[i]) * t);
    return ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2);
  }).join('');
}
/**
 * sequential 램프 — 한 색조. 값이 클수록 **배경에서 멀어진다**.
 * 지침은 "more is darker" 지만 그건 밝은 배경 전제다. 어두운 배경에서 값이 클수록
 * 어두워지면 큰 값이 배경에 묻힌다 — 기준을 배경으로 잡아야 두 모드가 같은 규칙이 된다.
 */
function seqRamp(T, n) {
  var out = [], far = T.bg;
  for (var i = 0; i < n; i++) out.push(mix(T.accent, far, n === 1 ? 0 : (1 - i / (n - 1)) * .62));
  return out;
}
/**
 * 색을 정한다. 세 가지 중 하나만 쓴다.
 *   emphasis   하나만 accent, 나머지는 회색 — 지침이 "가장 저평가된 형태"라 부르는 것
 *   sequential 단일 시리즈의 크기 비교 (기본)
 *   categorical 시리즈 자체가 주제일 때
 */
function colorsFor(n, T, o) {
  if (o.emphasis != null) {
    var e = num(o.emphasis, 0);
    return { list: Array.apply(null, Array(n)).map(function (_, i) { return i === e ? T.accent : T.dim; }),
             mode: 'emphasis' };
  }
  if (o.mode === 'categorical' || o.categorical) {
    var C = catColors(T);
    return { list: Array.apply(null, Array(n)).map(function (_, i) { return C[i % 8]; }), mode: 'categorical',
             over: n > 8 };
  }
  return { list: seqRamp(T, n), mode: 'sequential' };
}

/* ================================================================== *
 * 데이터 정규화
 *   items:  [{label, value}] 또는 ["a", 3] 혼합 · [3,5,8]
 *   series: [{name, values:[...]}] + categories: [...]
 * ================================================================== */
function normOne(v) {
  if (typeof v === 'number') return { label: '', value: v };
  if (typeof v === 'string') return { label: v, value: 0 };
  v = v || {};
  return { label: v.label == null ? '' : String(v.label), value: num(v.value, 0),
           note: v.note, icon: v.icon, tone: v.tone, target: num(v.target, null) };
}
function normData(D) {
  D = D || {};
  var cats = arr(D.categories).map(String);
  var series = arr(D.series).map(function (s, i) {
    if (Array.isArray(s)) return { name: 'S' + (i + 1), values: s.map(function (x) { return num(x, 0); }) };
    return { name: String((s && s.name) || 'S' + (i + 1)),
             values: arr(s && s.values).map(function (x) { return num(x, 0); }) };
  });
  var items = arr(D.items).map(normOne);
  if (!series.length && items.length) {
    series = [{ name: D.name || '', values: items.map(function (x) { return x.value; }) }];
    if (!cats.length) cats = items.map(function (x) { return x.label; });
  }
  if (!cats.length && series.length) {
    cats = series[0].values.map(function (_, i) { return String(i + 1); });
  }
  return { cats: cats, series: series, items: items, single: series.length <= 1 };
}
function extent(series, fromZero) {
  var lo = Infinity, hi = -Infinity;
  series.forEach(function (s) { s.values.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; }); });
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  if (fromZero !== false) { lo = Math.min(0, lo); hi = Math.max(0, hi); }
  if (lo === hi) hi = lo + 1;
  return [lo, hi];
}

/* 공통 조각 ------------------------------------------------------- */
function axisLine(x1, y1, x2, y2, T, u) {
  return '<path class="gg-cAxis" d="M' + r2(x1) + ' ' + r2(y1) + ' L' + r2(x2) + ' ' + r2(y2) +
    '" stroke="' + T.line + '" stroke-width="' + r2(1 * u) + '" fill="none"/>';
}
function gridLine(x1, y1, x2, y2, T, u) {
  return '<path class="gg-cGrid" d="M' + r2(x1) + ' ' + r2(y1) + ' L' + r2(x2) + ' ' + r2(y2) +
    '" stroke="' + T.line + '" stroke-width="' + r2(1 * u) + '" fill="none" opacity=".55"/>';
}
function tickText(x, y, s, T, u, anchor, dim) {
  return '<text class="gg-cTick" x="' + r2(x) + '" y="' + r2(y) + '" text-anchor="' + (anchor || 'middle') +
    '" font-size="' + r2(13 * u) + '" fill="' + (dim ? T.dim : T.ink2) + '">' + esc(s) + '</text>';
}
/** 값 라벨 — 텍스트는 절대 시리즈 색을 입지 않는다(지침) */
function valText(x, y, s, T, u, anchor, size, idx) {
  return '<text class="gg-cVal"' + (idx != null ? ' data-i="' + idx + '"' : '') +
    ' x="' + r2(x) + '" y="' + r2(y) + '" text-anchor="' + (anchor || 'middle') +
    '" font-size="' + r2((size || 16) * u) + '" font-weight="700" fill="' + T.ink + '">' + esc(s) + '</text>';
}

/**
 * 라벨 충돌 회피 — 값이 비슷하면 끝 라벨이 포개진다.
 * 지침은 "겹치면 쌓지 말라"고 한다. 점은 제자리에 두고 글자만 최소 간격으로 밀어낸다.
 */
function dodge(ys, minGap) {
  var idx = ys.map(function (y, i) { return { y: y, i: i }; }).sort(function (a, b) { return a.y - b.y; });
  for (var k = 1; k < idx.length; k++) {
    if (idx[k].y - idx[k - 1].y < minGap) idx[k].y = idx[k - 1].y + minGap;
  }
  var out = [];
  idx.forEach(function (o) { out[o.i] = o.y; });
  return out;
}

var CHARTS = {};

/* ================================================================== *
 * 차트 — 세로/가로 막대 계열
 * ================================================================== */
/** 플롯 영역 계산. 라벨이 들어갈 자리를 먼저 빼 둔다 — 나중에 빼면 라벨이 잘린다. */
function plot(W, H, u, o) {
  o = o || {};
  return { l: num(o.l, 58 * u), r: num(o.r, 24 * u), t: num(o.t, 30 * u), b: num(o.b, 46 * u),
           w: W - num(o.l, 58 * u) - num(o.r, 24 * u), h: H - num(o.t, 30 * u) - num(o.b, 46 * u) };
}

CHARTS.bar = {
  label: '세로 막대 — 크기 비교. 항목 3~8개',
  use: '항목별 크기를 견준다. 기본은 sequential(한 색조), emphasis 로 하나만 강조할 수 있다.',
  build: function (D, o, T, W, H, u) {
    var n = D.cats.length, ex = extent(D.series, true), P = plot(W, H, u);
    var ticks = niceTicks(ex[0], ex[1], 4), lo = ticks[0], hi = ticks[ticks.length - 1];
    var y = function (v) { return P.t + P.h - (v - lo) / (hi - lo) * P.h; };
    var band = P.w / n, bw = Math.min(24 * u, band * .56);  /* 밴드를 채우지 않는다 — 남는 건 공기 */
    var C = colorsFor(n, T, o), s = [], vals = D.series[0].values;
    ticks.forEach(function (t2) {
      s.push(gridLine(P.l, y(t2), P.l + P.w, y(t2), T, u));
      s.push(tickText(P.l - 12 * u, y(t2) + 5 * u, fmt(t2), T, u, 'end', true));
    });
    s.push(axisLine(P.l, y(Math.max(lo, 0)), P.l + P.w, y(Math.max(lo, 0)), T, u));
    vals.forEach(function (v, i) {
      var cx = P.l + band * (i + .5), base = y(Math.max(lo, 0)), top = y(v);
      var hgt = Math.abs(base - top), yy = Math.min(base, top);
      s.push('<rect class="gg-cBar" data-i="' + i + '" x="' + r2(cx - bw / 2) + '" y="' + r2(yy) +
        '" width="' + r2(bw) + '" height="' + r2(Math.max(hgt, .5)) + '" rx="' + r2(4 * u) +
        '" fill="' + C.list[i] + '" style="transform-origin:' + r2(cx) + 'px ' + r2(base) + 'px"/>');
      /* 값은 캡 위에. 모든 점에 숫자를 다는 건 금지지만 막대는 항목이 적어 직접 라벨이 낫다 */
      if (o.labels !== false) s.push(valText(cx, yy - 10 * u, fmt(v, o.dec), T, u, null, null, i));
      if (D.cats[i]) s.push(tickText(cx, P.t + P.h + 26 * u, D.cats[i], T, u));
    });
    return { svg: s.join(''), anim: [{ k: 'grow', sel: '.gg-cBar', st: .06 },
                                     { k: 'fade', sel: '.gg-cVal', st: .06, lag: .25 }] };
  }
};

CHARTS.barH = {
  label: '가로 막대 — 랭킹. 이름이 길거나 항목이 많을 때',
  use: '순위·비중. 이름이 길면 세로 막대보다 항상 낫다. 값이 큰 것부터 정렬한다.',
  build: function (D, o, T, W, H, u) {
    var vals = D.series[0].values.slice(), cats = D.cats.slice();
    if (o.sort !== false) {
      var idx = vals.map(function (v, i) { return i; }).sort(function (a, b) { return vals[b] - vals[a]; });
      vals = idx.map(function (i) { return D.series[0].values[i]; });
      cats = idx.map(function (i) { return D.cats[i]; });
    }
    var n = vals.length, hi = Math.max.apply(null, vals.concat([0])) || 1;
    var labelW = Math.min(W * .3, 20 * u + Math.max.apply(null, cats.map(function (c) { return c.length; })) * 9 * u);
    var P = plot(W, H, u, { l: labelW, r: 78 * u, t: 12 * u, b: 12 * u });
    var band = P.h / n, bh = Math.min(24 * u, band * .58);
    var C = colorsFor(n, T, o), s = [];
    vals.forEach(function (v, i) {
      var cy = P.t + band * (i + .5), w = Math.max(v / hi * P.w, .5);
      s.push('<rect class="gg-cBar" data-i="' + i + '" x="' + r2(P.l) + '" y="' + r2(cy - bh / 2) +
        '" width="' + r2(w) + '" height="' + r2(bh) + '" rx="' + r2(4 * u) + '" fill="' + C.list[i] +
        '" style="transform-origin:' + r2(P.l) + 'px ' + r2(cy) + 'px"/>');
      s.push(tickText(P.l - 14 * u, cy + 6 * u, cats[i], T, u, 'end'));
      s.push(valText(P.l + w + 14 * u, cy + 6 * u, fmt(v, o.dec), T, u, 'start', null, i));
    });
    return { svg: s.join(''), anim: [{ k: 'growX', sel: '.gg-cBar', st: .07 },
                                     { k: 'fade', sel: '.gg-cVal', st: .07, lag: .3 }] };
  }
};

CHARTS.barGroup = {
  label: '그룹 막대 — 항목 × 시리즈 비교',
  use: '카테고리마다 여러 시리즈를 나란히. 시리즈가 주제이므로 categorical 색을 쓴다. 시리즈 4개까지.',
  build: function (D, o, T, W, H, u) {
    var ns = D.series.length, nc = D.cats.length, ex = extent(D.series, true), P = plot(W, H, u);
    var ticks = niceTicks(ex[0], ex[1], 4), lo = ticks[0], hi = ticks[ticks.length - 1];
    var y = function (v) { return P.t + P.h - (v - lo) / (hi - lo) * P.h; };
    var band = P.w / nc, gap = 2 * u;
    var bw = Math.min(24 * u, (band * .74 - gap * (ns - 1)) / ns);
    var C = colorsFor(ns, T, { mode: 'categorical' }), s = [];
    ticks.forEach(function (t2) {
      s.push(gridLine(P.l, y(t2), P.l + P.w, y(t2), T, u));
      s.push(tickText(P.l - 12 * u, y(t2) + 5 * u, fmt(t2), T, u, 'end', true));
    });
    s.push(axisLine(P.l, y(Math.max(lo, 0)), P.l + P.w, y(Math.max(lo, 0)), T, u));
    D.cats.forEach(function (c, ci) {
      var g0 = P.l + band * (ci + .5) - (bw * ns + gap * (ns - 1)) / 2;
      D.series.forEach(function (se, si) {
        var v = num(se.values[ci], 0), base = y(Math.max(lo, 0)), top = y(v);
        var x = g0 + si * (bw + gap);
        s.push('<rect class="gg-cBar" data-i="' + (ci * ns + si) + '" x="' + r2(x) + '" y="' + r2(Math.min(base, top)) +
          '" width="' + r2(bw) + '" height="' + r2(Math.max(Math.abs(base - top), .5)) + '" rx="' + r2(4 * u) +
          '" fill="' + C.list[si] + '" style="transform-origin:' + r2(x + bw / 2) + 'px ' + r2(base) + 'px"/>');
      });
      s.push(tickText(P.l + band * (ci + .5), P.t + P.h + 26 * u, c, T, u));
    });
    return { svg: s.join(''), anim: [{ k: 'grow', sel: '.gg-cBar', st: .04 }],
             legend: D.series.map(function (se, i) { return { name: se.name, color: C.list[i] }; }) };
  }
};

CHARTS.barStack = {
  label: '누적 막대 — 부분과 전체',
  use: '전체 안에서의 구성. 항목 이름이 길거나 많으면 가로(horizontal:true)로 눕힌다.',
  build: function (D, o, T, W, H, u) {
    var horiz = !!o.horizontal, ns = D.series.length, nc = D.cats.length;
    var totals = D.cats.map(function (_, ci) {
      return D.series.reduce(function (a, se) { return a + num(se.values[ci], 0); }, 0);
    });
    var hi = Math.max.apply(null, totals) || 1;
    var C = colorsFor(ns, T, { mode: 'categorical' }), s = [], gap = 2 * u;
    if (!horiz) {
      var P = plot(W, H, u, { l: 58 * u, r: 24 * u, t: 30 * u, b: 46 * u });
      var band = P.w / nc, bw = Math.min(34 * u, band * .5);
      D.cats.forEach(function (c, ci) {
        var cx = P.l + band * (ci + .5), acc = 0;
        D.series.forEach(function (se, si) {
          var v = num(se.values[ci], 0), h0 = v / hi * P.h;
          var yTop = P.t + P.h - (acc + v) / hi * P.h;
          s.push('<rect class="gg-cSeg" data-i="' + (ci * ns + si) + '" x="' + r2(cx - bw / 2) + '" y="' + r2(yTop + gap / 2) +
            '" width="' + r2(bw) + '" height="' + r2(Math.max(h0 - gap, .5)) + '" rx="' + r2(3 * u) +
            '" fill="' + C.list[si] + '" style="transform-origin:' + r2(cx) + 'px ' + r2(P.t + P.h) + 'px"/>');
          acc += v;
        });
        s.push(tickText(cx, P.t + P.h + 26 * u, c, T, u));
        s.push(valText(cx, P.t + P.h - totals[ci] / hi * P.h - 12 * u, fmt(totals[ci], o.dec), T, u));
      });
      s.push(axisLine(P.l, P.t + P.h, P.l + P.w, P.t + P.h, T, u));
    } else {
      var labelW = Math.min(W * .28, 20 * u + Math.max.apply(null, D.cats.map(function (c) { return c.length; })) * 9 * u);
      var P2 = plot(W, H, u, { l: labelW, r: 70 * u, t: 12 * u, b: 12 * u });
      var band2 = P2.h / nc, bh = Math.min(34 * u, band2 * .52);
      D.cats.forEach(function (c, ci) {
        var cy = P2.t + band2 * (ci + .5), acc = 0;
        D.series.forEach(function (se, si) {
          var v = num(se.values[ci], 0), w0 = v / hi * P2.w;
          s.push('<rect class="gg-cSeg" data-i="' + (ci * ns + si) + '" x="' + r2(P2.l + acc / hi * P2.w + gap / 2) +
            '" y="' + r2(cy - bh / 2) + '" width="' + r2(Math.max(w0 - gap, .5)) + '" height="' + r2(bh) +
            '" rx="' + r2(3 * u) + '" fill="' + C.list[si] + '" style="transform-origin:' + r2(P2.l) + 'px ' + r2(cy) + 'px"/>');
          acc += v;
        });
        s.push(tickText(P2.l - 14 * u, cy + 6 * u, c, T, u, 'end'));
        s.push(valText(P2.l + totals[ci] / hi * P2.w + 12 * u, cy + 6 * u, fmt(totals[ci], o.dec), T, u, 'start'));
      });
    }
    return { svg: s.join(''), anim: [{ k: horiz ? 'growX' : 'grow', sel: '.gg-cSeg', st: .035 },
                                     { k: 'fade', sel: '.gg-cVal', st: .05, lag: .3 }],
             legend: D.series.map(function (se, i) { return { name: se.name, color: C.list[i] }; }) };
  }
};

CHARTS.line = {
  label: '꺾은선 — 시간에 따른 추이',
  use: '추세. 선이 왼쪽에서 오른쪽으로 그려지며 시간이 흐르는 걸 보여준다. 시리즈 4개까지.',
  build: function (D, o, T, W, H, u) {
    var ex = extent(D.series, o.fromZero), P = plot(W, H, u);
    var ticks = niceTicks(ex[0], ex[1], 4), lo = ticks[0], hi = ticks[ticks.length - 1];
    var n = D.cats.length;
    var x = function (i) { return P.l + (n === 1 ? P.w / 2 : i * P.w / (n - 1)); };
    var y = function (v) { return P.t + P.h - (v - lo) / (hi - lo) * P.h; };
    var C = colorsFor(D.series.length, T, D.series.length > 1 ? { mode: 'categorical' } : o), s = [];
    ticks.forEach(function (t2) {
      s.push(gridLine(P.l, y(t2), P.l + P.w, y(t2), T, u));
      s.push(tickText(P.l - 12 * u, y(t2) + 5 * u, fmt(t2), T, u, 'end', true));
    });
    D.cats.forEach(function (c, i) { s.push(tickText(x(i), P.t + P.h + 26 * u, c, T, u)); });
    s.push(axisLine(P.l, P.t + P.h, P.l + P.w, P.t + P.h, T, u));
    var lastY = dodge(D.series.map(function (se) { return y(se.values[se.values.length - 1]); }), 24 * u);
    D.series.forEach(function (se, si) {
      var d = se.values.map(function (v, i) { return (i ? 'L' : 'M') + r2(x(i)) + ' ' + r2(y(v)); }).join(' ');
      s.push('<path class="gg-cLine" data-i="' + si + '" d="' + d + '" fill="none" stroke="' + C.list[si] +
        '" stroke-width="' + r2(2 * u) + '" stroke-linecap="round" stroke-linejoin="round"/>');
      /* 끝점에만 마커와 값 — 모든 점에 숫자를 다는 건 지침이 금지한다 */
      var last = se.values.length - 1;
      s.push('<circle class="gg-cDot" data-i="' + si + '" cx="' + r2(x(last)) + '" cy="' + r2(y(se.values[last])) +
        '" r="' + r2(5 * u) + '" fill="' + C.list[si] + '" stroke="' + T.bg + '" stroke-width="' + r2(2 * u) + '"/>');
      if (o.labels !== false) {
        s.push(valText(x(last) + 14 * u, lastY[si] + 6 * u, fmt(se.values[last], o.dec), T, u, 'start'));
      }
    });
    return { svg: s.join(''), anim: [{ k: 'draw', sel: '.gg-cLine', st: .12, dur: 1.1 },
                                     { k: 'pop', sel: '.gg-cDot', st: .1, lag: .8 },
                                     { k: 'fade', sel: '.gg-cVal', st: .08, lag: .9 }],
             legend: D.series.length > 1 ? D.series.map(function (se, i) { return { name: se.name, color: C.list[i] }; }) : null };
  }
};

CHARTS.area = {
  label: '영역 — 단일 추이의 부피감',
  use: '한 시리즈의 추세를 채워서 보여준다. 채움은 옅은 워시(10%)이지 색 덩어리가 아니다.',
  build: function (D, o, T, W, H, u) {
    var ex = extent(D.series, true), P = plot(W, H, u);
    var ticks = niceTicks(ex[0], ex[1], 4), lo = ticks[0], hi = ticks[ticks.length - 1];
    var n = D.cats.length, se = D.series[0];
    var x = function (i) { return P.l + (n === 1 ? P.w / 2 : i * P.w / (n - 1)); };
    var y = function (v) { return P.t + P.h - (v - lo) / (hi - lo) * P.h; };
    var s = [], col = T.accent;
    ticks.forEach(function (t2) {
      s.push(gridLine(P.l, y(t2), P.l + P.w, y(t2), T, u));
      s.push(tickText(P.l - 12 * u, y(t2) + 5 * u, fmt(t2), T, u, 'end', true));
    });
    var line = se.values.map(function (v, i) { return (i ? 'L' : 'M') + r2(x(i)) + ' ' + r2(y(v)); }).join(' ');
    s.push('<path class="gg-cArea" d="' + line + ' L' + r2(x(n - 1)) + ' ' + r2(y(Math.max(lo, 0))) +
      ' L' + r2(x(0)) + ' ' + r2(y(Math.max(lo, 0))) + 'Z" fill="' + col + '" opacity=".1"/>');
    s.push('<path class="gg-cLine" d="' + line + '" fill="none" stroke="' + col + '" stroke-width="' + r2(2 * u) +
      '" stroke-linecap="round" stroke-linejoin="round"/>');
    var last = se.values.length - 1;
    s.push('<circle class="gg-cDot" cx="' + r2(x(last)) + '" cy="' + r2(y(se.values[last])) + '" r="' + r2(5 * u) +
      '" fill="' + col + '" stroke="' + T.bg + '" stroke-width="' + r2(2 * u) + '"/>');
    s.push(valText(x(last) + 14 * u, y(se.values[last]) + 6 * u, fmt(se.values[last], o.dec), T, u, 'start'));
    D.cats.forEach(function (c, i) { s.push(tickText(x(i), P.t + P.h + 26 * u, c, T, u)); });
    s.push(axisLine(P.l, P.t + P.h, P.l + P.w, P.t + P.h, T, u));
    return { svg: s.join(''), anim: [{ k: 'draw', sel: '.gg-cLine', dur: 1.2 },
                                     { k: 'fade', sel: '.gg-cArea', lag: .3, dur: .8 },
                                     { k: 'pop', sel: '.gg-cDot', lag: .95 },
                                     { k: 'fade', sel: '.gg-cVal', lag: 1 }] };
  }
};

/* ================================================================== *
 * 비율 계열 — 도넛 · 게이지 · 아이소타입
 * ================================================================== */
function arcPath(cx, cy, r, a0, a1) {
  var p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r];
  var p1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r];
  var big = (a1 - a0) > Math.PI ? 1 : 0;
  return 'M' + r2(p0[0]) + ' ' + r2(p0[1]) + ' A' + r2(r) + ' ' + r2(r) + ' 0 ' + big + ' 1 ' + r2(p1[0]) + ' ' + r2(p1[1]);
}

CHARTS.donut = {
  label: '도넛 — 부분과 전체. 조각 2~5개',
  use: '구성비. 조각이 6개를 넘으면 누적 가로 막대가 낫다. 가운데에 총계나 핵심 비율을 놓는다.',
  build: function (D, o, T, W, H, u) {
    var vals = D.series[0].values, total = vals.reduce(function (a, b) { return a + b; }, 0) || 1;
    var cx = W / 2, cy = H / 2, R = Math.min(W, H) * .38, th = Math.max(22 * u, R * .3);
    var C = colorsFor(vals.length, T, vals.length > 1 ? { mode: 'categorical' } : o), s = [];
    var gapA = (2 * u) / R;                                  /* 조각 사이 2px 간격 */
    var a = -Math.PI / 2;
    s.push('<circle cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(R) + '" fill="none" stroke="' + T.line +
      '" stroke-width="' + r2(th) + '" opacity=".4"/>');
    vals.forEach(function (v, i) {
      var span = v / total * Math.PI * 2;
      s.push('<path class="gg-cArc" data-i="' + i + '" d="' + arcPath(cx, cy, R, a + gapA / 2, a + span - gapA / 2) +
        '" fill="none" stroke="' + C.list[i] + '" stroke-width="' + r2(th) + '" stroke-linecap="butt"/>');
      /* 조각이 충분히 크면 바깥에 직접 라벨 — 작은 조각까지 라벨을 달면 서로 부딪힌다 */
      if (span > .28) {
        var mid = a + span / 2, lx = cx + Math.cos(mid) * (R + th * .72), ly = cy + Math.sin(mid) * (R + th * .72);
        s.push(valText(lx, ly + 5 * u, D.cats[i] ? D.cats[i] + ' ' + Math.round(v / total * 100) + '%' :
          Math.round(v / total * 100) + '%', T, u, Math.cos(mid) > .2 ? 'start' : Math.cos(mid) < -.2 ? 'end' : 'middle', 14));
      }
      a += span;
    });
    if (o.center !== false) {
      var big = o.center || (Math.round(vals[0] / total * 100) + '%');
      s.push('<text class="gg-cHero" x="' + r2(cx) + '" y="' + r2(cy + 6 * u) + '" text-anchor="middle" font-size="' +
        r2(46 * u) + '" font-weight="800" fill="' + T.ink + '">' + esc(big) + '</text>');
      if (o.centerLabel) s.push(tickText(cx, cy + 34 * u, o.centerLabel, T, u));
    }
    return { svg: s.join(''), anim: [{ k: 'sweep', sel: '.gg-cArc', st: .1, dur: .9 },
                                     { k: 'fade', sel: '.gg-cVal', st: .06, lag: .5 },
                                     { k: 'pop', sel: '.gg-cHero', lag: .4 }],
             legend: vals.length > 1 && D.cats[0] ? D.cats.map(function (c, i) { return { name: c, color: C.list[i] }; }) : null };
  }
};

CHARTS.gauge = {
  label: '게이지 — 한 비율을 한계선에 견준다',
  use: '달성률·사용률. 값 하나면 파이보다 낫다. 심각도에 따라 색이 바뀐다.',
  build: function (D, o, T, W, H, u) {
    var v = num(D.series[0].values[0], 0), max = num(o.max, 100);
    var pct = Math.max(0, Math.min(1, v / max));
    var cx = W / 2, cy = H * .8, R = Math.min(W * .34, H * .66), th = Math.max(20 * u, R * .15);
    /* 채움이 심각도를 진다(지침) — 빈 트랙은 중립 */
    var col = o.tone === 'bad' ? T.bad : o.tone === 'warn' ? T.warn : o.tone === 'good' ? T.good : T.accent;
    var s = [];
    s.push('<path d="' + arcPath(cx, cy, R, Math.PI, Math.PI * 2) + '" fill="none" stroke="' + T.line +
      '" stroke-width="' + r2(th) + '" stroke-linecap="round" opacity=".5"/>');
    s.push('<path class="gg-cArc" d="' + arcPath(cx, cy, R, Math.PI, Math.PI + Math.PI * Math.max(pct, .001)) +
      '" fill="none" stroke="' + col + '" stroke-width="' + r2(th) + '" stroke-linecap="round"/>');
    s.push('<text class="gg-cHero" x="' + r2(cx) + '" y="' + r2(cy - 14 * u) + '" text-anchor="middle" font-size="' +
      r2(64 * u) + '" font-weight="800" fill="' + T.ink + '">' + esc(fmt(v, o.dec) + (o.unit || '')) + '</text>');
    if (o.label) s.push(tickText(cx, cy + 22 * u, o.label, T, u));
    /* 눈금은 게이지 끝 바깥 아래로 — 안에 두면 굵은 아크와 겹친다 */
    s.push(tickText(cx - R, cy + th * .7 + 24 * u, '0', T, u, 'middle', true));
    s.push(tickText(cx + R, cy + th * .7 + 24 * u, fmt(max) + (o.unit || ''), T, u, 'middle', true));
    return { svg: s.join(''), anim: [{ k: 'sweep', sel: '.gg-cArc', dur: 1.1 }, { k: 'pop', sel: '.gg-cHero', lag: .3 }] };
  }
};

CHARTS.isotype = {
  label: '아이소타입 — 100칸 그림. "100명 중 41명"',
  use: '비율을 사람 수로 세게 만든다. 퍼센트를 숫자로 말할 때보다 훨씬 오래 남는다.',
  build: function (D, o, T, W, H, u, iconPath) {
    var pct = Math.max(0, Math.min(100, Math.round(num(D.series[0].values[0], 0))));
    var cols = num(o.cols, 10), rows = Math.ceil(100 / cols);
    /* 캡션 자리를 먼저 빼고 남은 곳에 격자를 넣는다 — 나중에 빼면 아래 줄이 화면 밖으로 나간다 */
    var capH = o.caption === false ? 0 : 46 * u;
    var gh = H - capH;
    var cell = Math.min(W / (cols + 1), gh / (rows + 1));   /* 여유를 두지 않으면 마지막 줄이 화면 밖으로 나간다 */
    var gx = (W - cell * cols) / 2, gy = capH + (gh - cell * rows) / 2;
    var s = [], sz = cell * .74, on = o.color || T.accent, off = T.dim;
    for (var i = 0; i < 100; i++) {
      var r = Math.floor(i / cols), c = i % cols;
      var x = gx + c * cell + (cell - sz) / 2, y = gy + r * cell + (cell - sz) / 2;
      var lit = i < pct;
      s.push('<g class="gg-cCell" data-i="' + i + '" transform="translate(' + r2(x) + ',' + r2(y) + ') scale(' +
        r2(sz / 24) + ')" style="transform-origin:' + r2(x + sz / 2) + 'px ' + r2(y + sz / 2) + 'px">' +
        /* 꺼진 칸도 "세어지는" 것이어야 한다 — 너무 흐리면 분모가 사라져 비율이 안 읽힌다 */
        (iconPath ? '<path d="' + iconPath + '" fill="none" stroke="' + (lit ? on : off) + '" stroke-width="1.8" ' +
          'stroke-linecap="round" stroke-linejoin="round" opacity="' + (lit ? 1 : .5) + '"/>'
                  : '<circle cx="12" cy="12" r="9" fill="' + (lit ? on : off) + '" opacity="' + (lit ? 1 : .5) + '"/>') +
        '</g>');
    }
    if (capH) {
      s.push('<text class="gg-cHero" x="' + r2(W / 2) + '" y="' + r2(capH * .68) + '" text-anchor="middle" font-size="' +
        r2(30 * u) + '" font-weight="800" fill="' + T.ink + '">' +
        esc(typeof o.caption === 'string' ? o.caption : ('100 중 ' + pct)) + '</text>');
    }
    /* n 은 스태거가 몇 번 반복되는지 — 없으면 엔진이 씬 길이를 짧게 잡아 등장 도중에 끝난다 */
    return { svg: s.join(''), anim: [{ k: 'pop', sel: '.gg-cCell', st: .012, dur: .34, n: 100 },
                                     { k: 'fade', sel: '.gg-cHero', lag: .2 }] };
  }
};

/* ================================================================== *
 * 관계·분포 계열
 * ================================================================== */
CHARTS.radar = {
  label: '레이더 — 여러 축을 한 번에 비교',
  use: '역량·특성 프로필. 축 5~8개, 시리즈 3개까지. 그 이상은 읽히지 않는다.',
  build: function (D, o, T, W, H, u) {
    var axes = D.cats, n = axes.length, cx = W / 2, cy = H / 2;
    var R = Math.min(W, H) * .34, hi = num(o.max, Math.max(1, extent(D.series, true)[1]));
    var C = colorsFor(D.series.length, T, D.series.length > 1 ? { mode: 'categorical' } : o), s = [];
    function pt(i, v) {
      var a = -Math.PI / 2 + i * Math.PI * 2 / n, rr = v / hi * R;
      return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
    }
    [.25, .5, .75, 1].forEach(function (f) {
      var d = axes.map(function (_, i) { var p = pt(i, hi * f); return (i ? 'L' : 'M') + r2(p[0]) + ' ' + r2(p[1]); }).join(' ');
      s.push('<path d="' + d + 'Z" fill="none" stroke="' + T.line + '" stroke-width="' + r2(1 * u) + '" opacity=".55"/>');
    });
    axes.forEach(function (a, i) {
      var p = pt(i, hi), lp = pt(i, hi * 1.16);
      s.push('<path d="M' + r2(cx) + ' ' + r2(cy) + ' L' + r2(p[0]) + ' ' + r2(p[1]) + '" stroke="' + T.line +
        '" stroke-width="' + r2(1 * u) + '" opacity=".4"/>');
      s.push(tickText(lp[0], lp[1] + 5 * u, a, T, u));
    });
    D.series.forEach(function (se, si) {
      var d = se.values.map(function (v, i) { var p = pt(i, v); return (i ? 'L' : 'M') + r2(p[0]) + ' ' + r2(p[1]); }).join(' ');
      s.push('<path class="gg-cPoly" data-i="' + si + '" d="' + d + 'Z" fill="' + C.list[si] + '" opacity=".14" ' +
        'style="transform-origin:' + r2(cx) + 'px ' + r2(cy) + 'px"/>');
      s.push('<path class="gg-cPolyL" data-i="' + si + '" d="' + d + 'Z" fill="none" stroke="' + C.list[si] +
        '" stroke-width="' + r2(2 * u) + '" stroke-linejoin="round" style="transform-origin:' + r2(cx) + 'px ' + r2(cy) + 'px"/>');
    });
    return { svg: s.join(''), anim: [{ k: 'bloom', sel: '.gg-cPoly,.gg-cPolyL', st: .12, dur: .9 }],
             legend: D.series.length > 1 ? D.series.map(function (se, i) { return { name: se.name, color: C.list[i] }; }) : null };
  }
};

CHARTS.scatter = {
  label: '산점도·버블 — 두 값의 관계',
  use: '상관·분포. 항목마다 x·y(·size)를 준다. 색을 쓰는 계열은 3개까지가 안전하다.',
  build: function (D, o, T, W, H, u, _ip, raw) {
    var pts = arr(raw && raw.points).map(function (p) {
      return { x: num(p.x, 0), y: num(p.y, 0), size: num(p.size, null), label: p.label, group: p.group };
    });
    if (!pts.length) pts = D.series[0].values.map(function (v, i) { return { x: i, y: v }; });
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    var P = plot(W, H, u);
    var xt = niceTicks(Math.min.apply(null, xs), Math.max.apply(null, xs), 4);
    var yt = niceTicks(Math.min.apply(null, ys), Math.max.apply(null, ys), 4);
    var x0 = xt[0], x1 = xt[xt.length - 1], y0 = yt[0], y1 = yt[yt.length - 1];
    var X = function (v) { return P.l + (v - x0) / (x1 - x0) * P.w; };
    var Y = function (v) { return P.t + P.h - (v - y0) / (y1 - y0) * P.h; };
    var groups = [];
    pts.forEach(function (p) { if (p.group && groups.indexOf(p.group) < 0) groups.push(p.group); });
    var C = colorsFor(Math.max(1, groups.length), T, groups.length > 1 ? { mode: 'categorical' } : o);
    var sizes = pts.map(function (p) { return p.size; }).filter(function (v) { return v != null; });
    var smax = sizes.length ? Math.max.apply(null, sizes) : 1;
    var s = [];
    yt.forEach(function (t2) {
      s.push(gridLine(P.l, Y(t2), P.l + P.w, Y(t2), T, u));
      s.push(tickText(P.l - 12 * u, Y(t2) + 5 * u, fmt(t2), T, u, 'end', true));
    });
    xt.forEach(function (t2) { s.push(tickText(X(t2), P.t + P.h + 26 * u, fmt(t2), T, u, 'middle', true)); });
    s.push(axisLine(P.l, P.t + P.h, P.l + P.w, P.t + P.h, T, u));
    pts.forEach(function (p, i) {
      var rr = p.size != null ? (8 + Math.sqrt(p.size / smax) * 26) * u * .6 : 5 * u;
      var col = groups.length > 1 ? C.list[groups.indexOf(p.group)] : T.accent;
      s.push('<circle class="gg-cDot" data-i="' + i + '" cx="' + r2(X(p.x)) + '" cy="' + r2(Y(p.y)) + '" r="' + r2(rr) +
        '" fill="' + col + '" opacity=".82" stroke="' + T.bg + '" stroke-width="' + r2(2 * u) + '"/>');
      if (p.label) s.push(tickText(X(p.x), Y(p.y) - rr - 8 * u, p.label, T, u));
    });
    return { svg: s.join(''), anim: [{ k: 'pop', sel: '.gg-cDot', st: .05, dur: .5 },
                                     { k: 'fade', sel: '.gg-cTick', st: .02, lag: .3 }],
             legend: groups.length > 1 ? groups.map(function (g, i) { return { name: g, color: C.list[i] }; }) : null };
  }
};

/* ================================================================== *
 * 변화 계열 — 워터폴 · 슬로프 · 덤벨 · 불릿 · 히트맵 · 스파크라인
 * ================================================================== */
CHARTS.waterfall = {
  label: '워터폴 — 무엇이 더하고 무엇이 뺐나',
  use: '시작에서 끝까지의 증감 분해. 매출 브릿지, 비용 구조 변화. 부호가 색을 정한다(diverging).',
  build: function (D, o, T, W, H, u) {
    var vals = D.series[0].values, cats = D.cats, n = vals.length;
    var acc = 0, steps = vals.map(function (v, i) {
      var isTotal = o.totals && o.totals.indexOf(i) >= 0;
      var from = isTotal ? 0 : acc, to = isTotal ? v : acc + v;
      if (!isTotal) acc += v; else acc = v;
      return { from: from, to: to, v: v, total: isTotal };
    });
    var all = steps.reduce(function (a, s2) { return a.concat([s2.from, s2.to]); }, [0]);
    var ticks = niceTicks(Math.min.apply(null, all), Math.max.apply(null, all), 4);
    var lo = ticks[0], hi = ticks[ticks.length - 1];
    var P = plot(W, H, u);
    var y = function (v) { return P.t + P.h - (v - lo) / (hi - lo) * P.h; };
    var band = P.w / n, bw = Math.min(30 * u, band * .56), s = [];
    ticks.forEach(function (t2) {
      s.push(gridLine(P.l, y(t2), P.l + P.w, y(t2), T, u));
      s.push(tickText(P.l - 12 * u, y(t2) + 5 * u, fmt(t2), T, u, 'end', true));
    });
    steps.forEach(function (st, i) {
      var cx = P.l + band * (i + .5), y0 = y(st.from), y1 = y(st.to);
      /* diverging — 오르면 good, 내리면 bad, 합계는 중립 accent */
      var col = st.total ? T.accent : (st.v >= 0 ? T.good : T.bad);
      s.push('<rect class="gg-cBar" data-i="' + i + '" x="' + r2(cx - bw / 2) + '" y="' + r2(Math.min(y0, y1)) +
        '" width="' + r2(bw) + '" height="' + r2(Math.max(Math.abs(y1 - y0), 2 * u)) + '" rx="' + r2(4 * u) +
        '" fill="' + col + '" style="transform-origin:' + r2(cx) + 'px ' + r2(y0) + 'px"/>');
      if (i < n - 1) {
        s.push('<path class="gg-cLink" data-i="' + i + '" d="M' + r2(cx + bw / 2) + ' ' + r2(y1) + ' L' +
          r2(cx + band - bw / 2) + ' ' + r2(y1) + '" stroke="' + T.line + '" stroke-width="' + r2(1.4 * u) +
          '" fill="none" stroke-dasharray="' + r2(4 * u) + ' ' + r2(4 * u) + '"/>');
      }
      s.push(valText(cx, Math.min(y0, y1) - 10 * u, (st.total ? '' : st.v > 0 ? '+' : '') + fmt(st.v, o.dec), T, u));
      if (cats[i]) s.push(tickText(cx, P.t + P.h + 26 * u, cats[i], T, u));
    });
    s.push(axisLine(P.l, y(Math.max(lo, 0)), P.l + P.w, y(Math.max(lo, 0)), T, u));
    return { svg: s.join(''), anim: [{ k: 'grow', sel: '.gg-cBar', st: .1 },
                                     { k: 'draw', sel: '.gg-cLink', st: .1, lag: .12, dur: .3 },
                                     { k: 'fade', sel: '.gg-cVal', st: .1, lag: .2 }] };
  }
};

CHARTS.slope = {
  label: '슬로프 — 두 시점 사이 순위·값의 이동',
  use: '전후 비교. 선의 기울기가 곧 변화량이라 "누가 올랐나"가 한눈에 보인다.',
  build: function (D, o, T, W, H, u) {
    var items = D.items.length ? D.items : D.cats.map(function (c, i) { return { label: c, value: 0 }; });
    var A = D.series[0] ? D.series[0].values : [], B = D.series[1] ? D.series[1].values : [];
    if (!B.length) { B = items.map(function (x) { return num(x.to, 0); }); A = items.map(function (x) { return num(x.from, 0); }); }
    var all = A.concat(B), lo = Math.min.apply(null, all), hi = Math.max.apply(null, all);
    if (lo === hi) hi = lo + 1;
    var P = plot(W, H, u, { l: W * .26, r: W * .26, t: 40 * u, b: 40 * u });
    var y = function (v) { return P.t + P.h - (v - lo) / (hi - lo) * P.h; };
    var x0 = P.l, x1 = P.l + P.w, s = [];
    s.push(axisLine(x0, P.t - 14 * u, x0, P.t + P.h + 14 * u, T, u));
    s.push(axisLine(x1, P.t - 14 * u, x1, P.t + P.h + 14 * u, T, u));
    s.push(tickText(x0, P.t - 26 * u, o.fromLabel || (D.series[0] && D.series[0].name) || '이전', T, u));
    s.push(tickText(x1, P.t - 26 * u, o.toLabel || (D.series[1] && D.series[1].name) || '이후', T, u));
    /* 라벨 y 를 미리 계산해 겹침을 푼다 */
    var gapL = 22 * u;
    var lyA = dodge(A.map(function (a) { return y(a); }), gapL);
    var lyB = dodge(B.map(function (b) { return y(num(b, 0)); }), gapL);
    A.forEach(function (a, i) {
      var b = num(B[i], 0), up = b >= a;
      /* 강조가 없으면 오름/내림을 색으로 — 시리즈 identity 가 아니라 polarity 다 */
      var col = o.emphasis != null ? (i === o.emphasis ? T.accent : T.dim) : (up ? T.good : T.bad);
      s.push('<path class="gg-cLine" data-i="' + i + '" d="M' + r2(x0) + ' ' + r2(y(a)) + ' L' + r2(x1) + ' ' + r2(y(b)) +
        '" stroke="' + col + '" stroke-width="' + r2(2 * u) + '" fill="none" stroke-linecap="round"/>');
      s.push('<circle class="gg-cDot" data-i="' + i + '" cx="' + r2(x0) + '" cy="' + r2(y(a)) + '" r="' + r2(5 * u) +
        '" fill="' + col + '" stroke="' + T.bg + '" stroke-width="' + r2(2 * u) + '"/>');
      s.push('<circle class="gg-cDot" data-i="' + i + '" cx="' + r2(x1) + '" cy="' + r2(y(b)) + '" r="' + r2(5 * u) +
        '" fill="' + col + '" stroke="' + T.bg + '" stroke-width="' + r2(2 * u) + '"/>');
      var nm = (items[i] && items[i].label) || D.cats[i] || '';
      s.push(valText(x0 - 16 * u, lyA[i] + 6 * u, nm + '  ' + fmt(a, o.dec), T, u, 'end', 15));
      s.push(valText(x1 + 16 * u, lyB[i] + 6 * u, fmt(b, o.dec), T, u, 'start', 15));
    });
    return { svg: s.join(''), anim: [{ k: 'draw', sel: '.gg-cLine', st: .07, dur: .8 },
                                     { k: 'pop', sel: '.gg-cDot', st: .04, lag: .3 },
                                     { k: 'fade', sel: '.gg-cVal', st: .05, lag: .5 }] };
  }
};

CHARTS.dumbbell = {
  label: '덤벨 — 항목별 전후 차이',
  use: '항목마다 두 시점을 점 두 개로. 슬로프보다 항목이 많을 때 읽기 쉽다.',
  build: function (D, o, T, W, H, u) {
    var items = D.items.length ? D.items : [];
    var A = D.series[0] ? D.series[0].values : items.map(function (x) { return num(x.from, 0); });
    var B = D.series[1] ? D.series[1].values : items.map(function (x) { return num(x.to, 0); });
    var cats = D.cats;
    var all = A.concat(B), ticks = niceTicks(Math.min.apply(null, all), Math.max.apply(null, all), 4);
    var lo = ticks[0], hi = ticks[ticks.length - 1];
    var labelW = Math.min(W * .26, 20 * u + Math.max.apply(null, cats.map(function (c) { return c.length; })) * 9 * u);
    var P = plot(W, H, u, { l: labelW, r: 50 * u, t: 26 * u, b: 40 * u });
    var x = function (v) { return P.l + (v - lo) / (hi - lo) * P.w; };
    var band = P.h / A.length, s = [];
    ticks.forEach(function (t2) {
      s.push(gridLine(x(t2), P.t, x(t2), P.t + P.h, T, u));
      s.push(tickText(x(t2), P.t + P.h + 26 * u, fmt(t2), T, u, 'middle', true));
    });
    A.forEach(function (a, i) {
      var b = num(B[i], 0), cy = P.t + band * (i + .5);
      s.push('<path class="gg-cLink" data-i="' + i + '" d="M' + r2(x(a)) + ' ' + r2(cy) + ' L' + r2(x(b)) + ' ' + r2(cy) +
        '" stroke="' + T.dim + '" stroke-width="' + r2(3 * u) + '" opacity=".5" stroke-linecap="round"/>');
      s.push('<circle class="gg-cDot" data-i="' + (i * 2) + '" cx="' + r2(x(a)) + '" cy="' + r2(cy) + '" r="' + r2(6 * u) +
        '" fill="' + T.dim + '" stroke="' + T.bg + '" stroke-width="' + r2(2 * u) + '"/>');
      s.push('<circle class="gg-cDot" data-i="' + (i * 2 + 1) + '" cx="' + r2(x(b)) + '" cy="' + r2(cy) + '" r="' + r2(7 * u) +
        '" fill="' + (b >= a ? T.good : T.bad) + '" stroke="' + T.bg + '" stroke-width="' + r2(2 * u) + '"/>');
      s.push(tickText(P.l - 14 * u, cy + 6 * u, cats[i] || '', T, u, 'end'));
    });
    return { svg: s.join(''), anim: [{ k: 'growX', sel: '.gg-cLink', st: .06, dur: .6 },
                                     { k: 'pop', sel: '.gg-cDot', st: .04, lag: .2 }] };
  }
};

CHARTS.bullet = {
  label: '불릿 — 실적과 목표',
  use: '목표 대비 달성. 막대 하나 + 목표선. 여러 지표를 세로로 쌓아 한눈에 본다.',
  build: function (D, o, T, W, H, u) {
    var items = D.items.length ? D.items : D.cats.map(function (c, i) {
      return { label: c, value: num(D.series[0].values[i], 0), target: null };
    });
    /* 불릿은 행마다 자기 스케일을 쓴다 — 가입 18,400 과 정착률 34% 를 한 축에 놓으면 34 는 0 이 된다.
       (한 차트 안의 두 y축 금지와는 다른 얘기다. 각 행이 독립된 "목표 대비" 게이지다.) */
    var shared = o.sharedScale === true || items.every(function (x) { return x.target == null; });
    var gmax = Math.max.apply(null, items.map(function (x) { return Math.max(x.value, num(x.target, 0)); })) || 1;
    function hiOf(it) {
      if (o.max) return o.max;
      if (shared) return gmax * 1.12;
      return Math.max(it.value, num(it.target, 0)) * 1.18 || 1;
    }
    var labelW = Math.min(W * .3, 20 * u + Math.max.apply(null, items.map(function (x) { return x.label.length; })) * 9 * u);
    var P = plot(W, H, u, { l: labelW, r: 74 * u, t: 18 * u, b: 18 * u });
    var band = P.h / items.length, bh = Math.min(22 * u, band * .38), s = [];
    items.forEach(function (it, i) {
      var hi = hiOf(it), cy = P.t + band * (i + .5), w = it.value / hi * P.w;
      s.push('<rect x="' + r2(P.l) + '" y="' + r2(cy - bh * .9) + '" width="' + r2(P.w) + '" height="' + r2(bh * 1.8) +
        '" rx="' + r2(4 * u) + '" fill="' + T.line + '" opacity=".45"/>');
      var ok = it.target == null || it.value >= it.target;
      if (it.target != null) s.push(tickText(P.l + it.target / hi * P.w, cy - bh * 1.5, '목표 ' + fmt(it.target, o.dec), T, u, 'middle', true));
      s.push('<rect class="gg-cBar" data-i="' + i + '" x="' + r2(P.l) + '" y="' + r2(cy - bh / 2) + '" width="' + r2(w) +
        '" height="' + r2(bh) + '" rx="' + r2(4 * u) + '" fill="' + (ok ? T.accent : T.warn) +
        '" style="transform-origin:' + r2(P.l) + 'px ' + r2(cy) + 'px"/>');
      if (it.target != null) {
        var tx = P.l + it.target / hi * P.w;
        s.push('<path class="gg-cTarget" data-i="' + i + '" d="M' + r2(tx) + ' ' + r2(cy - bh * 1.05) + ' L' + r2(tx) + ' ' +
          r2(cy + bh * 1.05) + '" stroke="' + T.ink + '" stroke-width="' + r2(3 * u) + '" stroke-linecap="round"/>');
      }
      s.push(tickText(P.l - 14 * u, cy + 6 * u, it.label, T, u, 'end'));
      s.push(valText(P.l + P.w + 14 * u, cy + 6 * u, fmt(it.value, o.dec) + (o.unit || ''), T, u, 'start', 15));
    });
    return { svg: s.join(''), anim: [{ k: 'growX', sel: '.gg-cBar', st: .08 },
                                     { k: 'pop', sel: '.gg-cTarget', st: .08, lag: .35 },
                                     { k: 'fade', sel: '.gg-cVal', st: .06, lag: .4 }] };
  }
};

CHARTS.heatmap = {
  label: '히트맵 — 격자 위의 밀도',
  use: '요일×시간, 팀×지표 같은 이중 분류. 색은 sequential 한 색조, 진할수록 크다.',
  build: function (D, o, T, W, H, u, _ip, raw) {
    var rows = arr(raw && raw.rows).map(String), cols = D.cats;
    var grid = arr(raw && raw.grid);
    if (!grid.length) grid = D.series.map(function (se) { return se.values; });
    if (!rows.length) rows = D.series.map(function (se) { return se.name; });
    var flat = grid.reduce(function (a, r) { return a.concat(r); }, []);
    var hi = Math.max.apply(null, flat) || 1, lo = Math.min.apply(null, flat.concat([0]));
    var labelW = Math.min(W * .22, 20 * u + Math.max.apply(null, rows.map(function (c) { return c.length; })) * 9 * u);
    var P = plot(W, H, u, { l: labelW, r: 20 * u, t: 34 * u, b: 20 * u });
    var cw = P.w / cols.length, ch = P.h / rows.length, gap = 2 * u, s = [];
    var far = T.bg;
    grid.forEach(function (row, ri) {
      row.forEach(function (v, ci) {
        var f = (v - lo) / (hi - lo || 1);
        s.push('<rect class="gg-cCell" data-i="' + (ri * cols.length + ci) + '" x="' + r2(P.l + ci * cw + gap / 2) +
          '" y="' + r2(P.t + ri * ch + gap / 2) + '" width="' + r2(cw - gap) + '" height="' + r2(ch - gap) +
          '" rx="' + r2(4 * u) + '" fill="' + mix(T.accent, far, (1 - f) * .88) + '"/>');
        if (o.values !== false && grid.length * cols.length <= 40) {
          s.push('<text class="gg-cVal" x="' + r2(P.l + ci * cw + cw / 2) + '" y="' + r2(P.t + ri * ch + ch / 2 + 6 * u) +
            '" text-anchor="middle" font-size="' + r2(15 * u) + '" font-weight="700" fill="' +
            (f > .55 ? T.bg : T.ink) + '">' + esc(fmt(v, o.dec)) + '</text>');
        }
      });
      s.push(tickText(P.l - 12 * u, P.t + ri * ch + ch / 2 + 5 * u, rows[ri] || '', T, u, 'end'));
    });
    cols.forEach(function (c, ci) { s.push(tickText(P.l + ci * cw + cw / 2, P.t - 12 * u, c, T, u, 'middle', true)); });
    return { svg: s.join(''), anim: [{ k: 'pop', sel: '.gg-cCell', st: .012, dur: .4,
                                       n: grid.length * cols.length }] };
  }
};

CHARTS.sparkline = {
  label: '스파크라인 — 카드 안에 들어가는 미니 추이',
  use: '지표 옆에 붙는 작은 선. 축도 라벨도 없다 — 모양만 읽힌다.',
  build: function (D, o, T, W, H, u) {
    var v = D.series[0].values, lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
    if (lo === hi) hi = lo + 1;
    var pad = 4 * u;
    var x = function (i) { return pad + i * (W - pad * 2) / Math.max(1, v.length - 1); };
    var y = function (val) { return H - pad - (val - lo) / (hi - lo) * (H - pad * 2); };
    var d = v.map(function (val, i) { return (i ? 'L' : 'M') + r2(x(i)) + ' ' + r2(y(val)); }).join(' ');
    var up = v[v.length - 1] >= v[0], col = o.tone === 'auto' ? (up ? T.good : T.bad) : T.accent;
    return { svg: '<path class="gg-cArea" d="' + d + ' L' + r2(x(v.length - 1)) + ' ' + r2(H) + ' L' + r2(x(0)) + ' ' + r2(H) +
        'Z" fill="' + col + '" opacity=".12"/>' +
        '<path class="gg-cLine" d="' + d + '" fill="none" stroke="' + col + '" stroke-width="' + r2(2 * u) +
        '" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle class="gg-cDot" cx="' + r2(x(v.length - 1)) + '" cy="' + r2(y(v[v.length - 1])) + '" r="' + r2(3.5 * u) +
        '" fill="' + col + '"/>',
      anim: [{ k: 'draw', sel: '.gg-cLine', dur: .8 }, { k: 'fade', sel: '.gg-cArea', lag: .3 },
             { k: 'pop', sel: '.gg-cDot', lag: .7 }] };
  }
};

module.exports = { CHARTS: CHARTS, normData: normData, colorsFor: colorsFor, catColors: catColors,
                   seqRamp: seqRamp, isLight: isLight, fmt: fmt, niceTicks: niceTicks, extent: extent,
                   axisLine: axisLine, gridLine: gridLine, tickText: tickText, valText: valText, mix: mix,
                   plot: plot };
