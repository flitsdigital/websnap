import "server-only";
import type { UiTheme } from "@/lib/types";
import { barDocument, escapeHtml, TRAFFIC_LIGHTS, TRAFFIC_LIGHTS_CSS } from "./html";
import { icon } from "./icons";
import type { Bar, PageMeta } from "./types";

const CHROME = {
  light: {
    strip: "#e8ebef",
    tab: "#ffffff",
    text: "#1f1f1f",
    muted: "#5f6368",
    omnibox: "#f1f3f4",
    line: "#e3e3e3",
    avatarBg: "#d3e3fd",
    avatarIcon: "#0b57d0",
  },
  dark: {
    strip: "#1f2023",
    tab: "#35363a",
    text: "#e8eaed",
    muted: "#9aa0a6",
    omnibox: "#202124",
    line: "#2a2b2e",
    avatarBg: "#5f6368",
    avatarIcon: "#e8eaed",
  },
};

const SAFARI = {
  light: { bg: "#f6f6f6", field: "rgba(0,0,0,.055)", text: "#1d1d1f", muted: "#707074", line: "#d9d9d9" },
  dark: { bg: "#2c2c2e", field: "rgba(255,255,255,.09)", text: "#f2f2f7", muted: "#a1a1a6", line: "#161617" },
};

export function chromeDesktop(width: number, height: number, theme: UiTheme, meta: PageMeta): Bar {
  const c = CHROME[theme];
  const favicon = meta.favicon
    ? `<img class="fav" src="${escapeHtml(meta.favicon)}" alt="">`
    : icon("globe", 16, { style: "opacity:.7" });
  const css = `${TRAFFIC_LIGHTS_CSS}
body{color:${c.text}}
.strip{height:42px;background:${c.strip};padding-left:14px;display:flex;align-items:flex-end}
.strip .lights{align-self:center;margin-right:18px}
.tab{position:relative;height:34px;width:${Math.min(240, Math.round(width * 0.32))}px;flex:none;border-radius:10px 10px 0 0;background:${c.tab};padding:0 10px 0 12px;gap:9px;font-size:12px}
.tab:before,.tab:after{content:"";position:absolute;bottom:0;width:10px;height:10px}
.tab:before{left:-10px;background:radial-gradient(circle at 0 0,transparent 10px,${c.tab} 10.5px)}
.tab:after{right:-10px;background:radial-gradient(circle at 100% 0,transparent 10px,${c.tab} 10.5px)}
.fav{width:16px;height:16px;border-radius:3px;object-fit:contain;flex:none}
.title{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.close{color:${c.muted};font-size:15px;line-height:1}
.new{color:${c.muted};margin:0 0 8px 18px}
.toolbar{height:42px;background:${c.tab};padding:0 10px;gap:4px;border-bottom:1px solid ${c.line}}
.btn{width:30px;height:30px;display:flex;align-items:center;justify-content:center;flex:none}
.omnibox{flex:1;min-width:0;height:32px;border-radius:16px;margin:0 8px;padding:0 12px;gap:10px;background:${c.omnibox};color:${c.muted}}
.url{flex:1;min-width:0;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.host{color:${c.text}}
.avatar{width:22px;height:22px;border-radius:50%;background:${c.avatarBg};color:${c.avatarIcon};display:flex;align-items:center;justify-content:center}`;
  const body = `<div class="strip">${TRAFFIC_LIGHTS}<div class="tab row">${favicon}<span class="title">${escapeHtml(meta.title || meta.host)}</span><span class="close">×</span></div><span class="new">${icon("plus", 16)}</span></div>
<div class="toolbar row"><span class="btn">${icon("back", 18)}</span><span class="btn" style="opacity:.45">${icon("forward", 18)}</span><span class="btn">${icon("reload", 17)}</span><div class="omnibox row">${icon("tune", 16)}<span class="url"><span class="host">${escapeHtml(meta.host)}</span>${escapeHtml(meta.path)}</span>${icon("star", 16)}</div><span class="btn"><span class="avatar">${icon("person", 14)}</span></span><span class="btn">${icon("dotsV", 18)}</span></div>`;
  return { height, html: barDocument(width, height, css, body) };
}

export function safariDesktop(width: number, height: number, theme: UiTheme, meta: PageMeta): Bar {
  const c = SAFARI[theme];
  const fieldWidth = Math.round(Math.min(680, width * 0.46));
  const css = `${TRAFFIC_LIGHTS_CSS}
body{color:${c.text}}
.bar{position:relative;height:${height}px;background:${c.bg};border-bottom:1px solid ${c.line};padding:0 14px 0 18px}
.bar .lights{margin-right:18px}
.btn{width:28px;height:28px;display:flex;align-items:center;justify-content:center;flex:none}
.field{position:absolute;left:${Math.round((width - fieldWidth) / 2)}px;top:${Math.round((height - 1 - 32) / 2)}px;width:${fieldWidth}px;height:32px;border-radius:9px;background:${c.field};justify-content:center;gap:5px;padding:0 34px;font-size:13px}
.field .side{position:absolute;top:50%;transform:translateY(-50%);color:${c.muted}}
.lock{color:${c.muted}}
.host{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.right{margin-left:auto}`;
  const body = `<div class="bar row">${TRAFFIC_LIGHTS}<span class="btn">${icon("sidebar", 18)}</span><span class="btn">${icon("back", 18)}</span><span class="btn" style="opacity:.45">${icon("forward", 18)}</span>
<div class="field row">${icon("pageMenu", 15, { className: "side", style: "left:10px" })}${icon("lock", 12, { className: "lock" })}<span class="host">${escapeHtml(meta.host)}</span>${icon("reload", 14, { className: "side", style: "right:10px" })}</div>
<div class="right row"><span class="btn">${icon("share", 18, { stroke: 1.6 })}</span><span class="btn">${icon("plus", 18, { stroke: 1.6 })}</span><span class="btn">${icon("tabs", 18, { stroke: 1.6 })}</span></div></div>`;
  return { height, html: barDocument(width, height, css, body) };
}
