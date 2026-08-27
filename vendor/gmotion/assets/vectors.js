/*!
 * vectors — 디자인 요소 벡터 세트. 네 종류.
 *
 *   DECOR  배경·분위기 레이어 15종   씬 배경에 깔린다. 테마 색 자동, 느린 무한 드리프트
 *   FRAME  디바이스·프레임 8종        안에 콘텐츠를 넣는다
 *   MARK   데코·강조 요소 12종        글자·수치에 붙어 시선을 몬다. 드로우온 모션
 *   ART    추상 일러스트 18종         도형 조합으로 개념을 표현. 픽토그램보다 크고 구성적
 *
 * 전부 코드로 그린다 — 테마 색을 받아 그 자리에서 SVG 를 만들고, 스펙이 실제로 쓴 것만
 * 산출물에 실린다. 좌표는 호출자가 준 박스 안에서 스스로 계산한다.
 */
'use strict';

function r2(n) { return Math.round(n * 100) / 100; }
function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }
/** 결정적 난수 — 같은 스펙이 같은 그림을 내야 한다. Math.random 을 쓰지 않는 이유. */
function rng(seed) {
  var s = seed || 1;
  return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/* ================================================================== *
 * DECOR — 배경·분위기 레이어
 * build(W, H, T, lv) -> SVG 문자열. lv 0(약) 1(보통) 2(강)
 * 클래스 gg-dr* 에 CSS 애니메이션이 붙는다(runtime 아닌 CSS — 마스터 타임라인과 무관).
 * ================================================================== */
var DECOR = {};

DECOR.blob = {
  label: '블롭 — 부드러운 유기 덩어리가 느리게 떠다닌다. 감성·브랜드·캠페인',
  build: function (W, H, T, lv) {
    var o = [.1, .17, .27][lv], R = rng(7);
    var n = 3, s = ['<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">',
      '<defs><filter id="ggBlur" x="-30%" y="-30%" width="160%" height="160%">' +
      '<feGaussianBlur stdDeviation="' + Math.round(Math.min(W, H) * .06) + '"/></filter></defs>'];
    var cols = [T.accent, T.accent2, T.accent];
    for (var i = 0; i < n; i++) {
      var cx = W * (.2 + R() * .6), cy = H * (.18 + R() * .64);
      var rr = Math.min(W, H) * (.22 + R() * .2);
      s.push('<ellipse class="gg-drFloat" style="animation-delay:' + r2(-i * 5.5) + 's" ' +
        'cx="' + r2(cx) + '" cy="' + r2(cy) + '" rx="' + r2(rr) + '" ry="' + r2(rr * (.72 + R() * .5)) + '" ' +
        'fill="' + cols[i] + '" opacity="' + r2(o) + '" filter="url(#ggBlur)"/>');
    }
    return s.join('') + '</svg>';
  }
};

DECOR.wave = {
  label: '웨이브 — 화면 아래를 채우는 물결 층. 하단이 비는 씬에',
  build: function (W, H, T, lv) {
    var o = [.14, .22, .34][lv], s = ['<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">'];
    for (var i = 0; i < 3; i++) {
      var y = H * (.68 + i * .1), a = H * (.05 - i * .008);
      var d = 'M0 ' + r2(y);
      for (var x = 0; x <= 4; x++) {
        d += ' C' + r2(W * (x + .25) / 4) + ' ' + r2(y - a) + ' ' + r2(W * (x + .75) / 4) + ' ' + r2(y + a) +
             ' ' + r2(W * (x + 1) / 4) + ' ' + r2(y);
      }
      d += ' L' + W + ' ' + H + ' L0 ' + H + 'Z';
      s.push('<path class="gg-drSlide" style="animation-delay:' + r2(-i * 4) + 's;animation-duration:' + (26 + i * 7) + 's" ' +
        'd="' + d + '" fill="' + (i % 2 ? T.accent2 : T.accent) + '" opacity="' + r2(o * (1 - i * .22)) + '"/>');
    }
    return s.join('') + '</svg>';
  }
};

DECOR.grid = {
  label: '그리드 — 격자선. 기술·구조·데이터 톤의 기본 배경',
  build: function (W, H, T, lv) {
    var o = [.08, .15, .26][lv], step = Math.round(Math.min(W, H) / 12);
    return '<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
      '<defs><pattern id="ggGrid" width="' + step + '" height="' + step + '" patternUnits="userSpaceOnUse">' +
      '<path d="M' + step + ' 0 L0 0 0 ' + step + '" fill="none" stroke="' + T.accent +
      '" stroke-width="1.2" opacity="' + r2(o) + '"/></pattern>' +
      '<radialGradient id="ggGridFade"><stop offset="45%" stop-color="#fff" stop-opacity="1"/>' +
      '<stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<mask id="ggGridMask"><rect width="' + W + '" height="' + H + '" fill="url(#ggGridFade)"/></mask></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#ggGrid)" mask="url(#ggGridMask)"/></svg>';
  }
};

DECOR.dots = {
  label: '도트 — 점 격자. 그리드보다 가볍다. 리포트·페이퍼 톤',
  build: function (W, H, T, lv) {
    var o = [.12, .2, .32][lv], step = Math.round(Math.min(W, H) / 22);
    return '<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
      '<defs><pattern id="ggDots" width="' + step + '" height="' + step + '" patternUnits="userSpaceOnUse">' +
      '<circle cx="' + step / 2 + '" cy="' + step / 2 + '" r="1.9" fill="' + T.accent + '" opacity="' + r2(o) + '"/>' +
      '</pattern><radialGradient id="ggDotFade"><stop offset="40%" stop-color="#fff"/>' +
      '<stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<mask id="ggDotMask"><rect width="' + W + '" height="' + H + '" fill="url(#ggDotFade)"/></mask></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#ggDots)" mask="url(#ggDotMask)"/></svg>';
  }
};

DECOR.rays = {
  label: '광선 — 중심에서 발산하는 빛. 선언·공개·클라이맥스',
  build: function (W, H, T, lv) {
    var o = [.07, .13, .21][lv], n = 16, cx = W / 2, cy = H * .42, L = Math.max(W, H);
    var s = ['<svg class="gg-decor gg-drSpin" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true" ' +
      'style="transform-origin:' + r2(cx) + 'px ' + r2(cy) + 'px">'];
    for (var i = 0; i < n; i++) {
      var a = i * 360 / n * Math.PI / 180, w = (i % 2 ? .012 : .026);
      var x1 = cx + Math.cos(a - w) * L, y1 = cy + Math.sin(a - w) * L;
      var x2 = cx + Math.cos(a + w) * L, y2 = cy + Math.sin(a + w) * L;
      s.push('<path d="M' + r2(cx) + ' ' + r2(cy) + ' L' + r2(x1) + ' ' + r2(y1) + ' L' + r2(x2) + ' ' + r2(y2) +
        'Z" fill="' + T.accent + '" opacity="' + r2(o * (i % 2 ? .6 : 1)) + '"/>');
    }
    return s.join('') + '</svg>';
  }
};

DECOR.rings = {
  label: '동심원 — 중심에서 퍼지는 원. 파급·영향·전파',
  build: function (W, H, T, lv) {
    var o = [.12, .2, .32][lv], cx = W / 2, cy = H / 2, base = Math.min(W, H) * .16;
    var s = ['<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">'];
    for (var i = 0; i < 6; i++) {
      s.push('<circle class="gg-drPulse" style="animation-delay:' + r2(-i * 1.4) + 's" cx="' + cx + '" cy="' + cy +
        '" r="' + r2(base * (1 + i * .58)) + '" fill="none" stroke="' + T.accent +
        '" stroke-width="' + (i < 2 ? 2.2 : 1.4) + '" opacity="' + r2(o * (1 - i * .13)) + '"/>');
    }
    return s.join('') + '</svg>';
  }
};

DECOR.mesh = {
  label: '메쉬 — 색이 번지는 그라디언트 뭉치. 가장 부드럽다. 감성·포스터',
  build: function (W, H, T, lv) {
    var o = [.18, .28, .42][lv], R = rng(19);
    var s = ['<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true"><defs>'];
    var cols = [T.accent, T.accent2, T.good, T.warn];
    for (var i = 0; i < 4; i++) {
      s.push('<radialGradient id="ggMesh' + i + '"><stop offset="0%" stop-color="' + cols[i] +
        '" stop-opacity="' + r2(o) + '"/><stop offset="100%" stop-color="' + cols[i] + '" stop-opacity="0"/></radialGradient>');
    }
    s.push('</defs>');
    for (var j = 0; j < 4; j++) {
      var rr = Math.min(W, H) * (.34 + R() * .26);
      s.push('<circle class="gg-drFloat" style="animation-delay:' + r2(-j * 6.5) + 's;animation-duration:' + (30 + j * 6) + 's" ' +
        'cx="' + r2(W * (.15 + R() * .7)) + '" cy="' + r2(H * (.15 + R() * .7)) + '" r="' + r2(rr) +
        '" fill="url(#ggMesh' + j + ')"/>');
    }
    return s.join('') + '</svg>';
  }
};

DECOR.topo = {
  label: '등고선 — 지도 같은 층. 탐색·영역·복잡도',
  build: function (W, H, T, lv) {
    var o = [.09, .16, .26][lv], R = rng(31);
    var s = ['<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">'];
    for (var i = 0; i < 7; i++) {
      var cx = W * (.3 + R() * .4), cy = H * (.3 + R() * .4);
      var rx = Math.min(W, H) * (.12 + i * .075), ry = rx * (.62 + R() * .3);
      var d = '', k = 24;
      for (var t = 0; t <= k; t++) {
        var a = t / k * Math.PI * 2;
        var wob = 1 + Math.sin(a * 3 + i) * .08 + Math.cos(a * 5 - i) * .05;
        var x = cx + Math.cos(a) * rx * wob, y = cy + Math.sin(a) * ry * wob;
        d += (t ? ' L' : 'M') + r2(x) + ' ' + r2(y);
      }
      s.push('<path d="' + d + 'Z" fill="none" stroke="' + T.accent + '" stroke-width="1.3" opacity="' + r2(o) + '"/>');
    }
    return s.join('') + '</svg>';
  }
};

DECOR.beams = {
  label: '빛줄기 — 사선으로 흐르는 띠. 속도·전환·하이에너지',
  build: function (W, H, T, lv) {
    var o = [.08, .14, .23][lv], n = 6, R = rng(53);
    var s = ['<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">'];
    for (var i = 0; i < n; i++) {
      var w = Math.min(W, H) * (.03 + R() * .07), x = W * (i / n) - W * .1 + R() * W * .1;
      s.push('<path class="gg-drSlide" style="animation-delay:' + r2(-i * 3.2) + 's;animation-duration:' + (18 + i * 4) + 's" ' +
        'd="M' + r2(x) + ' ' + (-H * .1) + ' L' + r2(x + w) + ' ' + (-H * .1) + ' L' + r2(x + w + W * .3) + ' ' + (H * 1.1) +
        ' L' + r2(x + W * .3) + ' ' + (H * 1.1) + 'Z" fill="' + (i % 2 ? T.accent2 : T.accent) + '" opacity="' + r2(o) + '"/>');
    }
    return s.join('') + '</svg>';
  }
};

DECOR.constellation = {
  label: '별자리 — 점과 잇는 선. 네트워크·연결·데이터',
  build: function (W, H, T, lv) {
    var o = [.16, .26, .4][lv], R = rng(71), n = 22, pts = [];
    for (var i = 0; i < n; i++) pts.push({ x: W * R(), y: H * R(), r: 1.6 + R() * 2.4 });
    var s = ['<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">'];
    var lim = Math.min(W, H) * .24;
    for (var a = 0; a < n; a++) for (var b = a + 1; b < n; b++) {
      var dx = pts[a].x - pts[b].x, dy = pts[a].y - pts[b].y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < lim) s.push('<line x1="' + r2(pts[a].x) + '" y1="' + r2(pts[a].y) + '" x2="' + r2(pts[b].x) +
        '" y2="' + r2(pts[b].y) + '" stroke="' + T.accent + '" stroke-width="1" opacity="' + r2(o * (1 - d / lim) * .6) + '"/>');
    }
    pts.forEach(function (p, i) {
      s.push('<circle class="gg-drTwinkle" style="animation-delay:' + r2(-i * .7) + 's" cx="' + r2(p.x) + '" cy="' + r2(p.y) +
        '" r="' + r2(p.r) + '" fill="' + T.accent + '" opacity="' + r2(o) + '"/>');
    });
    return s.join('') + '</svg>';
  }
};

