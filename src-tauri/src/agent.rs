//! 로컬에 설치된 에이전트 CLI 를 돌린다 — 자막에서 스펙 초안을 받아 오는 데 쓴다.
//!
//! 왜 Rust 쪽에 있나. 웹뷰는 프로세스를 띄울 수 없고, 이 앱은 이미 같은 방식으로
//! ffmpeg 을 돌린다(`render.rs`). 실행 자체는 단순하지만 세 가지가 중요하다 —
//!
//! 1. **PATH.** 앱을 Finder 에서 실행하면 PATH 가 빈약해 `claude` 도 `node` 도 안 보인다.
//!    그래서 흔한 설치 위치를 직접 훑어 실행 파일을 찾고, 자식 프로세스에는 그 경로들을
//!    PATH 앞에 붙여 준다 — CLI 본체가 node·bun 을 다시 찾기 때문이다.
//! 2. **stdin 을 닫는다.** `codex exec` 는 stdin 이 TTY 가 아니면 "Reading additional
//!    input from stdin..." 하며 기다린다. 열어 두면 영영 끝나지 않는다.
//! 3. **취소와 타임아웃.** 모델 호출은 몇 분씩 걸리고 멈추지 않는 경우도 있다.
//!    렌더와 같은 `AtomicBool` 패턴으로 멈추고, 시한이 지나면 죽인다.

use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Read};
use std::path::PathBuf;
use std::process::{Child, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use crate::cdp::new_command;

/// 찾을 CLI 이름. 앱이 아는 어댑터(`src/lib/agents.ts`)와 같은 순서로 둔다.
const KNOWN: [&str; 4] = ["claude", "codex", "pi", "omp"];

#[derive(Serialize)]
pub struct Tool {
    pub id: String,
    /// 찾은 실행 파일의 절대 경로
    pub bin: String,
}

/// 실행 파일을 찾을 후보 디렉토리. PATH 는 GUI 실행에서 믿을 수 없어 직접 훑는다.
fn bin_dirs() -> Vec<PathBuf> {
    let mut dirs: Vec<PathBuf> = Vec::new();
    if let Some(home) = dirs::home_dir() {
        for rel in [
            ".local/bin",
            ".bun/bin",
            ".volta/bin",
            ".npm-global/bin",
            ".yarn/bin",
            ".cargo/bin",
            ".deno/bin",
            "bin",
            "node_modules/.bin",
        ] {
            dirs.push(home.join(rel));
        }
        /* nvm 은 버전마다 디렉토리가 따로다 — 있는 것을 전부 넣고 뒤에서 파일 존재로 거른다 */
        let nvm = home.join(".nvm/versions/node");
        if let Ok(rd) = std::fs::read_dir(&nvm) {
            for e in rd.flatten() {
                dirs.push(e.path().join("bin"));
            }
        }
    }
    for p in ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/snap/bin"] {
        dirs.push(PathBuf::from(p));
    }
    if let Ok(path) = std::env::var("PATH") {
        let sep = if cfg!(windows) { ';' } else { ':' };
        for d in path.split(sep) {
            let d = d.trim();
            if !d.is_empty() {
                dirs.push(PathBuf::from(d));
            }
        }
    }
    dirs.sort();
    dirs.dedup();
    dirs
}

/// 이름 하나를 찾는다. 윈도우는 확장자가 붙는다(`claude.cmd` 등).
fn find_bin(name: &str) -> Option<PathBuf> {
    let cands: Vec<String> = if cfg!(windows) {
        vec![format!("{name}.cmd"), format!("{name}.exe"), format!("{name}.bat"), name.into()]
    } else {
        vec![name.into()]
    };
    for d in bin_dirs() {
        for c in &cands {
            let p = d.join(c);
            if p.is_file() {
                return Some(p);
            }
        }
    }
    None
}

/// 설치된 CLI 만 돌려준다. 찾았다는 것과 실제로 동작한다는 것은 다르다 —
/// 로그인·네트워크 문제는 돌려 봐야 안다. 그래서 여기서 실행해 보지는 않는다.
pub fn tools() -> Vec<Tool> {
    KNOWN
        .iter()
        .filter_map(|n| {
            find_bin(n).map(|p| Tool {
                id: (*n).into(),
                bin: p.to_string_lossy().into(),
            })
        })
        .collect()
}

