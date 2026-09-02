//! MP4 렌더를 GUI 없이 돌려 본다.
//!   cargo run --example rendercheck -- <입력.html> <출력.mp4> <길이초> [음성파일] [N초뒤취소]
//!   GMOTION_RENDER_SIZE=1280x720 으로 해상도를 바꾼다 (기본 1920x1080)

use gmotion_lib::render::{render, Progress, RenderOpts};
use std::sync::atomic::AtomicBool;
use std::sync::Arc;

fn main() {
    let a: Vec<String> = std::env::args().skip(1).collect();
    if a.len() < 3 {
        eprintln!("사용: rendercheck <입력.html> <출력.mp4> <길이초> [음성파일]");
        std::process::exit(1);
    }
    let total: f64 = a[2].parse().expect("길이는 숫자");
    let (width, height) = match std::env::var("GMOTION_RENDER_SIZE") {
        Ok(s) => {
            let (w, h) = s.split_once(['x', 'X']).expect("크기는 1280x720 꼴");
            (w.trim().parse().expect("너비는 숫자"), h.trim().parse().expect("높이는 숫자"))
        }
        Err(_) => (1920, 1080),
    };
    let opts = RenderOpts {
        html_path: a[0].clone(),
        out_path: a[1].clone(),
        fps: 30,
        width,
        height,
        audio_path: a.get(3).cloned().filter(|x| !x.is_empty()),
        total_sec: total,
        quality: 92,
    };
    /* 5번째 인자를 주면 그 초 뒤에 취소를 걸어 중단 경로를 시험한다 */
    let cancel = Arc::new(AtomicBool::new(false));
    if let Some(after) = a.get(4).and_then(|x| x.parse::<u64>().ok()) {
        let c = cancel.clone();
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_secs(after));
            eprintln!("\n[취소 신호]");
            c.store(true, std::sync::atomic::Ordering::Relaxed);
        });
    }
    let t0 = std::time::Instant::now();
    let emit = |p: Progress| {
        eprint!("\r{} {}/{} ({:.1}s / {:.1}s)  ", p.phase, p.frame, p.frames, p.sec, p.total_sec);
    };
    match render(&emit, opts, cancel) {
        Ok(p) => println!("\n→ {p} · {:.1}초 걸림", t0.elapsed().as_secs_f64()),
        Err(e) => {
            eprintln!("\n실패: {e}");
            std::process::exit(1);
        }
    }
}
