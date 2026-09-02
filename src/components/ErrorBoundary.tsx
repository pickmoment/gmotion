/** 하위 트리 렌더 예외를 잡아 흰 화면 대신 복구 안내를 보여준다. */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("gmotion crash:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash">
        <h1>문제가 생겼다</h1>
        <p>{this.state.error.message}</p>
        <p className="hint">20초 안에 자동저장된 편집 내용이 있을 수 있다.</p>
        <button
          type="button"
          onClick={async () => {
            const dir = await invoke<string>("app_data_dir");
            await invoke("reveal_file", { path: `${dir}/autosave.json` });
          }}
        >
          자동저장 폴더 열기
        </button>
        <button type="button" onClick={() => location.reload()}>
          다시 시작
        </button>
      </div>
    );
  }
}
