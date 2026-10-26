import "server-only";

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Inter, "Segoe UI", Roboto, sans-serif';

export function barDocument(width: number, height: number, css: string, body: string): string {
  // The viewport meta is required: without it a mobile context lays the bar out at 980px wide.
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${width}px;height:${height}px;overflow:hidden;background:transparent}
body{font-family:${FONT_STACK};-webkit-font-smoothing:antialiased;letter-spacing:-0.01em}
.row{display:flex;align-items:center}
${css}
</style></head><body>${body}</body></html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const TRAFFIC_LIGHTS_CSS = `
.lights{display:flex;gap:8px;flex:none}
.lights i{width:12px;height:12px;border-radius:50%;box-shadow:inset 0 0 0 .5px rgba(0,0,0,.12)}
.lights i:nth-child(1){background:#ff5f57}
.lights i:nth-child(2){background:#febc2e}
.lights i:nth-child(3){background:#28c840}`;

export const TRAFFIC_LIGHTS = '<div class="lights"><i></i><i></i><i></i></div>';