#[derive(Deserialize)]
pub struct RunOpts {
    /// 실행 파일 절대 경로 (`tools()` 가 준 것)
    pub bin: String,
    pub args: Vec<String>,
    /// 작업 디렉토리. 에이전트 CLI 는 대개 현재 디렉토리를 작업 공간으로 본다 —
    /// 사용자 프로젝트가 아니라 빈 임시 폴더에서 돌린다.
    pub cwd: Option<String>,
    pub timeout_sec: u64,
}

/// 진행 로그 한 줄. 어느 스트림에서 왔는지 같이 보낸다 — 오류는 대개 stderr 로 온다.
#[derive(Clone, Serialize)]
pub struct Line {
    pub stream: String,
    pub text: String,
}

#[derive(Serialize)]
pub struct RunOut {
    pub code: i32,
    pub stdout: String,
    pub stderr: String,
    pub ms: u64,
    pub timed_out: bool,
    pub canceled: bool,
}

/// 로그 콜백. 두 스레드(stdout·stderr)가 나눠 쓰므로 처음부터 공유 가능한 형태로 받는다.
pub type OnLine = Arc<dyn Fn(Line) + Send + Sync>;

/// 스트림 하나를 줄 단위로 읽어 콜백에 흘리고 전문을 모은다.
fn pump<R: Read + Send + 'static>(
    r: R,
    stream: &'static str,
    sink: Arc<Mutex<String>>,
    emit: OnLine,
) -> std::thread::JoinHandle<()> {
    std::thread::spawn(move || {
        let mut br = BufReader::new(r);
        let mut buf = Vec::new();
        /* read_line 은 UTF-8 이 아니면 터진다. CLI 는 진행 표시에 제어문자를 섞어 보내므로
           바이트로 읽고 손실 허용으로 문자열을 만든다. */
        while let Ok(n) = br.read_until(b'\n', &mut buf) {
            if n == 0 {
                break;
            }
            let text = String::from_utf8_lossy(&buf).trim_end().to_string();
            buf.clear();
            if let Ok(mut s) = sink.lock() {
                s.push_str(&text);
                s.push('\n');
            }
            if !text.is_empty() {
                emit(Line { stream: stream.into(), text });
            }
        }
    })
}

/// 죽인다. 취소·시한 초과 양쪽에서 쓴다.
fn kill(child: &mut Child) {
    let _ = child.kill();
    let _ = child.wait();
}

pub fn run(emit: OnLine, o: RunOpts, cancel: Arc<AtomicBool>) -> Result<RunOut, String> {
    if !PathBuf::from(&o.bin).is_file() {
        return Err(format!("실행 파일이 없다: {}", o.bin));
    }
    let started = Instant::now();
    let mut cmd = new_command(&o.bin);
    cmd.args(&o.args);
    if let Some(cwd) = o.cwd.as_deref().filter(|s| !s.trim().is_empty()) {
        std::fs::create_dir_all(cwd).map_err(|e| format!("{cwd}: {e}"))?;
        cmd.current_dir(cwd);
    }
    /* CLI 본체는 node·bun 으로 도는 경우가 많다 — 자식이 그것들을 찾을 수 있게
       흔한 bin 디렉토리를 PATH 앞에 붙인다. GUI 실행에서 특히 중요하다. */
    let sep = if cfg!(windows) { ";" } else { ":" };
    let mut path = bin_dirs()
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect::<Vec<_>>()
        .join(sep);
    if let Ok(cur) = std::env::var("PATH") {
        path.push_str(sep);
        path.push_str(&cur);
    }
    cmd.env("PATH", path);
    /* 대화형 UI 를 끄고 색을 빼면 로그가 읽을 만해진다 */
    cmd.env("NO_COLOR", "1").env("TERM", "dumb").env("CI", "1");

    cmd.stdin(Stdio::null()) /* codex exec 는 stdin 이 열려 있으면 입력을 기다린다 */
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("{} 실행 실패: {e}", o.bin))?;

    let out_buf = Arc::new(Mutex::new(String::new()));
    let err_buf = Arc::new(Mutex::new(String::new()));

    let so = child.stdout.take().ok_or("stdout 을 열지 못했다")?;
    let se = child.stderr.take().ok_or("stderr 을 열지 못했다")?;
    let h_out = pump(so, "out", out_buf.clone(), emit.clone());
    let h_err = pump(se, "err", err_buf.clone(), emit.clone());

    let deadline = Duration::from_secs(o.timeout_sec.clamp(10, 3600));
    let mut timed_out = false;
    let mut canceled = false;
    let code = loop {
        match child.try_wait() {
            Ok(Some(st)) => break st.code().unwrap_or(-1),
            Ok(None) => {}
            Err(e) => return Err(format!("프로세스 상태를 읽지 못했다: {e}")),
        }
        if cancel.load(Ordering::Relaxed) {
            canceled = true;
            kill(&mut child);
            break -1;
        }
        if started.elapsed() > deadline {
            timed_out = true;
            kill(&mut child);
            break -1;
        }
        std::thread::sleep(Duration::from_millis(80));
    };

    /* 파이프가 닫힐 때까지 기다린다 — 마지막 줄이 잘리면 JSON 이 깨진다 */
    let _ = h_out.join();
    let _ = h_err.join();

    let stdout = out_buf.lock().map(|s| s.clone()).unwrap_or_default();
    let stderr = err_buf.lock().map(|s| s.clone()).unwrap_or_default();
    Ok(RunOut {
        code,
        stdout,
        stderr,
        ms: started.elapsed().as_millis() as u64,
        timed_out,
        canceled,
    })
}

