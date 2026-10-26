import "server-only";
import type { UiTheme } from "@/lib/types";
import { barDocument, escapeHtml } from "./html";
import { icon } from "./icons";
import type { Frame, PageMeta, Tint } from "./types";

const STATUS_HEIGHT = 54;
const ISLAND_WIDTH = 126;

const SAFARI = {
  light: { bg: "#f2f2f4", pill: "#ffffff", text: "#1c1c1e", home: "#111111", shadow: "rgba(0,0,0,.08)" },
  dark: { bg: "#0c0c0d", pill: "#2a2a2c", text: "#f2f2f7", home: "#ffffff", shadow: "rgba(0,0,0,.4)" },
};

const CHROME = {
  light: { bg: "#ffffff", field: "#f1f3f4", text: "#1f1f1f", muted: "#5f6368", line: "#e6e6e6" },
  dark: { bg: "#1f1f1f", field: "#303134", text: "#e8eaed", muted: "#9aa0a6", line: "#2c2c2c" },
};

const SIGNAL =
  '<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>';
const WIFI =
  '<svg width="17" height="12" viewBox="0 0 17 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1.43 4.43a10 10 0 0 1 14.14 0"/><path d="M3.9 6.9a6.5 6.5 0 0 1 9.2 0"/><path d="M8.5 11.3l-2.3-2.3a3.25 3.25 0 0 1 4.6 0z" fill="currentColor" stroke-width="1.2"/></svg>';
const BATTERY =
  '<svg width="27" height="13" viewBox="0 0 27 13" fill="currentColor"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.5"/><rect x="24.6" y="4.5" width="1.6" height="4" rx=".8" opacity=".45"/></svg>';

const statusCss = (width: number) => `
.status{height:${STATUS_HEIGHT}px;display:flex}
.ear{width:${(width - ISLAND_WIDTH) / 2}px;display:flex;align-items:center;justify-content:center;padding-top:3px}
.island{width:${ISLAND_WIDTH}px;flex:none}
.time{padding-left:10px;font-size:17px;font-weight:600;letter-spacing:-0.02em}
.icons{gap:6px;padding-right:6px}
.home{position:absolute;left:50%;bottom:8px;width:134px;height:5px;margin-left:-67px;border-radius:3px}`;

const statusBar = ({ background, foreground }: Tint) =>
  `<div class="status" style="background:${background};color:${foreground}"><div class="ear"><span class="time">9:41</span></div><div class="island"></div><div class="ear"><span class="icons row">${SIGNAL}${WIFI}${BATTERY}</span></div></div>`;

export function safariIphone(
  width: number,
  top: number,
  bottom: number,
  theme: UiTheme,
  meta: PageMeta,
  tint: Tint | null,
): Frame {
  const c = SAFARI[theme];
  const shadow = `box-shadow:0 1px 6px ${c.shadow},0 0 0 .5px rgba(0,0,0,.05)`;
  const css = `${statusCss(width)}
.bottom{position:relative;height:${bottom}px;background:${c.bg};color:${c.text};padding:6px 12px 0}
.round{width:46px;height:46px;border-radius:50%;background:${c.pill};display:flex;align-items:center;justify-content:center;flex:none;${shadow}}
.pill{position:relative;flex:1;min-width:0;height:46px;border-radius:23px;margin:0 8px;padding:0 44px;background:${c.pill};${shadow};justify-content:center;font-size:15px;font-weight:500}
.pill .side{position:absolute;top:50%;transform:translateY(-50%)}
.host{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`;
  const bottomBody = `<div class="bottom"><div class="row"><span class="round">${icon("back", 20, { stroke: 2 })}</span><div class="pill row">${icon("pageMenu", 17, { className: "side", style: "left:15px" })}<span class="host">${escapeHtml(meta.host)}</span>${icon("reload", 17, { className: "side", style: "right:15px" })}</div><span class="round">${icon("dotsH", 22)}</span></div><div class="home" style="background:${c.home}"></div></div>`;
  return {
    top: {
      height: top,
      html: barDocument(width, top, css, statusBar(tint ?? { background: c.bg, foreground: c.text })),
    },
    bottom: { height: bottom, html: barDocument(width, bottom, css, bottomBody) },
  };
}

export function chromeIphone(width: number, top: number, bottom: number, theme: UiTheme, meta: PageMeta): Frame {
  const c = CHROME[theme];
  const css = `${statusCss(width)}
body{color:${c.text}}
.addr{height:${top - STATUS_HEIGHT}px;padding:2px 12px 10px;background:${c.bg};box-shadow:inset 0 -1px 0 ${c.line}}
.field{position:relative;flex:1;min-width:0;height:40px;border-radius:20px;padding:0 40px;background:${c.field};justify-content:center;font-size:15px}
.tune{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:${c.muted}}
.host{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bottom{position:relative;height:${bottom}px;background:${c.bg};border-top:1px solid ${c.line}}
.tools{height:48px;justify-content:space-around;padding:0 6px}
.count{width:21px;height:21px;border:1.8px solid currentColor;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;letter-spacing:0}`;
  const topBody = `${statusBar({ background: c.bg, foreground: c.text })}<div class="addr row"><div class="field row">${icon("tune", 17, { className: "tune" })}<span class="host">${escapeHtml(meta.host)}</span></div></div>`;
  const bottomBody = `<div class="bottom"><div class="tools row">${icon("back", 22)}${icon("forward", 22, { style: "opacity:.4" })}${icon("plus", 22)}<span class="count">1</span>${icon("dotsH", 22)}</div><div class="home" style="background:${c.text}"></div></div>`;
  return {
    top: { height: top, html: barDocument(width, top, css, topBody) },
    bottom: { height: bottom, html: barDocument(width, bottom, css, bottomBody) },
  };
}
