import type { Cue, Scene, Spec, ValidateResult } from "../engine/types";

const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const clock = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  return h
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};
const SCREEN_KEYS: Record<string, true> = {
  title: true,
  kicker: true,
  sub: true,
  text: true,
  caption: true,
  question: true,
  answer: true,
  label: true,
  note: true,
  value: true,
  unit: true,
  by: true,
  handle: true,
  center: true,
  centerLabel: true,
};

function screenText(scene: Scene): string[] {
  const found: string[] = [];
  const visit = (value: unknown, key = "") => {
    if (value == null) return;
    if (typeof value === "string" || typeof value === "number") {
      if (SCREEN_KEYS[key]) {
        const text = String(value).trim();
        if (text && !found.includes(text)) found.push(text);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key));
      return;
    }
    if (typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(([childKey, child]) =>
        visit(child, childKey),
      );
    }
  };
  visit(scene);
  return found;
}

export function accessibleTranscript(
  spec: Spec,
  result: ValidateResult,
  cues: Cue[] | null,
): string {
  const title = spec.title || "모션그래픽 접근성 대본";
  const timings = result.scenes ?? [];
  const scenes = spec.scenes
    .map((scene, index) => {
      const timing = timings[index];
      const at = timing?.at ?? 0;
      const visible = screenText(scene);
      const description = scene.purpose || scene.title || `장면 유형: ${scene.pattern}`;
      return `<section aria-labelledby="scene-${index + 1}">
<h2 id="scene-${index + 1}">${index + 1}. ${esc(scene.title || scene.kicker || scene.pattern)} <time datetime="PT${at}S">${clock(at)}</time></h2>
<p><strong>화면 설명:</strong> ${esc(description)}</p>
${visible.length ? `<p><strong>화면 글자:</strong> ${visible.map(esc).join(" · ")}</p>` : ""}
${scene.say ? `<p><strong>내레이션:</strong> ${esc(scene.say)}</p>` : ""}
</section>`;
    })
    .join("\n");
  const captions = cues?.length
    ? `<section aria-labelledby="captions"><h2 id="captions">전체 캡션</h2><ol>${cues
        .map(
          (cue) =>
            `<li><time datetime="PT${cue.start}S">${clock(cue.start)}</time>–<time datetime="PT${cue.end}S">${clock(cue.end)}</time> ${esc(cue.text)}</li>`,
        )
        .join("")}</ol></section>`
    : "";

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — 접근성 대본</title><style>
:root{color-scheme:light}body{max-width:52rem;margin:auto;padding:2rem;font:18px/1.65 system-ui,sans-serif;color:#171717;background:#fff}h1,h2{line-height:1.25}h2{margin-top:2rem;border-top:1px solid #bbb;padding-top:1.25rem}time{font:700 .8em ui-monospace,monospace;color:#444}strong{color:#111}li{margin:.6rem 0}@media(prefers-color-scheme:dark){body{color:#f5f5f5;background:#111}strong{color:#fff}time{color:#ccc}h2{border-color:#555}}
</style></head><body><main>
<h1>${esc(title)}</h1>
${spec.message ? `<p><strong>핵심 메시지:</strong> ${esc(spec.message)}</p>` : ""}
<p>이 문서는 영상의 장면 설명, 화면 글자, 내레이션과 캡션을 읽을 수 있는 순서로 제공한다.</p>
${scenes}${captions}
</main></body></html>`;
}
