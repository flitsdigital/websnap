export function fileUrl(path: string, download = false): string {
  return `/api/files?path=${encodeURIComponent(path)}${download ? "&download=1" : ""}`;
}

/** Session folder (`<site>/<timestamp>`) of an output file path. */
export function folderOf(path: string): string {
  return path.split("/").slice(0, 2).join("/");
}
