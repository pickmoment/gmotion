#!/usr/bin/env node
/*!
 * gm — gmotion 스킬 CLI
 *
 *   node gm.js validate <spec.json> [--subs voice.srt]
 *   node gm.js build    <spec.json> [-o out.html] [--clean] [--cdn] [--no-fonts] [--present]
 *                                   [--subs voice.srt] [--audio voice.mp3] [--captions]
 *                                   (design 의 image 가 로컬 경로면 스펙 파일 기준으로 data URI 인라인)
 *   node gm.js timing   <spec.json> [-o out.csv] [--fps 30] [--subs voice.srt]
 *   node gm.js info     [patterns|themes|skins|fonts|trans|textfx|exitfx|numfx|cam|energy|motion|aspects|tokens|decor|mark|frame|art|chart]
 *   node gm.js pattern  <이름>            패턴 하나의 필드와 용도
 *   node gm.js icons    [검색어]          픽토그램 238종 찾기 (한글 이름 지원)
 *   node gm.js check    <out.html>        산출물 기계 검수 (자기 선언 금지)
 *   node gm.js test     [--update] [-v]    엔진 회귀 검사 (스킬을 고친 뒤 돌린다)
 *
 *   --subs <f>   자막(SRT·VTT)으로 씬 타이밍을 실측으로 맞춘다 (씬에 say 가 있어야 한다)
 *   --audio <f>  음성을 산출물에 심는다. 재생하면 목소리가 시계를 잡는다
 *   --captions   화면 자막을 얹는다 (--subs 와 함께). 화면 맨 아래에 붙는다 —
 *                보는 쪽에서 C 키·플레이어 CC 버튼·?cc=0 으로 끌 수 있다
 *                (--present 산출물에는 실리지 않는다 — 말은 발표자가 한다)
 *   --no-captions  스펙의 media.captions 가 켜져 있어도 화면 자막을 뺀다
 *   --no-inline-audio  음성을 파일 안에 넣지 않고 경로로 참조한다 (HTML 옆에 둔다)
 *   --present    발표용으로 출력 — 씬 단위 진행 + 발표자 창(?presenter=1). 화면 자막은 빠진다
 *   --clean      플레이어 UI 없이 출력 (녹화·캡처용)
 *   --cdn        GSAP 을 인라인하지 않고 CDN 으로 건다 (파일이 146KB 가벼워진다)
 *   --no-fonts   폰트 CDN 을 걸지 않는다 (완전 오프라인)
 *
 *   스펙이 경로를 들고 다닐 수 있다 — 플래그를 매번 적지 않아도 된다.
 *     "media": { "subs": "intro.srt", "audio": "intro.mp3", "captions": true }
 *   상대경로는 스펙 파일이 있는 폴더 기준이다. 플래그를 주면 플래그가 이긴다.
 */
'use strict';
var fs = require('fs'), path = require('path');
var G = require(path.join(__dirname, 'gsapgraph.js'));

var argv = process.argv.slice(2), cmd = argv.shift(), flags = {}, files = [];
/* 위 사용법에 있는 것만 받는다 — 오타(--presnt)를 조용히 삼키면 뜻과 다른 파일이 나가도 아무도 모른다 */
var FLAGS = ['out', 'fps', 'subs', 'audio', 'clean', 'cdn', 'no-fonts', 'present', 'captions', 'no-captions',
             'no-inline-audio', 'update', 'verbose', 'help'];
