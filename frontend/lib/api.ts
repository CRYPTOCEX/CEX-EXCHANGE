// lib/api.ts
import { toast } from "sonner";
import {
  classifyTransportError,
  transportErrorDetail,
  transportErrorMessage,
} from "@/lib/errors/transport";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface FetchOptions<T> {
  url: string;
  method?: HttpMethod;
  body?: Record<string, any> | FormData | null;
  headers?: HeadersInit;
  params?: Record<string, string | number | boolean>;
  successMessage?: string | ((data: T) => string);
  errorMessage?: string;
  silent?: boolean;
  silentSuccess?: boolean;
  /**
   * An `AbortSignal` to cancel the request with.
   *
   * This did not exist, and several callers were written as though it did:
   * the chart engine builds an `AbortController` per request, checks
   * `signal.aborted` afterwards and tears it down on cleanup, but had no way to
   * hand the signal to `fetch` — so a superseded request (a symbol switched
   * mid-flight, a panned viewport, an unmounted panel) ran to completion,
   * consuming a connection from the browser's per-host pool and delaying the
   * request the user is actually waiting for. The `aborted` checks meant its
   * RESULT was discarded correctly; nothing stopped the work.
   */
  signal?: AbortSignal;
  // Internal: set when a request is being retried after a CSRF-token recovery,
  // so we never loop on repeated CSRF failures. Not part of the public API.
  __csrfRetried?: boolean;
}

interface FetchResponse<T> {
  data: T | null;
  error: string | null;
  validationErrors?: Record<string, any>;
  /**
   * True when the request failed at the TRANSPORT level (fetch threw:
   * network drop, abort, timeout) — the server may or may not have
   * processed the request, so the outcome is AMBIGUOUS. Absent/false on
   * body-carried errors (a response arrived — definite server verdict).
   * Idempotent-retry callers (e.g. requestNonce flows) use this to keep
   * their nonce and replay instead of minting a fresh one.
   */
  transportError?: boolean;
}

interface ApiError {
  message: string;
}

// Helper function to get the correct API base URL
function getApiBaseUrl(): string {
  const isDev = process.env.NODE_ENV === "development";
  const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;

  if (typeof window !== "undefined") {
    // Client-side

    // Check for explicit backend URL override (useful for ngrok/tunnel testing)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (backendUrl) {
      return backendUrl;
    }

    if (isDev) {
      // For ngrok/tunnels: if hostname contains 'ngrok' or other tunnel services,
      // we can't just append port - need NEXT_PUBLIC_BACKEND_URL set
      const hostname = window.location.hostname;
      const isTunnel =
        hostname.includes("ngrok") ||
        hostname.includes("tunnel") ||
        hostname.includes("loca.lt") ||
        hostname.includes("serveo");

      if (isTunnel) {
        // For tunnels without NEXT_PUBLIC_BACKEND_URL, try same origin (assumes reverse proxy)
        // This will likely fail - user needs to set NEXT_PUBLIC_BACKEND_URL
        console.warn(
          "[API] Tunnel detected but NEXT_PUBLIC_BACKEND_URL not set. " +
            "API calls may fail. Set NEXT_PUBLIC_BACKEND_URL to your backend tunnel URL."
        );
        return window.location.origin;
      }

      // Use the same hostname as the current page (works for localhost AND IP access from mobile)
      return `${window.location.protocol}//${hostname}:${backendPort}`;
    }
    // In production, use the same domain without backend port (reverse proxy handles it)
    return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
  }

  // Server-side: always use localhost since SSR runs on the same machine as the backend
  return `http://127.0.0.1:${backendPort}`;
}

export function fileToBase64(file: Blob): Promise<string | ArrayBuffer | null> {
  return new Promise((resolve, reject) => {
    if (!(file instanceof Blob)) {
      reject(new Error("The provided value is not a Blob or File."));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result);
    };
    reader.onerror = (error) => {
      reject(new Error(`FileReader error: ${error}`));
    };
    reader.readAsDataURL(file);
  });
}

