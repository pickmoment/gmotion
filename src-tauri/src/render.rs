//! MP4 렌더 — 헤드리스 Chrome 이 실제로 재생하는 화면을 실시간으로 받아 ffmpeg 으로 넘긴다.
//!
//! 시계는 음성이 잡는다. Chrome 을 `--autoplay-policy=no-user-gesture-required --mute-audio`
//! 로 띄우면 음성이 (소리 없이) 재생되며 런타임의 마스터 타임라인을 끌고 가므로,
//! 영상 길이가 음성 파일과 어긋나지 않는다. 음성이 없으면 타임라인 자체 시계로 간다.
//!
//! 스크린캐스트 프레임은 도착 간격이 일정하지 않다. 그대로 이어 붙이면 시간이 밀리므로
//! 프레임마다 붙어 오는 타임스탬프로 **고정 프레임률로 다시 샘플링**한다 —
//! 늦게 오면 직전 프레임을 채우고, 몰려 오면 버린다. 인코딩이 밀려도 길이는 정확하다.

use serde_json::json;
use std::io::Write;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use crate::cdp::{b64_decode, find_ffmpeg, Browser};

#[derive(serde::Deserialize)]
pub struct RenderOpts {
    /// 렌더할 산출물 HTML (앱이 임시 파일로 써 둔다)
    pub html_path: String,
    pub out_path: String,
    pub fps: u32,
    pub width: u32,
    pub height: u32,
    /// 트랙으로 넣을 음성 원본. 산출물에 심은 data URI 가 아니라 파일을 쓴다 —
    /// 다시 인코딩하지 않고 그대로 붙이는 편이 빠르고 깨끗하다.
    pub audio_path: Option<String>,
    /// 예상 길이(초). 진행률과 종료 판정에 쓴다.
    pub total_sec: f64,
    /// 스크린캐스트 JPEG 품질 (1~100)
    pub quality: u8,
}

#[derive(Clone, serde::Serialize)]
pub struct Progress {
    pub phase: String,
    pub frame: u64,
    pub frames: u64,
    pub sec: f64,
    pub total_sec: f64,
}

/// 진행률 콜백. Tauri 를 모르게 두어 예제·테스트에서 그대로 돌릴 수 있다.
pub type OnProgress<'a> = &'a (dyn Fn(Progress) + Send + Sync);

