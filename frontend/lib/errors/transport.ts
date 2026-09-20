// lib/errors/transport.ts
//
// Classification of TRANSPORT failures — the request never produced a response
// because the API is down/restarting, DNS/TLS failed, the browser is offline,
// or the call was aborted. These are NOT server verdicts: nothing was decided,
// so callers must not render the resulting empty payload as fact.
//
// Every runtime words the same failure differently — Chrome/Edge say "Failed to
// fetch", Safari "Load failed", Firefox "NetworkError when attempting to fetch
// a resource", Node/undici "fetch failed" with the real reason hidden on
// `error.cause` — so each call site that string-matched its own subset got it
// wrong somewhere. `$fetch`'s connection-error suppression, for instance,
// matched Node's wording but not the browser's, so a dev backend restart logged
// a stack trace and toasted a raw "Failed to fetch" at the user on every widget
// on the page. Keep the matching here, in one place, with no imports so both
// server components and client bundles can use it.

/** Substrings that appear in transport-level failure messages. */
const TRANSPORT_MESSAGES = [
  "failed to fetch", // Chrome / Edge
  "load failed", // Safari
  "networkerror", // Firefox
  "network request failed",
  "fetch failed", // Node / undici (SSR)
  "connection refused",
  "connection reset",
  "socket hang up",
  "network is unreachable",
  "the operation was aborted",
  "aborted",
  "timeout",
  "timed out",
];

/** libuv / undici error codes for "never reached the other end". */
const TRANSPORT_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ECONNABORTED",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENETDOWN",
  "ENOTFOUND",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "EPIPE",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

export type TransportErrorKind =
  | "offline" // the browser itself reports no connectivity
  | "aborted" // caller/navigation cancelled it, or it timed out
  | "unreachable" // the API did not answer
  | null; // not a transport failure at all

/** Error code from wherever fetch decided to hide it this time. */
function errorCode(error: any): string | undefined {
  const code = error?.code ?? error?.cause?.code ?? error?.errno;
  return typeof code === "string" ? code : undefined;
}

function errorText(error: any): string {
  if (!error) return "";
  const own = typeof error === "string" ? error : (error.message ?? "");
  const cause = error?.cause?.message ?? "";
  return `${own} ${cause}`.toLowerCase();
}

/**
 * Classify a thrown fetch error. Returns null when the error is something else
 * (a bug in our own code, a JSON parse failure, …) — those still deserve a
 * loud console.error, so never swallow them as "connection issues".
 */
export function classifyTransportError(error: any): TransportErrorKind {
  if (!error) return null;

  if (
    typeof navigator !== "undefined" &&
    navigator.onLine === false
  ) {
    return "offline";
  }

  if (error.name === "AbortError" || error.name === "TimeoutError") {
    return "aborted";
  }

  const code = errorCode(error);
  if (code && TRANSPORT_CODES.has(code)) {
    return code === "ETIMEDOUT" ? "aborted" : "unreachable";
  }

  const text = errorText(error);
  if (!text.trim()) return null;
  return TRANSPORT_MESSAGES.some((needle) => text.includes(needle))
    ? "unreachable"
    : null;
}

export function isTransportError(error: any): boolean {
  return classifyTransportError(error) !== null;
}

/**
 * User-facing wording. Deliberately says the request did not go through rather
 * than reporting a value, because a transport failure means we know nothing
 * about the server's state.
 */
export function transportErrorMessage(error: any): string {
  switch (classifyTransportError(error)) {
    case "offline":
      return "You appear to be offline. Reconnect and try again.";
    case "aborted":
      return "The request timed out before the server responded. Please try again.";
    case "unreachable":
      return "Can't reach the server — it may be offline or restarting. Please try again.";
    default:
      return error instanceof Error ? error.message : "Unknown error";
  }
}

/**
 * One compact line for the console: the underlying reason without the useless
 * stack (a stack through fetch() names our call site, never the actual cause).
 */
export function transportErrorDetail(error: any): string {
  const code = errorCode(error);
  const message =
    error?.cause?.message ||
    (error instanceof Error ? error.message : String(error ?? "unknown"));
  return code ? `${code}: ${message}` : message;
}
