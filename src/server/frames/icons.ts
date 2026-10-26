import "server-only";

const PATHS = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  forward: '<path d="M9 18l6-6-6-6"/>',
  reload: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4.2h-4.2"/>',
  star: '<path d="M12 4.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4L4.2 9.9l5.4-.8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  tune: '<path d="M4 8h9M17 8h3M4 16h3M11 16h9"/><circle cx="15" cy="8" r="2"/><circle cx="9" cy="16" r="2"/>',
  lock: '<rect x="6" y="10.5" width="12" height="9" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  share:
    '<path d="M12 3.5v11M8 7.5l4-4 4 4"/><path d="M8 11H6.5A1.5 1.5 0 0 0 5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 17.5 11H16"/>',
  sidebar: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M9.5 5v14"/>',
  tabs: '<rect x="3.5" y="7.5" width="12" height="12" rx="2"/><path d="M8 4.5h10.5a2 2 0 0 1 2 2V17"/>',
  pageMenu: '<path d="M4.5 7h15M4.5 12h15M4.5 17h9"/>',
  person: '<circle cx="12" cy="9" r="3.5"/><path d="M5.5 19.5a6.5 6.5 0 0 1 13 0"/>',
  globe: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.4 2.4 2.4 13.6 0 16M12 4c-2.4 2.4-2.4 13.6 0 16"/>',
  dotsV:
    '<g fill="currentColor" stroke="none"><circle cx="12" cy="5.5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="18.5" r="1.3"/></g>',
  dotsH:
    '<g fill="currentColor" stroke="none"><circle cx="5.5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18.5" cy="12" r="1.5"/></g>',
};

export type IconName = keyof typeof PATHS;

export function icon(name: IconName, size: number, { stroke = 1.8, className = "", style = "" } = {}): string {
  return `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" style="display:block;flex:none;${style}">${PATHS[name]}</svg>`;
}