DECOR.arcs = {
  label: '호 — 큰 원호 몇 개. 절제된 기하 장식. 모노·에디토리얼',
  build: function (W, H, T, lv) {
    var o = [.1, .17, .27][lv], s = ['<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">'];
    var conf = [[W * 1.02, H * .1, Math.min(W, H) * .55], [-W * .04, H * .92, Math.min(W, H) * .42],
                [W * .5, -H * .18, Math.min(W, H) * .48]];
    conf.forEach(function (c, i) {
      s.push('<circle class="gg-drDrift" style="animation-delay:' + r2(-i * 7) + 's" cx="' + r2(c[0]) + '" cy="' + r2(c[1]) +
        '" r="' + r2(c[2]) + '" fill="none" stroke="' + (i === 1 ? T.accent2 : T.accent) +
        '" stroke-width="' + (i ? 1.6 : 2.6) + '" opacity="' + r2(o) + '"/>');
    });
    return s.join('') + '</svg>';
  }
};

DECOR.hexes = {
  label: '육각 — 벌집 패턴. 기술·구성요소·모듈',
  build: function (W, H, T, lv) {
    var o = [.07, .13, .21][lv], r = Math.min(W, H) / 16;
    var hw = r * Math.sqrt(3), hh = r * 1.5;
    var d = 'M' + r2(hw / 2) + ' 0 L' + r2(hw) + ' ' + r2(r * .5) + ' L' + r2(hw) + ' ' + r2(r * 1.5) +
            ' L' + r2(hw / 2) + ' ' + r2(r * 2) + ' L0 ' + r2(r * 1.5) + ' L0 ' + r2(r * .5) + 'Z';
    return '<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
      '<defs><pattern id="ggHex" width="' + r2(hw) + '" height="' + r2(hh * 2) + '" patternUnits="userSpaceOnUse">' +
      '<path d="' + d + '" fill="none" stroke="' + T.accent + '" stroke-width="1.1" opacity="' + r2(o) + '"/>' +
      '<g transform="translate(' + r2(hw / 2) + ',' + r2(hh) + ')"><path d="' + d + '" fill="none" stroke="' + T.accent +
      '" stroke-width="1.1" opacity="' + r2(o) + '"/></g></pattern>' +
      '<radialGradient id="ggHexFade"><stop offset="35%" stop-color="#fff"/>' +
      '<stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<mask id="ggHexMask"><rect width="' + W + '" height="' + H + '" fill="url(#ggHexFade)"/></mask></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#ggHex)" mask="url(#ggHexMask)"/></svg>';
  }
};

DECOR.stripes = {
  label: '스트라이프 — 사선 줄무늬. 리듬·반복·포스터',
  build: function (W, H, T, lv) {
    var o = [.06, .11, .18][lv], step = Math.round(Math.min(W, H) / 20);
    return '<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
      '<defs><pattern id="ggStripe" width="' + step + '" height="' + step + '" patternUnits="userSpaceOnUse" ' +
      'patternTransform="rotate(38)"><line x1="0" y1="0" x2="0" y2="' + step + '" stroke="' + T.accent +
      '" stroke-width="' + r2(step * .34) + '" opacity="' + r2(o) + '"/></pattern></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="url(#ggStripe)"/></svg>';
  }
};

