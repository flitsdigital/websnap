const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|[^/:?#\s]+\.(local|test|localhost))(:\d+)?([/?#]|$)/i;
const HAS_PROTOCOL = /^[a-z][a-z\d+.-]*:\/\//i;

export function normalizeUrl(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  const withProtocol = HAS_PROTOCOL.test(value) ? value : `${LOCAL_HOST.test(value) ? "http" : "https"}://${value}`;
  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  const { hostname } = url;
  if (!hostname.includes(".") && hostname !== "localhost" && hostname !== "[::1]") return null;
  return url.href;
}

export function parseUrlList(text: string): string[] {
  const urls = text.split(/[\s,]+/).map(normalizeUrl);
  return [...new Set(urls.filter((url): url is string => url !== null))];
}

export function slugifyHost(host: string): string {
  const slug = host
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
  return slug || "site";
}

export function displayHost(url: string): string {
  const { hostname, port } = new URL(url);
  return hostname.replace(/^www\./, "") + (port ? `:${port}` : "");
}
