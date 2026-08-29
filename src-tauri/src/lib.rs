mod agent;
mod cdp;
pub mod render;
mod skill;

use serde::Serialize;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri_plugin_opener::OpenerExt;

/// 렌더 취소 플래그. 렌더는 한 번에 하나만 돈다.
#[derive(Default)]
struct RenderState(Arc<AtomicBool>);

/// 에이전트 CLI 취소 플래그. 렌더와 같은 이유로 한 번에 하나만 돈다.
#[derive(Default)]
struct AgentState(Arc<AtomicBool>);

#[derive(Serialize)]
struct FileInfo {
    path: String,
    name: String,
}

/// 텍스트 파일을 읽는다 (스펙 JSON · 자막).
#[tauri::command]
fn read_text(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("{path}: {e}"))
}

/// 텍스트 파일을 쓴다 (스펙 JSON · 산출물 HTML · 타임코드 CSV).
#[tauri::command]
fn write_text(path: String, contents: String) -> Result<FileInfo, String> {
    let p = PathBuf::from(&path);
    if let Some(dir) = p.parent() {
        std::fs::create_dir_all(dir).map_err(|e| format!("{}: {e}", dir.display()))?;
    }
    std::fs::write(&p, contents).map_err(|e| format!("{path}: {e}"))?;
    Ok(FileInfo {
        name: p
            .file_name()
            .map(|s| s.to_string_lossy().into())
            .unwrap_or_default(),
        path,
    })
}

/// 음성 파일을 data URI 로 읽는다 — 산출물에 심어 오프라인 재생하게 한다.
#[tauri::command]
fn read_data_uri(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("{path}: {e}"))?;
    let ext = PathBuf::from(&path)
        .extension()
        .map(|s| s.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    let mime = match ext.as_str() {
        "mp3" => "audio/mpeg",
        "m4a" | "mp4" => "audio/mp4",
        "aac" => "audio/aac",
        "wav" => "audio/wav",
        "ogg" | "opus" => "audio/ogg",
        "webm" => "audio/webm",
        _ => "audio/mpeg",
    };
    Ok(format!("data:{mime};base64,{}", b64(&bytes)))
}

/// 의존성 없는 표준 base64.
fn b64(data: &[u8]) -> String {
    const T: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((data.len() + 2) / 3 * 4);
    for c in data.chunks(3) {
        let b = [c[0], *c.get(1).unwrap_or(&0), *c.get(2).unwrap_or(&0)];
        let n = ((b[0] as u32) << 16) | ((b[1] as u32) << 8) | b[2] as u32;
        out.push(T[(n >> 18 & 63) as usize] as char);
        out.push(T[(n >> 12 & 63) as usize] as char);
        out.push(if c.len() > 1 { T[(n >> 6 & 63) as usize] as char } else { '=' });
        out.push(if c.len() > 2 { T[(n & 63) as usize] as char } else { '=' });
    }
    out
}

/// 파일 크기 — 음성을 심기 전에 얼마나 커지는지 보여준다.
#[tauri::command]
fn file_size(path: String) -> Result<u64, String> {
    std::fs::metadata(&path)
        .map(|m| m.len())
        .map_err(|e| format!("{path}: {e}"))
}

/**
 * 파일을 기본 앱으로 연다.
 *
 * 프런트엔드에서 opener 플러그인의 `open_path` 를 직접 부르면 ACL 스코프에 걸린다 —
 * `allow-open-path` 만 주면 허용 목록이 비어 `is_path_allowed` 가 항상 false 다.
 * 경로는 네이티브 저장 다이얼로그로 사용자가 직접 고르고 우리가 방금 쓴 파일이라,
 * 임의 경로를 웹 콘텐츠가 넘기는 상황이 아니다. 그래서 스코프를 넓히는 대신
 * Rust 쪽 API 로 연다 — 넓은 와일드카드 스코프를 남기지 않는다.
 */
#[tauri::command]
fn open_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    if !PathBuf::from(&path).is_file() {
        return Err(format!("파일이 없다: {path}"));
    }
    app.opener()
        .open_path(path.clone(), None::<&str>)
        .map_err(|e| format!("{path}: {e}"))
}

/// 파일을 파인더에서 보여준다.
#[tauri::command]
fn reveal_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|e| format!("{path}: {e}"))
}

/// 렌더에 쓸 임시 파일 경로. 산출물 HTML 을 여기 써 두고 Chrome 이 연다.
#[tauri::command]
fn temp_path(name: String) -> String {
    std::env::temp_dir().join(name).to_string_lossy().into()
}

/// 임시 파일 치우기. 없으면 조용히 넘어간다.
#[tauri::command]
fn remove_file(path: String) {
    let _ = std::fs::remove_file(path);
}

#[tauri::command]
fn home_dir() -> Option<String> {
    dirs::home_dir().map(|p| p.to_string_lossy().into())
}

#[tauri::command]
fn skill_status(root: Option<String>) -> Result<skill::SkillStatus, String> {
    skill::status(root.as_deref())
}

#[tauri::command]
fn skill_install(root: Option<String>) -> Result<skill::SkillStatus, String> {
    skill::install(root.as_deref())
}

#[tauri::command]
fn skill_remove(root: Option<String>) -> Result<skill::SkillStatus, String> {
    skill::remove(root.as_deref())
}

/// 번들 안의 파일 하나를 텍스트로 꺼낸다 — 앱 안에서 레퍼런스 문서를 읽을 때 쓴다.
#[tauri::command]
fn skill_file(path: String) -> Result<String, String> {
    skill::SKILL
        .get_file(&path)
        .and_then(|f| f.contents_utf8())
        .map(|s| s.to_string())
        .ok_or_else(|| format!("번들에 없는 파일: {path}"))
}

