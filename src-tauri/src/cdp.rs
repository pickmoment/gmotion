//! Chrome DevTools Protocol 최소 클라이언트.
//!
//! MP4 렌더에만 쓴다 — 헤드리스 Chrome 을 띄우고, 화면을 실시간으로 받아
//! ffmpeg 으로 넘긴다. ws://127.0.0.1 이라 TLS 가 필요 없고, 명령이 순차적이라
//! 비동기 런타임도 필요 없다.

use serde_json::{json, Value};
use std::io::{BufRead, BufReader};
use std::net::TcpStream;
use std::path::PathBuf;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};
use tungstenite::{Message, WebSocket};

/// Windows 에서 자식 프로세스(ffmpeg, chrome, where.exe) 실행 시 콘솔 창이 깜빡이거나
/// 뜨지 않도록 CREATE_NO_WINDOW 플래그를 설정한 Command 를 만든다.
pub fn new_command<S: AsRef<std::ffi::OsStr>>(program: S) -> Command {
    let mut cmd = Command::new(program);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x0800_0000);
    cmd
}

pub type Ws = WebSocket<TcpStream>;

/// Chrome / Chromium / Edge 실행 파일을 찾는다.
/// 앱이 Finder 또는 시작 메뉴에서 실행되면 PATH 가 빈약하므로
/// 플랫폼별 흔한 설치 위치를 직접 훑는다.
pub fn find_chrome() -> Result<PathBuf, String> {
    if let Ok(p) = std::env::var("GMOTION_CHROME") {
        let p = PathBuf::from(p);
        if p.is_file() {
            return Ok(p);
        }
    }
    let mut cands: Vec<PathBuf> = Vec::new();

    #[cfg(target_os = "windows")]
    {
        let pf = std::env::var("ProgramFiles").unwrap_or_else(|_| r"C:\Program Files".into());
        let pf86 = std::env::var("ProgramFiles(x86)").unwrap_or_else(|_| r"C:\Program Files (x86)".into());
        let local_appdata = std::env::var("LOCALAPPDATA").ok();

        // 1. Google Chrome
        cands.push(PathBuf::from(&pf).join(r"Google\Chrome\Application\chrome.exe"));
        cands.push(PathBuf::from(&pf86).join(r"Google\Chrome\Application\chrome.exe"));
        if let Some(lad) = &local_appdata {
            cands.push(PathBuf::from(lad).join(r"Google\Chrome\Application\chrome.exe"));
        }

        // 2. Microsoft Edge (Windows 10/11 기본 내장 Chromium 브라우저)
        cands.push(PathBuf::from(&pf86).join(r"Microsoft\Edge\Application\msedge.exe"));
        cands.push(PathBuf::from(&pf).join(r"Microsoft\Edge\Application\msedge.exe"));
        if let Some(lad) = &local_appdata {
            cands.push(PathBuf::from(lad).join(r"Microsoft\Edge\Application\msedge.exe"));
        }

        // 3. Brave Browser
        cands.push(PathBuf::from(&pf).join(r"BraveSoftware\Brave-Browser\Application\brave.exe"));
        cands.push(PathBuf::from(&pf86).join(r"BraveSoftware\Brave-Browser\Application\brave.exe"));
        if let Some(lad) = &local_appdata {
            cands.push(PathBuf::from(lad).join(r"BraveSoftware\Brave-Browser\Application\brave.exe"));
        }

        // 4. Playwright 캐시
        if let Some(lad) = &local_appdata {
            let pw = PathBuf::from(lad).join("ms-playwright");
            if let Ok(rd) = std::fs::read_dir(&pw) {
                for e in rd.flatten() {
                    let d = e.path();
                    for tail in [
                        r"chrome-win64\chrome.exe",
                        r"chrome-win\chrome.exe",
                        r"chrome-win-arm64\chrome.exe",
                        r"chrome-headless-shell-win64\chrome-headless-shell.exe",
                        r"chrome-headless-shell-win\chrome-headless-shell.exe",
                    ] {
                        cands.push(d.join(tail));
                    }
                }
            }
        }

        // 5. where.exe 확인
        for exe in ["chrome.exe", "msedge.exe", "brave.exe"] {
            if let Ok(out) = new_command("where.exe").arg(exe).output() {
                for line in String::from_utf8_lossy(&out.stdout).lines() {
                    let s = line.trim();
                    if !s.is_empty() {
                        cands.push(PathBuf::from(s));
                    }
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        cands.extend([
            PathBuf::from("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
            PathBuf::from("/Applications/Chromium.app/Contents/MacOS/Chromium"),
            PathBuf::from("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
            PathBuf::from("/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"),
        ]);
        if let Some(home) = dirs::home_dir() {
            let pw = home.join("Library/Caches/ms-playwright");
            if let Ok(rd) = std::fs::read_dir(&pw) {
                for e in rd.flatten() {
                    let d = e.path();
                    for tail in [
                        "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
                        "chrome-mac-arm64/headless_shell",
                        "chrome-mac-arm64/chrome-headless-shell",
                        "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
                        "chrome-mac-x64/headless_shell",
                        "chrome-mac-x64/chrome-headless-shell",
                    ] {
                        cands.push(d.join(tail));
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        cands.extend([
            PathBuf::from("/usr/bin/google-chrome"),
            PathBuf::from("/usr/bin/google-chrome-stable"),
            PathBuf::from("/usr/bin/chromium"),
            PathBuf::from("/usr/bin/chromium-browser"),
            PathBuf::from("/usr/bin/microsoft-edge"),
            PathBuf::from("/usr/bin/brave-browser"),
            PathBuf::from("/snap/bin/chromium"),
        ]);
        if let Some(home) = dirs::home_dir() {
            let pw = home.join(".cache/ms-playwright");
            if let Ok(rd) = std::fs::read_dir(&pw) {
                for e in rd.flatten() {
                    let d = e.path();
                    cands.push(d.join("chrome-linux/chrome"));
                    cands.push(d.join("chrome-linux-arm64/chrome"));
                }
            }
        }
    }

    // 6. PATH 환경변수 검사
    if let Ok(path_var) = std::env::var("PATH") {
        let separator = if cfg!(windows) { ';' } else { ':' };
        for dir in path_var.split(separator) {
            let d = PathBuf::from(dir.trim());
            #[cfg(windows)]
            for name in ["chrome.exe", "msedge.exe", "brave.exe", "chromium.exe"] {
                cands.push(d.join(name));
            }
            #[cfg(not(windows))]
            for name in ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "msedge"] {
                cands.push(d.join(name));
            }
        }
    }

    cands
        .into_iter()
        .find(|p| p.is_file())
        .ok_or_else(|| {
            #[cfg(windows)]
            {
                "Chrome 또는 Edge 브라우저를 찾지 못했다 — Google Chrome 또는 Microsoft Edge 를 설치하거나 GMOTION_CHROME 환경변수에 경로를 지정한다".into()
            }
            #[cfg(not(windows))]
            {
                "Chrome 을 찾지 못했다 — Google Chrome 을 설치하거나 GMOTION_CHROME 에 경로를 준다".into()
            }
        })
}

#[cfg(target_os = "windows")]
fn scan_for_ffmpeg(root: &std::path::Path, max_depth: usize, out: &mut Vec<PathBuf>) {
    if max_depth == 0 {
        return;
    }
    if let Ok(rd) = std::fs::read_dir(root) {
        for e in rd.flatten() {
            let p = e.path();
            if p.is_file() {
                if let Some(name) = p.file_name() {
                    let s = name.to_string_lossy().to_lowercase();
                    if s == "ffmpeg.exe" || (s.starts_with("ffmpeg") && s.ends_with(".exe")) {
                        out.push(p);
                    }
                }
            } else if p.is_dir() {
                scan_for_ffmpeg(&p, max_depth - 1, out);
            }
        }
    }
}

/// ffmpeg 을 찾는다.
pub fn find_ffmpeg() -> Result<PathBuf, String> {
    if let Ok(p) = std::env::var("GMOTION_FFMPEG") {
        let p = PathBuf::from(p);
        if p.is_file() {
            return Ok(p);
        }
    }
    let mut cands: Vec<PathBuf> = Vec::new();

    #[cfg(target_os = "windows")]
    {
        // 1. Scoop / WinGet / Chocolatey / 표준 설치 위치
        if let Some(home) = dirs::home_dir() {
            cands.push(home.join(r"scoop\shims\ffmpeg.exe"));
            cands.push(home.join(r"scoop\apps\ffmpeg\current\bin\ffmpeg.exe"));
        }
        if let Ok(lad) = std::env::var("LOCALAPPDATA") {
            let lad_p = PathBuf::from(&lad);
            cands.push(lad_p.join(r"Microsoft\WinGet\Links\ffmpeg.exe"));
            scan_for_ffmpeg(&lad_p.join(r"Microsoft\WinGet\Packages"), 4, &mut cands);
            scan_for_ffmpeg(&lad_p.join("Programs"), 3, &mut cands);
            scan_for_ffmpeg(&lad_p.join("imageio"), 3, &mut cands);
            scan_for_ffmpeg(&lad_p.join("uv"), 4, &mut cands);
        }
        if let Ok(appdata) = std::env::var("APPDATA") {
            let appdata_p = PathBuf::from(&appdata);
            scan_for_ffmpeg(&appdata_p.join("vrew"), 3, &mut cands);
            scan_for_ffmpeg(&appdata_p.join("Shotcut"), 2, &mut cands);
        }
        if let Ok(pd) = std::env::var("ProgramData") {
            cands.push(PathBuf::from(pd).join(r"chocolatey\bin\ffmpeg.exe"));
        }
        cands.push(PathBuf::from(r"C:\ffmpeg\bin\ffmpeg.exe"));
        cands.push(PathBuf::from(r"C:\ffmpeg\ffmpeg.exe"));
        if let Ok(pf) = std::env::var("ProgramFiles") {
            let pf_p = PathBuf::from(&pf);
            cands.push(pf_p.join(r"ffmpeg\bin\ffmpeg.exe"));
            cands.push(pf_p.join(r"ffmpeg\ffmpeg.exe"));
            cands.push(pf_p.join(r"HandBrake\ffmpeg.exe"));
            cands.push(pf_p.join(r"OBS Studio\bin\64bit\ffmpeg.exe"));
        }
        if let Ok(pf86) = std::env::var("ProgramFiles(x86)") {
            let pf86_p = PathBuf::from(&pf86);
            cands.push(pf86_p.join(r"ffmpeg\bin\ffmpeg.exe"));
            cands.push(pf86_p.join(r"ffmpeg\ffmpeg.exe"));
        }

        if let Ok(out) = new_command("where.exe").arg("ffmpeg.exe").output() {
            for line in String::from_utf8_lossy(&out.stdout).lines() {
                let s = line.trim();
                if !s.is_empty() {
                    cands.push(PathBuf::from(s));
                }
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        cands.extend([
            PathBuf::from("/opt/homebrew/bin/ffmpeg"),
            PathBuf::from("/usr/local/bin/ffmpeg"),
            PathBuf::from("/usr/bin/ffmpeg"),
            PathBuf::from("/opt/local/bin/ffmpeg"),
            PathBuf::from("/snap/bin/ffmpeg"),
        ]);
        if let Ok(out) = new_command("which").arg("ffmpeg").output() {
            let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if !s.is_empty() && PathBuf::from(&s).is_file() {
                cands.push(PathBuf::from(s));
            }
        }
    }

    if let Ok(path_var) = std::env::var("PATH") {
        let separator = if cfg!(windows) { ';' } else { ':' };
        for dir in path_var.split(separator) {
            let d = PathBuf::from(dir.trim());
            #[cfg(windows)]
            cands.push(d.join("ffmpeg.exe"));
            #[cfg(not(windows))]
            cands.push(d.join("ffmpeg"));
        }
    }

    cands
        .into_iter()
        .find(|p| p.is_file())
        .ok_or_else(|| {
            #[cfg(windows)]
            {
                "ffmpeg 을 찾지 못했다 — winget (`winget install Gyan.FFmpeg`) 또는 scoop (`scoop install ffmpeg`) 또는 choco (`choco install ffmpeg`) 로 설치하거나 GMOTION_FFMPEG 환경변수에 경로를 지정한다".into()
            }
            #[cfg(not(windows))]
            {
                "ffmpeg 을 찾지 못했다 — `brew install ffmpeg` 하거나 GMOTION_FFMPEG 에 경로를 준다".into()
            }
        })
}

pub struct Browser {
    pub child: Child,
    pub ws: Ws,
    pub session: String,
    next_id: u64,
    profile: PathBuf,
}

impl Browser {
    /// 헤드리스 Chrome 을 띄우고 페이지 하나에 붙는다.
    pub fn launch(width: u32, height: u32) -> Result<Self, String> {
        let chrome = find_chrome()?;
        let profile = std::env::temp_dir().join(format!("gmotion-chrome-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&profile);
        std::fs::create_dir_all(&profile).map_err(|e| e.to_string())?;

        let child = new_command(&chrome)
            .args([
                "--headless=new",
                "--remote-debugging-port=0",
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-extensions",
                "--hide-scrollbars",
                /* 음성이 자동재생돼야 시계를 음성이 잡는다 — 그래야 영상 길이가 음성과 맞는다.
                   소리는 mute-audio 로 죽인다(재생은 계속되고 출력만 꺼진다). */
                "--autoplay-policy=no-user-gesture-required",
                "--mute-audio",
                "--force-device-scale-factor=1",
            ])
            .arg(format!("--window-size={width},{height}"))
            .arg(format!("--user-data-dir={}", profile.display()))
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("Chrome 실행 실패: {e}"))?;

        /* 포트는 DevToolsActivePort 파일로 알려 준다 (1줄 포트, 2줄 브라우저 경로) */
        let port_file = profile.join("DevToolsActivePort");
        let t0 = Instant::now();
        let (port, path) = loop {
            if t0.elapsed() > Duration::from_secs(20) {
                return Err("Chrome 이 디버깅 포트를 열지 않았다".into());
            }
            if let Ok(f) = std::fs::File::open(&port_file) {
                let mut lines = BufReader::new(f).lines().map_while(Result::ok);
                if let (Some(p), Some(path)) = (lines.next(), lines.next()) {
                    if let Ok(p) = p.trim().parse::<u16>() {
                        break (p, path.trim().to_string());
                    }
                }
            }
            std::thread::sleep(Duration::from_millis(80));
        };

        let stream = TcpStream::connect(("127.0.0.1", port)).map_err(|e| format!("CDP 연결 실패: {e}"))?;
        stream.set_read_timeout(Some(Duration::from_secs(5))).map_err(|e| e.to_string())?;
        let _ = stream.set_nodelay(true);
        let (ws, _) = tungstenite::client(format!("ws://127.0.0.1:{port}{path}"), stream)
            .map_err(|e| format!("CDP 핸드셰이크 실패: {e}"))?;

        let mut b = Browser { child, ws, session: String::new(), next_id: 1, profile };

        let t = b.call(None, "Target.createTarget", json!({ "url": "about:blank" }))?;
        let target = t["targetId"].as_str().ok_or("targetId 가 없다")?.to_string();
        let a = b.call(
            None,
            "Target.attachToTarget",
            json!({ "targetId": target, "flatten": true }),
        )?;
        b.session = a["sessionId"].as_str().ok_or("sessionId 가 없다")?.to_string();
        Ok(b)
    }

    /// 명령을 보내고 그 응답이 올 때까지 다른 메시지는 흘려보낸다.
    pub fn call(&mut self, session: Option<&str>, method: &str, params: Value) -> Result<Value, String> {
        let id = self.next_id;
        self.next_id += 1;
        let mut msg = json!({ "id": id, "method": method, "params": params });
        if let Some(s) = session {
            msg["sessionId"] = json!(s);
        }
        self.ws
            .send(Message::Text(msg.to_string()))
            .map_err(|e| format!("{method} 전송 실패: {e}"))?;
        let t0 = Instant::now();
        loop {
            if t0.elapsed() > Duration::from_secs(60) {
                return Err(format!("{method} 응답 없음"));
            }
            let v = match self.read()? {
                Some(v) => v,
                None => continue, /* 소켓 타임아웃 — 60초 시한을 다시 검사한다 */
            };
            if v["id"].as_u64() == Some(id) {
                if let Some(e) = v.get("error") {
                    return Err(format!("{method}: {e}"));
                }
                return Ok(v.get("result").cloned().unwrap_or(Value::Null));
            }
        }
    }

    /// 붙은 페이지에 보내는 명령.
    pub fn page(&mut self, method: &str, params: Value) -> Result<Value, String> {
        let s = self.session.clone();
        self.call(Some(&s), method, params)
    }

    /// 소켓에 읽기 타임아웃을 걸어 뒀다 — 응답이 없어도 주기적으로 돌아와야
    /// 바깥 루프가 취소·시한을 다시 검사할 수 있다. `Ok(None)` = 타임아웃(재시도),
    /// `Ok(Some(v))` = 메시지 도착, `Err` = 진짜 연결 오류.
    pub fn read(&mut self) -> Result<Option<Value>, String> {
        loop {
            match self.ws.read() {
                Ok(Message::Text(t)) => {
                    return serde_json::from_str(&t).map(Some).map_err(|e| format!("CDP 파싱 실패: {e}"));
                }
                Ok(Message::Close(_)) => return Err("CDP 연결이 끊겼다".into()),
                Ok(_) => continue,
                Err(tungstenite::Error::Io(e))
                    if e.kind() == std::io::ErrorKind::WouldBlock || e.kind() == std::io::ErrorKind::TimedOut =>
                {
                    return Ok(None);
                }
                Err(e) => return Err(format!("CDP 읽기 실패: {e}")),
            }
        }
    }

    /// 페이지에서 식을 평가해 값을 받는다.
    pub fn eval(&mut self, expr: &str) -> Result<Value, String> {
        let r = self.page(
            "Runtime.evaluate",
            json!({ "expression": expr, "returnByValue": true, "awaitPromise": true }),
        )?;
        Ok(r["result"]["value"].clone())
    }
}

impl Drop for Browser {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
        let _ = std::fs::remove_dir_all(&self.profile);
    }
}

/// 이전 실행이 비정상 종료(강제 종료·크래시)해 남은 Chrome 프로필을 정리한다.
/// 앱 시작 시 한 번만 부른다 — 이 시점엔 이 프로세스가 띄운 렌더가 아직 없다.
pub fn cleanup_stale_profiles() {
    let dir = std::env::temp_dir();
    let Ok(entries) = std::fs::read_dir(&dir) else { return };
    for e in entries.flatten() {
        if e.file_name().to_string_lossy().starts_with("gmotion-chrome-") {
            let _ = std::fs::remove_dir_all(e.path());
        }
    }
}

/// base64 디코더 — 인코더를 직접 만들었으니 짝을 맞춘다.
pub fn b64_decode(s: &str) -> Result<Vec<u8>, String> {
    fn val(c: u8) -> Option<u8> {
        match c {
            b'A'..=b'Z' => Some(c - b'A'),
            b'a'..=b'z' => Some(c - b'a' + 26),
            b'0'..=b'9' => Some(c - b'0' + 52),
            b'+' => Some(62),
            b'/' => Some(63),
            _ => None,
        }
    }
    let mut out = Vec::with_capacity(s.len() / 4 * 3);
    let mut acc: u32 = 0;
    let mut bits = 0;
    for &c in s.as_bytes() {
        if c == b'=' || c.is_ascii_whitespace() {
            continue;
        }
        let v = val(c).ok_or("base64 가 아닌 글자가 있다")? as u32;
        acc = (acc << 6) | v;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((acc >> bits) as u8);
        }
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    #[test]
    fn b64_roundtrip() {
        for s in ["", "f", "fo", "foo", "foob", "fooba", "foobar"] {
            let enc = crate::b64(s.as_bytes());
            assert_eq!(super::b64_decode(&enc).unwrap(), s.as_bytes(), "{s}");
        }
        let all: Vec<u8> = (0u8..=255).collect();
        assert_eq!(super::b64_decode(&crate::b64(&all)).unwrap(), all);
    }

    #[test]
    fn find_chrome_finds_browser() {
        let res = super::find_chrome();
        println!("find_chrome result: {:?}", res);
        assert!(res.is_ok(), "Chrome/Edge should be found on development/CI machine: {:?}", res.err());
    }

    #[test]
    fn find_ffmpeg_finds_binary() {
        let res = super::find_ffmpeg();
        println!("find_ffmpeg result: {:?}", res);
        assert!(res.is_ok(), "ffmpeg should be found: {:?}", res.err());
    }
}