for (var i = 0; i < argv.length; i++) {
  var a = argv[i];
  if (a === '-o' || a === '--out') flags.out = argv[++i];
  else if (a === '--fps') flags.fps = parseFloat(argv[++i]);
  else if (a === '--subs') flags.subs = argv[++i];
  else if (a === '--audio') flags.audio = argv[++i];
  else if (a.slice(0, 2) === '--') {
    if (FLAGS.indexOf(a.slice(2)) < 0) { console.error('그런 플래그는 없다: ' + a); usage(1); }
    flags[a.slice(2).replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); })] = true;
  }
  else files.push(a);
}
/** 사용법(파일 머리의 주석). 잘못 부른 경우(code≠0)는 stderr 로 — stdout 을 파이프로 받는 쪽에 섞이지 않는다 */
function usage(code) {
  (code ? process.stderr : process.stdout).write(fs.readFileSync(__filename, 'utf8').split('*/')[0].split('/*!')[1] + '\n');
  process.exit(code || 0);
}
function readSpec(f) {
  if (!f) { console.error('스펙 파일이 없다.'); process.exit(1); }
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { console.error('JSON 파싱 실패: ' + e.message); process.exit(1); }
}
/** 자막을 읽어 cue 로 만든다. 없으면 null. */
function readCues(f) {
  if (!f) return null;
  if (!fs.existsSync(f)) { console.error('자막 파일이 없다: ' + f); process.exit(1); }
  var cues = G.parseSubtitles(fs.readFileSync(f, 'utf8'));
  if (!cues.length) { console.error('자막에서 cue 를 찾지 못했다 (SRT · VTT 형식인지 확인한다): ' + f); process.exit(1); }
  return cues;
}
/** 음성을 data URI 로. --no-inline-audio 면 경로를 그대로 쓴다. */
function audioSrcOf(f, out, inline) {
  if (!f) return null;
  if (!fs.existsSync(f)) { console.error('음성 파일이 없다: ' + f); process.exit(1); }
  if (!inline) return path.relative(path.dirname(path.resolve(out)), path.resolve(f)) || f;
  var ext = path.extname(f).slice(1).toLowerCase();
  var mime = { mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac',
               wav: 'audio/wav', ogg: 'audio/ogg', opus: 'audio/ogg', webm: 'audio/webm' }[ext] || 'audio/mpeg';
  return 'data:' + mime + ';base64,' + fs.readFileSync(f).toString('base64');
}
/**
 * 자막·음성을 어디서 읽을지 정한다. 명령줄 플래그가 스펙의 `media` 를 이긴다.
 * 스펙에 적힌 상대경로는 **스펙 파일이 있는 폴더 기준**으로 푼다(design 의 image 와 같은
 * 규칙) — 어느 폴더에서 실행하든 같은 파일을 가리킨다. 플래그는 셸에서 준 것이므로
 * 현재 폴더 기준 그대로 쓴다.
 */
function mediaFrom(spec, specFile, flags) {
  var M = G.media(spec), base = path.dirname(path.resolve(specFile || '.'));
  var subs = flags.subs || (M.subs ? path.resolve(base, M.subs) : null);
  var audio = flags.audio || (M.audio ? path.resolve(base, M.audio) : null);
  var fromSpec = [];
  if (!flags.subs && M.subs) fromSpec.push('자막 ' + M.subs);
  if (!flags.audio && M.audio) fromSpec.push('음성 ' + M.audio);
  return {
    subs: subs, audio: audio,
    captions: flags.captions ? true : (flags.noCaptions ? false : M.captions),
    fromSpec: fromSpec
  };
}

/**
 * design.arts·decors 의 image 가 로컬 경로면 스펙 파일 기준으로 찾아 data URI 로 인라인한다.
 * data:·http(s): 는 그대로 둔다. 파일이 없으면 여기서 멈춘다 — 빈 그림이 조용히 나가면 안 된다.
 * 돌려주는 값: 인라인한 [{ at, bytes }] 목록 (빌드 결과 보고용).
 */
function inlineDesignImages(spec, specFile) {
  var design = spec && spec.design, inlined = [];
  if (!design || typeof design !== 'object') return inlined;
  var MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
               gif: 'image/gif', avif: 'image/avif', svg: 'image/svg+xml' };
  ['arts', 'decors'].forEach(function (kind) {
    var bag = design[kind];
    if (!bag || typeof bag !== 'object') return;
    Object.keys(bag).forEach(function (k) {
      var d = bag[k];
      if (!d || typeof d.image !== 'string' || /^(data:|https?:)/i.test(d.image)) return;
      var f = path.resolve(path.dirname(path.resolve(specFile)), d.image);
      if (!fs.existsSync(f)) {
        console.error('이미지 파일이 없다: design.' + kind + '.' + k + '.image → ' + d.image + ' (스펙 파일 기준)');
        process.exit(1);
      }
      var ext = path.extname(f).slice(1).toLowerCase();
      var buf = fs.readFileSync(f);
      d.image = 'data:' + (MIME[ext] || 'image/png') + ';base64,' + buf.toString('base64');
      inlined.push({ at: 'design.' + kind + '.' + k, bytes: buf.length });
    });
  });
  return inlined;
}