// ---------------------------------------------------------------------------
// CSRF self-heal
//
// State-mutating requests are rejected with a 403 when the browser's csrfToken
// cookie is missing/stale (cleared cookies, an edge-case expiry, etc.) even
// though the session is otherwise valid. Instead of dead-ending the user with a
// cryptic "CSRF Token or Session ID missing" toast they can't act on, we detect
// that specific failure, transparently re-mint the token via GET /api/auth/csrf,
// and retry the original request once. Only if the session is genuinely gone do
// we surface a single clear "please sign in again" message and route to login.
// ---------------------------------------------------------------------------

/**
 * Does an `error` / `errors` field on a 2xx body actually CARRY an error?
 *
 * The success path used to test `d.errors` for plain truthiness, and an OBJECT
 * is truthy whatever is inside it. `/api/p2p/dashboard` reports its per-section
 * failures as `errors: { volume: null, activity: null, transactions: null,
 * wallets: null }` — every key null on a healthy response — so EVERY successful
 * dashboard load was converted into `{ data: null, error: "Something went
 * wrong" }` and three sections of the page rendered an error box instead of the
 * data that had just arrived.
 *
 * A container is only an error if something is actually in it. Every real error
 * shape still matches: a message string, a `{field: "message"}` map, an array of
 * validation errors.
 */
function carriesError(value: unknown): boolean {
  // null / undefined / "" / 0 / false — the old truthiness test, unchanged.
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((entry) => carriesError(entry));
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some((entry) =>
      carriesError(entry)
    );
  }
  return true;
}

function isCsrfError(status: number, data: any): boolean {
  const code = Number(data?.statusCode) || status;
  if (code !== 403) return false;
  const msg = String(data?.message || data?.error || "").toLowerCase();
  return (
    msg.includes("csrf") ||
    msg.includes("session id missing") ||
    msg === "invalid session"
  );
}

// Dedupe concurrent recovery calls: a burst of mutating requests that all 403
// should trigger exactly one /api/auth/csrf round-trip.
let csrfRecoveryInFlight: Promise<string | null> | null = null;