DECOR.horizon = {
  label: '지평선 — 원근 격자와 지평선. 공간·여정·전망',
  build: function (W, H, T, lv) {
    var o = [.11, .19, .3][lv], hy = H * .62, vp = W / 2;
    var s = ['<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">'];
    s.push('<line x1="0" y1="' + r2(hy) + '" x2="' + W + '" y2="' + r2(hy) + '" stroke="' + T.accent +
      '" stroke-width="1.8" opacity="' + r2(o * 1.3) + '"/>');
    for (var i = -8; i <= 8; i++) {
      s.push('<line x1="' + r2(vp + i * W * .07) + '" y1="' + r2(hy) + '" x2="' + r2(vp + i * W * .42) + '" y2="' + H +
        '" stroke="' + T.accent + '" stroke-width="1" opacity="' + r2(o * .7) + '"/>');
    }
    for (var j = 1; j <= 7; j++) {
      var y = hy + (H - hy) * Math.pow(j / 7, 2.1);
      s.push('<line x1="0" y1="' + r2(y) + '" x2="' + W + '" y2="' + r2(y) + '" stroke="' + T.accent +
        '" stroke-width="1" opacity="' + r2(o * .6) + '"/>');
    }
    return s.join('') + '</svg>';
  }
};
DECOR.creases = {
  label: '접힘선 — 종이를 접었다 편 듯한 십자 음영 선. 아날로그·페이퍼·크래프트',
  build: function (W, H, T, lv) {
    var o = [.14, .24, .38][lv];
    var cx = W / 2, cy = H / 2;
    var s = ['<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">'];
    s.push('<line x1="0" y1="' + (cy - 1) + '" x2="' + W + '" y2="' + (cy - 1) + '" stroke="' + T.ink + '" stroke-width="1.5" opacity="' + r2(o * .7) + '"/>');
    s.push('<line x1="0" y1="' + cy + '" x2="' + W + '" y2="' + cy + '" stroke="' + T.bg + '" stroke-width="1.5" opacity="' + r2(o * .9) + '"/>');
    s.push('<line x1="0" y1="' + (cy + 1) + '" x2="' + W + '" y2="' + (cy + 1) + '" stroke="' + T.accent + '" stroke-width="1.2" opacity="' + r2(o * .4) + '"/>');
    s.push('<line x1="' + (cx - 1) + '" y1="0" x2="' + (cx - 1) + '" y2="' + H + '" stroke="' + T.ink + '" stroke-width="1.5" opacity="' + r2(o * .7) + '"/>');
    s.push('<line x1="' + cx + '" y1="0" x2="' + cx + '" y2="' + H + '" stroke="' + T.bg + '" stroke-width="1.5" opacity="' + r2(o * .9) + '"/>');
    s.push('<line x1="' + (cx + 1) + '" y1="0" x2="' + (cx + 1) + '" y2="' + H + '" stroke="' + T.accent + '" stroke-width="1.2" opacity="' + r2(o * .4) + '"/>');
    s.push('<line x1="0" y1="0" x2="' + r2(W * .22) + '" y2="' + r2(H * .18) + '" stroke="' + T.ink + '" stroke-width="1" opacity="' + r2(o * .35) + '"/>');
    s.push('<line x1="' + W + '" y1="' + H + '" x2="' + r2(W * .78) + '" y2="' + r2(H * .82) + '" stroke="' + T.ink + '" stroke-width="1" opacity="' + r2(o * .35) + '"/>');
    s.push('</svg>');
    return s.join('');
  }
};
DECOR.gridPaper = {
  label: '모눈종이 — 노트 방안지 격자. 기획·아이디어·설계',
  build: function (W, H, T, lv) {
    var o = [.08, .15, .25][lv];
    var sm = Math.round(Math.min(W, H) / 28);
    var lg = sm * 5;
    return '<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
      '<defs>' +
      '<pattern id="ggGridSmall" width="' + sm + '" height="' + sm + '" patternUnits="userSpaceOnUse">' +
      '<path d="M' + sm + ' 0 L0 0 0 ' + sm + '" fill="none" stroke="' + T.accent + '" stroke-width="0.8" opacity="' + r2(o * .5) + '"/>' +
      '</pattern>' +
      '<pattern id="ggGridLarge" width="' + lg + '" height="' + lg + '" patternUnits="userSpaceOnUse">' +
      '<rect width="' + lg + '" height="' + lg + '" fill="url(#ggGridSmall)"/>' +
      '<path d="M' + lg + ' 0 L0 0 0 ' + lg + '" fill="none" stroke="' + T.accent + '" stroke-width="1.6" opacity="' + r2(o) + '"/>' +
      '</pattern>' +
      '</defs>' +
      '<rect width="100%" height="100%" fill="url(#ggGridLarge)"/>' +
      '</svg>';
  }
};
DECOR.ruled = {
  label: '줄노트 — 노트 괘선과 마진 라인. 메모·에디토리얼·기록',
  build: function (W, H, T, lv) {
    var o = [.1, .18, .28][lv];
    var step = Math.round(H / 20);
    var marginX = Math.round(W * .12);
    var s = ['<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">'];
    for (var y = step * 2; y < H - step; y += step) {
      s.push('<line x1="0" y1="' + y + '" x2="' + W + '" y2="' + y + '" stroke="' + T.accent + '" stroke-width="1.2" opacity="' + r2(o * .7) + '"/>');
    }
    s.push('<line x1="' + marginX + '" y1="0" x2="' + marginX + '" y2="' + H + '" stroke="' + (T.accent2 || T.warn || T.accent) + '" stroke-width="2" opacity="' + r2(o * 1.3) + '"/>');
    s.push('</svg>');
    return s.join('');
  }
};
DECOR.sheets = {
  label: '부유하는 종이 — 공중에 흩날리는 종이 조각 레이어. 공예·창작·아날로그',
  build: function (W, H, T, lv) {
    var o = [.12, .2, .32][lv], R = rng(43), n = 7;
    var s = ['<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">'];
    for (var i = 0; i < n; i++) {
      var cx = W * (.1 + R() * .8), cy = H * (.1 + R() * .8);
      var pw = Math.min(W, H) * (.08 + R() * .06);
      var ph = pw * (1.2 + R() * .3);
      var ang = -25 + R() * 50;
      var col = (i % 2 === 0 ? T.panel : (i % 3 === 0 ? T.accent2 : T.accent));
      s.push('<g class="gg-drDrift" style="animation-delay:' + r2(-i * 3.7) + 's;transform-origin:' + r2(cx) + 'px ' + r2(cy) + 'px">' +
        '<rect x="' + r2(cx - pw / 2) + '" y="' + r2(cy - ph / 2) + '" width="' + r2(pw) + '" height="' + r2(ph) + '" rx="4" ' +
        'fill="' + col + '" stroke="' + T.line + '" stroke-width="1.5" opacity="' + r2(o) + '" ' +
        'transform="rotate(' + r2(ang) + ' ' + r2(cx) + ' ' + r2(cy) + ')"/>' +
        '</g>');
    }
    s.push('</svg>');
    return s.join('');
  }
};
DECOR.clayBlobs = {
  label: '클레이 블롭 — 3D 점토 구슬이 둥둥 떠다니는 배경. 클레이모피즘·스톱모션',
  build: function (W, H, T, lv) {
    var o = [.18, .28, .42][lv], R = rng(67), n = 6;
    var s = ['<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">',
      '<defs>',
      '<filter id="ggClayBlobSh" x="-20%" y="-20%" width="150%" height="150%">' +
      '<feDropShadow dx="0" dy="16" stdDeviation="18" flood-color="' + T.ink + '" flood-opacity="0.14"/>' +
      '</filter>',
      '<radialGradient id="ggClayGrad1" cx="35%" cy="30%" r="65%">' +
      '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>' +
      '<stop offset="45%" stop-color="' + T.accent + '"/>' +
      '<stop offset="100%" stop-color="' + T.bg2 + '"/>' +
      '</radialGradient>',
      '<radialGradient id="ggClayGrad2" cx="35%" cy="30%" r="65%">' +
      '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>' +
      '<stop offset="45%" stop-color="' + T.accent2 + '"/>' +
      '<stop offset="100%" stop-color="' + T.bg2 + '"/>' +
      '</radialGradient>',
      '</defs>'];
    for (var i = 0; i < n; i++) {
      var cx = W * (.12 + R() * .76), cy = H * (.15 + R() * .7);
      var r = Math.min(W, H) * (.06 + R() * .055);
      var grad = i % 2 === 0 ? 'url(#ggClayGrad1)' : 'url(#ggClayGrad2)';
      s.push('<circle class="gg-drFloat" style="animation-delay:' + r2(-i * 4.2) + 's" ' +
        'cx="' + r2(cx) + '" cy="' + r2(cy) + '" r="' + r2(r) + '" ' +
        'fill="' + grad + '" opacity="' + r2(o) + '" filter="url(#ggClayBlobSh)"/>');
    }
    s.push('</svg>');
    return s.join('');
  }
};
DECOR.dough = {
  label: '점토 층 — 찰흙 반죽을 빚어 겹쳐 놓은 유기적 물결. 따뜻함·공예·스토리',
  build: function (W, H, T, lv) {
    var o = [.16, .26, .38][lv], s = ['<svg class="gg-decor" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">'];
    var cols = [T.accent, T.accent2, T.panel];
    for (var i = 0; i < 3; i++) {
      var y = H * (.62 + i * .11), a = H * (.06 - i * .01);
      var d = 'M0 ' + r2(y) + ' Q' + r2(W * .28) + ' ' + r2(y - a) + ' ' + r2(W * .52) + ' ' + r2(y + a * .5) +
              ' T' + W + ' ' + r2(y) + ' L' + W + ' ' + H + ' L0 ' + H + ' Z';
      s.push('<path class="gg-drSlide" style="animation-delay:' + r2(-i * 5.2) + 's" d="' + d + '" ' +
        'fill="' + cols[i] + '" opacity="' + r2(o * (1 - i * .2)) + '"/>');
    }
    s.push('</svg>');
    return s.join('');
  }
};




/* ================================================================== *
 * MARK — 데코·강조 요소
 * 대상 요소(제목·수치·카드)의 자식으로 들어가 CSS 로 그 박스에 맞춰진다.
 * 좌표를 몰라도 되는 이유: preserveAspectRatio="none" 으로 늘리고
 * vector-effect="non-scaling-stroke" 로 선 두께만 지킨다.
 *
 *   stretch  대상 폭에 맞춰 늘어나는가
 *   where    under(글자 아래) · around(감싸기) · behind(글자 뒤) · corner(우상단)
 *   draw     드로우온(선이 그려지는) 모션을 쓰는가
 * ================================================================== */
var MARK = {};

MARK.underline = {
  label: '밑줄 — 손그림 한 줄. 가장 무난한 강조', stretch: true, where: 'under', draw: true,
  build: function (T) {
    return '<svg class="gg-mark gg-mk-under" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M1 7 C18 3, 34 10, 52 6 S82 2, 99 6" fill="none" stroke="' + T.accent +
      '" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
  }
};
MARK.underline2 = {
  label: '이중 밑줄 — 두 번 그은 선. 더 센 강조', stretch: true, where: 'under', draw: true,
  build: function (T) {
    return '<svg class="gg-mark gg-mk-under" viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M1 5 C22 1, 40 8, 60 4 S86 1, 99 5" fill="none" stroke="' + T.accent +
      '" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
      '<path d="M4 12 C24 9, 44 14, 64 10 S88 8, 97 12" fill="none" stroke="' + T.accent2 +
      '" stroke-width="2" stroke-linecap="round" opacity=".7" vector-effect="non-scaling-stroke"/></svg>';
  }
};
MARK.circle = {
  label: '동그라미 — 손으로 두른 원. 한 낱말·수치를 집는다', stretch: true, where: 'around', draw: true,
  build: function (T) {
    return '<svg class="gg-mark gg-mk-around" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M50 4 C78 4, 97 22, 97 50 C97 78, 78 96, 50 96 C22 96, 3 78, 3 50 C3 24, 20 6, 46 4" ' +
      'fill="none" stroke="' + T.accent + '" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
  }
};
MARK.box = {
  label: '사각 테두리 — 손그림 네모. 영역을 묶는다', stretch: true, where: 'around', draw: true,
  build: function (T) {
    return '<svg class="gg-mark gg-mk-around" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M4 6 L96 3 L97 95 L3 97 Z" fill="none" stroke="' + T.accent +
      '" stroke-width="2.6" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
  }
};
MARK.highlight = {
  label: '형광펜 — 글자 뒤를 칠한다. 좌에서 우로 그어진다', stretch: true, where: 'behind', draw: false,
  build: function (T) {
    return '<svg class="gg-mark gg-mk-behind" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M0 22 C14 16, 30 26, 48 20 S80 14, 100 20 L100 82 C82 88, 64 78, 44 84 S16 90, 0 84Z" ' +
      'fill="' + T.accent + '" opacity=".22"/></svg>';
  }
};
MARK.bracket = {
  label: '대괄호 — 양옆에서 집는다. 절제된 강조', stretch: true, where: 'around', draw: true,
  build: function (T) {
    return '<svg class="gg-mark gg-mk-around" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M14 4 L3 4 L3 96 L14 96" fill="none" stroke="' + T.accent +
      '" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
      '<path d="M86 4 L97 4 L97 96 L86 96" fill="none" stroke="' + T.accent +
      '" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
  }
};
MARK.strike = {
  label: '취소선 — 부정·폐기. before 쪽에 쓴다', stretch: true, where: 'behind', draw: true,
  build: function (T) {
    return '<svg class="gg-mark gg-mk-strike" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M2 56 C26 48, 52 60, 76 50 S94 44, 98 48" fill="none" stroke="' + T.bad +
      '" stroke-width="3.4" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
  }
};
MARK.scribble = {
  label: '낙서 — 여러 번 덧그은 선. 거칠고 센 강조', stretch: true, where: 'behind', draw: true,
  build: function (T) {
    return '<svg class="gg-mark gg-mk-behind" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M2 30 C30 22, 62 38, 98 28 M98 46 C68 54, 34 40, 2 50 M2 68 C34 60, 66 74, 98 64" ' +
      'fill="none" stroke="' + T.accent + '" stroke-width="7" stroke-linecap="round" opacity=".18" ' +
      'vector-effect="non-scaling-stroke"/></svg>';
  }
};
MARK.arrow = {
  label: '화살표 — 손그림. 대상 왼쪽 아래에서 가리킨다', stretch: false, where: 'point', draw: true,
  build: function (T) {
    return '<svg class="gg-mark gg-mk-point" viewBox="0 0 90 70" aria-hidden="true">' +
      '<path d="M4 66 C10 40, 30 18, 66 12" fill="none" stroke="' + T.accent +
      '" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
      '<path d="M52 6 L70 11 L58 25" fill="none" stroke="' + T.accent +
      '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>';
  }
};
MARK.star = {
  label: '별표 — 세 개가 톡 튀어나온다. 새것·좋은 것', stretch: false, where: 'corner', draw: false,
  build: function (T) {
    var d = 'M12 1 L14.6 8.4 L22 11 L14.6 13.6 L12 21 L9.4 13.6 L2 11 L9.4 8.4 Z';
    return '<svg class="gg-mark gg-mk-corner" viewBox="0 0 60 40" aria-hidden="true">' +
      '<g class="gg-mkStar" transform="translate(28,2) scale(1.1)"><path d="' + d + '" fill="' + T.accent + '"/></g>' +
      '<g class="gg-mkStar" transform="translate(6,10) scale(.66)"><path d="' + d + '" fill="' + T.accent2 + '"/></g>' +
      '<g class="gg-mkStar" transform="translate(38,20) scale(.5)"><path d="' + d + '" fill="' + T.accent + '"/></g></svg>';
  }
};
MARK.badge = {
  label: '배지 — 우상단에 붙는 알약. NEW·3배 같은 짧은 말', stretch: false, where: 'corner', draw: false, text: true,
  build: function (T, text) {
    var t = String(text == null ? 'NEW' : text);
    var w = Math.max(46, 20 + t.length * 13);
    return '<svg class="gg-mark gg-mk-badge" viewBox="0 0 ' + w + ' 34" aria-hidden="true">' +
      '<rect x="1" y="1" width="' + (w - 2) + '" height="32" rx="16" fill="' + T.accent + '"/>' +
      '<text x="' + w / 2 + '" y="23" text-anchor="middle" font-size="16" font-weight="800" ' +
      'font-family="inherit" fill="' + T.bg + '">' + t.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text></svg>';
  }
};
MARK.ribbon = {
  label: '리본 — 좌상단 대각선 띠. 상태·분류 표시', stretch: false, where: 'ribbon', draw: false, text: true,
  build: function (T, text) {
    var t = String(text == null ? '핵심' : text);
    return '<svg class="gg-mark gg-mk-ribbon" viewBox="0 0 120 120" aria-hidden="true">' +
      '<path d="M0 0 L120 0 L0 120 Z" fill="' + T.accent + '" opacity=".92"/>' +
      '<text x="36" y="36" text-anchor="middle" font-size="19" font-weight="800" font-family="inherit" ' +
      'fill="' + T.bg + '" transform="rotate(-45 36 36)">' + t.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text></svg>';
  }
};
MARK.tape = {
  label: '테이프 — 반투명 마스킹 테이프. 메모·인용 고정', stretch: true, where: 'corner', draw: false,
  build: function (T) {
    return '<svg class="gg-mark gg-mk-tape" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">' +
      '<polygon points="0,4 98,0 100,26 2,30" fill="' + T.accent + '" opacity=".45"/>' +
      '</svg>';
  }
};
MARK.stamp = {
  label: '스탬프 — 도장 마크. 확정·인증·강조', stretch: false, where: 'corner', draw: false, text: true,
  build: function (T, text) {
    var t = String(text == null ? 'PASS' : text);
    var fs = Math.max(12, Math.round(30 - t.length * 2.2));
    return '<svg class="gg-mark gg-mk-stamp" viewBox="0 0 110 50" aria-hidden="true">' +
      '<rect x="4" y="4" width="102" height="42" rx="6" fill="none" stroke="' + T.good + '" stroke-width="3" stroke-dasharray="1000" ' +
      'transform="rotate(-8 55 25)"/>' +
      '<text x="55" y="31" fill="' + T.good + '" font-size="' + fs + '" font-weight="900" text-anchor="middle" ' +
      'letter-spacing="0.1em" font-family="inherit" transform="rotate(-8 55 25)">' + t.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text>' +
      '</svg>';
  }
};
MARK.clayPin = {
  label: '점토 핀 — 둥근 찰흙 압정 구슬. 메모·카드 고정', stretch: false, where: 'corner', draw: false,
  build: function (T) {
    return '<svg class="gg-mark gg-mk-clayPin" viewBox="0 0 44 44" aria-hidden="true">' +
      '<defs>' +
      '<filter id="ggPinSh" x="-30%" y="-30%" width="160%" height="160%">' +
      '<feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="' + T.ink + '" flood-opacity="0.25"/>' +
      '</filter>' +
      '<radialGradient id="ggPinGrad" cx="35%" cy="30%" r="65%">' +
      '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>' +
      '<stop offset="45%" stop-color="' + T.accent + '"/>' +
      '<stop offset="100%" stop-color="' + T.ink + '"/>' +
      '</radialGradient>' +
      '</defs>' +
      '<circle cx="22" cy="22" r="16" fill="url(#ggPinGrad)" filter="url(#ggPinSh)"/>' +
      '</svg>';
  }
};