function report(v) {
  v.errors.forEach(function (e) { console.error('  ✗ ' + e); });
  v.warnings.forEach(function (w) { console.error('  ! ' + w); });
  if (v.ok) {
    var s = v.stats;
    console.error('  ✓ 씬 ' + s.scenes + '(패턴 ' + s.patterns + '종) · ' + s.totalSec + '초 · ' + s.frames + '프레임 · ' +
      s.theme + ' · ' + s.aspect + ' · ' + s.energy + ' · ' + s.mode + ' · 트윈 ' + s.tweens);
    if (v.sync) {
      console.error('    자막에 맞춤 — ' + v.sync.matched + '/' + v.scenes.length + '씬' +
        (v.sync.skipped.length ? ' · 못 맞춘 씬 ' + v.sync.skipped.length + '개' : ''));
    }
    console.error('    ' + v.scenes.map(function (x) {
      return '[' + x.n + '] ' + x.at + 's ' + x.pattern + '(' + x.dur + 's)' +
        (x.n > 1 ? ' ←' + x.trans : '') +
        (x.matched != null ? '  자막 ' + Math.round(x.matched * 100) + '%' : '') +
        (x.ts && x.ts !== 1 ? ' ⇥' + x.ts + '배압축' : '');
    }).join('\n    '));
  }
  return v.ok;
}
if (!cmd || flags.help || cmd === 'help') usage(cmd ? 0 : 1);

/* 엔진을 고쳤으면 이걸 통과시킨다. 예제를 컴파일한 결과를 기준값과 대조하므로
   타이밍 계산을 건드리면 바로 드러난다. --update 는 의도한 변경 뒤에만. */
if (cmd === 'test') { require(path.join(__dirname, 'selftest.js')); return; }

if (cmd === 'validate') {
  var vspec = readSpec(files[0]);
  inlineDesignImages(vspec, files[0]);   /* 빌드와 같은 눈으로 본다 — 없는 파일은 여기서 걸린다 */
  var vmedia = mediaFrom(vspec, files[0], flags);
  var vcues = readCues(vmedia.subs);
  if (vmedia.fromSpec.length) console.error('  media 에서 읽었다 — ' + vmedia.fromSpec.join(' · '));
  process.exit(report(G.validate(vspec, { cues: vcues,
                                          captions: vmedia.captions && vcues ? vcues : null })) ? 0 : 1);
}

