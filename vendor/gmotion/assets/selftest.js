#!/usr/bin/env node
/*!
 * selftest — 엔진 회귀 검사
 *
 *   node selftest.js            검사한다
 *   node selftest.js --update   지금 결과를 기준값으로 삼는다 (의도한 변경 뒤에만)
 *   node selftest.js -v         차이를 자세히 본다
 *
 * 두 가지를 본다.
 *
 *   단위   — 파서·정렬·검증처럼 겉으로 안 드러나는 동작
 *   스냅샷 — 예제 9종을 컴파일한 결과(씬 수·총 길이·씬 시작 시각·트윈 수)를
 *            baseline 과 대조한다. 씬 시작 시각 배열이 가장 민감한 감지기다 —
 *            타이밍 계산을 건드리면 여기가 먼저 틀어진다.
 *
 * 구조를 바꾸는 작업 전에 반드시 통과시켜 두고, 바꾼 뒤 다시 돌린다.
 */
'use strict';
var fs = require('fs'), path = require('path');
var G = require(path.join(__dirname, 'gsapgraph.js'));

var EXDIR = path.join(__dirname, 'examples');
var BASE = path.join(__dirname, 'selftest.baseline.json');
var argv = process.argv.slice(2);
var UPDATE = argv.indexOf('--update') >= 0;
var VERBOSE = argv.indexOf('-v') >= 0 || argv.indexOf('--verbose') >= 0;

var pass = 0, fail = 0, notes = [];
function ok(name, detail) { pass++; if (VERBOSE) console.log('  ✓ ' + name + (detail ? '  ' + detail : '')); }
function bad(name, why) { fail++; console.log('  ✗ ' + name + '\n      ' + why); }
function is(name, got, want) {
  if (got === want) ok(name, String(got));
  else bad(name, '기대 ' + JSON.stringify(want) + ' · 실제 ' + JSON.stringify(got));
}
function truthy(name, v, why) { v ? ok(name) : bad(name, why || '거짓이다'); }

/* ================================================================== *
 * 1. 단위 — 겉으로 안 드러나는 동작
 * ================================================================== */