/* ================================================================== *
 * FRAME — 디바이스·프레임
 * build(T, W, H) -> { svg, inner:{x,y,w,h} }
 * inner 는 콘텐츠를 놓을 안쪽 영역이다. 패턴이 그 좌표에 DOM 을 절대배치한다.
 * ================================================================== */
var FRAME = {};

function chrome(T) { return 'fill="none" stroke="' + T.panelLine + '" stroke-width="2"'; }

FRAME.browser = {
  label: '브라우저 창 — 웹 화면·서비스 소개', ratio: 16 / 10,
  build: function (T, W, H) {
    var bar = Math.max(34, H * .1), r = 14;
    return {
      svg: '<svg class="gg-frame" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
        '<rect x="1" y="1" width="' + (W - 2) + '" height="' + (H - 2) + '" rx="' + r + '" fill="' + T.bg2 + '" ' +
        'stroke="' + T.panelLine + '" stroke-width="2"/>' +
        '<path d="M1 ' + r2(bar) + ' L' + (W - 1) + ' ' + r2(bar) + '" stroke="' + T.panelLine + '" stroke-width="2"/>' +
        '<circle cx="' + r2(bar * .62) + '" cy="' + r2(bar / 2) + '" r="' + r2(bar * .13) + '" fill="' + T.bad + '" opacity=".8"/>' +
        '<circle cx="' + r2(bar * 1.06) + '" cy="' + r2(bar / 2) + '" r="' + r2(bar * .13) + '" fill="' + T.warn + '" opacity=".8"/>' +
        '<circle cx="' + r2(bar * 1.5) + '" cy="' + r2(bar / 2) + '" r="' + r2(bar * .13) + '" fill="' + T.good + '" opacity=".8"/>' +
        '<rect x="' + r2(bar * 2.1) + '" y="' + r2(bar * .24) + '" width="' + r2(W - bar * 3.2) + '" height="' + r2(bar * .52) +
        '" rx="' + r2(bar * .26) + '" fill="' + T.panel + '"/></svg>',
      inner: { x: 10, y: bar + 8, w: W - 20, h: H - bar - 18 }
    };
  }
};
FRAME.window = {
  label: '단순 창 — 타이틀바만. 어떤 콘텐츠에나', ratio: 16 / 10,
  build: function (T, W, H) {
    var bar = Math.max(28, H * .085);
    return {
      svg: '<svg class="gg-frame" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
        '<rect x="1" y="1" width="' + (W - 2) + '" height="' + (H - 2) + '" rx="12" fill="' + T.bg2 + '" ' +
        'stroke="' + T.panelLine + '" stroke-width="2"/>' +
        '<path d="M1 ' + r2(bar) + ' L' + (W - 1) + ' ' + r2(bar) + '" stroke="' + T.panelLine + '" stroke-width="2"/>' +
        '<rect x="' + r2(bar * .5) + '" y="' + r2(bar * .3) + '" width="' + r2(W * .22) + '" height="' + r2(bar * .4) +
        '" rx="' + r2(bar * .2) + '" fill="' + T.dim + '" opacity=".45"/></svg>',
      inner: { x: 10, y: bar + 8, w: W - 20, h: H - bar - 18 }
    };
  }
};
FRAME.terminal = {
  label: '터미널 — 로그·명령·코드', ratio: 16 / 10,
  build: function (T, W, H) {
    var bar = Math.max(30, H * .09);
    return {
      svg: '<svg class="gg-frame" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
        '<rect x="1" y="1" width="' + (W - 2) + '" height="' + (H - 2) + '" rx="12" fill="#0a0c12" ' +
        'stroke="' + T.panelLine + '" stroke-width="2"/>' +
        '<path d="M1 ' + r2(bar) + ' L' + (W - 1) + ' ' + r2(bar) + '" stroke="rgba(255,255,255,.14)" stroke-width="2"/>' +
        '<circle cx="' + r2(bar * .6) + '" cy="' + r2(bar / 2) + '" r="' + r2(bar * .12) + '" fill="' + T.good + '"/>' +
        '<text x="' + r2(bar * 1.2) + '" y="' + r2(bar * .68) + '" font-size="' + r2(bar * .42) +
        '" fill="rgba(255,255,255,.4)" font-family="ui-monospace,monospace">zsh</text></svg>',
      inner: { x: 18, y: bar + 12, w: W - 36, h: H - bar - 24 }
    };
  }
};
FRAME.phone = {
  label: '폰 — 앱·쇼츠·모바일 화면', ratio: 9 / 19.5,
  build: function (T, W, H) {
    var r = Math.round(W * .13), notch = Math.round(W * .38);
    return {
      svg: '<svg class="gg-frame" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
        '<rect x="2" y="2" width="' + (W - 4) + '" height="' + (H - 4) + '" rx="' + r + '" fill="' + T.bg2 + '" ' +
        'stroke="' + T.panelLine + '" stroke-width="3"/>' +
        '<rect x="' + r2((W - notch) / 2) + '" y="' + r2(W * .05) + '" width="' + notch + '" height="' + r2(W * .075) +
        '" rx="' + r2(W * .04) + '" fill="' + T.dim + '" opacity=".5"/>' +
        '<rect x="' + r2(W * .3) + '" y="' + r2(H - W * .1) + '" width="' + r2(W * .4) + '" height="4" rx="2" ' +
        'fill="' + T.dim + '" opacity=".6"/></svg>',
      inner: { x: W * .07, y: W * .16, w: W * .86, h: H - W * .28 }
    };
  }
};
FRAME.tablet = {
  label: '태블릿 — 넓은 모바일 화면', ratio: 3 / 4,
  build: function (T, W, H) {
    var r = Math.round(W * .05);
    return {
      svg: '<svg class="gg-frame" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
        '<rect x="2" y="2" width="' + (W - 4) + '" height="' + (H - 4) + '" rx="' + r + '" fill="' + T.bg2 + '" ' +
        'stroke="' + T.panelLine + '" stroke-width="3"/>' +
        '<circle cx="' + r2(W / 2) + '" cy="' + r2(H - W * .045) + '" r="' + r2(W * .016) + '" fill="' + T.dim + '" opacity=".6"/></svg>',
      inner: { x: W * .055, y: W * .055, w: W * .89, h: H - W * .13 }
    };
  }
};
FRAME.laptop = {
  label: '노트북 — 화면 + 받침. 업무·제품 데모', ratio: 16 / 11,
  build: function (T, W, H) {
    var sh = H * .84, base = H - sh;
    return {
      svg: '<svg class="gg-frame" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
        '<rect x="' + r2(W * .06) + '" y="1" width="' + r2(W * .88) + '" height="' + r2(sh) + '" rx="10" ' +
        'fill="' + T.bg2 + '" stroke="' + T.panelLine + '" stroke-width="2.5"/>' +
        '<path d="M' + r2(W * .01) + ' ' + r2(sh + base * .3) + ' L' + r2(W * .99) + ' ' + r2(sh + base * .3) +
        ' L' + r2(W * .94) + ' ' + r2(H - 2) + ' L' + r2(W * .06) + ' ' + r2(H - 2) + 'Z" ' +
        'fill="' + T.panel + '" stroke="' + T.panelLine + '" stroke-width="2"/>' +
        '<rect x="' + r2(W * .43) + '" y="' + r2(sh + base * .42) + '" width="' + r2(W * .14) + '" height="5" rx="2.5" ' +
        'fill="' + T.dim + '" opacity=".5"/></svg>',
      inner: { x: W * .085, y: 14, w: W * .83, h: sh - 26 }
    };
  }
};
FRAME.card = {
  label: '카드 — 그림자 있는 판. 인용·항목·이미지', ratio: 4 / 3,
  build: function (T, W, H) {
    return {
      svg: '<svg class="gg-frame" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
        '<rect x="3" y="3" width="' + (W - 6) + '" height="' + (H - 6) + '" rx="18" fill="' + T.panel + '" ' +
        'stroke="' + T.panelLine + '" stroke-width="2"/>' +
        '<rect x="' + r2(W * .06) + '" y="' + r2(H * .07) + '" width="' + r2(W * .3) + '" height="5" rx="2.5" ' +
        'fill="' + T.accent + '" opacity=".7"/></svg>',
      inner: { x: W * .06, y: H * .16, w: W * .88, h: H * .76 }
    };
  }
};
FRAME.chat = {
  label: '채팅 — 말풍선 창. 대화·문의·목소리', ratio: 4 / 3.4,
  build: function (T, W, H) {
    return {
      svg: '<svg class="gg-frame" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
        '<path d="M18 3 L' + (W - 18) + ' 3 Q' + (W - 3) + ' 3 ' + (W - 3) + ' 18 L' + (W - 3) + ' ' + r2(H * .78) +
        ' Q' + (W - 3) + ' ' + r2(H * .78 + 15) + ' ' + (W - 18) + ' ' + r2(H * .78 + 15) +
        ' L' + r2(W * .3) + ' ' + r2(H * .78 + 15) + ' L' + r2(W * .18) + ' ' + (H - 4) +
        ' L' + r2(W * .2) + ' ' + r2(H * .78 + 15) + ' L18 ' + r2(H * .78 + 15) +
        ' Q3 ' + r2(H * .78 + 15) + ' 3 ' + r2(H * .78) + ' L3 18 Q3 3 18 3Z" ' +
        'fill="' + T.panel + '" stroke="' + T.panelLine + '" stroke-width="2"/></svg>',
      inner: { x: W * .08, y: H * .1, w: W * .84, h: H * .62 }
    };
  }
};
FRAME.memo = {
  label: '메모지 — 상단 마스킹 테이프가 붙은 정사각 메모. 아이디어·노트', ratio: 1,
  build: function (T, W, H) {
    var pad = Math.round(Math.min(W, H) * .09);
    var tw = Math.round(W * .32), th = Math.round(H * .09), tx = Math.round((W - tw) / 2);
    var svg = '<svg class="gg-frame" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
      '<rect x="12" y="' + Math.round(th * .6) + '" width="' + (W - 24) + '" height="' + (H - th * .6 - 16) + '" rx="6" ' +
      'fill="' + T.panel + '" stroke="' + T.panelLine + '" stroke-width="1.8"/>' +
      '<rect x="' + tx + '" y="4" width="' + tw + '" height="' + th + '" rx="2" ' +
      'fill="' + T.accent + '" opacity=".45" transform="rotate(-1.5 ' + (tx + tw / 2) + ' ' + (th / 2) + ')"/>' +
      '</svg>';
    return {
      svg: svg,
      inner: { x: pad + 8, y: Math.round(th * 1.3) + 10, w: W - (pad + 8) * 2, h: H - Math.round(th * 1.3) - pad - 18 }
    };
  }
};
FRAME.notepad = {
  label: '스프링 노트 — 상단 바인더 링이 있는 노트 용지. 체크리스트·기록', ratio: 16 / 11,
  build: function (T, W, H) {
    var pad = Math.round(Math.min(W, H) * .08);
    var topBar = Math.round(H * .12);
    var rings = 10, rw = W - 48, step = rw / (rings - 1);
    var s = ['<svg class="gg-frame" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">',
      '<rect x="12" y="18" width="' + (W - 24) + '" height="' + (H - 28) + '" rx="10" fill="' + T.panel + '" stroke="' + T.panelLine + '" stroke-width="2"/>',
      '<line x1="12" y1="' + topBar + '" x2="' + (W - 12) + '" y2="' + topBar + '" stroke="' + T.line + '" stroke-width="1.5" stroke-dasharray="6 4"/>'];
    for (var i = 0; i < rings; i++) {
      var rx = 24 + i * step;
      s.push('<rect x="' + (rx - 4) + '" y="6" width="8" height="24" rx="4" fill="' + T.accent + '" opacity=".85"/>');
      s.push('<circle cx="' + rx + '" cy="18" r="3.5" fill="' + T.bg + '"/>');
    }
    s.push('</svg>');
    return {
      svg: s.join(''),
      inner: { x: pad + 12, y: topBar + 16, w: W - (pad + 12) * 2, h: H - topBar - pad - 24 }
    };
  }
};
FRAME.clipboard = {
  label: '클립보드 — 상단 메탈 클립과 서류 보드. 현황·진단·리포트', ratio: 3 / 4,
  build: function (T, W, H) {
    var pad = Math.round(Math.min(W, H) * .09);
    var clipW = Math.round(W * .38), clipH = Math.round(H * .09), clipX = Math.round((W - clipW) / 2);
    var s = ['<svg class="gg-frame" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">',
      '<rect x="6" y="8" width="' + (W - 12) + '" height="' + (H - 16) + '" rx="16" fill="' + (T.bg2 || T.panel) + '" stroke="' + T.line + '" stroke-width="2.5"/>',
      '<rect x="22" y="' + Math.round(clipH * .7) + '" width="' + (W - 44) + '" height="' + (H - clipH * .7 - 24) + '" rx="8" fill="' + T.panel + '" stroke="' + T.panelLine + '" stroke-width="1.5"/>',
      '<rect x="' + clipX + '" y="2" width="' + clipW + '" height="' + clipH + '" rx="6" fill="' + T.accent + '" opacity=".9"/>',
      '<circle cx="' + (clipX + clipW / 2) + '" cy="' + (clipH / 2 + 2) + '" r="' + Math.round(clipH * .22) + '" fill="' + T.bg + '"/>',
      '</svg>'];
    return {
      svg: s.join(''),
      inner: { x: pad + 16, y: Math.round(clipH * 1.3) + 10, w: W - (pad + 16) * 2, h: H - Math.round(clipH * 1.3) - pad - 26 }
    };
  }
};
FRAME.clayBoard = {
  label: '점토 보드 — 찰흙을 빚어 만든 두툼한 점토판. 아이디어·체크리스트·클레이', ratio: 4 / 3,
  build: function (T, W, H) {
    var pad = Math.round(Math.min(W, H) * .09);
    var pinR = Math.round(Math.min(W, H) * .035);
    var s = ['<svg class="gg-frame" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">',
      '<defs>',
      '<filter id="ggClayBoardSh" x="-10%" y="-10%" width="130%" height="130%">' +
      '<feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="' + T.ink + '" flood-opacity="0.14"/>' +
      '</filter>',
      '<radialGradient id="ggBoardPinGrad" cx="35%" cy="30%" r="65%">' +
      '<stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>' +
      '<stop offset="50%" stop-color="' + T.accent + '"/>' +
      '<stop offset="100%" stop-color="' + T.bg2 + '"/>' +
      '</radialGradient>',
      '</defs>',
      '<rect x="10" y="10" width="' + (W - 20) + '" height="' + (H - 20) + '" rx="28" fill="' + T.panel + '" ' +
      'stroke="' + T.panelLine + '" stroke-width="3" filter="url(#ggClayBoardSh)"/>',
      '<circle cx="' + Math.round(W * .2) + '" cy="24" r="' + pinR + '" fill="url(#ggBoardPinGrad)"/>',
      '<circle cx="' + Math.round(W * .8) + '" cy="24" r="' + pinR + '" fill="url(#ggBoardPinGrad)"/>',
      '</svg>'];
    return {
      svg: s.join(''),
      inner: { x: pad + 8, y: pad + 14, w: W - (pad + 8) * 2, h: H - (pad + 14) * 2 }
    };
  }
};



