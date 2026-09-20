// lib/fetchers/settings-client.ts
//
// Single implementation of "load /api/settings in the browser". It used to
// exist twice — once in use-settings-sync (initial load) and once in
// use-settings (retryFetch) — with the parsing rules copy-pasted between them,
// so a fix to one silently missed the other.
//
// (The SSR-side fetcher lives in ./settings.ts and talks to the backend
// directly; this one goes through the app's own /api proxy.)
//
// Failure handling matters here more than anywhere else in the app: with no
// settings the shell renders no menu, so a backend hiccup during boot used to
// throw an `HTTP 500` Error complete with stack trace and leave the UI in a
// permanent loading state.

import { DEFAULT_SETTINGS } from "@/config/settings";
import {
  classifyTransportError,
  transportErrorMessage,
} from "@/lib/errors/transport";

/** Keys that hold huge/derived blobs rather than real settings. */
const EXCLUDED_KEYS = new Set(["settings", "extensions"]);

/** Keys whose values are numeric, matched by substring. */
const NUMERIC_KEY_HINTS = [
  "Time",
  "Amount",
  "Fee",
  "Percent",
  "Window",
  "Max",
  "Min",
  "Trades",
  "Offers",
];

const REQUEST_TIMEOUT_MS = 10_000;
/** One quick retry then a slower one — covers a dev backend restart. */
const RETRY_DELAYS_MS = [400, 1200];

export interface SettingsPayload {
  settings: Record<string, any>;
  extensions: string[];
}

export type SettingsLoadResult =
  | { ok: true; payload: SettingsPayload }
  | { ok: false; error: string; retryable: boolean };

function parseSettingsArray(raw: any[]): Record<string, any> {
  const usable = raw.filter(
    (s: any) =>
      !EXCLUDED_KEYS.has(s?.key) &&
      !(typeof s?.value === "string" && s.value.includes("[object Object]"))
  );

  return usable.reduce(
    (acc: Record<string, any>, cur: { key: string; value: any }) => {
      let parsedValue: any = cur.value;

      if (cur.value === "true" || cur.value === "1") parsedValue = true;
      // NOTE: "" must stay "" — coercing it to false made cleared
      // text/image settings redisplay as the literal string "false".
      else if (cur.value === "false" || cur.value === "0") parsedValue = false;
      else if (cur.value && !isNaN(Number(cur.value)) && cur.value !== "") {
        if (NUMERIC_KEY_HINTS.some((hint) => cur.key.includes(hint))) {
          parsedValue = Number(cur.value);
        }
      }

      acc[cur.key] = parsedValue;
      return acc;
    },
    {}
  );
}

async function requestSettings(): Promise<SettingsLoadResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("/api/settings", {
      method: "GET",
      headers: { "Cache-Control": "no-cache" },
      signal: controller.signal,
    });

    if (!response.ok) {
      // In dev the Next proxy answers 500 when nothing is listening on the
      // backend port, so 5xx is worth retrying; a 4xx is a real, settled
      // answer and retrying it only delays the error the user needs to see.
      const retryable = response.status >= 500;
      return {
        ok: false,
        retryable,
        error: retryable
          ? "Can't reach the settings service — it may be offline or restarting."
          : `Settings request failed (HTTP ${response.status} ${response.statusText}).`,
      };
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.settings)) {
      return {
        ok: false,
        retryable: false,
        error: "The settings service returned an unexpected response.",
      };
    }

    const settingsObj = parseSettingsArray(data.settings);

    return {
      ok: true,
      payload: {
        // An empty result is a valid fresh install, not a failure.
        settings:
          Object.keys(settingsObj).length === 0 ? DEFAULT_SETTINGS : settingsObj,
        extensions: Array.isArray(data.extensions) ? data.extensions : [],
      },
    };
  } catch (error) {
    const kind = classifyTransportError(error);
    if (kind === null) {
      // Not a connectivity problem — a bug on our side (bad JSON, etc.).
      console.error("Failed to load settings:", error);
      return {
        ok: false,
        retryable: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
    return { ok: false, retryable: true, error: transportErrorMessage(error) };
  } finally {
    clearTimeout(timeoutId);
  }
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Fetch settings, retrying only the failures a retry can actually fix.
 * Emits at most one compact console line for the whole attempt sequence.
 */
export async function loadSettings(): Promise<SettingsLoadResult> {
  let last = await requestSettings();

  for (const delay of RETRY_DELAYS_MS) {
    if (last.ok || !last.retryable) break;
    await wait(delay);
    last = await requestSettings();
  }

  if (!last.ok && last.retryable) {
    console.warn(
      `[settings] ${last.error} (${RETRY_DELAYS_MS.length + 1} attempts)`
    );
  }

  return last;
}

/**
 * Last-known-good settings persisted by the zustand store, used when the API is
 * unreachable: the user's real configuration from the previous session beats an
 * empty shell — and, unlike DEFAULT_SETTINGS, it is not a guess presented as
 * fact. The error is still reported alongside it.
 */
export function readCachedSettings(): SettingsPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem("bicrypto-config-store");
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    const settings = parsed?.state?.settings;
    if (!settings || Object.keys(settings).length === 0) return null;
    return {
      settings,
      extensions: Array.isArray(parsed.state?.extensions)
        ? parsed.state.extensions
        : [],
    };
  } catch (error) {
    console.warn(
      `[settings] cached settings unreadable: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}
