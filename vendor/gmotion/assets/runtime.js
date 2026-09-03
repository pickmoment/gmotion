/*!
 * gmotion runtime — 트윈 IR 을 GSAP 마스터 타임라인으로 조립한다.
 * 산출물 HTML 안에서 실행된다. 엔진이 SPEC · TR 자리에 IR 을 심는다(플레이스홀더 치환).
 *
 * 노출 API (검수·캡처용):
 *   GGM.ready      폰트 로드 + 타임라인 조립 완료 Promise
 *   GGM.master     GSAP 타임라인
 *   GGM.total      전체 초
 *   GGM.scenes     [{id, pattern, at, dur}]
 *   GGM.seek(t)    t초로 세우고 정지. 프레임 캡처용
 *   GGM.frame(n,fps=30)  프레임 번호로 세우고 정지
 *   GGM.goto(i)    씬 i 의 hold 지점(내용이 다 나온 순간)으로 세운다 — 씬별 스크린샷용
 *   GGM.play() GGM.pause() GGM.replay()
 *   GGM.setCaptions(on) / GGM.captionsOn   화면 자막 켜기·끄기 (C 키·플레이어 CC 버튼과 같은 것)
 */
(function () {
  'use strict';
  var SPEC = __SPEC__;
  var RM = SPEC.reducedMotion === true ||
    (SPEC.reducedMotion == null && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var QS = new URLSearchParams(location.search);
  if (SPEC.reducedMotion == null && QS.get('motion') === 'on') RM = false;
  if (SPEC.reducedMotion == null && QS.get('motion') === 'off') RM = true;

  gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin, SplitText, CustomEase, CustomWiggle,
                      MotionPathPlugin, ScrambleTextPlugin);
  gsap.defaults({ overwrite: 'auto' });
  CustomWiggle.create('ggShake', { wiggles: 6, type: 'easeOut' });

  var stage = document.querySelector('.gg-stage');
  var scaler = document.querySelector('.gg-scale');
  var flash = document.querySelector('.gg-flash');

  /*
   * 뷰포트 맞춤은 래퍼가 한다. 스테이지의 transform 은 impact/shake 가 쓰므로 건드리지 않는다.
   * 기준은 window 가 아니라 부모 박스다 — 발표자 창은 스테이지를 작은 미리보기 박스로 옮긴다.
   */
  function fit() {
    var host = scaler.parentElement, box = host.getBoundingClientRect();
    var w = box.width || window.innerWidth, h = box.height || window.innerHeight;
    var k = Math.min(w / SPEC.w, h / SPEC.h);
    if (QS.get('raw') === '1') k = 1;
    scaler.style.transform = 'translate(-50%,-50%) scale(' + k + ')';
  }
  window.addEventListener('resize', fit);
  if (window.ResizeObserver) new ResizeObserver(fit).observe(scaler.parentElement);
  fit();

  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : d; }

  /* --- 숫자 포맷 --- */
  function fmt(v, dec) {
    return (dec > 0 ? v.toFixed(dec) : Math.round(v)).toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  /* --- reduced-motion 이면 모든 동작을 즉시 끝낸다. hold 는 유지 -> 내용은 다 읽힌다. --- */
  function D(v) { return RM ? .001 : v; }
  function ST(v) { return RM ? 0 : (v || 0); }

  /*
   * 깊이 — 카메라가 움직일 때 배경(.gg-decorL)은 그만큼 덜 움직인다.
   * 세 층이 서로 다른 속도로 움직여야 "공간에 들어간다"로 읽힌다.
   * 같은 배율로 함께 움직이면 한 장의 그림을 확대·이동한 것으로 보인다.
   *
   *   .gg-decorL   배경 — 카메라의 DEPTH 배 (기본 .34)
   *   .gg-world    피사체 — 카메라 그대로
   *   .gg-fixed    UI(헤더·상세 패널) — 고정. 카메라를 아예 따라가지 않는다
   */
  var DEPTH = typeof SPEC.depth === 'number' ? SPEC.depth : .34;
  /**
   * 카메라 값 하나를 레이어의 변형으로 환산한다.
   *   damp  따라가는 비율 (피사체 1, 배경 DEPTH)
   *   cover 팬·틸트로 배경이 밀릴 때 프레임 밖이 드러나지 않게 미리 키워 두는 배율
   */
  function camVars(v, damp, cover) {
    var o = {};
    if (v.scale != null || cover !== 1) o.scale = cover * (1 + (num(v.scale, 1) - 1) * damp);
    if (v.x != null) o.x = v.x * damp;
    if (v.y != null) o.y = v.y * damp;
    if (v.rotate != null) o.rotate = v.rotate * damp;
    return o;
  }
  /*
   * 배경이 필요로 하는 여유 배율. 팬·틸트로 레이어가 밀리면 프레임 밖(=아무것도 없는 곳)이
   * 드러나므로, 밀리는 만큼 미리 키워 둔다. 배율 s 에서 남는 여유는 폭의 (s-1)/2 이라
   * 필요한 최소값이 1 + 2|x|/W 다 — 실측으로 여유가 1px 밖에 안 남아 2.6 배를 쓴다
   * (배경이 2% 커지는 것은 눈에 안 띄지만, 프레임 끝의 빈 줄은 바로 보인다).
   *
   * 피사체(.gg-world)에는 걸지 않는다. world 는 투명한 판이고 그 위의 요소만 움직이므로
   * 밀려도 드러나는 것이 없다 — 여기에 배율을 걸면 팬을 시켰는데 화면이 확대된다.
   */
  function camCover(o, damp) {
    var mx = 0, my = 0;
    [o.v0, o.v].forEach(function (v) {
      if (!v) return;
      mx = Math.max(mx, Math.abs(num(v.x, 0)));
      my = Math.max(my, Math.abs(num(v.y, 0)));
    });
    if (!mx && !my) return 1;
    return 1 + Math.max(mx / SPEC.w, my / SPEC.h) * damp * 2.6;
  }
  function camLayer(tl, el, o, damp, cover) {
    if (!el) return;
    var to = camVars(o.v, damp, cover);
    to.duration = D(o.dur); to.ease = o.ease || 'power2.inOut';
    if (o.v0) tl.fromTo(el, camVars(o.v0, damp, cover), to, o.at);
    else tl.to(el, to, o.at);
  }

  /* --- IR 한 줄을 씬 타임라인에 올린다 --- */
  function apply(tl, o, scope) {
    var els;
    if (o.k === 'cam') {
      /* 앰비언트 카메라는 움직임 자체가 목적이다 — 동작을 줄인 환경에서는 아예 걸지 않는다.
         D() 로 0 초로 만들면 시작 배율이 그대로 남아 화면이 영구히 확대된 채로 선다. */
      if (o.amb && RM) return;
      camLayer(tl, scope.querySelector('.gg-world'), o, 1, 1);
      if (DEPTH > 0) camLayer(tl, scope.querySelector('.gg-decorL'), o, DEPTH, camCover(o, DEPTH));
      return;
    }
    if (o.k === 'label') { tl.addLabel(o.name, o.at); return; }
    if (o.k === 'fx') {
      if (o.fn === 'impact') {
        if (RM) return;
        tl.fromTo(flash, { opacity: 0 }, { opacity: .5, duration: .07, ease: 'power2.out' }, o.at);
        tl.to(flash, { opacity: 0, duration: .22, ease: 'power2.in' }, o.at + .07);
        tl.fromTo(stage, { scale: 1 }, { scale: 1.014, duration: .1, ease: 'power2.out' }, o.at);
        tl.to(stage, { scale: 1, duration: .3, ease: 'power2.out' }, o.at + .1);
      } else if (o.fn === 'flash' && !RM) {
        tl.fromTo(flash, { opacity: 0 }, { opacity: .34, duration: .1, yoyo: true, repeat: 1, ease: 'none' }, o.at);
      } else if (o.fn === 'shake' && !RM) {
        tl.fromTo(stage, { x: 0 }, { x: 14, duration: .5, ease: 'ggShake' }, o.at);
      } else if (o.fn === 'pulse' && o.t && !RM) {
        tl.fromTo(o.t, { scale: 1 }, { scale: 1.06, duration: .3, yoyo: true, repeat: 1, ease: 'sine.inOut' }, o.at);
      } else if (o.fn === 'spin') {
        /* 궤도 회전 — 마스터 밖에서 무한 루프. 시킹과 무관하게 돈다.
           위성은 놓인 타원 위를 각도로 돈다. 컨테이너 강체 회전은 타원선을 벗어난다. */
        if (RM) return;
        scope.querySelectorAll('.gg-orbit').forEach(function (el) {
          var sec = parseFloat(el.getAttribute('data-spin')) || 26;
          var sats = Array.prototype.slice.call(el.querySelectorAll('.gg-sat')).map(function (s) {
            var a0 = (parseFloat(s.getAttribute('data-oa')) || 0) * Math.PI / 180,
                rx = parseFloat(s.getAttribute('data-orx')) || 0,
                ry = parseFloat(s.getAttribute('data-ory')) || 0;
            /* left/top 이 이미 시작점에 놓여 있으므로 시작점 대비 변위만 준다 */
            return { el: s, a0: a0, rx: rx, ry: ry, x0: Math.cos(a0) * rx, y0: Math.sin(a0) * ry };
          });
          if (!sats.length) return;
          var st = { a: 0 };
          gsap.to(st, {
            a: Math.PI * 2, duration: sec, repeat: -1, ease: 'none',
            onUpdate: function () {
              for (var i = 0; i < sats.length; i++) {
                var s = sats[i], a = s.a0 + st.a;
                gsap.set(s.el, { x: Math.cos(a) * s.rx - s.x0, y: Math.sin(a) * s.ry - s.y0 });
              }
            }
          });
        });
      }
      return;
    }
    els = scope.querySelectorAll(o.t.replace(/^#\S+\s+/, ''));
    if (!els.length) return;
    els = Array.prototype.slice.call(els);

    if (o.k === 'draw') {
      tl.fromTo(els, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: D(o.dur),
        ease: o.ease || 'power2.inOut', stagger: ST(o.st) }, o.at);
      return;
    }
    if (o.k === 'undraw') {
      tl.to(els, { drawSVG: '100% 100%', duration: D(o.dur), ease: o.ease || 'power2.in', stagger: ST(o.st) }, o.at);
      return;
    }
    if (o.k === 'split') {
      var parts = [];
      els.forEach(function (el) {
        if (el.__split) { parts = parts.concat(el.__split); return; }
        var sp = SplitText.create ? SplitText.create(el, { type: o.by, autoSplit: false })
                                  : new SplitText(el, { type: o.by });
        var got = o.by === 'chars' ? sp.chars : o.by === 'lines' ? sp.lines : sp.words;
        el.__split = got; parts = parts.concat(got);
      });
      if (!parts.length) return;
      var v = Object.assign({}, o.v);
      v.duration = D(v.duration); v.stagger = ST(o.st);
      tl.from(parts, v, o.at);
      return;
    }
    if (o.k === 'count') {
      els.forEach(function (el) {
        var box = { v: o.from };
        el.textContent = o.prefix + fmt(o.from, o.dec);
        tl.to(box, {
          v: o.to, duration: D(o.dur), ease: 'power2.out',
          onUpdate: function () { el.textContent = fmt(box.v, o.dec); }
        }, o.at);
      });
      return;
    }
    if (o.k === 'morph') {
      /* 도형이 다른 도형으로 변형된다. to 는 셀렉터이거나 path 문자열(d) 이다. */
      var target = o.d ? o.d : (function () {
        var e2 = scope.querySelector(o.to.replace(/^#\S+\s+/, ''));
        return e2 || null;
      })();
      if (target) {
        tl.to(els, { morphSVG: o.shapeIndex != null ? { shape: target, shapeIndex: o.shapeIndex } : target,
          duration: D(o.dur), ease: o.ease || 'power2.inOut' }, o.at);
      }
      return;
    }
    if (o.k === 'path') {
      /* 곡선 경로를 따라 이동한다. 직선 x/y 트윈과 달리 길이 자체가 연출이 된다. */
      tl.to(els, {
        motionPath: { path: o.d, align: false, autoRotate: !!o.rotate,
                      start: num(o.start, 0), end: num(o.end, 1) },
        duration: D(o.dur), ease: o.ease || 'power2.inOut', stagger: ST(o.st)
      }, o.at);
      return;
    }
    if (o.k === 'scramble') {
      /* 글자가 무작위로 섞이다 제자리를 찾는다. 자동재생에서 가장 잘 먹는 타이포 연출. */
      els.forEach(function (el) {
        var txt = el.getAttribute('data-txt') || el.textContent;
        el.setAttribute('data-txt', txt);
        tl.fromTo(el, { text: '' },
          { duration: D(o.dur), ease: 'none',
            scrambleText: { text: txt, chars: o.chars || 'upperAndLowerCase',
                            speed: num(o.speed, .6), revealDelay: num(o.reveal, .18) } }, o.at);
      });
      return;
    }
    if (o.k === 'roll') {
      /* 롤러처럼 굴러 교체된다. 두 줄을 세로로 놓고 마스크 안에서 밀어 올린다. */
      els.forEach(function (el) {
        var inner = el.querySelector('.gg-rollIn');
        if (!inner) return;
        tl.fromTo(inner, { yPercent: 0 }, { yPercent: -50, duration: D(o.dur),
          ease: o.ease || 'power3.inOut' }, o.at);
      });
      return;
    }
    var vars = Object.assign({}, o.v);
    if (vars.duration != null) vars.duration = D(vars.duration);
    if (o.st) vars.stagger = ST(o.st);
    if (o.k === 'set') { tl.set(els, vars, o.at); return; }
    if (o.k === 'from') { tl.from(els, vars, o.at); return; }
    if (o.k === 'to') { tl.to(els, vars, o.at); return; }
    if (o.k === 'fromTo') {
      var v2 = Object.assign({}, o.v2);
      if (v2.duration != null) v2.duration = D(v2.duration);
      if (o.st) v2.stagger = ST(o.st);
      tl.fromTo(els, vars, v2, o.at);
    }
  }

  /* --- 트랜지션 --- */
  var TR = __TRANS__;
  /*
   * 크로스페이드는 대칭으로 걸면 두 씬의 글자가 같은 세기로 겹쳐 읽힌다.
   * 뒤 씬을 0.2배만큼 늦게 올려 앞 씬이 우세한 구간을 만든다.
   * 위치가 어긋나는 push 계열은 겹쳐도 읽히므로 지연을 주지 않는다.
   */
  function overlapDelay(name, dur) {
    return name.indexOf('push') === 0 || name === 'cut' ? 0 : dur * .2;
  }
  /*
   * opacity 와 transform 의 이징을 분리한다. 같은 이징으로 묶으면 둘 중 하나가 반드시 어색해진다.
   *  - opacity: 양쪽 선형(none). 가속을 걸면 두 씬이 같이 흐려지는 순간이 생겨 화면이 빈다
   *  - transform: 나가는 쪽 power2.in(가속해 밀려남), 들어오는 쪽 power3.out(감속해 안착)
   *  - 트랜지션이 이징을 직접 적었으면(clayPop 의 elastic 등) 그 값이 이긴다 —
   *    예전에는 기본값이 덮어써서 탄성 전환이 탄성 없이 재생됐다
   */
  function splitOpacity(v) {
    var op = v.opacity, rest = Object.assign({}, v);
    delete rest.opacity;
    return { op: op, rest: rest, hasRest: Object.keys(rest).length > 0 };
  }
  /*
   * 셔터 — 컷이 컷으로 읽히게 하는 잔상.
   *
   * 실제 카메라는 셔터가 열려 있는 동안의 움직임을 한 장에 담으므로, 빠르게 움직이는
   * 프레임은 흐리다. 웹 애니메이션에는 그게 없어서 빠른 전환이 "순간이동"으로 보인다.
   * 짧은 블러 한 번이 그 자리를 메운다 — 길게 걸면 초점이 안 맞은 화면이 된다.
   *
   * 움직임이 있는 전환에만 건다. 페이드·와이프처럼 제자리에서 바뀌는 전환에 걸면
   * 정지한 그림이 흐려지는 것으로만 보인다.
   *
   * 값은 스테이지 1920px 기준 px 이므로 실제 폭에 맞춰 환산한다.
   * 트윈이 끝나면 filter 를 인라인에서 지운다(clearProps) — 남겨 두면 그 씬이
   * backdrop-filter 의 기준(backdrop root)이 되어 글래스 카드가 배경을 잃는다.
   */
  var SHUT = { cut: 8, pushLeft: 6, pushRight: 6, pushUp: 6, zoomIn: 5, zoomOut: 5,
               match: 4, pageFlip: 4, paperPeel: 4, clayPop: 3, squish: 3 };
  function shutterPx(name) {
    var mul = typeof SPEC.shutter === 'number' ? SPEC.shutter : 1;
    if (RM || !mul || !SHUT[name]) return 0;
    return Math.round(SHUT[name] * mul * (SPEC.w / 1920) * 10) / 10;
  }
  function shutter(master, el, name, dur, at, leaving) {
    var k = shutterPx(name);
    if (!k) return;
    var d = Math.max(.1, Math.min(dur * .6, .22));
    /*
     * immediateRender:false 가 필수다. fromTo 는 기본이 즉시 렌더라, 조립 시점에
     * 모든 씬에 blur(0px) 이 인라인으로 박힌다 — 그 순간부터 씬이 backdrop root 가 되어
     * 글래스 카드가 배경을 잃고, 전환 한 번을 지날 때까지 돌아오지 않는다.
     */
    var to = leaving
      ? { filter: 'blur(' + (k * .8) + 'px)', ease: 'power2.in' }
      : { filter: 'blur(0px)', ease: 'power2.out' };
    to.duration = d; to.clearProps = 'filter'; to.immediateRender = false;
    master.fromTo(el, { filter: leaving ? 'blur(0px)' : 'blur(' + k + 'px)' }, to, at);
  }
  function transIn(master, el, name, dur, at) {
    var t = TR[name]; if (!t) return;
    var lag = overlapDelay(name, dur), d = D(dur - lag);
    /* 컷은 out·inFrom 이 없다 — 셔터는 그 앞에서 건다. 잔상이 필요한 전환이 바로 컷이다 */
    shutter(master, el, name, dur, at + lag, false);
    if (!t.inFrom) return;
    if (t.inFrom.clip) {
      /* 곡선 와이프 & 컬 와이프 */
      var from = t.inFrom.clip === 'curve' ? 'ellipse(0% 0% at 50% 108%)' : (t.inFrom.clip === 'curl' ? 'polygon(100% 100%, 100% 100%, 100% 100%, 100% 100%)' : 'inset(0 100% 0 0)');
      var to = t.inFrom.clip === 'curve' ? 'ellipse(160% 160% at 50% 108%)' : (t.inFrom.clip === 'curl' ? 'polygon(-40% -40%, 140% -40%, 140% 140%, -40% 140%)' : 'inset(0 0% 0 0)');
      master.fromTo(el, { clipPath: from }, { clipPath: to, duration: D(dur), ease: 'power2.inOut' }, at);
      return;
    }
    var p = splitOpacity(t.inFrom);
    master.set(el, { opacity: p.op != null ? 0 : 1 }, at);
    if (p.hasRest) {
      var r = Object.assign({}, p.rest); r.duration = d; r.ease = p.rest.ease || 'power3.out';
      master.from(el, r, at + lag);
    }
    if (p.op != null) {
      master.fromTo(el, { opacity: 0 }, { opacity: 1, duration: d, ease: 'none' }, at + lag);
    }
  }
  function transOut(master, el, name, dur, at) {
    var t = TR[name]; if (!t) return;
    shutter(master, el, name, dur, at, true);
    if (!t.out) return;
    var fast = name.indexOf('push') === 0 || name === 'cut' ? 1 : .85;
    var d = D(dur * fast), p = splitOpacity(t.out);
    if (p.hasRest) {
      var r = Object.assign({}, p.rest); r.duration = D(dur); r.ease = p.rest.ease || 'power2.in';
      master.to(el, r, at);
    }
    if (p.op != null) master.to(el, { opacity: p.op, duration: d, ease: 'none' }, at);
  }

  /* --- 조립 --- */
  var master = gsap.timeline({ paused: true });
  var sceneAnimEnds = [];
  function build() {
    SPEC.scenes.forEach(function (s, i) {
      var el = document.getElementById(s.sid);
      if (!el) return;
      var stl = gsap.timeline();
      stl.addLabel('enter', 0);
      /*
       * 앰비언트 카메라는 씬 타임라인에 넣지 않는다. 씬 전체 길이를 덮으므로 넣으면
       * 아래의 "내용이 다 나온 시각"(maxEnd)이 씬 끝으로 밀려, 씬별 스크린샷과
       * 발표 모드의 정지 지점이 hold 끝으로 어긋난다. 마스터에 절대 시각으로 얹는다.
       */
      s.tw.forEach(function (o) { if (!o.amb) apply(stl, o, el); });
      /* 씬 내부의 모든 실제 애니메이션 자식 트윈 끝 시각을 실측 */
      var maxEnd = 0;
      var children = stl.getChildren(false, true, true);
      children.forEach(function (child) {
        if (typeof child.endTime === 'function') {
          maxEnd = Math.max(maxEnd, child.endTime());
        }
      });
      if (s.ts && s.ts !== 1) stl.timeScale(s.ts);
      var effectiveScale = s.ts && s.ts !== 1 ? s.ts : 1;
      stl.set({}, {}, s.dur * effectiveScale);
      master.add(stl, s.at);
      s.tw.forEach(function (o) {
        if (o.amb) apply(master, Object.assign({}, o, { at: s.at + o.at }), el);
      });
      master.set(el, { visibility: 'visible' }, s.at);
      if (i > 0) transIn(master, el, s.trans, s.tdur, s.at);
      var next = SPEC.scenes[i + 1];
      if (next) {
        transOut(master, el, next.trans, next.tdur, next.at);
        master.set(el, { visibility: 'hidden' }, next.at + next.tdur);
      }
      var realAnimDuration = maxEnd > 0 ? (maxEnd / effectiveScale) : (s.ce != null ? s.ce : s.dur * .92);
      sceneAnimEnds[i] = realAnimDuration;
    });
    master.set({}, {}, SPEC.total);
    if (SPEC.mode === 'loop') { master.repeat(-1); master.repeatDelay(.4); }
    if (SPEC.mode === 'step' && !SPEC.present) {
      SPEC.scenes.slice(1).forEach(function (s) { master.addPause(Math.max(0, s.at - .001)); });
    }
    /*
     * 발표 모드는 "다음 씬 경계"가 아니라 **그 씬의 내용이 다 나온 순간** 멈춘다.
     * 경계에 멈추면 hold 만큼(길면 3~4초) 발표자가 아무것도 안 했는데 타임라인이 흐른다 —
     * 화면은 그대로인데 페이지 번호만 넘어가는 것처럼 보인다.
     * 발표에서 씬에 머무는 시간은 hold 가 아니라 발표자가 정한다.
     */
    if (SPEC.present) {
      SPEC.scenes.forEach(function (s, i) {
        var animDur = sceneAnimEnds[i] != null ? sceneAnimEnds[i] : (s.ce != null ? s.ce : s.dur * .92);
        var at = s.at + animDur + .08;
        if (SPEC.scenes[i + 1]) at = Math.min(at, SPEC.scenes[i + 1].at - .001);
        master.addPause(Math.max(s.at + .01, Math.min(at, SPEC.total)));
      });
    }
  }

  /* --- 음성이 시계를 잡는다 -----------------------------------------
   * 자막으로 씬을 맞췄으면 화면의 시계는 목소리다. 매 프레임 마스터 타임라인을
   * 음성의 현재 시각으로 세운다 — 자체 시계를 굴리고 오차를 보정하는 것보다
   * 정확하고, 사용자가 진행 바를 끌어도 소리와 화면이 같이 움직인다.
   * ------------------------------------------------------------------ */
  var AUD = null, AOFF = 0, CC = null, ccIdx = -1, audioLead = false;

  /** 화면 아래 짧은 안내. 플레이어가 없는 clean·present 산출물에서는 조용히 넘어간다. */
  function flashHint(msg, ms) {
    var hint = document.querySelector('.gg-hint');
    if (!hint) return;
    hint.textContent = msg; hint.classList.add('on');
    clearTimeout(hint.__t);
    hint.__t = setTimeout(function () { hint.classList.remove('on'); }, ms || 1400);
  }
  function playing() { return AUD ? !AUD.paused : !master.paused(); }
  function doPlay() { if (master.__play) master.__play(); else master.play(); }
  function doPause() { if (master.__pause) master.__pause(); else master.pause(); }
  function doSeek(t) {
    t = Math.max(0, Math.min(SPEC.total, t));
    if (AUD) { try { AUD.currentTime = t + AOFF; } catch (e) { } }
    master.time(t);
    return t;
  }
  function doRestart() { doSeek(0); doPlay(); }
  /** 그 시각에 걸리는 자막을 화면에 올린다. 시계가 음성이든 타임라인이든 같다. */
  function paint(t) {
    if (!CC || !SPEC.captions) return;
    var hit = -1;
    for (var i = 0; i < SPEC.captions.length; i++) {
      var c = SPEC.captions[i];
      if (t >= c.s && t <= c.e) { hit = i; break; }
    }
    if (hit === ccIdx) return;
    ccIdx = hit;
    CC.innerHTML = hit < 0 ? '' : '<span>' + SPEC.captions[hit].t + '</span>';
  }

  /**
   * 자막 켜기/끄기. 플레이어 버튼·C 키·GGM.setCaptions 가 모두 이걸 지난다.
   * ?cc=0 으로 열면 처음부터 꺼진 채 시작한다 — 캡처·녹화에서 화면만 담을 때 쓴다.
   */
  var ccOn = QS.get('cc') !== '0';
  function paintCCState() {
    if (CC) CC.hidden = !ccOn;
    if (stage) stage.setAttribute('data-cc', (CC && ccOn) ? 'true' : 'false');
    var b = document.querySelector('[data-a="cc"]');
    if (b) b.setAttribute('aria-pressed', ccOn ? 'true' : 'false');
  }
  function setCaptions(on) {
    ccOn = !!on;
    paintCCState();
    return ccOn;
  }

  function audioClock() {
    CC = document.getElementById('gg-cc');
    paintCCState();
    AUD = SPEC.audio ? document.getElementById('gg-audio') : null;

    /* 자막은 지금 돌고 있는 시계를 따라간다.
       음성이 잡고 있으면 음성 시각, 아니면 타임라인 시각이다.
       예전에는 음성이 있을 때 tick() 안에서만 그렸는데, tick 은 audioLead 가
       true 여야 돈다 — 브라우저가 자동재생을 막으면 화면은 가는데 자막은
       영영 빈 채로 남았다. 산출물을 열자마자 겪는 흔한 상태다. */
    if (CC && SPEC.captions) {
      (function loop() {
        paint(audioLead && AUD ? AUD.currentTime - AOFF : master.time());
        requestAnimationFrame(loop);
      })();
    }
    if (!AUD) return;
    if (SPEC.audio.volume != null) AUD.volume = SPEC.audio.volume;
    if (QS.get('mute') === '1') AUD.muted = true;
    AOFF = SPEC.audio.offset || 0;
    var off = AOFF;

    function tick() {
      if (!audioLead) return;
      var t = AUD.currentTime - off;
      if (t >= 0 && t <= SPEC.total) master.time(t);
      paint(t);
      requestAnimationFrame(tick);
    }
    /* 재생/정지를 음성에 위임한다 — 플레이어 버튼도 이 경로를 탄다 */
    master.__play = function () {
      AUD.play().then(function () {
        if (!audioLead) { audioLead = true; requestAnimationFrame(tick); }
      })['catch'](function () {
        /* 브라우저가 소리 있는 자동재생을 막는다. 화면만 보내되 그 사실을 알린다 —
           모르면 "음성이 산출물에 안 들어갔다" 로 읽힌다. */
        master.play();
        flashHint('소리는 브라우저가 막았다 — 재생 ▶ 이나 Space 를 누르면 시작된다', 4200);
      });
    };
    master.__pause = function () { AUD.pause(); master.pause(); };
    AUD.addEventListener('play', function () {
      master.pause();                    // 시계는 음성이 잡는다. 자체 진행은 멈춘다
      if (!audioLead) { audioLead = true; requestAnimationFrame(tick); }
    });
    AUD.addEventListener('pause', function () { audioLead = false; });
    /* 멈춘 채로 시각을 옮겨도 화면과 자막은 따라와야 한다 — 캡처가 이 경로를 탄다 */
    AUD.addEventListener('seeking', function () {
      var t = Math.max(0, Math.min(SPEC.total, AUD.currentTime - off));
      master.time(t); paint(t);
    });
    AUD.addEventListener('ended', function () { audioLead = false; });
    /* 음성과 화면의 길이가 크게 다르면 자막을 다시 맞춰야 한다 */
    AUD.addEventListener('loadedmetadata', function () {
      var span = AUD.duration - off;
      if (isFinite(span) && Math.abs(span - SPEC.total) > Math.max(2, SPEC.total * .05)) {
        console.warn('[gg] 음성 ' + span.toFixed(1) + 's vs 화면 ' + SPEC.total.toFixed(1) +
          's — --subs 로 타이밍을 다시 맞춘다');
      }
    });
  }

  /* --- 플레이어 --- */
  function player() {
    var p = document.querySelector('.gg-player');
    if (!p) return;
    /* ?clean=1 — 스크린샷·녹화 때 조작 UI 를 치운다 */
    if (QS.get('clean') === '1') { p.remove(); return; }
    var btn = p.querySelector('[data-a="toggle"]'), bar = p.querySelector('.gg-bar'),
        prog = p.querySelector('.gg-prog'), time = p.querySelector('.gg-time'),
        rate = p.querySelector('[data-a="rate"]');
    SPEC.scenes.forEach(function (s) {
      if (!s.at) return;
      var m = document.createElement('span');
      m.className = 'gg-tick'; m.style.left = (s.at / SPEC.total * 100) + '%';
      bar.appendChild(m);
    });
    function sync() {
      var t = master.time(), pr = SPEC.total ? t / SPEC.total : 0;
      prog.style.width = (pr * 100) + '%';
      time.textContent = t.toFixed(1) + ' / ' + SPEC.total.toFixed(1) + 's';
      btn.textContent = playing() ? '❚❚' : '▶';
    }
    gsap.ticker.add(sync);
    btn.addEventListener('click', function () { playing() ? doPause() : doPlay(); sync(); });
    bar.addEventListener('click', function (e) {
      var r = bar.getBoundingClientRect();
      doSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * SPEC.total);
      sync();
    });
    p.querySelector('[data-a="replay"]').addEventListener('click', function () { doRestart(); });
    var ccBtn = p.querySelector('[data-a="cc"]');
    if (ccBtn) ccBtn.addEventListener('click', function () { setCaptions(!ccOn); });
    var rates = [.5, 1, 1.5, 2], ri = 1;
    rate.addEventListener('click', function () {
      ri = (ri + 1) % rates.length; master.timeScale(rates[ri]); rate.textContent = rates[ri] + '×';
      /* 음성이 시계를 잡고 있을 때는 timeScale 이 무시된다(tick 이 매 프레임 currentTime 으로
         master.time 을 덮어쓴다) — 오디오 자체 속도도 같이 바꿔야 실제로 빨라/느려진다. */
      if (AUD) AUD.playbackRate = rates[ri];
    });
    sync();
  }

  /* --- 조작키 --- */
  function keys() {
    function sceneIndexAt(t) {
      var k = 0;
      SPEC.scenes.forEach(function (s, i) { if (t >= s.at - .01) k = i; });
      return k;
    }
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var k = e.key, i = sceneIndexAt(master.time());
      if (k === ' ') { e.preventDefault(); playing() ? doPause() : doPlay(); }
      else if (k === 'ArrowRight') { e.preventDefault(); var n = SPEC.scenes[i + 1]; if (n) { doSeek(n.at); flashHint('씬 ' + (i + 2) + ' · ' + n.pattern); } }
      else if (k === 'ArrowLeft') { e.preventDefault(); var pv = SPEC.scenes[Math.max(0, i - 1)]; doSeek(pv.at); flashHint('씬 ' + (Math.max(0, i - 1) + 1) + ' · ' + pv.pattern); }
      else if (k === 'r' || k === 'R') { doRestart(); flashHint('처음부터'); }
      else if (k === 'f' || k === 'F') { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); }
      else if ((k === 'c' || k === 'C') && CC) { setCaptions(!ccOn); flashHint(ccOn ? '자막 켬' : '자막 끔'); }
    });
    if (SPEC.mode === 'step' && !SPEC.present) {
      document.addEventListener('click', function (e) {
        if (e.target.closest('.gg-player')) return;
        master.paused() ? master.play() : null;
      });
    }
  }

  /* ================================================================ *
   * 발표 모드 — 발표 화면 + 발표자 창(별창). 두 창은 postMessage 로 붙는다.
   * ================================================================ */
  function present() {
    var isPresenter = QS.get('presenter') === '1';
    var peers = [];                       /* 메인이 연 발표자 창들 */
    function send(msg) {
      peers = peers.filter(function (w) { return w && !w.closed; });
      peers.forEach(function (w) { try { w.postMessage(msg, '*'); } catch (e) {} });
      if (window.opener && !window.opener.closed) {
        try { window.opener.postMessage(msg, '*'); } catch (e) {}
      }
    }
    /*
     * 현재 씬 인덱스는 **상태로 들고 간다.** 시간에서 역산하면 정지 지점이 경계와 겹칠 때
     * 화면은 아직 이전 씬인데 인덱스만 다음을 가리킨다.
     */
    var cur = 0;
    function idx() { return cur; }
    /** 시킹으로 위치가 바뀐 뒤 상태를 되맞춘다(GGM.seek 등 외부 조작 대비) */
    function resync() {
      var k = 0, t = master.time();
      SPEC.scenes.forEach(function (s, i) { if (t >= s.at + .02) k = i; });
      cur = k;
      return cur;
    }
    /* --- 진행 --- */
    /* 이동 직후 호출된다. 진행 표시를 rAF 에만 맡기면 창이 비활성일 때 갱신이 멈춘다. */
    var afterMove = function () {};
    var API = {
      next: function () {
        var i = idx(), nx = SPEC.scenes[i + 1];
        if (!nx) { master.time(SPEC.total); master.pause(); afterMove(); return i; }
        /* 다음 씬 시작으로 세우고 재생 — 그 씬의 내용이 다 나오면 addPause 가 잡는다 */
        cur = i + 1;
        master.time(nx.at); master.play(); afterMove();
        return cur;
      },
      prev: function () {
        var i = Math.max(0, idx() - 1);
        cur = i;
        master.time(SPEC.scenes[i].at); master.play(); afterMove();
        return cur;
      },
      jump: function (i) {
        cur = Math.max(0, Math.min(SPEC.scenes.length - 1, i));
        master.time(SPEC.scenes[cur].at); master.play(); afterMove();
        return cur;
      },
      /** 씬 안의 모션을 한 번 더 보여준다 */
      replayScene: function () { return API.jump(idx()); },
      index: idx, resync: resync
    };

    if (!isPresenter) {
      /* ---------------- 발표 화면 ---------------- */
      var bar = document.querySelector('.gg-pfill'), no = document.querySelector('.gg-pno');
      var black = document.querySelector('.gg-black'), toc = document.querySelector('.gg-toc');
      var hint = document.querySelector('.gg-hint');
      var N = SPEC.scenes.length;
      function paint() {
        var i = idx();
        if (bar) bar.style.width = ((i + 1) / N * 100) + '%';
        if (no) no.textContent = (i + 1) + ' / ' + N;
        if (toc) [].forEach.call(toc.querySelectorAll('li'), function (li) {
          li.classList.toggle('on', +li.dataset.i === i);
        });
        send({ gg: 'state', i: i, total: N });
      }
      gsap.ticker.add(paint);
      afterMove = paint;
      function flash(m) {
        if (!hint) return;
        hint.textContent = m; hint.classList.add('on');
        clearTimeout(hint.__t); hint.__t = setTimeout(function () { hint.classList.remove('on'); }, 1300);
      }
      function openPresenter() {
        var u = location.pathname + '?presenter=1' + (QS.get('motion') ? '&motion=' + QS.get('motion') : '');
        var w = window.open(u, 'ggPresenter_' + Date.now(), 'width=1180,height=760');
        if (w) { peers.push(w); flash('발표자 창을 열었습니다'); }
        else flash('팝업이 막혔습니다 — 주소에 ?presenter=1 을 붙여 직접 열어 주세요');
      }
      function handle(k, e) {
        if (k === 'ArrowRight' || k === ' ' || k === 'PageDown' || k === 'Enter') { API.next(); }
        else if (k === 'ArrowLeft' || k === 'PageUp') { API.prev(); }
        else if (k === 'Home') { API.jump(0); }
        else if (k === 'End') { API.jump(SPEC.scenes.length - 1); }
        else if (k === 'r' || k === 'R') { API.replayScene(); flash('이 씬 다시'); }
        else if (k === 'b' || k === 'B') { if (black) { black.hidden = !black.hidden; } }
        else if (k === 'o' || k === 'O') { if (toc) { toc.hidden = !toc.hidden; paint(); } }
        else if (k === 'p' || k === 'P') { openPresenter(); }
        else if (k === 'f' || k === 'F') {
          document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
        }
        else if (/^[1-9]$/.test(k)) { API.jump(+k - 1); }
        else return false;
        if (e) e.preventDefault();
        return true;
      }
      document.addEventListener('keydown', function (e) {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        handle(e.key, e);
      });
      document.addEventListener('click', function (e) {
        var li = e.target.closest('.gg-toc li');
        if (li) { API.jump(+li.dataset.i); toc.hidden = true; return; }
        if (toc && !toc.hidden) { toc.hidden = true; return; }
        if (black && !black.hidden) { black.hidden = true; return; }
        API.next();
      });
      /* 발표자 창에서 온 명령 */
      window.addEventListener('message', function (e) {
        var m = e.data;
        if (!m || m.gg !== 'cmd') return;
        if (m.a === 'next') API.next();
        else if (m.a === 'prev') API.prev();
        else if (m.a === 'jump') API.jump(m.i);
        else if (m.a === 'replay') API.replayScene();
        else if (m.a === 'black' && black) black.hidden = !black.hidden;
        else if (m.a === 'hello') { peers.push(e.source); paint(); }
        paint();
      });
      /*
       * 발표를 열면 첫 씬이 이미 떠 있어야 한다 — 빈 화면으로 시작하면 발표자가 당황한다.
       * 첫 씬 모션을 재생하고 씬2 경계에서 자동으로 멈춘다.
       * ?scene=n 으로 열면 그 씬이 완성된 상태로 세운다(중간부터 발표하거나 검수할 때).
       */
      var start = parseInt(QS.get('scene'), 10);
      if (isFinite(start) && start > 0) { cur = Math.min(start, SPEC.scenes.length - 1); GGM.goto(cur); }
      else master.play();
      paint();
      GGM.present = API;
      GGM.openPresenter = openPresenter;
      return;
    }

    /* ---------------- 발표자 창 ---------------- */
    var box = document.querySelector('.gg-presenter');
    var fitEl = document.querySelector('.gg-fit');
    var stageHost = document.querySelector('.gg-pstage');
    if (!box || !stageHost) return;
    box.hidden = false;
    /* 미리보기 — 스테이지를 작은 박스 안으로 옮긴다. fit 이 부모 크기를 보므로 자동으로 축소된다. */
    stageHost.appendChild(fitEl);
    fit();
    var elCount = box.querySelector('.gg-pcount'), elTimer = box.querySelector('.gg-ptimer');
    var elNow = box.querySelector('.gg-pnow'), elNext = box.querySelector('.gg-pnn');
    var elNextT = box.querySelector('.gg-pnextT'), list = box.querySelector('.gg-plist ol');
    var cur = 0, N = SPEC.scenes.length;

    SPEC.scenes.forEach(function (s, i) {
      var li = document.createElement('li');
      li.textContent = (i + 1) + '. ' + (s.head || s.pattern);
      li.dataset.i = i;
      list.appendChild(li);
    });
    function cmd(a, extra) {
      var m = Object.assign({ gg: 'cmd', a: a }, extra || {});
      if (window.opener && !window.opener.closed) { try { window.opener.postMessage(m, '*'); } catch (e) {} }
    }
    function render(i) {
      cur = i;
      var s = SPEC.scenes[i], nx = SPEC.scenes[i + 1];
      elCount.textContent = (i + 1) + ' / ' + N;
      elNow.textContent = (s && s.notes) || '(노트 없음 — 스펙의 notes 나 purpose 를 채우면 여기 나옵니다)';
      elNext.textContent = nx ? (nx.notes || '(노트 없음)') : '— 마지막 씬입니다';
      elNextT.textContent = nx ? (i + 2) + '. ' + (nx.head || nx.pattern) + '  ·  ' + nx.pattern + ' · ' + nx.dur + 's'
                               : '마지막 씬';
      /* 미리보기는 다음 씬을 세운다 — 발표자가 알아야 하는 건 다음에 뭐가 나오는지다 */
      GGM.goto(nx ? i + 1 : i);
      [].forEach.call(list.children, function (li) { li.classList.toggle('on', +li.dataset.i === i); });
    }
    window.addEventListener('message', function (e) {
      var m = e.data;
      if (m && m.gg === 'state' && m.i !== cur) render(m.i);
    });
    /* 발표자 창을 단독으로 열었을 때도(팝업 차단 등) 씬을 지정해 볼 수 있게 한다 */
    var sq = parseInt(QS.get('scene'), 10);
    if (isFinite(sq) && sq > 0) setTimeout(function () { render(sq); }, 0);
    list.addEventListener('click', function (e) {
      var li = e.target.closest('li'); if (li) cmd('jump', { i: +li.dataset.i });
    });
    box.querySelector('[data-a="reset"]').addEventListener('click', function () { t0 = Date.now(); });
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var k = e.key;
      if (k === 'ArrowRight' || k === ' ' || k === 'PageDown' || k === 'Enter') cmd('next');
      else if (k === 'ArrowLeft' || k === 'PageUp') cmd('prev');
      else if (k === 'r' || k === 'R') cmd('replay');
      else if (k === 'b' || k === 'B') cmd('black');
      else if (/^[1-9]$/.test(k)) cmd('jump', { i: +k - 1 });
      else return;
      e.preventDefault();
    });
    /* 경과 시간 — 발표자에게 가장 자주 보는 숫자다 */
    var t0 = Date.now();
    setInterval(function () {
      var s = Math.floor((Date.now() - t0) / 1000);
      elTimer.textContent = ('0' + Math.floor(s / 60)).slice(-2) + ':' + ('0' + (s % 60)).slice(-2);
    }, 500);
    cmd('hello');
    render(0);
  }

  /* --- 시작 --- */
  var ready = (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve())
    .then(function () {
      build();
      audioClock();
      if (SPEC.present) { present(); document.documentElement.setAttribute('data-gg-ready', '1'); return GGM; }
      player(); keys();
      var t0 = parseFloat(QS.get('t'));
      var g = QS.get('scene');
      if (g != null) { GGM.goto(parseInt(g, 10) || 0); }
      else if (isFinite(t0)) { doSeek(t0); doPause(); }
      else if (SPEC.mode !== 'step' && QS.get('paused') !== '1') { doPlay(); }
      else { doPause(); }
      document.documentElement.setAttribute('data-gg-ready', '1');
      return GGM;
    });

  var GGM = window.GGM = {
    master: master, spec: SPEC, total: SPEC.total, scenes: SPEC.scenes.map(function (s, i) {
      var next = SPEC.scenes[i + 1];
      var animDur = sceneAnimEnds[i] != null ? sceneAnimEnds[i] : (s.ce != null ? s.ce : s.dur * .92);
      return { id: s.id, pattern: s.pattern, at: s.at, dur: s.dur,
               shot: +Math.min(s.at + animDur + .12,
                               next ? next.at - .03 : SPEC.total).toFixed(2) };
    }),
    reducedMotion: RM, ready: ready,
    seek: function (t) {
      doPause(); doSeek(t);
      /* 밖에서 시간을 옮기면 발표 모드의 현재 씬 상태를 되맞춘다 */
      if (GGM.present && GGM.present.resync) GGM.present.resync();
      return master.time();
    },
    frame: function (n, fps) { return GGM.seek(n / (fps || 30)); },
    /**
     * 씬 i 의 "내용이 다 나왔고 다음 씬은 아직 안 들어온" 순간으로 세운다.
     * 씬별 스크린샷 검수의 기준 프레임 — 트랜지션 겹침 구간을 피한다.
     */
    goto: function (i) {
      i = Math.max(0, Math.min(SPEC.scenes.length - 1, i));
      var s = SPEC.scenes[i], next = SPEC.scenes[i + 1];
      var animDur = sceneAnimEnds[i] != null ? sceneAnimEnds[i] : (s.ce != null ? s.ce : s.dur * .92);
      var t = s.at + animDur + .12;
      var cap = next ? next.at - .03 : SPEC.total;
      return GGM.seek(Math.min(Math.max(t, s.at + .05), cap));
    },
    play: function () { doPlay(); }, pause: function () { doPause(); },
    replay: function () { doRestart(); },
    /** 화면 자막 켜기/끄기. 자막이 없는 산출물이면 항상 false 를 돌려준다. */
    setCaptions: function (on) { return CC ? setCaptions(on) : false; },
    get captionsOn() { return !!CC && ccOn; }
  };
})();