pub fn render(emit: OnProgress, o: RenderOpts, cancel: Arc<AtomicBool>) -> Result<String, String> {
    let ffmpeg = find_ffmpeg()?;
    /* 빈 문자열이 넘어오면 ffmpeg 이 -i "" 로 즉사한다 — 없는 것으로 본다 */
    let audio = o.audio_path.as_deref().filter(|p| !p.trim().is_empty());
    if let Some(a) = audio {
        if !std::path::Path::new(a).is_file() {
            return Err(format!("음성 파일이 없다: {a}"));
        }
    }
    let fps = o.fps.clamp(1, 60);
    let target_frames = (o.total_sec * fps as f64).ceil().max(1.0) as u64;

    emit(Progress { phase: "브라우저 준비".into(), frame: 0, frames: target_frames, sec: 0.0, total_sec: o.total_sec });

    let mut b = Browser::launch(o.width, o.height)?;
    b.page("Page.enable", json!({}))?;
    b.page(
        "Emulation.setDeviceMetricsOverride",
        json!({ "width": o.width, "height": o.height, "deviceScaleFactor": 1, "mobile": false }),
    )?;

    /* clean=1 로 열어 플레이어 UI 를 화면에서 뺀다 — 녹화본에 조작부가 찍히면 안 된다 */
    let url = match url::Url::from_file_path(std::path::Path::new(&o.html_path)) {
        Ok(mut u) => {
            u.set_query(Some("clean=1"));
            u.to_string()
        }
        Err(_) => {
            let clean_p = o.html_path.replace('\\', "/");
            if clean_p.starts_with('/') {
                format!("file://{clean_p}?clean=1")
            } else {
                format!("file:///{clean_p}?clean=1")
            }
        }
    };
    b.page("Page.navigate", json!({ "url": url }))?;

    /* 런타임이 폰트를 받고 타임라인을 다 조립할 때까지 기다린다 */
    let t0 = Instant::now();
    loop {
        if cancel.load(Ordering::Relaxed) {
            return Err("취소했다".into());
        }
        if t0.elapsed() > Duration::from_secs(60) {
            /* 왜 안 됐는지 알려 주지 않으면 손댈 데가 없다 */
            let diag = b
                .eval("JSON.stringify({href:location.href,ready:document.readyState,ggm:typeof window.GGM,attr:document.documentElement.dataset.ggReady||null,title:document.title})")
                .unwrap_or_default();
            return Err(format!(
                "산출물이 준비되지 않았다 (data-gg-ready 가 오지 않는다) — {}",
                diag.as_str().unwrap_or("진단 실패")
            ));
        }
        if b.eval("document.documentElement.dataset.ggReady === '1'")? == json!(true) {
            break;
        }
        std::thread::sleep(Duration::from_millis(100));
    }

    /* 처음부터 재생시킨다. 음성이 있으면 음성이 시계를 잡는다. */
    b.eval("GGM.replay(); 1")?;

    let mut cmd = Command::new(&ffmpeg);
    cmd.args(["-hide_banner", "-loglevel", "error", "-y"])
        .args(["-f", "image2pipe", "-vcodec", "mjpeg"])
        .args(["-framerate", &fps.to_string(), "-i", "-"]);
    if let Some(a) = audio {
        cmd.args(["-i", a]);
    }
    /* MJPEG 입력은 full range 다. 그대로 두면 yuvj420p 로 나가 플레이어마다 대비가
       달라지므로, 방송 표준인 BT.709 limited range 로 변환해 태그까지 박는다. */
    cmd.args(["-vf", "scale=in_range=full:out_range=limited"])
        .args(["-c:v", "libx264", "-preset", "veryfast", "-crf", "19"])
        .args(["-pix_fmt", "yuv420p", "-r", &fps.to_string()])
        .args(["-color_range", "tv", "-colorspace", "bt709",
               "-color_primaries", "bt709", "-color_trc", "bt709"]);
    if audio.is_some() {
        cmd.args(["-c:a", "aac", "-b:a", "192k", "-shortest"]);
    }
    cmd.args(["-movflags", "+faststart"])
        .arg(&o.out_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped());

    let mut ff = cmd.spawn().map_err(|e| format!("ffmpeg 실행 실패: {e}"))?;
    let mut sink = ff.stdin.take().ok_or("ffmpeg stdin 을 열지 못했다")?;

    b.page(
        "Page.startScreencast",
        json!({ "format": "jpeg", "quality": o.quality.clamp(1, 100),
                "maxWidth": o.width, "maxHeight": o.height, "everyNthFrame": 1 }),
    )?;

    let mut written: u64 = 0;
    let mut prev: Option<Vec<u8>> = None;
    let mut base: Option<f64> = None;
    let started = Instant::now();
    let deadline = Duration::from_secs_f64(o.total_sec * 2.0 + 60.0);
    let mut err: Option<String> = None;

    loop {
        if cancel.load(Ordering::Relaxed) {
            err = Some("취소했다".into());
            break;
        }
        if started.elapsed() > deadline {
            err = Some("렌더가 예상보다 오래 걸려 멈췄다".into());
            break;
        }
        if written >= target_frames {
            break;
        }

        let v = match b.read() {
            Ok(v) => v,
            Err(e) => {
                err = Some(e);
                break;
            }
        };
        if v["method"].as_str() != Some("Page.screencastFrame") {
            continue;
        }
        let p = &v["params"];
        let sid = p["sessionId"].clone();
        let data = p["data"].as_str().unwrap_or("").to_string();
        let ts = p["metadata"]["timestamp"].as_f64().unwrap_or(0.0);
        /* 다음 프레임을 받으려면 반드시 ack 해야 한다 */
        let s = b.session.clone();
        let _ = b.call(Some(&s), "Page.screencastFrameAck", json!({ "sessionId": sid }));

        let bytes = match b64_decode(&data) {
            Ok(x) => x,
            Err(e) => {
                err = Some(e);
                break;
            }
        };
        let t = *base.get_or_insert(ts);
        /* 이 프레임이 놓일 자리. 도착 시각이 곧 애니메이션 시각이다
           (실측: ts-base 와 GGM.master.time() 이 0.02초 안에서 일치한다). */
        let idx = (((ts - t) * fps as f64).round() as i64).max(0) as u64;

        /* Chrome 은 fps 보다 빠르게 보낸다 — 이미 채운 자리에 온 프레임은 버린다.
           버리지 않고 매번 한 장씩 더 쓰면 출력이 들어오는 속도로 불어나
           영상이 통째로 늘어진다. */
        if idx >= written && written < target_frames {
            /* 빈 자리는 직전 프레임으로 메운다 — 정지 구간이거나 그리기가 밀린 구간이다 */
            while written < idx.min(target_frames) {
                let f = prev.as_ref().unwrap_or(&bytes);
                if let Err(e) = sink.write_all(f) {
                    err = Some(format!("ffmpeg 에 쓰지 못했다: {e}"));
                    break;
                }
                written += 1;
            }
            if err.is_some() {
                break;
            }
            if written < target_frames {
                if let Err(e) = sink.write_all(&bytes) {
                    err = Some(format!("ffmpeg 에 쓰지 못했다: {e}"));
                    break;
                }
                written += 1;
            }
        }
        prev = Some(bytes);

        if std::env::var("GMOTION_RENDER_DEBUG").is_ok() && written % 60 == 0 {
            let m = b.eval("GGM.master.time()").unwrap_or_default().as_f64().unwrap_or(-1.0);
            eprintln!(
                "[dbg] written={written} idx={idx} ts-base={:.2} wall={:.2} master={:.2}",
                ts - t, started.elapsed().as_secs_f64(), m
            );
        }
        if written % (fps as u64).max(1) == 0 {
            emit(Progress {
                phase: "녹화".into(), frame: written, frames: target_frames,
                sec: written as f64 / fps as f64, total_sec: o.total_sec,
            });
        }
    }

    let _ = b.page("Page.stopScreencast", json!({}));

    /* 마지막 프레임으로 끝까지 채운다 — 길이가 total 보다 짧으면 음성이 잘린다 */
    if err.is_none() {
        if let Some(f) = prev.as_ref() {
            while written < target_frames {
                if sink.write_all(f).is_err() {
                    break;
                }
                written += 1;
            }
        }
    }
    drop(sink);
    drop(b);

    emit(Progress {
        phase: "인코딩 마무리".into(), frame: written, frames: target_frames,
        sec: written as f64 / fps as f64, total_sec: o.total_sec,
    });

    let out = ff.wait_with_output().map_err(|e| format!("ffmpeg 종료 실패: {e}"))?;
    if let Some(e) = err {
        let _ = std::fs::remove_file(&o.out_path);
        return Err(e);
    }
    if !out.status.success() {
        let msg = String::from_utf8_lossy(&out.stderr);
        return Err(format!("ffmpeg 실패: {}", msg.lines().last().unwrap_or("알 수 없는 오류")));
    }
    if written == 0 {
        return Err("프레임을 한 장도 받지 못했다".into());
    }
    Ok(o.out_path)
}