/* ================================================================== *
 * ART — 추상 일러스트
 * build(T) -> SVG (viewBox 0 0 200 200). 도형 조합으로 개념을 표현한다.
 * <g class="gg-artP"> 로 부분을 나눠 두면 엔진이 스태거로 등장시킨다.
 * ================================================================== */
var ART = {};
function art(body) { return '<svg class="gg-art" viewBox="0 0 200 200" aria-hidden="true">' + body + '</svg>'; }
function S(T) { return 'stroke="' + T.accent + '" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"'; }
function S2(T) { return 'stroke="' + T.accent2 + '" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"'; }
function F(T, o) { return 'fill="' + T.accent + '" opacity="' + (o || .18) + '"'; }
function F2(T, o) { return 'fill="' + T.accent2 + '" opacity="' + (o || .18) + '"'; }

ART.collab = { label: '협업 — 겹치는 세 원. 팀·공유·교집합', build: function (T) { return art(
  '<g class="gg-artP"><circle cx="76" cy="80" r="46" ' + F(T) + '/><circle cx="76" cy="80" r="46" ' + S(T) + '/></g>' +
  '<g class="gg-artP"><circle cx="124" cy="80" r="46" ' + F2(T) + '/><circle cx="124" cy="80" r="46" ' + S2(T) + '/></g>' +
  '<g class="gg-artP"><circle cx="100" cy="126" r="46" ' + F(T, .12) + '/><circle cx="100" cy="126" r="46" ' + S(T) + '/></g>'); } };