function unit() {
  console.log('단위');

  /* --- 자막 파서 --- */
  var srt = '1\n00:00:01,500 --> 00:00:04,000\n첫 문장입니다.\n\n' +
            '2\n00:00:04,000 --> 00:00:06,250\n<i>두 번째</i> 문장입니다.\n';
  var c = G.parseSubtitles(srt);
  is('SRT cue 수', c.length, 2);
  is('SRT 시작 시각', c[0].start, 1.5);
  is('SRT 끝 시각', c[1].end, 6.25);
  is('SRT 태그 제거', c[1].text, '두 번째 문장입니다.');

  var vtt = 'WEBVTT\n\n00:01.000 --> 00:03.000\nVTT 한 줄.\n\nNOTE 이건 주석\n';
  var v = G.parseSubtitles(vtt);
  is('VTT cue 수', v.length, 1);
  is('VTT 시작 시각', v[0].start, 1);
  is('VTT NOTE 무시', v[0].text, 'VTT 한 줄.');

  var hour = G.parseSubtitles('1\n01:02:03,400 --> 01:02:05,000\n시간 단위.\n');
  is('시간 단위 타임코드', hour[0].start, 3723.4);

  /* --- 씬 라벨: lines 가 객체여도 문자열이어야 한다 (과거 [object Object] 회귀) --- */
  var titled = G.compile({ scenes: [
    { pattern: 'kineticType', lines: [{ text: '객체 줄', emphasis: true }] },
    { pattern: 'kineticType', lines: ['문자열 줄'] }
  ] });
  is('lines 객체에서 제목 추출', titled.scenes[0].title, '객체 줄');
  is('lines 문자열에서 제목 추출', titled.scenes[1].title, '문자열 줄');

  /* --- validate 가 오류를 잡는가 --- */
  var badSpec = G.validate({ theme: 'nope', scenes: [{ pattern: 'nope2' }] });
  truthy('없는 theme 을 잡는다', badSpec.errors.some(function (e) { return e.indexOf('theme') >= 0; }));
  truthy('없는 pattern 을 잡는다', badSpec.errors.some(function (e) { return e.indexOf('pattern') >= 0; }));
  is('오류가 있으면 ok=false', badSpec.ok, false);

  var over = G.validate({ message: 'x', scenes: [{ pattern: 'dataCounter',
    stats: [{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }] }] });
  truthy('항목 상한 초과를 경고한다', over.warnings.some(function (w) { return w.indexOf('항목이') >= 0; }));

  /* --- 자막 동기화 --- */
  var syncSrt = '1\n00:00:00,000 --> 00:00:05,000\n첫째로 이렇게 했습니다.\n\n' +
                '2\n00:00:05,000 --> 00:00:10,000\n둘째로 저렇게 했습니다.\n\n' +
                '3\n00:00:10,000 --> 00:00:16,000\n셋째로 그렇게 했습니다.\n';
  var cues = G.parseSubtitles(syncSrt);
  var synced = G.compile({ scenes: [{
    pattern: 'processFlow',
    say: '첫째로 이렇게 했습니다. 둘째로 저렇게 했습니다. 셋째로 그렇게 했습니다.',
    steps: [
      { label: '하나', say: '첫째로 이렇게 했습니다.' },
      { label: '둘', say: '둘째로 저렇게 했습니다.' },
      { label: '셋', say: '셋째로 그렇게 했습니다.' }
    ]
  }] }, { cues: cues });
  var s0 = synced.scenes[0];
  is('자막 정렬 성공 수', synced.sync.matched, 1);
  is('씬 시작이 대사에 붙는다', s0.at, 0);
  is('씬 길이가 대사 길이', s0.dur, 16);

  /* 항목이 제 대사 시각으로 밀렸는가 — steps 의 data-i 트윈 시작을 본다 */
  function firstAtOf(tw, i) {
    var g = tw.filter(function (o) { return typeof o.t === 'string' && o.t.indexOf('data-i="' + i + '"') >= 0; });
    return g.length ? Math.min.apply(null, g.map(function (o) { return o.at; })) : null;
  }
  is('항목 0 등장', firstAtOf(s0.tw, 0), 0);
  is('항목 1 등장', firstAtOf(s0.tw, 1), 5);
  is('항목 2 등장', firstAtOf(s0.tw, 2), 10);

  /* say 가 자막의 연속 구간이 아니면 못 맞춘다고 말해야 한다 */
  var skipped = G.compile({ scenes: [{ pattern: 'quote', text: 'x',
    say: '전혀 다른 말을 적었습니다. 자막에 없는 문장입니다.' }] }, { cues: cues });
  is('안 맞는 say 는 건너뛴다', skipped.sync.matched, 0);
  truthy('건너뛴 이유를 남긴다', skipped.warnings.some(function (w) { return w.indexOf('맞추지 못했다') >= 0; }));

  /* 자막이 없으면 예전 방식대로 앞 씬에서 이어 잡는다 */
  var natural = G.compile({ scenes: [{ pattern: 'quote', text: 'a' }, { pattern: 'quote', text: 'b' }] });
  truthy('자막 없으면 sync 가 없다', natural.sync == null);
  truthy('자막 없으면 씬이 이어진다', natural.scenes[1].at > 0 && natural.scenes[1].at < natural.scenes[0].dur);

  /* --- 좌우형 앵커링 --- */
  var side = G.compile({ scenes: [{
    pattern: 'splitCompare',
    say: '첫째로 이렇게 했습니다. 둘째로 저렇게 했습니다.',
    left: { label: 'L', items: ['ㄱ'], say: '첫째로 이렇게 했습니다.' },
    right: { label: 'R', items: ['ㄴ'], say: '둘째로 저렇게 했습니다.' }
  }] }, { cues: cues });
  function firstSelAt(tw, sel) {
    var g = tw.filter(function (o) { return typeof o.t === 'string' && o.t.indexOf(sel) >= 0; });
    return g.length ? Math.min.apply(null, g.map(function (o) { return o.at; })) : null;
  }
  is('왼쪽 등장', firstSelAt(side.scenes[0].tw, '.gg-lt'), 0);
  is('오른쪽 등장', firstSelAt(side.scenes[0].tw, '.gg-rt'), 5);

  /* --- 항목 배열 이름이 한곳에서만 관리되는가 --- */
  var keys = G.itemKeys ? G.itemKeys() : null;
  if (keys) {
    truthy('itemKeys 가 노출된다', keys.length > 5);
    var probe = G.compile({ scenes: [{ pattern: 'cardsCascade', items: [{ label: 'a' }, { label: 'b' }] }] });
    truthy('항목 키 목록에 items 포함', keys.indexOf('items') >= 0);
    truthy('항목 키 목록에 lines 포함', keys.indexOf('lines') >= 0);
    void probe;
  } else {
    notes.push('itemKeys 가 아직 노출되지 않는다 — 항목 필드 목록이 두 곳에 중복돼 있을 수 있다.');
  }
}