function recoverCsrfToken(): Promise<string | null> {
  if (!csrfRecoveryInFlight) {
    csrfRecoveryInFlight = (async (): Promise<string | null> => {
      try {
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/auth/csrf`, {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) return null;
        const json = await res.json().catch(() => null);
        return json?.csrfToken || null;
      } catch {
        return null;
      }
    })().finally(() => {
      csrfRecoveryInFlight = null;
    });
  }
  return csrfRecoveryInFlight;
}

// Guard so a page full of failing requests triggers only one redirect/toast.
let sessionExpiredHandled = false;

// ---------------------------------------------------------------------------
// Geographic restriction
//
// The backend marks a geo refusal with `geoRestricted: true` (see the geo
// enforcement gate). Surfacing it as a generic 403 toast would leave the user
// staring at a page that silently stops working, with no explanation of why —
// so route them to the compliance notice instead, which names the detected
// country and the operator's contact address.
// ---------------------------------------------------------------------------

const RESTRICTED_PATH = "/restricted";

// One redirect per page, however many requests fail together.
let geoRestrictionHandled = false;

function isGeoRestrictedError(data: any): boolean {
  return Boolean(data?.geoRestricted === true);
}

function handleGeoRestricted(data: any, silent: boolean): void {
  if (typeof window === "undefined") return;
  if (geoRestrictionHandled) return;
  // Already on the notice page — redirecting again would loop.
  if (window.location.pathname.includes(RESTRICTED_PATH)) return;

  geoRestrictionHandled = true;

  if (!silent && data?.message) {
    toast.error(data.message);
  }

  const locale = window.location.pathname.split("/")[1] || "en";
  setTimeout(() => {
    window.location.href = `/${locale}${RESTRICTED_PATH}`;
  }, 1200);
}

function handleSessionExpired(silent: boolean): void {
  if (typeof window === "undefined") return;
  // Already on the login page (or mid-redirect) — don't loop.
  if (sessionExpiredHandled || window.location.pathname.includes("/login")) {
    return;
  }

  /*
   * A BACKGROUND REQUEST MAY NOT NAVIGATE THE USER. IT NEVER COULD.
   * ---------------------------------------------------------------------------
   * `silent` suppressed the toast and then redirected anyway — so a request the
   * user did not make, explicitly marked as one that must not interrupt them,
   * interrupted them in the most disruptive way available: a full page
   * navigation off whatever they were doing, losing any unsaved form state with
   * it and offering no explanation, because the toast had been suppressed.
   *
   * HOW IT WAS FOUND. `/en/admin` was bouncing to
   * `/en/login?return=%2Fen%2Fadmin`. The return value is the tell: the route
   * guard writes `?return=%2Fadmin` (no locale) and only this function writes
   * `pathname + search`, locale included. The request behind it was
   * `useLicenseGate`'s automatic `POST /api/admin/system/license/verify` —
   * mutating, so it is the one thing on an admin page load that `csrfCheck`
   * inspects, and `silent: true`.
   *
   * A backend restart is enough to cause it: sessions live in Redis, the dev
   * fallback keeps them in memory, and `csrfCheck` answers `403 Invalid Session`
   * for a session it can no longer find. So every hot reload logged the operator
   * out of the page they were on, via a request nobody asked for.
   *
   * Suppressing the navigation here is self-correcting rather than a papering
   * over: the session really is gone, so the next request the user ACTUALLY
   * makes gets the same 403 without `silent`, and redirects then — at a moment
   * they initiated and can understand. Nothing is swallowed, only deferred to
   * somebody's own action.
   *
   * A navigation is strictly more disruptive than a toast. A caller that has
   * asked for no toast has already answered this question.
   */
  if (silent) return;

  sessionExpiredHandled = true;
  toast.error("Your session has expired. Please sign in again.");

  const parts = window.location.pathname.split("/");
  const locale = parts[1] || "en";
  const returnTo = encodeURIComponent(
    window.location.pathname + window.location.search
  );
  // Let the toast render briefly before navigating.
  setTimeout(() => {
    window.location.href = `/${locale}/login?return=${returnTo}`;
  }, 1200);
}

const pendingSpotRequests = new Map<string, string>();
function spotRetryKey(body: unknown, url: string): { fingerprint: string; token: string } {
  const fingerprint = JSON.stringify([url, body]);
  let token = pendingSpotRequests.get(fingerprint);
  if (!token) {
    try { token = sessionStorage.getItem(`financial-order-retry:${fingerprint}`) || undefined; } catch { /* storage may be disabled */ }
  }
  if (!token) {
    token = crypto.randomUUID();
  }
  pendingSpotRequests.set(fingerprint, token);
  try { sessionStorage.setItem(`financial-order-retry:${fingerprint}`, token); } catch { /* retain in-memory retry support */ }
  return { fingerprint, token };
}

export async function $fetch<T = any>({
  url,
  method = "GET",
  body = null,
  headers = {},
  params = {},
  successMessage = "Success",
  errorMessage = "Something went wrong",
  silent = false,
  silentSuccess = false,
  signal,
  __csrfRetried = false,
}: FetchOptions<T>): Promise<FetchResponse<T>> {
  const spotAttempt = typeof window !== "undefined" && method === "POST" && ["/api/exchange/order", "/api/futures/order"].includes(url)
    ? spotRetryKey(body, url) : null;
  if (spotAttempt) {
    const normalized = new Headers(headers);
    if (!normalized.has("idempotency-key")) normalized.set("idempotency-key", spotAttempt.token);
    headers = Object.fromEntries(normalized.entries());
  }
  const toastId = !silent ? toast.loading("Loading...") : null;

  // Check if body is FormData
  const isFormData = body instanceof FormData;
  
  // Don't set Content-Type for FormData, let browser set it with boundary
  const defaultHeaders: HeadersInit = isFormData ? {
    ...headers,
  } : {
    "Content-Type": "application/json",
    ...headers,
  };

  let urlWithQuery = url;

  try {
    // Construct full URL with proper base URL
    const baseUrl = getApiBaseUrl();
    const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

    // Handle query parameters
    if (Object.keys(params).length > 0) {
      const urlObj = new URL(fullUrl);
      Object.entries(params).forEach(([key, value]) => {
        urlObj.searchParams.set(key, String(value));
      });
      urlWithQuery = urlObj.toString();
    } else {
      urlWithQuery = fullUrl;
    }

    const fetchOptions: RequestInit = {
      method,
      headers: defaultHeaders,
      credentials: "include",
      body: isFormData ? body : (body ? JSON.stringify(body) : null),
      /* Only set when the caller supplied one: passing `signal: undefined` is
         harmless, but being explicit keeps the option out of the request for
         every caller that does not use it. */
      ...(signal ? { signal } : {}),
    };

    const response = await fetch(urlWithQuery, fetchOptions);
    if (!silent && toastId !== null) toast.dismiss(toastId);

    // Handle response parsing more safely
    let data: T | ApiError | null = null;
    try {
      const responseText = await response.text();
      if (responseText) {
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          // For non-JSON responses (like 404 "Not Found"), handle gracefully
          const isNotFoundError = responseText.includes("Not Found") || response.status === 404;
          if (isNotFoundError) {
            if (!silent && toastId !== null) toast.dismiss(toastId);
            return {
              data: null,
              error: "Resource not found",
            };
          }
          
          console.warn("Failed to parse response as JSON:", parseError);
          if (!silent && toastId !== null) toast.dismiss(toastId);
          if (!silent) toast.error(errorMessage);
          return {
            data: null,
            error: "Invalid response format",
          };
        }
      } else {
        // Handle empty response
        if (!response.ok) {
          if (!silent && toastId !== null) toast.dismiss(toastId);
          if (!silent) toast.error(errorMessage);
          return {
            data: null,
            error: `Request failed with status ${response.status}`,
          };
        }
        // Empty response but status is OK
        return { data: null, error: null };
      }
    } catch (parseError) {
      console.warn("Failed to read response:", parseError);
      if (!silent && toastId !== null) toast.dismiss(toastId);
      if (!silent) toast.error(errorMessage);
      return {
        data: null,
        error: "Failed to read response",
      };
    }

    // CSRF self-heal: re-mint the token and retry once before surfacing any
    // error to the user. Never loops (guarded by __csrfRetried).
    if (!__csrfRetried && isCsrfError(response.status, data)) {
      if (!silent && toastId !== null) toast.dismiss(toastId);
      const recoveredToken = await recoverCsrfToken();
      if (recoveredToken) {
        return $fetch<T>({
          url,
          method,
          body,
          // Also send the fresh token as a header so the retry succeeds even if
          // the re-set cookie is withheld (e.g. cross-site SameSite=Strict).
          headers: { ...headers, csrftoken: recoveredToken },
          params,
          successMessage,
          errorMessage,
          silent,
          silentSuccess,
          __csrfRetried: true,
        });
      }
      // Couldn't recover -> the session itself is gone. One clear, actionable
      // message + redirect to login instead of a cryptic 403 toast.
      handleSessionExpired(silent);
      return {
        data: null,
        error: "Your session has expired. Please sign in again.",
      };
    }

    if (response.ok) {
      // Check if the response data indicates an error even though status is 2xx
      if (data && typeof data === "object") {
        const d = data as any;
        
        // Debug logging for statusCode detection
        if (process.env.NODE_ENV === "development" && d.statusCode) {
          console.log("Response contains statusCode:", d.statusCode, "Type:", typeof d.statusCode, "Number:", Number(d.statusCode));
        }
        
        // Check for status code in response body (new error format)
        if (d.statusCode && Number(d.statusCode) >= 400) {
          console.log("Detected error statusCode in response body, calling handleBodyIndicatedError");
          return handleBodyIndicatedError(d, silent, errorMessage);
        }
        // Legacy error format check (includes Rust backend {"error": "..."} format).
        // `carriesError` rather than truthiness: an EMPTY error container is not
        // an error — see the note on that helper.
        if (d.success === false || carriesError(d.error) || carriesError(d.errors)) {
          console.log("Detected legacy error format, calling handleBodyIndicatedError");
          return handleBodyIndicatedError(d, silent, errorMessage);
        }
      }

      // Only a confirmed successful response completes this browser attempt.
      if (spotAttempt) {
        pendingSpotRequests.delete(spotAttempt.fingerprint);
        try { sessionStorage.removeItem(`financial-order-retry:${spotAttempt.fingerprint}`); } catch { /* storage may be disabled */ }
      }
      // Otherwise treat as success
      handleSuccess(data as T, successMessage, silent, silentSuccess);
      return { data: data as T, error: null };
    } else {
      // Non-2xx status, standard error handling
      return await handleError<T>(response, data, silent, errorMessage);
    }
  } catch (error: any) {
    return handleNetworkError(error, silent, toastId, {
      method,
      url: urlWithQuery,
    });
  }
}

function handleSuccess<T>(
  data: T,
  successMessage: string | ((data: T) => string),
  silent: boolean,
  silentSuccess: boolean
) {
  if (silent || silentSuccess) return;
  let messageToShow = "Success";
  if (typeof successMessage === "function") {
    messageToShow = successMessage(data);
  } else {
    messageToShow = successMessage;
  }

  if (
    messageToShow === "Success" &&
    data &&
    typeof data === "object" &&
    (data as any).message
  ) {
    messageToShow = (data as any).message;
  }

  toast.success(messageToShow);
}

function handleBodyIndicatedError<T>(
  data: any,
  silent: boolean,
  errorMessage: string
): FetchResponse<T> {
  // Get message from data, prioritizing the message field, then error field
  const message = data.message || data.error || errorMessage;

  // Geographic restriction: route to the compliance notice rather than
  // leaving the user with a bare 403 toast on a page that no longer works.
  if (isGeoRestrictedError(data)) {
    handleGeoRestricted(data, silent);
    return { data: null, error: message };
  }

  // Debug logging to help diagnose toast issues
  if (process.env.NODE_ENV === "development") {
    console.log("handleBodyIndicatedError called:", { data, silent, message });
  }

  /**
   * A BACKGROUND REQUEST MUST NEVER NAVIGATE THE DOCUMENT.
   *
   * `silent` marks a call the user did not make — a poller, a prefetch, a
   * heartbeat. Two of them are mounted above the router and fire on the first
   * paint of /admin, so a 403 from either used to throw the operator off the
   * page they had just opened, for a feature they never touched. Whatever the
   * licence state actually is, the answer to a poll is not a redirect.
   *
   * A licence prompt still happens on a request the user DID make — opening the
   * addon's own screen — which is the moment it is useful rather than baffling.
   */
  if (
    typeof window !== "undefined" &&
    !silent &&
    data.statusCode === 403 &&
    (data.licenseRequired === true || message?.toLowerCase().includes("license"))
  ) {
    // Only redirect if we're in admin area
    if (window.location.pathname.includes("/admin")) {
      // Extract locale from path (e.g., /en/admin -> en)
      const pathParts = window.location.pathname.split("/");
      const locale = pathParts[1] || "en";

      // Build license page URL with product info if available
      let licensePagePath = `/${locale}/admin/system/license`;
      const queryParams: string[] = [];

      if (data.productId) {
        queryParams.push(`productId=${encodeURIComponent(data.productId)}`);
      }

      // Add return path to current page
      queryParams.push(`return=${encodeURIComponent(window.location.pathname)}`);

      // Add flag to indicate this is from an actual license failure (prevents redirect loop)
      queryParams.push("needsActivation=true");

      if (queryParams.length > 0) {
        licensePagePath += `?${queryParams.join("&")}`;
      }

      // Don't redirect if already on license page
      if (!window.location.pathname.includes("/admin/system/license")) {
        window.location.href = licensePagePath;
        return { data: null, error: message };
      }
    }
  }

  // Check if the response already contains validationErrors
  if (data.validationErrors) {
    if (!silent) {
      console.log("Showing validation error toast");
      toast.error("Validation failed. Please check the required fields.");
    }
    return {
      data: null,
      error: message,
      validationErrors: data.validationErrors,
    };
  }
  
  const parsedValidation = attemptParseValidationErrors(message);
  if (parsedValidation) {
    if (!silent) {
      console.log("Showing validation error toast");
      // Show the actual error message instead of generic "Validation error"
      toast.error(message);
    }
    return {
      data: null,
      error: message,
      validationErrors: parsedValidation,
    };
  }

  if (!silent) {
    console.log("Showing error toast:", message);
    toast.error(message);
  }
  return { data: null, error: message };
}

async function handleError<T>(
  response: Response,
  data: any,
  silent: boolean,
  errorMessage: string
): Promise<FetchResponse<T>> {
  // First check if data contains a status code (new error format)
  if (data && typeof data === "object" && data.statusCode && Number(data.statusCode) >= 400) {
    const message = data.message || data.error || errorMessage;

    // Geographic restriction — same handling as the body-indicated path above.
    // Both doors exist because the global CORS middleware locks the uWS status
    // line at 200 on most routes, so a geo refusal arrives here on some paths
    // and in the 2xx-with-error-body path on others.
    if (isGeoRestrictedError(data)) {
      handleGeoRestricted(data, silent);
      return { data: null, error: message };
    }

    // Check for license error and redirect to activation page.
    // `!silent` for the same reason as the other two doors: a poller must not
    // navigate the document out from under the operator. See the note above.
    if (
      typeof window !== "undefined" &&
      !silent &&
      (response.status === 403 || data.statusCode === 403) &&
      (data.licenseRequired === true || message?.toLowerCase().includes("license"))
    ) {
      // Only redirect if we're in admin area
      if (window.location.pathname.includes("/admin")) {
        const pathParts = window.location.pathname.split("/");
        const locale = pathParts[1] || "en";

        let licensePagePath = `/${locale}/admin/system/license`;
        const queryParams: string[] = [];

        if (data.productId) {
          queryParams.push(`productId=${encodeURIComponent(data.productId)}`);
        }

        queryParams.push(`return=${encodeURIComponent(window.location.pathname)}`);

        // Add flag to indicate this is from an actual license failure (prevents redirect loop)
        queryParams.push("needsActivation=true");

        if (queryParams.length > 0) {
          licensePagePath += `?${queryParams.join("&")}`;
        }

        if (!window.location.pathname.includes("/admin/system/license")) {
          window.location.href = licensePagePath;
          return { data: null, error: message };
        }
      }
    }

    // Check if the response already contains validationErrors
    if (data.validationErrors) {
      if (!silent) toast.error("Validation failed. Please check the required fields.");
      return {
        data: null,
        error: message,
        validationErrors: data.validationErrors,
      };
    }

    const parsedValidation = attemptParseValidationErrors(message);
    if (parsedValidation) {
      // Show the actual error message instead of generic "Validation error"
      if (!silent) toast.error(message);
      return {
        data: null,
        error: message,
        validationErrors: parsedValidation,
      };
    }
    if (!silent) toast.error(message);
    return { data: null, error: message };
  }

  // Check for license error in non-2xx responses.
  // Third and last of the redirect doors — all three take `!silent`.
  if (
    typeof window !== "undefined" &&
    !silent &&
    response.status === 403 &&
    data &&
    (data.licenseRequired === true || data.message?.includes("license"))
  ) {
    if (window.location.pathname.includes("/admin")) {
      const pathParts = window.location.pathname.split("/");
      const locale = pathParts[1] || "en";

      let licensePagePath = `/${locale}/admin/system/license`;
      const queryParams: string[] = [];

      if (data.productId) {
        queryParams.push(`productId=${encodeURIComponent(data.productId)}`);
      }

      queryParams.push(`return=${encodeURIComponent(window.location.pathname)}`);

      if (queryParams.length > 0) {
        licensePagePath += `?${queryParams.join("&")}`;
      }

      if (!window.location.pathname.includes("/admin/system/license")) {
        window.location.href = licensePagePath;
        return { data: null, error: data.message || errorMessage };
      }
    }
  }

  // Fallback to legacy error handling
  const message = (data && (data.message || data.error)) || response.statusText || errorMessage;
  const parsedValidation = attemptParseValidationErrors(message);
  if (parsedValidation) {
    // Show the actual error message instead of generic "Validation error"
    if (!silent) toast.error(message);
    return {
      data: null,
      error: message,
      validationErrors: parsedValidation,
    };
  }

  if (!silent) toast.error(message);
  return { data: null, error: message };
}

function attemptParseValidationErrors(
  message: string
): Record<string, any> | null {
  if (!message) return null;

  // Invalid request body scenario
  if (message.startsWith("Invalid request body:")) {
    const cleanMessage = message.replace("Invalid request body:", "").trim();
    try {
      const errorObjectRaw = JSON.parse(cleanMessage);
      return parseDotNotatedJsonToNestedObject(errorObjectRaw);
    } catch {
      return null;
    }
  }

  // Generic validation error lines
  if (message.includes("Validation error:")) {
    return parseValidationError(message);
  }

  return null;
}

function parseDotNotatedJsonToNestedObject(
  errorObjectRaw: Record<string, any>
) {
  const nestedErrors: Record<string, any> = {};

  Object.entries(errorObjectRaw).forEach(([key, value]) => {
    const path = key.split(".");
    path.reduce((acc, part, index) => {
      if (index === path.length - 1) {
        acc[part] = Array.isArray(value) ? value[0] : value;
      } else {
        acc[part] = acc[part] || {};
      }
      return acc[part];
    }, nestedErrors);
  });

  return nestedErrors;
}

function parseValidationError(errorMessage: string) {
  const errorLines = errorMessage.split("\n");
  const errors: Record<string, string> = {};

  errorLines.forEach((line) => {
    const cleanLine = line.replace("Validation error: ", "");
    const firstColonIndex = cleanLine.indexOf(":");
    if (firstColonIndex !== -1) {
      const key = cleanLine.substring(0, firstColonIndex).trim();
      const msg = cleanLine.substring(firstColonIndex + 1).trim();
      errors[key] = msg;
    }
  });

  return errors;
}

// A page can fire a dozen requests at once; when the API is down every one of
// them fails. Reuse a single toast id so sonner replaces rather than stacks,
// and rate-limit re-notifying so a polling widget can't nag every few seconds.
const TRANSPORT_TOAST_ID = "api-transport-error";
const TRANSPORT_NOTIFY_COOLDOWN_MS = 10_000;
let lastTransportNotifyAt = 0;

// Same idea for the console: one line per outage window instead of a stack
// trace per failed request.
const TRANSPORT_LOG_COOLDOWN_MS = 5_000;
let lastTransportLogAt = 0;

function handleNetworkError(
  error: any,
  silent: boolean,
  toastId: string | number | null,
  request?: { method: HttpMethod; url: string }
): FetchResponse<any> {
  // fetch() rejects only on transport failures: server down/restarting, DNS or
  // TLS failure, offline browser, or an aborted request. Anything else that
  // lands here is a real bug in our own code and must stay loud.
  const kind = classifyTransportError(error);
  const where = request ? `${request.method} ${request.url}` : "request";

  if (kind === null) {
    console.error("Fetch error:", error);
  } else if (kind !== "aborted") {
    // Aborts are routine (navigation, unmounted component) — never logged.
    const now = Date.now();
    if (now - lastTransportLogAt > TRANSPORT_LOG_COOLDOWN_MS) {
      lastTransportLogAt = now;
      console.warn(
        `[api] ${where} — ${kind === "offline" ? "browser is offline" : "server unreachable"} (${transportErrorDetail(error)})`
      );
    }
  }

  if (!silent) {
    if (toastId !== null) {
      toast.dismiss(toastId);
    }
    if (kind === null) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Network error: ${message}. Please try again later.`);
    } else if (kind !== "aborted") {
      // Previously suppressed entirely, which left the user staring at a page
      // that silently stopped working. Tell them once, in plain words.
      const now = Date.now();
      if (now - lastTransportNotifyAt > TRANSPORT_NOTIFY_COOLDOWN_MS) {
        lastTransportNotifyAt = now;
        toast.error(transportErrorMessage(error), { id: TRANSPORT_TOAST_ID });
      }
    }
  }

  return {
    data: null,
    // Callers surface this string directly, so give them wording a user can act
    // on rather than the browser's raw "Failed to fetch".
    error:
      kind === null
        ? error instanceof Error
          ? error.message
          : "Unknown error"
        : transportErrorMessage(error),
    // fetch threw — no response was received, so the server outcome is
    // ambiguous (the request may still have been processed).
    transportError: true,
  };
}

export async function $serverFetch<T = any>(
  context,
  { url, method = "GET", body = null, headers = {} }: FetchOptions<T>
): Promise<FetchResponse<T>> {
  // Use the same API base URL logic for server-side calls
  const baseUrl = getApiBaseUrl();
  const fullUrl = url.startsWith("http") ? url : `${baseUrl}${url}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
    ...headers,
  };

  // Use AbortController with timeout to prevent hanging connections
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for server-side

  const fetchOptions: RequestInit = {
    method,
    headers: defaultHeaders,
    credentials: "include",
    body: body ? JSON.stringify(body) : null,
    signal: controller.signal,
  };

  try {
    const response = await fetch(fullUrl, fetchOptions);
    clearTimeout(timeoutId);

    // Handle response parsing more safely
    let data: T | null = null;
    try {
      const responseText = await response.text();
      if (responseText) {
        data = JSON.parse(responseText);
      }
    } catch (parseError) {
      console.warn("Failed to parse server response as JSON:", parseError);
      return { data: null, error: "Invalid server response format" };
    }

    if (!response.ok) {
      const errorMessage =
        (data as any)?.message || response.statusText || "Server Error";
      return { data: null, error: errorMessage };
    }

    // Check for status code in response body (new error format)
    if (data && typeof data === "object") {
      const d = data as any;
      if (d.statusCode && Number(d.statusCode) >= 400) {
        const errorMessage = d.message || "Server Error";
        return { data: null, error: errorMessage };
      }
    }

    return { data, error: null };
  } catch (error: any) {
    clearTimeout(timeoutId);

    const kind = classifyTransportError(error);
    if (kind === null) {
      console.error("Server-side Fetch error:", error);
    } else {
      // The backend being down during SSR is expected in dev (restarts) and an
      // outage in prod — one compact line either way, no stack.
      const now = Date.now();
      if (now - lastTransportLogAt > TRANSPORT_LOG_COOLDOWN_MS) {
        lastTransportLogAt = now;
        console.warn(
          `[ssr] ${method} ${fullUrl} — server unreachable (${transportErrorDetail(error)})`
        );
      }
    }

    return {
      data: null,
      // Was a flat "Server Error", which pages rendered as if the server had
      // actually answered. Distinguish "never reached it" from a real 5xx.
      error:
        kind === null
          ? (error instanceof Error ? error.message : "Server Error")
          : transportErrorMessage(error),
      transportError: kind !== null,
    };
  }
}

export default $fetch;