ART.data = { label: '데이터 — 적층 실린더. 저장소·축적', build: function (T) { return art(
  [0, 1, 2].map(function (i) { var y = 62 + i * 38;
    return '<g class="gg-artP"><ellipse cx="100" cy="' + y + '" rx="52" ry="17" ' + F(T, .2 - i * .04) + '/>' +
      '<path d="M48 ' + y + ' L48 ' + (y + 30) + ' A52 17 0 0 0 152 ' + (y + 30) + ' L152 ' + y + '" ' + F(T, .1) + '/>' +
      '<ellipse cx="100" cy="' + y + '" rx="52" ry="17" ' + S(T) + '/>' +
      '<path d="M48 ' + y + ' L48 ' + (y + 30) + ' M152 ' + y + ' L152 ' + (y + 30) + '" ' + S(T) + '/></g>'; }).join('')); } };

ART.server = { label: '서버 — 랙과 표시등. 인프라·시스템', build: function (T) { return art(
  [0, 1, 2].map(function (i) { var y = 46 + i * 40;
    return '<g class="gg-artP"><rect x="52" y="' + y + '" width="96" height="30" rx="6" ' + F(T, .14) + '/>' +
      '<rect x="52" y="' + y + '" width="96" height="30" rx="6" ' + S(T) + '/>' +
      '<circle cx="68" cy="' + (y + 15) + '" r="4" fill="' + (i === 1 ? T.good : T.accent) + '"/>' +
      '<path d="M84 ' + (y + 15) + ' L134 ' + (y + 15) + '" stroke="' + T.accent + '" stroke-width="3" opacity=".4"/></g>'; }).join('') +
  '<g class="gg-artP"><path d="M100 166 L100 178 M76 178 L124 178" ' + S(T) + '/></g>'); } };

ART.growth = { label: '성장 — 오르는 계단과 화살. 개선·상승', build: function (T) { return art(
  '<g class="gg-artP">' + [0, 1, 2, 3].map(function (i) { var h = 32 + i * 30, x = 44 + i * 32;
    return '<rect x="' + x + '" y="' + (162 - h) + '" width="24" height="' + h + '" rx="5" ' + F(T, .12 + i * .05) + '/>' +
      '<rect x="' + x + '" y="' + (162 - h) + '" width="24" height="' + h + '" rx="5" ' + S(T) + '/>'; }).join('') + '</g>' +
  '<g class="gg-artP"><path d="M40 96 C70 88, 100 62, 152 34" ' + S2(T) + '/>' +
  '<path d="M132 30 L156 30 L154 54" ' + S2(T) + '/></g>'); } };

