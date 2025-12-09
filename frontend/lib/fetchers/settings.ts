import { cache } from "react";

interface SettingsData {
  [key: string]: any;
}

function getBaseURL() {
  const isDev = process.env.NODE_ENV === "development";
  const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;

  if (isDev) {
    return `http://localhost:${backendPort}`;
  }

  // In production, use the same domain without backend port (reverse proxy handles it)
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost";
}

// Helper to check if error is a connection error (backend not ready)
function isConnectionError(error: any): boolean {
  const errorCode = error?.code || error?.cause?.code;
  return (
    errorCode === "ECONNRESET" ||
    errorCode === "ECONNREFUSED" ||
    error?.name === "AbortError" ||
    error?.message?.includes("aborted") ||
    error?.message?.includes("fetch failed")
  );
}

export const getSettings = cache(async () => {
  const siteUrl = getBaseURL();

  if (!siteUrl) {
    console.error("SSR: No site URL configured for settings fetch");
    return { settings: {}, extensions: [], error: "No site URL configured" };
  }

  try {
    const apiUrl = `${siteUrl}/api/settings`;

    // Use AbortController with timeout to prevent hanging when backend is not ready
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(apiUrl, {
      method: "GET",
      next: { revalidate: 60 },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      // Don't log for common startup scenarios
      if (res.status !== 404) {
        console.warn(
          `SSR: Failed to fetch /api/settings: ${res.status} ${res.statusText}`
        );
      }
      // Return empty defaults instead of throwing
      return { settings: {}, extensions: [], error: `HTTP ${res.status}` };
    }

    let data;
    try {
      data = await res.json();
    } catch (parseError: any) {
      // Silently handle parse errors during startup
      if (!isConnectionError(parseError)) {
        console.warn("SSR: Failed to parse settings response:", parseError);
      }
      return {
        settings: {},
        extensions: [],
        error: "Failed to parse response",
      };
    }

    return { settings: data || {}, extensions: [], error: null };
  } catch (error: any) {
    // Silently handle connection errors (backend not ready during startup)
    if (!isConnectionError(error)) {
      console.warn(
        "SSR: Error fetching settings:",
        error instanceof Error ? error.message : error
      );
    }
    // Return empty defaults instead of throwing
    return {
      settings: {},
      extensions: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
});

function settingsToObject(
  settings: Setting[] | undefined
): Record<string, string> {
  if (!Array.isArray(settings)) return {};
  return settings.reduce(
    (obj, setting) => {
      obj[setting.key] = setting.value instanceof File ? "" : setting.value;
      return obj;
    },
    {} as Record<string, string>
  );
}
