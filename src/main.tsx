import React from "react";
import ReactDOM from "react-dom/client";
import { attachConsole } from "@tauri-apps/plugin-log";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { bootError } from "./engine/boot";
import "./styles.css";

void attachConsole();

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

if (bootError) {
  root.render(
    <div className="crash">
      <h1>엔진을 불러오지 못했다</h1>
      <p>{bootError.message}</p>
      <p className="hint">앱을 다시 설치하거나 실행 파일을 다시 받는다.</p>
    </div>,
  );
} else {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  );
}