ART.network = { label: '네트워크 — 노드와 간선. 연결·관계', build: function (T) {
  var pts = [[100, 44], [50, 84], [150, 84], [70, 148], [130, 148], [100, 104]];
  var edges = [[5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [0, 1], [0, 2], [3, 4]];
  return art('<g class="gg-artP">' + edges.map(function (e) {
    return '<path d="M' + pts[e[0]][0] + ' ' + pts[e[0]][1] + ' L' + pts[e[1]][0] + ' ' + pts[e[1]][1] + '" stroke="' +
      T.accent + '" stroke-width="3" opacity=".45" fill="none"/>'; }).join('') + '</g>' +
    '<g class="gg-artP">' + pts.map(function (p, i) { var r = i === 5 ? 18 : 13;
      return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + r + '" fill="' + (i === 5 ? T.accent : T.bg2) + '" ' +
        (i === 5 ? '' : 'stroke="' + T.accent + '" stroke-width="4"') + '/>'; }).join('') + '</g>'); } };

ART.funnel = { label: '퍼널 — 좁아지는 통로. 전환·선별', build: function (T) { return art(
  '<g class="gg-artP"><path d="M34 42 L166 42 L118 108 L118 158 L82 158 L82 108 Z" ' + F(T, .14) + '/>' +
  '<path d="M34 42 L166 42 L118 108 L118 158 L82 158 L82 108 Z" ' + S(T) + '/></g>' +
  '<g class="gg-artP">' + [0, 1, 2].map(function (i) {
    return '<circle cx="' + (72 + i * 28) + '" cy="26" r="7" ' + F2(T, .7) + '/>'; }).join('') + '</g>' +
  '<g class="gg-artP"><circle cx="100" cy="182" r="8" fill="' + T.good + '"/></g>'); } };

ART.gears = { label: '톱니 — 맞물린 기계. 자동화·프로세스', build: function (T) {
  function gear(cx, cy, r, n, col) {
    var d = '', i;
    for (i = 0; i < n; i++) {
      var a0 = i * 2 * Math.PI / n, a1 = a0 + Math.PI / n * .55, a2 = a0 + Math.PI / n * 1.45;
      var ro = r * 1.26;
      d += (i ? ' L' : 'M') + r2(cx + Math.cos(a0) * ro) + ' ' + r2(cy + Math.sin(a0) * ro);
      d += ' L' + r2(cx + Math.cos(a1) * r) + ' ' + r2(cy + Math.sin(a1) * r);
      d += ' L' + r2(cx + Math.cos(a2) * r) + ' ' + r2(cy + Math.sin(a2) * r);
    }
    return '<path d="' + d + 'Z" fill="' + col + '" opacity=".16"/><path d="' + d + 'Z" stroke="' + col +
      '" stroke-width="4" fill="none" stroke-linejoin="round"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r2(r * .34) + '" stroke="' + col + '" stroke-width="4" fill="none"/>';
  }
  return art('<g class="gg-artP gg-artSpin" style="transform-origin:78px 84px">' + gear(78, 84, 40, 8, T.accent) + '</g>' +
    '<g class="gg-artP gg-artSpinR" style="transform-origin:136px 132px">' + gear(136, 132, 28, 7, T.accent2) + '</g>'); } };

ART.cloud = { label: '클라우드 — 구름과 연결. 서비스·원격', build: function (T) { return art(
  '<g class="gg-artP"><path d="M62 108 A26 26 0 0 1 74 60 A32 32 0 0 1 132 66 A24 24 0 0 1 140 108 Z" ' + F(T, .16) + '/>' +
  '<path d="M62 108 A26 26 0 0 1 74 60 A32 32 0 0 1 132 66 A24 24 0 0 1 140 108" ' + S(T) + '/>' +
  '<path d="M62 108 L140 108" ' + S(T) + '/></g>' +
  '<g class="gg-artP"><path d="M100 108 L100 138 M62 138 L138 138 M62 138 L62 158 M100 138 L100 158 M138 138 L138 158" ' +
  'stroke="' + T.accent + '" stroke-width="3" fill="none" opacity=".55"/>' +
  [62, 100, 138].map(function (x) { return '<rect x="' + (x - 13) + '" y="158" width="26" height="20" rx="5" ' + F2(T, .6) + '/>'; }).join('') +
  '</g>'); } };

ART.search = { label: '탐색 — 돋보기와 문서. 조사·발견', build: function (T) { return art(
  '<g class="gg-artP"><rect x="46" y="34" width="86" height="112" rx="9" ' + F(T, .12) + '/>' +
  '<rect x="46" y="34" width="86" height="112" rx="9" ' + S(T) + '/>' +
  '<path d="M64 62 L114 62 M64 82 L114 82 M64 102 L96 102" stroke="' + T.accent + '" stroke-width="3" opacity=".5"/></g>' +
  '<g class="gg-artP"><circle cx="126" cy="122" r="34" fill="' + T.bg2 + '" fill-opacity=".85"/>' +
  '<circle cx="126" cy="122" r="34" ' + S2(T) + '/><path d="M150 146 L176 172" ' + S2(T) + '/></g>'); } };

ART.time = { label: '시간 — 시계와 흐름. 기간·지연·주기', build: function (T) { return art(
  '<g class="gg-artP"><circle cx="100" cy="100" r="54" ' + F(T, .12) + '/><circle cx="100" cy="100" r="54" ' + S(T) + '/>' +
  '<path d="M100 100 L100 68 M100 100 L124 114" ' + S(T) + '/></g>' +
  '<g class="gg-artP"><path d="M100 22 A78 78 0 0 1 178 100" ' + S2(T) + ' stroke-dasharray="8 10"/>' +
  '<path d="M170 84 L180 100 L164 106" ' + S2(T) + '/></g>'); } };

ART.shield = { label: '보호 — 방패와 체크. 보안·품질·신뢰', build: function (T) { return art(
  '<g class="gg-artP"><path d="M100 26 L164 52 L164 108 C164 148, 132 170, 100 180 C68 170, 36 148, 36 108 L36 52 Z" ' + F(T, .14) + '/>' +
  '<path d="M100 26 L164 52 L164 108 C164 148, 132 170, 100 180 C68 170, 36 148, 36 108 L36 52 Z" ' + S(T) + '/></g>' +
  '<g class="gg-artP"><path d="M72 100 L94 122 L132 80" stroke="' + T.good +
  '" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>'); } };

ART.chatart = { label: '대화 — 겹친 말풍선. 소통·의견·문의', build: function (T) { return art(
  '<g class="gg-artP"><path d="M34 44 L124 44 Q138 44 138 58 L138 106 Q138 120 124 120 L70 120 L48 146 L52 120 L34 120 Q20 120 20 106 L20 58 Q20 44 34 44Z" ' + F(T, .16) + '/>' +
  '<path d="M34 44 L124 44 Q138 44 138 58 L138 106 Q138 120 124 120 L70 120 L48 146 L52 120 L34 120 Q20 120 20 106 L20 58 Q20 44 34 44Z" ' + S(T) + '/>' +
  '<path d="M44 72 L114 72 M44 94 L92 94" stroke="' + T.accent + '" stroke-width="3" opacity=".5"/></g>' +
  '<g class="gg-artP"><path d="M96 96 L168 96 Q182 96 182 110 L182 150 Q182 164 168 164 L152 164 L166 186 L138 164 L96 164 Q82 164 82 150 L82 110 Q82 96 96 96Z" ' +
  'fill="' + T.bg2 + '"/><path d="M96 96 L168 96 Q182 96 182 110 L182 150 Q182 164 168 164 L152 164 L166 186 L138 164 L96 164 Q82 164 82 150 L82 110 Q82 96 96 96Z" ' + S2(T) + '/></g>'); } };

ART.idea = { label: '아이디어 — 전구와 방사. 발상·통찰', build: function (T) { return art(
  '<g class="gg-artP"><path d="M100 46 A38 38 0 0 1 122 116 L122 132 L78 132 L78 116 A38 38 0 0 1 100 46Z" ' + F(T, .18) + '/>' +
  '<path d="M100 46 A38 38 0 0 1 122 116 L122 132 L78 132 L78 116 A38 38 0 0 1 100 46Z" ' + S(T) + '/>' +
  '<path d="M82 144 L118 144 M88 158 L112 158" ' + S(T) + '/></g>' +
  '<g class="gg-artP">' + [-60, -30, 0, 30, 60].map(function (deg) {
    var a = (deg - 90) * Math.PI / 180;
    return '<path d="M' + r2(100 + Math.cos(a) * 56) + ' ' + r2(100 + Math.sin(a) * 56) + ' L' +
      r2(100 + Math.cos(a) * 78) + ' ' + r2(100 + Math.sin(a) * 78) + '" stroke="' + T.warn +
      '" stroke-width="5" stroke-linecap="round" fill="none"/>'; }).join('') + '</g>'); } };

ART.target = { label: '목표 — 과녁과 화살. 집중·달성', build: function (T) { return art(
  '<g class="gg-artP">' + [56, 38, 20].map(function (r, i) {
    return '<circle cx="96" cy="104" r="' + r + '" fill="' + (i % 2 ? T.bg2 : T.accent) + '" fill-opacity="' + (i % 2 ? 1 : .18) + '"/>' +
      '<circle cx="96" cy="104" r="' + r + '" ' + S(T) + '/>'; }).join('') +
  '<circle cx="96" cy="104" r="7" fill="' + T.accent + '"/></g>' +
  '<g class="gg-artP"><path d="M158 42 L104 96" stroke="' + T.accent2 + '" stroke-width="5" stroke-linecap="round" fill="none"/>' +
  '<path d="M140 40 L160 40 L160 60" ' + S2(T) + '/></g>'); } };

ART.flow = { label: '흐름 — 파이프와 이동. 처리·전달', build: function (T) { return art(
  '<g class="gg-artP"><path d="M24 70 L96 70 Q120 70 120 94 L120 130 Q120 154 144 154 L180 154" ' +
  'stroke="' + T.accent + '" stroke-width="16" fill="none" opacity=".14" stroke-linecap="round"/>' +
  '<path d="M24 70 L96 70 Q120 70 120 94 L120 130 Q120 154 144 154 L180 154" ' + S(T) + '/></g>' +
  '<g class="gg-artP">' + [0, 1, 2].map(function (i) {
    return '<circle class="gg-artFlow" style="animation-delay:' + r2(i * 1.1) + 's" cx="24" cy="70" r="8" fill="' + T.accent2 + '"/>'; }).join('') + '</g>' +
  '<g class="gg-artP"><rect x="6" y="52" width="20" height="36" rx="5" ' + F(T, .5) + '/>' +
  '<rect x="174" y="136" width="20" height="36" rx="5" ' + F2(T, .5) + '/></g>'); } };

ART.stack = { label: '스택 — 아이소메트릭 층. 계층·구성', build: function (T) { return art(
  [0, 1, 2].map(function (i) { var y = 132 - i * 34, col = i === 1 ? T.accent2 : T.accent;
    return '<g class="gg-artP"><path d="M100 ' + (y - 26) + ' L166 ' + y + ' L100 ' + (y + 26) + ' L34 ' + y + 'Z" ' +
      'fill="' + col + '" opacity="' + (.12 + i * .06) + '"/>' +
      '<path d="M100 ' + (y - 26) + ' L166 ' + y + ' L100 ' + (y + 26) + ' L34 ' + y + 'Z" stroke="' + col +
      '" stroke-width="4" fill="none" stroke-linejoin="round"/></g>'; }).join('')); } };

ART.compass = { label: '방향 — 나침반. 전략·기준·지향', build: function (T) { return art(
  '<g class="gg-artP"><circle cx="100" cy="100" r="66" ' + F(T, .1) + '/><circle cx="100" cy="100" r="66" ' + S(T) + '/>' +
  '<circle cx="100" cy="100" r="54" stroke="' + T.accent + '" stroke-width="2" fill="none" opacity=".4" stroke-dasharray="4 8"/></g>' +
  '<g class="gg-artP"><path d="M100 52 L118 100 L100 148 L82 100Z" fill="' + T.accent2 + '" opacity=".9"/>' +
  '<path d="M100 52 L118 100 L100 148 L82 100Z" ' + S2(T) + '/>' +
  '<circle cx="100" cy="100" r="6" fill="' + T.bg2 + '" stroke="' + T.accent2 + '" stroke-width="3"/></g>'); } };

ART.puzzle = { label: '퍼즐 — 맞물리는 두 조각. 결합·해결', build: function (T) { return art(
  '<g class="gg-artP"><path d="M34 50 L96 50 L96 74 A14 14 0 0 1 96 106 L96 130 L34 130Z" ' + F(T, .16) + '/>' +
  '<path d="M34 50 L96 50 L96 74 A14 14 0 0 1 96 106 L96 130 L34 130Z" ' + S(T) + '/></g>' +
  '<g class="gg-artP"><path d="M166 62 L166 142 L104 142 L104 118 A14 14 0 0 0 104 86 L104 62Z" ' + F2(T, .16) + '/>' +
  '<path d="M166 62 L166 142 L104 142 L104 118 A14 14 0 0 0 104 86 L104 62Z" ' + S2(T) + '/></g>'); } };

ART.balance = { label: '균형 — 저울. 비교·판단·트레이드오프', build: function (T) { return art(
  '<g class="gg-artP"><path d="M100 34 L100 150 M64 150 L136 150 M40 62 L160 62" ' + S(T) + '/>' +
  '<circle cx="100" cy="34" r="9" fill="' + T.accent + '"/></g>' +
  '<g class="gg-artP"><path d="M12 62 L68 62 L40 104Z" ' + F(T, .2) + '/><path d="M12 62 L68 62 L40 104Z" ' + S(T) + '/></g>' +
  '<g class="gg-artP"><path d="M132 62 L188 62 L160 96Z" ' + F2(T, .2) + '/><path d="M132 62 L188 62 L160 96Z" ' + S2(T) + '/></g>'); } };

ART.layers = { label: '레이어 — 겹친 판. 추상화·단계', build: function (T) { return art(
  [0, 1, 2, 3].map(function (i) { var y = 44 + i * 34;
    return '<g class="gg-artP"><rect x="' + (40 + i * 6) + '" y="' + y + '" width="' + (120 - i * 12) + '" height="26" rx="7" ' +
      F(T, .1 + i * .05) + '/><rect x="' + (40 + i * 6) + '" y="' + y + '" width="' + (120 - i * 12) + '" height="26" rx="7" ' +
      S(T) + '/></g>'; }).join('')); } };

ART.rocket = { label: '로켓 — 추진과 비상. 도약·출시·성장', build: function (T) { return art(
  '<g class="gg-artP"><path d="M100 144 C88 162, 88 174, 100 184 C112 174, 112 162, 100 144 Z" fill="' + T.warn + '" opacity=".85"/>' +
  '<path d="M100 148 C94 158, 94 168, 100 174 C106 168, 106 158, 100 148 Z" fill="' + T.bad + '"/></g>' +
  '<g class="gg-artP"><path d="M76 114 L52 142 L78 138 Z" ' + F2(T, .3) + '/><path d="M76 114 L52 142 L78 138 Z" ' + S2(T) + '/>' +
  '<path d="M124 114 L148 142 L122 138 Z" ' + F2(T, .3) + '/><path d="M124 114 L148 142 L122 138 Z" ' + S2(T) + '/></g>' +
  '<g class="gg-artP"><path d="M100 24 C82 58, 76 104, 76 138 L124 138 C124 104, 118 58, 100 24 Z" ' + F(T, .16) + '/>' +
  '<path d="M100 24 C82 58, 76 104, 76 138 L124 138 C124 104, 118 58, 100 24 Z" ' + S(T) + '/>' +
  '<circle cx="100" cy="74" r="14" fill="' + T.bg2 + '" stroke="' + T.accent2 + '" stroke-width="3.5"/></g>'); } };

ART.aiBrain = { label: '인공지능 — 뉴럴 네트워크와 시냅스. AI·지능·연산', build: function (T) { return art(
  '<g class="gg-artP"><path d="M60 110 C46 90, 52 56, 84 52 C90 36, 110 36, 116 52 C148 56, 154 90, 140 110 C146 130, 134 154, 110 156 C90 156, 78 136, 60 110 Z" ' +
    F(T, .14) + '/><path d="M60 110 C46 90, 52 56, 84 52 C90 36, 110 36, 116 52 C148 56, 154 90, 140 110 C146 130, 134 154, 110 156 C90 156, 78 136, 60 110 Z" ' + S(T) + '/></g>' +
  '<g class="gg-artP"><line x1="84" y1="80" x2="116" y2="80" stroke="' + T.accent2 + '" stroke-width="3" opacity=".6"/>' +
  '<line x1="84" y1="80" x2="100" y2="118" stroke="' + T.accent2 + '" stroke-width="3" opacity=".6"/>' +
  '<line x1="116" y1="80" x2="100" y2="118" stroke="' + T.accent2 + '" stroke-width="3" opacity=".6"/>' +
  '<line x1="100" y1="52" x2="100" y2="118" stroke="' + T.accent + '" stroke-width="2" stroke-dasharray="4 6" opacity=".5"/></g>' +
  '<g class="gg-artP"><circle cx="100" cy="52" r="7" fill="' + T.accent + '"/>' +
  '<circle cx="84" cy="80" r="8" fill="' + T.accent2 + '"/>' +
  '<circle cx="116" cy="80" r="8" fill="' + T.accent2 + '"/>' +
  '<circle cx="100" cy="118" r="9" fill="' + T.good + '"/></g>'); } };

ART.trophy = { label: '트로피 — 시상대와 별. 성과·우승·1위', build: function (T) { return art(
  '<g class="gg-artP"><rect x="66" y="152" width="68" height="24" rx="4" ' + F(T, .2) + '/><rect x="66" y="152" width="68" height="24" rx="4" ' + S(T) + '/>' +
  '<path d="M86 134 L114 134 L114 152 L86 152 Z" fill="' + T.bg2 + '" stroke="' + T.accent + '" stroke-width="4"/></g>' +
  '<g class="gg-artP"><path d="M50 56 C34 56, 34 88, 64 88" ' + S2(T) + '/><path d="M150 56 C166 56, 166 88, 136 88" ' + S2(T) + '/></g>' +
  '<g class="gg-artP"><path d="M64 44 L136 44 L136 84 C136 112, 118 134, 100 134 C82 134, 64 112, 64 84 Z" ' + F(T, .18) + '/>' +
  '<path d="M64 44 L136 44 L136 84 C136 112, 118 134, 100 134 C82 134, 64 112, 64 84 Z" ' + S(T) + '/>' +
  '<polygon points="100,64 104,74 114,75 107,82 109,92 100,87 91,92 93,82 86,75 96,74" fill="' + T.accent2 + '"/></g>'); } };

ART.codeBlock = { label: '코드 — 터미널 창과 태그. 개발·빌드·소프트웨어', build: function (T) { return art(
  '<g class="gg-artP"><rect x="36" y="40" width="128" height="120" rx="10" ' + F(T, .12) + '/><rect x="36" y="40" width="128" height="120" rx="10" ' + S(T) + '/>' +
  '<line x1="36" y1="68" x2="164" y2="68" stroke="' + T.accent + '" stroke-width="2.5" opacity=".4"/></g>' +
  '<g class="gg-artP"><circle cx="52" cy="54" r="4" fill="' + T.bad + '"/><circle cx="64" cy="54" r="4" fill="' + T.warn + '"/><circle cx="76" cy="54" r="4" fill="' + T.good + '"/></g>' +
  '<g class="gg-artP"><path d="M74 88 L58 102 L74 116 M126 88 L142 102 L126 116" ' + S2(T) + '/>' +
  '<line x1="108" y1="82" x2="92" y2="122" stroke="' + T.accent + '" stroke-width="3.5" stroke-linecap="round"/></g>'); } };

ART.speedometer = { label: '속도 — 가속 게이지와 바늘. 퍼포먼스·최적화·효율', build: function (T) { return art(
  '<g class="gg-artP"><path d="M40 144 A68 68 0 1 1 160 144" fill="none" stroke="' + T.accent + '" stroke-width="12" opacity=".18" stroke-linecap="round"/>' +
  '<path d="M40 144 A68 68 0 1 1 140 82" fill="none" stroke="' + T.accent + '" stroke-width="12" stroke-linecap="round"/></g>' +
  '<g class="gg-artP"><circle cx="100" cy="144" r="12" fill="' + T.accent2 + '"/>' +
  '<line x1="100" y1="144" x2="144" y2="86" stroke="' + T.accent2 + '" stroke-width="4.5" stroke-linecap="round"/>' +
  '<circle cx="100" cy="144" r="4" fill="' + T.bg2 + '"/></g>'); } };

ART.vault = { label: '금고 — 두터운 도어와 다이얼. 자산·보안·신뢰', build: function (T) { return art(
  '<g class="gg-artP"><rect x="40" y="38" width="120" height="124" rx="12" ' + F(T, .14) + '/><rect x="40" y="38" width="120" height="124" rx="12" ' + S(T) + '/></g>' +
  '<g class="gg-artP"><circle cx="100" cy="100" r="42" fill="' + T.bg2 + '" stroke="' + T.accent2 + '" stroke-width="4"/>' +
  '<circle cx="100" cy="100" r="28" ' + F2(T, .2) + '/><circle cx="100" cy="100" r="28" ' + S2(T) + '/></g>' +
  '<g class="gg-artP"><line x1="100" y1="72" x2="100" y2="128" stroke="' + T.accent2 + '" stroke-width="4" stroke-linecap="round"/>' +
  '<line x1="72" y1="100" x2="128" y2="100" stroke="' + T.accent2 + '" stroke-width="4" stroke-linecap="round"/>' +
  '<circle cx="100" cy="100" r="8" fill="' + T.accent + '"/></g>'); } };

ART.telescope = { label: '망원경 — 비전과 지향. 전망·탐색·미래', build: function (T) { return art(
  '<g class="gg-artP"><path d="M100 114 L64 172 M100 114 L136 172 M100 114 L100 172" ' + S(T) + '/>' +
  '<circle cx="100" cy="114" r="6" fill="' + T.accent + '"/></g>' +
  '<g class="gg-artP"><polygon points="56,118 136,58 148,74 68,134" ' + F2(T, .2) + '/>' +
  '<polygon points="56,118 136,58 148,74 68,134" ' + S2(T) + '/>' +
  '<rect x="134" y="52" width="22" height="28" rx="4" fill="' + T.accent + '" transform="rotate(-37 145 66)"/></g>' +
  '<g class="gg-artP"><polygon points="166,42 168,48 174,50 168,52 166,58 164,52 158,50 164,48" fill="' + T.warn + '"/></g>'); } };

ART.keyUnlock = { label: '열쇠 — 자물쇠와 해제. 해결·접근·솔루션', build: function (T) { return art(
  '<g class="gg-artP"><path d="M78 94 V66 C78 50, 122 50, 122 66 V78" fill="none" stroke="' + T.accent + '" stroke-width="4" stroke-linecap="round"/>' +
  '<rect x="66" y="94" width="68" height="58" rx="8" ' + F(T, .15) + '/><rect x="66" y="94" width="68" height="58" rx="8" ' + S(T) + '/>' +
  '<circle cx="100" cy="120" r="5" fill="' + T.accent + '"/></g>' +
  '<g class="gg-artP"><circle cx="140" cy="56" r="14" fill="' + T.bg2 + '" stroke="' + T.accent2 + '" stroke-width="4"/>' +
  '<path d="M130 66 L94 102 M106 90 L114 98 M116 80 L124 88" stroke="' + T.accent2 + '" stroke-width="4" stroke-linecap="round"/></g>'); } };

ART.sparkleMagic = { label: '스파클 — 빛나는 다이아몬드 별무리. 혁신·창의·가치', build: function (T) { return art(
  '<g class="gg-artP"><path d="M100 24 Q100 80 50 100 Q100 100 100 156 Q100 100 150 100 Q100 80 100 24 Z" ' + F(T, .2) + '/>' +
  '<path d="M100 24 Q100 80 50 100 Q100 100 100 156 Q100 100 150 100 Q100 80 100 24 Z" ' + S(T) + '/></g>' +
  '<g class="gg-artP"><path d="M152 44 Q152 64 134 72 Q152 72 152 92 Q152 72 170 72 Q152 64 152 44 Z" fill="' + T.accent2 + '"/>' +
  '<path d="M48 126 Q48 140 34 146 Q48 146 48 160 Q48 146 62 146 Q48 140 48 126 Z" fill="' + T.accent2 + '" opacity=".8"/></g>'); } };

ART.pieChart3d = { label: '통계 — 입체 분할 섹터. 데이터·점유율·분석', build: function (T) { return art(
  '<g class="gg-artP"><ellipse cx="100" cy="116" rx="58" ry="32" ' + F(T, .1) + '/>' +
  '<path d="M100 100 L158 84 A58 30 0 1 1 94 44 L94 100 Z" ' + F(T, .22) + '/>' +
  '<path d="M100 100 L158 84 A58 30 0 1 1 94 44 L94 100 Z" ' + S(T) + '/></g>' +
  '<g class="gg-artP"><path d="M106 82 L154 52 A54 28 0 0 1 162 82 L106 100 Z" fill="' + T.accent2 + '" opacity=".85"/>' +
  '<path d="M106 82 L154 52 A54 28 0 0 1 162 82 L106 100 Z" ' + S2(T) + '/>' +
  '<path d="M106 100 L106 112 L162 94 L162 82 Z" fill="' + T.accent2 + '"/>' +
  '<path d="M106 100 L106 112 L162 94 L162 82 Z" ' + S2(T) + '/></g>'); } };

ART.flagPeak = { label: '정상 — 산봉우리와 깃발. 목표 달성·마일스톤', build: function (T) { return art(
  '<g class="gg-artP"><polygon points="30,166 100,56 170,166" ' + F(T, .14) + '/>' +
  '<polygon points="30,166 100,56 170,166" ' + S(T) + '/>' +
  '<line x1="100" y1="56" x2="100" y2="166" stroke="' + T.accent + '" stroke-width="2.5" opacity=".5"/></g>' +
  '<g class="gg-artP"><polygon points="100,56 100,100 134,166 170,166" ' + F2(T, .18) + '/>' +
  '<path d="M56 138 L84 122 L108 94 L128 72" stroke="' + T.accent2 + '" stroke-width="3" stroke-dasharray="4 6" fill="none"/></g>' +
  '<g class="gg-artP"><line x1="100" y1="56" x2="100" y2="24" ' + S2(T) + '/>' +
  '<polygon points="100,26 142,40 100,54" fill="' + T.accent2 + '"/></g>'); } };

ART.ecoLeaf = { label: '친환경 — 순환 링과 잎사귀. 지속가능성·ESG·자연', build: function (T) { return art(
  '<g class="gg-artP"><path d="M100 32 A68 68 0 1 1 42 128" fill="none" stroke="' + T.good + '" stroke-width="3.5" stroke-dasharray="8 6" opacity=".5"/>' +
  '<polygon points="34,116 46,128 34,136" fill="' + T.good + '"/></g>' +
  '<g class="gg-artP"><path d="M100 58 C140 58, 150 96, 144 142 C98 148, 58 138, 58 98 C58 74, 78 58, 100 58 Z" fill="' + T.good + '" opacity=".2"/>' +
  '<path d="M100 58 C140 58, 150 96, 144 142 C98 148, 58 138, 58 98 C58 74, 78 58, 100 58 Z" stroke="' + T.good + '" stroke-width="4" fill="none"/>' +
  '<path d="M60 140 Q100 114 136 72 M96 116 L120 120 M82 130 L98 140" stroke="' + T.good + '" stroke-width="3.5" stroke-linecap="round"/></g>'); } };

module.exports = { DECOR: DECOR, MARK: MARK, FRAME: FRAME, ART: ART, rng: rng };
