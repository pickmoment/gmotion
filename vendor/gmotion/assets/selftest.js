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
  [['gsapgraph.js', 1], ['runtime.js', 1], ['charts.js', 1], ['gm.js', 1], ['skins.js', 1]].forEach(function (f) {
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

  /* processFlow 의 화살표 — 순서가 설명이다. 단계 → 화살표(선 → 꺽쇠) → 다음 단계.
     함정 둘을 막아 둔다: marker-end 는 dash 를 타지 않아 처음부터 보이고,
     같은 path 의 두 번째 서브패스로 붙이면 SVG 가 dash 를 리셋해 선과 같이 그려진다. */
  var pf = { scenes: [{ pattern: 'processFlow', title: 't',
    steps: ['가', '나', '다', '라'] }] };
  var pfHtml = G.toHTML(pf, {});
  truthy('화살표에 marker-end 를 쓰지 않는다', pfHtml.indexOf('marker-end') < 0 && pfHtml.indexOf('<marker') < 0);
  var arrowPaths = (pfHtml.match(/<path class="gg-arrow"[^>]*>/g) || []);
  is('화살표 path 수(선 3 + 머리 3)', arrowPaths.length, 6);
  is('머리 path 수', arrowPaths.filter(function (t2) { return t2.indexOf('data-head') > 0; }).length, 3);
  var multiSub = arrowPaths.filter(function (t2) {
    return ((t2.match(/d="([^"]*)"/) || ['', ''])[1].match(/M/g) || []).length > 1;
  });
  is('서브패스가 여럿인 화살표 path', multiSub.length, 0);

  var pfTw = G.compile(pf).scenes[0].tw;
  /* `:not([data-head])` 안에도 `[data-head]` 가 들어 있다 — 부분일치로 찾으면 선을
     머리로 잘못 잡는다. 술어로 정확히 가른다. */
  function firstAt(pred) { var h = pfTw.filter(pred)[0]; return h ? h.at : null; }
  var st0 = firstAt(function (o) { return o.t.indexOf('.gg-step[data-i="0"]') >= 0; });
  var ln0 = firstAt(function (o) { return o.t.indexOf('[data-i="0"]') >= 0 && o.t.indexOf(':not([data-head])') >= 0; });
  var hd0 = firstAt(function (o) { return o.t.indexOf('[data-i="0"]') >= 0 && o.t.indexOf(':not(') < 0 && o.t.indexOf('[data-head]') >= 0; });
  var st1 = firstAt(function (o) { return o.t.indexOf('.gg-step[data-i="1"]') >= 0; });
  truthy('단계 → 화살표 선 → 꺽쇠 → 다음 단계 순서', st0 < ln0 && ln0 < hd0 && hd0 < st1,
    '실제 ' + [st0, ln0, hd0, st1].join(' → '));
  /* 꺽쇠가 다음 단계보다 늦게 시작하면 "화살표가 먼저" 로 안 읽힌다 */
  truthy('꺽쇠는 다음 단계가 오기 전에 시작한다', hd0 < st1);

  /* networkBuild 의 links — 하이픈이 든 라벨을 참조할 수 있어야 하고,
     못 찾은 참조는 조용히 사라지지 않아야 한다 */
  function linkCount(links, labels) {
    var h = G.toHTML({ scenes: [{ pattern: 'networkBuild',
      nodes: labels.map(function (l, i) { return { label: l, hub: i === 0 }; }), links: links }] }, {});
    return (h.match(/class="gg-link"/g) || []).length;
  }
  is('하이픈이 든 라벨을 > 로 잇는다', linkCount(['허브>link-w', '허브>flow-op'], ['허브', 'link-w', 'flow-op']), 2);
  is('하이픈 구분자 표기도 그대로', linkCount(['A-B', 'A-C'], ['A', 'B', 'C']), 2);
  is('공백 하이픈 표기도 그대로', linkCount(['A - B'], ['A', 'B']), 1);
  is('인덱스 쌍도 그대로', linkCount([[0, 1], [0, 2]], ['A', 'B', 'C']), 2);
  truthy('못 찾은 링크 참조는 경고한다',
    G.validate({ message: 'm', scenes: [{ pattern: 'networkBuild',
      nodes: [{ label: '허브', hub: true }, { label: '가' }], links: ['허브>없는노드'] }] })
      .warnings.join(' ').indexOf('없는노드') >= 0);

  /* 문서에 적은 개수가 실제와 맞는지 — 종류를 늘리면서 문서를 안 고치는 사고를 막는다.
     "테마 6종" 이라 적힌 표에 12행이 있고 실제로는 15종인 상태가 실제로 있었다.
     표 안의 항목 이름도 대조한다 — 개수만 맞추고 행을 안 넣으면 여전히 거짓말이다. */
  var DOCS = ['SKILL.md', 'MANUAL.md', 'references/spec.md', 'references/theming.md',
              'references/api.md', 'references/direction.md', 'references/charts.md'];
  var docText = {};
  DOCS.forEach(function (f) {
    var fp = path.join(__dirname, '..', f);
    docText[f] = fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : '';
  });
  var all = Object.keys(docText).map(function (f) { return docText[f]; }).join('\n');

  var COUNTS = [
    ['패턴', Object.keys(G.patterns).length],
    ['테마', Object.keys(G.themes).length],
    ['스킨', Object.keys(G.skins).length],
    ['폰트', Object.keys(G.fonts).length],
    ['트랜지션', Object.keys(G.transitions).length],
    ['화면비', Object.keys(G.aspects).length],
    ['에너지', Object.keys(G.energies).length],
    ['차트', Object.keys(G.charts).length],
    ['픽토그램', G.iconCount],
    ['배경 레이어', Object.keys(G.decors).length],
    ['강조 마크', Object.keys(G.marks).length],
    ['디바이스 프레임', Object.keys(G.frames).length],
    ['추상 일러스트', Object.keys(G.arts).length]
  ];
  /* 문서에 실린 **샘플 CLI 출력**은 재고 주장이 아니다 — "씬 7(패턴 7종)" 은 그 스펙의
     이야기일 뿐이다. 그 줄만 걸러낸다. 코드 블록 전체를 빼지는 않는다 —
     `gm info decor  # 배경 레이어 20종` 같은 주석은 검사해야 하는 주장이다. */
  function isSampleOutput(line) {
    return /씬\s*\d/.test(line) || /^\s*(✓|✗|OK|INFO|WARN|!)\s/.test(line);
  }
  var claimLines = all.split('\n').filter(function (l) { return !isSampleOutput(l); });
  var wrong = [];
  COUNTS.forEach(function (c) {
    claimLines.forEach(function (line) {
      var re = new RegExp(c[0] + '\\s*(\\d+)\\s*종', 'g'), m;
      while ((m = re.exec(line))) {
        if (parseInt(m[1], 10) !== c[1]) wrong.push(c[0] + ' ' + m[1] + '종 (실제 ' + c[1] + ')');
      }
    });
  });
  is('문서에 적힌 개수가 실제와 다른 곳', wrong.join(' · ') || '없음', '없음');

  /* 테마·스킨·트랜지션은 표로 나열하므로 이름이 다 적혀 있어야 한다 */
  [['테마', G.themes, 'MANUAL.md'], ['테마', G.themes, 'references/theming.md'],
   ['트랜지션', G.transitions, 'MANUAL.md'], ['스킨', G.skins, 'references/theming.md']
  ].forEach(function (t) {
    var missing = Object.keys(t[1]).filter(function (k) {
      return docText[t[2]].indexOf('`' + k + '`') < 0;
    });
    is(t[2] + ' 에 안 적힌 ' + t[0], missing.join(' ') || '없음', '없음');
  });

  /* 항목 필드 목록이 두 벌 있으면 한쪽만 고치는 사고가 난다 */
  var eng = fs.readFileSync(path.join(__dirname, 'gsapgraph.js'), 'utf8');
  var listCount = (eng.match(/'items',\s*'stats'|'items'\)\.concat\(arr\(sc\.nodes\)/g) || []).length;
  is('항목 필드 목록은 한 곳', listCount, 1);

  /* 씬 길이 계산이 흩어져 있으면 자막 모드에서 죽은 코드가 21벌 생긴다 */
  is('hold 계산은 sceneDur 한 곳', (eng.match(/num\(sc\.hold,/g) || []).length, 1);
}

/* ================================================================== *
 * 1-b2. 스킨 — 디자인 프리미티브의 인터페이스가 실제로 지켜지는지
 *
 * 가장 중요한 건 세 번째 검사다. 스타일시트가 읽는 변수 가운데 아무도 정의하지
 * 않는 것이 있으면 그 선언은 조용히 무효가 되고(초기값으로 떨어진다) 눈으로는
 * 잘 안 보인다. 계약 목록과 실제 사용을 대조해 그 사고를 막는다.
 * ================================================================== */
function skins() {
  console.log('스킨');
  var SK = require(path.join(__dirname, 'skins.js'));
  var T = { bg: '#0d1117', bg2: '#161b22', ink: '#e6edf3', ink2: '#9198a1', dim: '#6e7681',
            accent: '#58a6ff', accent2: '#7ee787', good: '#3fb950', warn: '#d29922', bad: '#f85149',
            line: 'rgba(1,1,1,.1)', panel: 'rgba(2,2,2,.5)', panelLine: 'rgba(3,3,3,.2)', glow: 1 };
  var A = { w: 1920, h: 1080 };

  /* 1. glass 는 계약의 모든 토큰을 정의한다 — 다른 스킨이 여기서 값을 물려받는다 */
  var g = SKINS_vars(SK, 'glass', T, A);
  var missing = Object.keys(SK.TOKENS).filter(function (k) { return !(k in g); });
  is('glass 가 정의하지 않은 토큰', missing.join(' ') || '없음', '없음');

  /* 2. 어떤 스킨을 골라도 토큰이 빠지지 않는다 (glass 로 채워진다) */
  var holes = [];
  Object.keys(SK.SKINS).forEach(function (name) {
    var v = SK.resolve(name, T, A).vars;
    Object.keys(SK.TOKENS).forEach(function (k) { if (!(k in v)) holes.push(name + '.' + k); });
  });
  is('스킨별 빠진 토큰', holes.join(' ') || '없음', '없음');

  /* 3. 스타일시트가 읽는 변수 중 아무도 정의하지 않는 것이 있는지 */
  var css = styleOf(G.toHTML({ scenes: [{ pattern: 'quote', text: 'x' }] }, {}));
  var THEME_VARS = ['bg','bg2','ink','ink2','dim','acc','acc2','good','warn','bad',
                    'line','panel','pline','font','mono','tight','kick'];
  var known = {};
  THEME_VARS.forEach(function (k) { known[k] = 1; });
  Object.keys(SK.TOKENS).forEach(function (k) { known[k] = 1; });
  var used = {}, m, re = /var\(--([a-zA-Z0-9-]+)\)/g;
  while ((m = re.exec(css))) used[m[1]] = 1;
  var orphan = Object.keys(used).filter(function (k) { return !known[k]; });
  is('정의되지 않은 변수를 읽는 곳', orphan.join(' ') || '없음', '없음');

  /* 4. 계약에는 있는데 아무도 안 읽는 토큰 — 죽은 토큰은 지우거나 규칙에 연결한다 */
  var dead = Object.keys(SK.TOKENS).filter(function (k) { return !used[k]; });
  is('스타일시트가 안 읽는 토큰', dead.join(' ') || '없음', '없음');

  /* 5. seam 이 살아 있다 — 스킨을 갈면 산출물이 달라진다 */
  var base = { scenes: [{ pattern: 'cardsCascade', items: ['가', '나'] }] };
  var a = styleOf(G.toHTML(base, {}));
  var b = styleOf(G.toHTML({ scenes: base.scenes, skin: 'brutalist' }, {}));
  truthy('스킨을 갈면 스타일시트가 달라진다', a !== b);
  truthy('brutalist 는 직각이 된다', b.indexOf('--r-lg:0px') > 0);

  /* 6. 테마가 기본 스킨을 정한다 (스펙이 없을 때만) */
  is('clay 테마의 기본 스킨', G.compile({ theme: 'clay', scenes: base.scenes }).skin, 'clay');
  is('스펙이 테마 기본을 덮어쓴다', G.compile({ theme: 'clay', skin: 'flat', scenes: base.scenes }).skin, 'flat');

  /* 7. 없는 스킨·토큰 오타는 오류로 잡는다 */
  var e1 = G.validate({ message: 'm', skin: '없는스킨', scenes: base.scenes }).errors.join(' ');
  truthy('없는 스킨은 오류', e1.indexOf('없는스킨') >= 0);
  var e2 = G.validate({ message: 'm', skin: { extends: 'flat', vars: { 'r-lgg': '1px' } }, scenes: base.scenes }).errors.join(' ');
  truthy('토큰 오타는 오류', e2.indexOf('r-lgg') >= 0);

  /* 8. 스펙에 인라인한 커스텀 스킨이 산출물에 실린다 — 파일 한 장으로 재현된다 */
  var cust = styleOf(G.toHTML({ scenes: base.scenes,
    skin: { extends: 'flat', name: '테스트', vars: { 'r-lg': '3px' }, css: ['.gg-card{outline:1px dashed red}'] } }, {}));
  truthy('인라인 스킨의 토큰이 실린다', cust.indexOf('--r-lg:3px') > 0);
  truthy('인라인 스킨의 추가 규칙이 실린다', cust.indexOf('outline:1px dashed red') > 0);

  /* ── 씬별 오버라이드 ────────────────────────────────────────────── */

  var mix = {
    theme: 'ink', skin: 'neon', scenes: [
      { pattern: 'cardsCascade', items: ['가', '나'] },
      { pattern: 'cardsCascade', skin: 'brutalist', items: ['다', '라'] },
      { pattern: 'cardsCascade', skin: { extends: 'flat', vars: { 'r-lg': '2px' }, css: ['&{outline:1px solid red}'] }, items: ['마', '바'] },
      { pattern: 'cardsCascade', skin: 'brutalist', items: ['사', '아'] },
      { pattern: 'cardsCascade', skin: 'neon', items: ['자', '차'] }
    ]
  };
  var mc = G.compile(mix), mh = G.toHTML(mix, {}), ms = styleOf(mh);

  /* 9. 같은 스킨을 쓰는 씬은 키를 공유한다 — 블록이 한 번만 실린다 */
  is('씬 스킨 키', mc.scenes.map(function (s2) { return s2.skin || '-'; }).join(' '), '- brutalist sk3 brutalist -');
  is('스코프 블록 수', Object.keys(mc.sceneSkins).length, 2);

  /* 10. 루트와 같은 스킨을 씬에 또 적은 것은 오버라이드가 아니다 */
  var secs = mh.match(/<section class="gg-scene"[^>]*>/g) || [];
  is('data-skin 을 받은 씬 수', secs.filter(function (t) { return t.indexOf('data-skin=') > 0; }).length, 3);

  /* 11. 토큰은 씬 스코프로 갈린다 */
  truthy('씬 스코프 토큰 블록', ms.indexOf('.gg-scene[data-skin="brutalist"]{--surf') > 0);
  truthy('인라인 씬 스킨도 스코프된다', ms.indexOf('.gg-scene[data-skin="sk3"]') > 0);
  /* 씬 블록은 전체 덤프가 아니라 루트와의 차이여야 한다 — 자막 토큰도 빠져 있다 */
  var brutBlock = (ms.match(/\.gg-scene\[data-skin="brutalist"\]\{([^}]*)\}/) || [])[1] || '';
  var brutDecls = brutBlock.split(';').filter(Boolean).length;
  truthy('씬 블록은 차이만 담는다 (' + brutDecls + '/' + Object.keys(SK.TOKENS).length + ')',
    brutDecls > 0 && brutDecls < Object.keys(SK.TOKENS).length);
  truthy('씬 블록에 자막 토큰이 없다', brutBlock.indexOf('--cc-') < 0);

  /* 12. 씬 스킨의 추가 규칙이 그 씬에만 갇힌다 — & 는 씬 뿌리를 뜻한다 */
  truthy('씬 규칙이 스코프된다', ms.indexOf('.gg-scene[data-skin="sk3"]{outline:1px solid red}') > 0);

  /* 13. 오버라이드가 있으면 루트 스킨의 추가 규칙도 스코프된다 —
         안 그러면 재질을 갈아 낀 씬에 두 스킨이 섞인다 */
  truthy('루트 규칙이 :not([data-skin]) 로 좁혀진다', ms.indexOf('.gg-scene:not([data-skin]) .gg-link') > 0);
  var noOverride = styleOf(G.toHTML({ theme: 'ink', skin: 'neon', scenes: [mix.scenes[0]] }, {}));
  truthy('오버라이드가 없으면 루트 규칙은 그대로', noOverride.indexOf(':not([data-skin])') < 0
    && noOverride.indexOf('.gg-link,.gg-arrow,.gg-flow,.gg-route{filter') > 0);

  /* 14. 자막은 씬 밖 무대 레이어다 — 씬 스킨의 자막 토큰은 싣지 않고 경고한다 */
  var ccScene = { message: 'm', scenes: [{ pattern: 'quote', text: 'x', skin: { extends: 'flat', vars: { 'cc-fill': '#123456' } } }] };
  truthy('씬 스킨의 자막 토큰은 안 실린다', styleOf(G.toHTML(ccScene, {})).indexOf('#123456') < 0);
  truthy('씬 스킨의 자막 토큰은 경고한다',
    G.validate(ccScene).warnings.join(' ').indexOf('자막 토큰') >= 0);

  /* 15. 씬 스킨의 오타도 잡는다 */
  truthy('씬 스킨 오타는 오류',
    G.validate({ message: 'm', scenes: [{ pattern: 'quote', text: 'x', skin: '없다' }] }).errors.join(' ').indexOf('씬 1') >= 0);
}
function SKINS_vars(SK, name, T, A) { return SK.SKINS[name].vars(T, A); }
function styleOf(html) { var m = html.match(/<style>([\s\S]*?)<\/style>/); return m ? m[1] : ''; }

/* ================================================================== *
 * 1-b3. 스펙에 인라인한 커스텀 디자인 요소
 *
 * 가장 중요한 건 격리 검사다. 레지스트리는 모듈 수준이라 등록을 되돌리지 않으면
 * 같은 프로세스의 **다음 빌드**에 남는다 — 앱은 타이핑마다 빌드하므로 조용히
 * 다른 스펙의 모습이 섞인다.
 * ================================================================== */
function inlineDesign() {
  console.log('인라인 디자인');
  var ICOm = require(path.join(__dirname, 'icons.js'));
  var VECm = require(path.join(__dirname, 'vectors.js'));
  var SKm = require(path.join(__dirname, 'skins.js'));

  var D = {
    themes: { myBrand: { label: '우리 브랜드', bg: '#0b1020', bg2: '#141b33', ink: '#eef2ff',
      ink2: '#a9b4d6', dim: '#7f8bb0', accent: '#ff7a45', accent2: '#3ddc97',
      good: '#3ddc97', warn: '#ffb020', bad: '#ff5470' } },
    skins: { myBrand: { extends: 'flat', vars: { 'r-lg': '4px' } } },
    icons: { myLogo: { path: 'M4 4 L20 4 L12 20 Z', aliases: ['우리로고'] } },
    arts: { myArt: { label: '우리 그림', svg: '<circle cx="100" cy="100" r="70" fill="{accent}"/>' } },
    marks: { myMark: { label: '우리 밑줄', where: 'under', svg: '<path d="M0 8 L100 6" stroke="{accent}"/>' } },
    decors: { myBg: { label: '우리 배경', svg: '<rect width="{W}" height="{H}" fill="{bg2}"/>' } },
    frames: { myFrame: { label: '우리 프레임', ratio: 1.6, svg: '<rect width="{W}" height="{H}" stroke="{ink}" fill="none"/>' } }
  };
  var spec = { message: 'm', theme: 'myBrand', skin: 'myBrand', design: D, decor: ['myBg'],
    scenes: [
      { pattern: 'cardsCascade', title: 't', mark: 'myMark',
        items: [{ label: '가', icon: 'myLogo' }, { label: '나', art: 'myArt' }] },
      { pattern: 'deviceShow', frame: 'myFrame', screen: { lines: ['$ x'] } }
    ] };

  /* 1. 검증을 통과한다 */
  var v = G.validate(spec);
  is('인라인 디자인 스펙의 오류', v.errors.join(' · ') || '없음', '없음');

  /* 2. 실제로 산출물에 실린다 — 이름만 참조하던 예전에는 기본값으로 떨어졌다 */
  var h = G.toHTML(spec, {});
  is('커스텀 테마가 적용된다', G.compile(spec).theme, 'myBrand');
  truthy('커스텀 테마 색이 실린다', h.indexOf('--acc:#ff7a45') > 0);
  truthy('커스텀 스킨 토큰이 실린다', h.indexOf('--r-lg:4px') > 0);
  truthy('커스텀 픽토그램 path 가 실린다', h.indexOf('M4 4 L20 4 L12 20 Z') > 0);
  truthy('커스텀 일러스트가 실린다', h.indexOf('circle cx="100"') > 0);
  truthy('커스텀 배경이 실린다', h.indexOf('gg-decor') > 0);

  /* 3. 격리 — 빌드가 끝나면 레지스트리가 원래대로다 */
  var leaks = [];
  if (G.themes.myBrand) leaks.push('theme');
  if (G.skins.myBrand) leaks.push('skin');
  if (ICOm.ICONS.myLogo) leaks.push('icon');
  if (ICOm.ALIAS['우리로고']) leaks.push('alias');
  if (VECm.ART.myArt) leaks.push('art');
  if (VECm.MARK.myMark) leaks.push('mark');
  if (VECm.DECOR.myBg) leaks.push('decor');
  if (VECm.FRAME.myFrame) leaks.push('frame');
  if (SKm.SKINS.myBrand) leaks.push('skinReg');
  is('빌드 뒤 레지스트리에 남은 것', leaks.join(' ') || '없음', '없음');

  /* 4. 기본 요소와 이름이 겹쳐도 빌드 뒤에 기본이 돌아온다 */
  var midBefore = G.themes.midnight;
  G.toHTML({ theme: 'midnight', design: { themes: { midnight: {
    label: '가짜', bg: '#000', bg2: '#111', ink: '#fff', ink2: '#ccc', dim: '#999',
    accent: '#f00', accent2: '#0f0', good: '#0f0', warn: '#ff0', bad: '#f00' } } },
    scenes: [{ pattern: 'quote', text: 'x' }] }, {});
  is('기본 테마를 덮어써도 되돌아온다', G.themes.midnight, midBefore);

  /* 5. 그 다음 빌드는 커스텀을 모른다 — 이게 안 되면 스펙 사이가 섞인다 */
  var after = G.validate({ message: 'm', theme: 'myBrand', scenes: [{ pattern: 'quote', text: 'x' }] });
  truthy('design 없는 스펙은 커스텀 테마를 모른다', after.errors.join(' ').indexOf('myBrand') >= 0);

  /* 6. 부실한 정의는 오류로 잡는다 */
  function errOf(d) {
    return G.validate({ message: 'm', design: d, scenes: [{ pattern: 'quote', text: 'x' }] }).errors.join(' ');
  }
  truthy('색이 빠진 테마는 오류', errOf({ themes: { x: { label: 'x', bg: '#000' } } }).indexOf('색이 없다') >= 0);
  truthy('svg 없는 일러스트는 오류', errOf({ arts: { x: { label: 'x' } } }).indexOf('svg 가 없다') >= 0);
  truthy('path 없는 픽토그램은 오류', errOf({ icons: { x: {} } }).indexOf('path 가 없다') >= 0);
  truthy('없는 갈래는 오류', errOf({ nope: {} }).indexOf('없는 갈래') >= 0);
  truthy('없는 where 는 오류', errOf({ marks: { x: { label: 'x', svg: '<g/>', where: 'sideways' } } }).indexOf('where') >= 0);

  /* 7. 스펙이 참조하는 이름을 찾아낸다 — 앱이 무엇을 담을지 정하는 근거 */
  var used = G.usedDesignNames(spec);
  is('참조 수집 — 테마', used.themes.join(' '), 'myBrand');
  is('참조 수집 — 픽토그램', used.icons.join(' '), 'myLogo');
  is('참조 수집 — 일러스트', used.arts.join(' '), 'myArt');
  is('참조 수집 — 마크', used.marks.join(' '), 'myMark');
  is('참조 수집 — 배경', used.decors.join(' '), 'myBg');
  is('참조 수집 — 프레임', used.frames.join(' '), 'myFrame');
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
  truthy('씬 래퍼가 실린다', withCC.indexOf('class="gg-scenes-wrap"') > 0);
  truthy('자막 활성 상태 data-cc 가 실린다', withCC.indexOf('data-cc="true"') > 0);
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
skins();
inlineDesign();
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
