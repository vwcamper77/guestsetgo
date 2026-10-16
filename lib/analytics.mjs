export function trackedPath(value) {
  if (typeof value !== "string" || value.length > 300 || !value.startsWith("/") || value.startsWith("//")) return null;
  const path = value.split(/[?#]/)[0];
  if (/^\/(admin|dashboard|api|login|signup)(\/|$)/.test(path)) return null;
  // Group guide opens without retaining private guidebook slugs.
  return path.startsWith("/g/") ? "/g/[guidebook]" : path;
}

export function referralHost(value, origin) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.origin === origin) return "Direct / internal";
    return url.hostname.slice(0, 200);
  } catch { return "Direct / internal"; }
}