#[cfg(test)]
mod tests {
    /// 이 기계에 깔린 CLI 를 실제로 찾는지 — PATH 가 아니라 디렉토리 훑기로 찾아야 한다.
    #[test]
    fn finds_installed_clis() {
        let found = super::tools();
        for t in &found {
            eprintln!("{} → {}", t.id, t.bin);
            assert!(std::path::Path::new(&t.bin).is_file());
        }
        /* 하나도 없는 기계에서도 이 테스트는 통과해야 한다 — 목록이 비는 것은 정상이다 */
        assert!(found.len() <= super::KNOWN.len());
    }

    /// 실행·스트리밍·종료 코드 왕복. 모델을 부르지 않고 셸 도구로 확인한다.
    #[test]
    fn runs_and_streams() {
        use std::sync::atomic::AtomicBool;
        use std::sync::{Arc, Mutex};
        let seen = Arc::new(Mutex::new(Vec::<String>::new()));
        let sink = seen.clone();
        let emit: super::OnLine = Arc::new(move |l: super::Line| {
            sink.lock().unwrap().push(format!("{}:{}", l.stream, l.text));
        });
        let out = super::run(
            emit,
            super::RunOpts {
                bin: "/bin/sh".into(),
                args: vec!["-c".into(), "echo 첫줄; echo 둘째 1>&2; exit 3".into()],
                cwd: None,
                timeout_sec: 20,
            },
            Arc::new(AtomicBool::new(false)),
        )
        .expect("실행 실패");
        assert_eq!(out.code, 3, "종료 코드가 그대로 와야 한다");
        assert!(out.stdout.contains("첫줄"));
        assert!(out.stderr.contains("둘째"));
        let lines = seen.lock().unwrap().clone();
        assert!(lines.iter().any(|l| l == "out:첫줄"), "스트림 구분이 있어야 한다: {lines:?}");
        assert!(lines.iter().any(|l| l == "err:둘째"));
        assert!(!out.timed_out && !out.canceled);
    }

    /// stdin 은 닫혀 있어야 한다 — codex exec 는 열려 있으면 입력을 기다리다 멈춘다.
    #[test]
    fn stdin_is_closed() {
        use std::sync::atomic::AtomicBool;
        use std::sync::Arc;
        let emit: super::OnLine = Arc::new(|_l| {});
        let out = super::run(
            emit,
            super::RunOpts {
                bin: "/bin/sh".into(),
                args: vec!["-c".into(), "cat; echo 끝".into()],
                cwd: None,
                timeout_sec: 15,
            },
            Arc::new(AtomicBool::new(false)),
        )
        .expect("실행 실패");
        assert!(!out.timed_out, "stdin 이 열려 있으면 cat 이 끝나지 않는다");
        assert!(out.stdout.contains("끝"));
    }

    /// 시한이 지나면 죽인다.
    #[test]
    fn times_out() {
        use std::sync::atomic::AtomicBool;
        use std::sync::Arc;
        let emit: super::OnLine = Arc::new(|_l| {});
        let out = super::run(
            emit,
            super::RunOpts {
                bin: "/bin/sh".into(),
                args: vec!["-c".into(), "sleep 60".into()],
                cwd: None,
                timeout_sec: 10, /* clamp 하한이 10 이다 */
            },
            Arc::new(AtomicBool::new(false)),
        )
        .expect("실행 실패");
        assert!(out.timed_out, "시한 초과로 끝나야 한다");
        assert!(out.ms < 20_000);
    }
}
