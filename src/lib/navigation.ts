export function safeAppPath(value: unknown, fallback = "/app") {
  if (typeof value !== "string") return fallback;
  if (value !== "/app" && !value.startsWith("/app/")) return fallback;
  if (value.startsWith("//") || value.includes("\\") || value.includes("\0")) return fallback;
  return value;
}

export function loginPath(nextPath: string) {
  return `/login?next=${encodeURIComponent(safeAppPath(nextPath))}`;
}
