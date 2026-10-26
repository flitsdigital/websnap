import "server-only";

export interface PageMeta {
  title: string;
  host: string;
  path: string;
  /** Data URL, or null when the site has no usable favicon. */
  favicon: string | null;
}

export interface Tint {
  background: string;
  foreground: string;
}

export interface Bar {
  height: number;
  html: string;
}

export interface Frame {
  top: Bar;
  bottom: Bar | null;
}