/// 번들에 든 파일 목록.
#[tauri::command]
fn skill_manifest() -> Vec<String> {
    skill::bundled_files().into_iter().map(|(p, _)| p).collect()
}

/// 렌더에 필요한 외부 도구가 있는지 미리 확인한다 — 15분 돌린 뒤에 없다고 하면 안 된다.
#[tauri::command]
fn render_tools() -> Result<Vec<String>, String> {
    let chrome = cdp::find_chrome()?;
    let ffmpeg = cdp::find_ffmpeg()?;
    Ok(vec![
        chrome.to_string_lossy().into(),
        ffmpeg.to_string_lossy().into(),
    ])
}

/// MP4 로 렌더한다. 오래 걸리므로 별도 스레드에서 돌리고 진행률은 이벤트로 보낸다.
#[tauri::command]
async fn render_mp4(
    app: tauri::AppHandle,
    state: tauri::State<'_, RenderState>,
    opts: render::RenderOpts,
) -> Result<String, String> {
    let cancel = state.0.clone();
    cancel.store(false, Ordering::Relaxed);
    /* 렌더는 몇 분씩 걸린다. std::thread 로 띄우고 join 하면 async 워커를 그동안
       붙잡아 render_cancel 같은 다른 커맨드가 처리되지 못한다 — 멈추기 버튼이 죽는다. */
    tauri::async_runtime::spawn_blocking(move || {
        let emit = move |p: render::Progress| {
            let _ = tauri::Emitter::emit(&app, "mp4-progress", p);
        };
        render::render(&emit, opts, cancel)
    })
    .await
    .map_err(|e| format!("렌더 스레드 오류: {e}"))?
}

#[tauri::command]
fn render_cancel(state: tauri::State<'_, RenderState>) {
    state.0.store(true, Ordering::Relaxed);
}

/// 설치된 에이전트 CLI 목록. 없는 것은 빠진다.
#[tauri::command]
fn agent_tools() -> Vec<agent::Tool> {
    agent::tools()
}

/// 에이전트 CLI 를 돌린다. 모델 호출이라 몇 분씩 걸리므로 렌더와 같은 구조다 —
/// 별도 스레드에서 돌리고 로그는 이벤트로 흘린다.
#[tauri::command]
async fn agent_run(
    app: tauri::AppHandle,
    state: tauri::State<'_, AgentState>,
    opts: agent::RunOpts,
) -> Result<agent::RunOut, String> {
    let cancel = state.0.clone();
    cancel.store(false, Ordering::Relaxed);
    tauri::async_runtime::spawn_blocking(move || {
        let emit: agent::OnLine = Arc::new(move |l: agent::Line| {
            let _ = tauri::Emitter::emit(&app, "agent-log", l);
        });
        agent::run(emit, opts, cancel)
    })
    .await
    .map_err(|e| format!("에이전트 스레드 오류: {e}"))?
}

#[tauri::command]
fn agent_cancel(state: tauri::State<'_, AgentState>) {
    state.0.store(true, Ordering::Relaxed);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(RenderState::default())
        .manage(AgentState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_text,
            write_text,
            read_data_uri,
            file_size,
            open_file,
            reveal_file,
            home_dir,
            temp_path,
            remove_file,
            skill_status,
            skill_install,
            skill_remove,
            skill_file,
            skill_manifest,
            render_tools,
            render_mp4,
            render_cancel,
            agent_tools,
            agent_run,
            agent_cancel,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    /// base64 는 직접 구현했으므로 알려진 값으로 확인한다.
    #[test]
    fn b64_known_vectors() {
        assert_eq!(super::b64(b""), "");
        assert_eq!(super::b64(b"f"), "Zg==");
        assert_eq!(super::b64(b"fo"), "Zm8=");
        assert_eq!(super::b64(b"foo"), "Zm9v");
        assert_eq!(super::b64(b"foob"), "Zm9vYg==");
        assert_eq!(super::b64(b"fooba"), "Zm9vYmE=");
        assert_eq!(super::b64(b"foobar"), "Zm9vYmFy");
        /* 바이트 전 범위 — 62·63번 문자(+ /)가 나오는 조합을 포함한다 */
        let all: Vec<u8> = (0u8..=255).collect();
        let enc = super::b64(&all);
        assert_eq!(enc.len(), (256 + 2) / 3 * 4);
        assert!(enc.contains('+') && enc.contains('/'), "62·63번 문자가 나와야 한다");
        assert!(enc.chars().all(|c| c.is_ascii_alphanumeric() || "+/=".contains(c)));
    }

    /// 실제 크기의 음성을 data URI 로 만드는 데 걸리는 시간과 크기를 재 둔다.
    #[test]
    fn read_data_uri_real_size() {
        let path = "/Users/al03230166/projects/tube-store/scripts/마크-미너비니-사고방식/미너비니_01.mp3";
        if !std::path::Path::new(path).is_file() {
            eprintln!("샘플 음성이 없어 건너뛴다");
            return;
        }
        let t = std::time::Instant::now();
        let uri = super::read_data_uri(path.to_string()).expect("data URI 변환 실패");
        let ms = t.elapsed().as_millis();
        let src = std::fs::metadata(path).unwrap().len();
        eprintln!(
            "원본 {:.1}MB → data URI {:.1}MB · {}ms",
            src as f64 / 1048576.0,
            uri.len() as f64 / 1048576.0,
            ms
        );
        assert!(uri.starts_with("data:audio/mpeg;base64,"));
        assert_eq!(uri.len() - "data:audio/mpeg;base64,".len(), (src as usize + 2) / 3 * 4);
    }
}