if (cmd === 'build') {
  var spec = readSpec(files[0]);
  var media = mediaFrom(spec, files[0], flags);
  var cues = readCues(media.subs);
  var images = inlineDesignImages(spec, files[0]);
  if (media.fromSpec.length) console.error('  media 에서 읽었다 — ' + media.fromSpec.join(' · '));
  if (!cues && (media.audio || media.captions)) {
    console.error('  ! 음성·화면 자막은 자막(--subs 또는 media.subs)과 함께 쓴다 — 소리는 실측인데 화면이 추정이면 어긋난다.');
  }
  if (flags.present && media.captions) {
    console.error('  ! --present 산출물에는 화면 자막이 실리지 않는다 — 말은 발표자가 한다. 타이밍 정렬만 적용된다.');
  }
  var v = G.validate(spec, { cues: cues, captions: media.captions && cues ? cues : null });
  if (!report(v)) { console.error('  → 오류를 고치고 다시 빌드한다.'); process.exit(1); }
  var out = flags.out || files[0].replace(/\.json$/, '') + '.html';
  var html = G.toHTML(spec, { clean: !!flags.clean, cdn: !!flags.cdn, noFonts: !!flags.noFonts,
                              present: !!flags.present, cues: cues,
                              captions: media.captions && cues ? cues : null,
                              audioSrc: audioSrcOf(media.audio, out, !flags.noInlineAudio) });
  fs.writeFileSync(out, html);
  console.error('  → ' + out + ' (' + Math.round(html.length / 1024) + 'KB)' + (flags.present ? ' [발표용]' : ''));
  if (images.length) {
    console.error('    이미지 ' + images.length + '장 ' +
      (images.reduce(function (s, x) { return s + x.bytes; }, 0) / 1048576).toFixed(1) +
      'MB 를 HTML 안에 넣었다 (' + images.map(function (x) { return x.at; }).join(' · ') + ')');
  }
  if (media.audio) {
    console.error('    음성 ' + (flags.noInlineAudio
      ? '경로 참조 — ' + media.audio + ' 를 HTML 옆에 둔다'
      : (fs.statSync(media.audio).size / 1048576).toFixed(1) + 'MB 를 HTML 안에 넣었다'));
  }
  if (flags.present) {
    console.error('    조작: → / Space 다음 · ← 이전 · 숫자키 점프 · R 이 씬 다시 · B 검은 화면 · O 씬 목록');
    console.error('          P 발표자 창 열기 (팝업이 막히면 주소에 ?presenter=1 을 붙여 직접 연다)');
    console.error('          F 전체화면 — 프로젝터 쪽을 전체화면으로 두고 발표자 창은 노트북에 둔다');
  } else {
    console.error('    검수: ?scene=<n> 으로 씬별 정지 · ?t=<초> 로 시점 정지 · ?paused=1 · ?motion=off(감소모션)');
  }
  process.exit(0);
}

if (cmd === 'timing') {
  var spec2 = readSpec(files[0]);
  var csv = G.timing(spec2, flags.fps || 30, { cues: readCues(mediaFrom(spec2, files[0], flags).subs) });
  if (flags.out) { fs.writeFileSync(flags.out, csv); console.error('  → ' + flags.out); }
  else process.stdout.write(csv + '\n');
  process.exit(0);
}

if (cmd === 'pattern') {
  var p = G.patterns[files[0]];
  if (!p) {
    console.error('그런 패턴은 없다. 있는 것: ' + Object.keys(G.patterns).join(' '));
    process.exit(1);
  }
  console.log(files[0] + ' — ' + p.label);
  console.log('  용도: ' + p.use);
  console.log('  필드: ' + p.fields);
  console.log('  공통: id · purpose · hold(초) · transition · title · kicker · sub');
  if (p.max) console.log('  항목 상한: ' + p.max + '개 (넘으면 씬을 나눈다)');
  process.exit(0);
}

