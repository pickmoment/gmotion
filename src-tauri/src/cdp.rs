//! Chrome DevTools Protocol 최소 클라이언트.
//!
//! MP4 렌더에만 쓴다 — 헤드리스 Chrome 을 띄우고, 화면을 실시간으로 받아
//! ffmpeg 으로 넘긴다. ws://127.0.0.1 이라 TLS 가 필요 없고, 명령이 순차적이라
//! 비동기 런타임도 필요 없다.

use serde_json::{json, Value};
use std::io::{BufRead, BufReader};
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};
use tungstenite::{stream::MaybeTlsStream, Message, WebSocket};

pub type Ws = WebSocket<MaybeTlsStream<TcpStream>>;

/// Chrome 실행 파일을 찾는다. 앱이 Finder 에서 실행되면 PATH 가 빈약하므로
/// 흔한 설치 위치를 직접 훑는다.
pub fn find_chrome() -> Result<PathBuf, String> {
    if let Ok(p) = std::env::var("GMOTION_CHROME") {
        let p = PathBuf::from(p);
        if p.is_file() {
            return Ok(p);
        }
    }
    let mut cands: Vec<PathBuf> = vec![
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome".into(),
        "/Applications/Chromium.app/Contents/MacOS/Chromium".into(),
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge".into(),
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser".into(),
    ];
    /* playwright 가 받아 둔 것도 쓴다 — 개발 머신에는 대개 있다 */
    if let Some(home) = dirs::home_dir() {
        let pw = home.join("Library/Caches/ms-playwright");
        if let Ok(rd) = std::fs::read_dir(&pw) {
            for e in rd.flatten() {
                let d = e.path();
                for tail in [
                    "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
                    "chrome-mac-arm64/headless_shell",
                    "chrome-mac-arm64/chrome-headless-shell",
                ] {
                    cands.push(d.join(tail));
                }
            }
        }
    }
    cands
        .into_iter()
        .find(|p| p.is_file())
        .ok_or_else(|| "Chrome 을 찾지 못했다 — Google Chrome 을 설치하거나 GMOTION_CHROME 에 경로를 준다".into())
}

/// ffmpeg 을 찾는다. 이유는 Chrome 과 같다.
pub fn find_ffmpeg() -> Result<PathBuf, String> {
    if let Ok(p) = std::env::var("GMOTION_FFMPEG") {
        let p = PathBuf::from(p);
        if p.is_file() {
            return Ok(p);
        }
    }
    for p in [
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
        "/usr/bin/ffmpeg",
        "/opt/local/bin/ffmpeg",
    ] {
        let p = PathBuf::from(p);
        if p.is_file() {
            return Ok(p);
        }
    }
    /* 마지막으로 PATH */
    if let Ok(out) = Command::new("/usr/bin/which").arg("ffmpeg").output() {
        let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
        if !s.is_empty() && Path::new(&s).is_file() {
            return Ok(PathBuf::from(s));
        }
    }
    Err("ffmpeg 을 찾지 못했다 — `brew install ffmpeg` 하거나 GMOTION_FFMPEG 에 경로를 준다".into())
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

        let child = Command::new(&chrome)
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

        let (ws, _) = tungstenite::connect(format!("ws://127.0.0.1:{port}{path}"))
            .map_err(|e| format!("CDP 연결 실패: {e}"))?;

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
            let v = self.read()?;
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

    pub fn read(&mut self) -> Result<Value, String> {
        loop {
            match self.ws.read().map_err(|e| format!("CDP 읽기 실패: {e}"))? {
                Message::Text(t) => {
                    return serde_json::from_str(&t).map_err(|e| format!("CDP 파싱 실패: {e}"))
                }
                Message::Close(_) => return Err("CDP 연결이 끊겼다".into()),
                _ => continue,
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
}
