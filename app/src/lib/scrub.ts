// PII / secret scrubber for anything that leaves the app as text: server logs now, Sentry events in P13
// (PRD §4.4: phone numbers only for signed-in staff — never in logs, URLs or error reports).
const PATTERNS: [RegExp, string][] = [
  [/\bBearer\s+[A-Za-z0-9._-]+/g, "Bearer [token]"],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "[jwt]"], // JWTs (access / service tokens)
  [/([?&](?:token|apikey|access_token|refresh_token|key)=)[^&\s"']+/gi, "$1[redacted]"], // signed-URL tokens etc.
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]"],
  [/(?:\+62|\b62|\b0)[\s-]?\d{2,4}(?:[\s-]?\d{2,4}){1,3}\b/g, "[phone]"], // +62 812-3456-7890, 081234567890, 62812…
];

export function scrub(text: string): string {
  return PATTERNS.reduce((s, [re, to]) => s.replace(re, to), text);
}

/** An error as one log-safe line: name + scrubbed message, never the object (which may hold request data). */
export function scrubError(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${scrub(e.message)}`;
  return scrub(typeof e === "string" ? e : JSON.stringify(e) ?? String(e));
}