if (cmd === 'info') {
  var topic = files[0];
  if (topic === 'vectors') topic = 'decor';
  /* 헤더 사용법과 같은 목록 — 모르는 토픽이 빈 출력으로 성공(exit 0)하면 스크립트가 빈 값을 믿는다 */
  var TOPICS = ['patterns', 'themes', 'skins', 'fonts', 'trans', 'textfx', 'exitfx', 'numfx', 'cam', 'energy', 'motion', 'aspects',
                'tokens', 'decor', 'mark', 'frame', 'art', 'chart'];
  if (topic && TOPICS.indexOf(topic) < 0) {
    console.error('그런 info 토픽은 없다: ' + topic + ' (있는 것: ' + TOPICS.join(' ') + ')');
    process.exit(1);
  }
  function dump(name, obj) {
    console.log('## ' + name);
    Object.keys(obj).forEach(function (k) { console.log('  ' + k.padEnd(17) + obj[k]); });
    console.log('');
  }
  if (!topic || topic === 'patterns') {
    console.log('## 씬 패턴 ' + Object.keys(G.patterns).length + '종');
    Object.keys(G.patterns).forEach(function (k) {
      var p = G.patterns[k];
      console.log('  ' + k.padEnd(17) + p.label + ' — ' + p.use);
      console.log('  ' + ''.padEnd(17) + '필드: ' + p.fields);
    });
    console.log('');
  }
  if (topic === 'decor') { dump('배경·분위기 레이어 (씬 decor / 루트 decor · 배열로 겹칠 수 있다)', G.decors); process.exit(0); }
  if (topic === 'mark') { dump('강조 마크 (씬 mark · 항목 badge/ribbon)', G.marks); process.exit(0); }
  if (topic === 'frame') { dump('디바이스 프레임 (deviceShow 의 frame)', G.frames); process.exit(0); }
  if (topic === 'art') { dump('추상 일러스트 (씬 art · 항목 art · screen.art)', G.arts); process.exit(0); }
  if (topic === 'skins') {
    console.log('## 스킨 ' + Object.keys(G.skins).length + '종  (루트 skin 필드. 테마와 직교한다)');
    Object.keys(G.skins).forEach(function (k) { console.log('  ' + k.padEnd(12) + G.skins[k]); });
    console.log('');
    console.log('## 디자인 프리미티브 — 스킨이 정하는 값. 커스텀 스킨의 vars 에 이 이름을 쓴다');
    var TK = G.designTokens;
    Object.keys(TK).forEach(function (k) { console.log('  ' + k.padEnd(15) + TK[k]); });
    console.log('');
    console.log('예) 스펙에 인라인 커스텀 스킨');
    console.log('  "skin": { "extends": "flat", "name": "우리 브랜드",');
    console.log('            "vars": { "r-lg": "4px", "surf-lw": "2px" },');
    console.log('            "css": [".gg-card{text-transform:uppercase}"] }');
    console.log('');
    console.log('예) 씬별 오버라이드 — 그 씬만 재질이 달라진다 (자막 뱃지는 안 바뀐다)');
    console.log('  { "pattern": "cardsCascade", "skin": "brutalist", "items": [ ... ] }');
    process.exit(0);
  }
  if (topic === 'chart') {
    console.log('## 차트 ' + Object.keys(G.charts).length + '종  (pattern:"chart" 의 chart 필드)');
    Object.keys(G.charts).forEach(function (k) {
      console.log('  ' + k.padEnd(12) + G.charts[k]);
      console.log('  ' + ''.padEnd(12) + G.chartUse(k));
    });
    process.exit(0);
  }
  if (!topic || topic === 'themes') dump('테마', G.themes);
  if (!topic || topic === 'skins') dump('스킨 (루트 skin. 표면·선·타이포의 구현부를 갈아 끼운다 — 자세히: gm info skins)', G.skins);
  if (!topic || topic === 'fonts') dump('폰트 (루트 font 로 고른다. 생략하면 테마 기본)', G.fonts);
  if (!topic || topic === 'trans') dump('트랜지션', G.transitions);
  if (!topic || topic === 'textfx') dump('글자 등장 (씬의 textFx. kineticType 은 줄마다 fx 로도. `*낱말*` 은 인라인 강조 — 색이 들고 mark 가 그 낱말에 붙는다)', G.textFx);
  if (!topic || topic === 'exitfx') dump('글자 퇴장 (씬의 exitFx. 글자만 먼저 나가고 배경·그림은 트랜지션과 함께 간다)', G.exitFx);
  if (!topic || topic === 'numfx') dump('숫자 표기 (dataCounter 의 numFx)', G.numFx);
  if (!topic || topic === 'cam') dump('씬 카메라 (씬의 cam. 생략하면 패턴에 맞는 기본값. 루트 camera:false 로 전체 정지)', G.cams);
  if (!topic || topic === 'energy') dump('에너지 (루트 energy. 얼마나 빠른가 — 지속시간·거리·트랜지션 길이)', G.energies);
  if (!topic || topic === 'motion') dump('모션 스타일 (루트 motion. 어떻게 움직이는가 — 이징·궤적·오버슈트·기본 트랜지션)', G.motions);
  if (!topic || topic === 'aspects') dump('화면비', G.aspects);
  if (!topic) {
    console.log('## 벡터 세트  (자세히: gm info decor|mark|frame|art)');
    console.log('  배경 ' + Object.keys(G.decors).length + '종 · 마크 ' + Object.keys(G.marks).length +
      '종 · 프레임 ' + Object.keys(G.frames).length + '종 · 일러스트 ' + Object.keys(G.arts).length +
      '종 · 차트 ' + Object.keys(G.charts).length + '종 · 픽토그램 ' + G.iconCount + '종\n');
  }
  if (!topic || topic === 'tokens') {
    console.log('## 모션 토큰 (패턴이 쓰는 값. 스펙에서 직접 못 쓴다 — 엔진이 에너지·모션 스타일 배율을 곱한다)');
    console.log('  duration  ' + JSON.stringify(G.tokens.d));
    console.log('  ease      ' + JSON.stringify(G.tokens.e));
    console.log('  stagger   ' + JSON.stringify(G.tokens.s));
    console.log('  camera    ' + JSON.stringify(G.tokens.cam) + '  (루트 camera·depth·shutter 로 배율을 준다)');
  }
  process.exit(0);
}