/* ================================================================== *
 * 1-b. 소스 위생 — 사람이 못 보는 사이 조용히 깨지는 것들
 *
 * 자바스크립트는 같은 이름의 함수를 두 번 선언해도 말이 없다. 뒤엣것이
 * 앞엣것을 덮고, 앞 이름을 부르던 코드는 엉뚱한 함수를 부른다.
 * 2,700줄 한 파일에서는 이게 실제로 일어난다 — 한 번 겪었다.
 * ================================================================== */
function hygiene() {
  console.log('소스 위생');
  [['gsapgraph.js', 1], ['runtime.js', 1], ['charts.js', 1], ['gm.js', 1]].forEach(function (f) {
    var src = fs.readFileSync(path.join(__dirname, f[0]), 'utf8');
    var seen = {}, dup = [];
    /* runtime.js 는 IIFE 한 겹 안이 사실상 최상위라 두 칸 들여쓰기까지 본다 */
    var re = /^ {0,2}function ([a-zA-Z_$][\w$]*)\s*\(/gm, m;
    while ((m = re.exec(src))) {
      if (seen[m[1]]) dup.push(m[1]);
      seen[m[1]] = 1;
    }
    if (dup.length) bad(f[0] + ' 함수 이름 중복', dup.join(', ') + ' — 뒤엣것이 앞엣것을 덮는다');
    else ok(f[0] + ' 함수 이름 유일', Object.keys(seen).length + '개');
  });

  /* 항목 필드 목록이 두 벌 있으면 한쪽만 고치는 사고가 난다 */
  var eng = fs.readFileSync(path.join(__dirname, 'gsapgraph.js'), 'utf8');
  var listCount = (eng.match(/'items',\s*'stats'|'items'\)\.concat\(arr\(sc\.nodes\)/g) || []).length;
  is('항목 필드 목록은 한 곳', listCount, 1);

  /* 씬 길이 계산이 흩어져 있으면 자막 모드에서 죽은 코드가 21벌 생긴다 */
  is('hold 계산은 sceneDur 한 곳', (eng.match(/num\(sc\.hold,/g) || []).length, 1);
}

/* ================================================================== *
 * 1-c. 대비 — 읽히지 않는 색은 예쁠 수 없다
 *
 * 테마의 글자색이 배경에서 실제로 읽히는지 WCAG 대비비로 잰다.
 * dim 은 장식이 아니라 카드 설명·단계 설명에 쓰는 본문색이라 4.5 를 지켜야 한다.
 * 색을 손볼 때 이 검사를 통과시키면 "예쁘지만 안 읽히는" 팔레트가 들어오지 않는다.
 * ================================================================== */
function contrast() {
  console.log('대비');
  function hx(c) {
    c = c.replace('#', '');
    if (c.length === 3) c = c.split('').map(function (x) { return x + x; }).join('');
    return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
  }
  function lum(rgb) {
    var a = rgb.map(function (v) {
      v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function cr(a, b) {
    var l1 = lum(hx(a)), l2 = lum(hx(b));
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
  var MIN = { ink: 12, ink2: 6, dim: 4.5, accent: 4.5, accent2: 4.5, good: 4.5, warn: 4.5, bad: 4.5 };
  var T = G.themeColors ? G.themeColors() : null;
  if (!T) { notes.push('themeColors 가 노출되지 않아 대비를 재지 못했다.'); return; }
  var light = 0, dark = 0;
  Object.keys(T).forEach(function (name) {
    var t = T[name], worst = null;
    Object.keys(MIN).forEach(function (k) {
      var v = cr(t[k], t.bg);
      if (v < MIN[k] && (!worst || v < worst.v)) worst = { k: k, v: v, need: MIN[k] };
    });
    if (worst) bad('대비 ' + name, worst.k + ' 가 ' + worst.v.toFixed(2) +
      ' (필요 ' + worst.need + ') — 배경 ' + t.bg + ' 위에서 안 읽힌다');
    else ok('대비 ' + name);
    lum(hx(t.bg)) > 0.4 ? light++ : dark++;
  });
  truthy('라이트 팔레트가 셋 이상', light >= 3, '라이트가 ' + light + '종뿐이다 — 발표·리포트에 쓸 게 없다');
  truthy('다크 팔레트가 셋 이상', dark >= 3, '다크가 ' + dark + '종뿐이다');
}

/* ================================================================== *
 * 2. 스냅샷 — 예제를 컴파일한 결과가 그대로인가
 * ================================================================== */
function shotOf(spec, cues) {
  var c = G.compile(spec, cues ? { cues: cues } : undefined);
  return {
    scenes: c.scenes.length,
    total: c.total,
    tweens: c.scenes.reduce(function (a, s) { return a + s.tw.length; }, 0),
    icons: c.icons.length,
    errors: c.errors.length,
    ats: c.scenes.map(function (s) { return s.at; }),
    durs: c.scenes.map(function (s) { return s.dur; })
  };
}

function diff(a, b) {
  var out = [];
  Object.keys(b).forEach(function (k) {
    var x = a[k], y = b[k];
    if (Array.isArray(y)) {
      if (!Array.isArray(x) || x.length !== y.length || x.some(function (v, i) { return v !== y[i]; })) {
        out.push(k + ': 기준 [' + y.join(' ') + '] → 지금 [' + (Array.isArray(x) ? x.join(' ') : x) + ']');
      }
    } else if (x !== y) out.push(k + ': 기준 ' + y + ' → 지금 ' + x);
  });
  return out;
}

function snapshot() {
  console.log('스냅샷');
  var base = {};
  if (!UPDATE) {
    if (!fs.existsSync(BASE)) {
      console.log('  기준값이 없다 — node selftest.js --update 로 만든다.');
      return null;
    }
    base = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  }
  var now = {};

  fs.readdirSync(EXDIR).filter(function (f) { return /\.json$/.test(f); }).sort().forEach(function (f) {
    var name = f.replace(/\.json$/, '');
    var spec = JSON.parse(fs.readFileSync(path.join(EXDIR, f), 'utf8'));

    /* 자막이 옆에 있으면 그것까지 스냅샷한다 */
    var srtPath = path.join(EXDIR, name + '.srt');
    var cues = fs.existsSync(srtPath) ? G.parseSubtitles(fs.readFileSync(srtPath, 'utf8')) : null;

    now[name] = shotOf(spec);
    if (cues) now[name + ' +subs'] = shotOf(spec, cues);
  });

  Object.keys(now).forEach(function (k) {
    var s = now[k];
    if (s.errors) { bad(k, '컴파일 오류 ' + s.errors + '건'); return; }
    if (UPDATE) { ok(k, s.scenes + '씬 ' + s.total + 's 트윈' + s.tweens); return; }
    if (!base[k]) { bad(k, '기준값에 없다 — --update 가 필요하다'); return; }
    var d = diff(s, base[k]);
    if (d.length) bad(k, d.join('\n      '));
    else ok(k, s.scenes + '씬 ' + s.total + 's 트윈' + s.tweens);
  });

  Object.keys(base).forEach(function (k) {
    if (!now[k]) bad(k, '기준값에는 있는데 지금은 없다 — 예제가 사라졌나?');
  });

  return now;
}

/* ================================================================== *
 * 3. 산출물 — 실제로 HTML 이 나오고 정책을 지키는가
 * ================================================================== */
function output() {
  console.log('산출물');
  var spec = JSON.parse(fs.readFileSync(path.join(EXDIR, 'starter-story.json'), 'utf8'));
  var html = G.toHTML(spec, {});
  truthy('HTML 이 나온다', html.length > 50000, '너무 짧다: ' + html.length);
  truthy('lang="ko"', /<html lang="ko">/.test(html));
  truthy('GSAP 인라인', html.indexOf('gsap.registerPlugin') > 0);
  truthy('검수 API', /window\.GGM/.test(html));
  truthy('감소 모션 대응', /prefers-reduced-motion/.test(html));
  truthy('외부 스크립트 없음', !/<script[^>]+src="(?!https:\/\/cdn\.jsdelivr)/.test(html));
  truthy('발표자 노트가 일반 빌드에 없다', html.indexOf('"notes"') < 0);

  var pres = G.toHTML(JSON.parse(fs.readFileSync(path.join(EXDIR, 'starter-report.json'), 'utf8')), { present: true });
  truthy('발표 빌드에는 노트가 있다', pres.indexOf('"notes"') > 0);

  var cdn = G.toHTML(spec, { cdn: true });
  truthy('--cdn 이 GSAP 을 뺀다', cdn.length < html.length - 100000,
    '차이가 ' + Math.round((html.length - cdn.length) / 1024) + 'KB 뿐이다');

  /* 자막·음성 */
  var nspec = JSON.parse(fs.readFileSync(path.join(EXDIR, 'starter-narrated.json'), 'utf8'));
  var ncues = G.parseSubtitles(fs.readFileSync(path.join(EXDIR, 'starter-narrated.srt'), 'utf8'));
  var withCC = G.toHTML(nspec, { cues: ncues, captions: ncues });
  truthy('자막 레이어가 실린다', withCC.indexOf('id="gg-cc"') > 0);
  truthy('자막 데이터가 실린다', withCC.indexOf('"captions"') > 0);
  truthy('음성 없이는 audio 태그가 없다', withCC.indexOf('id="gg-audio"') < 0);

  var withAudio = G.toHTML(nspec, { cues: ncues, audioSrc: 'data:audio/mpeg;base64,AAAA' });
  truthy('음성이 실린다', withAudio.indexOf('id="gg-audio"') > 0);
  truthy('음성 설정이 실린다', withAudio.indexOf('"audio"') > 0);

  /* --- 폰트 --- */
  var FT = G.fonts;
  truthy('폰트 목록이 노출된다', Object.keys(FT).length >= 8);
  Object.keys(FT).forEach(function (k) {
    var h = G.toHTML({ scenes: [{ pattern: 'quote', text: '가나다' }], font: k }, {});
    var linked = /fonts\.googleapis\.com|cdn\.jsdelivr\.net/.test(h);
    if (!linked) bad('폰트 ' + k + ' 링크', '웹폰트 링크가 없다 — 시스템 폰트로 떨어진다');
    else if (h.indexOf('--font:') < 0) bad('폰트 ' + k + ' 변수', '--font 가 없다');
    else ok('폰트 ' + k);
  });
  var noF = G.toHTML({ scenes: [{ pattern: 'quote', text: 'x' }], font: 'impact' }, { noFonts: true });
  truthy('--no-fonts 면 링크가 없다', !/fonts\.googleapis\.com/.test(noF));

  var badFont = G.validate({ message: 'x', font: 'nope', scenes: [{ pattern: 'quote', text: 'x' }] });
  truthy('없는 font 를 잡는다', badFont.errors.some(function (e) { return e.indexOf('font') >= 0; }));

  /* 고정폭은 터미널이 있을 때만 */
  var plain = G.toHTML({ scenes: [{ pattern: 'quote', text: 'x' }] }, {});
  var term = G.toHTML({ scenes: [{ pattern: 'deviceShow', frame: 'terminal',
    screen: { lines: ['$ ls'] } }] }, {});
  truthy('터미널 없으면 고정폭을 안 받는다', plain.indexOf('Nanum+Gothic+Coding') < 0);
  truthy('터미널이 있으면 고정폭을 받는다', term.indexOf('Nanum+Gothic+Coding') > 0);

  /* 테마 기본 폰트는 그대로 (기존 산출물과 톤이 달라지면 안 된다) */
  var themed = G.toHTML({ scenes: [{ pattern: 'quote', text: 'x' }], theme: 'ink' }, {});
  truthy('테마 기본 폰트 유지', themed.indexOf('Nanum Myeongjo') > 0);

  /* 타임코드 시트 */
  var csv = G.timing(spec, 30);
  truthy('CSV 헤더', csv.split('\n')[0].indexOf('씬') === 0);
  is('CSV 줄 수(헤더+씬+합계)', csv.trim().split('\n').length, spec.scenes.length + 2);
}

/* ================================================================== *
 * 실행
 * ================================================================== */
var t0 = process.hrtime();
unit();
hygiene();
contrast();
var now = snapshot();
output();
var dt = process.hrtime(t0);

if (UPDATE && now) {
  fs.writeFileSync(BASE, JSON.stringify(now, null, 2) + '\n');
  console.log('\n기준값을 갱신했다 — ' + path.basename(BASE) + ' (' + Object.keys(now).length + '건)');
}
notes.forEach(function (n) { console.log('\n  ! ' + n); });

var secs = (dt[0] + dt[1] / 1e9).toFixed(2);
console.log('\n' + (fail ? '✗ 실패 ' + fail + '건 · ' : '✓ ') + '통과 ' + pass + '건 · ' + secs + '초');
process.exit(fail ? 1 : 0);