if (cmd === 'icons') {
  var q = files[0], hit = G.icons(q);
  if (!hit.length) { console.error('없다. 다른 말로 찾아본다.'); process.exit(1); }
  console.log(hit.map(function (k) {
    var al = G.iconAliases(k);
    return k + (al.length ? '(' + al.slice(0, 4).join('·') + ')' : '');
  }).join(' '));
  console.error('  ' + hit.length + '개' + (q ? '' : ' / 전체 ' + G.iconCount));
  process.exit(0);
}

if (cmd === 'check') {
  var f = files[0];
  if (!f || !fs.existsSync(f)) { console.error('산출물 파일이 없다.'); process.exit(1); }
  var h = fs.readFileSync(f, 'utf8'), fail = 0;
  function must(label, re, why) {
    var ok = re.test(h);
    console.log((ok ? '  OK   ' : '  MISS ') + label + (ok ? '' : '   ← ' + why));
    if (!ok) fail++;
  }
  function never(label, re, why) {
    var m = h.match(re);
    console.log((m ? '  WARN ' : '  OK   ') + label + (m ? '   ← ' + why + ' : ' + String(m[0]).slice(0, 70) : ''));
    if (m) fail++;
  }
  must('lang="ko"', /<html lang="ko">/, '한국어 문서 선언');
  must('감소 모션 대응', /\[data-rm\] [^{]*\{animation:none\}/, '모션 민감 사용자에게 정적 대체가 필요하다 — 상시 CSS 루프는 [data-rm] 으로 멈춘다');
  must('스크린리더 라벨', /aria-label=/, '스테이지와 조작부에 라벨');
  must('씬 라벨', /data-pattern="/, '씬마다 패턴 표시 — 검수 추적용');
  must('검수 API', /window\.GGM/, '씬별 시킹 캡처에 필요하다');
  must('폰트 로드 후 조립', /document\.fonts/, '폰트 늦게 오면 레이아웃이 튄다');
  never('레이아웃 속성 애니메이션', /"(width|height|top|left|margin[A-Za-z]*)":\s*[-\d]/, 'transform/opacity 로 바꾼다');
  never('외부 스크립트(CDN GSAP 제외)', /<script[^>]+src="(?!https:\/\/cdn\.jsdelivr\.net\/npm\/gsap)/, '단일 파일 정책 위반');
  var scenes = (h.match(/class="gg-scene"/g) || []).length;
  var pats = {};
  (h.match(/data-pattern="([a-zA-Z]+)"/g) || []).forEach(function (m) { pats[m.split('"')[1]] = 1; });
  console.log('  INFO 씬 ' + scenes + '개 · 패턴 ' + Object.keys(pats).length + '종(' + Object.keys(pats).join(' ') + ') · ' +
    Math.round(h.length / 1024) + 'KB');
  if (scenes >= 4 && Object.keys(pats).length < 2)
    console.log('  WARN 씬이 ' + scenes + '개인데 패턴이 1종이다 — 같은 움직임이 반복되면 정보가 구분되지 않는다');
  process.exit(fail ? 1 : 0);
}

console.error('그런 명령은 없다: ' + cmd);
usage(1);
